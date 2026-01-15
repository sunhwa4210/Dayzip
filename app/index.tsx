// app/index.tsx
import { auth } from '@/firebase';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

export default function Gate() {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      try {
        const remember = await SecureStore.getItemAsync('remember_me');

        if (user && remember === '1') {
          router.replace('/(tabs)');
        } else if (user && remember !== '1') {
          await signOut(auth);
          router.replace('/onboarding');
        } else {
          router.replace('/onboarding');
        }
      } finally {
        setChecking(false);
      }
    });
    return () => unsub();
  }, []);

  if (checking) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return null;
}
