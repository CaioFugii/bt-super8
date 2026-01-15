import { Platform, Alert } from 'react-native';
import { usePremiumStore } from '@/state/premiumStore';

// Importação condicional do módulo IAP
let InAppPurchases: any = null;
let isIAPAvailable = false;

try {
  InAppPurchases = require('expo-in-app-purchases');
  isIAPAvailable = true;
} catch (error) {
  console.warn('[IAP] expo-in-app-purchases not available. Running in development mode without IAP.');
  isIAPAvailable = false;
}

/**
 * ID do produto premium (deve ser configurado nas stores)
 * 
 * IMPORTANTE: Este ID deve ser configurado em:
 * - Google Play Console (Android)
 * - App Store Connect (iOS)
 */
export const PREMIUM_PRODUCT_ID = 'premium_lifetime_unlock';

/**
 * Serviço de In-App Purchases
 * 
 * Gerencia compras, restauração e verificação de status premium.
 * Funciona offline após validação inicial.
 */
class IAPService {
  private isInitialized = false;
  private isConnecting = false;

  /**
   * Verifica se o módulo IAP está disponível
   */
  private isAvailable(): boolean {
    return isIAPAvailable && InAppPurchases !== null;
  }

  /**
   * Inicializa a conexão com a store
   */
  async initialize(): Promise<boolean> {
    if (!this.isAvailable()) {
      if (__DEV__) {
        console.log('[IAP] Module not available, skipping initialization');
      }
      return false;
    }

    if (this.isInitialized) {
      return true;
    }

    if (this.isConnecting) {
      return false;
    }

    this.isConnecting = true;

    try {
      // Conecta com a store
      await InAppPurchases.connectAsync();
      this.isInitialized = true;
      this.isConnecting = false;
      
      if (__DEV__) {
        console.log('[IAP] Connected to store');
      }
      
      return true;
    } catch (error) {
      console.error('[IAP] Error connecting to store:', error);
      this.isConnecting = false;
      return false;
    }
  }

  /**
   * Verifica o status de compra ao iniciar o app
   * Deve ser chamado no startup do app
   */
  async checkPurchaseOnStartup(): Promise<void> {
    try {
      const connected = await this.initialize();
      if (!connected) {
        if (__DEV__) {
          console.log('[IAP] Could not connect to store, using local status');
        }
        // Se não conseguir conectar, usa o status local
        await usePremiumStore.getState().loadPremiumStatus();
        return;
      }

      // Verifica compras pendentes (para Android)
      const purchaseHistory = await InAppPurchases.getPurchaseHistoryAsync();
      
      if (purchaseHistory && purchaseHistory.results && purchaseHistory.results.length > 0) {
        // Verifica se há compra do produto premium
        const premiumPurchase = purchaseHistory.results.find(
          (purchase: any) => purchase.productId === PREMIUM_PRODUCT_ID
        );

        if (premiumPurchase) {
          // Usuário tem compra válida
          await this.validatePurchase(premiumPurchase);
        } else {
          // Sem compra premium, verifica status local
          await usePremiumStore.getState().loadPremiumStatus();
        }
      } else {
        // Sem histórico de compras, verifica status local
        await usePremiumStore.getState().loadPremiumStatus();
      }
    } catch (error) {
      console.error('[IAP] Error checking purchase on startup:', error);
      // Em caso de erro, usa status local
      await usePremiumStore.getState().loadPremiumStatus();
    }
  }

  /**
   * Realiza a compra do produto premium
   */
  async purchasePremium(): Promise<boolean> {
    if (!this.isAvailable()) {
      // Em desenvolvimento, simula compra bem-sucedida
      if (__DEV__) {
        Alert.alert(
          'Modo Desenvolvimento',
          'IAP não está disponível no Expo Go. Para testar compras, use um development build.\n\nSimulando compra bem-sucedida...'
        );
        // Simula compra bem-sucedida em desenvolvimento
        await usePremiumStore.getState().setPremium(true, 'dev-token-' + Date.now());
        return true;
      }
      
      Alert.alert(
        'Indisponível',
        'As compras no app não estão disponíveis no momento.'
      );
      return false;
    }

    try {
      const connected = await this.initialize();
      if (!connected) {
        Alert.alert(
          'Erro de Conexão',
          'Não foi possível conectar à loja. Verifique sua conexão com a internet e tente novamente.'
        );
        return false;
      }

      // Busca informações do produto
      const products = await InAppPurchases.getProductsAsync([PREMIUM_PRODUCT_ID]);
      
      if (!products || !products.results || products.results.length === 0) {
        Alert.alert(
          'Produto não encontrado',
          'O produto premium não está disponível no momento. Tente novamente mais tarde.'
        );
        return false;
      }

      const product = products.results[0];

      // Inicia o fluxo de compra
      await InAppPurchases.purchaseItemAsync(PREMIUM_PRODUCT_ID);

      // O resultado da compra será tratado pelo listener de compras
      return true;
    } catch (error: any) {
      console.error('[IAP] Error purchasing premium:', error);
      
      // Trata erros específicos
      if (error.code === 'E_USER_CANCELLED') {
        // Usuário cancelou, não mostra erro
        return false;
      } else if (error.code === 'E_NETWORK_ERROR') {
        Alert.alert(
          'Erro de Rede',
          'Não foi possível processar a compra. Verifique sua conexão com a internet.'
        );
      } else {
        Alert.alert(
          'Erro na Compra',
          'Não foi possível processar a compra. Tente novamente mais tarde.'
        );
      }
      
      return false;
    }
  }

