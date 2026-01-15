import React from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

// props 인터페이스 정의
interface InputProps {
  value: string;                         
  onChange: (text: string) => void;     
  placeholder?: string;                 
  hasError?: boolean;                   
  rightElement?: React.ReactNode;      
  maxLength?: number;                  
  onValidate?: (error: string) => void; 
}

const Input = ({
  value,
  onChange,
  placeholder,
  hasError,
  rightElement,
  maxLength,
  onValidate,
}: InputProps) => {
  // 유니코드 단위로 정확한 글자 수 계산 (이모지 포함)
  const getCharLength = (text: string) => [...text].length;

  // 텍스트 변경 핸들러
  const handleChange = (text: string) => {
    const length = getCharLength(text);

    // 최대 글자 수 초과 시 더 이상 입력 안 되게 함
    if (maxLength !== undefined && length > maxLength) {
      if (onValidate) {
        onValidate(`최대 ${maxLength}자까지 입력이 가능해요.`);
      }
      return;
    }

    // 정상 입력 처리
    onChange(text);

    // 유효성 메시지 초기화
    if (onValidate) {
      if (length === 0) {
        onValidate('1글자 이상 입력해 주세요.');
      } else {
        onValidate('');
      }
    }
  };

  return (
    <View style={styles.wrapper}>
      <TextInput
        value={value}
        onChangeText={handleChange}
        placeholder={placeholder}
        style={[
          styles.input,
          hasError && styles.inputError,
          rightElement ? { paddingRight: 40 } : null,
        ]}
      />
      {/* 우측 요소 (예: 아이콘) */}
      {rightElement && <View style={styles.rightElement}>{rightElement}</View>}
    </View>
  );
};

// 스타일 정의
const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  input: {
    width: '100%',
    height: 42,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'hsla(0, 0%, 88%, 1)', // 기본 회색 테두리
    fontSize: 16,
    backgroundColor: 'hsla(0, 0%, 100%, 1)', // 흰 배경
  },
  inputError: {
    borderColor: 'hsla(3, 86%, 60%, 1)', // 에러 테두리 (빨강)
  },
  rightElement: {
    position: 'absolute',
    right: 16,
    top: '50%',
    marginTop: -12, // 수직 정렬 (translateY(-50%) 대신)
  },
});

export default Input;
