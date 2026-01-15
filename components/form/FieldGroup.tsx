import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import ErrorMessage from './ErrorMessage';

interface FieldGroupProps {
  label?: string;
  required?: boolean;
  children: React.ReactNode;
  errorMessage?: string;
}

const FieldGroup = ({ label, required, children, errorMessage }: FieldGroupProps) => {
  return (
    <View style={styles.wrapper}>
      {/* 라벨 + *표시 */}
      {label && (
        <Text style={styles.label}>
          {label} {required && <Text style={styles.required}>*</Text>}
        </Text>
      )}

      {/* 입력창 등 */}
      {children}

      {/* 에러 메시지 */}
      <ErrorMessage message={errorMessage} />
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
    color: '#1B1B1B',
  },
  required: {
    color: 'hsla(3, 86%, 60%, 1)', // 빨간색
  },
});

export default FieldGroup;