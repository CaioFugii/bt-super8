import { getDatabase } from '../database';
import { Match } from '@/domain/types';

export class MatchRepository {
  async findByEventId(eventId: number): Promise<Match[]> {
    const db = await getDatabase();
    const result = await db.getAllAsync<Match>(
      'SELECT * FROM matches WHERE event_id = ? ORDER BY round, court, id',
      [eventId]
    );
    return result;
  }

  async findByEventIdAndRound(eventId: number, round: number): Promise<Match[]> {
    const db = await getDatabase();
    const result = await db.getAllAsync<Match>(
      'SELECT * FROM matches WHERE event_id = ? AND round = ? ORDER BY court, id',
      [eventId, round]
    );
    return result;
  }

  async findById(id: number): Promise<Match | null> {
    const db = await getDatabase();
    const result = await db.getFirstAsync<Match>(
      'SELECT * FROM matches WHERE id = ?',
      [id]
    );
    return result || null;
  }

  async create(match: Omit<Match, 'id' | 'created_at' | 'updated_at'>): Promise<Match> {
    const db = await getDatabase();
    const now = Date.now();

    const result = await db.runAsync(
      `INSERT INTO matches (
        event_id, round, court, team1_id, team2_id, status,
        score_team1_set1, score_team2_set1,
        score_team1_set2, score_team2_set2,
        score_team1_set3, score_team2_set3,
        winner_id, outcome_type, walkover_winner_team_id, walkover_reason,
        scheduled_time, started_at, finished_at,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        match.event_id,
        match.round,
        match.court || null,
        match.team1_id,
        match.team2_id,
        match.status,
        match.score_team1_set1 || null,
        match.score_team2_set1 || null,
        match.score_team1_set2 || null,
        match.score_team2_set2 || null,
        match.score_team1_set3 || null,
        match.score_team2_set3 || null,
        match.winner_id || null,
        match.outcome_type || null,
        match.walkover_winner_team_id || null,
        match.walkover_reason || null,
        match.scheduled_time || null,
        match.started_at || null,
        match.finished_at || null,
        now,
        now,
      ]
    );

    const newMatch = await this.findById(result.lastInsertRowId);
    if (!newMatch) {
      throw new Error('Failed to create match');
    }

    return newMatch;
  }

  async createBatch(matches: Omit<Match, 'id' | 'created_at' | 'updated_at'>[]): Promise<Match[]> {
    const created: Match[] = [];
    for (const match of matches) {
      const createdMatch = await this.create(match);
      created.push(createdMatch);
    }
    return created;
  }

  async update(id: number, match: Partial<Match>): Promise<Match> {
    const db = await getDatabase();
    const updates: string[] = [];
    const values: any[] = [];

    if (match.round !== undefined) {
      updates.push('round = ?');
      values.push(match.round);
    }
    if (match.court !== undefined) {
      updates.push('court = ?');
      values.push(match.court === null ? null : match.court);
    }
    if (match.team1_id !== undefined) {
      updates.push('team1_id = ?');
      values.push(match.team1_id);
    }
    if (match.team2_id !== undefined) {
      updates.push('team2_id = ?');
      values.push(match.team2_id);
    }
    if (match.status !== undefined) {
      updates.push('status = ?');
      values.push(match.status);
    }
    if (match.score_team1_set1 !== undefined) {
      updates.push('score_team1_set1 = ?');
      values.push(match.score_team1_set1);
    }
    if (match.score_team2_set1 !== undefined) {
      updates.push('score_team2_set1 = ?');
      values.push(match.score_team2_set1);
    }
    if (match.score_team1_set2 !== undefined) {
      updates.push('score_team1_set2 = ?');
      values.push(match.score_team1_set2);
    }
    if (match.score_team2_set2 !== undefined) {
      updates.push('score_team2_set2 = ?');
      values.push(match.score_team2_set2);
    }
    if (match.score_team1_set3 !== undefined) {
      updates.push('score_team1_set3 = ?');
      values.push(match.score_team1_set3);
    }
    if (match.score_team2_set3 !== undefined) {
      updates.push('score_team2_set3 = ?');
      values.push(match.score_team2_set3);
    }
    if (match.winner_id !== undefined) {
      updates.push('winner_id = ?');
      values.push(match.winner_id);
    }
    if (match.outcome_type !== undefined) {
      updates.push('outcome_type = ?');
      values.push(match.outcome_type);
    }
    if (match.walkover_winner_team_id !== undefined) {
      updates.push('walkover_winner_team_id = ?');
      values.push(match.walkover_winner_team_id === null ? null : match.walkover_winner_team_id);
    }
    if (match.walkover_reason !== undefined) {
      updates.push('walkover_reason = ?');
      values.push(match.walkover_reason === null ? null : match.walkover_reason);
    }
    if (match.started_at !== undefined) {
      updates.push('started_at = ?');
      values.push(match.started_at);
    }
    if (match.finished_at !== undefined) {
      updates.push('finished_at = ?');
      values.push(match.finished_at);
    }

    updates.push('updated_at = ?');
    values.push(Date.now());
    values.push(id);

    await db.runAsync(
      `UPDATE matches SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('Failed to update match');
    }

    return updated;
  }

  async delete(id: number): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM matches WHERE id = ?', [id]);
  }

  async deleteByEventId(eventId: number): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM matches WHERE event_id = ?', [eventId]);
  }
}

export const matchRepository = new MatchRepository();
