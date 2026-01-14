import { EventParticipant, Match } from '../types';

export interface Round {
  round: number;
  matches: Match[];
  pairs: Array<[EventParticipant, EventParticipant]>; // Duplas formadas nesta rodada
}

/**
 * Gera rodadas rotativas para 8 jogadores
 * Segue as regras do formato Super 8 Rotativo:
 * - Número de rodadas configurável (default: 4)
 * - Minimiza repetição de parceiros e adversários
 * - Cada rodada: 4 duplas, 2 jogos simultâneos (em 2 quadras)
 */
export function generateRotatingRounds(
  participants: EventParticipant[],
  eventId: number,
  numCourts: number,
  numRounds: number = 4 // Default: 4 rodadas conforme regras
): Round[] {
  const n = participants.length; // 8
  const rounds: Round[] = [];
  
  // Criar mapa de ID do EventParticipant para índice (para acessar matrizes)
  const participantIdToIndex = new Map<number, number>();
  participants.forEach((p, idx) => {
    participantIdToIndex.set(p.id, idx);
  });
  
  // Matriz de parceiros: quantas vezes cada par já jogou junto
  // Usa índices baseados na posição no array de participantes
  const partnerMatrix: number[][] = Array(n)
    .fill(0)
    .map(() => Array(n).fill(0));
  
  // Matriz de adversários: quantas vezes cada par já jogou contra
  const opponentMatrix: number[][] = Array(n)
    .fill(0)
    .map(() => Array(n).fill(0));
  
  // Número de rodadas: configurável (default 4 conforme regras)
  const totalRounds = Math.min(numRounds, n - 1); // Máximo possível é n-1
  
  for (let roundNum = 1; roundNum <= totalRounds; roundNum++) {
    const round = generateRound(
      participants,
      roundNum,
      eventId,
      partnerMatrix,
      opponentMatrix,
      numCourts,
      participantIdToIndex
    );
    
    rounds.push(round);
    
    // Atualizar matrizes com os pares formados nesta rodada
    updateMatrices(round, partnerMatrix, opponentMatrix, participantIdToIndex);
  }
  
  return rounds;
}

function generateRound(
  participants: EventParticipant[],
  roundNum: number,
  eventId: number,
  partnerMatrix: number[][],
  opponentMatrix: number[][],
  numCourts: number,
  participantIdToIndex: Map<number, number>
): Round {
  const available = [...participants];
  const pairs: [EventParticipant, EventParticipant][] = [];
  
  // Greedy: escolher pares que minimizam repetição
  while (available.length >= 2) {
    let bestPair: [EventParticipant, EventParticipant] | null = null;
    let bestScore = Infinity;
    
    // Tentar todas as combinações possíveis dos disponíveis
    for (let i = 0; i < available.length; i++) {
      for (let j = i + 1; j < available.length; j++) {
        const p1 = available[i];
        const p2 = available[j];
        
        // Obter índices para acessar as matrizes
        const idx1 = participantIdToIndex.get(p1.id);
        const idx2 = participantIdToIndex.get(p2.id);
        
        if (idx1 === undefined || idx2 === undefined) continue;
        
        // Score: menor é melhor
        // Penalizar parceiros repetidos (peso alto)
        // Penalizar adversários repetidos (peso médio)
        const partnerCount = partnerMatrix[idx1][idx2] || 0;
        const opponentCount = opponentMatrix[idx1][idx2] || 0;
        
        const score = partnerCount * 10 + opponentCount * 2;
        
        if (score < bestScore) {
          bestScore = score;
          bestPair = [p1, p2];
        }
      }
    }
    
    if (bestPair) {
      pairs.push(bestPair);
      // Remover da lista de disponíveis
      const idx1 = available.indexOf(bestPair[0]);
      if (idx1 > -1) available.splice(idx1, 1);
      const idx2 = available.indexOf(bestPair[1]);
      if (idx2 > -1) available.splice(idx2, 1);
    }
  }
  
  // Gerar jogos: pares vs pares
  // Nota: Os matches serão criados depois, no eventGenerator,
  // após criar os EventParticipant temporários para as duplas
  const matches: Match[] = [];
  for (let i = 0; i < pairs.length; i += 2) {
    if (i + 1 < pairs.length) {
      // Placeholder - os IDs das duplas serão preenchidos no eventGenerator
      matches.push({
        id: 0,
        event_id: eventId,
        round: roundNum,
        court: Math.floor(i / 2) % numCourts + 1,
        team1_id: 0, // Será preenchido com o ID do EventParticipant da dupla
        team2_id: 0, // Será preenchido com o ID do EventParticipant da dupla
        status: 'pending',
        created_at: Date.now(),
        updated_at: Date.now(),
      });
    }
  }
  
  return { round: roundNum, matches, pairs };
}

