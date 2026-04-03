
import React, { useState } from 'react';
import { IconCopy, IconCheck, IconDatabase, IconCode, IconAlertTriangle, IconActivity } from './ui/Icons';
import { vibrate } from '../utils/godMode';

const SupabaseSchema: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const schemaSQL = `-- SUPABASE SCHEMA FOR PICKLEQUEUE
-- Copy and paste this into the Supabase SQL Editor to set up your database.

-- 1. ENABLE EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. CREATE TABLES

-- Players Table
CREATE TABLE IF NOT EXISTS public.players (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    skill INTEGER DEFAULT 1,
    dupr_rating NUMERIC,
    elo INTEGER DEFAULT 1200,
    is_present BOOLEAN DEFAULT TRUE,
    games_played INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    clutch_wins INTEGER DEFAULT 0,
    bagels_given INTEGER DEFAULT 0,
    total_points INTEGER DEFAULT 0,
    bonus_points INTEGER DEFAULT 0,
    no_shows INTEGER DEFAULT 0,
    badges JSONB DEFAULT '[]'::jsonb,
    stats JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leagues Table
CREATE TABLE IF NOT EXISTS public.leagues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    start_date TIMESTAMPTZ,
    weeks INTEGER DEFAULT 0,
    days_per_week INTEGER DEFAULT 0,
    players JSONB DEFAULT '[]'::jsonb,
    days JSONB DEFAULT '[]'::jsonb,
    matches JSONB DEFAULT '[]'::jsonb,
    final_standings JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Matches Table
CREATE TABLE IF NOT EXISTS public.matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    league_id UUID REFERENCES public.leagues(id) ON DELETE CASCADE,
    day_id TEXT,
    court_id INTEGER,
    round INTEGER,
    team_a JSONB DEFAULT '[]'::jsonb,
    team_b JSONB DEFAULT '[]'::jsonb,
    score_a INTEGER,
    score_b INTEGER,
    is_completed BOOLEAN DEFAULT FALSE,
    type TEXT,
    status TEXT,
    no_show_player_ids JSONB DEFAULT '[]'::jsonb,
    is_forfeit BOOLEAN DEFAULT FALSE,
    order_index INTEGER DEFAULT 0,
    events JSONB DEFAULT '[]'::jsonb,
    highlights JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tournaments Table
CREATE TABLE IF NOT EXISTS public.tournaments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    date TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'active',
    stage TEXT DEFAULT 'group',
    match_type TEXT,
    team_mode TEXT,
    groups JSONB DEFAULT '[]'::jsonb,
    format TEXT DEFAULT 'round_robin',
    courts INTEGER DEFAULT 1,
    players JSONB DEFAULT '[]'::jsonb,
    teams JSONB DEFAULT '[]'::jsonb,
    matches JSONB DEFAULT '[]'::jsonb,
    winner_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sessions Table
CREATE TABLE IF NOT EXISTS public.sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date TIMESTAMPTZ DEFAULT NOW(),
    active_courts INTEGER DEFAULT 1,
    rotation_type TEXT,
    play_mode TEXT,
    team_assignment_mode TEXT,
    history JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.5. ENSURE COLUMNS EXIST (MIGRATIONS)
-- This block ensures that if tables already exist, missing columns are added.
DO $$ 
BEGIN 
    -- Players table migrations
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='players' AND column_name='badges') THEN
        ALTER TABLE public.players ADD COLUMN badges JSONB DEFAULT '[]'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='players' AND column_name='stats') THEN
        ALTER TABLE public.players ADD COLUMN stats JSONB DEFAULT '{}'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='players' AND column_name='clutch_wins') THEN
        ALTER TABLE public.players ADD COLUMN clutch_wins INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='players' AND column_name='bagels_given') THEN
        ALTER TABLE public.players ADD COLUMN bagels_given INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='players' AND column_name='dupr_rating') THEN
        ALTER TABLE public.players ADD COLUMN dupr_rating NUMERIC;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='players' AND column_name='elo') THEN
        ALTER TABLE public.players ADD COLUMN elo INTEGER DEFAULT 1200;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='players' AND column_name='is_present') THEN
        ALTER TABLE public.players ADD COLUMN is_present BOOLEAN DEFAULT TRUE;
    END IF;
    
    -- Leagues table migrations
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='leagues' AND column_name='final_standings') THEN
        ALTER TABLE public.leagues ADD COLUMN final_standings JSONB DEFAULT '[]'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='leagues' AND column_name='matches') THEN
        ALTER TABLE public.leagues ADD COLUMN matches JSONB DEFAULT '[]'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='leagues' AND column_name='players') THEN
        ALTER TABLE public.leagues ADD COLUMN players JSONB DEFAULT '[]'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='leagues' AND column_name='days') THEN
        ALTER TABLE public.leagues ADD COLUMN days JSONB DEFAULT '[]'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='leagues' AND column_name='weeks') THEN
        ALTER TABLE public.leagues ADD COLUMN weeks INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='leagues' AND column_name='days_per_week') THEN
        ALTER TABLE public.leagues ADD COLUMN days_per_week INTEGER DEFAULT 0;
    END IF;

    -- Matches table migrations
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='matches' AND column_name='no_show_player_ids') THEN
        ALTER TABLE public.matches ADD COLUMN no_show_player_ids JSONB DEFAULT '[]'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='matches' AND column_name='is_forfeit') THEN
        ALTER TABLE public.matches ADD COLUMN is_forfeit BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='matches' AND column_name='order_index') THEN
        ALTER TABLE public.matches ADD COLUMN order_index INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='matches' AND column_name='events') THEN
        ALTER TABLE public.matches ADD COLUMN events JSONB DEFAULT '[]'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='matches' AND column_name='highlights') THEN
        ALTER TABLE public.matches ADD COLUMN highlights JSONB DEFAULT '[]'::jsonb;
    END IF;

    -- Tournaments table migrations
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='tournaments' AND column_name='matches') THEN
        ALTER TABLE public.tournaments ADD COLUMN matches JSONB DEFAULT '[]'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='tournaments' AND column_name='players') THEN
        ALTER TABLE public.tournaments ADD COLUMN players JSONB DEFAULT '[]'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='tournaments' AND column_name='teams') THEN
        ALTER TABLE public.tournaments ADD COLUMN teams JSONB DEFAULT '[]'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='tournaments' AND column_name='groups') THEN
        ALTER TABLE public.tournaments ADD COLUMN groups JSONB DEFAULT '[]'::jsonb;
    END IF;

    -- Sessions table migrations
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='sessions' AND column_name='history') THEN
        ALTER TABLE public.sessions ADD COLUMN history JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- 3. CREATE VIEWS

-- League Leaderboard View
DROP VIEW IF EXISTS public.league_leaderboard CASCADE;
CREATE OR REPLACE VIEW public.league_leaderboard AS
WITH player_stats_per_match AS (
    -- Singles Team A
    SELECT 
        league_id,
        team_a->>0 as player_name,
        CASE WHEN score_a > score_b THEN 1 ELSE 0 END as wins,
        CASE WHEN score_a < score_b THEN 1 ELSE 0 END as losses,
        COALESCE(score_a, 0) as points,
        CASE WHEN score_a > score_b AND score_a - score_b = 1 THEN 1 ELSE 0 END as clutch_wins,
        CASE WHEN score_a > score_b AND score_b = 0 THEN 1 ELSE 0 END as bagels_given,
        1 as games_played
    FROM public.matches
    WHERE is_completed = TRUE AND team_a IS NOT NULL AND jsonb_array_length(team_a) > 0
    
    UNION ALL
    
    -- Singles Team B
    SELECT 
        league_id,
        team_b->>0 as player_name,
        CASE WHEN score_b > score_a THEN 1 ELSE 0 END as wins,
        CASE WHEN score_b < score_a THEN 1 ELSE 0 END as losses,
        COALESCE(score_b, 0) as points,
        CASE WHEN score_b > score_a AND score_b - score_a = 1 THEN 1 ELSE 0 END as clutch_wins,
        CASE WHEN score_b > score_a AND score_a = 0 THEN 1 ELSE 0 END as bagels_given,
        1 as games_played
    FROM public.matches
    WHERE is_completed = TRUE AND team_b IS NOT NULL AND jsonb_array_length(team_b) > 0

    UNION ALL

    -- Doubles Team A Player 2 (if exists)
    SELECT 
        league_id,
        team_a->>1 as player_name,
        CASE WHEN score_a > score_b THEN 1 ELSE 0 END as wins,
        CASE WHEN score_a < score_b THEN 1 ELSE 0 END as losses,
        COALESCE(score_a, 0) as points,
        CASE WHEN score_a > score_b AND score_a - score_b = 1 THEN 1 ELSE 0 END as clutch_wins,
        CASE WHEN score_a > score_b AND score_b = 0 THEN 1 ELSE 0 END as bagels_given,
        1 as games_played
    FROM public.matches
    WHERE is_completed = TRUE AND team_a IS NOT NULL AND jsonb_array_length(team_a) > 1

    UNION ALL

    -- Doubles Team B Player 2 (if exists)
    SELECT 
        league_id,
        team_b->>1 as player_name,
        CASE WHEN score_b > score_a THEN 1 ELSE 0 END as wins,
        CASE WHEN score_b < score_a THEN 1 ELSE 0 END as losses,
        COALESCE(score_b, 0) as points,
        CASE WHEN score_b > score_a AND score_b - score_a = 1 THEN 1 ELSE 0 END as clutch_wins,
        CASE WHEN score_b > score_a AND score_a = 0 THEN 1 ELSE 0 END as bagels_given,
        1 as games_played
    FROM public.matches
    WHERE is_completed = TRUE AND team_b IS NOT NULL AND jsonb_array_length(team_b) > 1
)
SELECT 
    p.id as player_id,
    p.name,
    p.skill,
    COALESCE(SUM(ps.games_played), 0) as games_played,
    COALESCE(SUM(ps.wins), 0) as wins,
    COALESCE(SUM(ps.losses), 0) as losses,
    COALESCE(SUM(ps.points), 0) as points,
    COALESCE(SUM(ps.points), 0) as total_points,
    COALESCE(SUM(ps.clutch_wins), 0) as clutch_wins,
    COALESCE(SUM(ps.bagels_given), 0) as bagels_given,
    CASE 
        WHEN SUM(ps.games_played) > 0 THEN ROUND(CAST(SUM(ps.points) AS NUMERIC) / SUM(ps.games_played), 2)
        ELSE 0 
    END as ppg,
    p.current_streak,
    p.badges,
    p.stats,
    ps.league_id,
    l.name as league_name
FROM 
    public.players p
JOIN 
    player_stats_per_match ps ON p.name = ps.player_name
JOIN
    public.leagues l ON ps.league_id = l.id
GROUP BY 
    p.id, p.name, p.skill, p.current_streak, p.badges, p.stats, ps.league_id, l.name;

-- Recent Matches View
DROP VIEW IF EXISTS public.recent_matches;
CREATE OR REPLACE VIEW public.recent_matches AS
SELECT 
    m.*,
    l.name as league_name
FROM 
    public.matches m
JOIN 
    public.leagues l ON m.league_id = l.id
ORDER BY 
    m.created_at DESC;

-- 4. CREATE FUNCTIONS (RPC)

-- Insert Singles Match
CREATE OR REPLACE FUNCTION public.insert_singles_match(
    p_winner_name TEXT,
    p_loser_name TEXT,
    p_winner_score INTEGER,
    p_loser_score INTEGER,
    p_match_date TIMESTAMPTZ,
    p_league_id UUID,
    p_context TEXT,
    p_created_by TEXT
) RETURNS VOID AS $$
BEGIN
    -- Update Winner Stats
    UPDATE public.players 
    SET 
        wins = wins + 1,
        games_played = games_played + 1,
        current_streak = CASE WHEN current_streak < 0 THEN 1 ELSE current_streak + 1 END,
        total_points = total_points + p_winner_score,
        clutch_wins = clutch_wins + (CASE WHEN p_winner_score - p_loser_score = 1 THEN 1 ELSE 0 END),
        bagels_given = bagels_given + (CASE WHEN p_loser_score = 0 THEN 1 ELSE 0 END)
    WHERE name = p_winner_name;

    -- Update Loser Stats
    UPDATE public.players 
    SET 
        losses = losses + 1,
        games_played = games_played + 1,
        current_streak = CASE WHEN current_streak > 0 THEN -1 ELSE current_streak - 1 END,
        total_points = total_points + p_loser_score
    WHERE name = p_loser_name;

    -- Insert Match Record
    INSERT INTO public.matches (
        league_id,
        team_a,
        team_b,
        score_a,
        score_b,
        is_completed,
        type,
        status,
        created_at
    ) VALUES (
        p_league_id,
        jsonb_build_array(p_winner_name),
        jsonb_build_array(p_loser_name),
        p_winner_score,
        p_loser_score,
        TRUE,
        'singles',
        'completed',
        p_match_date
    );
END;
$$ LANGUAGE plpgsql;

-- Insert Doubles Match
CREATE OR REPLACE FUNCTION public.insert_doubles_match(
    p_team1_player1 TEXT,
    p_team1_player2 TEXT,
    p_team2_player1 TEXT,
    p_team2_player2 TEXT,
    p_winning_team INTEGER,
    p_team1_score INTEGER,
    p_team2_score INTEGER,
    p_match_date TIMESTAMPTZ,
    p_league_id UUID,
    p_context TEXT,
    p_created_by TEXT
) RETURNS VOID AS $$
DECLARE
    winner1 TEXT;
    winner2 TEXT;
    loser1 TEXT;
    loser2 TEXT;
    winner_score INTEGER;
    loser_score INTEGER;
BEGIN
    IF p_winning_team = 1 THEN
        winner1 := p_team1_player1;
        winner2 := p_team1_player2;
        loser1 := p_team2_player1;
        loser2 := p_team2_player2;
        winner_score := p_team1_score;
        loser_score := p_team2_score;
    ELSE
        winner1 := p_team2_player1;
        winner2 := p_team2_player2;
        loser1 := p_team1_player1;
        loser2 := p_team1_player2;
        winner_score := p_team2_score;
        loser_score := p_team1_score;
    END IF;

    -- Update Winners
    UPDATE public.players SET 
        wins = wins + 1, 
        games_played = games_played + 1,
        current_streak = CASE WHEN current_streak < 0 THEN 1 ELSE current_streak + 1 END,
        total_points = total_points + winner_score,
        clutch_wins = clutch_wins + (CASE WHEN winner_score - loser_score = 1 THEN 1 ELSE 0 END),
        bagels_given = bagels_given + (CASE WHEN loser_score = 0 THEN 1 ELSE 0 END)
    WHERE name IN (winner1, winner2);

    -- Update Losers
    UPDATE public.players SET 
        losses = losses + 1, 
        games_played = games_played + 1,
        current_streak = CASE WHEN current_streak > 0 THEN -1 ELSE current_streak - 1 END,
        total_points = total_points + loser_score
    WHERE name IN (loser1, loser2);

    -- Insert Match Record
    INSERT INTO public.matches (
        league_id,
        team_a,
        team_b,
        score_a,
        score_b,
        is_completed,
        type,
        status,
        created_at
    ) VALUES (
        p_league_id,
        jsonb_build_array(p_team1_player1, p_team1_player2),
        jsonb_build_array(p_team2_player1, p_team2_player2),
        p_team1_score,
        p_team2_score,
        TRUE,
        'doubles',
        'completed',
        p_match_date
    );
END;
$$ LANGUAGE plpgsql;

-- Get Head to Head
CREATE OR REPLACE FUNCTION public.get_head_to_head(
    p_player1 TEXT,
    p_player2 TEXT
) RETURNS TABLE (
    total_matches BIGINT,
    p1_wins BIGINT,
    p2_wins BIGINT,
    avg_score_p1 NUMERIC,
    avg_score_p2 NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT,
        COUNT(*) FILTER (WHERE (team_a @> jsonb_build_array(p_player1) AND score_a > score_b) OR (team_b @> jsonb_build_array(p_player1) AND score_b > score_a))::BIGINT,
        COUNT(*) FILTER (WHERE (team_a @> jsonb_build_array(p_player2) AND score_a > score_b) OR (team_b @> jsonb_build_array(p_player2) AND score_b > score_a))::BIGINT,
        AVG(CASE WHEN team_a @> jsonb_build_array(p_player1) THEN score_a ELSE score_b END)::NUMERIC,
        AVG(CASE WHEN team_a @> jsonb_build_array(p_player2) THEN score_a ELSE score_b END)::NUMERIC
    FROM public.matches
    WHERE 
        (team_a @> jsonb_build_array(p_player1) AND team_b @> jsonb_build_array(p_player2))
        OR 
        (team_a @> jsonb_build_array(p_player2) AND team_b @> jsonb_build_array(p_player1));
END;
$$ LANGUAGE plpgsql;

-- 5. ENABLE RLS (Row Level Security)
-- We allow public access (both anon and authenticated) for this backup tool.
-- In a production environment, you should restrict this to authenticated users only.

ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DO $$ 
BEGIN
    -- Players
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'players' AND policyname = 'Allow all access to authenticated users') THEN
        DROP POLICY "Allow all access to authenticated users" ON public.players;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'players' AND policyname = 'Public Access') THEN
        DROP POLICY "Public Access" ON public.players;
    END IF;
    
    -- Leagues
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'leagues' AND policyname = 'Allow all access to authenticated users') THEN
        DROP POLICY "Allow all access to authenticated users" ON public.leagues;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'leagues' AND policyname = 'Public Access') THEN
        DROP POLICY "Public Access" ON public.leagues;
    END IF;

    -- Matches
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'matches' AND policyname = 'Allow all access to authenticated users') THEN
        DROP POLICY "Allow all access to authenticated users" ON public.matches;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'matches' AND policyname = 'Public Access') THEN
        DROP POLICY "Public Access" ON public.matches;
    END IF;

    -- Tournaments
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tournaments' AND policyname = 'Allow all access to authenticated users') THEN
        DROP POLICY "Allow all access to authenticated users" ON public.tournaments;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tournaments' AND policyname = 'Public Access') THEN
        DROP POLICY "Public Access" ON public.tournaments;
    END IF;

    -- Sessions
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sessions' AND policyname = 'Allow all access to authenticated users') THEN
        DROP POLICY "Allow all access to authenticated users" ON public.sessions;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'sessions' AND policyname = 'Public Access') THEN
        DROP POLICY "Public Access" ON public.sessions;
    END IF;
END $$;

-- Create new unified public access policies
CREATE POLICY "Public Access" ON public.players FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Public Access" ON public.leagues FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Public Access" ON public.matches FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Public Access" ON public.tournaments FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Public Access" ON public.sessions FOR ALL TO public USING (true) WITH CHECK (true);
`;

  const handleCopy = () => {
    navigator.clipboard.writeText(schemaSQL);
    setCopied(true);
    vibrate('success');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8 pb-32 animate-in fade-in duration-700">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div className="space-y-2">
          <h2 className="text-4xl font-headline font-black italic text-on-surface uppercase transform -skew-x-12 tracking-tighter">
            SUPABASE <span className="text-primary">SCHEMA</span>
          </h2>
          <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-[0.4em] italic">
            Database Configuration & Migration
          </p>
        </div>
        <button
          onClick={handleCopy}
          className={`
            flex items-center gap-3 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all transform -skew-x-12 active:scale-95
            ${copied ? 'bg-green-600 text-white shadow-green-900/20' : 'bg-primary text-on-primary shadow-primary/20'}
            shadow-xl aura-glow
          `}
        >
          {copied ? <IconCheck size={18} /> : <IconCopy size={18} />}
          {copied ? 'COPIED TO SCROLL' : 'COPY SQL SCHEMA'}
        </button>
      </div>

      <div className="bg-amber-950/20 border-2 border-amber-500/30 rounded-[2.5rem] p-8 flex items-start gap-6 transform -skew-x-2">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/20 flex items-center justify-center shrink-0 border-2 border-amber-500/30">
          <IconAlertTriangle className="text-amber-500" size={28} />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-headline font-black italic text-amber-500 uppercase tracking-tight">SCHEMA CACHE WARNING</h3>
          <p className="text-sm text-amber-500/80 font-medium leading-relaxed">
            If you see errors like <code className="bg-amber-500/20 px-2 py-0.5 rounded font-bold">PGRST204</code>, it means your Supabase schema is out of sync. 
            Copy the SQL below and run it in your <span className="font-black underline">Supabase SQL Editor</span> to ensure all columns (like <code className="bg-amber-500/20 px-2 py-0.5 rounded font-bold">badges</code>) exist.
          </p>
        </div>
      </div>

      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-[3rem] blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
        <div className="relative bg-surface border-2 border-outline/10 rounded-[3rem] overflow-hidden shadow-2xl manga-shadow">
          <div className="bg-surface-variant/30 px-8 py-4 border-b border-outline/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <IconCode size={18} className="text-primary" />
              <span className="text-[10px] font-black text-on-surface-variant/60 uppercase tracking-[0.3em]">SQL Editor Script</span>
            </div>
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/30"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500/20 border border-amber-500/30"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/30"></div>
            </div>
          </div>
          <div className="p-8 overflow-x-auto custom-scrollbar bg-[#0a0a0a]">
            <pre className="text-xs font-mono text-zinc-400 leading-relaxed">
              {schemaSQL}
            </pre>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-surface border-2 border-outline/10 rounded-[2.5rem] p-8 space-y-6 manga-shadow">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border-2 border-primary/20">
              <IconDatabase className="text-primary" size={24} />
            </div>
            <h3 className="text-xl font-headline font-black italic text-on-surface uppercase tracking-tight">BACKUP STRATEGY</h3>
          </div>
          <ul className="space-y-4">
            {[
              'Run the SQL schema to create all required tables and columns.',
              'Enable "Auto-Sync" in the Backup settings to push data automatically.',
              'Use the "Push to Cloud" button for manual full-state backups.',
              'Ensure RLS policies allow authenticated access.'
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-4 group">
                <span className="w-6 h-6 rounded-lg bg-surface-variant/20 flex items-center justify-center text-[10px] font-black text-on-surface-variant/40 border border-outline/5 shrink-0 group-hover:border-primary/30 transition-colors">{i + 1}</span>
                <p className="text-sm text-on-surface-variant/70 font-medium">{step}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-surface border-2 border-outline/10 rounded-[2.5rem] p-8 space-y-6 manga-shadow">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center border-2 border-secondary/20">
              <IconActivity className="text-secondary" size={24} />
            </div>
            <h3 className="text-xl font-headline font-black italic text-on-surface uppercase tracking-tight">RESTORE STRATEGY</h3>
          </div>
          <ul className="space-y-4">
            {[
              'The app hydrates state from Supabase on every boot.',
              'Active leagues and players are prioritized from the cloud.',
              'Use "Pull from Cloud" to manually sync local state with Supabase.',
              'Hard Reset will clear local state but preserve cloud data.'
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-4 group">
                <span className="w-6 h-6 rounded-lg bg-surface-variant/20 flex items-center justify-center text-[10px] font-black text-on-surface-variant/40 border border-outline/5 shrink-0 group-hover:border-secondary/30 transition-colors">{i + 1}</span>
                <p className="text-sm text-on-surface-variant/70 font-medium">{step}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SupabaseSchema;
