import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/** Expo CalendarTrigger: 1=일 ~ 7=토 */
const EXPO_WEEKDAY_1_SUN: Record<number, number> = { 0:1, 1:2, 2:3, 3:4, 4:5, 5:6, 6:7 };
const WEEKDAY_TEXT_TO_0SUN: Record<string, number> =
  { '일':0, '월':1, '화':2, '수':3, '목':4, '금':5, '토':6 };

export function parseTime(input: string | Date) {
  if (input instanceof Date) return { hour: input.getHours(), minute: input.getMinutes() };
  let s = input.trim();
  const ampm = /am|pm/i.test(s) ? s.match(/am|pm/i)![0].toLowerCase() : null;
  s = s.replace(/\s?(am|pm)/i, '');
  const [hh, mm = '0'] = s.split(':');
  let hour = Number(hh); const minute = Number(mm);
  if (ampm === 'pm' && hour < 12) hour += 12;
  if (ampm === 'am' && hour === 12) hour = 0;
  return { hour, minute };
}

/** now 이후로 강제: 최소 60초 뒤 */
function nextOccurrence(weekday0Sun: number, hour: number, minute: number, now = new Date()) {
  const candidate = new Date(now);
  candidate.setSeconds(0, 0);
  const today = now.getDay(); // 0=일
  let diff = weekday0Sun - today;
  const first = new Date(now);
  first.setDate(now.getDate() + diff);
  first.setHours(hour, minute, 0, 0);

  // 과거/지금이거나, 너무 가까우면(≤ 60초) 다음 주로 밀기
  const MIN_GAP_MS = 60 * 1000;
  if (first.getTime() - now.getTime() <= MIN_GAP_MS) {
    first.setDate(first.getDate() + 7);
  }
  return first;
}

export async function cancelAllReminders() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function scheduleReminders(
  days: string[],
  time: string | Date,
  title = '오늘의 일기',
  body  = '하루를 기록할 시간이에요 ✍️'
) {
  const { hour, minute } = parseTime(time);

  // 권한
  const perm = await Notifications.getPermissionsAsync();
  if (!perm.granted) {
    const req = await Notifications.requestPermissionsAsync();
    if (!req.granted) throw new Error('알림 권한이 없습니다.');
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
    });
  }

  const ids: string[] = [];
  const now = new Date();

  for (const d of days) {
    const weekday0Sun = WEEKDAY_TEXT_TO_0SUN[d];
    if (weekday0Sun == null) continue;

    // 첫 발사 시각을 미래로 보정
    const first = nextOccurrence(weekday0Sun, hour, minute, now);

    // 캘린더 반복 트리거 (요일/시/분/초 + repeats)
    const trigger: Notifications.CalendarNotificationTrigger = {
      repeats: true,
      // Expo는 1=일 ~ 7=토
      weekday: EXPO_WEEKDAY_1_SUN[first.getDay()],
      hour: first.getHours(),
      minute: first.getMinutes(),
      second: 0,
      channelId: Platform.OS === 'android' ? 'reminders' : undefined,
    };

    const id = await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: 'default', priority: Notifications.AndroidNotificationPriority.DEFAULT },
      trigger,
    });
    ids.push(id);
  }
  return ids;
}

export async function rescheduleFromFirestore(days: string[], hhmm: string, options?: { title?: string; body?: string }) {
  await cancelAllReminders();
  return scheduleReminders(days, hhmm, options?.title, options?.body);
}
