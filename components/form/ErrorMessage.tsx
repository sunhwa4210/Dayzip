import React from 'react';
import { StyleSheet, Text } from 'react-native';

interface ErrorMessageProps {
  message?: string;
}

const ErrorMessage = ({ message }: ErrorMessageProps) => {
  if (!message) return null;

  return <Text style={styles.errorText}>{message}</Text>;
};

const styles = StyleSheet.create({
  errorText: {
    marginTop: 6,
    fontSize: 12,
    color: 'hsla(3, 86%, 60%, 1)',
  },
});

export default ErrorMessage;