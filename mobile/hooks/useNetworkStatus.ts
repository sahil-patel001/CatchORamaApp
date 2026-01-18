import { useState, useEffect, useCallback } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { Alert } from 'react-native';

export function useNetworkStatus() {
  const [isConnected, setIsConnected] = useState<boolean | null>(true);
  const [isInternetReachable, setIsInternetReachable] = useState<boolean | null>(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const wasConnected = isConnected;
      const nowConnected = state.isConnected;
      
      setIsConnected(state.isConnected);
      setIsInternetReachable(state.isInternetReachable);

      // Show alert when connection is lost
      if (wasConnected && !nowConnected) {
        Alert.alert(
          'No Internet Connection',
          'Please check your network settings and try again.',
          [{ text: 'OK' }]
        );
      }
    });

    // Initial check
    NetInfo.fetch().then((state) => {
      console.log('[Network] Initial state:', state.isConnected, state.isInternetReachable);
      setIsConnected(state.isConnected);
      setIsInternetReachable(state.isInternetReachable);
    });

    return () => unsubscribe();
  }, [isConnected]);

  const checkConnection = useCallback(async (): Promise<boolean> => {
    try {
      const state = await NetInfo.fetch();
      console.log('[Network] Check connection:', state.isConnected, state.isInternetReachable);
      
      // Be more lenient - only check isConnected, not isInternetReachable
      // as isInternetReachable can be null or false even when connected
      const connected = state.isConnected;
      
      if (!connected) {
        Alert.alert(
          'No Internet Connection',
          'Please check your network settings and try again.',
          [{ text: 'OK' }]
        );
        return false;
      }
      
      return true;
    } catch (error) {
      console.log('[Network] Error checking connection:', error);
      // If there's an error checking, assume we're connected and let the API call fail naturally
      return true;
    }
  }, []);

  return {
    isConnected: isConnected ?? true,
    checkConnection,
  };
}