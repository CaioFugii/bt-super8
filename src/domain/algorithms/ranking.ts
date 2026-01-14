import { EventParticipant, Match, RankingEntry } from '../types';

export type TiebreakCriterion = 'wins' | 'game_difference' | 'games_for' | 'head_to_head';

// Critério de desempate fixo e único para todos os eventos
export const DEFAULT_TIEBREAK_CRITERIA: TiebreakCriterion[] = ['wins', 'game_difference', 'games_for', 'head_to_head'];

/**
 * Calcula ranking baseado em partidas finalizadas
 */
export function calculateRanking(
  participants: EventParticipant[],
  matches: Match[],
  criteria: TiebreakCriterion[] = DEFAULT_TIEBREAK_CRITERIA,
  pointsPerWin: number = 1
): RankingEntry[] {
  const stats = participants.map((p) => ({
    participant: p,
    wins: 0,
    losses: 0,
    points: 0,
    gamesFor: 0,
    gamesAgainst: 0,
    gameDifference: 0,
    headToHead: new Map<number, number>(),
  }));
  
  // Processar partidas finalizadas
  for (const match of matches.filter((m) => m.status === 'finished')) {
    const team1Stats = stats.find((s) => s.participant.id === match.team1_id);
    const team2Stats = stats.find((s) => s.participant.id === match.team2_id);
    
    if (!team1Stats || !team2Stats) continue;
    
    // Calcular games
    const team1Games = calculateTotalGames(match, 'team1');
    const team2Games = calculateTotalGames(match, 'team2');
    
    team1Stats.gamesFor += team1Games;
    team1Stats.gamesAgainst += team2Games;
    team2Stats.gamesFor += team2Games;
    team2Stats.gamesAgainst += team1Games;
    
    // Vitória/derrota
    if (match.winner_id === match.team1_id) {
      team1Stats.wins++;
      team1Stats.points += pointsPerWin;
      team2Stats.losses++;
      team1Stats.headToHead.set(
        match.team2_id,
        (team1Stats.headToHead.get(match.team2_id) || 0) + 1
      );
    } else if (match.winner_id === match.team2_id) {
      team2Stats.wins++;
      team2Stats.points += pointsPerWin;
      team1Stats.losses++;
      team2Stats.headToHead.set(
        match.team1_id,
        (team2Stats.headToHead.get(match.team1_id) || 0) + 1
      );
    }
  }
  
  stats.forEach((s) => {
    s.gameDifference = s.gamesFor - s.gamesAgainst;
  });
  
  // Ordenar por critérios numéricos primeiro (sem confronto direto)
  stats.sort((a, b) => {
    // Primeiro critério: pontos (sempre)
    if (b.points !== a.points) {
      return b.points - a.points;
    }
    
    // Depois, aplicar os critérios numéricos de desempate
    for (const criterion of criteria) {
      if (criterion === 'head_to_head') continue; // Pular confronto direto por enquanto
      
      let diff = 0;
      
      switch (criterion) {
        case 'wins':
          diff = b.wins - a.wins;
          break;
        case 'game_difference':
          diff = b.gameDifference - a.gameDifference;
          break;
        case 'games_for':
          diff = b.gamesFor - a.gamesFor;
          break;
      }
      
      if (diff !== 0) return diff;
    }
    
    return 0;
  });

  // Detectar blocos de empate e aplicar confronto direto apenas para empates de 2
  if (criteria.includes('head_to_head')) {
    let i = 0;
    while (i < stats.length) {
      // Encontrar o início do bloco de empate
      const blockStart = i;
      let blockEnd = i;
      
      // Expandir o bloco enquanto os participantes empatam em todos os critérios numéricos
      while (blockEnd + 1 < stats.length) {
        const current = stats[blockEnd];
        const next = stats[blockEnd + 1];
        
        // Verificar se ainda estão empatados em todos os critérios numéricos
        const stillTied = 
          current.points === next.points &&
          current.wins === next.wins &&
          current.gameDifference === next.gameDifference &&
          current.gamesFor === next.gamesFor;
        
        if (!stillTied) break;
        blockEnd++;
      }
      
      const blockSize = blockEnd - blockStart + 1;
      
      // Aplicar confronto direto apenas se o bloco tiver exatamente 2 participantes
      if (blockSize === 2 && criteria.includes('head_to_head')) {
        const a = stats[blockStart];
        const b = stats[blockStart + 1];
        
        // Verificar confronto direto
        const aWins = a.headToHead.get(b.participant.id) || 0;
        const bWins = b.headToHead.get(a.participant.id) || 0;
        
        if (aWins > bWins) {
          // A vence confronto direto, manter ordem
          // (já está na ordem correta)
        } else if (bWins > aWins) {
          // B vence confronto direto, trocar ordem
          [stats[blockStart], stats[blockStart + 1]] = [stats[blockStart + 1], stats[blockStart]];
        }
        // Se não houver confronto direto (0-0), manter ordem estável
      }
      // Se blockSize >= 3, ignorar confronto direto e manter ordem estável
      
      i = blockEnd + 1;
    }
  }
  
  // Adicionar posição
  return stats.map((s, idx) => ({
    position: idx + 1,
    participant: s.participant,
    wins: s.wins,
    losses: s.losses,
    points: s.points,
    gamesFor: s.gamesFor,
    gamesAgainst: s.gamesAgainst,
    gameDifference: s.gameDifference,
  }));
}

