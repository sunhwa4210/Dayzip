import CustomBottomSheet from '@/components/CustomBottomSheet';
import CustomButton from '@/components/CustomButton';
import CustomModal from '@/components/CustomModal';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Image, Keyboard, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Calendar } from 'react-native-calendars';


import { router, useLocalSearchParams } from "expo-router";

import React, { useEffect, useRef, useState } from 'react';
// Firebase Functions
import { functions } from '@/firebase';
import { httpsCallable } from 'firebase/functions';

const getTodayString =() => {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

export default function WriteScreen() {
  const params = useLocalSearchParams();
  const selectedEmotion = typeof params.selectedEmotion === 'string' ? params.selectedEmotion : '😌 평온';
  
  // 수정 모드 확인
  const isEditMode = params.mode === 'edit';
  const diaryId = typeof params.diaryId === 'string' ? params.diaryId : null;
  const initialContent = typeof params.content === 'string' ? params.content : '';
  const initialImageUrl = typeof params.imageUrl === 'string' ? params.imageUrl : '';
  const initialEmotion = typeof params.emotion === 'string' ? params.emotion : selectedEmotion;
  const initialChapterId = typeof params.chapterId === 'string' ? params.chapterId : '';
  const initialDate = typeof params.date === 'string' ? params.date.split('T')[0] : getTodayString();

  const [text, setText] = useState(initialContent);
  const [showButtons, setShowButtons] = useState(!isEditMode && initialContent.length === 0);


  //ai 메세지 변경
  const [gptResponse, setGptResponse] =useState('일기 작성이 어려울 때 눌러보세요!');

  //감정 선택 및 변경
  const [emotion, setSelectedEmotion] = useState(initialEmotion);


  useEffect(() => {
    if (typeof params.selectedEmotion === 'string') {
      setSelectedEmotion(params.selectedEmotion);
    }
  }, [params.selectedEmotion]);

  //모달
  const [showModal, setShowModal] = useState(false);

  //바텀시트 - 감정
  const profileSheetRef = useRef<BottomSheetModal>(null)
  //바텀시트 - 캘린더
  const calendarSheetRef = useRef<BottomSheetModal>(null)

  //일기장에 글씨 작성 여부
  const isActive = text.trim().length >0;

  //캘린더
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(initialDate);


  // 체크버튼 클릭시 텍스트 이동
  const handleInsert = (insertText: string) => {
    setText(prev => prev + insertText);
    setShowButtons(false);
  };

  // 닫기 버튼 클릭시 글자가 한 글자라도 적혀있으면 모달 띄우기
  const handledismissPress = () => {
    if (text.trim().length > 0){
      setShowModal(true)
    }

    //  아니면 그냥 닫기
    else{
      router.push('/')
    }
  };

  //gpt-4
  const handleGPT4 = async () => {
    try {
      const callable = httpsCallable(functions, 'getDiaryNudge');
      const res: any = await callable({ text });
      const gptText: string = res?.data?.text ?? '조금만 더 써볼까요';
      setGptResponse(gptText);
    } catch (err) {
      console.error('힌트 생성 실패:', err);
      setGptResponse('조금만 더 써볼까요');
    }
  };
    

  //이미지 생성 프롬프트 및 텍스트 전달(일기) 또는 일기 수정
  const handleAIImage = async () => {

    if (text.trim().length > 0){

      // 수정 모드일 경우 이미지 재생성으로 이동
      if (isEditMode && diaryId) {
        console.log('수정 모드: 이미지 재생성');
        console.log('보낼 감정:', emotion);
        console.log('보낼 날짜:', selectedDate);
        console.log('diaryId:', diaryId);

        router.push({
          pathname: '/add/lodding',
          params: { 
            userText: text,
            selectedEmotion: emotion,
            selectedDate: selectedDate,
            diaryId: diaryId, // 수정 모드임을 표시
            mode: 'edit',
            chapterId: initialChapterId,
            prompt: text + "Based on the following story, craft a concise, emotive English prompt for DALL·E 3. A warm illustration featuring a Korean college girl in her twenties. The overall scene uses soft pastel tones, thin clean outlines, minimal shading, and smooth flat coloring. Inspired by Studio Ghibli's 2D animation style — simple, charming, and cozy — with a friendly and heartwarming atmosphere. No text."
          },
        });
        return;
      }

      // 새 일기 작성 모드
      console.log('이미지 생성 프롬프트', text);
      
      console.log('보낼 감정:', emotion);
      console.log('보낼 날짜:', selectedDate);

      router.push({
        pathname: '/add/lodding',
        params: { 
          userText: text,
          selectedEmotion: emotion,
          selectedDate: selectedDate,
          prompt: text + "Based on the following story, craft a concise, emotive English prompt for DALL·E 3. A warm illustration featuring a Korean college girl in her twenties. The overall scene uses soft pastel tones, thin clean outlines, minimal shading, and smooth flat coloring. Inspired by Studio Ghibli's 2D animation style — simple, charming, and cozy — with a friendly and heartwarming atmosphere. No text."
         },
      });
    }
  };


  return (

    //모달은 커스텀모달을 만들어서 이렇게 텍스트만 넣으면 됨.
    //가끔 이상한 오류로 갑자기 안드로이드에서만 사라지는 경우가 있어서 이 부분은 주의 필요. 다만, 다시 돌아올 때 많음...
    //View 밖에 위치시키는게 가장 안전함. 
    //-> 만약 사라지는 경우가 있다면 잠깐 View 안으로 넣었다가 저장 후 다시 꺼내서 저장하면 다시 뜰 가능성도 있음
    
    <>
      <CustomModal
        visible={showModal}
        onCancel={() => setShowModal(false)}
        onConfirm={() => {
          setShowModal(false);
          setText('');  //텍스트 지움
          setShowButtons(true); //시간대 선택 버튼 다시 나오게
          setSelectedDate(new Date().toISOString().split('T')[0]); // 오늘 날짜로 설정
          router.replace('/'); //홈화면 이동
        }}
        title="이 일기를 삭제할까요?"
        message="삭제된 일기는 복구할 수 없습니다."
        cancelText="취소"
        confirmText="삭제"
       
    />

    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style ={styles.container}>

      <View style={styles.container}>

        {/*닫기 버튼*/}
        <View style = {styles.row}>
          <View style={styles.leftSide}>
            <CustomButton variant='close'
              imageSource={require('@/assets/images/close.png')}
              onPress ={handledismissPress}/>
          </View>
            
            <View style ={styles.middle}>
              <View style ={styles.emotionWrap}>
                {/* 감정 선택 버튼(바텀시트 띄우기)*/}
                <CustomButton variant='emotion' label = {emotion} 
                onPress={() => {Keyboard.dismiss();
                  profileSheetRef.current?.present()}}/>
              </View>

              {/*날짜 버튼 , 캘린더 구현 */}
              <View style={styles.dateWrap}>
                <CustomButton variant='date' 
                  label={selectedDate ? `${selectedDate}` : '날짜 선택'}
                  onPress={()=> {Keyboard.dismiss();
                    calendarSheetRef.current?.present()}}/>
              </View>
            </View>

          {/*체크 버튼 활성화 여부*/}
          <View style = {styles.rightSide}>
            <CustomButton variant={isActive ? 'checked': 'check' }
              imageSource={require('@/assets/images/Check-Big.png')}
              onPress = {handleAIImage} />
          </View>
        </View>

          
        {/* 상단 시간대 선택 버튼 */}
        {showButtons && (
          <View style={styles.buttonRow2}>
            <CustomButton variant='default' label="아침" onPress={() => handleInsert('아침에 ') } />
            <CustomButton variant='default' label="점심" onPress={() => handleInsert('점심에 ')} />
            <CustomButton variant='default' label="저녁" onPress={() => handleInsert('저녁에 ')} />
            <CustomButton variant='default' label="밤" onPress={() => handleInsert('밤에 ')} />
            <CustomButton variant='default' label="새벽" onPress={() => handleInsert('새벽에 ')} />
            <Text style={{ fontSize: 16, marginTop: 9, marginLeft: 10, color: '#B5B5B5' }}>에</Text>
          </View>
        )}

        {/*사용자가 일기 입력하는 곳*/}
        <TextInput
          style={styles.input}
          placeholder="무슨 일이 있었나요?"
          placeholderTextColor={'#B5B5B5'}
          value={text}
          onChangeText={setText}
          multiline
        />

        {/* AI 질문 캐릭터 및 말풍선*/}
        <View style={styles.adviceRow}>      
          <Image 
          source ={require('@/assets/images/Subtract.png')} 
          style = {styles.CharacterImage}/>

          <CustomButton variant='advice' label= {gptResponse}
          onPress = {handleGPT4}/>
          </View>


        {/* 감정 선택 바텀 시트 */}
        <CustomBottomSheet bottomSheetModalRef={profileSheetRef} snapPoints={['60%']}>
          <View style = {styles.Bottomcontainer}>
          <Text style= {styles.BottomTitle}>오늘 기분이 어때요?</Text>
            <View style={styles.contentContainer}>

              {/*기쁨*/}
              <View style ={styles.Buttoncontainer}>
                <TouchableOpacity style={styles.BottomButton}
                  onPress={() => {setSelectedEmotion("😄 기쁨"); profileSheetRef.current?.dismiss(); }}>
                  <Text style={styles.BottomEmotion}>😄</Text>
                </TouchableOpacity>
                <Text style={styles.BottomEmotionText}>기쁨</Text>
              </View>

              {/*사랑*/}
              <View style = {styles.Buttoncontainer}>
                <TouchableOpacity style={styles.BottomButton}
                  onPress={() => {setSelectedEmotion("😍 사랑"); profileSheetRef.current?.dismiss(); }}>
                  <Text style={styles.BottomEmotion}>😍</Text>
                </TouchableOpacity>
                <Text style={styles.BottomEmotionText}>사랑</Text>
              </View>
              
              {/*평온*/}
              <View style = {styles.Buttoncontainer}>
                <TouchableOpacity style={styles.BottomButton}
                  onPress={() => {setSelectedEmotion("😌 평온"); profileSheetRef.current?.dismiss(); }}>
                  <Text style={styles.BottomEmotion}>😌</Text>
                </TouchableOpacity>
                <Text style={styles.BottomEmotionText}>평온</Text>
              </View>

              {/*슬픔*/}
              <View style = {styles.Buttoncontainer}>
                <TouchableOpacity style={styles.BottomButton}
                  onPress={() => {setSelectedEmotion("😢 슬픔"); profileSheetRef.current?.dismiss(); }}>
                  <Text style={styles.BottomEmotion}>😢</Text>
                </TouchableOpacity>
                <Text style={styles.BottomEmotionText}>슬픔</Text>
              </View>

              {/*분노*/}
              <View style = {styles.Buttoncontainer}>
                <TouchableOpacity style={styles.BottomButton}
                  onPress={() => {setSelectedEmotion("😡 분노"); profileSheetRef.current?.dismiss(); }}>
                  <Text style={styles.BottomEmotion}>😡</Text>
                </TouchableOpacity>
                <Text style={styles.BottomEmotionText}>분노</Text>
              </View>

              {/*두려움*/}
              <View style = {styles.Buttoncontainer}>
                <TouchableOpacity style={styles.BottomButton}
                  onPress={() => {setSelectedEmotion("😨 불안"); profileSheetRef.current?.dismiss(); }}>
                  <Text style={styles.BottomEmotion}>😨</Text>
                </TouchableOpacity>
                <Text style={styles.BottomEmotionText}>불안</Text>
              </View>
              
              {/*혼란*/}
              <View style = {styles.Buttoncontainer}>
                <TouchableOpacity style={styles.BottomButton}
                  onPress={() => {setSelectedEmotion("😕 혼란"); profileSheetRef.current?.dismiss(); }}>
                  <Text style={styles.BottomEmotion}>😕</Text>
                </TouchableOpacity>
                <Text style={styles.BottomEmotionText}>혼란</Text>
              </View>

              {/*무감정*/}
              <View style = {styles.Buttoncontainer}>
                <TouchableOpacity style={styles.BottomButton}
                  onPress={() => {setSelectedEmotion("😐 무심"); profileSheetRef.current?.dismiss(); }}>
                  <Text style={styles.BottomEmotion}>😐</Text>
                </TouchableOpacity>
                <Text style={styles.BottomEmotionText}>무심</Text>
            </View>

            {/*벅참*/}
            <View style = {styles.Buttoncontainer}>
              <TouchableOpacity style={styles.BottomButton}
                onPress={() => {setSelectedEmotion("🤯 벅참"); profileSheetRef.current?.dismiss(); }}>
                <Text style={styles.BottomEmotion}>🤯</Text>
              </TouchableOpacity>
              <Text style={styles.BottomEmotionText}>벅참</Text>
            </View>


                <TouchableOpacity style ={styles.skip} onPress={() => profileSheetRef.current?.dismiss()}>
                  <Text>건너뛰기</Text>
                </TouchableOpacity>
          </View>
      
          </View>
        </CustomBottomSheet>

        {/* 캘린더 */}
        <CustomBottomSheet bottomSheetModalRef={calendarSheetRef} snapPoints={['50%']}>
            <Calendar
              markedDates={selectedDate ? {
                [selectedDate]: { selected: true, selectedColor: 'orange'},
              } : {}
              }
              onDayPress={(day) => {
                setSelectedDate(day.dateString);
                setShowCalendar(false);
                calendarSheetRef.current?.dismiss();
                console.log('선택한 날짜:', day.dateString);
              }}
              style={{ marginTop: 20 }}
            />
        </CustomBottomSheet>



      </View>
      </KeyboardAvoidingView>
      </>

    
    
  );
}

// 스타일 시트
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor:"white",
    paddingTop: 20, //피그마 상에서 16 (아이폰은 16으로 하니까 가려져서 우선 20으로 설정)
    
  },

  buttonRow2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 15,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },

  leftSide: {
    marginLeft: 16,
  },

  middle: {
    flex: 1,
    flexDirection: 'row',
    marginLeft: 0, //피그마 상에서는 12
    marginRight: 0,  //피그마 상에서는 12
  },

  emotionWrap: {
    width: 100, // 고정
    marginRight: 0,
  },

  dateWrap: {
    flex: 1, // 남는 공간ㅇㅔ
    marginLeft: 0,
  },

  rightSide: {
    // 오른쪽 끝에 붙도록 처리
    marginRight: -5,
  },
  
  adviceRow:{
    flexDirection: 'row',
    flexWrap: 'wrap',
  },


  input: {
    flex: 1,
    textAlignVertical: 'top',
    fontSize: 16,
    paddingRight: 20,
    marginLeft: 20,
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 12,

  },

  CharacterImage :{
    width: 90,
    height: 50,
    marginLeft:10,

  },

