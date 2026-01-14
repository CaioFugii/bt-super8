import { validateSetScore, validateMatchScore, SCORE_RULESETS, getWalkoverScore } from './scoreRuleset';

describe('Score Ruleset Validation', () => {
  describe('Fast 4 (Set Curto até 4)', () => {
    const ruleset = SCORE_RULESETS.fast_4;

    it('should accept valid scores', () => {
      expect(validateSetScore(ruleset, 4, 0).ok).toBe(true);
      expect(validateSetScore(ruleset, 4, 1).ok).toBe(true);
      expect(validateSetScore(ruleset, 4, 2).ok).toBe(true);
      expect(validateSetScore(ruleset, 4, 3).ok).toBe(true);
      expect(validateSetScore(ruleset, 0, 4).ok).toBe(true);
      expect(validateSetScore(ruleset, 3, 4).ok).toBe(true);
    });

    it('should reject invalid scores', () => {
      expect(validateSetScore(ruleset, 5, 4).ok).toBe(false);
      expect(validateSetScore(ruleset, 6, 4).ok).toBe(false);
      expect(validateSetScore(ruleset, 3, 3).ok).toBe(false);
      expect(validateSetScore(ruleset, 0, 0).ok).toBe(false);
    });
  });

  describe('Normal 6 (Set Normal até 6)', () => {
    const ruleset = SCORE_RULESETS.normal_6;

    it('should accept valid scores', () => {
      expect(validateSetScore(ruleset, 6, 0).ok).toBe(true);
      expect(validateSetScore(ruleset, 6, 4).ok).toBe(true);
      expect(validateSetScore(ruleset, 7, 5).ok).toBe(true);
      expect(validateSetScore(ruleset, 0, 6).ok).toBe(true);
      expect(validateSetScore(ruleset, 5, 7).ok).toBe(true);
    });

    it('should reject invalid scores', () => {
      expect(validateSetScore(ruleset, 6, 5).ok).toBe(false);
      expect(validateSetScore(ruleset, 7, 6).ok).toBe(false);
      expect(validateSetScore(ruleset, 6, 6).ok).toBe(false);
    });
  });

  describe('Super Tiebreak', () => {
    const ruleset = SCORE_RULESETS.super_tiebreak;

    it('should accept valid scores', () => {
      expect(validateSetScore(ruleset, 10, 8).ok).toBe(true);
      expect(validateSetScore(ruleset, 11, 9).ok).toBe(true);
      expect(validateSetScore(ruleset, 12, 10).ok).toBe(true);
      expect(validateSetScore(ruleset, 0, 10).ok).toBe(true);
    });

    it('should reject invalid scores', () => {
      expect(validateSetScore(ruleset, 10, 9).ok).toBe(false);
      expect(validateSetScore(ruleset, 9, 9).ok).toBe(false);
      expect(validateSetScore(ruleset, 8, 7).ok).toBe(false);
    });
  });

  describe('Match Score Validation', () => {
    const ruleset = SCORE_RULESETS.normal_6;

    it('should validate 1 set match', () => {
      const result = validateMatchScore(ruleset, 1, {
        set1: { team1: 6, team2: 4 },
      });
      expect(result.ok).toBe(true);
      expect(result.setsWonTeam1).toBe(1);
      expect(result.setsWonTeam2).toBe(0);
    });

    it('should validate 2 sets match without tie', () => {
      const result = validateMatchScore(ruleset, 2, {
        set1: { team1: 6, team2: 4 },
        set2: { team1: 6, team2: 3 },
      });
      expect(result.ok).toBe(true);
      expect(result.setsWonTeam1).toBe(2);
      expect(result.setsWonTeam2).toBe(0);
    });

    it('should require decider for 1x1 tie in 2 sets', () => {
      const result = validateMatchScore(ruleset, 2, {
        set1: { team1: 6, team2: 4 },
        set2: { team1: 4, team2: 6 },
      });
      expect(result.ok).toBe(false);
      expect(result.requiresDecider).toBe(true);
    });

    it('should validate 2 sets match with decider', () => {
      const result = validateMatchScore(ruleset, 2, {
        set1: { team1: 6, team2: 4 },
        set2: { team1: 4, team2: 6 },
        set3: { team1: 10, team2: 8 },
      });
      expect(result.ok).toBe(true);
      expect(result.setsWonTeam1).toBe(2);
      expect(result.setsWonTeam2).toBe(1);
    });
  });

  describe('Walkover Score', () => {
    it('should return correct walkover score for fast_4', () => {
      const scores = getWalkoverScore(SCORE_RULESETS.fast_4, 1);
      expect(scores.set1.team1).toBe(4);
      expect(scores.set1.team2).toBe(0);
    });

    it('should return correct walkover score for normal_6 (2 sets)', () => {
      const scores = getWalkoverScore(SCORE_RULESETS.normal_6, 2);
      expect(scores.set1.team1).toBe(6);
      expect(scores.set1.team2).toBe(0);
      expect(scores.set2?.team1).toBe(6);
      expect(scores.set2?.team2).toBe(0);
    });
  });
});
