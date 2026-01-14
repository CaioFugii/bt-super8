import { EventParticipant, Match } from '../types';

export interface Group {
  name: string;
  participants: EventParticipant[];
}

export interface ScheduledMatch extends Match {
  group?: string;
}

/**
 * Divide participantes em 2 grupos de 4
 */
export function divideIntoGroups(
  participants: EventParticipant[],
  seed: boolean = false
): [Group, Group] {
  // Por enquanto, divisão simples (pode ser melhorada com seeding)
  const shuffled = seed ? [...participants] : shuffleArray([...participants]);
  
  return [
    { name: 'Grupo A', participants: shuffled.slice(0, 4) },
    { name: 'Grupo B', participants: shuffled.slice(4, 8) },
  ];
}

/**
 * Gera todos os jogos da fase de grupos (round-robin dentro de cada grupo)
 */
export function generateGroupMatches(
  group: Group,
  eventId: number,
  startRound: number = 1
): ScheduledMatch[] {
  const matches: ScheduledMatch[] = [];
  const participants = group.participants;
  
  // Round-robin: cada dupla joga contra todas as outras
  for (let i = 0; i < participants.length; i++) {
    for (let j = i + 1; j < participants.length; j++) {
      matches.push({
        id: 0, // Será atribuído pelo banco
        event_id: eventId,
        round: 0, // Será atribuído depois
        team1_id: participants[i].id,
        team2_id: participants[j].id,
        status: 'pending',
        created_at: Date.now(),
        updated_at: Date.now(),
        group: group.name,
      });
    }
  }
  
  return matches;
}

/**
 * Organiza jogos em rodadas, respeitando número de quadras
 * Garante que uma dupla não jogue dois jogos simultaneamente
 */
export function organizeIntoRounds(
  matches: ScheduledMatch[],
  numCourts: number
): ScheduledMatch[][] {
  const rounds: ScheduledMatch[][] = [];
  let currentRound: ScheduledMatch[] = [];
  let roundNumber = 1;
  const usedTeams = new Set<number>(); // Duplas já agendadas na rodada atual
  
  for (const match of matches) {
    // Verificar se alguma das duplas já está jogando na rodada atual
    const team1Busy = usedTeams.has(match.team1_id);
    const team2Busy = usedTeams.has(match.team2_id);
    
    // Se a rodada está cheia OU uma das duplas já está jogando, criar nova rodada
    if (currentRound.length >= numCourts || team1Busy || team2Busy) {
      if (currentRound.length > 0) {
        rounds.push(currentRound);
      }
      currentRound = [];
      usedTeams.clear();
      roundNumber++;
    }
    
    // Adicionar jogo à rodada atual
    currentRound.push({
      ...match,
      round: roundNumber,
      court: currentRound.length + 1,
    });
    
    // Marcar duplas como ocupadas nesta rodada
    usedTeams.add(match.team1_id);
    usedTeams.add(match.team2_id);
  }
  
  // Adicionar última rodada se não estiver vazia
  if (currentRound.length > 0) {
    rounds.push(currentRound);
  }
  
  return rounds;
}

/**
 * Gera fase final (semifinais, final, 3º lugar)
 */
export function generateFinals(
  groupA: EventParticipant[],
  groupB: EventParticipant[],
  groupARanking: { participant: EventParticipant; wins: number }[],
  groupBRanking: { participant: EventParticipant; wins: number }[],
  eventId: number,
  startRound: number
): ScheduledMatch[] {
  // Ordenar por vitórias
  const sortedA = [...groupARanking].sort((a, b) => b.wins - a.wins);
  const sortedB = [...groupBRanking].sort((a, b) => b.wins - a.wins);
  
  const groupA1 = sortedA[0]?.participant;
  const groupA2 = sortedA[1]?.participant;
  const groupB1 = sortedB[0]?.participant;
  const groupB2 = sortedB[1]?.participant;
  
  if (!groupA1 || !groupA2 || !groupB1 || !groupB2) {
    return [];
  }
  
  const semifinals: ScheduledMatch[] = [
    {
      id: 0,
      event_id: eventId,
      round: startRound,
      team1_id: groupA1.id,
      team2_id: groupB2.id,
      status: 'pending',
      created_at: Date.now(),
      updated_at: Date.now(),
    },
    {
      id: 0,
      event_id: eventId,
      round: startRound,
      team1_id: groupB1.id,
      team2_id: groupA2.id,
      status: 'pending',
      created_at: Date.now(),
      updated_at: Date.now(),
    },
  ];
  
  return semifinals;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
