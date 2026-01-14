import { EventParticipant, Match } from '../types';

/**
 * Gera todos os confrontos do round-robin completo
 */
export function generateRoundRobinMatches(
  participants: EventParticipant[],
  eventId: number
): Match[] {
  const matches: Match[] = [];
  
  for (let i = 0; i < participants.length; i++) {
    for (let j = i + 1; j < participants.length; j++) {
      matches.push({
        id: 0,
        event_id: eventId,
        round: 0, // Será atribuído depois
        team1_id: participants[i].id,
        team2_id: participants[j].id,
        status: 'pending',
        created_at: Date.now(),
        updated_at: Date.now(),
      });
    }
  }
  
  return matches; // 28 jogos para 8 duplas
}

/**
 * Organiza round-robin em rodadas usando método de rotação circular
 */
export function scheduleRoundRobin(
  participants: EventParticipant[],
  numCourts: number
): Match[][] {
  const n = participants.length; // 8
  const rounds: Match[][] = [];
  
  // Rotação circular (método clássico)
  const fixed = participants[0];
  const rotating = participants.slice(1);
  
  for (let round = 0; round < n - 1; round++) {
    const roundMatches: Match[] = [];
    
    // Jogo fixo: fixed vs rotating[0]
    roundMatches.push({
      id: 0,
      event_id: 0, // Será atribuído depois
      round: round + 1,
      team1_id: fixed.id,
      team2_id: rotating[0].id,
      status: 'pending',
      created_at: Date.now(),
      updated_at: Date.now(),
    });
    
    // Restante: rotating[1] vs rotating[n-2], rotating[2] vs rotating[n-3], ...
    for (let i = 1; i < n / 2; i++) {
      roundMatches.push({
        id: 0,
        event_id: 0,
        round: round + 1,
        team1_id: rotating[i].id,
        team2_id: rotating[n - 1 - i].id,
        status: 'pending',
        created_at: Date.now(),
        updated_at: Date.now(),
      });
    }
    
    // Rotacionar array (exceto o primeiro elemento)
    rotating.unshift(rotating.pop()!);
    
    // Distribuir roundMatches em sub-rodadas baseado em numCourts
    const subRounds = distributeToCourts(roundMatches, numCourts);
    rounds.push(...subRounds);
  }
  
  return rounds;
}

function distributeToCourts(matches: Match[], numCourts: number): Match[][] {
  const subRounds: Match[][] = [];
  
  for (let i = 0; i < matches.length; i += numCourts) {
    const subRound = matches.slice(i, i + numCourts).map((match, idx) => ({
      ...match,
      court: idx + 1,
    }));
    subRounds.push(subRound);
  }
  
  return subRounds;
}
