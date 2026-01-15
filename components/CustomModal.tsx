import React from 'react';
import {
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';

type Props = {
  visible: boolean;
  title: string;
  message: string;
  cancelText: string;
  confirmText: string;
  onCancel: () => void;
  onConfirm: () => void;

  // 👉 아래는 커스터마이징 가능한 optional 스타일 props
  cancelButtonStyle?: ViewStyle;
  confirmButtonStyle?: ViewStyle;
  cancelTextStyle?: TextStyle;
  confirmTextStyle?: TextStyle;
};

export default function CustomConfirmModal({
  visible,
  title,
  message,
  cancelText,
  confirmText,
  onCancel,
  onConfirm,
  cancelButtonStyle,
  confirmButtonStyle,
  cancelTextStyle,
  confirmTextStyle,
}: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.modalBox}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.buttonRow}>
            <View style={styles.buttonWrap}>
              <TouchableOpacity
                style={[styles.button, styles.cancel, cancelButtonStyle]}
                onPress={onCancel}
              >
                <Text style={[styles.cancelText, cancelTextStyle]}>
                  {cancelText}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.buttonWrap}>
              <TouchableOpacity
                style={[styles.button, styles.confirm, confirmButtonStyle]}
                onPress={onConfirm}
              >
                <Text style={[styles.confirmText, confirmTextStyle]}>
                  {confirmText}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },

  modalBox: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 24,
  },

  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222',
    marginBottom: 20,
  },

  message: {
    fontSize: 16,
    fontWeight: '400',
    color: '#848484',
  },

  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },

  buttonWrap: {
    flex: 1,
    marginHorizontal: 0,
  },

  button: {
    height: 50,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 3,
  },

  cancel: {
    backgroundColor: '#EEEEEE',
  },
  confirm: {
    backgroundColor: '#1B1B1B',
  },
  cancelText: {
    color: '#3F3F3F',
    fontWeight: '600',
    fontSize: 14,
  },
  confirmText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
});
