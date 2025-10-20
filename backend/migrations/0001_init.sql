CREATE TABLE IF NOT EXISTS games (game_id TEXT PRIMARY KEY, home_team_id TEXT, away_team_id TEXT, kickoff_ts TIMESTAMPTZ, venue TEXT, week INT);