//바텀시트 스타일

  contentContainer: {
    flex: 1,
    paddingLeft: 10,
    paddingTop: 20,

    alignItems: "center",
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',

    margin:24,
    marginTop:0,
  },

  Bottomcontainer:{
    flex: 1,
    paddingTop: 10,
    alignItems: "center",
    margin: 10
  },

  Buttoncontainer:{
    alignItems: "center",
  },

  BottomTitle:{
    fontSize: 22,
    fontWeight: 600,
  },

 
    BottomButton: {
      backgroundColor: '#eee',
      padding: 10,
      paddingBottom: 2,
      borderRadius: 32,
      alignItems: 'center',
      justifyContent: 'center',
      height: 44,
      fontSize: 44,
      margin: 15,
      marginBottom:5,
    },

    BottomEmotion:{
      fontSize: 35,
      fontWeight: 500,
    },

    BottomEmotionText:{
      fontSize: 14,
      fontWeight: 400,
      marginTop:10,
    },

    // 건너뛰기
    skip:{
      padding: 10,
      height: 50,
      width: 343,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#EEE',
      borderRadius: 22,

      fontWeight: '800',

      marginTop: 100,
    },
    
// 모달 스타일
    message: {
      fontSize: 16,
      fontWeight: '700',
      marginBottom: 20,
      color: '#222',
    },
    text: {
      fontSize: 16,
      fontWeight: '400',
      color: '#848484',
    },
    buttonRow: {
      flexDirection: 'row',
      gap: 16,
      justifyContent: 'center',
    },
    button: {
      backgroundColor: '#1B1B1B',
      height: 50,
      width: 135,
      paddingVertical: 10,
      paddingHorizontal: 40,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 24,
    },
    cancel: {
      backgroundColor: '#eee',
    },
    buttonText1: {
      color: 'white',
      fontWeight: '600',
      fontSize: 14,
    },
    buttonText2: {
      color: '#3F3F3F',
      fontWeight: '600',
      fontSize: 14,
    },
  
});