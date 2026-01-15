import { Stack } from "expo-router";

export default function ChapterLayout() {
  console.log(' chapter layout loaded'); 
  return (
    <Stack
        screenOptions={{
        headerShown: false,
      }}>
      <Stack.Screen
        name="index"
        options={{
          title: "챕터 목록",
        }}
      />
      <Stack.Screen
        name="new"
        options={{
          title: "새 챕터 작성",
        }}
      />
      <Stack.Screen
        name="edit/[id]"
        options={{
          title: "챕터 수정",
        }}
      />
    </Stack>
  );
}
