import { Stack } from "expo-router"
export default function reportLayout () {
    return (
        <Stack>
            <Stack.Screen name="index"
            options={{title: "분석 ",
            headerShown: false}}/>
            <Stack.Screen name="detail"
            options={{title: "세부 ",
            headerShown: false}}/>
            <Stack.Screen name="lodding"
            options={{title: "로딩 ",
            headerShown: false}}/>
            <Stack.Screen name="result"
            options={{title: "결과 ",
            headerShown: false}}/>
        </Stack>
    )
}