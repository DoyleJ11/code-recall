import { catalogById, neetcode150 } from "../catalog";
import {
  DEFAULT_SETTINGS,
  type AppState,
  type Dashboard,
  type PendingCompletion,
  type Problem,
  type Settings,
  type UserRating,
} from "../domain/models";
import {
  createDailyPlan,
  localDateKey,
  overdueBacklogCount,
} from "../domain/dailyPlanner";
import { scheduleReview } from "../domain/scheduler";
import {
  BackgroundMessageSchema,
  type BackgroundMessage,
} from "../shared/messages";
import { readState, updateState } from "../storage/repository";

const COMPLETION_DEDUPE_WINDOW_MS = 10 * 60 * 1000;

function problemFor(state: AppState, problemId: string): Problem | undefined {
  return state.problems[problemId]?.problem ?? catalogById.get(problemId);
}

function ensureTodayPlan(state: AppState, now: number): void {
  const plan = createDailyPlan(state, neetcode150, now);
  if (plan && !state.dailyPlans[plan.date]) {
    state.dailyPlans[plan.date] = plan;
  }
}

function dashboardFromState(state: AppState, now: number): Dashboard {
  const date = localDateKey(now);
  const plan = state.dailyPlans[date] ?? null;

  return {
    settings: state.settings,
    date,
    plan,
    items: (plan?.items ?? []).flatMap((item) => {
      const problem = problemFor(state, item.problemId);
      return problem ? [{ ...item, problem }] : [];
    }),
    pending: Object.values(state.pendingCompletions)
      .sort((left, right) => left.detectedAt - right.detectedAt)
      .flatMap((pending) => {
        const problem = problemFor(state, pending.problemId);
        return problem ? [{ ...pending, problem }] : [];
      }),
    overdueBacklog: overdueBacklogCount(state, now),
  };
}

async function getDashboard(now = Date.now()): Promise<Dashboard> {
  const state = await readState();
  if (!state.settings || state.dailyPlans[localDateKey(now)]) {
    return dashboardFromState(state, now);
  }

  return updateState((nextState) => {
    ensureTodayPlan(nextState, now);
    return dashboardFromState(nextState, now);
  });
}

function saveSettings(settings: Settings, now: number): Promise<Dashboard> {
  return updateState((state) => {
    state.settings = settings;
    ensureTodayPlan(state, now);
    return dashboardFromState(state, now);
  });
}

function existingPendingFor(
  state: AppState,
  problemId: string,
): PendingCompletion | undefined {
  return Object.values(state.pendingCompletions).find(
    (pending) => pending.problemId === problemId,
  );
}

function markPlanItemCompleted(
  state: AppState,
  problemId: string,
  completedAt: number,
): void {
  const plan = state.dailyPlans[localDateKey(completedAt)];
  const item = plan?.items.find(
    (candidate) => candidate.problemId === problemId,
  );
  if (item && item.completedAt === undefined) item.completedAt = completedAt;
}

function isValidProblemUrl(problem: Problem): boolean {
  try {
    const url = new URL(problem.url);
    return (
      url.origin === "https://neetcode.io" &&
      url.pathname.startsWith(`/problems/${problem.id}`)
    );
  } catch {
    return false;
  }
}

function recordCompletion(
  problem: Problem,
  source: "automatic" | "manual",
  detectedAt: number,
): Promise<{ created: boolean; pending: PendingCompletion | null }> {
  if (!isValidProblemUrl(problem)) {
    return Promise.reject(new Error("Invalid NeetCode problem metadata."));
  }
  return updateState((state) => {
    const pending = existingPendingFor(state, problem.id);
    if (pending) return { created: false, pending };

    const existing = state.problems[problem.id];
    if (
      existing &&
      detectedAt - existing.lastCompletionDetectedAt <
        COMPLETION_DEDUPE_WINDOW_MS
    ) {
      return { created: false, pending: null };
    }

    const canonicalProblem = catalogById.get(problem.id) ?? problem;
    state.problems[problem.id] = existing
      ? {
          ...existing,
          problem: canonicalProblem,
          lastCompletionDetectedAt: detectedAt,
        }
      : {
          problem: canonicalProblem,
          firstCompletedAt: detectedAt,
          lastCompletionDetectedAt: detectedAt,
        };

    const newPending: PendingCompletion = {
      id: crypto.randomUUID(),
      problemId: problem.id,
      source,
      detectedAt,
    };
    state.pendingCompletions[newPending.id] = newPending;
    markPlanItemCompleted(state, problem.id, detectedAt);

    return { created: true, pending: newPending };
  });
}

function rateCompletion(
  pendingCompletionId: string,
  rating: UserRating,
  ratedAt: number,
): Promise<Dashboard> {
  return updateState((state) => {
    const pending = state.pendingCompletions[pendingCompletionId];
    if (!pending) throw new Error("That completion has already been rated.");

    const progress = state.problems[pending.problemId];
    if (!progress) throw new Error("The completed problem could not be found.");

    const previousDue = progress.card?.due;
    const scheduled = scheduleReview(
      progress.card,
      rating,
      pending.detectedAt,
      state.settings ?? DEFAULT_SETTINGS,
    );

    progress.card = scheduled.card;
    progress.lastReviewedAt = pending.detectedAt;
    state.reviewLogs.push({
      id: crypto.randomUUID(),
      problemId: pending.problemId,
      pendingCompletionId,
      userRating: rating,
      fsrsRating: scheduled.fsrsRating,
      completedAt: pending.detectedAt,
      ratedAt,
      ...(previousDue === undefined ? {} : { previousDue }),
      nextDue: scheduled.card.due,
      scheduledDays: scheduled.scheduledDays,
      source: pending.source,
    });
    delete state.pendingCompletions[pendingCompletionId];

    return dashboardFromState(state, ratedAt);
  });
}

function isTrustedAutomaticSender(
  sender: chrome.runtime.MessageSender,
): boolean {
  if (sender.id !== chrome.runtime.id) return false;
  if (!sender.tab?.url) return false;

  try {
    return new URL(sender.tab.url).origin === "https://neetcode.io";
  } catch {
    return false;
  }
}

async function handleMessage(
  message: BackgroundMessage,
  sender: chrome.runtime.MessageSender,
): Promise<unknown> {
  switch (message.type) {
    case "GET_DASHBOARD":
      return getDashboard();
    case "SAVE_SETTINGS":
      return saveSettings(message.settings, Date.now());
    case "RECORD_COMPLETION":
      if (message.source === "automatic" && !isTrustedAutomaticSender(sender)) {
        throw new Error(
          "Rejected an automatic completion from an invalid tab.",
        );
      }
      return recordCompletion(
        message.problem,
        message.source,
        message.detectedAt,
      );
    case "RATE_COMPLETION":
      return rateCompletion(
        message.pendingCompletionId,
        message.rating,
        message.ratedAt,
      );
    case "OPEN_PROBLEM":
      if (
        new URL(message.url).origin !== "https://neetcode.io" ||
        !new URL(message.url).pathname.startsWith("/problems/")
      ) {
        throw new Error("Only NeetCode problem URLs can be opened.");
      }
      await chrome.tabs.create({ url: message.url });
      return { ok: true };
  }
}

chrome.runtime.onInstalled.addListener(() => {
  void readState();
});

chrome.runtime.onMessage.addListener((untrusted, sender, sendResponse) => {
  const parsed = BackgroundMessageSchema.safeParse(untrusted);
  if (!parsed.success) return false;

  void handleMessage(parsed.data, sender)
    .then(sendResponse)
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : "Unknown error";
      sendResponse({ error: message });
    });
  return true;
});
