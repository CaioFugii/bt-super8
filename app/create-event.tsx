import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Modal } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { EventFormat } from '@/domain/types';
import { eventRepository } from '@/db/repositories/eventRepository';
import { useEventStore } from '@/state/eventStore';
import { usePremiumStore } from '@/state/premiumStore';
import { DEFAULT_TIEBREAK_CRITERIA } from '@/domain/algorithms/ranking';
import { 
  getTodayDDMMYYYY, 
  parseDDMMYYYY, 
  validateDateNotPast, 
  validateTimeFormat,
  
} from '@/utils/dateUtils';
import { SCORE_RULESETS, ScoreRulesetId, DEFAULT_SCORE_RULESET } from '@/domain/scoreRuleset';
import { PremiumFeature } from '@/domain/premium.features';
import { UpgradeModal } from '@/components/UpgradeModal';

export default function CreateEventScreen() {
  const router = useRouter();
  const { addEvent } = useEventStore();
  const { isPremium, loadPremiumStatus } = usePremiumStore();
  
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState<string | undefined>();
  const [date, setDate] = useState(getTodayDDMMYYYY());
  const [dateError, setDateError] = useState<string | undefined>();
  const [startTime, setStartTime] = useState('');
  const [timeError, setTimeError] = useState<string | undefined>();
  const [location, setLocation] = useState('');
  const [format, setFormat] = useState<EventFormat | null>(null);
  const [numCourts, setNumCourts] = useState(1);
  const [numSets, setNumSets] = useState(1);
  const [pointsPerWin, setPointsPerWin] = useState(1);
  const [scoreRulesetId, setScoreRulesetId] = useState<ScoreRulesetId>(DEFAULT_SCORE_RULESET);
  const [loading, setLoading] = useState(false);
  const [showFormatInfoModal, setShowFormatInfoModal] = useState(false);
  const [selectedFormatInfo, setSelectedFormatInfo] = useState<EventFormat | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeTrigger, setUpgradeTrigger] = useState<PremiumFeature | undefined>();

  // Carrega status premium ao montar
  useEffect(() => {
    loadPremiumStatus();
  }, [loadPremiumStatus]);

  // Resetar formato se for groups_finals e usuário não for premium
  useEffect(() => {
    if (format === 'groups_finals' && !isPremium) {
      setFormat(null);
      setUpgradeTrigger(PremiumFeature.GROUPS_FINALS_FORMAT);
      setShowUpgradeModal(true);
    }
  }, [format, isPremium]);

  const handleNameChange = (value: string) => {
    setName(value);
    if (value.trim().length === 0) {
      setNameError('O nome do evento é obrigatório');
    } else if (value.trim().length < 3) {
      setNameError('O nome deve ter pelo menos 3 caracteres');
    } else {
      setNameError(undefined);
    }
  };

  const handleDateChange = (value: string) => {
    setDate(value);
    const validation = validateDateNotPast(value);
    if (!validation.isValid) {
      setDateError(validation.error);
    } else {
      setDateError(undefined);
    }
  };

  const handleTimeChange = (value: string) => {
    setStartTime(value);
    const validation = validateTimeFormat(value);
    if (!validation.isValid) {
      setTimeError(validation.error);
    } else {
      setTimeError(undefined);
    }
  };

  const handleCreate = async () => {
    // Validações
    if (!name || !name.trim()) {
      setNameError('O nome do evento é obrigatório');
      return;
    }

    if (name.trim().length < 3) {
      setNameError('O nome deve ter pelo menos 3 caracteres');
      return;
    }

    if (!format) {
      Alert.alert('Aviso', 'Por favor, selecione um formato de evento');
      return;
    }

    // Valida novamente antes de criar
    const dateValidation = validateDateNotPast(date);
    if (!dateValidation.isValid) {
      setDateError(dateValidation.error);
      return;
    }

    if (startTime) {
      const timeValidation = validateTimeFormat(startTime);
      if (!timeValidation.isValid) {
        setTimeError(timeValidation.error);
        return;
      }
    }

    // Verifica limite de eventos para usuários gratuitos
    // IMPORTANTE: Verificar ANTES de criar o evento
    // Recarrega status premium para garantir que está atualizado
    await loadPremiumStatus();
    // Usa o valor atualizado do hook após recarregar
    const currentIsPremium = usePremiumStore.getState().isPremium;
    
    console.log('[Premium] currentIsPremium:', currentIsPremium);
    if (!currentIsPremium) {
      const activeEventCount = await eventRepository.countActive();
      if (__DEV__) {
        console.log('[Premium] Active events count:', activeEventCount, 'isPremium:', currentIsPremium);
      }
      // Se já tem 2 ou mais eventos ativos, bloqueia a criação
      if (activeEventCount >= 2) {
        setUpgradeTrigger(PremiumFeature.UNLIMITED_EVENTS);
        setShowUpgradeModal(true);
        return;
      }
    }

    setLoading(true);
    try {
      const eventDate = parseDDMMYYYY(date);
      const event = await eventRepository.create({
        name: name.trim(),
        date: eventDate.getTime(),
        start_time: startTime || undefined,
        location: location || undefined,
        format,
        num_courts: numCourts,
        num_sets: numSets,
        game_duration_minutes: 30,
        points_per_win: pointsPerWin,
        tiebreak_criteria: [...DEFAULT_TIEBREAK_CRITERIA],
        score_ruleset_id: scoreRulesetId,
        status: 'active',
      });

      addEvent(event);
      router.push(`/event/${event.id}`);
    } catch (error) {
      console.error('Error creating event:', error);
      Alert.alert(
        'Erro',
        'Não foi possível criar o evento. Verifique os dados informados e tente novamente.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleUpgradeSuccess = async () => {
    // Recarrega status premium após compra
    await loadPremiumStatus();
    // Se estava tentando criar evento, tenta novamente
    if (upgradeTrigger === PremiumFeature.UNLIMITED_EVENTS) {
      // Pequeno delay para garantir que o estado foi atualizado
      setTimeout(() => {
        handleCreate();
      }, 300);
    }
  };

  const canProceedFromStep1 = () => {
    return name && name.trim().length >= 3 && !nameError && !dateError && !timeError;
  };

  const handleShowFormatInfo = (formatType: EventFormat) => {
    setSelectedFormatInfo(formatType);
    setShowFormatInfoModal(true);
  };

  const getFormatInfo = (formatType: EventFormat) => {
    switch (formatType) {
      case 'groups_finals':
        return {
          title: 'Grupos + Finais',
          concept: 'Participam exatamente 8 DUPLAS fixas. O torneio é dividido em Fase de Grupos e Fase Final (Semifinais + Final).',
          structure: '• 2 grupos com 4 duplas cada\n• Cada grupo funciona em sistema "todos contra todos"\n• Total: 6 jogos por grupo (12 jogos na fase de grupos)',
          classification: '• Classificam para as semifinais: 1º e 2º de cada grupo\n• Semifinais: 1º Grupo A x 2º Grupo B | 1º Grupo B x 2º Grupo A\n• Final: Vencedores das semifinais',
          participants: 'Requer 8 duplas completas (16 jogadores)',
          criteria: '1) Vitórias\n2) Saldo de games\n3) Games pró\n4) Confronto direto\n5) Sorteio',
        };
      case 'round_robin':
        return {
          title: 'Pontos Corridos',
          concept: 'Participam exatamente 8 DUPLAS fixas. Todas jogam contra todas. Não há grupos nem fases finais.',
          structure: '• Sistema Round-Robin completo\n• Cada dupla joga contra as outras 7 duplas\n• Total: 28 jogos (fórmula: 8 × 7 ÷ 2)',
          classification: '• Ranking único com todas as 8 duplas\n• A dupla com maior pontuação é a campeã\n• Não há mata-mata',
          participants: 'Requer 8 duplas completas (16 jogadores)',
          criteria: '1) Vitórias\n2) Saldo de games\n3) Games pró\n4) Confronto direto\n5) Sorteio',
        };
      case 'rotating':
        return {
          title: 'Super 8 Rotativo',
          concept: 'Participam exatamente 8 JOGADORES individuais (não duplas fixas). As duplas mudam a cada rodada. Ranking é INDIVIDUAL.',
          structure: '• Cada rodada: 4 duplas formadas\n• As duplas são reorganizadas a cada rodada\n• Algoritmo busca minimizar repetição de parceiros e adversários',
          classification: '• Ranking individual (não por dupla)\n• Cada jogador acumula: Vitórias, Games pró/contra, Saldo\n• Pontuação individual: Vitória = 1 ponto para cada jogador da dupla vencedora',
          participants: 'Requer 8 jogadores individuais (sem formar duplas)',
          criteria: '1) Vitórias\n2) Saldo de games\n3) Games pró\n4) Sorteio',
          special: '• As duplas são formadas automaticamente pelo sistema\n• Cada jogador joga com parceiros diferentes ao longo do torneio\n• O algoritmo busca equilíbrio entre todos os jogadores',
        };
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Criar Evento</Text>
      <Text style={styles.stepIndicator}>
        Etapa {step} de 4
      </Text>

      {step === 1 && (
        <View style={styles.step}>
          <Text style={styles.label}>Nome do evento *</Text>
          <TextInput
            style={[styles.input, nameError ? styles.inputError : undefined]}
            value={name}
            onChangeText={handleNameChange}
            placeholder="Ex: Torneio de Verão 2024"
            maxLength={100}
          />
          {nameError && <Text style={styles.errorText}>{nameError}</Text>}

          <Text style={styles.label}>Data *</Text>
          <TextInput
            style={[styles.input, dateError ? styles.inputError : undefined]}
            value={date}
            onChangeText={handleDateChange}
            placeholder="DD/MM/YYYY"
          />
          {dateError && <Text style={styles.errorText}>{dateError}</Text>}

          <Text style={styles.label}>Hora de início</Text>
          <TextInput
            style={[styles.input, timeError ? styles.inputError : undefined]}
            value={startTime}
            onChangeText={handleTimeChange}
            placeholder="HH:MM (ex: 09:00)"
            keyboardType="numeric"
            maxLength={5}
          />
          {timeError && <Text style={styles.errorText}>{timeError}</Text>}

          <Text style={styles.label}>Local</Text>
          <TextInput
            style={styles.input}
            value={location}
            onChangeText={setLocation}
            placeholder="Ex: Quadra 1, Quadra 2, etc."
          />

          <Text style={styles.label}>Número de quadras</Text>
          <View style={styles.stepper}>
            <TouchableOpacity
              style={styles.stepperButton}
              onPress={() => setNumCourts(Math.max(1, numCourts - 1))}
            >
              <Text style={styles.stepperText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.stepperValue}>{numCourts}</Text>
            <TouchableOpacity
              style={styles.stepperButton}
              onPress={() => setNumCourts(Math.min(4, numCourts + 1))}
            >
              <Text style={styles.stepperText}>+</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Número de sets por jogo</Text>
          <View style={styles.stepper}>
            <TouchableOpacity
              style={styles.stepperButton}
              onPress={() => setNumSets(Math.max(1, numSets - 1))}
            >
              <Text style={styles.stepperText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.stepperValue}>{numSets}</Text>
            <TouchableOpacity
              style={styles.stepperButton}
              onPress={() => setNumSets(Math.min(2, numSets + 1))}
            >
              <Text style={styles.stepperText}>+</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.hintText}>Cada jogo terá {numSets} set(s)</Text>

          <TouchableOpacity
            style={[styles.button, !canProceedFromStep1() && styles.buttonDisabled]}
            onPress={() => canProceedFromStep1() && setStep(2)}
            disabled={!canProceedFromStep1()}
          >
            <Text style={styles.buttonText}>Próximo</Text>
          </TouchableOpacity>
        </View>
      )}

      {step === 2 && (
        <View style={styles.step}>
          <Text style={styles.sectionTitle}>Escolha o formato</Text>

          <TouchableOpacity
            style={[
              styles.formatCard,
              !isPremium && styles.formatCardDisabled,
              format === 'groups_finals' && styles.formatCardSelected,
            ]}
            onPress={() => {
              if (!isPremium) {
                setUpgradeTrigger(PremiumFeature.GROUPS_FINALS_FORMAT);
                setShowUpgradeModal(true);
              } else {
                setFormat('groups_finals');
              }
            }}
            disabled={false}
          >
            <View style={styles.formatCardHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={styles.formatTitle}>Grupos + Finais (Duplas)</Text>
                {!isPremium && <Text style={styles.lockIcon}>🔒</Text>}
                {isPremium && <Text style={styles.premiumBadge}>⭐ Premium</Text>}
              </View>
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  handleShowFormatInfo('groups_finals');
                }}
                style={styles.infoButton}
              >
                <Text style={styles.infoButtonText}>ℹ️</Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.formatDescription, !isPremium && styles.formatDescriptionDisabled]}>
              8 duplas divididas em 2 grupos. Fase de grupos seguida de semifinais e final.
            </Text>
            {!isPremium && (
              <Text style={styles.comingSoonText}>⭐ Disponível no Premium</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.formatCard, format === 'round_robin' && styles.formatCardSelected]}
            onPress={() => setFormat('round_robin')}
          >
            <View style={styles.formatCardHeader}>
              <Text style={styles.formatTitle}>Pontos Corridos (Duplas)</Text>
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  handleShowFormatInfo('round_robin');
                }}
                style={styles.infoButton}
              >
                <Text style={styles.infoButtonText}>ℹ️</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.formatDescription}>
              Todas as duplas jogam entre si. Ranking final por pontos e critérios de desempate.
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.formatCard, format === 'rotating' && styles.formatCardSelected]}
            onPress={() => setFormat('rotating')}
          >
            <View style={styles.formatCardHeader}>
              <Text style={styles.formatTitle}>Super 8 Rotativo (Individual)</Text>
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  handleShowFormatInfo('rotating');
                }}
                style={styles.infoButton}
              >
                <Text style={styles.infoButtonText}>ℹ️</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.formatDescription}>
              Jogadores trocam de parceiro a cada rodada. Ranking individual.
            </Text>
          </TouchableOpacity>

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.buttonSecondary} onPress={() => setStep(1)}>
              <Text style={styles.buttonTextSecondary}>Voltar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, !format && styles.buttonDisabled]}
              onPress={() => format && setStep(3)}
              disabled={!format}
            >
              <Text style={styles.buttonText}>Próximo</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {step === 3 && (
        <View style={styles.step}>
          <Text style={styles.sectionTitle}>Configurações de Pontuação</Text>
          
          <Text style={styles.label}>Pontos por vitória</Text>
          <View style={styles.stepper}>
            <TouchableOpacity
              style={styles.stepperButton}
              onPress={() => setPointsPerWin(Math.max(1, pointsPerWin - 1))}
            >
              <Text style={styles.stepperText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.stepperValue}>{pointsPerWin}</Text>
            <TouchableOpacity
              style={styles.stepperButton}
              onPress={() => setPointsPerWin(Math.min(10, pointsPerWin + 1))}
            >
              <Text style={styles.stepperText}>+</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.hintText}>Cada vitória vale {pointsPerWin} ponto(s) no ranking</Text>

          <Text style={styles.label}>Regras de Placar</Text>
          <Text style={styles.smallHint}>Escolha como os sets serão disputados:</Text>
          
          {Object.values(SCORE_RULESETS).map((ruleset) => (
            <TouchableOpacity
              key={ruleset.id}
              style={[
                styles.rulesetCard,
                scoreRulesetId === ruleset.id && styles.rulesetCardSelected,
              ]}
              onPress={() => setScoreRulesetId(ruleset.id)}
            >
              <View style={styles.rulesetCardHeader}>
                <View style={styles.rulesetRadio}>
                  {scoreRulesetId === ruleset.id && (
                    <View style={styles.rulesetRadioSelected} />
                  )}
                </View>
                <Text style={styles.rulesetTitle}>{ruleset.name}</Text>
              </View>
              <Text style={styles.rulesetDescription}>{ruleset.description}</Text>
            </TouchableOpacity>
          ))}

          <Text style={styles.label}>Critérios de Desempate</Text>
          <Text style={styles.smallHint}>Os critérios são aplicados automaticamente nesta ordem:</Text>
          <View style={styles.criteriaList}>
            {DEFAULT_TIEBREAK_CRITERIA.map((criterion, index) => (
              <View key={criterion} style={styles.criteriaItem}>
                <Text style={styles.criteriaOrder}>{index + 1}º</Text>
                <Text style={styles.criteriaName}>
                  {criterion === 'wins' && 'Vitórias'}
                  {criterion === 'game_difference' && 'Saldo de Games'}
                  {criterion === 'games_for' && 'Games Pró'}
                  {criterion === 'head_to_head' && 'Confronto Direto'}
                </Text>
              </View>
            ))}
          </View>
          <Text style={styles.hintText}>
            Os critérios são aplicados nesta ordem para desempatar participantes com mesma pontuação
          </Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.buttonSecondary} onPress={() => setStep(2)}>
              <Text style={styles.buttonTextSecondary}>Voltar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.button}
              onPress={() => setStep(4)}
            >
              <Text style={styles.buttonText}>Próximo</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {step === 4 && (
        <View style={styles.step}>
          <Text style={styles.sectionTitle}>Revisar e criar</Text>

          <View style={styles.reviewCard}>
            <Text style={styles.reviewLabel}>Nome:</Text>
            <Text style={styles.reviewValue}>{name}</Text>
          </View>

          <View style={styles.reviewCard}>
            <Text style={styles.reviewLabel}>Data:</Text>
            <Text style={styles.reviewValue}>
              {date}
            </Text>
          </View>

          {startTime && (
            <View style={styles.reviewCard}>
              <Text style={styles.reviewLabel}>Hora de início:</Text>
              <Text style={styles.reviewValue}>{startTime}</Text>
            </View>
          )}

          {location && (
            <View style={styles.reviewCard}>
              <Text style={styles.reviewLabel}>Local:</Text>
              <Text style={styles.reviewValue}>{location}</Text>
            </View>
          )}

          <View style={styles.reviewCard}>
            <Text style={styles.reviewLabel}>Formato:</Text>
            <Text style={styles.reviewValue}>
              {format === 'groups_finals' && 'Grupos + Finais'}
              {format === 'round_robin' && 'Pontos Corridos'}
              {format === 'rotating' && 'Super 8 Rotativo'}
            </Text>
          </View>

          <View style={styles.reviewCard}>
            <Text style={styles.reviewLabel}>Quadras:</Text>
            <Text style={styles.reviewValue}>{numCourts}</Text>
          </View>

          <View style={styles.reviewCard}>
            <Text style={styles.reviewLabel}>Sets por jogo:</Text>
            <Text style={styles.reviewValue}>{numSets}</Text>
          </View>

          <View style={styles.reviewCard}>
            <Text style={styles.reviewLabel}>Pontos por vitória:</Text>
            <Text style={styles.reviewValue}>{pointsPerWin}</Text>
          </View>

          <View style={styles.reviewCard}>
            <Text style={styles.reviewLabel}>Regras de placar:</Text>
            <Text style={styles.reviewValue}>{SCORE_RULESETS[scoreRulesetId].name}</Text>
          </View>

          <View style={styles.reviewCard}>
            <Text style={styles.reviewLabel}>Critérios de desempate:</Text>
            <Text style={styles.reviewValue}>
              {DEFAULT_TIEBREAK_CRITERIA.map((c, i) => 
                `${i + 1}º ${c === 'wins' ? 'Vitórias' : c === 'game_difference' ? 'Saldo de Games' : c === 'games_for' ? 'Games Pró' : 'Confronto Direto'}`
              ).join(', ')}
            </Text>
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.buttonSecondary} onPress={() => setStep(3)}>
              <Text style={styles.buttonTextSecondary}>Voltar</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.button, loading && styles.buttonDisabled]} 
              onPress={handleCreate}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#0f3460" />
              ) : (
                <Text style={styles.buttonText}>Criar evento</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Modal: Como Funciona? */}
      <Modal
        visible={showFormatInfoModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowFormatInfoModal(false);
          setSelectedFormatInfo(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedFormatInfo && (() => {
              const info = getFormatInfo(selectedFormatInfo);
              return (
                <>
                  <Text style={styles.modalTitle}>Como Funciona: {info.title}</Text>
                  
                  <ScrollView style={styles.formatInfoScroll} nestedScrollEnabled>
                    <View style={styles.formatInfoSection}>
                      <Text style={styles.formatInfoSectionTitle}>📋 Conceito</Text>
                      <Text style={styles.formatInfoText}>{info.concept}</Text>
                    </View>

                    <View style={styles.formatInfoSection}>
                      <Text style={styles.formatInfoSectionTitle}>👥 Participantes</Text>
                      <Text style={styles.formatInfoText}>{info.participants}</Text>
                    </View>

                    <View style={styles.formatInfoSection}>
                      <Text style={styles.formatInfoSectionTitle}>🏗️ Estrutura</Text>
                      <Text style={styles.formatInfoText}>{info.structure}</Text>
                    </View>

                    <View style={styles.formatInfoSection}>
                      <Text style={styles.formatInfoSectionTitle}>🏆 Classificação</Text>
                      <Text style={styles.formatInfoText}>{info.classification}</Text>
                    </View>

                    {info.special && (
                      <View style={styles.formatInfoSection}>
                        <Text style={styles.formatInfoSectionTitle}>✨ Características Especiais</Text>
                        <Text style={styles.formatInfoText}>{info.special}</Text>
                      </View>
                    )}

                    <View style={styles.formatInfoSection}>
                      <Text style={styles.formatInfoSectionTitle}>📊 Critérios de Desempate</Text>
                      <Text style={styles.formatInfoText}>{info.criteria}</Text>
                    </View>
                  </ScrollView>

                  <TouchableOpacity
                    style={styles.button}
                    onPress={() => {
                      setShowFormatInfoModal(false);
                      setSelectedFormatInfo(null);
                    }}
                  >
                    <Text style={styles.buttonText}>Entendi</Text>
                  </TouchableOpacity>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>

      <UpgradeModal
        visible={showUpgradeModal}
        onClose={() => {
          setShowUpgradeModal(false);
          setUpgradeTrigger(undefined);
        }}
        trigger={upgradeTrigger}
        onPurchaseSuccess={handleUpgradeSuccess}
      />
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
    marginBottom: 10,
    color: '#ffffff',
  },
  stepIndicator: {
    color: '#a0d2ff',
    marginBottom: 20,
  },
  step: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    color: '#ffffff',
  },
  input: {
    borderWidth: 1,
    borderColor: '#00d4ff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#16213e',
    color: '#ffffff',
  },
  inputError: {
    borderColor: '#ff6b6b',
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 12,
    marginTop: 4,
    marginBottom: 8,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  stepperButton: {
    width: 40,
    height: 40,
    backgroundColor: '#16213e',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#00d4ff',
  },
  stepperValue: {
    fontSize: 18,
    fontWeight: '600',
    marginHorizontal: 20,
    minWidth: 30,
    textAlign: 'center',
    color: '#ffffff',
  },
  stepperText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#00d4ff',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 20,
    color: '#ffffff',
  },
  formatCard: {
    borderWidth: 2,
    borderColor: '#00d4ff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    backgroundColor: '#16213e',
  },
  formatCardSelected: {
    borderColor: '#00d4ff',
    backgroundColor: '#0f3460',
  },
  formatCardDisabled: {
    borderColor: '#4a5568',
    backgroundColor: '#1a1a2e',
    opacity: 0.6,
  },
  formatTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#ffffff',
  },
  formatDescription: {
    color: '#a0d2ff',
    lineHeight: 20,
  },
  formatDescriptionDisabled: {
    color: '#6b7280',
  },
  lockIcon: {
    fontSize: 18,
  },
  premiumBadge: {
    fontSize: 12,
    color: '#00d4ff',
    fontWeight: '600',
    backgroundColor: '#16213e',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  comingSoonText: {
    color: '#00d4ff',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    fontStyle: 'italic',
  },
  reviewCard: {
    backgroundColor: '#16213e',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#00d4ff',
  },
  reviewLabel: {
    fontSize: 14,
    color: '#a0d2ff',
    marginBottom: 4,
  },
  reviewValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  button: {
    backgroundColor: '#00d4ff',
    padding: 16,
    borderRadius: 8,
    marginTop: 20,
  },
  buttonDisabled: {
    backgroundColor: '#4a5568',
  },
  buttonSecondary: {
    backgroundColor: '#16213e',
    padding: 16,
    borderRadius: 8,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#00d4ff',
  },
  buttonText: {
    color: '#0f3460',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  buttonTextSecondary: {
    color: '#00d4ff',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  formatCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#00d4ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoButtonText: {
    fontSize: 18,
    color: '#0f3460',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    borderWidth: 2,
    borderColor: '#00d4ff',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#ffffff',
    textAlign: 'center',
  },
  formatInfoScroll: {
    maxHeight: 500,
    marginBottom: 20,
  },
  formatInfoSection: {
    marginBottom: 20,
  },
  formatInfoSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00d4ff',
    marginBottom: 8,
  },
  formatInfoText: {
    fontSize: 14,
    color: '#a0d2ff',
    lineHeight: 22,
  },
  smallHint: {
    fontSize: 12,
    color: '#a0d2ff',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  hintText: {
    fontSize: 14,
    color: '#a0d2ff',
    marginTop: 8,
    marginBottom: 16,
    lineHeight: 20,
  },
  criteriaList: {
    marginTop: 12,
    marginBottom: 16,
  },
  criteriaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#00d4ff',
  },
  criteriaOrder: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00d4ff',
    marginRight: 12,
    minWidth: 30,
  },
  criteriaName: {
    fontSize: 14,
    color: '#ffffff',
    flex: 1,
  },
  rulesetCard: {
    backgroundColor: '#16213e',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#1a1a2e',
  },
  rulesetCardSelected: {
    borderColor: '#00d4ff',
    backgroundColor: '#0f3460',
  },
  rulesetCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 12,
  },
  rulesetRadio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#00d4ff',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
  },
  rulesetRadioSelected: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#00d4ff',
  },
  rulesetTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
  },
  rulesetDescription: {
    fontSize: 14,
    color: '#a0d2ff',
    marginLeft: 36,
    lineHeight: 20,
  },
});
