import { Stack } from "expo-router"
export default function MyLayout () {
    
    return (
        <Stack>
            <Stack.Screen name="index"
            options={{title: "내 프로필 ",
            headerShown: false}}/>

            <Stack.Screen name="Settings"
            options={{title: "설정 ",
            headerShown: false}}/>

            <Stack.Screen name="loginSettings"
            options={{title: "소셜로그인 설정 ",
            headerShown: false}}/>

            <Stack.Screen name="birthSettings"
            options={{title: "생년월일 설정 ",
            headerShown: false}}/>

            <Stack.Screen name="GoalEditor"
            options={{title: "목표 설정 ",
            headerShown: false}}/>
        </Stack>
        
    )
}