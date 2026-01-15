import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity } from 'react-native';

interface CustomButtonProps {
  variant: 'BottomButton' | 'save';
  imageSource?: any;
  label?: string;
  onPress?: () => void;
}

export default function CustomButton({
  variant,
  imageSource,
  label,
  onPress,
}: CustomButtonProps) {
  return (
    <TouchableOpacity style={[styles.button, styles[variant]]} onPress={onPress}>
      {imageSource && <Image source={imageSource} style={styles.icon} />}
      {label && <Text style={styles.label}>{label}</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 30,
  },
  BottomButton: {
    backgroundColor: '#F7DC6F',
    width: 60,
    height: 60,
  },
  save: {
    backgroundColor: '#F2994A',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  icon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
  label: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    fontFamily: 'Malgun Gothic',
  },
});
