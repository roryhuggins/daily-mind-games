import type { ScoreRow } from "@/lib/stats";

// Score per puzzle for each player, drawn as plain SVG (no chart library needed).
export function Trend({ rows, players }: { rows: ScoreRow[]; players: { id: string; name: string; color: string }[] }) {
  const puzzles = [...new Set(rows.map((r) => r.puzzle))].sort((a, b) => a - b);
  if (puzzles.length < 2) return <p className="muted">The chart appears after two days of scores.</p>;
  const W = 640, H = 240, L = 36, R = 12, T = 10, B = 26;
  const max = Math.max(500, ...rows.map((r) => r.score));
  const x = (p: number) => L + ((puzzles.indexOf(p)) / (puzzles.length - 1)) * (W - L - R);
  const y = (s: number) => T + (1 - s / max) * (H - T - B);
  const ticks = [0, 100, 200, 300, 400, 500, 600, 700].filter((t) => t <= max);
  const labelEvery = Math.ceil(puzzles.length / 10);
  return (
    <>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Krillion scores over time">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="var(--line)" />
            <text x={L - 6} y={y(t) + 4} textAnchor="end">{t}</text>
          </g>
        ))}
        {puzzles.map((p, i) =>
          i % labelEvery === 0 || i === puzzles.length - 1 ? (
            <text key={p} x={x(p)} y={H - 8} textAnchor="middle">#{p}</text>
          ) : null
        )}
        {players.map((pl) => {
          const pts = rows.filter((r) => r.player_id === pl.id).sort((a, b) => a.puzzle - b.puzzle);
          if (pts.length === 0) return null;
          return (
            <g key={pl.id}>
              <polyline fill="none" stroke={pl.color} strokeWidth={2} strokeLinejoin="round"
                points={pts.map((r) => `${x(r.puzzle)},${y(r.score)}`).join(" ")} />
              {pts.map((r) => (
                <circle key={r.puzzle} cx={x(r.puzzle)} cy={y(r.score)} r={3.5} fill={pl.color}>
                  <title>{`${pl.name} · #${r.puzzle} · ${r.score}`}</title>
                </circle>
              ))}
            </g>
          );
        })}
      </svg>
      <div className="legend">
        {players.map((p) => (
          <span key={p.id}><i style={{ background: p.color }} />{p.name}</span>
        ))}
      </div>
    </>
  );
}
