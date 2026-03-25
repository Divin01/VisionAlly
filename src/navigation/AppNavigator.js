// src/navigation/AppNavigator.js
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../firebase';
import { StorageService } from '../utils/storage';

import LoginScreen from '../screens/auth/LoginScreen';
import MainScreen from '../screens/main/MainScreen';
import ChatConversationScreen from '../screens/main/ChatConversationScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check stored session first for instant login
    const checkStoredSession = async () => {
      const session = await StorageService.getUserSession();
      if (session) {
        // Wait for auth state to confirm
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
          if (firebaseUser) {
            setUser(firebaseUser);
          } else {
            // Session exists but user not authenticated, clear storage
            StorageService.clearUserSession();
            setUser(null);
          }
          setLoading(false);
        });

        return unsubscribe;
      } else {
        // No stored session, listen to auth state
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
          setUser(firebaseUser);
          setLoading(false);
        });

        return unsubscribe;
      }
    };

    const unsubscribe = checkStoredSession();
    return () => {
      if (unsubscribe && typeof unsubscribe.then === 'function') {
        unsubscribe.then((unsub) => unsub && unsub());
      }
    };
  }, []);

  if (loading) {
    return null; // Or a loading screen
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="Main" component={MainScreen} />
            <Stack.Screen 
              name="ChatConversation" 
              component={ChatConversationScreen}
              options={{
                headerShown: false,
                headerBackTitleVisible: false,
              }}
            />

          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}