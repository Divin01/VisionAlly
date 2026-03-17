import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { ChatProvider } from './src/contexts/ChatContext.js';
import AppNavigator from './src/navigation/AppNavigator.js';

export default function App() {
  return (
    <ChatProvider>
      <StatusBar style="auto" />
      <AppNavigator />
    </ChatProvider>
  );
}