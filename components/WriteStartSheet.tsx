import { router } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';


interface Props {
  bottomSheetRef: React.RefObject<any>;
  setSelectedEmotion: (value: string) => void;
}

const emotions = [
  { emoji: '😄', label: '기쁨' },
  { emoji: '😍', label: '사랑' },
  { emoji: '😌', label: '평온' },
  { emoji: '😢', label: '슬픔' },
  { emoji: '😡', label: '분노' },
  { emoji: '😨', label: '두려움' },
  { emoji: '😕', label: '혼란' },
  { emoji: '😐', label: '무감정' },
  { emoji: '🤯', label: '벅참' },
];

export default function WriteStartSheet({ bottomSheetRef, setSelectedEmotion }: Props) {
  return (
    <View style={styles.Bottomcontainer}>
      <Text style={styles.BottomTitle}>오늘 기분이 어때요?</Text>
      <View style={styles.contentContainer}>
        {emotions.map(({ emoji, label }) => {
          const emotion = `${emoji} ${label}`;
          return (
            <View key={label} style={styles.Buttoncontainer}>
              <TouchableOpacity
                style={styles.BottomButton}
                onPress={() => {
                  setSelectedEmotion(emotion);
                  bottomSheetRef.current?.close();
                  router.push({
                    pathname: '/(tabs)/add/writescreen',
                    params: { selectedEmotion: emotion },
                  });
                }}
              >
                <Text style={styles.BottomEmotion}>{emoji}</Text>
              </TouchableOpacity>
              <Text style={styles.BottomEmotionText}>{label}</Text>
            </View>
          );
        })}
      </View>
      <TouchableOpacity style={styles.skip} onPress={() => bottomSheetRef.current?.close()}>
        <Text>건너뛰기</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  contentContainer: {
    flex: 1,
    paddingLeft: 10,
    paddingTop: 20,
    alignItems: "center",
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    margin: 24,
    marginTop: 0,
  },
  Bottomcontainer: {
    flex: 1,
    paddingTop: 10,
    alignItems: "center",
    margin: 10,
  },
  Buttoncontainer: {
    alignItems: "center",
  },
  BottomTitle: {
    fontSize: 22,
    fontWeight: '600',
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
    marginBottom: 5,
  },
  BottomEmotion: {
    fontSize: 35,
    fontWeight: '500',
  },
  BottomEmotionText: {
    fontSize: 14,
    fontWeight: '400',
    marginTop: 10,
  },
  skip: {
    padding: 10,
    height: 50,
    width: 343,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#EEE',
    borderRadius: 22,
    fontWeight: '800',
    marginBottom: 100,
  },
});
