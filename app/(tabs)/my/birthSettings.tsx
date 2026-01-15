import CustomSnack from '@/components/Snackbar';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function BirthdayInputScreen() {
  const navigation = useNavigation();
  const [birthday, setBirthday] = useState('');
  const [lastBirthday, setLastBirthday] = useState('');

  const isValid = birthday.length === 10 && /^\d{4}\s\d{2}\s\d{2}$/.test(birthday);

  // 토스트 상태
  const [SnackVisible, setSnackVisible] = useState(false);
  const [SnackMessage, setSnackMessage] = useState('');
  type SnackType = 'delete' | 'save';
  const [SnackType, setSnackType] = useState<SnackType | null>(null);

  const handleClear = () => {
    Keyboard.dismiss(); // 🔹 키보드 내리기
    setLastBirthday(birthday);
    setBirthday('');

    setSnackType('delete');
    setSnackMessage('생일이 지워졌어요');
    setSnackVisible(true);

    setTimeout(() => setSnackVisible(false), 3000);
  };

  const handleSave = () => {
    Keyboard.dismiss(); // 🔹 키보드 내리기
    if (isValid) {
      console.log('생일 저장:', birthday);

      setSnackType('save');
      setSnackMessage('생년월일을 저장했어요');
      setSnackVisible(true);

      setTimeout(() => setSnackVisible(false), 3000);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="black" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleClear}>
            <Text style={styles.clearText}>지우기</Text>
          </TouchableOpacity>
        </View>

        {/* 본문 */}
        <Text style={styles.title}>생년월일 8자리를 알려주세요</Text>
        <Text style={styles.subtitle}>생일에는 특별한 보상을 드려요!</Text>
        <TextInput
          style={styles.input}
          placeholder="예) 2001 02 03"
          keyboardType="number-pad"
          maxLength={10}
          value={birthday}
          onChangeText={(text) => {
            const digitsOnly = text.replace(/\D/g, '').slice(0, 8);
            let formatted = digitsOnly;

            if (digitsOnly.length > 4 && digitsOnly.length <= 6) {
              formatted = `${digitsOnly.slice(0, 4)} ${digitsOnly.slice(4)}`;
            } else if (digitsOnly.length > 6) {
              formatted = `${digitsOnly.slice(0, 4)} ${digitsOnly.slice(4, 6)} ${digitsOnly.slice(6)}`;
            }

            setBirthday(formatted);
          }}
        />

        <TouchableOpacity
          style={[styles.saveButton, isValid ? styles.saveButtonEnabled : styles.saveButtonDisabled]}
          disabled={!isValid}
          onPress={handleSave}
        >
          <Text style={[styles.saveText, { color: isValid ? '#fff' : '#aaa' }]}>저장</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>

      {/* 삭제 토스트 */}
      {SnackVisible && SnackType === 'delete' && (
        <CustomSnack
          message={SnackMessage}
          actionText="실행 취소"
          onAction={() => {
            setBirthday(lastBirthday);
            setSnackVisible(false);
          }}
          onClose={() => setSnackVisible(false)}
        />
      )}

      {/* 저장 토스트 */}
      {SnackVisible && SnackType === 'save' && (
        <CustomSnack
          message={SnackMessage}
          actionText="실행 취소"
          onAction={() => {
            setBirthday(lastBirthday);
            setSnackVisible(false);
          }}
          onClose={() => setSnackVisible(false)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  clearText: {
    color: '#FF6B00',
    fontSize: 16,
    fontWeight: '500',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 6,
    color: '#000',
  },
  subtitle: {
    fontSize: 12,
    color: '#7a7a7a',
    marginBottom: 28,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    fontSize: 16,
    color: '#000',
  },
  saveButton: {
    marginTop: 32,
    paddingVertical: 16,
    borderRadius: 24,
    alignItems: 'center',
  },
  saveButtonEnabled: {
    backgroundColor: '#000',
  },
  saveButtonDisabled: {
    backgroundColor: '#eee',
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
