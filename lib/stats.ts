import { q } from "./db";
import { GAMES } from "./games";

export type PlayerRow = {
  player_id: string;
  name: string;
  played: number;
  avg: number;
  best: number;
  worst: number;
  wins: number;
  krillions: number;
  misses: number;
  deep: number;
  vs_avg: number;
};

export async function krillionTable(): Promise<PlayerRow[]> {
  return q<PlayerRow>(`
    WITH s AS (
      SELECT sc.*, p.name,
             MAX(score) OVER (PARTITION BY puzzle) AS top,
             AVG(score) OVER (PARTITION BY puzzle) AS puzzle_avg
      FROM scores sc JOIN players p ON p.id = sc.player_id
      WHERE game = 'krillion'
    ),
    a AS (
      SELECT player_id,
             COUNT(*) FILTER (WHERE points = 0) AS misses,
             COUNT(*) FILTER (WHERE points >= 85) AS deep,
             COUNT(*) FILTER (WHERE points = 100) AS krillions
      FROM krillion_answers GROUP BY player_id
    )
    SELECT s.player_id, s.name,
           COUNT(*)::int AS played,
           ROUND(AVG(score))::int AS avg,
           MAX(score)::int AS best,
           MIN(score)::int AS worst,
           COUNT(*) FILTER (WHERE score = top)::int AS wins,
           COALESCE(MAX(a.krillions), 0)::int AS krillions,
           COALESCE(MAX(a.misses), 0)::int AS misses,
           COALESCE(MAX(a.deep), 0)::int AS deep,
           ROUND(AVG(score - puzzle_avg))::int AS vs_avg
    FROM s LEFT JOIN a ON a.player_id = s.player_id
    GROUP BY s.player_id, s.name
    ORDER BY avg DESC`);
}

export type ScoreRow = {
  puzzle: number;
  played_on: string;
  player_id: string;
  name: string;
  score: number;
  emojis: string[];
};

export async function krillionScores(): Promise<ScoreRow[]> {
  const rows = await q(`
    SELECT puzzle, to_char(played_on, 'YYYY-MM-DD') AS played_on, player_id, p.name, score, details
    FROM scores sc JOIN players p ON p.id = sc.player_id
    WHERE game = 'krillion'
    ORDER BY puzzle DESC, score DESC`);
  return rows.map((r) => ({
    puzzle: r.puzzle,
    played_on: r.played_on,
    player_id: r.player_id,
    name: r.name,
    score: r.score,
    emojis: (typeof r.details === "string" ? JSON.parse(r.details) : r.details).emojis ?? [],
  }));
}

export type TierRow = { player_id: string; tier: string; n: number };
export async function krillionTiers(): Promise<TierRow[]> {
  return q<TierRow>(`SELECT player_id, tier, COUNT(*)::int AS n FROM krillion_answers GROUP BY player_id, tier`);
}

export type TopicRow = { topic: string; player_id: string; name: string; answers: number; avg: number };
export async function krillionTopics(): Promise<TopicRow[]> {
  return q<TopicRow>(`
    SELECT COALESCE(kp.topic, 'Other') AS topic, ka.player_id, p.name,
           COUNT(*)::int AS answers, ROUND(AVG(ka.points))::int AS avg
    FROM krillion_answers ka
    JOIN krillion_prompts kp ON kp.puzzle = ka.puzzle AND kp.slot = ka.slot
    JOIN players p ON p.id = ka.player_id
    GROUP BY 1, 2, 3
    ORDER BY 1, avg DESC`);
}

export type PromptRow = { puzzle: number; slot: number; prompt: string; topic: string | null };
export async function krillionPrompts(): Promise<PromptRow[]> {
  return q<PromptRow>(`SELECT puzzle, slot, prompt, topic FROM krillion_prompts ORDER BY puzzle DESC, slot`);
}

export type OtherGameRow = { game: string; name: string; played: number; avg: number; solved: number };
export async function otherGames(): Promise<OtherGameRow[]> {
  return q<OtherGameRow>(`
    SELECT game, p.name, COUNT(*)::int AS played, ROUND(AVG(score)::numeric, 2)::float AS avg,
           COUNT(*) FILTER (WHERE solved)::int AS solved
    FROM scores sc JOIN players p ON p.id = sc.player_id
    WHERE game <> 'krillion'
    GROUP BY game, p.name
    ORDER BY game, avg ${GAMES.wordle.higherIsBetter ? "DESC" : "ASC"}`);
}
