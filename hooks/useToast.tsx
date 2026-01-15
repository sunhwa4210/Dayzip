import React, { useState } from 'react';
import Toast from '../components/Toast'; //토스트 ui 

interface ToastOptions {
  message: string;
  actionLabel?: string; //버튼 라벨링
  onAction?: () => void; //버튼 클릭시 실행 함수
  duration?: number; //몇 초? 논의 필요
}

//useToast 훅 정의 
export const useToast = () => {
  const [visible, setVisible] = useState(false);
  const [options, setOptions] = useState<ToastOptions | null>(null);

  const show = (message: string, config?: Omit<ToastOptions, 'message'>) => {
    setOptions({ message, ...config });
    setVisible(true);

    setTimeout(() => {
      setVisible(false);
    }, config?.duration ?? 3000); //일단 3초 
  };
//실제 컴포넌트 
  const ToastView = () =>
    visible && options ? (
      <Toast
        message={options.message}
        actionLabel={options.actionLabel}
        onAction={() => {
          options.onAction?.();
          setVisible(false);
        }}
        onClose={() => setVisible(false)}
      />
    ) : null;

  return { show, ToastView };
};
