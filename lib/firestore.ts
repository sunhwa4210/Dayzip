// lib/firestore.ts
import { auth, db } from '@/firebase';
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDocs,
    increment,
    orderBy,
    query,
    runTransaction,
    serverTimestamp,
    setDoc,
    Timestamp,
} from 'firebase/firestore';

export type Goal = {
  id?: string;
  label: string;
  checkedCount: number;
  crossedCount: number;
  created_at: any;        // serverTimestamp()
  last_event_at?: any;    // serverTimestamp()
};

export type GoalEvent = {
  id?: string;
  status: 'checked' | 'crossed';
  occurred_at: Timestamp;
  created_at: any;        // serverTimestamp()
  idempotency_key?: string;
};

function requireUid() {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('로그인이 필요합니다.');
  return uid;
}

/** ✅ 목표 새로 만들기: users/{uid}/goals/{autoId} */
export async function createGoal(label: string) {
  const uid = requireUid();
  const colRef = collection(db, 'users', uid, 'goals');
  const res = await addDoc(colRef, {
    label,
    checkedCount: 0,
    crossedCount: 0,
    created_at: serverTimestamp(),
    last_event_at: null,
  } as Goal);
  return res.id; // goalId
}

/**
 * ✅ (이벤트 추가 + 카운트 증가) 트랜잭션
 *  - UI에서 실행취소(Undo)를 위해 새로 생성된 이벤트 ID를 반환
 */
export async function addEventAndIncrement(
  goalId: string | number,
  status: 'checked' | 'crossed',
  occurredAt: Date
): Promise<string> {
  const uid = requireUid();
  const gid = String(goalId);
  const goalRef = doc(db, 'users', uid, 'goals', gid);
  const eventsCol = collection(goalRef, 'events');

  const idempotency_key = `${gid}-${status}-${occurredAt.getTime()}`;
  const newEventRef = doc(eventsCol); // 명시적 이벤트 ID 생성

  await runTransaction(db, async (tx) => {
    // 1) 이벤트 추가
    tx.set(newEventRef, {
      status,
      occurred_at: Timestamp.fromDate(occurredAt),
      created_at: serverTimestamp(),
      idempotency_key,
    } as GoalEvent);

    // 2) 카운트 증가 + 최근 이벤트 시각
    tx.update(goalRef, {
      last_event_at: serverTimestamp(),
      ...(status === 'checked'
        ? { checkedCount: increment(1) }
        : { crossedCount: increment(1) }),
    });
  });

  // 새 이벤트 문서의 ID를 반환해두면 실행취소 시 삭제 가능
  return newEventRef.id;
}

/** (선택) 이벤트 개별 삭제 — 실행취소 시 사용 */
export async function deleteGoalEvent(goalId: string | number, eventId: string) {
  const uid = requireUid();
  const gid = String(goalId);
  await deleteDoc(doc(db, 'users', uid, 'goals', gid, 'events', eventId));
}

/** (선택) 목표의 이벤트 최신순 읽기 — 바텀시트 히스토리 표시용 */
export async function fetchGoalEvents(goalId: string | number) {
  const uid = requireUid();
  const gid = String(goalId);
  const qy = query(
    collection(db, 'users', uid, 'goals', gid, 'events'),
    orderBy('created_at', 'desc')
  );
  const snap = await getDocs(qy);
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as GoalEvent) }));
}

/** (선택) 리마인더 저장 */
export async function saveReminder(days: string[], timeHHmm: string) {
  const uid = requireUid();
  await setDoc(
    doc(db, 'users', uid, 'settings', 'reminder'),
    { days, time: timeHHmm, updated_at: serverTimestamp() },
    { merge: true }
  );
}

/** ✅ 목표 삭제 — 바텀시트에서 삭제 시 Firestore에서도 제거 */
export async function deleteGoal(goalId: string) {
  const uid = requireUid();
  await deleteDoc(doc(db, 'users', uid, 'goals', goalId));
}

/**
 * ✅ 목표 복원(Undo) — 삭제 실행취소 시 사용
 *  - created_at/last_event_at 은 서버시간으로 새로 찍어도 되고
 *    원본을 들고 있었다면 그대로 복원해도 됨
 */
export async function restoreGoal(goalId: string, data: Partial<Goal>) {
  const uid = requireUid();
  await setDoc(
    doc(db, 'users', uid, 'goals', goalId),
    {
      label: data.label ?? 'Untitled',
      checkedCount: data.checkedCount ?? 0,
      crossedCount: data.crossedCount ?? 0,
      created_at: data.created_at ?? serverTimestamp(),
      last_event_at: data.last_event_at ?? null,
    },
    { merge: false } // 완전히 되살림 (필요 시 true 로 바꿔 merge 가능)
  );
}
