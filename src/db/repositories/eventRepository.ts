import { getDatabase } from '../database';
import { Event } from '@/domain/types';

export class EventRepository {
  async findAll(): Promise<Event[]> {
    const db = await getDatabase();
    const result = await db.getAllAsync<Event>(
      'SELECT * FROM events ORDER BY date DESC'
    );
    return result.map(this.parseEvent);
  }

  async findActive(): Promise<Event[]> {
    const db = await getDatabase();
    const result = await db.getAllAsync<Event>(
      "SELECT * FROM events WHERE status = 'active' ORDER BY date DESC"
    );
    return result.map(this.parseEvent);
  }

  async findById(id: number): Promise<Event | null> {
    const db = await getDatabase();
    const result = await db.getFirstAsync<Event>(
      'SELECT * FROM events WHERE id = ?',
      [id]
    );
    return result ? this.parseEvent(result) : null;
  }

  async create(event: Omit<Event, 'id' | 'created_at' | 'updated_at'>): Promise<Event> {
    const db = await getDatabase();
    const now = Date.now();
    
    const tiebreakCriteriaJson = JSON.stringify(event.tiebreak_criteria);
    
    const result = await db.runAsync(
      `INSERT INTO events (
        name, date, start_time, location, category, format, num_courts,
        num_sets, game_duration_minutes, points_per_win, tiebreak_criteria,
        status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        event.name,
        event.date,
        event.start_time || null,
        event.location || null,
        event.category || null,
        event.format,
        event.num_courts,
        event.num_sets ?? 1,
        event.game_duration_minutes,
        event.points_per_win,
        tiebreakCriteriaJson,
        event.status || 'active',
        now,
        now,
      ]
    );
    
    const newEvent = await this.findById(result.lastInsertRowId);
    if (!newEvent) {
      throw new Error('Failed to create event');
    }
    
    return newEvent;
  }

  async update(id: number, event: Partial<Event>): Promise<Event> {
    const db = await getDatabase();
    const updates: string[] = [];
    const values: any[] = [];
    
    if (event.name !== undefined) {
      updates.push('name = ?');
      values.push(event.name);
    }
    if (event.date !== undefined) {
      updates.push('date = ?');
      values.push(event.date);
    }
    if (event.start_time !== undefined) {
      updates.push('start_time = ?');
      values.push(event.start_time || null);
    }
    if (event.location !== undefined) {
      updates.push('location = ?');
      values.push(event.location);
    }
    if (event.category !== undefined) {
      updates.push('category = ?');
      values.push(event.category);
    }
    if (event.format !== undefined) {
      updates.push('format = ?');
      values.push(event.format);
    }
    if (event.num_courts !== undefined) {
      updates.push('num_courts = ?');
      values.push(event.num_courts);
    }
    if (event.num_sets !== undefined) {
      updates.push('num_sets = ?');
      values.push(event.num_sets);
    }
    if (event.game_duration_minutes !== undefined) {
      updates.push('game_duration_minutes = ?');
      values.push(event.game_duration_minutes);
    }
    if (event.points_per_win !== undefined) {
      updates.push('points_per_win = ?');
      values.push(event.points_per_win);
    }
    if (event.tiebreak_criteria !== undefined) {
      updates.push('tiebreak_criteria = ?');
      values.push(JSON.stringify(event.tiebreak_criteria));
    }
    if (event.status !== undefined) {
      updates.push('status = ?');
      values.push(event.status);
    }
    
    updates.push('updated_at = ?');
    values.push(Date.now());
    values.push(id);
    
    await db.runAsync(
      `UPDATE events SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
    
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('Failed to update event');
    }
    
    return updated;
  }

  async delete(id: number): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM events WHERE id = ?', [id]);
  }

  private parseEvent(event: any): Event {
    return {
      ...event,
      num_sets: event.num_sets ?? 1,
      tiebreak_criteria: JSON.parse(event.tiebreak_criteria || '[]'),
    };
  }
}

export const eventRepository = new EventRepository();
