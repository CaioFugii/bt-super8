import { Event, EventParticipant, Match } from '@/domain/types';
import { divideIntoGroups, generateGroupMatches, organizeIntoRounds, generateFinals } from '@/domain/algorithms/groups-finals';
import { generateRoundRobinMatches, scheduleRoundRobin } from '@/domain/algorithms/round-robin';
import { generateRotatingRounds } from '@/domain/algorithms/rotating';
import { matchRepository } from '@/db/repositories/matchRepository';
import { eventParticipantRepository } from '@/db/repositories/eventParticipantRepository';

/**
 * Gera automaticamente os jogos de um evento baseado no formato
 */
export async function generateEventMatches(
  event: Event,
  participants: EventParticipant[]
): Promise<Match[]> {
  if (participants.length !== 8) {
    throw new Error('Event must have exactly 8 participants');
  }

  let matches: Match[] = [];

  switch (event.format) {
    case 'groups_finals': {
      // Dividir em grupos
      const [groupA, groupB] = divideIntoGroups(participants);
      
      // Gerar jogos da fase de grupos
      const groupAMatches = generateGroupMatches(groupA, event.id);
      const groupBMatches = generateGroupMatches(groupB, event.id);
      
      // Organizar em rodadas
      const allGroupMatches = [...groupAMatches, ...groupBMatches];
      const rounds = organizeIntoRounds(allGroupMatches, event.num_courts);
      
      // Flatten rounds
      matches = rounds.flat();
      
      // Nota: Fase final será gerada depois, quando os grupos terminarem
      break;
    }

    case 'round_robin': {
      // Gerar todos os confrontos
      const allMatches = generateRoundRobinMatches(participants, event.id);
      
      // Organizar em rodadas
      const rounds = scheduleRoundRobin(participants, event.num_courts);
      
      // Atualizar event_id e flatten
      matches = rounds.flat().map(m => ({
        ...m,
        event_id: event.id,
      }));
      
      break;
    }

    case 'rotating': {
      // Gerar rodadas rotativas
      const rounds = generateRotatingRounds(participants, event.id, event.num_courts);
      
      // Criar EventParticipant temporários para cada dupla única formada
      // e mapear os pares para os IDs dos EventParticipant criados
      const pairToParticipantId = new Map<string, number>();
      
      // Primeiro, coletar todas as duplas únicas de todas as rodadas
      const allUniquePairs = new Set<string>();
      for (const round of rounds) {
        for (const pair of round.pairs) {
          // Criar uma chave única para o par (ordem dos IDs para evitar duplicatas)
          const player1Id = pair[0].player1_id;
          const player2Id = pair[1].player1_id;
          const pairKey = `${Math.min(player1Id, player2Id)}-${Math.max(player1Id, player2Id)}`;
          allUniquePairs.add(pairKey);
        }
      }
      
      // Criar EventParticipant para cada dupla única
      for (const pairKey of allUniquePairs) {
        const [player1Id, player2Id] = pairKey.split('-').map(Number);
        const teamParticipant = await eventParticipantRepository.create({
          event_id: event.id,
          player1_id: player1Id,
          player2_id: player2Id,
          team_name: undefined,
        });
        pairToParticipantId.set(pairKey, teamParticipant.id);
      }
      
      // Atualizar matches com os IDs corretos das duplas
      for (const round of rounds) {
        for (let i = 0; i < round.pairs.length; i += 2) {
          if (i + 1 < round.pairs.length) {
            const pair1 = round.pairs[i];
            const pair2 = round.pairs[i + 1];
            
            // Obter IDs dos EventParticipant das duplas
            const player1Id1 = pair1[0].player1_id;
            const player2Id1 = pair1[1].player1_id;
            const pairKey1 = `${Math.min(player1Id1, player2Id1)}-${Math.max(player1Id1, player2Id1)}`;
            
            const player1Id2 = pair2[0].player1_id;
            const player2Id2 = pair2[1].player1_id;
            const pairKey2 = `${Math.min(player1Id2, player2Id2)}-${Math.max(player1Id2, player2Id2)}`;
            
            const team1Id = pairToParticipantId.get(pairKey1);
            const team2Id = pairToParticipantId.get(pairKey2);
            
            if (team1Id && team2Id) {
              round.matches[Math.floor(i / 2)].team1_id = team1Id;
              round.matches[Math.floor(i / 2)].team2_id = team2Id;
            }
          }
        }
      }
      
      // Flatten rounds
      matches = rounds.flatMap(round => round.matches);
      
      break;
    }
  }

  // Salvar no banco
  const createdMatches = await matchRepository.createBatch(matches);
  
  return createdMatches;
}
