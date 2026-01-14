import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useEventStore } from '@/state/eventStore';
import { eventRepository } from '@/db/repositories/eventRepository';
import { initDatabase } from '@/db/init';
import { formatDateToDDMMYYYY } from '@/utils/dateUtils';

export default function HomeScreen() {
  const router = useRouter();
  const { events, setEvents } = useEventStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadEvents();
  }, []);

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
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text style={styles.title}>Beach Tennis Super 8</Text>
      
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => router.push('/create-event')}
      >
        <Text style={styles.buttonText}>Criar Evento</Text>
      </TouchableOpacity>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Meus Eventos</Text>
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#1a1a2e',
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
});
