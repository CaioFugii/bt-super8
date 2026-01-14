import { generateRoundRobinMatches, scheduleRoundRobin } from '../round-robin';
import { EventParticipant } from '../../types';

describe('Round-Robin Algorithm', () => {
  const createParticipant = (id: number): EventParticipant => ({
    id,
    event_id: 1,
    player1_id: id * 10,
    player2_id: id * 10 + 1,
    created_at: Date.now(),
  });

  describe('generateRoundRobinMatches', () => {
    it('should generate 28 matches for 8 participants', () => {
      const participants = Array.from({ length: 8 }, (_, i) => createParticipant(i + 1));
      const matches = generateRoundRobinMatches(participants, 1);

      expect(matches).toHaveLength(28); // 8 * 7 / 2 = 28
    });

    it('should generate correct number of matches for any n participants', () => {
      for (let n = 2; n <= 10; n++) {
        const participants = Array.from({ length: n }, (_, i) => createParticipant(i + 1));
        const matches = generateRoundRobinMatches(participants, 1);
        const expectedMatches = (n * (n - 1)) / 2;
        expect(matches).toHaveLength(expectedMatches);
      }
    });

    it('should not have duplicate matches', () => {
      const participants = Array.from({ length: 8 }, (_, i) => createParticipant(i + 1));
      const matches = generateRoundRobinMatches(participants, 1);

      const matchKeys = matches.map(
        (m) => `${Math.min(m.team1_id, m.team2_id)}-${Math.max(m.team1_id, m.team2_id)}`
      );
      const uniqueKeys = new Set(matchKeys);
      expect(uniqueKeys.size).toBe(matches.length);
    });
  });

  describe('scheduleRoundRobin', () => {
    it('should schedule matches into rounds', () => {
      const participants = Array.from({ length: 8 }, (_, i) => createParticipant(i + 1));
      const rounds = scheduleRoundRobin(participants, 2);

      expect(rounds.length).toBeGreaterThan(0);
      rounds.forEach((round) => {
        expect(round.length).toBeLessThanOrEqual(2);
      });
    });

    it('should assign court numbers correctly', () => {
      const participants = Array.from({ length: 8 }, (_, i) => createParticipant(i + 1));
      const rounds = scheduleRoundRobin(participants, 4);

      rounds.forEach((round) => {
        round.forEach((match, idx) => {
          expect(match.court).toBe(idx + 1);
        });
      });
    });
  });
});
