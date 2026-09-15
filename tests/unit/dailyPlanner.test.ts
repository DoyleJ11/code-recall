import { describe, expect, it } from "vitest";

import {
  createDailyPlan,
  localDateKey,
  overdueBacklogCount,
} from "../../src/domain/dailyPlanner";
import {
  DEFAULT_SETTINGS,
  createDefaultState,
  type AppState,
  type Problem,
} from "../../src/domain/models";

const now = new Date(2026, 8, 15, 9).getTime();

function problem(id: string, order: number): Problem {
  return {
    id,
    title: `Problem ${id}`,
    url: `https://neetcode.io/problems/${id}/question`,
    category: "Arrays & Hashing",
    difficulty: "Easy",
    roadmapOrder: order,
  };
}

function configuredState(): AppState {
  const state = createDefaultState();
  state.settings = { ...DEFAULT_SETTINGS };
  return state;
}

function addDueProblem(state: AppState, item: Problem, due: number) {
  state.problems[item.id] = {
    problem: item,
    firstCompletedAt: due - 1000,
    lastCompletionDetectedAt: due - 1000,
    card: { due },
  };
}

describe("createDailyPlan", () => {
  it("fills unused review slots with new problems in roadmap order", () => {
    const state = configuredState();
    const catalog = Array.from({ length: 7 }, (_, index) =>
      problem(String(index), index),
    );

    const plan = createDailyPlan(state, catalog, now);

    expect(plan?.items).toHaveLength(5);
    expect(plan?.items.every((item) => item.kind === "new")).toBe(true);
    expect(plan?.items.map((item) => item.problemId)).toEqual([
      "0",
      "1",
      "2",
      "3",
      "4",
    ]);
  });

  it("reserves the configured review/new split and carries backlog", () => {
    const state = configuredState();
    state.settings = { ...DEFAULT_SETTINGS, dailyTotal: 4, requestedNew: 1 };
    const catalog = Array.from({ length: 7 }, (_, index) =>
      problem(String(index), index),
    );
    addDueProblem(state, catalog[0], now - 4000);
    addDueProblem(state, catalog[1], now - 3000);
    addDueProblem(state, catalog[2], now - 2000);
    addDueProblem(state, catalog[3], now - 1000);

    const plan = createDailyPlan(state, catalog, now);

    expect(plan?.items.map((item) => item.kind)).toEqual([
      "review",
      "review",
      "review",
      "new",
    ]);
    expect(plan?.items.at(-1)?.problemId).toBe("4");
    expect(overdueBacklogCount(state, now)).toBe(1);
  });

  it("returns an already frozen plan for the same local day", () => {
    const state = configuredState();
    const existing = {
      date: localDateKey(now),
      createdAt: now - 100,
      items: [{ problemId: "fixed", kind: "new" as const }],
    };
    state.dailyPlans[existing.date] = existing;

    expect(createDailyPlan(state, [problem("other", 0)], now)).toBe(existing);
  });

  it("does not reschedule a due problem while its rating is pending", () => {
    const state = configuredState();
    const due = problem("due", 0);
    addDueProblem(state, due, now - 1000);
    state.pendingCompletions.pending = {
      id: "pending",
      problemId: due.id,
      source: "automatic",
      detectedAt: now,
    };

    const plan = createDailyPlan(state, [due, problem("new", 1)], now);

    expect(plan?.items).toEqual([{ problemId: "new", kind: "new" }]);
  });
});
