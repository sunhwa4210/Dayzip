import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// getDocs를 추가로 import 
import { addDoc, collection, getDocs, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../firebase'; // 경로 확인 필요

// 아이콘
import BackIcon from '../../components/icons/Back';
// 폼 컴포넌트 모듈 import
import { FieldGroup, Input } from '../../components/form';
//토스트 훅
import { useToast } from '../../hooks/useToast';

export default function NewChapter() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [nameError, setNameError] = useState('');
  const [descError, setDescError] = useState('');
  
  const { show, ToastView } = useToast();

  const handleSave = async () => {
    let hasError = false;

    if (!name.trim()) {
      setNameError('이름을 입력해 주세요.');
      hasError = true;
    } else if ([...name].length > 20) {
      setNameError('최대 20자까지 입력이 가능해요.');
      hasError = true;
    }

    if ([...description].length > 100) {
      setDescError('최대 100자까지 입력 가능해요.');
      hasError = true;
    }

    if (hasError || isSaving) return;

    setIsSaving(true);
    const uid = auth.currentUser?.uid;

    if (!uid) {
      console.error("User not logged in");
      setIsSaving(false);
      return;
    }

    try {
      const chaptersRef = collection(db, 'users', uid, 'chapters');
      
      // 현재 챕터 개수를 가져와서 다음 order 값으로 사용
      const snapshot = await getDocs(chaptersRef);
      const currentChapterCount = snapshot.size;

      // users/{uid}/chapters 컬렉션에 새 문서를 추가
      await addDoc(chaptersRef, {
        name: name.trim(),
        description: description.trim(),
        createdAt: serverTimestamp(),
        order: currentChapterCount, // order 필드
      });
      
      show(`"${name}" 챕터를 추가했습니다.`);
      router.back();

    } catch (error) {
      console.error("Error adding chapter: ", error);
      setIsSaving(false);
    }
  };
  
  const isValid = name.trim().length > 0 && !nameError && !descError;

  return (
    <SafeAreaView style={styles.container}>
       <View style={styles.headerWrapper}>
        <View style={styles.headerWrapperLeft}>
          <Pressable onPress={() => router.back()} disabled={isSaving}>
            <BackIcon width={24} height={24} />
          </Pressable>
          <Text style={styles.title}>새 챕터</Text>
        </View>
        <View style={styles.headerWrapperRight}>
          <Pressable onPress={handleSave} disabled={!isValid || isSaving}>
            {isSaving ? (
              <ActivityIndicator color="#FF7A00" />
            ) : (
              <Text style={[styles.saveText, isValid && styles.saveActive]}>저장</Text>
            )}
          </Pressable>
        </View>
      </View>

      <FieldGroup label="이름" required errorMessage={nameError}>
        <Input value={name} onChange={setName} placeholder="이름을 입력해 주세요" hasError={!!nameError} maxLength={20} onValidate={setNameError} />
      </FieldGroup>
      <FieldGroup label="설명" errorMessage={descError}>
        <Input value={description} onChange={setDescription} placeholder="설명을 입력해 주세요" hasError={!!descError} maxLength={100} onValidate={setDescError} />
      </FieldGroup>
      <View style={styles.actions}>
        <Pressable onPress={() => router.back()} disabled={isSaving}>
          <Text style={styles.cancelText}>취소</Text>
        </Pressable>
      </View>
      <ToastView />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 32,
    paddingHorizontal: 20,
  },
  headerWrapper:{
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerWrapperLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  headerWrapperRight:{},
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  actions: {
    marginTop: 24,
  },
  cancelText: {
    fontSize: 16,
    color: '#FF3B30',
  },
  saveActive: {
    color: 'hsla(24, 100%, 49%, 1)',
  },
  saveText: {
    color: 'hsla(0, 0%, 71%, 1)',
    fontSize: 16,
    fontWeight: '400',
  },
});

