import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { usePremiumStore } from '@/state/premiumStore';
import { iapService } from '@/services/iapService';
import { PremiumFeature, getAllPremiumFeatures, getPremiumFeatureName } from '@/domain/premium.features';
import { UpgradeModal } from '@/components/UpgradeModal';

export default function ProfileScreen() {
  const router = useRouter();
  const { isPremium, loadPremiumStatus } = usePremiumStore();
  const [loading, setLoading] = useState(false);
  const [restoringPurchase, setRestoringPurchase] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [productPrice, setProductPrice] = useState<string | null>(null);

  useEffect(() => {
    loadPremiumStatus();
    loadProductPrice();
  }, []);

  const loadProductPrice = async () => {
    try {
      const product = await iapService.getProductInfo();
      if (product && product.price) {
        setProductPrice(product.price);
      }
    } catch (error) {
      console.error('Error loading product price:', error);
    }
  };

  const handlePurchase = async () => {
    setLoading(true);
    try {
      const success = await iapService.purchasePremium();
      if (success) {
        await loadPremiumStatus();
        Alert.alert(
          'Compra Concluída!',
          'Parabéns! Você agora tem acesso a todas as funcionalidades premium.'
        );
      }
    } catch (error) {
      console.error('Error purchasing:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    setRestoringPurchase(true);
    try {
      const success = await iapService.restorePurchases();
      if (success) {
        await loadPremiumStatus();
        Alert.alert(
          'Compra Restaurada',
          'Sua compra premium foi restaurada com sucesso!'
        );
      }
    } catch (error) {
      console.error('Error restoring:', error);
    } finally {
      setRestoringPurchase(false);
    }
  };

  const features = getAllPremiumFeatures();

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Voltar</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Perfil</Text>
        </View>

        <View style={styles.content}>
          {/* Status Premium */}
          <View style={styles.statusCard}>
            <Text style={styles.statusTitle}>Status da Conta</Text>
            <View style={styles.statusContent}>
              <Text style={[styles.statusBadge, isPremium && styles.statusBadgePremium]}>
                {isPremium ? '⭐ Premium' : '🆓 Versão Gratuita'}
              </Text>
              <Text style={styles.statusDescription}>
                {isPremium
                  ? 'Você tem acesso a todas as funcionalidades premium!'
                  : 'Você está usando a versão gratuita com funcionalidades limitadas.'}
              </Text>
            </View>
          </View>

          {/* Versão Gratuita - Informações */}
          {!isPremium && (
            <View style={styles.freeVersionCard}>
              <Text style={styles.sectionTitle}>Versão Gratuita</Text>
              <Text style={styles.freeVersionDescription}>
                Na versão gratuita, você pode:
              </Text>
              <View style={styles.freeFeaturesList}>
                <Text style={styles.freeFeatureItem}>✓ Criar até 2 eventos ativos</Text>
                <Text style={styles.freeFeatureItem}>✓ Usar formato "Pontos Corridos"</Text>
                <Text style={styles.freeFeatureItem}>✓ Usar formato "Super 8 Rotativo"</Text>
                <Text style={styles.freeFeatureItem}>✓ Gerenciar participantes e jogos</Text>
                <Text style={styles.freeFeatureItem}>✓ Visualizar rankings</Text>
              </View>
              <Text style={styles.freeVersionLimitation}>
                Limitações: Não é possível criar mais de 2 eventos, usar o formato "Grupos + Finais", compartilhar rankings ou exportar dados.
              </Text>
            </View>
          )}

          {/* Premium - Benefícios */}
          <View style={styles.premiumCard}>
            <Text style={styles.sectionTitle}>
              {isPremium ? '⭐ Funcionalidades Premium Ativas' : '⭐ Upgrade para Premium'}
            </Text>
            
            {!isPremium && productPrice && (
              <View style={styles.priceContainer}>
                <Text style={styles.priceLabel}>Preço:</Text>
                <Text style={styles.priceValue}>{productPrice}</Text>
                <Text style={styles.priceNote}>Compra única • Sem renovação</Text>
              </View>
            )}

            <View style={styles.featuresContainer}>
              {features.map((feature) => (
                <View key={feature.id} style={styles.featureItem}>
                  <Text style={styles.featureIcon}>
                    {isPremium ? '✓' : '🔒'}
                  </Text>
                  <View style={styles.featureTextContainer}>
                    <Text style={styles.featureName}>{feature.name}</Text>
                    <Text style={styles.featureDescription}>
                      {feature.description}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            {!isPremium && (
              <TouchableOpacity
                style={[styles.button, styles.purchaseButton, loading && styles.buttonDisabled]}
                onPress={handlePurchase}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.purchaseButtonText}>
                    {productPrice ? `Comprar por ${productPrice}` : 'Comprar Premium'}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Restaurar Compra */}
          <View style={styles.restoreSection}>
            <Text style={styles.restoreTitle}>Restaurar Compra</Text>
            <Text style={styles.restoreDescription}>
              Se você já comprou o Premium em outro dispositivo ou reinstalou o app, use este botão para restaurar sua compra.
            </Text>
            <TouchableOpacity
              style={[
                styles.button,
                styles.restoreButton,
                restoringPurchase && styles.buttonDisabled
              ]}
              onPress={handleRestore}
              disabled={restoringPurchase}
            >
              {restoringPurchase ? (
                <ActivityIndicator color="#00d4ff" />
              ) : (
                <Text style={styles.restoreButtonText}>🔄 Restaurar Compra</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <UpgradeModal
        visible={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        trigger={undefined}
        onPurchaseSuccess={async () => {
          await loadPremiumStatus();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#16213e',
    backgroundColor: '#0f3460',
  },
  backButton: {
    marginBottom: 12,
  },
  backButtonText: {
    fontSize: 16,
    color: '#00d4ff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  content: {
    padding: 20,
  },
  statusCard: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#00d4ff',
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
  },
  statusContent: {
    alignItems: 'center',
  },
  statusBadge: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#a0d2ff',
    marginBottom: 8,
  },
  statusBadgePremium: {
    color: '#00d4ff',
  },
  statusDescription: {
    fontSize: 14,
    color: '#a0d2ff',
    textAlign: 'center',
    lineHeight: 20,
  },
  freeVersionCard: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#6b7280',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
  },
  freeVersionDescription: {
    fontSize: 16,
    color: '#a0d2ff',
    marginBottom: 12,
  },
  freeFeaturesList: {
    marginBottom: 16,
  },
  freeFeatureItem: {
    fontSize: 14,
    color: '#a0d2ff',
    marginBottom: 8,
    lineHeight: 20,
  },
  freeVersionLimitation: {
    fontSize: 14,
    color: '#ff6b6b',
    fontStyle: 'italic',
    lineHeight: 20,
    marginTop: 8,
  },
  premiumCard: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#00d4ff',
  },
  priceContainer: {
    backgroundColor: '#0f3460',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#00d4ff',
  },
  priceLabel: {
    fontSize: 14,
    color: '#a0d2ff',
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#00d4ff',
    marginBottom: 4,
  },
  priceNote: {
    fontSize: 12,
    color: '#a0d2ff',
    fontStyle: 'italic',
  },
  featuresContainer: {
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  featureIcon: {
    fontSize: 20,
    color: '#00d4ff',
    marginRight: 12,
    marginTop: 2,
    fontWeight: 'bold',
  },
  featureTextContainer: {
    flex: 1,
  },
  featureName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#a0d2ff',
    lineHeight: 20,
  },
  button: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  purchaseButton: {
    backgroundColor: '#00d4ff',
  },
  purchaseButtonText: {
    color: '#0f3460',
    fontSize: 18,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  restoreSection: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#6b7280',
  },
  restoreTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  restoreDescription: {
    fontSize: 14,
    color: '#a0d2ff',
    lineHeight: 20,
    marginBottom: 16,
  },
  restoreButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#00d4ff',
  },
  restoreButtonText: {
    color: '#00d4ff',
    fontSize: 16,
    fontWeight: '600',
  },
});
