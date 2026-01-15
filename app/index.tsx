import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useEventStore } from '@/state/eventStore';
import { usePremiumStore } from '@/state/premiumStore';
import { eventRepository } from '@/db/repositories/eventRepository';
import { initDatabase } from '@/db/init';
import { formatDateToDDMMYYYY } from '@/utils/dateUtils';
import { PremiumFeature } from '@/domain/premium.features';
import { UpgradeModal } from '@/components/UpgradeModal';

export default function HomeScreen() {
  const router = useRouter();
  const { events, setEvents } = useEventStore();
  const { isPremium, loadPremiumStatus } = usePremiumStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [activeEventCount, setActiveEventCount] = useState(0);

  useEffect(() => {
    loadEvents();
    loadPremiumStatus();
  }, []);

  useEffect(() => {
    // Atualiza contagem quando eventos mudam
    if (events.length > 0) {
      checkEventLimit();
    }
  }, [events, isPremium]);

  const checkEventLimit = async () => {
    try {
      const count = await eventRepository.countActive();
      setActiveEventCount(count);
    } catch (error) {
      console.error('Error checking event limit:', error);
    }
  };

  const loadEvents = async (showRefreshing = false) => {
    if (showRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      await initDatabase();
      const allEvents = await eventRepository.findActive();
      setEvents(allEvents);
      // Atualiza contagem após carregar eventos
      const count = await eventRepository.countActive();
      setActiveEventCount(count);
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    loadEvents(true);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
      <Text style={styles.title}>Beach Tennis Super 8</Text>
      
      {/* Botão Criar Evento - Oculto quando limite é atingido (versão gratuita) */}
      {(!isPremium && activeEventCount >= 2) ? null : (
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.push('/create-event')}
        >
          <Text style={styles.buttonText}>Criar Evento</Text>
        </TouchableOpacity>
      )}

      {/* Banner Premium - Mostra quando limite é atingido */}
      {!isPremium && activeEventCount >= 2 && (
        <View style={styles.premiumBanner}>
          <Text style={styles.premiumBannerTitle}>⭐ Limite de Eventos Atingido</Text>
          <Text style={styles.premiumBannerText}>
            Você já criou {activeEventCount} evento(s). Desbloqueie eventos ilimitados com Premium!
          </Text>
          <TouchableOpacity
            style={styles.premiumBannerButton}
            onPress={() => setShowUpgradeModal(true)}
          >
            <Text style={styles.premiumBannerButtonText}>Fazer Upgrade</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Meus Eventos
          {!isPremium && activeEventCount > 0 && (
            <Text style={styles.eventCount}> ({activeEventCount}/2)</Text>
          )}
        </Text>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#00d4ff" />
            <Text style={styles.loadingText}>Carregando eventos...</Text>
          </View>
        ) : events.length === 0 ? (
          <Text style={styles.emptyText}>
            Você ainda não criou nenhum evento.{'\n'}
            Toque em 'Criar Evento' para começar.
          </Text>
        ) : (
          events.map((event) => (
            <TouchableOpacity
              key={event.id}
              style={styles.eventCard}
              onPress={() => router.push(`/event/${event.id}`)}
            >
              <Text style={styles.eventName}>{event.name}</Text>
              <Text style={styles.eventDate}>
                {formatDateToDDMMYYYY(event.date)}
                {event.start_time && ` às ${event.start_time}`}
              </Text>
              <Text style={styles.eventFormat}>
                {event.format === 'groups_finals' && 'Grupos + Finais'}
                {event.format === 'round_robin' && 'Pontos Corridos'}
                {event.format === 'rotating' && 'Super 8 Rotativo'}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </View>
      </ScrollView>

      {/* Rodapé fixo com botão de Perfil */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => router.push('/profile')}
        >
          <Text style={styles.profileButtonText}>👤 Perfil</Text>
        </TouchableOpacity>
      </View>

      <UpgradeModal
        visible={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        trigger={PremiumFeature.UNLIMITED_EVENTS}
        onPurchaseSuccess={async () => {
          await loadPremiumStatus();
          await loadEvents();
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
  scrollContent: {
    padding: 20,
    paddingBottom: 100, // Espaço para o rodapé
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
    color: '#ffffff',
  },
  primaryButton: {
    backgroundColor: '#00d4ff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 30,
  },
  buttonText: {
    color: '#0f3460',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  section: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    color: '#ffffff',
  },
  emptyText: {
    color: '#a0d2ff',
    textAlign: 'center',
    marginTop: 40,
    lineHeight: 24,
  },
  eventCard: {
    backgroundColor: '#16213e',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#00d4ff',
  },
  eventName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
    color: '#ffffff',
  },
  eventDate: {
    color: '#a0d2ff',
    marginBottom: 4,
  },
  eventFormat: {
    color: '#00d4ff',
    fontSize: 14,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    color: '#a0d2ff',
    fontSize: 14,
  },
  premiumBanner: {
    backgroundColor: '#16213e',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#00d4ff',
  },
  premiumBannerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00d4ff',
    marginBottom: 8,
  },
  premiumBannerText: {
    fontSize: 14,
    color: '#a0d2ff',
    marginBottom: 12,
    lineHeight: 20,
  },
  premiumBannerButton: {
    backgroundColor: '#00d4ff',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  premiumBannerButtonText: {
    color: '#0f3460',
    fontSize: 16,
    fontWeight: '600',
  },
  eventCount: {
    fontSize: 16,
    color: '#a0d2ff',
    fontWeight: 'normal',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#16213e',
    backgroundColor: '#0f3460',
  },
  profileButton: {
    backgroundColor: '#16213e',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#00d4ff',
  },
  profileButtonText: {
    color: '#00d4ff',
    fontSize: 16,
    fontWeight: '600',
  },
});
