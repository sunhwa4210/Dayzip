import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';

type Props = {
  message: string;
  actionText?: string;
  onAction?: () => void;
  onClose?: () => void;
  style?: StyleProp<ViewStyle>; // 외부에서 스타일 덮어쓰기
  backgroundColor?: string; // 배경색 변경
  textColor?: string; // 텍스트 색상 변경
  position?: 'top' | 'bottom'; // 표시 위치 변경
  offset?: number; // 상하 위치 조정 (기본 40)
};

export default function CustomSnack({
  message,
  actionText,
  onAction,
  onClose,
  style,
  backgroundColor = '#1C1C1E',
  textColor = '#fff',
  position = 'bottom',
  offset = 40,
}: Props) {
  return (
    <View
      style={[
        styles.toastContainer,
        {
          backgroundColor,
          [position]: offset, // top 또는 bottom 위치 지정
        },
        style,
      ]}
    >
      <Text style={[styles.message, { color: textColor }]}>{message}</Text>

      {actionText && (
        <TouchableOpacity style={styles.actionButton} onPress={onAction}>
          <Text style={styles.actionText}>{actionText}</Text>
        </TouchableOpacity>
      )}

      {onClose && (
        <TouchableOpacity onPress={onClose} style={styles.closeIcon}>
          <Ionicons name="close" size={20} color={textColor} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Pretendard-Bold',
  },
  actionButton: {
    backgroundColor: '#1C1C1E',
    borderColor: '#B2B2B2',
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    marginLeft: 8,
  },
  actionText: {
    color: '#B2B2B2',
    fontSize: 13,
    fontWeight: '700',
  },
  closeIcon: {
    marginLeft: 12,
    padding: 4,
  },
});
