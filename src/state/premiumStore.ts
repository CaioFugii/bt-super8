import { create } from 'zustand';
import { getDatabase } from '@/db/database';
import * as SQLite from 'expo-sqlite';

/**
 * Store global para gerenciar estado premium do usuário
 * 
 * Persiste o status premium no SQLite local para funcionamento offline.
 * Revalida periodicamente via SDK de IAP quando disponível.
 */
interface PremiumState {
  isPremium: boolean;
  isLoading: boolean;
  lastVerifiedAt: number | null;
  purchaseToken: string | null; // Token da compra para validação futura
  
  // Ações
  loadPremiumStatus: () => Promise<void>;
  setPremium: (isPremium: boolean, purchaseToken?: string) => Promise<void>;
  restorePremium: () => Promise<void>;
  checkPremiumStatus: () => Promise<boolean>;
}

const PREMIUM_TABLE_NAME = 'premium_status';
const PREMIUM_KEY = 'premium_status_key';

export const usePremiumStore = create<PremiumState>((set, get) => ({
  isPremium: false, // Sempre inicia como Free para testes
  isLoading: true,
  lastVerifiedAt: null,
  purchaseToken: null,

  /**
   * Carrega o status premium do SQLite
   */
  loadPremiumStatus: async () => {
    set({ isLoading: true });
    try {
      const db = await getDatabase();
      
      const result = await db.getFirstAsync<{
        is_premium: number;
        purchase_token: string | null;
        last_verified_at: number | null;
      }>(
        `SELECT is_premium, purchase_token, last_verified_at 
         FROM ${PREMIUM_TABLE_NAME} 
         WHERE key = ?`,
        [PREMIUM_KEY]
      );

      if (result) {
        // Para testes: sempre força como Free (não premium) em modo desenvolvimento
        // Em produção, usar: result.is_premium === 1
        const isPremiumFromDB = result.is_premium === 1;
        // Em modo dev (__DEV__), sempre retorna false (Free)
        // Em produção, usa o valor do banco
        const isPremium = __DEV__ ? false : isPremiumFromDB;
        
        set({
          isPremium,
          purchaseToken: result.purchase_token || null,
          lastVerifiedAt: result.last_verified_at || null,
          isLoading: false,
        });
      } else {
        // Primeira execução: cria registro padrão como Free
        const now = Date.now();
        await db.runAsync(
          `INSERT INTO ${PREMIUM_TABLE_NAME} (key, is_premium, purchase_token, last_verified_at, created_at, updated_at)
           VALUES (?, 0, NULL, NULL, ?, ?)`,
          [PREMIUM_KEY, now, now]
        );
        set({
          isPremium: false, // Sempre Free por padrão
          purchaseToken: null,
          lastVerifiedAt: null,
          isLoading: false,
        });
      }
    } catch (error) {
      console.error('Error loading premium status:', error);
      // Em caso de erro, assume que não é premium
      set({
        isPremium: false,
        isLoading: false,
      });
    }
  },

  /**
   * Define o status premium e persiste no SQLite
   */
  setPremium: async (isPremium: boolean, purchaseToken?: string) => {
    try {
      const db = await getDatabase();
      const now = Date.now();
      
      // Primeiro tenta atualizar
      const updateResult = await db.runAsync(
        `UPDATE ${PREMIUM_TABLE_NAME}
         SET is_premium = ?, 
             purchase_token = ?,
             last_verified_at = ?,
             updated_at = ?
         WHERE key = ?`,
        [
          isPremium ? 1 : 0,
          purchaseToken || null,
          now,
          now,
          PREMIUM_KEY,
        ]
      );

      // Se nenhuma linha foi atualizada, insere
      if (updateResult.changes === 0) {
        await db.runAsync(
          `INSERT INTO ${PREMIUM_TABLE_NAME} (key, is_premium, purchase_token, last_verified_at, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            PREMIUM_KEY,
            isPremium ? 1 : 0,
            purchaseToken || null,
            now,
            now,
            now,
          ]
        );
      }

      set({
        isPremium,
        purchaseToken: purchaseToken || null,
        lastVerifiedAt: now,
      });
    } catch (error) {
      console.error('Error setting premium status:', error);
      // Ainda atualiza o estado em memória mesmo se falhar a persistência
      set({ isPremium });
    }
  },

  /**
   * Restaura o status premium (será chamado pelo serviço de IAP)
   */
  restorePremium: async () => {
    // Esta função será implementada em conjunto com o serviço de IAP
    // Por enquanto, apenas recarrega o status
    await get().loadPremiumStatus();
  },

  /**
   * Verifica o status premium atual
   */
  checkPremiumStatus: async (): Promise<boolean> => {
    await get().loadPremiumStatus();
    return get().isPremium;
  },
}));
