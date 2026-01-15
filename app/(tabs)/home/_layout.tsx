import { Stack } from "expo-router"
export default function HomeLayout () {
    return (
        <Stack>
            <Stack.Screen name="DayView"
            options={{title: "하루",
            headerShown: false}}/>

            <Stack.Screen name="MonthView"
            options={{title: "월",
            headerShown: false}}/>

            <Stack.Screen name="WeekView"
            options={{title: "주",
            headerShown: false}}/>

            <Stack.Screen name="detail" options={{ headerShown: false }} />
        </Stack>
    )
}