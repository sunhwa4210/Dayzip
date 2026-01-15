// firebase.d.ts
declare module 'firebase/auth/react-native' {
  // 기본적으로 auth의 타입을 재사용
  export * from 'firebase/auth';

  // 필요한 타입만 최소 선언 (정확한 시그니처까지 알 필요 없음)
  import type { FirebaseApp } from 'firebase/app';
  import type { Auth, Persistence } from 'firebase/auth';

  // RN 전용 함수들 타입을 추가로 선언
  export function getReactNativePersistence(storage: any): Persistence;
  export function initializeAuth(app: FirebaseApp, deps?: any): Auth;
}
