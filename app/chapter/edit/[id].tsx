import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// 아이콘
import BackIcon from '../../../components/icons/Back';
// 폼 컴포넌트 모듈 import
import { FieldGroup, Input } from '../../../components/form';
//토스트 훅
import { useToast } from '../../../hooks/useToast';
//모달
import CustomConfirmModal from '../../../components/CustomModal';

 type Props = {
  chapterId: string;
  onDeleted?: () => void;
};

export default function EditChapter({ chapterId, onDeleted }: Props) {
  const router = useRouter();
  const params = useLocalSearchParams(); 
  //입력값 상태 
  const [name, setName] = useState(typeof params.name === 'string' ? params.name : ''); // 기본값 예시
  const [description, setDescription] = useState(typeof params.description === 'string' ? params.description : '');
 // 삭제 모달 노출 여부
  const [isModalVisible, setModalVisible] = useState(false);
 //에러 메세지 상태 
   const [nameError, setNameError] = useState('');
   const [descError, setDescError] = useState('');

  const handleSave = () => {
    let hasError = false;

    // 최종 유효성 검사 
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

    if (hasError) return;

    show(`"${name}" 챕터를 수정했습니다.`); //토스트 띄우기
    router.replace({
    pathname: '/chapter',
    params: {
    updatedId: params.id as string,
    updatedName: name,
    updatedDescription: description, }, // 쿼리 파라미터로 전달
});
  };

  //버튼 활성화 
  const isValid =
  name.trim().length > 0 &&
  description.trim().length > 0 &&
  !nameError &&
  !descError;

  //토스트 훅 사용
  const { show, ToastView } = useToast();

  const handleDelete = () => {
    // TODO: API 호출 or 로컬 데이터에서 삭제
    // 예시로 삭제 완료 시 콜백 실행
    onDeleted?.(); // 부모 컴포넌트에서 리스트에서 제거

    // 토스트 띄우기
    show('챕터를 삭제했습니다.', {
      actionLabel: '실행 취소',
      onAction: () => {
        console.log('삭제 실행 취소됨');

      },
    });

    // 모달 닫기
    setModalVisible(false);
  };

  return (
    <SafeAreaView style={styles.container}>

      {/* 상단 헤더 */}
      <View style={styles.headerWrapper}>
        <View style={styles.headerWrapperLeft}>
          <Pressable onPress={() => router.push('/chapter')}>
            <BackIcon width={24} height={24} />
          </Pressable>
          <Text style={styles.title}>챕터 수정</Text>
        </View>

        <View style={styles.headerWrapperRight}>

          {/* 저장*/}
        <Pressable
          onPress={handleSave}
          disabled={!isValid}
        >
          <Text style={[styles.saveText, isValid && styles.saveActive]}>저장</Text>
        </Pressable>

        </View>
      </View>

      {/* 이름 필드 */}
      <FieldGroup
        label="이름"
        required
        errorMessage={nameError}
      >
        <Input
          value={name}
          onChange={setName}
          placeholder="이름을 입력해 주세요"
          hasError={!!nameError}
          maxLength={20}
          onValidate={setNameError}
        />
      </FieldGroup>

      {/* 설명 필드 */}
      <FieldGroup
        label="설명"
        errorMessage={descError}
      >
        <Input
          value={description}
          onChange={setDescription}
          placeholder="설명을 입력해 주세요"
          hasError={!!descError}
          maxLength={100}
          onValidate={setDescError}
        />
      </FieldGroup>

      {/* 커스텀 확인 모달 */}
      <CustomConfirmModal
        visible={isModalVisible}
        title="챕터를 삭제할까요?"
        message="포함된 일기는 유지됩니다."
        cancelText="취소"
        confirmText="삭제"
        onCancel={() => setModalVisible(false)}
        onConfirm={handleDelete}
      />

      {/* 삭제하기 */}
      <View style={styles.actions}>
        <Pressable onPress={() => {  console.log('모달 열림!'); setModalVisible(true);}}>
          <Text style={styles.cancelText}>삭제하기</Text>
        </Pressable>
        
      </View>
      <View>
        <Text style={styles.discriptionText}>포함된 일기는 유지하고 챕터만 삭제됩니다.</Text>
      </View>
      <ToastView />
    </SafeAreaView>
  );
}

export const options = {
  headerShown: false,
};

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
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12
  },
  headerWrapperRight:{

  },
  save: {},
  
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  fieldWrapper: {
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#FAFAFA',
  },
  inputError: {
    borderColor: '#FF3B30',
  },
  errorText: {
    marginTop: 4,
    fontSize: 12,
    color: '#FF3B30',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
discriptionText: {
  color: 'hsla(0, 0%, 49%, 1)',
  fontWeight: 400,
  fontSize:14,
  top: 6,

}
});

