import * as SQLite from 'expo-sqlite';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) {
    return db;
  }

  db = await SQLite.openDatabaseAsync('beach_tennis.db');
  await runMigrations();
  return db;
}

async function runMigrations() {
  if (!db) return;

  // Migração 1: Criação inicial
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      nickname TEXT,
      contact TEXT,
      level TEXT,
      avatar_uri TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_players_name ON players(name);

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      date INTEGER NOT NULL,
      start_time TEXT,
      location TEXT,
      category TEXT,
      format TEXT NOT NULL,
      num_courts INTEGER NOT NULL DEFAULT 1,
      game_duration_minutes INTEGER NOT NULL DEFAULT 30,
      points_per_win INTEGER NOT NULL DEFAULT 1,
      tiebreak_criteria TEXT NOT NULL DEFAULT '["wins","game_difference","games_for","head_to_head"]',
      status TEXT NOT NULL DEFAULT 'active',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
    CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);

    CREATE TABLE IF NOT EXISTS event_participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL,
      player1_id INTEGER NOT NULL,
      player2_id INTEGER,
      team_name TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
      FOREIGN KEY (player1_id) REFERENCES players(id),
      FOREIGN KEY (player2_id) REFERENCES players(id)
    );

    CREATE INDEX IF NOT EXISTS idx_event_participants_event ON event_participants(event_id);
    CREATE INDEX IF NOT EXISTS idx_event_participants_player1 ON event_participants(player1_id);
    CREATE INDEX IF NOT EXISTS idx_event_participants_player2 ON event_participants(player2_id);

    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL,
      round INTEGER NOT NULL,
      court INTEGER,
      team1_id INTEGER NOT NULL,
      team2_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      score_team1_set1 INTEGER,
      score_team2_set1 INTEGER,
      score_team1_set2 INTEGER,
      score_team2_set2 INTEGER,
      score_team1_set3 INTEGER,
      score_team2_set3 INTEGER,
      winner_id INTEGER,
      scheduled_time INTEGER,
      started_at INTEGER,
      finished_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
      FOREIGN KEY (team1_id) REFERENCES event_participants(id),
      FOREIGN KEY (team2_id) REFERENCES event_participants(id),
      FOREIGN KEY (winner_id) REFERENCES event_participants(id)
    );

    CREATE INDEX IF NOT EXISTS idx_matches_event ON matches(event_id);
    CREATE INDEX IF NOT EXISTS idx_matches_round ON matches(round);
    CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
    CREATE INDEX IF NOT EXISTS idx_matches_team1 ON matches(team1_id);
    CREATE INDEX IF NOT EXISTS idx_matches_team2 ON matches(team2_id);
  `);

  // Migração 2: Adicionar coluna start_time na tabela events
  try {
    await db.execAsync(`
      ALTER TABLE events ADD COLUMN start_time TEXT;
    `);
  } catch (error: any) {
    // Ignora erro se a coluna já existir
    if (!error.message?.includes('duplicate column')) {
      if (__DEV__) {
        console.warn('Migration 2 warning:', error);
      }
    }
  }

  // Migração 3: Adicionar coluna num_sets na tabela events
  try {
    await db.execAsync(`
      ALTER TABLE events ADD COLUMN num_sets INTEGER NOT NULL DEFAULT 1;
    `);
  } catch (error: any) {
    // Ignora erro se a coluna já existir
    if (!error.message?.includes('duplicate column')) {
      if (__DEV__) {
        console.warn('Migration 3 warning:', error);
      }
    }
  }

  // Migração 4: Adicionar colunas score_ruleset_id e score_ruleset_config na tabela events
  try {
    await db.execAsync(`
      ALTER TABLE events ADD COLUMN score_ruleset_id TEXT;
      ALTER TABLE events ADD COLUMN score_ruleset_config TEXT;
    `);
  } catch (error: any) {
    // Ignora erro se a coluna já existir
    if (!error.message?.includes('duplicate column')) {
      if (__DEV__) {
        console.warn('Migration 4 warning:', error);
      }
    }
  }

  // Migração 5: Adicionar colunas de W.O. na tabela matches
  try {
    await db.execAsync(`
      ALTER TABLE matches ADD COLUMN outcome_type TEXT;
      ALTER TABLE matches ADD COLUMN walkover_winner_team_id INTEGER;
      ALTER TABLE matches ADD COLUMN walkover_reason TEXT;
    `);
  } catch (error: any) {
    // Ignora erro se a coluna já existir
    if (!error.message?.includes('duplicate column')) {
      if (__DEV__) {
        console.warn('Migration 5 warning:', error);
      }
    }
  }

  // Migração 6: Criar tabela premium_status
  try {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS premium_status (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT NOT NULL UNIQUE,
        is_premium INTEGER NOT NULL DEFAULT 0,
        purchase_token TEXT,
        last_verified_at INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_premium_key ON premium_status(key);
    `);
  } catch (error: any) {
    if (__DEV__) {
      console.warn('Migration 6 warning:', error);
    }
  }
}
