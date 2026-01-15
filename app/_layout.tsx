import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { iapService } from '@/services/iapService';
import { usePremiumStore } from '@/state/premiumStore';

export default function RootLayout() {
  const { loadPremiumStatus } = usePremiumStore();

  useEffect(() => {
    // Inicializa sistema premium e IAP
    const initializePremium = async () => {
      // Carrega status premium do SQLite
      await loadPremiumStatus();
      
      // Configura listeners de compra
      iapService.setupPurchaseListeners();
      
      // Verifica compras no startup
      await iapService.checkPurchaseOnStartup();
    };

    initializePremium();
  }, [loadPremiumStatus]);

  return (
    <>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="create-event" />
        <Stack.Screen name="event/[id]" />
        <Stack.Screen name="profile" />
      </Stack>
    </>
  );
}
