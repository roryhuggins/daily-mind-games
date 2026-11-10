import { q } from "./db";
import { parseMessage } from "./games";

export type SlackMessage = {
  ts: string;          // Slack message ts, e.g. "1794307172.317279"
  user: string;        // Slack user id
  user_name: string;   // display name
  text: string;
};

function londonDate(ts: string): string {
  return new Date(Number(ts) * 1000).toLocaleDateString("en-CA", { timeZone: "Europe/London" });
}

export async function ingest(messages: SlackMessage[]) {
  let saved = 0;
  let latest: string | null = null;
  const skipped: string[] = [];
  // Oldest first, so if someone posts the same puzzle twice the first post wins.
  const sorted = [...messages].sort((a, b) => Number(a.ts) - Number(b.ts));
  for (const m of sorted) {
    if (!m.user || !m.text) continue;
    if (!latest || Number(m.ts) > Number(latest)) latest = m.ts;
    const parsed = parseMessage(m.text);
    if (parsed.length === 0) continue;
    await q(
      `INSERT INTO players (id, name) VALUES ($1, $2)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, updated_at = now()`,
      [m.user, m.user_name || m.user]
    );
    for (const p of parsed) {
      const rows = await q(
        `INSERT INTO scores (game, puzzle, player_id, played_on, score, solved, details, slack_ts, raw_text)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (game, puzzle, player_id) DO NOTHING
         RETURNING id`,
        [p.game, p.puzzle, m.user, p.playedOn ?? londonDate(m.ts), p.score, p.solved, JSON.stringify(p.details), m.ts, m.text]
      );
      if (rows.length === 0) {
        skipped.push(`${p.game} #${p.puzzle} ${m.user_name}`);
        continue;
      }
      saved++;
      for (const s of p.slots ?? []) {
        await q(
          `INSERT INTO krillion_answers (puzzle, player_id, slot, tier, points)
           VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
          [p.puzzle, m.user, s.slot, s.tier, s.points]
        );
      }
    }
  }
  await q(`INSERT INTO ingest_runs (messages, scores, latest_ts) VALUES ($1,$2,$3)`, [messages.length, saved, latest]);
  return { received: messages.length, saved, alreadyHad: skipped.length, latest_ts: latest };
}

export async function lastIngest() {
  const rows = await q(`SELECT ran_at, messages, scores, latest_ts FROM ingest_runs ORDER BY id DESC LIMIT 1`);
  return rows[0] ?? null;
}

export async function savePrompts(puzzle: number, prompts: { slot: number; prompt: string; topic?: string }[]) {
  for (const p of prompts) {
    await q(
      `INSERT INTO krillion_prompts (puzzle, slot, prompt, topic) VALUES ($1,$2,$3,$4)
       ON CONFLICT (puzzle, slot) DO UPDATE SET prompt = EXCLUDED.prompt, topic = EXCLUDED.topic`,
      [puzzle, p.slot, p.prompt, p.topic ?? null]
    );
  }
  return { puzzle, saved: prompts.length };
}
