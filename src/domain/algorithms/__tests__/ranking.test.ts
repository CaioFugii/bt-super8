import { calculateRanking } from '../ranking';
import { EventParticipant, Match } from '../../types';

describe('Ranking Algorithm', () => {
  const createParticipant = (id: number): EventParticipant => ({
    id,
    event_id: 1,
    player1_id: id * 10,
    player2_id: id * 10 + 1,
    created_at: Date.now(),
  });

  const createMatch = (
    id: number,
    team1Id: number,
    team2Id: number,
    winnerId: number,
    score1: number,
    score2: number
  ): Match => ({
    id,
    event_id: 1,
    round: 1,
    team1_id: team1Id,
    team2_id: team2Id,
    status: 'finished',
    score_team1_set1: score1,
    score_team2_set1: score2,
    score_team1_set2: score1,
    score_team2_set2: score2,
    winner_id: winnerId,
    created_at: Date.now(),
    updated_at: Date.now(),
  });

  it('should rank by points first (wins * points_per_win)', () => {
    const participants = [
      createParticipant(1),
      createParticipant(2),
      createParticipant(3),
    ];

    const matches: Match[] = [
      createMatch(1, 1, 2, 1, 6, 4), // Team 1 wins
      createMatch(2, 1, 3, 1, 6, 4), // Team 1 wins
      createMatch(3, 2, 3, 2, 6, 4), // Team 2 wins
    ];

    const ranking = calculateRanking(participants, matches, undefined, 3); // 3 pontos por vitória

    expect(ranking[0].participant.id).toBe(1);
    expect(ranking[0].wins).toBe(2);
    expect(ranking[0].points).toBe(6); // 2 vitórias * 3 pontos
    expect(ranking[1].participant.id).toBe(2);
    expect(ranking[1].wins).toBe(1);
    expect(ranking[1].points).toBe(3); // 1 vitória * 3 pontos
    expect(ranking[2].participant.id).toBe(3);
    expect(ranking[2].wins).toBe(0);
    expect(ranking[2].points).toBe(0);
  });

  it('should use game difference as tiebreaker when points are equal', () => {
    const participants = [
      createParticipant(1),
      createParticipant(2),
      createParticipant(3),
    ];

    // Team 1: 1 vitória (6-4), saldo +2
    // Team 2: 1 vitória (6-4), saldo +2
    // Team 3: 0 vitórias, saldo -4
    const matches: Match[] = [
      {
        ...createMatch(1, 1, 3, 1, 6, 4),
        score_team1_set1: 6,
        score_team2_set1: 4,
        score_team1_set2: undefined,
        score_team2_set2: undefined,
      },
      {
        ...createMatch(2, 2, 3, 2, 6, 4),
        score_team1_set1: 6,
        score_team2_set1: 4,
        score_team1_set2: undefined,
        score_team2_set2: undefined,
      },
    ];

    const ranking = calculateRanking(participants, matches, undefined, 1); // 1 ponto por vitória

    expect(ranking[0].wins).toBe(1);
    expect(ranking[0].points).toBe(1);
    expect(ranking[1].wins).toBe(1);
    expect(ranking[1].points).toBe(1);
    // Team 1 e Team 2 devem ter mesmo saldo, então ordem estável
    expect(ranking[0].gameDifference).toBe(2);
    expect(ranking[1].gameDifference).toBe(2);
    expect(ranking[2].gameDifference).toBe(-4);
  });

  it('should calculate games correctly', () => {
    const participants = [createParticipant(1), createParticipant(2)];

    const matches: Match[] = [
      {
        ...createMatch(1, 1, 2, 1, 6, 4),
        score_team1_set1: 6,
        score_team2_set1: 4,
        score_team1_set2: 6,
        score_team2_set2: 3,
      },
    ];

    const ranking = calculateRanking(participants, matches);

    expect(ranking[0].gamesFor).toBe(12); // 6 + 6
    expect(ranking[0].gamesAgainst).toBe(7); // 4 + 3
    expect(ranking[0].points).toBe(1); // 1 vitória * 1 ponto (padrão)
    expect(ranking[1].gamesFor).toBe(7);
    expect(ranking[1].gamesAgainst).toBe(12);
    expect(ranking[1].points).toBe(0);
  });

  it('should use default points_per_win = 1 when not specified', () => {
    const participants = [createParticipant(1), createParticipant(2)];

    const matches: Match[] = [
      createMatch(1, 1, 2, 1, 6, 4), // Team 1 wins
    ];

    const ranking = calculateRanking(participants, matches);

    expect(ranking[0].points).toBe(1); // 1 vitória * 1 ponto (padrão)
    expect(ranking[1].points).toBe(0);
  });

  it('should apply head-to-head only for tie of exactly 2 participants', () => {
    const participants = [
      createParticipant(1),
      createParticipant(2),
      createParticipant(3),
    ];

    // Todos empatam em pontos, vitórias, saldo e games pró
    // Team 1 venceu Team 2
    // Team 2 venceu Team 3
    // Team 3 venceu Team 1 (circular)
    const matches: Match[] = [
      createMatch(1, 1, 2, 1, 6, 4), // Team 1 vence Team 2
      createMatch(2, 2, 3, 2, 6, 4), // Team 2 vence Team 3
      createMatch(3, 3, 1, 3, 6, 4), // Team 3 vence Team 1
    ];

    const ranking = calculateRanking(participants, matches, undefined, 1);

    // Todos devem ter 1 vitória, 1 derrota
    expect(ranking[0].wins).toBe(1);
    expect(ranking[1].wins).toBe(1);
    expect(ranking[2].wins).toBe(1);

    // Como há empate de 3, confronto direto deve ser ignorado
    // Ordem deve ser estável (mantém ordem original)
    // Não podemos garantir qual ficará em primeiro, mas todos devem ter mesma pontuação
    expect(ranking[0].points).toBe(1);
    expect(ranking[1].points).toBe(1);
    expect(ranking[2].points).toBe(1);
  });

  it('should apply head-to-head for tie of exactly 2 participants', () => {
    const participants = [
      createParticipant(1),
      createParticipant(2),
    ];

    // Ambos empatam em pontos, vitórias, saldo e games pró
    // Team 1 venceu Team 2
    const matches: Match[] = [
      createMatch(1, 1, 2, 1, 6, 4), // Team 1 vence Team 2
      createMatch(2, 1, 2, 2, 4, 6), // Team 2 vence Team 1
    ];

    const ranking = calculateRanking(participants, matches, undefined, 1);

    // Ambos têm 1 vitória, 1 derrota
    expect(ranking[0].wins).toBe(1);
    expect(ranking[1].wins).toBe(1);

    // Como há empate de 2, confronto direto deve ser aplicado
    // Mas como cada um venceu uma vez, não há desempate por confronto direto
    // Deve manter ordem estável ou usar próximo critério
    expect(ranking[0].points).toBe(1);
    expect(ranking[1].points).toBe(1);
  });
});
