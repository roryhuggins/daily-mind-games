import { Emojis } from "@/components/emoji";
import { Trend } from "@/components/trend";
import { GAMES, KRILLION_TIER_ORDER } from "@/lib/games";
import { lastIngest } from "@/lib/ingest";
import { krillionPrompts, krillionScores, krillionTable, krillionTiers, krillionTopics, otherGames } from "@/lib/stats";

export const dynamic = "force-dynamic";

const COLORS = ["var(--s1)", "var(--s2)", "var(--s3)", "var(--s4)", "var(--s5)", "var(--s6)", "var(--s7)"];
const TIER_COLORS: Record<string, string> = {
  Miss: "#9aa5b1",
  Plankton: "#bfe3f5",
  "Too clever": "#d9c6f2",
  Schooler: "#6cb8e6",
  Rare: "#2b7fc0",
  "Deep cut": "#e3742f",
  "One in a Krillion": "#f0c04a",
};
const MEDALS = ["🥇", "🥈", "🥉"];

const first = (name: string) => name.split(" ")[0];

export default async function Home() {
  const [table, scores, tiers, topics, prompts, others, last] = await Promise.all([
    krillionTable(), krillionScores(), krillionTiers(), krillionTopics(), krillionPrompts(), otherGames(), lastIngest(),
  ]);

  const players = table
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((p, i) => ({ id: p.player_id, name: first(p.name), color: COLORS[i % COLORS.length] }));

  const latestPuzzle = scores[0]?.puzzle;
  const today = scores.filter((s) => s.puzzle === latestPuzzle);
  const byPuzzle = new Map<number, typeof scores>();
  for (const s of scores) byPuzzle.set(s.puzzle, [...(byPuzzle.get(s.puzzle) ?? []), s]);

  const topicNames = [...new Set(topics.map((t) => t.topic))];

  return (
    <main>
      <header className="top">
        <div>
          <h1>🦐 Daily Mind leaderboard</h1>
          <div className="muted small">Scores from the daily-mind-challenges chat</div>
        </div>
        <div className="muted small">
          {last ? <>Updated {new Date(last.ran_at).toLocaleString("en-GB", { timeZone: "Europe/London", dateStyle: "medium", timeStyle: "short" })}</> : "No import yet"}
        </div>
      </header>

      {scores.length === 0 ? (
        <div className="card">No scores yet. They show up after the first import.</div>
      ) : (
        <div className="grid">
          <section className="card span-5">
            <h2>Krillion #{latestPuzzle} <span className="muted small">· {today[0]?.played_on}</span></h2>
            <table>
              <tbody>
                {today.map((s, i) => (
                  <tr key={s.player_id} className={i === 0 ? "lead" : ""}>
                    <td className="rank">{MEDALS[i] ? <span className="medal">{MEDALS[i]}</span> : i + 1}</td>
                    <td>{first(s.name)}</td>
                    <td><Emojis codes={s.emojis} /></td>
                    <td className="num"><b>{s.score}</b></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="card span-7">
            <h2>Scores over time</h2>
            <Trend rows={scores} players={players} />
          </section>

          <section className="card span-12">
            <h2>All-time Krillion table</h2>
            <div className="scroll">
              <table>
                <thead>
                  <tr>
                    <th></th><th>Player</th>
                    <th className="num">Played</th><th className="num">Average</th><th className="num">vs group</th>
                    <th className="num">Best</th><th className="num">Worst</th><th className="num">Daily wins</th>
                    <th className="num">Deep cuts</th><th className="num">🌟</th><th className="num">Misses</th>
                  </tr>
                </thead>
                <tbody>
                  {table.map((p, i) => (
                    <tr key={p.player_id} className={i === 0 ? "lead" : ""}>
                      <td className="rank">{i + 1}</td>
                      <td>{p.name}</td>
                      <td className="num">{p.played}</td>
                      <td className="num"><b>{p.avg}</b></td>
                      <td className="num">{p.vs_avg > 0 ? `+${p.vs_avg}` : p.vs_avg}</td>
                      <td className="num">{p.best}</td>
                      <td className="num">{p.worst}</td>
                      <td className="num">{p.wins}</td>
                      <td className="num">{p.deep}</td>
                      <td className="num">{p.krillions}</td>
                      <td className="num">{p.misses}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="muted small">"vs group" is how far above or below the day's group average you score, on average. Deep cuts are 🏮 or 🌟 answers.</p>
          </section>

          <section className="card span-6">
            <h2>How deep each person dives</h2>
            <table>
              <tbody>
                {table.map((p) => {
                  const mine = tiers.filter((t) => t.player_id === p.player_id);
                  const total = mine.reduce((a, t) => a + t.n, 0) || 1;
                  return (
                    <tr key={p.player_id}>
                      <td style={{ width: 90 }}>{first(p.name)}</td>
                      <td style={{ width: "100%" }}>
                        <div className="tiers">
                          {KRILLION_TIER_ORDER.map((tier) => {
                            const n = mine.find((t) => t.tier === tier)?.n ?? 0;
                            return n ? <span key={tier} title={`${tier}: ${n}`} style={{ width: `${(n / total) * 100}%`, background: TIER_COLORS[tier] }} /> : null;
                          })}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="legend">
              {KRILLION_TIER_ORDER.filter((t) => tiers.some((x) => x.tier === t)).map((t) => (
                <span key={t}><i style={{ background: TIER_COLORS[t] }} />{t}</span>
              ))}
            </div>
          </section>

          <section className="card span-6">
            <h2>Topic strengths</h2>
            {topicNames.length === 0 ? (
              <p className="muted">
                This fills in once each day's Krillion prompts are saved. Every emoji in a share is one prompt, so a
                topic score is a person's average points on prompts of that topic.
              </p>
            ) : (
              <div className="scroll">
                <table className="heat">
                  <thead>
                    <tr><th>Topic</th>{players.map((p) => <th key={p.id} className="num">{p.name}</th>)}</tr>
                  </thead>
                  <tbody>
                    {topicNames.map((topic) => {
                      const row = topics.filter((t) => t.topic === topic);
                      const best = Math.max(...row.map((r) => r.avg));
                      return (
                        <tr key={topic}>
                          <td>{topic}</td>
                          {players.map((p) => {
                            const r = row.find((t) => t.player_id === p.id);
                            const a = r?.avg;
                            return (
                              <td key={p.id} className="cell" title={r ? `${r.answers} answers` : ""}
                                style={{ background: a == null ? undefined : `color-mix(in srgb, var(--accent) ${Math.round((a / 100) * 70)}%, transparent)` }}>
                                {a ?? "·"}{a === best && row.length > 1 ? " 👑" : ""}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {others.length > 0 && (
            <section className="card span-12">
              <h2>Other games</h2>
              <div className="scroll">
                <table>
                  <thead><tr><th>Game</th><th>Player</th><th className="num">Played</th><th className="num">Average</th><th className="num">Solved</th></tr></thead>
                  <tbody>
                    {others.map((o) => (
                      <tr key={o.game + o.name}>
                        <td>{GAMES[o.game]?.name ?? o.game}</td><td>{o.name}</td><td className="num">{o.played}</td>
                        <td className="num">{o.avg} <span className="muted small">{GAMES[o.game]?.scoreLabel}</span></td>
                        <td className="num">{o.solved}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <section className="span-12">
            <h2>Every Krillion</h2>
            <div className="puzzles">
              {[...byPuzzle.entries()].map(([puzzle, rows]) => {
                const ps = prompts.filter((p) => p.puzzle === puzzle);
                return (
                  <div className="card" key={puzzle}>
                    <b>#{puzzle}</b> <span className="muted small">{rows[0].played_on}</span>
                    <ol>
                      {rows.map((r) => (
                        <li key={r.player_id}><span>{first(r.name)} <Emojis codes={r.emojis} /></span><b>{r.score}</b></li>
                      ))}
                    </ol>
                    {ps.length > 0 && (
                      <details className="small">
                        <summary>Prompts</summary>
                        <ol>{ps.map((p) => <li key={p.slot}>{p.prompt}{p.topic ? <span className="muted"> · {p.topic}</span> : null}</li>)}</ol>
                      </details>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