function updateMatrices(
  round: Round,
  partnerMatrix: number[][],
  opponentMatrix: number[][],
  participantIdToIndex: Map<number, number>
): void {
  // Atualizar matrizes baseado nos pares formados nesta rodada
  // Cada par na lista 'pairs' representa uma dupla formada
  
  // Atualizar matriz de parceiros: incrementar contador para cada par de jogadores que jogaram juntos
  for (const pair of round.pairs) {
    const p1Idx = participantIdToIndex.get(pair[0].id);
    const p2Idx = participantIdToIndex.get(pair[1].id);
    
    if (p1Idx !== undefined && p2Idx !== undefined) {
      // Incrementar contador de parceiros (bidirecional)
      partnerMatrix[p1Idx][p2Idx]++;
      partnerMatrix[p2Idx][p1Idx]++;
    }
  }
  
  // Atualizar matriz de adversários: para cada jogo (par vs par), 
  // incrementar contador entre jogadores de duplas opostas
  for (let i = 0; i < round.pairs.length; i += 2) {
    if (i + 1 < round.pairs.length) {
      const pair1 = round.pairs[i];
      const pair2 = round.pairs[i + 1];
      
      // Jogadores da dupla 1 vs jogadores da dupla 2
      const p1Idx = participantIdToIndex.get(pair1[0].id);
      const p2Idx = participantIdToIndex.get(pair1[1].id);
      const p3Idx = participantIdToIndex.get(pair2[0].id);
      const p4Idx = participantIdToIndex.get(pair2[1].id);
      
      if (p1Idx !== undefined && p2Idx !== undefined && 
          p3Idx !== undefined && p4Idx !== undefined) {
        // Jogadores da dupla 1 enfrentaram jogadores da dupla 2
        opponentMatrix[p1Idx][p3Idx]++;
        opponentMatrix[p1Idx][p4Idx]++;
        opponentMatrix[p2Idx][p3Idx]++;
        opponentMatrix[p2Idx][p4Idx]++;
        
        // Bidirecional
        opponentMatrix[p3Idx][p1Idx]++;
        opponentMatrix[p3Idx][p2Idx]++;
        opponentMatrix[p4Idx][p1Idx]++;
        opponentMatrix[p4Idx][p2Idx]++;
      }
    }
  }
}

/**
 * Gera explicação textual da rotação
 */
export function explainRotation(rounds: Round[]): string {
  let explanation = 'Como foi gerada a rotação:\n\n';
  
  explanation += `Total de rodadas: ${rounds.length}\n`;
  if (rounds.length > 0) {
    explanation += `Jogos por rodada: ${rounds[0].matches.length}\n\n`;
  }
  
  explanation += 'Rodadas:\n';
  rounds.forEach((round) => {
    explanation += `\nRodada ${round.round}:\n`;
    round.matches.forEach((match, matchIdx) => {
      explanation += `  Jogo ${matchIdx + 1}: Dupla ${match.team1_id} vs Dupla ${match.team2_id}\n`;
    });
  });
  
  explanation += '\nHeurística aplicada:\n';
  explanation += '- Minimizar repetição de parceiros (prioridade alta)\n';
  explanation += '- Minimizar repetição de adversários (prioridade média)\n';
  explanation += '- Distribuir jogos entre quadras de forma equilibrada\n';
  
  return explanation;
}
