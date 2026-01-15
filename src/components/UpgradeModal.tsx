import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { PremiumFeature, getAllPremiumFeatures, getPremiumFeatureName } from '@/domain/premium.features';
import { iapService } from '@/services/iapService';
import { usePremiumStore } from '@/state/premiumStore';

interface UpgradeModalProps {
  visible: boolean;
  onClose: () => void;
  trigger?: PremiumFeature; // Feature que disparou o modal
  onPurchaseSuccess?: () => void;
}

/**
 * Modal de Upgrade para Premium
 * 
 * Exibe benefícios premium e permite compra ou restore de compras.
 */
export function UpgradeModal({
  visible,
  onClose,
  trigger,
  onPurchaseSuccess,
}: UpgradeModalProps) {
  const { isPremium } = usePremiumStore();
  const [loading, setLoading] = React.useState(false);
  const [productPrice, setProductPrice] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (visible && !isPremium) {
      loadProductPrice();
    }
  }, [visible, isPremium]);

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
        // O listener de compras vai atualizar o estado automaticamente
        // Mas podemos chamar o callback se necessário
        if (onPurchaseSuccess) {
          // Aguarda um pouco para garantir que o estado foi atualizado
          setTimeout(() => {
            onPurchaseSuccess();
            onClose();
          }, 500);
        } else {
          onClose();
        }
      }
    } catch (error) {
      console.error('Error purchasing:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTriggerMessage = () => {
    switch (trigger) {
      case PremiumFeature.UNLIMITED_EVENTS:
        return 'Você atingiu o limite de 2 eventos na versão gratuita.';
      case PremiumFeature.GROUPS_FINALS_FORMAT:
        return 'O formato "Grupos + Finais" está disponível apenas para usuários premium.';
      case PremiumFeature.EXPORT_DATA:
        return 'A exportação de dados está disponível apenas para usuários premium.';
      case PremiumFeature.SHARE_RANKING:
        return 'Compartilhar ranking está disponível apenas para usuários premium.';
      case PremiumFeature.CUSTOM_THEMES:
        return 'Os temas personalizados estão disponíveis apenas para usuários premium.';
      case PremiumFeature.ADVANCED_STATS:
        return 'As estatísticas avançadas estão disponíveis apenas para usuários premium.';
      default:
        return 'Desbloqueie todas as funcionalidades premium!';
    }
  };

  const features = getAllPremiumFeatures();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <Text style={styles.title}>Upgrade para Premium</Text>
              <Text style={styles.subtitle}>{getTriggerMessage()}</Text>
            </View>

            <View style={styles.featuresContainer}>
              <Text style={styles.featuresTitle}>Benefícios Premium:</Text>
              {features.map((feature) => (
                <View key={feature.id} style={styles.featureItem}>
                  <Text style={styles.featureIcon}>✓</Text>
                  <View style={styles.featureTextContainer}>
                    <Text style={styles.featureName}>{feature.name}</Text>
                    <Text style={styles.featureDescription}>
                      {feature.description}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            {productPrice && (
              <View style={styles.priceContainer}>
                <Text style={styles.priceLabel}>Preço:</Text>
                <Text style={styles.priceValue}>{productPrice}</Text>
                <Text style={styles.priceNote}>Compra única • Sem renovação</Text>
              </View>
            )}

            <View style={styles.buttonsContainer}>
              <TouchableOpacity
                style={[styles.button, styles.purchaseButton]}
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

              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={onClose}
                disabled={loading}
              >
                <Text style={styles.cancelButtonText}>Talvez Depois</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 24,
    maxWidth: 500,
    width: '100%',
    maxHeight: '90%',
    borderWidth: 2,
    borderColor: '#00d4ff',
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#a0d2ff',
    textAlign: 'center',
    lineHeight: 22,
  },
  featuresContainer: {
    marginBottom: 24,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#00d4ff',
    marginBottom: 16,
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
  priceContainer: {
    backgroundColor: '#16213e',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
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
  buttonsContainer: {
    gap: 12,
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
  cancelButton: {
    backgroundColor: 'transparent',
  },
  cancelButtonText: {
    color: '#a0d2ff',
    fontSize: 14,
  },
});
