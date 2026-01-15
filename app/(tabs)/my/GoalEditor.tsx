// app/mypage/GoalEditor.tsx
import CustomSnack from '@/components/Snackbar';
import { createGoal } from '@/lib/firestore';
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

export default function GoalEditor() {
  const navigation = useNavigation();
  const [text, setText] = useState('');
  const [lastText, setLastText] = useState('');

  // Snack 상태
  const [SnackVisible, setSnackVisible] = useState(false);
  const [SnackMessage, setSnackMessage] = useState('');
  type SnackType = 'delete' | 'save';
  const [SnackType, setSnackType] = useState<SnackType | null>(null);

  const handleClear = () => {
    Keyboard.dismiss();
    setLastText(text);
    setText('');

    setSnackType('delete');
    setSnackMessage('목표가 지워졌어요');
    setSnackVisible(true);

    setTimeout(() => setSnackVisible(false), 3000);
  };

  const handleSave = async () => {
    Keyboard.dismiss();
    const label = text.trim();
    if (!label) return;

    try {
      await createGoal(label);

      setSnackType('save');
      setSnackMessage('목표를 저장했어요');
      setSnackVisible(true);

      setTimeout(() => setSnackVisible(false), 3000);

      // 저장 후 뒤로
      // @ts-ignore
      navigation.goBack();
    } catch (e) {
      console.error(e);
    }
  };

  const isValid = text.trim().length > 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <KeyboardAvoidingView
        style={s.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* 헤더 */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="black" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleClear}>
            <Text style={s.clearText}>지우기</Text>
          </TouchableOpacity>
        </View>

        {/* 본문 */}
        <Text style={s.title}>목표를 입력해 주세요</Text>
        <TextInput
          style={s.input}
          placeholder="예) 매일 일기 5줄"
          value={text}
          onChangeText={setText}
          returnKeyType="done"
          onSubmitEditing={handleSave}
        />

        {/* 저장 버튼 */}
        <TouchableOpacity
          style={[s.saveButton, isValid ? s.saveButtonEnabled : s.saveButtonDisabled]}
          disabled={!isValid}
          onPress={handleSave}
        >
          <Text style={[s.saveText, { color: isValid ? '#fff' : '#aaa' }]}>저장</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>

      {/* 삭제 Snack */}
      {SnackVisible && SnackType === 'delete' && (
        <CustomSnack
          message={SnackMessage}
          actionText="실행 취소"
          onAction={() => {
            setText(lastText);
            setSnackVisible(false);
          }}
          onClose={() => setSnackVisible(false)}
        />
      )}

      {/* 저장 Snack */}
      {SnackVisible && SnackType === 'save' && (
        <CustomSnack
          message={SnackMessage}
          actionText="실행 취소"
          onAction={() => {
            setText(lastText);
            setSnackVisible(false);
          }}
          onClose={() => setSnackVisible(false)}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
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
