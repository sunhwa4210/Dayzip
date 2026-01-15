import { auth, db } from '@/firebase';
import {
    collection,
    doc,
    getDocs,
    limit,
    orderBy,
    query,
    startAfter,
    writeBatch
} from 'firebase/firestore';

function extractObjectPath(url?: string | null): string | null {
  if (!url) return null;
  if (!/^https?:\/\//i.test(url)) return url;
  const m = url.match(/\/o\/([^?]+)/);
  if (!m) return null;
  try { return decodeURIComponent(m[1]); } catch { return m[1]; }
}

export async function backfillStoragePathForCurrentUser() {
  const user = auth.currentUser;
  if (!user) throw new Error('로그인 필요');
  const colRef = collection(db, 'users', user.uid, 'diaries');

  const PAGE = 400; let last: any = null; let total = 0;
  while (true) {
    const qy = last
      ? query(colRef, orderBy('diaryDate','asc'), startAfter(last), limit(PAGE))
      : query(colRef, orderBy('diaryDate','asc'), limit(PAGE));
    const snap = await getDocs(qy);
    if (snap.empty) break;

    const batch = writeBatch(db); let cnt = 0;
    for (const d of snap.docs) {
      const data = d.data() as any;
      if (data.storagePath) continue;
      const path = extractObjectPath(data.imageUrl);
      if (!path) continue;
      batch.update(doc(db, 'users', user.uid, 'diaries', d.id), { storagePath: path });
      cnt++;
    }

    if (cnt > 0) { await batch.commit(); total += cnt; }
    last = snap.docs[snap.docs.length - 1];
    if (snap.size < PAGE) break;
  }
  return total;
}
