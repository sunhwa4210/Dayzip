import React from 'react';
import { Image, StyleSheet, Text, TextStyle, TouchableOpacity, ViewStyle } from 'react-native';
import TagIcon from '../components/icons/Tag';
type Props = {
  label?: string;
  imageSource?: any;
  onPress?: () => void;
  style?: ViewStyle | ViewStyle[];
  selected?: boolean;//search tag 관련
  variant: 'default' | 'emotion' | 'date' | 'date2' | 'close' | 'check' | 'checked' | 'advice' 
  | 'share' | 'download' | 'save' | 'filled' | 'light' | 'BottomButton' | 'next' | 'goal' | 'save1' |'cancel1' | 'tag' | 'chapter';
};


export default function CustomButton({ label, onPress, imageSource, variant = 'default',selected }: Props) {
  const buttonStyle: ViewStyle[] = [styles.textbutton];
  const textStyle: TextStyle[] = [styles.text];

  if (variant === 'filled') {
    buttonStyle.push(styles.textbutton);
  }

  else if (variant === 'emotion') {
    buttonStyle.push(styles.moodButton);
    textStyle.push(styles.moodText);
  }

  else if (variant === 'date') {
    buttonStyle.push(styles.dateButton);
    textStyle.push(styles.dateText);
  }

  else if (variant === 'date2') {
    buttonStyle.push(styles.dateButton2);
    textStyle.push(styles.dateText);
  }

  else if (variant === 'close') {
    buttonStyle.push(styles.closeButton);
  }

  else if (variant === 'check') {
    buttonStyle.push(styles.checkButton);
  }

  else if (variant === 'checked') {
    buttonStyle.push(styles.checkedButton);
  }

  else if (variant === 'advice') {
    buttonStyle.push(styles.adviceButton);
    textStyle.push(styles.dateText);
  }

  else if (variant === 'BottomButton') {
    buttonStyle.push(styles.BottomButton);
  }

  else if (variant === 'save') {
    buttonStyle.push(styles.saveButton);
    textStyle.push(styles.saveText);
  }

  else if (variant === 'next') {
    buttonStyle.push(styles.nextButton);
    textStyle.push(styles.nextText);
  }

  else if (variant === 'goal') {
    buttonStyle.push(styles.goalButton);
    textStyle.push(styles.text);
  }

  else if(variant ==='save1') {
    buttonStyle.push(styles.save1);
    textStyle.push(styles.saveText)
  }

  else if(variant === 'cancel1'){
    buttonStyle.push(styles.cancel1);
    textStyle.push(styles.cacnelText)
  }

else if (variant === 'tag') {
  // 기본 버튼 스타일 추가
  buttonStyle.push(styles.tag);
  textStyle.push(styles.tagText);

  // selected=true일 경우 강조 스타일 추가
  if (selected) {
    buttonStyle.push(styles.tagSelected);
    textStyle.push(styles.tagTextSelected);
  }

  return (
    <TouchableOpacity onPress={onPress} style={buttonStyle}>
      <Text style={textStyle}>{label}</Text>
      <TagIcon width={18} height={18} stroke={selected ? 'hsla(18, 100%, 62%, 1)' : 'hsla(0, 0%, 49%, 1)'} />
    </TouchableOpacity>
  );
}

  return (
    <TouchableOpacity onPress={onPress} style={buttonStyle}>
      {imageSource && <Image source={imageSource} style={styles.icon} />}
      {label && <Text style={textStyle}>{label}</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  textbutton: {
    backgroundColor: 'white',
    borderColor: '#E0E0E0',
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    marginHorizontal: 6,
  },

  text: {
    color: '#7C7C7C',
    fontSize: 14,
    fontWeight: '600',
  },

  icon: {
    width: 24,
    height: 24,
  },

  moodButton: {
    paddingHorizontal: 0,
    width: 95,
    height: 45,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },

  moodText: {
    fontSize: 16,
    fontWeight: '500',
  },


  dateButton: {
    height: 45,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 0,
    flex: 1,
  },
  

  dateButton2: {
    height: 45,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    justifyContent: 'center',
    paddingLeft: 20,
    backgroundColor: 'white',
    paddingHorizontal: 0,
    flex: 3,
  },

  dateText: {
    fontSize: 16,
    fontWeight: '500',
  },

  closeButton: {
    width: 45,
    height: 45,
    borderRadius: 1000,
    backgroundColor: '#EEE',
    justifyContent: 'center',
    alignItems: 'center',
  },

  checkButton: {
    width: 56,
    height: 45,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
    backgroundColor: '#EEE',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },

  checkedButton: {
    height: 45,
    width: 56,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    backgroundColor: '#1B1B1B',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 0,
  },

  adviceButton: {
    height: 37,
    borderRadius: 1000,
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderWidth: 1,
    backgroundColor: '#EEE',
    borderColor: '#E0E0E0',
    alignSelf: "flex-start",
    maxWidth: '80%',
    marginBottom: 10,
  },

  adviceText: {
    fontSize: 16,
    fontWeight: '500',
  },

  BottomButton: {
    height: 50,
    borderRadius: 22,
    backgroundColor: '#EEE',
    alignItems: 'center',
    justifyContent: 'center',
    flex:1,
    marginTop: 0,
  },

  saveButton: {
    borderRadius: 22,
    backgroundColor: '#1B1B1B',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 0,
    flex:5,
    height: 50,
  },

  saveText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFF',
  },

  nextButton: {
    borderRadius: 22,
    width:300,
    backgroundColor: 'White',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 0,
    flex:5,
    height: 50,
  },

  nextText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFF',
  },

  goalButton: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
  },

  save1:{
    backgroundColor: '#000',
    height: 50,
    width: 167,
    justifyContent: 'center',
    alignItems:'center',
    gap: 8,
    borderRadius: 22,
  },

  cancel1:{
    backgroundColor: '#CCC',
    height: 50,
    width: 167,
    justifyContent: 'center',
    alignItems:'center',
    gap: 8,
    borderRadius: 22,
  },

  cacnelText:{
    fontSize: 16,
    fontWeight: '500',
    color: '#3F3F3F',
  },

// 태그 버튼 기본 스타일
tag: {
    backgroundColor: 'white',
    borderColor: '#E0E0E0',
    borderWidth: 1,
    paddingHorizontal: 12,
    borderRadius: 15, //radius 12로 진행하긴 했으나 화면상이랑 많이 달라서 수정
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center'

},

// 태그 버튼 선택됨 상태일 때 스타일
tagSelected: {
  borderColor: '#FF6B00',
  backgroundColor: '#FFF3EB',
},

// 태그 텍스트 기본 스타일
tagText: {
  color: 'hsla(0, 0%, 49%, 1)',
  fontSize: 12,
  fontWeight: '700',
  marginRight: 2,
},

// 태그 텍스트 선택됨 상태일 때
tagTextSelected: {
  color: 'hsla(18, 100%, 62%, 1)',
},

  
});