  /**
   * Restaura compras anteriores
   */
  async restorePurchases(): Promise<boolean> {
    if (!this.isAvailable()) {
      // Em desenvolvimento, verifica status local
      if (__DEV__) {
        const isPremium = await usePremiumStore.getState().checkPremiumStatus();
        if (isPremium) {
          Alert.alert(
            'Modo Desenvolvimento',
            'Status premium encontrado localmente. Em produção, isso restauraria a compra da loja.'
          );
          return true;
        } else {
          Alert.alert(
            'Nenhuma Compra Encontrada',
            'Não encontramos nenhuma compra premium no modo desenvolvimento.'
          );
          return false;
        }
      }
      
      Alert.alert(
        'Indisponível',
        'A restauração de compras não está disponível no momento.'
      );
      return false;
    }

    try {
      const connected = await this.initialize();
      if (!connected) {
        Alert.alert(
          'Erro de Conexão',
          'Não foi possível conectar à loja. Verifique sua conexão com a internet.'
        );
        return false;
      }

      // Busca histórico de compras
      const purchaseHistory = await InAppPurchases.getPurchaseHistoryAsync();
      
      if (purchaseHistory && purchaseHistory.results && purchaseHistory.results.length > 0) {
        const premiumPurchase = purchaseHistory.results.find(
          (purchase: any) => purchase.productId === PREMIUM_PRODUCT_ID
        );

        if (premiumPurchase) {
          await this.validatePurchase(premiumPurchase);
          Alert.alert(
            'Compra Restaurada',
            'Sua compra premium foi restaurada com sucesso!'
          );
          return true;
        } else {
          Alert.alert(
            'Nenhuma Compra Encontrada',
            'Não encontramos nenhuma compra premium associada a esta conta.'
          );
          return false;
        }
      } else {
        Alert.alert(
          'Nenhuma Compra Encontrada',
          'Não encontramos nenhuma compra associada a esta conta.'
        );
        return false;
      }
    } catch (error) {
      console.error('[IAP] Error restoring purchases:', error);
      Alert.alert(
        'Erro',
        'Não foi possível restaurar as compras. Tente novamente mais tarde.'
      );
      return false;
    }
  }

  /**
   * Valida uma compra e atualiza o status premium
   */
  private async validatePurchase(purchase: any): Promise<void> {
    try {
      // Extrai o token de compra
      const purchaseToken = purchase.purchaseToken || purchase.transactionReceipt || null;
      
      // Atualiza o status premium no store
      await usePremiumStore.getState().setPremium(true, purchaseToken || undefined);
      
      if (__DEV__) {
        console.log('[IAP] Purchase validated, premium status updated');
      }
    } catch (error) {
      console.error('[IAP] Error validating purchase:', error);
      throw error;
    }
  }

  /**
   * Configura listeners para compras
   * Deve ser chamado uma vez no início do app
   */
  setupPurchaseListeners(): void {
    if (!this.isAvailable()) {
      if (__DEV__) {
        console.log('[IAP] Module not available, skipping purchase listeners setup');
      }
      return;
    }

    // Listener para compras concluídas
    InAppPurchases.setPurchaseListener(({ responseCode, results, errorCode }: any) => {
      if (responseCode === InAppPurchases.IAPResponseCode.OK) {
        if (results && results.length > 0) {
          results.forEach(async (purchase: any) => {
            if (purchase.productId === PREMIUM_PRODUCT_ID) {
              await this.validatePurchase(purchase);
              Alert.alert(
                'Compra Concluída!',
                'Parabéns! Você agora tem acesso a todas as funcionalidades premium.'
              );
            }
          });
        }
      } else if (responseCode === InAppPurchases.IAPResponseCode.USER_CANCELED) {
        // Usuário cancelou, não faz nada
        if (__DEV__) {
          console.log('[IAP] User canceled purchase');
        }
      } else {
        console.error('[IAP] Purchase error:', errorCode);
        Alert.alert(
          'Erro na Compra',
          'Não foi possível processar a compra. Tente novamente.'
        );
      }
    });
  }

  /**
   * Desconecta da store (útil para testes ou cleanup)
   */
  async disconnect(): Promise<void> {
    if (!this.isAvailable()) {
      return;
    }

    if (this.isInitialized) {
      try {
        await InAppPurchases.disconnectAsync();
        this.isInitialized = false;
      } catch (error) {
        console.error('[IAP] Error disconnecting:', error);
      }
    }
  }

  /**
   * Obtém informações do produto premium (preço, descrição, etc)
   */
  async getProductInfo(): Promise<any | null> {
    if (!this.isAvailable()) {
      // Em desenvolvimento, retorna dados mock
      if (__DEV__) {
        return {
          productId: PREMIUM_PRODUCT_ID,
          price: 'R$ 14,90',
          title: 'Premium - Desbloqueio Permanente',
          description: 'Desbloqueie todas as funcionalidades premium',
        };
      }
      return null;
    }

    try {
      const connected = await this.initialize();
      if (!connected) {
        return null;
      }

      const products = await InAppPurchases.getProductsAsync([PREMIUM_PRODUCT_ID]);
      
      if (products && products.results && products.results.length > 0) {
        return products.results[0];
      }
      
      return null;
    } catch (error) {
      console.error('[IAP] Error getting product info:', error);
      return null;
    }
  }
}

// Exporta instância singleton
export const iapService = new IAPService();
