// utils/backfillUpdatedAt.ts
import { auth, db } from '@/firebase';
import {
    collection,
    doc,
    getDocs,
    limit,
    orderBy,
    query,
    serverTimestamp,
    startAfter,
    writeBatch
} from 'firebase/firestore';

export async function backfillUpdatedAtForCurrentUser() {
  const user = auth.currentUser;
  if (!user) throw new Error('로그인이 필요합니다.');

  const colRef = collection(db, 'users', user.uid, 'diaries');
  const PAGE = 400; // 배치 500 제한보다 작게

  let last: any = null;
  let total = 0;

  while (true) {
    const qy = last
      ? query(colRef, orderBy('diaryDate','asc'), startAfter(last), limit(PAGE))
      : query(colRef, orderBy('diaryDate','asc'), limit(PAGE));

    const snap = await getDocs(qy);
    if (snap.empty) break;

    const batch = writeBatch(db);
    let cnt = 0;

    snap.docs.forEach(d => {
      const data = d.data() as any;
      if (!data.updatedAt) {
        const fallback = data.createdAt ?? data.diaryDate ?? serverTimestamp();
        batch.update(doc(db, 'users', user.uid, 'diaries', d.id), {
          updatedAt: fallback,
        });
        cnt++;
      }
    });

    if (cnt > 0) {
      await batch.commit();
      total += cnt;
    }

    last = snap.docs[snap.docs.length - 1];
    if (snap.size < PAGE) break;
  }

  return total;
}
