import { getDatabase } from '../database';
import { Player } from '@/domain/types';

export class PlayerRepository {
  async findAll(): Promise<Player[]> {
    const db = await getDatabase();
    const result = await db.getAllAsync<Player>(
      'SELECT * FROM players ORDER BY name'
    );
    return result;
  }

  async findById(id: number): Promise<Player | null> {
    const db = await getDatabase();
    const result = await db.getFirstAsync<Player>(
      'SELECT * FROM players WHERE id = ?',
      [id]
    );
    return result || null;
  }

  async create(player: Omit<Player, 'id' | 'created_at' | 'updated_at'>): Promise<Player> {
    const db = await getDatabase();
    const now = Date.now();
    
    const result = await db.runAsync(
      `INSERT INTO players (name, nickname, contact, level, avatar_uri, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        player.name,
        player.nickname || null,
        player.contact || null,
        player.level || null,
        player.avatar_uri || null,
        now,
        now,
      ]
    );
    
    const newPlayer = await this.findById(result.lastInsertRowId);
    if (!newPlayer) {
      throw new Error('Failed to create player');
    }
    
    return newPlayer;
  }

  async update(id: number, player: Partial<Player>): Promise<Player> {
    const db = await getDatabase();
    const updates: string[] = [];
    const values: any[] = [];
    
    if (player.name !== undefined) {
      updates.push('name = ?');
      values.push(player.name);
    }
    if (player.nickname !== undefined) {
      updates.push('nickname = ?');
      values.push(player.nickname);
    }
    if (player.contact !== undefined) {
      updates.push('contact = ?');
      values.push(player.contact);
    }
    if (player.level !== undefined) {
      updates.push('level = ?');
      values.push(player.level);
    }
    if (player.avatar_uri !== undefined) {
      updates.push('avatar_uri = ?');
      values.push(player.avatar_uri);
    }
    
    updates.push('updated_at = ?');
    values.push(Date.now());
    values.push(id);
    
    await db.runAsync(
      `UPDATE players SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
    
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('Failed to update player');
    }
    
    return updated;
  }

  async delete(id: number): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM players WHERE id = ?', [id]);
  }

  async search(query: string): Promise<Player[]> {
    const db = await getDatabase();
    const result = await db.getAllAsync<Player>(
      `SELECT * FROM players 
       WHERE name LIKE ? OR nickname LIKE ?
       ORDER BY name`,
      [`%${query}%`, `%${query}%`]
    );
    return result;
  }

  async createBatch(names: string[]): Promise<Player[]> {
    const players: Player[] = [];
    for (const name of names) {
      if (name.trim()) {
        const player = await this.create({ name: name.trim() });
        players.push(player);
      }
    }
    return players;
  }
}

export const playerRepository = new PlayerRepository();
