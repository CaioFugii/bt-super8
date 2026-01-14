import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Modal, Alert, ActivityIndicator, RefreshControl, Share } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Event, Match, MatchStatus } from '@/domain/types';
import { eventRepository } from '@/db/repositories/eventRepository';
import { eventParticipantRepository, EventParticipantWithPlayers } from '@/db/repositories/eventParticipantRepository';
import { playerRepository } from '@/db/repositories/playerRepository';
import { matchRepository } from '@/db/repositories/matchRepository';
import { generateEventMatches } from '@/services/eventGenerator';
import { calculateRanking, calculateIndividualRanking, DEFAULT_TIEBREAK_CRITERIA } from '@/domain/algorithms/ranking';
import { RankingEntry } from '@/domain/types';
import { formatDateToDDMMYYYY } from '@/utils/dateUtils';
import { useEventStore } from '@/state/eventStore';
import { SCORE_RULESETS, DEFAULT_SCORE_RULESET, validateMatchScore, getWalkoverScore, ScoreRulesetId } from '@/domain/scoreRuleset';

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { removeEvent } = useEventStore();
  const [event, setEvent] = useState<Event | null>(null);
  const [activeTab, setActiveTab] = useState<'agenda' | 'ranking' | 'participants' | 'settings'>('agenda');
  const [activeSubTab, setActiveSubTab] = useState<'participants' | 'pairs'>('participants');
  const [participants, setParticipants] = useState<EventParticipantWithPlayers[]>([]);
  const [showAddParticipantModal, setShowAddParticipantModal] = useState(false);
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [quickAddText, setQuickAddText] = useState('');
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [matchFilter, setMatchFilter] = useState<MatchStatus | 'all'>('all');
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [scoreTeam1Set1, setScoreTeam1Set1] = useState('');
  const [scoreTeam2Set1, setScoreTeam2Set1] = useState('');
  const [scoreTeam1Set2, setScoreTeam1Set2] = useState('');
  const [scoreTeam2Set2, setScoreTeam2Set2] = useState('');
  const [scoreTeam1Set3, setScoreTeam1Set3] = useState('');
  const [scoreTeam2Set3, setScoreTeam2Set3] = useState('');
  const [isWalkover, setIsWalkover] = useState(false);
  const [walkoverWinner, setWalkoverWinner] = useState<'team1' | 'team2' | null>(null);
  const [walkoverReason, setWalkoverReason] = useState('');
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [newPlayerNameError, setNewPlayerNameError] = useState<string | undefined>();
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showFormPairsModal, setShowFormPairsModal] = useState(false);
  const [selectedPlayersForPair, setSelectedPlayersForPair] = useState<number[]>([]);

  const handleScoreInput = (text: string, setter: (value: string) => void) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    setter(cleaned);
  };

  const handleNewPlayerNameChange = (value: string) => {
    setNewPlayerName(value);
    if (value.trim().length === 0) {
      setNewPlayerNameError('O nome é obrigatório');
    } else if (value.trim().length < 2) {
      setNewPlayerNameError('O nome deve ter pelo menos 2 caracteres');
    } else {
      setNewPlayerNameError(undefined);
    }
  };

  useEffect(() => {
    loadEvent();
    loadParticipants();
    loadMatches();
  }, [id]);

  useEffect(() => {
    if (participants.length > 0 && matches.length > 0 && event) {
      calculateRankingData();
    }
  }, [participants, matches, event]);

  useEffect(() => {
    // Para formato rotativo, sempre manter subTab em 'participants' (não há duplas)
    if (event && event.format === 'rotating' && activeSubTab === 'pairs') {
      setActiveSubTab('participants');
    }
  }, [event, activeSubTab]);

  const loadEvent = async () => {
    if (!id) return;
    try {
      const eventData = await eventRepository.findById(Number(id));
      if (!eventData) {
        Alert.alert('Erro', 'Evento não encontrado');
        router.back();
        return;
      }
      setEvent(eventData);
    } catch (error) {
      console.error('Error loading event:', error);
      Alert.alert('Erro', 'Não foi possível carregar o evento. Tente novamente.');
    } finally {
      setInitialLoading(false);
    }
  };

  const loadParticipants = async () => {
    if (!id) return;
    try {
      const participantsData = await eventParticipantRepository.findByEventId(Number(id));
      setParticipants(participantsData);
    } catch (error) {
      console.error('Error loading participants:', error);
      if (!refreshing) {
        Alert.alert('Erro', 'Não foi possível carregar os participantes.');
      }
    }
  };

  const loadMatches = async () => {
    if (!id) return;
    try {
      const matchesData = await matchRepository.findByEventId(Number(id));
      setMatches(matchesData);
    } catch (error) {
      console.error('Error loading matches:', error);
      if (!refreshing) {
        Alert.alert('Erro', 'Não foi possível carregar os jogos.');
      }
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        loadEvent(),
        loadParticipants(),
        loadMatches(),
      ]);
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  };


  const handleFormPair = async () => {
    if (!id || selectedPlayersForPair.length !== 2) {
      Alert.alert('Aviso', 'Selecione exatamente 2 jogadores para formar uma dupla.');
      return;
    }

    // Verificar se os jogos já foram gerados
    if (matches.length > 0) {
      Alert.alert('Ação não permitida', 'Não é possível formar duplas após os jogos serem gerados.');
      return;
    }

    setLoading(true);
    try {
      // Buscar os dois participantes individuais
      const participant1 = participants.find(p => p.id === selectedPlayersForPair[0]);
      const participant2 = participants.find(p => p.id === selectedPlayersForPair[1]);

      if (!participant1 || !participant2) {
        Alert.alert('Erro', 'Participantes não encontrados.');
        return;
      }

      // Verificar se já são duplas
      if (participant1.player2_id || participant2.player2_id) {
        Alert.alert('Aviso', 'Um ou ambos os participantes já fazem parte de uma dupla.');
        return;
      }

      // Atualizar o primeiro participante para incluir o segundo jogador
      await eventParticipantRepository.update(participant1.id, {
        player2_id: participant2.player1_id,
      });

      // Deletar o segundo participante individual (agora está na dupla)
      await eventParticipantRepository.delete(participant2.id);

      await loadParticipants();
      setShowFormPairsModal(false);
      setSelectedPlayersForPair([]);
      Alert.alert('Sucesso', 'Dupla formada com sucesso!');
    } catch (error) {
      console.error('Error forming pair:', error);
      Alert.alert('Erro', 'Não foi possível formar a dupla. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleAutoFormPairs = async () => {
    if (!id) return;

    // Verificar se os jogos já foram gerados
    if (matches.length > 0) {
      Alert.alert('Ação não permitida', 'Não é possível formar duplas após os jogos serem gerados.');
      return;
    }

    const individualParticipants = getIndividualParticipants();
    
    if (individualParticipants.length < 2) {
      Alert.alert('Aviso', 'É necessário ter pelo menos 2 jogadores individuais para formar duplas.');
      return;
    }

    if (individualParticipants.length % 2 !== 0) {
      Alert.alert(
        'Aviso', 
        `Você tem ${individualParticipants.length} jogador(es) individual(is). É necessário um número par de jogadores para formar duplas. Adicione mais ${2 - (individualParticipants.length % 2)} jogador(es) ou remova ${individualParticipants.length % 2} jogador(es).`
      );
      return;
    }

    Alert.alert(
      'Formar Duplas Automaticamente',
      `Deseja formar ${individualParticipants.length / 2} dupla(s) automaticamente? As duplas serão formadas aleatoriamente.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Formar Duplas',
          onPress: async () => {
            setLoading(true);
            try {
              // Embaralhar os participantes para formar duplas aleatórias
              const shuffled = [...individualParticipants].sort(() => Math.random() - 0.5);
              
              // Formar duplas em pares
              for (let i = 0; i < shuffled.length; i += 2) {
                const participant1 = shuffled[i];
                const participant2 = shuffled[i + 1];

                if (!participant1 || !participant2) break;

                // Atualizar o primeiro participante para incluir o segundo jogador
                await eventParticipantRepository.update(participant1.id, {
                  player2_id: participant2.player1_id,
                });

                // Deletar o segundo participante individual (agora está na dupla)
                await eventParticipantRepository.delete(participant2.id);
              }

              await loadParticipants();
              setShowFormPairsModal(false);
              setSelectedPlayersForPair([]);
              
              const pairsFormed = shuffled.length / 2;
              Alert.alert('Sucesso', `${pairsFormed} dupla(s) formada(s) automaticamente!`);
              
              await loadParticipants();
            } catch (error) {
              console.error('Error auto forming pairs:', error);
              Alert.alert('Erro', 'Não foi possível formar as duplas automaticamente. Tente novamente.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  // Obter participantes individuais (sem dupla) para formar duplas
  const getIndividualParticipants = () => {
    return participants.filter(p => !p.player2_id);
  };


  const handleShareRanking = async () => {
    if (!event || ranking.length === 0) return;

    try {
      const rankingTitle = event.format === 'rotating' ? 'Ranking Individual' : 'Ranking';
      let shareText = `🏆 ${rankingTitle} - ${event.name}\n\n`;
      
      // Para formato rotativo, o ranking já vem filtrado apenas com participantes individuais
      // da função calculateIndividualRanking, então não precisa filtrar novamente
      ranking.forEach((entry) => {
        const participantWithPlayers = participants.find(
          p => p.id === entry.participant.id
        );
        const participantName = participantWithPlayers?.player1?.name || 'Desconhecido';
        // Para formato rotativo, nunca mostrar duplas (já filtrado pela função calculateIndividualRanking)
        const participantName2 = event.format === 'rotating' 
          ? null 
          : participantWithPlayers?.player2?.name;
        const displayName = participantName2 
          ? `${participantName} / ${participantName2}`
          : participantName;
        
        shareText += `${entry.position}º - ${displayName}\n`;
        shareText += `   V: ${entry.wins} | D: ${entry.losses} | SG: ${entry.gameDifference > 0 ? '+' : ''}${entry.gameDifference}\n\n`;
      });

      const result = await Share.share({
        message: shareText,
        title: `${rankingTitle} - ${event.name}`,
      });

      if (result.action === Share.sharedAction) {
        // Conteúdo compartilhado com sucesso
      }
    } catch (error) {
      console.error('Error sharing ranking:', error);
      Alert.alert('Erro', 'Não foi possível compartilhar o ranking.');
    }
  };

  const handleDeleteEvent = async () => {
    if (!event || !id) return;

    Alert.alert(
      'Excluir Evento',
      `Tem certeza que deseja excluir o evento "${event.name}"?\n\nEsta ação não pode ser desfeita e todos os dados relacionados (participantes, jogos, resultados) serão permanentemente removidos.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              // Deletar o evento (cascade delete remove participantes e jogos automaticamente)
              await eventRepository.delete(Number(id));
              
              // Remover do store
              removeEvent(Number(id));
              
              // Redirecionar para home
              router.replace('/');
              Alert.alert('Sucesso', 'Evento excluído com sucesso!');
            } catch (error) {
              console.error('Error deleting event:', error);
              Alert.alert('Erro', 'Não foi possível excluir o evento. Tente novamente.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const calculateRankingData = (matchesToUse?: Match[]) => {
    const matchesForCalculation = matchesToUse || matches;
    
    if (!event || participants.length === 0 || matchesForCalculation.length === 0) {
      setRanking([]);
      return;
    }

    // Usar lógica separada para formato individual (rotativo)
    // Sempre usa o critério de desempate fixo e points_per_win do evento
    if (event.format === 'rotating') {
      const rankingData = calculateIndividualRanking(
        participants,
        matchesForCalculation,
        DEFAULT_TIEBREAK_CRITERIA,
        event.points_per_win
      );
      setRanking(rankingData);
    } else {
      // Usar lógica padrão para formatos de duplas (groups_finals e round_robin)
      const rankingData = calculateRanking(
        participants,
        matchesForCalculation,
        DEFAULT_TIEBREAK_CRITERIA,
        event.points_per_win
      );
      setRanking(rankingData);
    }
  };

  // Verifica se o evento está pronto para gerar jogos baseado no formato
  const canGenerateMatches = (participantsList: EventParticipantWithPlayers[]): boolean => {
    if (!event) return false;
    
    // Formato rotativo: precisa de 8 jogadores individuais (sem player2_id)
    if (event.format === 'rotating') {
      return participantsList.length === 8 && 
             participantsList.every(p => !p.player2_id);
    }
    
    // Formatos groups_finals e round_robin: precisam de 8 duplas completas (com player2_id)
    if (event.format === 'groups_finals' || event.format === 'round_robin') {
      return participantsList.length === 8 && 
             participantsList.every(p => p.player2_id !== null && p.player2_id !== undefined);
    }
    
    return false;
  };

  // Função para gerar jogos manualmente
  const handleGenerateMatches = async () => {
    if (!event || !id) return;

    // Verificar se já existem jogos
    const existingMatches = await matchRepository.findByEventId(Number(id));
    if (existingMatches.length > 0) {
      Alert.alert('Aviso', 'Já existem jogos gerados para este evento.');
      return;
    }

    // Verificar se pode gerar jogos
    if (!canGenerateMatches(participants)) {
      const formatRequirement = event.format === 'rotating' 
        ? '8 jogadores individuais' 
        : '8 duplas completas (16 jogadores)';
      Alert.alert('Aviso', `É necessário ter ${formatRequirement} para gerar os jogos.`);
      return;
    }

    setLoading(true);
    try {
      await generateEventMatches(event, participants);
      await loadMatches();
      Alert.alert('Sucesso', 'Jogos gerados com sucesso!');
    } catch (error) {
      console.error('Error generating matches:', error);
      Alert.alert('Erro', 'Não foi possível gerar os jogos. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Retorna a mensagem de requisitos baseada no formato
  const getParticipantsRequirementMessage = (): string => {
    if (!event) return '8 participantes';
    
    if (event.format === 'rotating') {
      return '8 jogadores individuais';
    }
    
    if (event.format === 'groups_finals' || event.format === 'round_robin') {
      return '8 duplas completas (16 jogadores)';
    }
    
    return '8 participantes';
  };

  // Retorna o número máximo de participantes baseado no formato
  const getMaxParticipants = (): number => {
    if (!event) return 8;
    
    if (event.format === 'rotating') {
      return 8; // 8 jogadores individuais
    }
    
    if (event.format === 'groups_finals' || event.format === 'round_robin') {
      return 16; // 16 jogadores para formar 8 duplas
    }
    
    return 8;
  };

  // Verifica se o número ideal de participantes já foi atingido
  const hasIdealParticipants = (): boolean => {
    if (!event) return false;
    
    // Formato rotativo: ideal = 8 jogadores individuais
    if (event.format === 'rotating') {
      return participants.length === 8 && participants.every(p => !p.player2_id);
    }
    
    // Formatos de duplas: ideal = 8 duplas completas OU já atingiu o máximo de 16 jogadores
    if (event.format === 'groups_finals' || event.format === 'round_robin') {
      // Se já tem 8 duplas completas, ideal atingido
      if (participants.length === 8 && participants.every(p => p.player2_id !== null && p.player2_id !== undefined)) {
        return true;
      }
      // Se já tem 16 jogadores (máximo), ideal atingido
      if (participants.length >= 16) {
        return true;
      }
      return false;
    }
    
    return false;
  };

  const handleAddParticipant = async () => {
    if (!id || !newPlayerName.trim()) {
      setNewPlayerNameError('O nome é obrigatório');
      return;
    }

    if (newPlayerName.trim().length < 2) {
      setNewPlayerNameError('O nome deve ter pelo menos 2 caracteres');
      return;
    }

    // Verificar se os jogos já foram gerados
    if (matches.length > 0) {
      Alert.alert('Ação não permitida', 'Não é possível adicionar participantes após os jogos serem gerados.');
      return;
    }

    // Verificar se o número ideal já foi atingido
    if (hasIdealParticipants()) {
      const formatRequirement = event?.format === 'rotating' 
        ? '8 jogadores individuais' 
        : '8 duplas completas (16 jogadores)';
      Alert.alert('Aviso', `O número ideal de participantes já foi atingido (${formatRequirement}). Exclua um participante para adicionar outro.`);
      return;
    }
    
    setLoading(true);
    try {
      // Criar ou buscar jogador
      let player = await playerRepository.search(newPlayerName.trim());
      if (player.length === 0) {
        player = [await playerRepository.create({ name: newPlayerName.trim() })];
      } else {
        player = [player[0]];
      }

      // Adicionar como participante
      await eventParticipantRepository.create({
        event_id: Number(id),
        player1_id: player[0].id,
        player2_id: event?.format === 'rotating' ? undefined : undefined, // Para rotativo, só player1
      });

      setNewPlayerName('');
      setShowAddParticipantModal(false);
      await loadParticipants();
    } catch (error) {
      console.error('Error adding participant:', error);
      Alert.alert(
        'Erro',
        'Não foi possível adicionar o participante. Verifique se o nome é válido e tente novamente.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAdd = async () => {
    if (!id || !quickAddText.trim()) return;

    // Verificar se os jogos já foram gerados
    if (matches.length > 0) {
      Alert.alert('Ação não permitida', 'Não é possível adicionar participantes após os jogos serem gerados.');
      return;
    }

    // Verificar se o número ideal já foi atingido
    if (hasIdealParticipants()) {
      const formatRequirement = event?.format === 'rotating' 
        ? '8 jogadores individuais' 
        : '8 duplas completas (16 jogadores)';
      Alert.alert('Aviso', `O número ideal de participantes já foi atingido (${formatRequirement}). Exclua participantes para adicionar outros.`);
      return;
    }
    
    setLoading(true);
    try {
      // Separar nomes por linha ou vírgula
      const names = quickAddText
        .split(/[\n,]/)
        .map(n => n.trim())
        .filter(n => n.length > 0);

      if (names.length === 0) {
        Alert.alert('Aviso', 'Digite pelo menos um nome');
        setLoading(false);
        return;
      }

      // Verificar quantos participantes podem ser adicionados
      const maxParticipants = getMaxParticipants();
      const availableSlots = maxParticipants - participants.length;
      
      if (availableSlots <= 0) {
        const formatRequirement = event?.format === 'rotating' 
          ? '8 jogadores individuais' 
          : '8 duplas completas (16 jogadores)';
        Alert.alert(
          'Aviso', 
          `O número máximo de participantes foi atingido (${formatRequirement}). Exclua participantes para adicionar outros.`
        );
        setLoading(false);
        return;
      }
      
      if (names.length > availableSlots) {
        Alert.alert(
          'Aviso', 
          `Você só pode adicionar mais ${availableSlots} participante(s).`
        );
        setLoading(false);
        return;
      }

      // Criar jogadores
      const players = await playerRepository.createBatch(names);

      // Adicionar como participantes
      const newParticipants = players.map(p => ({
        event_id: Number(id),
        player1_id: p.id,
        player2_id: undefined,
      }));

      await eventParticipantRepository.createBatch(newParticipants);

      setQuickAddText('');
      setShowQuickAddModal(false);
      await loadParticipants();
    } catch (error) {
      console.error('Error quick adding participants:', error);
      Alert.alert(
        'Erro',
        'Não foi possível adicionar alguns participantes. Verifique os nomes e tente novamente.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveParticipant = async (participantId: number) => {
    // Verificar se os jogos já foram gerados
    if (matches.length > 0) {
      Alert.alert('Ação não permitida', 'Não é possível remover participantes após os jogos serem gerados.');
      return;
    }

    // Verificar se é uma dupla ou participante individual
    const participant = participants.find(p => p.id === participantId);
    const isPair = participant && participant.player2_id !== null && participant.player2_id !== undefined;
    
    const title = isPair ? 'Remover dupla' : 'Remover participante';
    const message = isPair 
      ? 'Tem certeza que deseja remover esta dupla?'
      : 'Tem certeza que deseja remover este participante?';

    Alert.alert(
      title,
      message,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            try {
              await eventParticipantRepository.delete(participantId);
              await loadParticipants();
            } catch (error) {
              console.error('Error removing participant:', error);
              Alert.alert('Erro', 'Não foi possível remover o participante. Tente novamente.');
            }
          },
        },
      ]
    );
  };

  const handleSaveResult = async () => {
    if (!selectedMatch || !event) return;

    const numSets = event.num_sets ?? 1;
    const rulesetId = (event.score_ruleset_id as ScoreRulesetId) || DEFAULT_SCORE_RULESET;
    const ruleset = SCORE_RULESETS[rulesetId];

    // Tratamento de W.O.
    if (isWalkover) {
      if (!walkoverWinner) {
        Alert.alert('Erro', 'Selecione o vencedor do W.O.');
        return;
      }

      const walkoverScores = getWalkoverScore(ruleset, numSets);
      const winnerId = walkoverWinner === 'team1' ? selectedMatch.team1_id : selectedMatch.team2_id;

      setLoading(true);
      try {
        await matchRepository.update(selectedMatch.id, {
          score_team1_set1: walkoverScores.set1.team1,
          score_team2_set1: walkoverScores.set1.team2,
          score_team1_set2: numSets === 2 ? walkoverScores.set2?.team1 : undefined,
          score_team2_set2: numSets === 2 ? walkoverScores.set2?.team2 : undefined,
          status: 'finished',
          winner_id: winnerId,
          outcome_type: 'walkover',
          walkover_winner_team_id: winnerId,
          walkover_reason: walkoverReason || undefined,
          finished_at: Date.now(),
        });

        const updatedMatches = await matchRepository.findByEventId(Number(id));
        setMatches(updatedMatches);
        if (event && participants.length > 0 && updatedMatches.length > 0) {
          calculateRankingData(updatedMatches);
        }
        setShowResultModal(false);
        setSelectedMatch(null);
        setIsWalkover(false);
        setWalkoverWinner(null);
        setWalkoverReason('');
      } catch (error) {
        console.error('Error saving walkover:', error);
        Alert.alert('Erro', 'Não foi possível salvar o W.O. Tente novamente.');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Validação de placares normais
    const s1t1 = scoreTeam1Set1 ? parseInt(scoreTeam1Set1, 10) : 0;
    const s1t2 = scoreTeam2Set1 ? parseInt(scoreTeam2Set1, 10) : 0;
    const s2t1 = numSets === 2 ? (scoreTeam1Set2 ? parseInt(scoreTeam1Set2, 10) : undefined) : undefined;
    const s2t2 = numSets === 2 ? (scoreTeam2Set2 ? parseInt(scoreTeam2Set2, 10) : undefined) : undefined;
    const s3t1 = scoreTeam1Set3 ? parseInt(scoreTeam1Set3, 10) : undefined;
    const s3t2 = scoreTeam2Set3 ? parseInt(scoreTeam2Set3, 10) : undefined;

    // Validar que são números inteiros válidos
    if (isNaN(s1t1) || isNaN(s1t2) || (numSets === 2 && (s2t1 === undefined || s2t2 === undefined || isNaN(s2t1) || isNaN(s2t2)))) {
      Alert.alert('Erro', 'Por favor, digite apenas números inteiros nos placares');
      return;
    }

    // Validar placares usando o ruleset
    const validation = validateMatchScore(
      ruleset,
      numSets,
      {
        set1: { team1: s1t1, team2: s1t2 },
        set2: numSets === 2 ? { team1: s2t1!, team2: s2t2! } : undefined,
        set3: s3t1 !== undefined && s3t2 !== undefined ? { team1: s3t1, team2: s3t2 } : undefined,
      }
    );

    if (!validation.ok) {
      Alert.alert('Erro de Validação', validation.reason || 'Placar inválido');
      return;
    }

    // Se requer decider e não foi preenchido
    if (validation.requiresDecider && (s3t1 === undefined || s3t2 === undefined)) {
      Alert.alert('Desempate Obrigatório', 'Empate 1x1 em sets requer desempate (Super tiebreak). Preencha o 3º set.');
      return;
    }

    // Determinar vencedor
    let winnerId: number | undefined;
    if (numSets === 1) {
      winnerId = s1t1 > s1t2 ? selectedMatch.team1_id : selectedMatch.team2_id;
    } else {
      const setsTeam1 = (s1t1 > s1t2 ? 1 : 0) + (s2t1! > s2t2! ? 1 : 0) + (s3t1 !== undefined && s3t2 !== undefined && s3t1 > s3t2 ? 1 : 0);
      const setsTeam2 = (s1t2 > s1t1 ? 1 : 0) + (s2t2! > s2t1! ? 1 : 0) + (s3t2 !== undefined && s3t1 !== undefined && s3t2 > s3t1 ? 1 : 0);
      
      if (setsTeam1 > setsTeam2) {
        winnerId = selectedMatch.team1_id;
      } else if (setsTeam2 > setsTeam1) {
        winnerId = selectedMatch.team2_id;
      }
    }

    if (!winnerId) {
      Alert.alert('Erro', 'Não foi possível determinar o vencedor');
      return;
    }

    setLoading(true);
    try {
      await matchRepository.update(selectedMatch.id, {
        score_team1_set1: s1t1,
        score_team2_set1: s1t2,
        score_team1_set2: numSets === 2 ? s2t1 : undefined,
        score_team2_set2: numSets === 2 ? s2t2 : undefined,
        score_team1_set3: s3t1 !== undefined ? s3t1 : undefined,
        score_team2_set3: s3t2 !== undefined ? s3t2 : undefined,
        status: 'finished',
        winner_id: winnerId,
        outcome_type: 'played',
        finished_at: Date.now(),
      });

      const updatedMatches = await matchRepository.findByEventId(Number(id));
      setMatches(updatedMatches);
      if (event && participants.length > 0 && updatedMatches.length > 0) {
        calculateRankingData(updatedMatches);
      }
      setShowResultModal(false);
      setSelectedMatch(null);
      setIsWalkover(false);
      setWalkoverWinner(null);
      setWalkoverReason('');
      setScoreTeam1Set3('');
      setScoreTeam2Set3('');
    } catch (error) {
      console.error('Error saving result:', error);
      Alert.alert('Erro', 'Não foi possível salvar o resultado. Verifique os dados e tente novamente.');
    } finally {
      setLoading(false);
    }
  };


  if (initialLoading || !event) {
    return (
      <View style={styles.container}>
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00d4ff" />
        <Text style={styles.loadingText}>Carregando evento...</Text>
      </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.eventName}>{event.name}</Text>
        <Text style={styles.eventDate}>
          {formatDateToDDMMYYYY(event.date)}
          {event.start_time && ` às ${event.start_time}`}
        </Text>
        {event.location && (
          <Text style={styles.eventLocation}>{event.location}</Text>
        )}
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'agenda' && styles.tabActive]}
          onPress={() => setActiveTab('agenda')}
        >
          <Text style={[styles.tabText, activeTab === 'agenda' && styles.tabTextActive]}>
            Agenda
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'ranking' && styles.tabActive]}
          onPress={() => setActiveTab('ranking')}
        >
          <Text style={[styles.tabText, activeTab === 'ranking' && styles.tabTextActive]}>
            Ranking
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'participants' && styles.tabActive]}
          onPress={() => setActiveTab('participants')}
        >
          <Text style={[styles.tabText, activeTab === 'participants' && styles.tabTextActive]}>
            Participantes
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'settings' && styles.tabActive]}
          onPress={() => setActiveTab('settings')}
        >
          <Text style={[styles.tabText, activeTab === 'settings' && styles.tabTextActive]}>
            Configurações
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {activeTab === 'agenda' && (
          <ScrollView
            style={styles.agendaContainer}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            <Text style={styles.sectionTitle}>Agenda de Jogos</Text>
            
            {matches.length === 0 ? (
              <View style={styles.emptyAgendaContainer}>
                {canGenerateMatches(participants) ? (
                  <>
                    <Text style={styles.emptyText}>
                      Você tem o número ideal de participantes! Clique no botão abaixo para gerar os jogos.
                    </Text>
                    <TouchableOpacity
                      style={styles.button}
                      onPress={handleGenerateMatches}
                      disabled={loading}
                    >
                      {loading ? (
                        <ActivityIndicator color="#0f3460" />
                      ) : (
                        <Text style={styles.buttonText}>🎮 Gerar Jogos</Text>
                      )}
                    </TouchableOpacity>
                  </>
                ) : (
                  <Text style={styles.emptyText}>
                    Adicione {getParticipantsRequirementMessage()} para poder gerar os jogos.
                  </Text>
                )}
              </View>
            ) : (
              <>
                {/* Filtros */}
                <View style={styles.filterRow}>
                  <TouchableOpacity
                    style={[styles.filterButton, matchFilter === 'all' && styles.filterButtonActive]}
                    onPress={() => setMatchFilter('all')}
                  >
                    <Text style={[styles.filterText, matchFilter === 'all' && styles.filterTextActive]}>
                      Todos
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.filterButton, matchFilter === 'pending' && styles.filterButtonActive]}
                    onPress={() => setMatchFilter('pending')}
                  >
                    <Text style={[styles.filterText, matchFilter === 'pending' && styles.filterTextActive]}>
                      Pendentes
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.filterButton, matchFilter === 'finished' && styles.filterButtonActive]}
                    onPress={() => setMatchFilter('finished')}
                  >
                    <Text style={[styles.filterText, matchFilter === 'finished' && styles.filterTextActive]}>
                      Finalizados
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Jogos por rodada */}
                {(() => {
                  const filteredMatches = matchFilter === 'all' 
                    ? matches 
                    : matches.filter(m => m.status === matchFilter);
                  
                  const rounds = Array.from(new Set(filteredMatches.map(m => m.round))).sort((a, b) => a - b);
                  
                  if (rounds.length === 0) {
                    return (
                      <Text style={styles.emptyText}>
                        Nenhum jogo encontrado com o filtro selecionado.
                      </Text>
                    );
                  }

                  return rounds.map(round => {
                    const roundMatches = filteredMatches.filter(m => m.round === round);
                    return (
                      <View key={round} style={styles.roundSection}>
                        <Text style={styles.roundTitle}>Rodada {round}</Text>
                        {roundMatches.map(match => {
                          const team1 = participants.find(p => p.id === match.team1_id);
                          const team2 = participants.find(p => p.id === match.team2_id);
                          const team1Name = team1 
                            ? `${team1.player1?.name || ''}${team1.player2 ? ` / ${team1.player2.name}` : ''}`
                            : 'Time 1';
                          const team2Name = team2 
                            ? `${team2.player1?.name || ''}${team2.player2 ? ` / ${team2.player2.name}` : ''}`
                            : 'Time 2';
                          
                          return (
                            <TouchableOpacity
                              key={match.id}
                              style={[
                                styles.matchCard,
                                match.status === 'finished' && styles.matchCardFinished,
                              ]}
                              onPress={() => {
                                setSelectedMatch(match);
                                if (match.status === 'finished') {
                                  setScoreTeam1Set1(String(match.score_team1_set1 || ''));
                                  setScoreTeam2Set1(String(match.score_team2_set1 || ''));
                                  setScoreTeam1Set2(String(match.score_team1_set2 || ''));
                                  setScoreTeam2Set2(String(match.score_team2_set2 || ''));
                                  setScoreTeam1Set3(String(match.score_team1_set3 || ''));
                                  setScoreTeam2Set3(String(match.score_team2_set3 || ''));
                                  setIsWalkover(match.outcome_type === 'walkover');
                                  setWalkoverWinner(
                                    match.outcome_type === 'walkover' && match.walkover_winner_team_id === match.team1_id
                                      ? 'team1'
                                      : match.outcome_type === 'walkover' && match.walkover_winner_team_id === match.team2_id
                                      ? 'team2'
                                      : null
                                  );
                                  setWalkoverReason(match.walkover_reason || '');
                                } else {
                                  setScoreTeam1Set1('');
                                  setScoreTeam2Set1('');
                                  setScoreTeam1Set2('');
                                  setScoreTeam2Set2('');
                                  setScoreTeam1Set3('');
                                  setScoreTeam2Set3('');
                                  setIsWalkover(false);
                                  setWalkoverWinner(null);
                                  setWalkoverReason('');
                                }
                                setShowResultModal(true);
                              }}
                            >
                              <View style={styles.matchHeader}>
                                <View style={styles.matchHeaderLeft}>
                                  <Text style={styles.matchCourt}>
                                    {match.court ? `Quadra ${match.court}` : 'Sem quadra'}
                                  </Text>
                                </View>
                                <Text style={[
                                  styles.matchStatus,
                                  match.status === 'finished' && styles.matchStatusFinished,
                                ]}>
                                  {match.status === 'pending' && 'Pendente'}
                                  {match.status === 'finished' && 'Finalizado'}
                                </Text>
                              </View>
                              <View style={styles.matchTeams}>
                                <View style={styles.matchTeam}>
                                  <Text style={styles.matchTeamName}>{team1Name}</Text>
                                  {match.status === 'finished' && (
                                    <Text style={styles.matchScore}>
                                      {match.score_team1_set1 || 0} - {match.score_team2_set1 || 0}
                                      {event && (event.num_sets ?? 1) === 2 && match.score_team1_set2 !== undefined && (
                                        ` | ${match.score_team1_set2} - ${match.score_team2_set2}`
                                      )}
                                    </Text>
                                  )}
                                </View>
                                <Text style={styles.matchVS}>vs</Text>
                                <View style={styles.matchTeam}>
                                  <Text style={styles.matchTeamName}>{team2Name}</Text>
                                </View>
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    );
                  });
                })()}
              </>
            )}
          </ScrollView>
        )}

        {activeTab === 'ranking' && (
          <ScrollView
            style={styles.rankingContainer}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            <Text style={styles.sectionTitle}>
              {event?.format === 'rotating' ? 'Ranking Individual' : 'Ranking'}
            </Text>
            
            {ranking.length === 0 ? (
              <Text style={styles.emptyText}>
                {participants.length === 0 
                  ? 'Adicione participantes para ver o ranking.'
                  : 'Nenhum resultado registrado ainda.'}
              </Text>
            ) : (
              <View style={styles.rankingTable}>
                <View style={styles.rankingHeader}>
                  <Text style={[styles.rankingHeaderCell, styles.rankingPosition]}>#</Text>
                  <Text style={[styles.rankingHeaderCell, styles.rankingName]}>Participante</Text>
                  <Text style={[styles.rankingHeaderCell, styles.rankingStat]}>P</Text>
                  <Text style={[styles.rankingHeaderCell, styles.rankingStat]}>V</Text>
                  <Text style={[styles.rankingHeaderCell, styles.rankingStat]}>D</Text>
                  <Text style={[styles.rankingHeaderCell, styles.rankingStat]}>SG</Text>
                </View>
                {ranking.map((entry) => {
                  // Buscar dados do participante com informações dos jogadores
                  const participantWithPlayers = participants.find(
                    p => p.id === entry.participant.id
                  );
                  const participantName = participantWithPlayers?.player1?.name || 'Desconhecido';
                  // Para formato rotativo, nunca mostrar duplas (já filtrado pela função calculateIndividualRanking)
                  const participantName2 = event?.format === 'rotating' 
                    ? null 
                    : participantWithPlayers?.player2?.name;
                  const displayName = participantName2 
                    ? `${participantName} / ${participantName2}`
                    : participantName;
                    
                    return (
                      <View 
                        key={entry.participant.id} 
                        style={[
                          styles.rankingRow,
                          entry.position <= 3 && styles.rankingRowTop3
                        ]}
                      >
                        <Text style={[styles.rankingCell, styles.rankingPosition]}>
                          {entry.position}
                        </Text>
                        <Text style={[styles.rankingCell, styles.rankingName]} numberOfLines={1}>
                          {displayName}
                        </Text>
                        <Text style={[styles.rankingCell, styles.rankingStat]}>
                          {entry.points}
                        </Text>
                        <Text style={[styles.rankingCell, styles.rankingStat]}>
                          {entry.wins}
                        </Text>
                        <Text style={[styles.rankingCell, styles.rankingStat]}>
                          {entry.losses}
                        </Text>
                        <Text style={[styles.rankingCell, styles.rankingStat]}>
                          {entry.gameDifference > 0 ? '+' : ''}{entry.gameDifference}
                        </Text>
                      </View>
                    );
                  })}
              </View>
            )}

            {ranking.length > 0 && (
              <>
                <View style={styles.rankingLegend}>
                  <Text style={styles.legendText}>
                    <Text style={styles.legendLabel}>V:</Text> Vitórias |{' '}
                    <Text style={styles.legendLabel}>D:</Text> Derrotas |{' '}
                    <Text style={styles.legendLabel}>SG:</Text> Saldo de Games
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.button, styles.buttonSecondary, { marginTop: 16 }]}
                  onPress={handleShareRanking}
                >
                  <Text style={styles.buttonTextSecondary}>📤 Compartilhar Ranking</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        )}

        {activeTab === 'participants' && (
          <View style={styles.participantsContainer}>
            {/* SubTabs */}
            <View style={styles.subTabs}>
              <TouchableOpacity
                style={[styles.subTab, activeSubTab === 'participants' && styles.subTabActive]}
                onPress={() => setActiveSubTab('participants')}
              >
                <Text style={[styles.subTabText, activeSubTab === 'participants' && styles.subTabTextActive]}>
                  Participantes
                </Text>
              </TouchableOpacity>
              {(event.format === 'groups_finals' || event.format === 'round_robin') && (
                <TouchableOpacity
                  style={[styles.subTab, activeSubTab === 'pairs' && styles.subTabActive]}
                  onPress={() => setActiveSubTab('pairs')}
                >
                  <Text style={[styles.subTabText, activeSubTab === 'pairs' && styles.subTabTextActive]}>
                    Duplas
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <ScrollView
              style={styles.participantsContent}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
            >
              <View style={styles.participantsHeader}>
                <Text style={styles.sectionTitle}>
                  {activeSubTab === 'participants' ? (
                    (() => {
                      const individualCount = participants.filter(p => !p.player2_id).length;
                      if (event && event.format === 'rotating') {
                        return individualCount === 8 ? 'Participantes' : `Participantes (${individualCount}/8)`;
                      }
                      return individualCount === 0 ? 'Participantes' : `Participantes (${individualCount})`;
                    })()
                  ) : (
                    (() => {
                      const pairsCount = participants.filter(p => p.player2_id !== null && p.player2_id !== undefined).length;
                      return pairsCount === 8 ? 'Duplas' : `Duplas (${pairsCount}/8)`;
                    })()
                  )}
                </Text>
                {/* Esconder botões de adicionar/editar quando os jogos já foram gerados ou quando o número ideal foi atingido */}
                {matches.length === 0 && !hasIdealParticipants() && activeSubTab === 'participants' && (
                  <View style={styles.buttonRow}>
                    <TouchableOpacity
                      style={[styles.button, styles.buttonSecondary]}
                      onPress={() => setShowQuickAddModal(true)}
                    >
                      <Text style={styles.buttonTextSecondary}>Entrada Rápida</Text>
                    </TouchableOpacity>
                    {(event.format === 'groups_finals' || event.format === 'round_robin') && (
                      <TouchableOpacity
                        style={[
                          styles.button, 
                          styles.buttonSecondary,
                          event.format === 'round_robin' && getIndividualParticipants().length === 0 && styles.buttonDisabled
                        ]}
                        onPress={() => setShowFormPairsModal(true)}
                        disabled={event.format === 'round_robin' && getIndividualParticipants().length === 0}
                      >
                        <Text style={styles.buttonTextSecondary}>Formar Duplas</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={styles.button}
                      onPress={() => setShowAddParticipantModal(true)}
                      disabled={participants.length >= getMaxParticipants()}
                    >
                      <Text style={styles.buttonText}>+ Adicionar</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {matches.length === 0 && !hasIdealParticipants() && activeSubTab === 'pairs' && (
                  <View style={styles.buttonRow}>
                    <TouchableOpacity
                      style={[
                        styles.button, 
                        styles.buttonSecondary,
                        event.format === 'round_robin' && getIndividualParticipants().length === 0 && styles.buttonDisabled
                      ]}
                      onPress={() => setShowFormPairsModal(true)}
                      disabled={event.format === 'round_robin' && getIndividualParticipants().length === 0}
                    >
                      <Text style={styles.buttonTextSecondary}>Formar Duplas</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {matches.length > 0 && (
                  <View style={styles.infoBox}>
                    <Text style={styles.infoText}>
                      Os jogos já foram gerados. Não é possível adicionar ou alterar participantes após os jogos serem gerados.
                    </Text>
                  </View>
                )}
                {matches.length === 0 && hasIdealParticipants() && (
                  <View>
                    <View style={styles.infoBox}>
                      <Text style={styles.infoText}>
                        {(() => {
                          // Formato individual: pode gerar jogos diretamente
                          if (event.format === 'rotating') {
                            return 'Número ideal de participantes atingido! Você pode gerar os jogos agora ou excluir participantes para adicionar outros.';
                          }
                          // Formatos de duplas: precisa formar duplas primeiro
                          if (event.format === 'round_robin' || event.format === 'groups_finals') {
                            const individualCount = getIndividualParticipants().length;
                            if (individualCount > 0) {
                              return 'Número ideal de participantes atingido! Agora é necessário formar as duplas antes de gerar os jogos.';
                            } else {
                              return 'Número ideal de participantes atingido! Você pode gerar os jogos agora ou excluir participantes para adicionar outros.';
                            }
                          }
                          return 'Número ideal de participantes atingido! Você pode gerar os jogos agora ou excluir participantes para adicionar outros.';
                        })()}
                      </Text>
                    </View>
                    {/* Mostrar botão Formar Duplas mesmo quando ideal foi atingido, se houver participantes individuais */}
                    {activeSubTab === 'participants' && (event.format === 'groups_finals' || event.format === 'round_robin') && getIndividualParticipants().length > 0 && (
                      <View style={styles.buttonRow}>
                        <TouchableOpacity
                          style={[
                            styles.button, 
                            styles.buttonSecondary,
                            event.format === 'round_robin' && getIndividualParticipants().length === 0 && styles.buttonDisabled
                          ]}
                          onPress={() => setShowFormPairsModal(true)}
                          disabled={event.format === 'round_robin' && getIndividualParticipants().length === 0}
                        >
                          <Text style={styles.buttonTextSecondary}>Formar Duplas</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                    {activeSubTab === 'pairs' && (event.format === 'groups_finals' || event.format === 'round_robin') && getIndividualParticipants().length > 0 && (
                      <View style={styles.buttonRow}>
                        <TouchableOpacity
                          style={[
                            styles.button, 
                            styles.buttonSecondary,
                            event.format === 'round_robin' && getIndividualParticipants().length === 0 && styles.buttonDisabled
                          ]}
                          onPress={() => setShowFormPairsModal(true)}
                          disabled={event.format === 'round_robin' && getIndividualParticipants().length === 0}
                        >
                          <Text style={styles.buttonTextSecondary}>Formar Duplas</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}
              </View>

              {activeSubTab === 'participants' && (() => {
                // Mostrar apenas participantes individuais (sem duplas)
                const individualParticipants = participants.filter(p => !p.player2_id);
                
                return individualParticipants.length === 0 ? (
                  <Text style={styles.emptyText}>
                    {event?.format === 'rotating' 
                      ? 'Adicione 8 jogadores individuais para começar.'
                      : 'Nenhum participante individual adicionado ainda.'}
                  </Text>
                ) : (
                  <View style={styles.participantsList}>
                    {individualParticipants.map((participant) => (
                      <View key={participant.id} style={styles.participantCard}>
                        <View style={styles.participantInfo}>
                          <Text style={styles.participantName}>
                            {participant.player1?.name || 'Jogador desconhecido'}
                          </Text>
                          {participant.team_name && (
                            <Text style={styles.teamName}>{participant.team_name}</Text>
                          )}
                        </View>
                        <View style={styles.participantActions}>
                          {matches.length === 0 && (
                            <TouchableOpacity
                              style={styles.removeButton}
                              onPress={() => handleRemoveParticipant(participant.id)}
                            >
                              <Text style={styles.removeButtonText}>×</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                );
              })()}

              {activeSubTab === 'pairs' && (() => {
                // Mostrar apenas duplas formadas (com player2_id)
                const pairsParticipants = participants.filter(p => p.player2_id !== null && p.player2_id !== undefined);
                
                return pairsParticipants.length === 0 ? (
                  <Text style={styles.emptyText}>
                    Nenhuma dupla formada ainda. Forme duplas a partir dos participantes individuais.
                  </Text>
                ) : (
                  <View style={styles.participantsList}>
                    {pairsParticipants.map((participant) => (
                      <View key={participant.id} style={styles.participantCard}>
                        <View style={styles.participantInfo}>
                          <Text style={styles.participantName}>
                            {participant.player1?.name || 'Jogador desconhecido'} / {participant.player2?.name || 'Jogador desconhecido'}
                          </Text>
                          {participant.team_name && (
                            <Text style={styles.teamName}>{participant.team_name}</Text>
                          )}
                        </View>
                        <View style={styles.participantActions}>
                          {matches.length === 0 && (
                            <TouchableOpacity
                              style={styles.removeButton}
                              onPress={() => handleRemoveParticipant(participant.id)}
                            >
                              <Text style={styles.removeButtonText}>×</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    ))}
                  </View>
                );
              })()}

            {(() => {
              const maxParticipants = getMaxParticipants();
              const isRotating = event.format === 'rotating';
              const isDuplasFormat = event.format === 'groups_finals' || event.format === 'round_robin';
              
              // Contar duplas completas para formatos que precisam de duplas
              const completePairs = isDuplasFormat 
                ? participants.filter(p => p.player2_id !== null && p.player2_id !== undefined).length
                : 0;
              
              // Contar jogadores individuais
              const individualPlayers = participants.filter(p => !p.player2_id).length;
              
              // Mostrar botão de gerar jogos se as condições forem atendidas e não houver jogos
              if (matches.length === 0 && canGenerateMatches(participants)) {
                return (
                  <View style={styles.generateMatchesContainer}>
                    <Text style={styles.hintText}>
                      Você tem o número ideal de participantes! Clique no botão abaixo para gerar os jogos.
                    </Text>
                    <TouchableOpacity
                      style={styles.button}
                      onPress={handleGenerateMatches}
                      disabled={loading}
                    >
                      {loading ? (
                        <ActivityIndicator color="#0f3460" />
                      ) : (
                        <Text style={styles.buttonText}>🎮 Gerar Jogos</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                );
              }

              // Só exibir mensagens de dica se os jogos ainda não foram gerados
              if (matches.length === 0) {
                // Mensagens para subTab Participantes
                if (activeSubTab === 'participants') {
                  if (isRotating && individualPlayers < 8) {
                    return (
                      <Text style={styles.hintText}>
                        Adicione {8 - individualPlayers} jogador(es) individual(is) para poder gerar os jogos.
                      </Text>
                    );
                  }
                  
                  if (isDuplasFormat && individualPlayers < 16) {
                    const needed = 16 - individualPlayers;
                    
                    // Se já tem participantes individuais suficientes para formar duplas (2 ou mais),
                    // mostrar mensagem incentivando a formar duplas
                    if (individualPlayers >= 2) {
                      const pairsCanForm = Math.floor(individualPlayers / 2);
                      return (
                        <Text style={styles.hintText}>
                          Você tem {individualPlayers} jogador(es) individual(is) disponível(eis) para formar {pairsCanForm} dupla(s). Forme as duplas ou adicione mais {needed} jogador(es) para atingir o ideal de 16.
                        </Text>
                      );
                    } else {
                      // Não tem participantes individuais suficientes para formar duplas
                      return (
                        <Text style={styles.hintText}>
                          Adicione {needed} jogador(es) individual(is) para poder formar duplas.
                        </Text>
                      );
                    }
                  }
                }
                
                // Mensagens para subTab Duplas
                if (activeSubTab === 'pairs' && isDuplasFormat) {
                  const neededPairs = 8 - completePairs;
                  const individualCount = participants.filter(p => !p.player2_id).length;
                  if (completePairs < 8) {
                    if (individualCount >= 2) {
                      return (
                        <Text style={styles.hintText}>
                          Forme {neededPairs} dupla(s) para poder gerar os jogos. Você tem {individualCount} jogador(es) individual(is) disponível(eis).
                        </Text>
                      );
                    } else {
                      const totalNeeded = (neededPairs * 2) - individualCount;
                      return (
                        <Text style={styles.hintText}>
                          Adicione {totalNeeded} jogador(es) na aba Participantes e forme {neededPairs} dupla(s) para poder gerar os jogos.
                        </Text>
                      );
                    }
                  }
                }
              }
              
              return null;
            })()}
            </ScrollView>
          </View>
        )}

        {activeTab === 'settings' && (
          <ScrollView style={styles.settingsContainer}>
            <Text style={styles.sectionTitle}>Configurações</Text>
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Formato:</Text>
              <Text style={styles.settingValue}>
                {event.format === 'groups_finals' && 'Grupos + Finais'}
                {event.format === 'round_robin' && 'Pontos Corridos'}
                {event.format === 'rotating' && 'Super 8 Rotativo'}
              </Text>
            </View>
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Quadras:</Text>
              <Text style={styles.settingValue}>{event.num_courts}</Text>
            </View>
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Sets por jogo:</Text>
              <Text style={styles.settingValue}>{event.num_sets ?? 1}</Text>
            </View>
            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Pontos por vitória:</Text>
              <Text style={styles.settingValue}>{event.points_per_win}</Text>
            </View>

            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Regras de placar:</Text>
              <Text style={styles.settingValue}>
                {event.score_ruleset_id 
                  ? SCORE_RULESETS[event.score_ruleset_id as ScoreRulesetId]?.name || 'Não definido'
                  : SCORE_RULESETS[DEFAULT_SCORE_RULESET].name}
              </Text>
              {event.score_ruleset_id && (
                <Text style={styles.settingDescription}>
                  {SCORE_RULESETS[event.score_ruleset_id as ScoreRulesetId]?.description}
                </Text>
              )}
            </View>

            <View style={styles.settingItem}>
              <Text style={styles.settingLabel}>Critérios de desempate:</Text>
              <Text style={styles.settingValue}>
                {DEFAULT_TIEBREAK_CRITERIA.map((c, i) => 
                  `${i + 1}º ${c === 'wins' ? 'Vitórias' : c === 'game_difference' ? 'Saldo de Games' : c === 'games_for' ? 'Games Pró' : 'Confronto Direto'}`
                ).join(', ')}
              </Text>
            </View>

            <View style={styles.settingAction}>
              <Text style={styles.settingActionLabel}>
                Excluir Evento
              </Text>
              <Text style={[styles.settingActionLabel, { fontSize: 12, marginBottom: 12 }]}>
                Esta ação não pode ser desfeita. Todos os dados do evento serão permanentemente removidos.
              </Text>
              <TouchableOpacity
                style={[styles.button, styles.buttonDanger, loading && styles.buttonDisabled]}
                onPress={handleDeleteEvent}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.buttonText}>🗑️ Excluir Evento</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
      </View>

      {/* Modal: Adicionar Participante */}
      <Modal
        visible={showAddParticipantModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddParticipantModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Adicionar Participante</Text>
            <TextInput
              style={[styles.input, newPlayerNameError ? styles.inputError : undefined]}
              placeholder="Nome do jogador"
              value={newPlayerName}
              onChangeText={handleNewPlayerNameChange}
              autoFocus
              maxLength={50}
            />
            {newPlayerNameError && (
              <Text style={styles.errorText}>{newPlayerNameError}</Text>
            )}
            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={() => {
                  setShowAddParticipantModal(false);
                  setNewPlayerName('');
                  setNewPlayerNameError(undefined);
                }}
                disabled={loading}
              >
                <Text style={styles.buttonTextSecondary}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.button,
                  (loading || !newPlayerName.trim() || !!newPlayerNameError) ? styles.buttonDisabled : undefined
                ]}
                onPress={handleAddParticipant}
                disabled={loading || !newPlayerName.trim() || !!newPlayerNameError}
              >
                {loading ? (
                  <ActivityIndicator color="#0f3460" />
                ) : (
                  <Text style={styles.buttonText}>Adicionar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Entrada Rápida */}
      <Modal
        visible={showQuickAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowQuickAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Entrada Rápida</Text>
            <Text style={styles.modalHint}>
              Cole uma lista de nomes (um por linha ou separados por vírgula)
            </Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="João Silva&#10;Maria Santos&#10;Pedro Costa"
              value={quickAddText}
              onChangeText={setQuickAddText}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={() => {
                  setShowQuickAddModal(false);
                  setQuickAddText('');
                }}
              >
                <Text style={styles.buttonTextSecondary}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.button}
                onPress={handleQuickAdd}
                disabled={loading || !quickAddText.trim()}
              >
                <Text style={styles.buttonText}>
                  {loading ? 'Adicionando...' : 'Adicionar Todos'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Formar Duplas */}
      <Modal
        visible={showFormPairsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowFormPairsModal(false);
          setSelectedPlayersForPair([]);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Formar Duplas</Text>
            <Text style={styles.modalHint}>
              Selecione 2 jogadores individuais para formar uma dupla manualmente, ou use a opção automática
            </Text>
            
            {getIndividualParticipants().length >= 2 && (
              <TouchableOpacity
                style={[
                  {
                    backgroundColor: '#16213e',
                    borderWidth: 1,
                    borderColor: '#00d4ff',
                    padding: 12,
                    borderRadius: 8,
                    alignItems: 'center',
                    marginBottom: 16,
                    width: '100%',
                  },
                  loading && styles.buttonDisabled
                ]}
                onPress={handleAutoFormPairs}
                disabled={loading}
              >
                <Text style={{
                  color: loading ? '#9ca3af' : '#00d4ff',
                  fontSize: 16,
                  fontWeight: '600',
                  textAlign: 'center'
                }}>
                  {loading ? 'Formando...' : '✨ Formar Duplas Automaticamente'}
                </Text>
              </TouchableOpacity>
            )}
            
            {getIndividualParticipants().length < 2 ? (
              <Text style={styles.emptyText}>
                É necessário ter pelo menos 2 jogadores individuais para formar uma dupla.
              </Text>
            ) : (
              <>
                <Text style={[styles.modalHint, { marginTop: 8, marginBottom: 12 }]}>
                  Ou selecione manualmente:
                </Text>
                <ScrollView style={styles.pairsList} nestedScrollEnabled>
                  {getIndividualParticipants().map((participant) => (
                    <TouchableOpacity
                      key={participant.id}
                      style={[
                        styles.pairItem,
                        selectedPlayersForPair.includes(participant.id) && styles.pairItemSelected
                      ]}
                      onPress={() => {
                        if (selectedPlayersForPair.includes(participant.id)) {
                          setSelectedPlayersForPair(
                            selectedPlayersForPair.filter(id => id !== participant.id)
                          );
                        } else if (selectedPlayersForPair.length < 2) {
                          setSelectedPlayersForPair([...selectedPlayersForPair, participant.id]);
                        } else {
                          Alert.alert('Aviso', 'Selecione no máximo 2 jogadores.');
                        }
                      }}
                    >
                      <Text style={styles.pairItemText}>
                        {participant.player1?.name || 'Jogador desconhecido'}
                      </Text>
                      {selectedPlayersForPair.includes(participant.id) && (
                        <Text style={styles.pairItemCheck}>✓</Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            {selectedPlayersForPair.length === 2 && (
              <Text style={styles.selectedPairText}>
                Dupla selecionada: {selectedPlayersForPair.map(id => {
                  const p = participants.find(part => part.id === id);
                  return p?.player1?.name;
                }).join(' / ')}
              </Text>
            )}

            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={[styles.button, styles.buttonSecondary]}
                onPress={() => {
                  setShowFormPairsModal(false);
                  setSelectedPlayersForPair([]);
                }}
                disabled={loading}
              >
                <Text style={styles.buttonTextSecondary}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.button,
                  (selectedPlayersForPair.length !== 2 || loading) && styles.buttonDisabled
                ]}
                onPress={handleFormPair}
                disabled={selectedPlayersForPair.length !== 2 || loading}
              >
                {loading ? (
                  <ActivityIndicator color="#0f3460" />
                ) : (
                  <Text style={[
                    styles.buttonText,
                    (selectedPlayersForPair.length !== 2 || loading) && styles.buttonTextDisabled
                  ]}>Formar Dupla</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Registrar Resultado */}
      <Modal
        visible={showResultModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowResultModal(false);
          setSelectedMatch(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {selectedMatch ? 'Registrar Resultado' : ''}
            </Text>
            
            {selectedMatch && (() => {
              const team1 = participants.find(p => p.id === selectedMatch.team1_id);
              const team2 = participants.find(p => p.id === selectedMatch.team2_id);
              const team1Name = team1 
                ? `${team1.player1?.name || ''}${team1.player2 ? ` / ${team1.player2.name}` : ''}`
                : 'Time 1';
              const team2Name = team2 
                ? `${team2.player1?.name || ''}${team2.player2 ? ` / ${team2.player2.name}` : ''}`
                : 'Time 2';
              
              return (
                <>
                  <View style={styles.resultMatchInfo}>
                    <Text style={styles.resultTeamName}>{team1Name}</Text>
                    <Text style={styles.resultVS}>vs</Text>
                    <Text style={styles.resultTeamName}>{team2Name}</Text>
                  </View>

                  {/* Toggle W.O. */}
                  <View style={styles.walkoverContainer}>
                    <TouchableOpacity
                      style={styles.checkboxContainer}
                      onPress={() => {
                        setIsWalkover(!isWalkover);
                        if (!isWalkover) {
                          setWalkoverWinner(null);
                          setWalkoverReason('');
                        }
                      }}
                    >
                      <View style={[styles.checkbox, isWalkover && styles.checkboxChecked]}>
                        {isWalkover && <Text style={styles.checkboxText}>✓</Text>}
                      </View>
                      <Text style={styles.checkboxLabel}>Marcar como W.O. (Walkover)</Text>
                    </TouchableOpacity>
                  </View>

                  {isWalkover ? (
                    <>
                      <Text style={styles.resultSetLabel}>Vencedor do W.O.</Text>
                      <View style={styles.walkoverWinnerContainer}>
                        <TouchableOpacity
                          style={[
                            styles.walkoverButton,
                            walkoverWinner === 'team1' && styles.walkoverButtonSelected,
                          ]}
                          onPress={() => setWalkoverWinner('team1')}
                        >
                          <Text
                            style={[
                              styles.walkoverButtonText,
                              walkoverWinner === 'team1' && styles.walkoverButtonTextSelected,
                            ]}
                          >
                            {team1Name}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.walkoverButton,
                            walkoverWinner === 'team2' && styles.walkoverButtonSelected,
                          ]}
                          onPress={() => setWalkoverWinner('team2')}
                        >
                          <Text
                            style={[
                              styles.walkoverButtonText,
                              walkoverWinner === 'team2' && styles.walkoverButtonTextSelected,
                            ]}
                          >
                            {team2Name}
                          </Text>
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.resultSetLabel}>Motivo (opcional)</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="Ex: ausência, lesão, desistência"
                        value={walkoverReason}
                        onChangeText={setWalkoverReason}
                      />
                    </>
                  ) : (
                    <>
                      <Text style={styles.resultSetLabel}>1º Set</Text>
                      <View style={styles.resultScoreContainer}>
                        <View style={styles.resultScoreColumn}>
                          <Text style={styles.resultTeamLabel}>{team1Name}</Text>
                          <TextInput
                            style={styles.scoreInput}
                            placeholder="0"
                            value={scoreTeam1Set1}
                            onChangeText={(text) => handleScoreInput(text, setScoreTeam1Set1)}
                            keyboardType="numeric"
                            editable={!isWalkover}
                          />
                        </View>
                        <Text style={styles.resultSeparator}>-</Text>
                        <View style={styles.resultScoreColumn}>
                          <Text style={styles.resultTeamLabel}>{team2Name}</Text>
                          <TextInput
                            style={styles.scoreInput}
                            placeholder="0"
                            value={scoreTeam2Set1}
                            onChangeText={(text) => handleScoreInput(text, setScoreTeam2Set1)}
                            keyboardType="numeric"
                            editable={!isWalkover}
                          />
                        </View>
                      </View>

                      {event.num_sets === 2 && (
                        <>
                          <Text style={styles.resultSetLabel}>2º Set</Text>
                          <View style={styles.resultScoreContainer}>
                            <View style={styles.resultScoreColumn}>
                              <Text style={styles.resultTeamLabel}>{team1Name}</Text>
                              <TextInput
                                style={styles.scoreInput}
                                placeholder="0"
                                value={scoreTeam1Set2}
                                onChangeText={(text) => handleScoreInput(text, setScoreTeam1Set2)}
                                keyboardType="numeric"
                                editable={!isWalkover}
                              />
                            </View>
                            <Text style={styles.resultSeparator}>-</Text>
                            <View style={styles.resultScoreColumn}>
                              <Text style={styles.resultTeamLabel}>{team2Name}</Text>
                              <TextInput
                                style={styles.scoreInput}
                                placeholder="0"
                                value={scoreTeam2Set2}
                                onChangeText={(text) => handleScoreInput(text, setScoreTeam2Set2)}
                                keyboardType="numeric"
                                editable={!isWalkover}
                              />
                            </View>
                          </View>

                          {/* Decider (3º Set) - aparece quando há empate 1x1 ou pode ser preenchido */}
                          {(() => {
                            const s1t1 = scoreTeam1Set1 ? parseInt(scoreTeam1Set1, 10) : 0;
                            const s1t2 = scoreTeam2Set1 ? parseInt(scoreTeam2Set1, 10) : 0;
                            const s2t1 = scoreTeam1Set2 ? parseInt(scoreTeam1Set2, 10) : 0;
                            const s2t2 = scoreTeam2Set2 ? parseInt(scoreTeam2Set2, 10) : 0;
                            const set1Winner = s1t1 > s1t2 ? 'team1' : s1t2 > s1t1 ? 'team2' : null;
                            const set2Winner = s2t1 > s2t2 ? 'team1' : s2t2 > s2t1 ? 'team2' : null;
                            const requiresDecider = set1Winner && set2Winner && set1Winner !== set2Winner;

                            if (requiresDecider || scoreTeam1Set3 || scoreTeam2Set3) {
                              return (
                                <>
                                  <Text style={styles.resultSetLabel}>
                                    Desempate (Super tie-break)
                                  </Text>
                                  <View style={styles.resultScoreContainer}>
                                    <View style={styles.resultScoreColumn}>
                                      <Text style={styles.resultTeamLabel}>{team1Name}</Text>
                                      <TextInput
                                        style={styles.scoreInput}
                                        placeholder="0"
                                        value={scoreTeam1Set3}
                                        onChangeText={(text) => handleScoreInput(text, setScoreTeam1Set3)}
                                        keyboardType="numeric"
                                        editable={!isWalkover}
                                      />
                                    </View>
                                    <Text style={styles.resultSeparator}>-</Text>
                                    <View style={styles.resultScoreColumn}>
                                      <Text style={styles.resultTeamLabel}>{team2Name}</Text>
                                      <TextInput
                                        style={styles.scoreInput}
                                        placeholder="0"
                                        value={scoreTeam2Set3}
                                        onChangeText={(text) => handleScoreInput(text, setScoreTeam2Set3)}
                                        keyboardType="numeric"
                                        editable={!isWalkover}
                                      />
                                    </View>
                                  </View>
                                  {requiresDecider && (
                                    <Text style={styles.deciderHint}>
                                      Empate 1x1 em sets. O desempate é obrigatório.
                                    </Text>
                                  )}
                                </>
                              );
                            }
                            return null;
                          })()}
                        </>
                      )}
                    </>
                  )}

                  <View style={styles.modalButtonRow}>
                    <TouchableOpacity
                      style={[styles.button, styles.buttonSecondary]}
                      onPress={() => {
                        setShowResultModal(false);
                        setSelectedMatch(null);
                      }}
                    >
                      <Text style={styles.buttonTextSecondary}>Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.button}
                      onPress={handleSaveResult}
                      disabled={loading}
                    >
                      <Text style={styles.buttonText}>
                        {loading ? 'Salvando...' : 'Salvar'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#16213e',
    backgroundColor: '#0f3460',
  },
  backButton: {
    fontSize: 16,
    color: '#00d4ff',
    marginBottom: 12,
  },
  eventName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#ffffff',
  },
  eventDate: {
    fontSize: 16,
    color: '#a0d2ff',
    marginBottom: 4,
  },
  eventLocation: {
    fontSize: 14,
    color: '#a0d2ff',
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#16213e',
    backgroundColor: '#0f3460',
  },
  tab: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#00d4ff',
  },
  tabText: {
    fontSize: 14,
    color: '#a0d2ff',
  },
  tabTextActive: {
    color: '#00d4ff',
    fontWeight: '600',
  },
  subTabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#16213e',
    backgroundColor: '#16213e',
  },
  subTab: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
  },
  subTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#00d4ff',
  },
  subTabText: {
    fontSize: 14,
    color: '#a0d2ff',
  },
  subTabTextActive: {
    color: '#00d4ff',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
    backgroundColor: '#1a1a2e',
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
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#16213e',
    backgroundColor: '#16213e',
    borderRadius: 8,
    marginBottom: 8,
  },
  settingLabel: {
    fontSize: 16,
    color: '#a0d2ff',
  },
  settingValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  settingDescription: {
    fontSize: 14,
    color: '#a0d2ff',
    marginTop: 4,
    fontStyle: 'italic',
  },
  settingsContainer: {
    flex: 1,
    padding: 16,
    backgroundColor: '#1a1a2e',
  },
  settingAction: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#16213e',
    borderRadius: 8,
  },
  settingActionLabel: {
    fontSize: 14,
    color: '#a0d2ff',
    marginBottom: 12,
    lineHeight: 20,
  },
  participantsContainer: {
    flex: 1,
  },
  participantsContent: {
    flex: 1,
    padding: 20,
    backgroundColor: '#1a1a2e',
  },
  participantsHeader: {
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  button: {
    flex: 1,
    backgroundColor: '#00d4ff',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#4a5568',
    opacity: 0.6,
  },
  buttonSecondary: {
    backgroundColor: '#16213e',
    borderWidth: 1,
    borderColor: '#00d4ff',
  },
  buttonDanger: {
    backgroundColor: '#ff6b6b',
  },
  buttonText: {
    color: '#0f3460',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextSecondary: {
    color: '#00d4ff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextDisabled: {
    color: '#9ca3af',
    fontSize: 16,
    fontWeight: '600',
  },
  participantsList: {
    gap: 12,
  },
  participantCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#16213e',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#00d4ff',
    marginBottom: 12,
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: '#ffffff',
  },
  teamName: {
    fontSize: 14,
    color: '#a0d2ff',
  },
  participantActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ff6b6b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    lineHeight: 24,
  },
  hintText: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#16213e',
    borderRadius: 8,
    color: '#00d4ff',
    fontSize: 14,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#00d4ff',
  },
  infoBox: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#16213e',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#00d4ff',
  },
  infoText: {
    color: '#a0d2ff',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#16213e',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 2,
    borderColor: '#00d4ff',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#ffffff',
  },
  modalHint: {
    fontSize: 14,
    color: '#a0d2ff',
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    color: '#a0d2ff',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#00d4ff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#1a1a2e',
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
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  modalButtonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  agendaContainer: {
    flex: 1,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#16213e',
    borderWidth: 1,
    borderColor: '#00d4ff',
  },
  filterButtonActive: {
    backgroundColor: '#00d4ff',
    borderColor: '#00d4ff',
  },
  filterText: {
    fontSize: 14,
    color: '#a0d2ff',
  },
  filterTextActive: {
    color: '#0f3460',
    fontWeight: '600',
  },
  roundSection: {
    marginBottom: 24,
  },
  roundTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#ffffff',
  },
  matchCard: {
    backgroundColor: '#16213e',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#00d4ff',
  },
  matchCardFinished: {
    backgroundColor: '#2d5016',
    borderColor: '#4ade80',
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  matchHeaderLeft: {
    flex: 1,
  },
  matchCourt: {
    fontSize: 12,
    color: '#a0d2ff',
    fontWeight: '600',
  },
  matchStatus: {
    fontSize: 12,
    color: '#a0d2ff',
    fontWeight: '600',
  },
  matchStatusFinished: {
    color: '#4ade80',
  },
  matchTeams: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  matchTeam: {
    flex: 1,
  },
  matchTeamName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: '#ffffff',
  },
  matchScore: {
    fontSize: 14,
    color: '#a0d2ff',
  },
  matchVS: {
    fontSize: 14,
    color: '#00d4ff',
    fontWeight: '600',
  },
  resultMatchInfo: {
    alignItems: 'center',
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#00d4ff',
  },
  resultTeamName: {
    fontSize: 16,
    fontWeight: '600',
    marginVertical: 4,
    color: '#ffffff',
  },
  resultVS: {
    fontSize: 14,
    color: '#00d4ff',
    marginVertical: 4,
  },
  resultSetLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
    color: '#ffffff',
  },
  resultScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 8,
  },
  resultScoreContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 8,
  },
  resultScoreColumn: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  resultTeamLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00d4ff',
    textAlign: 'center',
    marginBottom: 4,
  },
  scoreInput: {
    borderWidth: 1,
    borderColor: '#00d4ff',
    borderRadius: 8,
    padding: 12,
    fontSize: 24,
    fontWeight: 'bold',
    width: 80,
    textAlign: 'center',
    backgroundColor: '#1a1a2e',
    color: '#ffffff',
  },
  resultSeparator: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#00d4ff',
    marginTop: 24,
  },
  walkoverContainer: {
    marginVertical: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#16213e',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#00d4ff',
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a2e',
  },
  checkboxChecked: {
    backgroundColor: '#00d4ff',
  },
  checkboxText: {
    color: '#0f3460',
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#ffffff',
  },
  walkoverWinnerContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  walkoverButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#16213e',
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
  },
  walkoverButtonSelected: {
    borderColor: '#00d4ff',
    backgroundColor: '#0f3460',
  },
  walkoverButtonText: {
    fontSize: 14,
    color: '#a0d2ff',
    fontWeight: '600',
  },
  walkoverButtonTextSelected: {
    color: '#00d4ff',
    fontWeight: 'bold',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#16213e',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#1a1a2e',
    color: '#ffffff',
    marginBottom: 16,
  },
  deciderHint: {
    fontSize: 12,
    color: '#00d4ff',
    fontStyle: 'italic',
    marginTop: -8,
    marginBottom: 8,
    textAlign: 'center',
  },
  rankingContainer: {
    flex: 1,
  },
  rankingTable: {
    backgroundColor: '#16213e',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#00d4ff',
  },
  rankingHeader: {
    flexDirection: 'row',
    backgroundColor: '#0f3460',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#00d4ff',
  },
  rankingHeaderCell: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
    textTransform: 'uppercase',
  },
  rankingRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a2e',
  },
  rankingRowTop3: {
    backgroundColor: '#0f3460',
  },
  rankingCell: {
    fontSize: 14,
    color: '#ffffff',
  },
  rankingPosition: {
    width: 40,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  rankingName: {
    flex: 1,
    marginLeft: 8,
  },
  rankingStat: {
    width: 50,
    textAlign: 'center',
  },
  rankingLegend: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#16213e',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#00d4ff',
  },
  legendText: {
    fontSize: 12,
    color: '#a0d2ff',
    textAlign: 'center',
  },
  legendLabel: {
    fontWeight: '600',
    color: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    color: '#a0d2ff',
    fontSize: 14,
  },
  emptyAgendaContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  generateMatchesContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  pairsList: {
    maxHeight: 300,
    marginVertical: 16,
  },
  pairItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginBottom: 8,
    backgroundColor: '#16213e',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#a0d2ff',
  },
  pairItemSelected: {
    borderColor: '#00d4ff',
    backgroundColor: '#0f3460',
  },
  pairItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
  },
  checkmark: {
    fontSize: 20,
    color: '#00d4ff',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  pairItemCheck: {
    fontSize: 20,
    color: '#00d4ff',
    fontWeight: 'bold',
  },
  selectedPairText: {
    fontSize: 14,
    color: '#00d4ff',
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
});
