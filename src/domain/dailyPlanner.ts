import type { AppState, DailyPlan, Problem, ProblemProgress } from "./models";
import { getRetrievability } from "./scheduler";

export function localDateKey(at: number): string {
  const date = new Date(at);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function endOfLocalDay(at: number): number {
  const date = new Date(at);
  date.setHours(23, 59, 59, 999);
  return date.getTime();
}

export function dueProblems(state: AppState, now: number): ProblemProgress[] {
  const dueBy = endOfLocalDay(now);
  const pendingProblemIds = new Set(
    Object.values(state.pendingCompletions).map((pending) => pending.problemId),
  );

  return Object.values(state.problems)
    .filter(
      (progress) =>
        progress.card !== undefined &&
        progress.card.due <= dueBy &&
        !pendingProblemIds.has(progress.problem.id),
    )
    .sort((left, right) => {
      const dueDifference = left.card!.due - right.card!.due;
      if (dueDifference !== 0) return dueDifference;

      const leftRecall = getRetrievability(left.card!, now, state.settings!);
      const rightRecall = getRetrievability(right.card!, now, state.settings!);
      return leftRecall - rightRecall;
    });
}

export function createDailyPlan(
  state: AppState,
  catalog: Problem[],
  now: number,
): DailyPlan | null {
  if (!state.settings) return null;

  const date = localDateKey(now);
  const existing = state.dailyPlans[date];
  if (existing) return existing;

  const reviewTarget = state.settings.dailyTotal - state.settings.requestedNew;
  const reviews = dueProblems(state, now).slice(0, reviewTarget);
  const newTarget =
    state.settings.requestedNew + Math.max(0, reviewTarget - reviews.length);
  const newProblems = catalog
    .filter((problem) => state.problems[problem.id] === undefined)
    .sort(
      (left, right) =>
        (left.roadmapOrder ?? Number.MAX_SAFE_INTEGER) -
        (right.roadmapOrder ?? Number.MAX_SAFE_INTEGER),
    )
    .slice(0, newTarget);

  return {
    date,
    createdAt: now,
    items: [
      ...reviews.map((progress) => ({
        problemId: progress.problem.id,
        kind: "review" as const,
      })),
      ...newProblems.map((problem) => ({
        problemId: problem.id,
        kind: "new" as const,
      })),
    ],
  };
}

export function overdueBacklogCount(state: AppState, now: number): number {
  if (!state.settings) return 0;
  const plan = state.dailyPlans[localDateKey(now)];
  const remainingReviewSlots = plan
    ? plan.items.filter(
        (item) => item.kind === "review" && item.completedAt === undefined,
      ).length
    : state.settings.dailyTotal - state.settings.requestedNew;
  return Math.max(0, dueProblems(state, now).length - remainingReviewSlots);
}
