import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../context/AuthContext';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="login" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen 
            name="product/[id]" 
            options={{ 
              headerShown: true,
              title: 'Edit Product',
              headerStyle: { backgroundColor: '#4F46E5' },
              headerTintColor: '#fff',
            }} 
          />
        </Stack>
      </AuthProvider>
    </SafeAreaProvider>
  );
}