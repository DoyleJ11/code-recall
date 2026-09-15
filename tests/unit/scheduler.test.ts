import { describe, expect, it } from "vitest";

import { DEFAULT_SETTINGS } from "../../src/domain/models";
import {
  deserializeCard,
  getRetrievability,
  scheduleReview,
} from "../../src/domain/scheduler";

describe("FSRS scheduler wrapper", () => {
  const reviewedAt = new Date(2026, 8, 15, 10).getTime();

  it("maps the domain ratings and serializes dates", () => {
    const result = scheduleReview(
      undefined,
      "solved",
      reviewedAt,
      DEFAULT_SETTINGS,
    );

    expect(result.fsrsRating).toBe("Good");
    expect(result.card.due).toBeGreaterThan(reviewedAt);
    expect(result.card.due).toEqual(expect.any(Number));
    expect(deserializeCard(result.card).due).toBeInstanceOf(Date);
  });

  it("updates an existing card and exposes retrievability", () => {
    const first = scheduleReview(
      undefined,
      "easy",
      reviewedAt,
      DEFAULT_SETTINGS,
    );
    const recall = getRetrievability(
      first.card,
      reviewedAt + 24 * 60 * 60 * 1000,
      DEFAULT_SETTINGS,
    );
    const second = scheduleReview(
      first.card,
      "needed-help",
      reviewedAt + 24 * 60 * 60 * 1000,
      DEFAULT_SETTINGS,
    );

    expect(recall).toBeGreaterThan(0);
    expect(recall).toBeLessThanOrEqual(1);
    expect(second.fsrsRating).toBe("Again");
    expect(second.card.due).toBeGreaterThan(reviewedAt);
  });
});
