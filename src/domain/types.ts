// Tipos de domínio

export type EventFormat = 'groups_finals' | 'round_robin' | 'rotating';
export type EventStatus = 'active' | 'finished' | 'archived';
export type MatchStatus = 'pending' | 'finished';
export type PlayerLevel = 'beginner' | 'intermediate' | 'advanced' | 'professional';

export interface Player {
  id: number;
  name: string;
  nickname?: string;
  contact?: string;
  level?: PlayerLevel;
  avatar_uri?: string;
  created_at: number;
  updated_at: number;
}

export interface Event {
  id: number;
  name: string;
  date: number;
  start_time?: string; // HH:MM format
  location?: string;
  category?: PlayerLevel;
  format: EventFormat;
  num_courts: number;
  num_sets: number;
  game_duration_minutes: number;
  points_per_win: number;
  tiebreak_criteria: string[]; // JSON array
  score_ruleset_id?: string; // 'fast_4' | 'normal_6' | 'super_tiebreak'
  score_ruleset_config?: string; // JSON opcional para customizações
  status: EventStatus;
  created_at: number;
  updated_at: number;
}

export interface EventParticipant {
  id: number;
  event_id: number;
  player1_id: number;
  player2_id?: number; // NULL para formato rotativo
  team_name?: string;
  created_at: number;
}

export type MatchOutcomeType = 'played' | 'walkover';

export interface Match {
  id: number;
  event_id: number;
  round: number;
  court?: number;
  team1_id: number;
  team2_id: number;
  status: MatchStatus;
  score_team1_set1?: number;
  score_team2_set1?: number;
  score_team1_set2?: number;
  score_team2_set2?: number;
  score_team1_set3?: number;
  score_team2_set3?: number;
  winner_id?: number;
  outcome_type?: MatchOutcomeType; // 'played' | 'walkover'
  walkover_winner_team_id?: number; // ID do time vencedor quando outcome_type = 'walkover'
  walkover_reason?: string; // Motivo do W.O. (opcional)
  scheduled_time?: number;
  started_at?: number;
  finished_at?: number;
  created_at: number;
  updated_at: number;
}

export interface RankingEntry {
  position: number;
  participant: EventParticipant;
  wins: number;
  losses: number;
  points: number;
  gamesFor: number;
  gamesAgainst: number;
  gameDifference: number;
}
