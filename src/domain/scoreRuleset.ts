// Score Ruleset - Definição e validação de regras de placar

export type ScoreRulesetId = 'fast_4' | 'normal_6' | 'super_tiebreak';

export interface ScoreRuleset {
  id: ScoreRulesetId;
  name: string;
  description: string;
  maxGames: number; // Máximo de games para vencer o set
  minDifference: number; // Diferença mínima necessária
  allowTiebreak: boolean; // Se permite tiebreak (não implementado no MVP)
}

// Definição dos rulesets disponíveis
export const SCORE_RULESETS: Record<ScoreRulesetId, ScoreRuleset> = {
  fast_4: {
    id: 'fast_4',
    name: 'Set Curto até 4',
    description: 'Set vence ao atingir 4 games, diferença mínima de 1',
    maxGames: 4,
    minDifference: 1,
    allowTiebreak: false,
  },
  normal_6: {
    id: 'normal_6',
    name: 'Set Normal até 6',
    description: 'Set vence com 6 games, diferença mínima de 2',
    maxGames: 6,
    minDifference: 2,
    allowTiebreak: false, // No MVP, sem tiebreak (permite 7-5 mas não 7-6)
  },
  super_tiebreak: {
    id: 'super_tiebreak',
    name: 'Super Tiebreak',
    description: 'Vence ao atingir 10 points, diferença mínima de 2',
    maxGames: 10,
    minDifference: 2,
    allowTiebreak: false,
  },
};

// Ruleset padrão para compatibilidade com dados existentes
export const DEFAULT_SCORE_RULESET: ScoreRulesetId = 'normal_6';

/**
 * Valida um placar de set conforme o ruleset
 */
export function validateSetScore(
  ruleset: ScoreRuleset,
  team1Score: number,
  team2Score: number
): { ok: boolean; reason?: string } {
  // Validações básicas
  if (team1Score < 0 || team2Score < 0) {
    return { ok: false, reason: 'Placares não podem ser negativos' };
  }

  if (!Number.isInteger(team1Score) || !Number.isInteger(team2Score)) {
    return { ok: false, reason: 'Placares devem ser números inteiros' };
  }

  const maxScore = Math.max(team1Score, team2Score);
  const minScore = Math.min(team1Score, team2Score);
  const difference = Math.abs(team1Score - team2Score);

  // Verificar se algum time atingiu o máximo necessário
  const winnerReachedMax = maxScore >= ruleset.maxGames;
  
  if (!winnerReachedMax) {
    return {
      ok: false,
      reason: `No ${ruleset.name}, é necessário atingir ${ruleset.maxGames} games para vencer o set`,
    };
  }

  // Verificar diferença mínima
  if (difference < ruleset.minDifference) {
    return {
      ok: false,
      reason: `No ${ruleset.name}, é necessária diferença mínima de ${ruleset.minDifference} games`,
    };
  }

  // Regras específicas por ruleset
  if (ruleset.id === 'fast_4') {
    // Fast 4: máximo 4 games
    if (maxScore > 4) {
      return {
        ok: false,
        reason: 'No Set curto até 4, o máximo permitido é 4 games',
      };
    }
    // 4-3 é permitido (diferença 1)
    if (maxScore === 4 && minScore === 3) {
      return { ok: true };
    }
    // Outros casos válidos: 4-0, 4-1, 4-2
    if (maxScore === 4 && minScore <= 2) {
      return { ok: true };
    }
    return {
      ok: false,
      reason: 'Placar inválido para Set curto até 4',
    };
  }

  if (ruleset.id === 'normal_6') {
    // Normal 6: pode ser 6-0 até 6-4, ou 7-5 (quando estava 6-5)
    if (maxScore === 6 && minScore <= 4) {
      return { ok: true };
    }
    if (maxScore === 7 && minScore === 5) {
      return { ok: true };
    }
    // 6-5 não é permitido (precisaria continuar até 7-5)
    if ((maxScore === 6 && minScore === 5) || (maxScore === 5 && minScore === 6)) {
      return {
        ok: false,
        reason: 'No Set normal até 6, placar 6-5 não finaliza. Continue até 7-5 ou use tiebreak',
      };
    }
    // 7-6 não é permitido (exigiria tiebreak)
    if ((maxScore === 7 && minScore === 6) || (maxScore === 6 && minScore === 7)) {
      return {
        ok: false,
        reason: 'No Set normal até 6, placar 7-6 não é permitido sem tiebreak',
      };
    }
    if (maxScore > 7) {
      return {
        ok: false,
        reason: 'No Set normal até 6, o máximo permitido é 7 games (quando estava 6-5)',
      };
    }
    return {
      ok: false,
      reason: 'Placar inválido para Set normal até 6',
    };
  }

  if (ruleset.id === 'super_tiebreak') {
    // Super tiebreak: mínimo 10, diferença 2
    if (maxScore < 10) {
      return {
        ok: false,
        reason: 'No Super tiebreak, é necessário atingir 10 points para vencer',
      };
    }
    // Pode continuar: 10-8, 11-9, 12-10, etc.
    if (maxScore >= 10 && difference >= 2) {
      return { ok: true };
    }
    return {
      ok: false,
      reason: 'No Super tiebreak, é necessária diferença mínima de 2 points',
    };
  }

  return { ok: false, reason: 'Ruleset não reconhecido' };
}

