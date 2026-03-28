// src/navigation/AppNavigator.js
// Registers all screens including the new AboutMeScreen and InterviewRoomScreen.

import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../firebase';
import { StorageService } from '../utils/storage';

import LoginScreen          from '../screens/auth/LoginScreen';
import MainScreen           from '../screens/main/MainScreen';
import ChatConversationScreen from '../screens/main/ChatConversationScreen';
import AboutMeScreen        from '../screens/main/AboutMeScreen';
import InterviewRoomScreen  from '../screens/main/InterviewRoomScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkStoredSession = async () => {
      const session = await StorageService.getUserSession();
      if (session) {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
          if (firebaseUser) {
            setUser(firebaseUser);
          } else {
            StorageService.clearUserSession();
            setUser(null);
          }
          setLoading(false);
        });
        return unsubscribe;
      } else {
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

  if (loading) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            {/* ── Authenticated stack ─────────────────────────────────────── */}

            {/* Main tab screen */}
            <Stack.Screen name="Main" component={MainScreen} />

            {/* Chat conversation overlay */}
            <Stack.Screen
              name="ChatConversation"
              component={ChatConversationScreen}
              options={{ headerShown: false, headerBackTitleVisible: false }}
            />

            {/* About Me profile form */}
            <Stack.Screen
              name="AboutMe"
              component={AboutMeScreen}
              options={{
                headerShown:         false,
                animation:           'slide_from_bottom',   // feels like a modal/sheet
                gestureEnabled:      true,
                gestureDirection:    'vertical',
                // Prevent dismissal by swipe when coming from "must complete profile" flow
                // (controlled per-call via route.params.preventDismiss if needed)
              }}
            />

            {/* Full-screen AI interview room */}
            <Stack.Screen
              name="InterviewRoom"
              component={InterviewRoomScreen}
              options={{
                headerShown:      false,
                animation:        'fade',         // cinematic entrance
                gestureEnabled:   false,          // prevent accidental swipe-back during interview
              }}
            />
          </>
        ) : (
          /* ── Unauthenticated stack ─────────────────────────────────── */
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}