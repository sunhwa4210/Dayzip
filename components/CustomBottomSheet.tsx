// components/CustomBottomSheetModal.tsx
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetModalProps,
  BottomSheetView
} from "@gorhom/bottom-sheet";
import React, { useCallback } from "react";

interface CustomBottomSheetModalProps extends BottomSheetModalProps {
  bottomSheetModalRef: React.RefObject<BottomSheetModal | null>; // ← null 허용으로 수정
  children: React.ReactNode;
  snapPoints?: string[];
}

const CustomBottomSheetModal: React.FC<CustomBottomSheetModalProps> = ({
  bottomSheetModalRef,
  children,
  snapPoints = ["60%", "100%"],
  ...props
}) => {

  const renderBackdrop = useCallback(
    (backdropProps: any) => (
      <BottomSheetBackdrop
        {...backdropProps}
        pressBehavior="close"
        appearsOnIndex={0}
        disappearsOnIndex={-1}
      />
    ),
    []
  );

  return (
    <BottomSheetModal
      ref={bottomSheetModalRef}
      index={0} // 시트 열릴 때 기본 인덱스
      snapPoints={snapPoints}
      backdropComponent={renderBackdrop}
      enablePanDownToClose
      enableDynamicSizing={false}
      {...props}
    >
      <BottomSheetView style={{ flex: 1, position: 'relative' }}>
        {children}
      </BottomSheetView>
    </BottomSheetModal>
  );
};

export default CustomBottomSheetModal;
