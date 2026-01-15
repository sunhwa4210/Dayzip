import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

const CHECK_ICON = require('@/assets/icons/check-circle.png');

type Props = {
  message: string;
};

export default function CopiedToast({ message }: Props) {
  return (
    <View style={styles.toastContainer}>
      <Image source={CHECK_ICON} style={styles.icon} />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center', 
    width: 'auto',               
    maxWidth: 320, 
    padding: 15,
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:'center',
    zIndex: 999,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
  },
  icon: {
    width: 15,
    height: 15,
    marginRight: 12,
  },
  message: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'Pretendard-Bold',
  },
});
