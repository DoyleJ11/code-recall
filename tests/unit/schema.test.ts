import { describe, expect, it } from "vitest";

import { createDefaultState } from "../../src/domain/models";
import { migrateState } from "../../src/storage/migrations";
import { SettingsSchema } from "../../src/storage/schema";

describe("stored state validation", () => {
  it("accepts a valid daily goal", () => {
    expect(
      SettingsSchema.parse({
        dailyTotal: 5,
        requestedNew: 2,
        requestRetention: 0.9,
        maximumIntervalDays: 365,
      }),
    ).toMatchObject({ dailyTotal: 5, requestedNew: 2 });
  });

  it("rejects a new count greater than the total", () => {
    expect(() =>
      SettingsSchema.parse({
        dailyTotal: 3,
        requestedNew: 4,
        requestRetention: 0.9,
        maximumIntervalDays: 365,
      }),
    ).toThrow();
  });

  it("falls back safely when persisted data is invalid", () => {
    expect(migrateState({ schemaVersion: 99 })).toEqual(createDefaultState());
  });
});
