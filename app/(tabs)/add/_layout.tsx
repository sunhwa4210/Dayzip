import { Stack } from "expo-router";

export default function DiaryLayout() {
    return (
        <Stack>
            <Stack.Screen 
              name="index"
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="lodding"
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="diaryresult"
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="writescreen"
              options={{ headerShown: false }}
            />
            <Stack.Screen 
              name="onboarding"
              options={{ headerShown: false }}
            />
            
        </Stack>
    )
}