export function calculateIndividualRanking(
  participants: EventParticipant[],
  matches: Match[],
  criteria: TiebreakCriterion[] = DEFAULT_TIEBREAK_CRITERIA,
  pointsPerWin: number = 1
): RankingEntry[] {
  // Filtrar apenas participantes individuais (sem player2_id) para o ranking final
  const individualParticipants = participants.filter(p => !p.player2_id);
  
  // Criar mapa de participantId -> EventParticipant para encontrar duplas temporárias nos matches
  const participantMap = new Map<number, EventParticipant>();
  participants.forEach(p => {
    participantMap.set(p.id, p);
  });
  
  // Criar estatísticas por jogador individual (player1_id)
  const statsMap = new Map<number, {
    participant: EventParticipant;
    wins: number;
    losses: number;
    points: number;
    gamesFor: number;
    gamesAgainst: number;
    gameDifference: number;
    headToHead: Map<number, number>; // playerId -> vitórias contra
  }>();
  
  // Inicializar estatísticas para todos os jogadores individuais
  individualParticipants.forEach(p => {
    if (p.player1_id) {
      statsMap.set(p.player1_id, {
        participant: p,
        wins: 0,
        losses: 0,
        points: 0,
        gamesFor: 0,
        gamesAgainst: 0,
        gameDifference: 0,
        headToHead: new Map<number, number>(),
      });
    }
  });
  
  // Processar partidas finalizadas
  for (const match of matches.filter((m) => m.status === 'finished')) {
    // Encontrar as duplas/times nos participantes (podem ser duplas temporárias ou individuais)
    const team1Participant = participantMap.get(match.team1_id);
    const team2Participant = participantMap.get(match.team2_id);
    
    if (!team1Participant || !team2Participant) continue;
    
    // Obter os playerIds dos jogadores individuais de cada time
    // Se for dupla temporária (tem player2_id), usar ambos os jogadores
    // Se for participante individual, usar apenas player1_id
    const team1PlayerIds: number[] = [];
    const team2PlayerIds: number[] = [];
    
    if (team1Participant.player1_id) {
      team1PlayerIds.push(team1Participant.player1_id);
    }
    if (team1Participant.player2_id) {
      team1PlayerIds.push(team1Participant.player2_id);
    }
    
    if (team2Participant.player1_id) {
      team2PlayerIds.push(team2Participant.player1_id);
    }
    if (team2Participant.player2_id) {
      team2PlayerIds.push(team2Participant.player2_id);
    }
    
    // Calcular games
    const team1Games = calculateTotalGames(match, 'team1');
    const team2Games = calculateTotalGames(match, 'team2');
    
    // Atribuir games completos para cada jogador individual do time
    // No formato rotativo, cada jogador recebe os games completos do jogo em que participou
    // (não dividir, pois cada jogo conta individualmente para cada jogador)
    team1PlayerIds.forEach(playerId => {
      const stat = statsMap.get(playerId);
      if (stat) {
        stat.gamesFor += team1Games; // Games completos para cada jogador
        stat.gamesAgainst += team2Games;
      }
    });
    
    team2PlayerIds.forEach(playerId => {
      const stat = statsMap.get(playerId);
      if (stat) {
        stat.gamesFor += team2Games; // Games completos para cada jogador
        stat.gamesAgainst += team1Games;
      }
    });
    
    // Vitória/derrota - cada jogador individual recebe vitória/derrota completa
    // No formato rotativo, quando uma dupla ganha, cada jogador individual ganha 1 vitória
    if (match.winner_id === match.team1_id) {
      // Time 1 ganhou - todos os jogadores do time 1 ganham 1 vitória cada
      team1PlayerIds.forEach(playerId => {
        const stat = statsMap.get(playerId);
        if (stat) {
          stat.wins += 1; // Cada jogador ganha 1 vitória completa
          stat.points += pointsPerWin; // Cada jogador ganha pontos por vitória
          // Registrar vitórias contra cada jogador do time 2 (confronto direto)
          team2PlayerIds.forEach(opponentId => {
            stat.headToHead.set(opponentId, (stat.headToHead.get(opponentId) || 0) + 1);
          });
        }
      });
      // Todos os jogadores do time 2 perdem 1 derrota cada
      team2PlayerIds.forEach(playerId => {
        const stat = statsMap.get(playerId);
        if (stat) {
          stat.losses += 1; // Cada jogador perde 1 derrota completa
        }
      });
    } else if (match.winner_id === match.team2_id) {
      // Time 2 ganhou
      team2PlayerIds.forEach(playerId => {
        const stat = statsMap.get(playerId);
        if (stat) {
          stat.wins += 1; // Cada jogador ganha 1 vitória completa
          stat.points += pointsPerWin; // Cada jogador ganha pontos por vitória
          team1PlayerIds.forEach(opponentId => {
            stat.headToHead.set(opponentId, (stat.headToHead.get(opponentId) || 0) + 1);
          });
        }
      });
      team1PlayerIds.forEach(playerId => {
        const stat = statsMap.get(playerId);
        if (stat) {
          stat.losses += 1; // Cada jogador perde 1 derrota completa
        }
      });
    }
  }
  
  // Converter Map para array e calcular saldo final
  const stats = Array.from(statsMap.values()).map(s => ({
    ...s,
    gameDifference: s.gamesFor - s.gamesAgainst,
  }));
  
  // Ordenar por critérios numéricos primeiro (sem confronto direto)
  stats.sort((a, b) => {
    // Primeiro critério: pontos (sempre)
    if (b.points !== a.points) {
      return b.points - a.points;
    }
    
    // Depois, aplicar os critérios numéricos de desempate
    for (const criterion of criteria) {
      if (criterion === 'head_to_head') continue; // Pular confronto direto por enquanto
      
      let diff = 0;
      
      switch (criterion) {
        case 'wins':
          diff = b.wins - a.wins;
          break;
        case 'game_difference':
          diff = b.gameDifference - a.gameDifference;
          break;
        case 'games_for':
          diff = b.gamesFor - a.gamesFor;
          break;
      }
      
      if (Math.abs(diff) > 0.001) return diff > 0 ? 1 : -1;
    }
    
    return 0;
  });

  // Detectar blocos de empate e aplicar confronto direto apenas para empates de 2
  if (criteria.includes('head_to_head')) {
    let i = 0;
    while (i < stats.length) {
      // Encontrar o início do bloco de empate
      const blockStart = i;
      let blockEnd = i;
      
      // Expandir o bloco enquanto os participantes empatam em todos os critérios numéricos
      while (blockEnd + 1 < stats.length) {
        const current = stats[blockEnd];
        const next = stats[blockEnd + 1];
        
        // Verificar se ainda estão empatados em todos os critérios numéricos
        const stillTied = 
          Math.abs(current.points - next.points) < 0.001 &&
          current.wins === next.wins &&
          Math.abs(current.gameDifference - next.gameDifference) < 0.001 &&
          Math.abs(current.gamesFor - next.gamesFor) < 0.001;
        
        if (!stillTied) break;
        blockEnd++;
      }
      
      const blockSize = blockEnd - blockStart + 1;
      
      // Aplicar confronto direto apenas se o bloco tiver exatamente 2 participantes
      if (blockSize === 2 && criteria.includes('head_to_head')) {
        const a = stats[blockStart];
        const b = stats[blockStart + 1];
        
        // Verificar confronto direto (usar player1_id como identificador)
        const aPlayerId = a.participant.player1_id!;
        const bPlayerId = b.participant.player1_id!;
        const aWins = a.headToHead.get(bPlayerId) || 0;
        const bWins = b.headToHead.get(aPlayerId) || 0;
        
        if (aWins > bWins) {
          // A vence confronto direto, manter ordem
          // (já está na ordem correta)
        } else if (bWins > aWins) {
          // B vence confronto direto, trocar ordem
          [stats[blockStart], stats[blockStart + 1]] = [stats[blockStart + 1], stats[blockStart]];
        }
        // Se não houver confronto direto (0-0), manter ordem estável
      }
      // Se blockSize >= 3, ignorar confronto direto e manter ordem estável
      
      i = blockEnd + 1;
    }
  }
  
  // Adicionar posição e arredondar valores para inteiros
  return stats.map((s, idx) => ({
    position: idx + 1,
    participant: s.participant,
    wins: s.wins,
    losses: s.losses,
    points: s.points,
    gamesFor: Math.round(s.gamesFor),
    gamesAgainst: Math.round(s.gamesAgainst),
    gameDifference: Math.round(s.gameDifference),
  }));
}

function calculateTotalGames(match: Match, team: 'team1' | 'team2'): number {
  const prefix = team === 'team1' ? 'score_team1' : 'score_team2';
  let total = 0;
  
  if (match[`${prefix}_set1` as keyof Match]) {
    total += (match[`${prefix}_set1` as keyof Match] as number) || 0;
  }
  if (match[`${prefix}_set2` as keyof Match]) {
    total += (match[`${prefix}_set2` as keyof Match] as number) || 0;
  }
  if (match[`${prefix}_set3` as keyof Match]) {
    total += (match[`${prefix}_set3` as keyof Match] as number) || 0;
  }
  
  return total;
}
