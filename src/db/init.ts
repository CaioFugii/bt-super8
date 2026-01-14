import { getDatabase } from './database';

/**
 * Inicializa o banco de dados na primeira execução
 */
export async function initDatabase() {
  try {
    await getDatabase();
    if (__DEV__) {
      console.log('Database initialized successfully');
    }
  } catch (error) {
    // Manter console.error para erros críticos, mas apenas em dev
    if (__DEV__) {
      console.error('Error initializing database:', error);
    }
    throw error;
  }
}
