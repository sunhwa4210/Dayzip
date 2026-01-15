import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import CloseIcon from '../components/icons/Close';
interface Props {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onClose: () => void;
}
//실제 ui 컴포넌트 
export default function Toast({ message, actionLabel, onAction, onClose }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{message}</Text>

      {actionLabel && (
        <TouchableOpacity onPress={onAction} style={styles.actionBtn}>
          <Text style={styles.actionText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
        <CloseIcon width={20} height={20}/>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: 'hsla(0, 0%, 7%, 1)',
    borderRadius: 16,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 5,
    zIndex: 999,
    width: 351,
    height: 56,
  },
  text: {
    color: 'hsla(0, 0%, 98%, 1)',
    fontSize: 14,
    flex: 1,
    fontWeight: '700',
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#444',
    marginLeft: 8,
  },
  actionText: {
    color: '#ccc',
    fontSize: 14,
  },
  closeBtn: {
    paddingHorizontal: 8,
    marginLeft: 4,
  },
  closeText: {
    color: '#888',
    fontSize: 18,
  },
});