/**
 * Valida uma partida completa conforme o ruleset e configuração do evento
 */
export interface MatchScoreValidation {
  ok: boolean;
  reason?: string;
  winnerTeamId?: number;
  setsWonTeam1: number;
  setsWonTeam2: number;
  gamesForTeam1: number;
  gamesAgainstTeam1: number;
  requiresDecider?: boolean;
}

export function validateMatchScore(
  ruleset: ScoreRuleset,
  numSets: number,
  scores: {
    set1?: { team1: number; team2: number };
    set2?: { team1: number; team2: number };
    set3?: { team1: number; team2: number };
  }
): MatchScoreValidation {
  const result: MatchScoreValidation = {
    ok: false,
    setsWonTeam1: 0,
    setsWonTeam2: 0,
    gamesForTeam1: 0,
    gamesAgainstTeam1: 0,
  };

  // Validar set 1 (obrigatório)
  if (!scores.set1) {
    return { ...result, reason: 'O 1º set é obrigatório' };
  }

  const set1Validation = validateSetScore(ruleset, scores.set1.team1, scores.set1.team2);
  if (!set1Validation.ok) {
    return { ...result, reason: `1º Set: ${set1Validation.reason}` };
  }

  // Determinar vencedor do set 1
  if (scores.set1.team1 > scores.set1.team2) {
    result.setsWonTeam1++;
  } else {
    result.setsWonTeam2++;
  }

  result.gamesForTeam1 += scores.set1.team1;
  result.gamesAgainstTeam1 += scores.set1.team2;

  // Validar set 2 (se evento for 2 sets)
  if (numSets === 2) {
    if (!scores.set2) {
      return { ...result, reason: 'O 2º set é obrigatório em eventos de 2 sets' };
    }

    const set2Validation = validateSetScore(ruleset, scores.set2.team1, scores.set2.team2);
    if (!set2Validation.ok) {
      return { ...result, reason: `2º Set: ${set2Validation.reason}` };
    }

    // Determinar vencedor do set 2
    if (scores.set2.team1 > scores.set2.team2) {
      result.setsWonTeam1++;
    } else {
      result.setsWonTeam2++;
    }

    result.gamesForTeam1 += scores.set2.team1;
    result.gamesAgainstTeam1 += scores.set2.team2;

    // Verificar se há empate 1x1
    if (result.setsWonTeam1 === 1 && result.setsWonTeam2 === 1) {
      // Empate: requer decider (super tiebreak)
      if (!scores.set3) {
        return {
          ...result,
          reason: 'Empate 1x1 em sets requer desempate (Super tiebreak). Preencha o 3º set.',
          requiresDecider: true,
        };
      }

      // Validar decider (sempre usa super tiebreak)
      const deciderRuleset = SCORE_RULESETS.super_tiebreak;
      const set3Validation = validateSetScore(
        deciderRuleset,
        scores.set3.team1,
        scores.set3.team2
      );
      if (!set3Validation.ok) {
        return {
          ...result,
          reason: `Desempate (3º Set): ${set3Validation.reason}`,
        };
      }

      // Determinar vencedor do decider
      if (scores.set3.team1 > scores.set3.team2) {
        result.setsWonTeam1++;
      } else {
        result.setsWonTeam2++;
      }

      result.gamesForTeam1 += scores.set3.team1;
      result.gamesAgainstTeam1 += scores.set3.team2;
    }
  }

  // Determinar vencedor final
  if (result.setsWonTeam1 > result.setsWonTeam2) {
    result.winnerTeamId = 1; // Será substituído pelo ID real do time
  } else if (result.setsWonTeam2 > result.setsWonTeam1) {
    result.winnerTeamId = 2; // Será substituído pelo ID real do time
  } else {
    // Ainda empatado (não deveria acontecer após validação)
    return {
      ...result,
      reason: 'Não foi possível determinar o vencedor',
    };
  }

  result.ok = true;
  return result;
}

/**
 * Obtém o placar padrão de W.O. conforme o ruleset
 */
export function getWalkoverScore(
  ruleset: ScoreRuleset,
  numSets: number
): { set1: { team1: number; team2: number }; set2?: { team1: number; team2: number } } {
  const score = ruleset.maxGames; // 4 para fast_4, 6 para normal_6

  const result: {
    set1: { team1: number; team2: number };
    set2?: { team1: number; team2: number };
  } = {
    set1: { team1: score, team2: 0 },
  };

  if (numSets === 2) {
    result.set2 = { team1: score, team2: 0 };
  }

  return result;
}
