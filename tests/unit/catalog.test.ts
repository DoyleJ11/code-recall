import { describe, expect, it } from "vitest";

import { neetcode150 } from "../../src/catalog";

describe("NeetCode 150 catalog", () => {
  it("contains 150 unique, ordered problems", () => {
    expect(neetcode150).toHaveLength(150);
    expect(new Set(neetcode150.map((problem) => problem.id)).size).toBe(150);
    expect(neetcode150[0]).toMatchObject({
      id: "duplicate-integer",
      roadmapOrder: 0,
    });
    expect(neetcode150.at(-1)?.roadmapOrder).toBe(149);
  });
});
