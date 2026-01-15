/**
 * Sistema Central de Feature Flags Premium
 * 
 * Única fonte de verdade para funcionalidades premium do app.
 * Facilita manutenção e expansão futura.
 */

export enum PremiumFeature {
  /**
   * Permite criar eventos ilimitados (versão gratuita limitada a 2 eventos ativos)
   */
  UNLIMITED_EVENTS = 'UNLIMITED_EVENTS',

  /**
   * Desbloqueia o formato "Grupos + Finais" (atualmente desabilitado na versão gratuita)
   */
  GROUPS_FINALS_FORMAT = 'GROUPS_FINALS_FORMAT',

  /**
   * Permite exportar dados em CSV, PDF, Excel
   * Inclui também compartilhamento de ranking
   */
  EXPORT_DATA = 'EXPORT_DATA',
  
  /**
   * Permite compartilhar ranking (parte de EXPORT_DATA)
   */
  SHARE_RANKING = 'SHARE_RANKING',

  /**
   * Permite personalizar temas/cores do app
   */
  CUSTOM_THEMES = 'CUSTOM_THEMES',

  /**
   * Acesso a estatísticas avançadas (gráficos, histórico detalhado)
   */
  ADVANCED_STATS = 'ADVANCED_STATS',
}

/**
 * Configuração de cada feature premium
 */
export interface PremiumFeatureConfig {
  id: PremiumFeature;
  name: string;
  description: string;
  icon?: string; // Para uso futuro em UI
}

/**
 * Mapa de configurações das features premium
 */
export const PREMIUM_FEATURES_CONFIG: Record<PremiumFeature, PremiumFeatureConfig> = {
  [PremiumFeature.UNLIMITED_EVENTS]: {
    id: PremiumFeature.UNLIMITED_EVENTS,
    name: 'Eventos Ilimitados',
    description: 'Crie quantos eventos quiser, sem limites',
  },
  [PremiumFeature.GROUPS_FINALS_FORMAT]: {
    id: PremiumFeature.GROUPS_FINALS_FORMAT,
    name: 'Formato Grupos + Finais',
    description: 'Acesse o formato completo de torneio com grupos e fase eliminatória',
  },
  [PremiumFeature.EXPORT_DATA]: {
    id: PremiumFeature.EXPORT_DATA,
    name: 'Exportação de Dados',
    description: 'Exporte rankings, resultados e participantes em CSV, PDF e Excel',
  },
  [PremiumFeature.SHARE_RANKING]: {
    id: PremiumFeature.SHARE_RANKING,
    name: 'Compartilhar Ranking',
    description: 'Compartilhe rankings com outros aplicativos',
  },
  [PremiumFeature.CUSTOM_THEMES]: {
    id: PremiumFeature.CUSTOM_THEMES,
    name: 'Temas Personalizados',
    description: 'Personalize as cores e aparência do app',
  },
  [PremiumFeature.ADVANCED_STATS]: {
    id: PremiumFeature.ADVANCED_STATS,
    name: 'Estatísticas Avançadas',
    description: 'Acesse gráficos, histórico detalhado e análises avançadas',
  },
};

/**
 * Verifica se uma feature premium está disponível para o usuário
 * @param isPremium - Se o usuário é premium
 * @param feature - Feature a verificar
 * @returns true se a feature está disponível
 */
export function isPremiumFeatureAvailable(isPremium: boolean, feature: PremiumFeature): boolean {
  if (isPremium) {
    return true; // Premium tem acesso a todas as features
  }

  // Versão gratuita: apenas algumas features básicas
  // Todas as features premium retornam false para usuários gratuitos
  return false;
}

/**
 * Retorna todas as features premium como array
 */
export function getAllPremiumFeatures(): PremiumFeatureConfig[] {
  return Object.values(PREMIUM_FEATURES_CONFIG);
}

/**
 * Retorna a descrição de uma feature premium
 */
export function getPremiumFeatureDescription(feature: PremiumFeature): string {
  return PREMIUM_FEATURES_CONFIG[feature]?.description || '';
}

/**
 * Retorna o nome de uma feature premium
 */
export function getPremiumFeatureName(feature: PremiumFeature): string {
  return PREMIUM_FEATURES_CONFIG[feature]?.name || '';
}
