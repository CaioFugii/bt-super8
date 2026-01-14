import { getDatabase } from '../database';
import { EventParticipant, Player } from '@/domain/types';

export interface EventParticipantWithPlayers extends EventParticipant {
  player1?: Player;
  player2?: Player;
}

export class EventParticipantRepository {
  async findByEventId(eventId: number): Promise<EventParticipantWithPlayers[]> {
    const db = await getDatabase();
    const result = await db.getAllAsync<EventParticipant>(
      'SELECT * FROM event_participants WHERE event_id = ? ORDER BY id',
      [eventId]
    );

    // Carregar informações dos jogadores
    const participantsWithPlayers: EventParticipantWithPlayers[] = [];
    for (const participant of result) {
      const player1 = await db.getFirstAsync<Player>(
        'SELECT * FROM players WHERE id = ?',
        [participant.player1_id]
      );
      let player2: Player | null = null;
      if (participant.player2_id) {
        player2 = await db.getFirstAsync<Player>(
          'SELECT * FROM players WHERE id = ?',
          [participant.player2_id]
        );
      }

      participantsWithPlayers.push({
        ...participant,
        player1: player1 || undefined,
        player2: player2 || undefined,
      });
    }

    return participantsWithPlayers;
  }

  async findById(id: number): Promise<EventParticipantWithPlayers | null> {
    const db = await getDatabase();
    const participant = await db.getFirstAsync<EventParticipant>(
      'SELECT * FROM event_participants WHERE id = ?',
      [id]
    );

    if (!participant) return null;

    const player1 = await db.getFirstAsync<Player>(
      'SELECT * FROM players WHERE id = ?',
      [participant.player1_id]
    );
    let player2: Player | null = null;
    if (participant.player2_id) {
      player2 = await db.getFirstAsync<Player>(
        'SELECT * FROM players WHERE id = ?',
        [participant.player2_id]
      );
    }

    return {
      ...participant,
      player1: player1 || undefined,
      player2: player2 || undefined,
    };
  }

  async create(participant: Omit<EventParticipant, 'id' | 'created_at'>): Promise<EventParticipant> {
    const db = await getDatabase();
    
    const result = await db.runAsync(
      `INSERT INTO event_participants (event_id, player1_id, player2_id, team_name, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [
        participant.event_id,
        participant.player1_id,
        participant.player2_id || null,
        participant.team_name || null,
        Date.now(),
      ]
    );

    const newParticipant = await this.findById(result.lastInsertRowId);
    if (!newParticipant) {
      throw new Error('Failed to create event participant');
    }

    return newParticipant;
  }

  async createBatch(participants: Omit<EventParticipant, 'id' | 'created_at'>[]): Promise<EventParticipant[]> {
    const created: EventParticipant[] = [];
    for (const participant of participants) {
      const createdParticipant = await this.create(participant);
      created.push(createdParticipant);
    }
    return created;
  }

  async update(id: number, participant: Partial<Omit<EventParticipant, 'id' | 'created_at'>>): Promise<EventParticipant> {
    const db = await getDatabase();
    const updates: string[] = [];
    const values: any[] = [];

    if (participant.player1_id !== undefined) {
      updates.push('player1_id = ?');
      values.push(participant.player1_id);
    }
    if (participant.player2_id !== undefined) {
      updates.push('player2_id = ?');
      values.push(participant.player2_id || null);
    }
    if (participant.team_name !== undefined) {
      updates.push('team_name = ?');
      values.push(participant.team_name || null);
    }

    if (updates.length === 0) {
      const existing = await this.findById(id);
      if (!existing) {
        throw new Error('Participant not found');
      }
      return existing;
    }

    values.push(id);
    await db.runAsync(
      `UPDATE event_participants SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('Failed to update event participant');
    }

    return updated;
  }

  async delete(id: number): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM event_participants WHERE id = ?', [id]);
  }

  async deleteByEventId(eventId: number): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM event_participants WHERE event_id = ?', [eventId]);
  }
}

export const eventParticipantRepository = new EventParticipantRepository();
