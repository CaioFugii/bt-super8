import { divideIntoGroups, generateGroupMatches, organizeIntoRounds } from '../groups-finals';
import { EventParticipant } from '../../types';

describe('Groups + Finals Algorithm', () => {
  const createParticipant = (id: number): EventParticipant => ({
    id,
    event_id: 1,
    player1_id: id * 10,
    player2_id: id * 10 + 1,
    created_at: Date.now(),
  });

  describe('divideIntoGroups', () => {
    it('should divide 8 participants into 2 groups of 4', () => {
      const participants = Array.from({ length: 8 }, (_, i) => createParticipant(i + 1));
      const [groupA, groupB] = divideIntoGroups(participants);

      expect(groupA.participants).toHaveLength(4);
      expect(groupB.participants).toHaveLength(4);
      expect(groupA.name).toBe('Grupo A');
      expect(groupB.name).toBe('Grupo B');
    });
  });

  describe('generateGroupMatches', () => {
    it('should generate 6 matches for a group of 4 participants', () => {
      const participants = Array.from({ length: 4 }, (_, i) => createParticipant(i + 1));
      const group = { name: 'Grupo A', participants };
      const matches = generateGroupMatches(group, 1);

      expect(matches).toHaveLength(6);
      // Verificar que cada participante joga contra os outros 3
      const participantIds = participants.map((p) => p.id);
      matches.forEach((match) => {
        expect(participantIds).toContain(match.team1_id);
        expect(participantIds).toContain(match.team2_id);
        expect(match.team1_id).not.toBe(match.team2_id);
      });
    });
  });

  describe('organizeIntoRounds', () => {
    it('should organize matches into rounds based on number of courts', () => {
      const participants = Array.from({ length: 4 }, (_, i) => createParticipant(i + 1));
      const group = { name: 'Grupo A', participants };
      const matches = generateGroupMatches(group, 1);
      const rounds = organizeIntoRounds(matches, 2); // 2 quadras

      expect(rounds.length).toBeGreaterThan(0);
      rounds.forEach((round) => {
        expect(round.length).toBeLessThanOrEqual(2);
        round.forEach((match) => {
          expect(match.court).toBeGreaterThanOrEqual(1);
          expect(match.court).toBeLessThanOrEqual(2);
        });
      });
    });

    it('should assign correct round numbers', () => {
      const participants = Array.from({ length: 4 }, (_, i) => createParticipant(i + 1));
      const group = { name: 'Grupo A', participants };
      const matches = generateGroupMatches(group, 1);
      const rounds = organizeIntoRounds(matches, 1); // 1 quadra

      rounds.forEach((round, idx) => {
        round.forEach((match) => {
          expect(match.round).toBe(idx + 1);
        });
      });
    });
  });
});
