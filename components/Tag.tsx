import React from 'react';
import { StyleSheet, Text, View } from 'react-native';


type Props = {
  label: string;
};

export default function HashTagPill({ label }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 26,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C7C7CC',
    paddingHorizontal: 8,
    gap: 2,
    backgroundColor: '#FFFFFF',
  },
  text: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3F3F3F',
  },
});
