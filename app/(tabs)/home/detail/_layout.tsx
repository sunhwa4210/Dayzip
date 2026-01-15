import { Stack } from 'expo-router';

export default function DetailLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="index" 
        options={{ 
          title: '일기 상세',
          headerShown: false 
        }} 
      />
    </Stack>
  );
}