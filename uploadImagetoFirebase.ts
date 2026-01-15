import { app } from '@/firebase';
import { cacheDirectory, downloadAsync } from 'expo-file-system/legacy';
import { getStorage, ref, uploadBytes } from 'firebase/storage';

/**
 * 원격 이미지 URL을 Firebase Storage에 업로드하고 스토리지 경로(gs://...)를 반환합니다.
 * @param imageUrl - 다운로드할 이미지의 원격 URL
 * @param path - Firebase Storage에 저장될 폴더 경로 (예: 'users/uid/diaries')
 * @returns 업로드된 파일의 전체 스토리지 경로 (gs://...) 또는 실패 시 null
 */
export const uploadImageToFirebase = async (imageUrl: string, path: string): Promise<string | null> => {
  // ✅ 고유한 파일 이름을 함수 내부에서 생성합니다.
  const filename = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.jpg`;
  const storage = getStorage(app);
  
  // ✅ lodding.tsx에서 전달받은 경로(path)와 새로 만든 파일 이름(filename)을 조합합니다.
  // 이 부분이 보안 규칙과 일치해야 합니다.
  const imageRef = ref(storage, `${path}/${filename}`);

  try {
    // ✅ 'expo-file-system/legacy'에서 직접 import한 cacheDirectory와 downloadAsync를 사용합니다.
    const localUri = cacheDirectory + filename;
    const downloadRes = await downloadAsync(imageUrl, localUri);
    
    const fileResponse = await fetch(downloadRes.uri);
    const blob = await fileResponse.blob();

    await uploadBytes(imageRef, blob);

    console.log('Firebase Storage에 이미지 업로드 성공');
    // Firestore에 저장할 전체 스토리지 경로(gs://...)를 반환
    return `gs://${imageRef.bucket}/${imageRef.fullPath}`;
    
  } catch (error) {
    console.error("uploadImageToFirebase 실패:", error);
    return null; // 실패 시 null을 반환하여 호출한 쪽에서 처리할 수 있도록 함
  }
};

