import CustomButton from '@/components/CustomButton';
import { router, useLocalSearchParams } from 'expo-router';
import { Image, StyleSheet, Text, View } from 'react-native';

export default function WelcomeScreen() {
  const params = useLocalSearchParams();
  const name = typeof params.name === 'string' ? params.name : '';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {name ? `${name}님 반가워요` : '반가워요!'}
      </Text>
      <Text style={styles.subtitle}>
        저와 함께 하루를 돌아봐요
      </Text>
      <Image
        source={require('@/assets/images/Subtract.png')} // 실제 캐릭터 이미지 경로로 변경
        style={styles.character}
        resizeMode="contain"
      />

      <View style={styles.bottom}>
              <CustomButton
                variant='next'
                label='다음'
                onPress={() => router.push({ pathname: '/add/writescreen'})}
              />
            </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#222',
  },
  subtitle: {
    fontSize: 18,
    color: '#555',
    marginBottom: 36,
  },
  character: {
    width: 180,
    height: 180,
  },
  bottom: {
    width: '100%',
    position: 'absolute',
    bottom: 32,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
});
