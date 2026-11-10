import { describe, expect, it } from "vitest";
import { parseMessage, krillionDate } from "../lib/games";

describe("krillion", () => {
  it("parses a plain share and the slot values add up", () => {
    const [r] = parseMessage("Krillion #114 :shrimp:\n415\n\n:fish::squid::squid::izakaya_lantern::squid::squid::squid:");
    expect(r.game).toBe("krillion");
    expect(r.puzzle).toBe(114);
    expect(r.score).toBe(415);
    expect(r.slots!.map((s) => s.points)).toEqual([30, 60, 60, 85, 60, 60, 60]);
    expect(r.details.slotsSum).toBe(415);
    expect(r.playedOn).toBe("2026-11-06");
  });

  it("handles text before the share, misses and the star", () => {
    const [a] = parseMessage("Well that was surely my worst yet hahaha Krillion #118 :shrimp:\n130\n\n:fish::bubbles::fish::black_large_square::fish::fish::black_large_square:");
    expect(a.score).toBe(130);
    expect(a.details.slotsSum).toBe(130);
    expect(a.details.misses).toBe(2);
    const [b] = parseMessage("Krillion #118 :shrimp:\n300\n\n:fish::fish::squid::bubbles::bubbles::star2::squid:");
    expect(b.details.slotsSum).toBe(300);
    expect(b.details.krillions).toBe(1);
  });

  it("handles trailing chat and unicode emoji", () => {
    const [r] = parseMessage("Krillion #117 🦐\n160\n\n🦑🐟🫧🫧🫧🐟🫧\n\n:sob:");
    expect(r.details.slotsSum).toBe(160);
  });

  it("infers an unknown tier from the total", () => {
    const [r] = parseMessage("Krillion #120 :shrimp:\n185\n\n:fish::squid::bubbles::new_tier::fish::fish::bubbles:");
    expect(r.slots![3].points).toBe(15);
  });

  it("maps puzzle numbers to dates", () => {
    expect(krillionDate(112)).toBe("2026-11-04");
    expect(krillionDate(118)).toBe("2026-11-10");
  });

  it("ignores chat", () => {
    expect(parseMessage("I got the krillion!!!!!")).toEqual([]);
  });
});

describe("other games", () => {
  it("wordle", () => {
    const [r] = parseMessage("Wordle 1,605 4/6*\n\n⬜🟨⬜⬜⬜\n🟩🟩🟩🟩🟩");
    expect(r).toMatchObject({ game: "wordle", puzzle: 1605, score: 4, solved: true });
    expect(parseMessage("Wordle 1605 X/6")[0]).toMatchObject({ score: 7, solved: false });
  });
  it("connections", () => {
    const [r] = parseMessage(
      "Connections\nPuzzle #890\n:large_yellow_square::large_yellow_square::large_green_square::large_yellow_square:\n:large_yellow_square::large_yellow_square::large_yellow_square::large_yellow_square:\n🟩🟩🟩🟩\n🟦🟦🟦🟦\n🟪🟪🟪🟪"
    );
    expect(r).toMatchObject({ game: "connections", puzzle: 890, score: 1, solved: true });
  });
});
