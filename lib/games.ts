// Parsers for game share messages posted in Slack.
// Slack delivers emoji as :shortcodes:, but pasted unicode is handled too.

export type KrillionSlot = { slot: number; emoji: string; tier: string; points: number };

export type ParsedScore = {
  game: string;
  puzzle: number;
  score: number;
  solved: boolean;
  details: Record<string, unknown>;
  /** Date the puzzle belongs to, when the game number tells us (YYYY-MM-DD). */
  playedOn?: string;
  slots?: KrillionSlot[];
};

export type GameInfo = {
  id: string;
  name: string;
  /** true when a bigger score is better */
  higherIsBetter: boolean;
  scoreLabel: string;
};

export const GAMES: Record<string, GameInfo> = {
  krillion: { id: "krillion", name: "Krillion", higherIsBetter: true, scoreLabel: "points" },
  wordle: { id: "wordle", name: "Wordle", higherIsBetter: false, scoreLabel: "guesses" },
  connections: { id: "connections", name: "Connections", higherIsBetter: false, scoreLabel: "mistakes" },
};

// Krillion tiers. Values checked against every total posted in the chat so far.
export const KRILLION_TIERS: Record<string, { tier: string; points: number }> = {
  black_large_square: { tier: "Miss", points: 0 },
  bubbles: { tier: "Plankton", points: 10 },
  fish: { tier: "Schooler", points: 30 },
  squid: { tier: "Rare", points: 60 },
  izakaya_lantern: { tier: "Deep cut", points: 85 },
  star2: { tier: "One in a Krillion", points: 100 },
};
export const KRILLION_TIER_ORDER = ["Miss", "Plankton", "Too clever", "Schooler", "Rare", "Deep cut", "One in a Krillion"];

const UNICODE_TO_SHORTCODE: Record<string, string> = {
  "⬛": "black_large_square",
  "🫧": "bubbles",
  "🐟": "fish",
  "🦑": "squid",
  "🏮": "izakaya_lantern",
  "🌟": "star2",
  "🟩": "large_green_square",
  "🟨": "large_yellow_square",
  "⬜": "white_large_square",
  "🟦": "large_blue_square",
  "🟪": "large_purple_square",
};

/** Split a run of emoji (":fish::squid:" or "🐟🦑") into shortcodes. */
export function emojiTokens(s: string): string[] {
  const out: string[] = [];
  const re = /:([a-z0-9_+-]+):|(\p{Extended_Pictographic}|[⬛⬜\u{1F7E5}-\u{1F7EB}])️?/gu;
  for (const m of s.matchAll(re)) {
    if (m[1]) out.push(m[1]);
    else if (m[2]) out.push(UNICODE_TO_SHORTCODE[m[2]] ?? m[2]);
  }
  return out;
}

// Krillion #1 was on 2026-07-16 (#112 = 2026-11-04, #118 = 2026-11-10).
const KRILLION_EPOCH = Date.UTC(2026, 6, 15);
export function krillionDate(puzzle: number): string {
  return new Date(KRILLION_EPOCH + puzzle * 86_400_000).toISOString().slice(0, 10);
}

function parseKrillion(text: string): ParsedScore | null {
  const m = text.match(/Krillion\s*#\s*(\d+)[^\n]*\n\s*(\d+)\s*\n+([^\n]+)/i);
  if (!m) return null;
  const puzzle = Number(m[1]);
  const posted = Number(m[2]);
  const codes = emojiTokens(m[3]).filter((c) => c !== "shrimp");
  const slots: KrillionSlot[] = codes.map((emoji, i) => {
    const t = KRILLION_TIERS[emoji] ?? { tier: `Unknown (${emoji})`, points: NaN };
    return { slot: i + 1, emoji, tier: t.tier, points: t.points };
  });
  // An unrecognised emoji is probably a new tier (e.g. "Too clever" = 15). If exactly one
  // is unknown we can infer its value from the posted total.
  const unknown = slots.filter((s) => Number.isNaN(s.points));
  if (unknown.length > 0) {
    const known = slots.filter((s) => !Number.isNaN(s.points)).reduce((a, s) => a + s.points, 0);
    const each = (posted - known) / unknown.length;
    for (const s of unknown) s.points = Number.isInteger(each) && each >= 0 ? each : 0;
  }
  return {
    game: "krillion",
    puzzle,
    score: posted,
    solved: true,
    playedOn: krillionDate(puzzle),
    details: {
      emojis: codes,
      misses: slots.filter((s) => s.points === 0).length,
      krillions: slots.filter((s) => s.emoji === "star2").length,
      slotsSum: slots.reduce((a, s) => a + s.points, 0),
    },
    slots,
  };
}

function parseWordle(text: string): ParsedScore | null {
  const m = text.match(/Wordle\s+([\d,.]+)\s+([1-6X])\/6(\*?)/i);
  if (!m) return null;
  const solved = m[2].toUpperCase() !== "X";
  return {
    game: "wordle",
    puzzle: Number(m[1].replace(/[,.]/g, "")),
    score: solved ? Number(m[2]) : 7,
    solved,
    details: { hardMode: m[3] === "*" },
  };
}

function parseConnections(text: string): ParsedScore | null {
  const m = text.match(/Connections\s*\n?\s*Puzzle\s*#\s*([\d,]+)/i);
  if (!m) return null;
  const rows = text
    .slice(m.index! + m[0].length)
    .split("\n")
    .map(emojiTokens)
    .filter((r) => r.length === 4);
  if (rows.length === 0) return null;
  const solvedRows = rows.filter((r) => r.every((c) => c === r[0])).length;
  const mistakes = rows.length - solvedRows;
  return {
    game: "connections",
    puzzle: Number(m[1].replace(/,/g, "")),
    score: mistakes,
    solved: solvedRows === 4,
    details: { rows: rows.length },
  };
}

const PARSERS = [parseKrillion, parseWordle, parseConnections];

/** All scores in one Slack message (someone may paste several games at once). */
export function parseMessage(text: string): ParsedScore[] {
  const out: ParsedScore[] = [];
  for (const p of PARSERS) {
    const r = p(text);
    if (r) out.push(r);
  }
  return out;
}
