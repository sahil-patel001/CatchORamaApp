import { useState, useEffect, useCallback } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { Alert } from 'react-native';

export function useNetworkStatus() {
  const [isConnected, setIsConnected] = useState<boolean | null>(true);
  const [isInternetReachable, setIsInternetReachable] = useState<boolean | null>(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const wasConnected = isConnected;
      const nowConnected = state.isConnected && state.isInternetReachable;
      
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
      setIsConnected(state.isConnected);
      setIsInternetReachable(state.isInternetReachable);
    });

    return () => unsubscribe();
  }, [isConnected]);

  const checkConnection = useCallback(async (): Promise<boolean> => {
    const state = await NetInfo.fetch();
    const connected = state.isConnected && state.isInternetReachable;
    
    if (!connected) {
      Alert.alert(
        'No Internet Connection',
        'Please check your network settings and try again.',
        [{ text: 'OK' }]
      );
    }
    
    return connected ?? false;
  }, []);

  return {
    isConnected: isConnected && isInternetReachable,
    checkConnection,
  };
}