const MAP: Record<string, string> = {
  black_large_square: "⬛",
  bubbles: "🫧",
  fish: "🐟",
  squid: "🦑",
  izakaya_lantern: "🏮",
  star2: "🌟",
  shrimp: "🦐",
};
export function Emojis({ codes }: { codes: string[] }) {
  return <span className="emojis">{codes.map((c) => MAP[c] ?? "❔").join("")}</span>;
}
