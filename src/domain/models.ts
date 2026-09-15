export type Difficulty = "Easy" | "Medium" | "Hard" | "Unknown";
export type CompletionSource = "automatic" | "manual";
export type UserRating = "needed-help" | "solved" | "easy";
export type PlanItemKind = "review" | "new";

export interface Problem {
  id: string;
  title: string;
  url: string;
  category: string;
  difficulty: Difficulty;
  roadmapOrder: number | null;
}

export interface Settings {
  dailyTotal: number;
  requestedNew: number;
  requestRetention: number;
  maximumIntervalDays: number;
}

export interface SerializedFsrsCard {
  due: number;
  last_review?: number;
  [key: string]: unknown;
}

export interface ProblemProgress {
  problem: Problem;
  firstCompletedAt: number;
  lastCompletionDetectedAt: number;
  lastReviewedAt?: number;
  card?: SerializedFsrsCard;
}

export interface ReviewLog {
  id: string;
  problemId: string;
  pendingCompletionId: string;
  userRating: UserRating;
  fsrsRating: "Again" | "Good" | "Easy";
  completedAt: number;
  ratedAt: number;
  previousDue?: number;
  nextDue: number;
  scheduledDays: number;
  source: CompletionSource;
}

export interface PendingCompletion {
  id: string;
  problemId: string;
  source: CompletionSource;
  detectedAt: number;
}

export interface DailyPlanItem {
  problemId: string;
  kind: PlanItemKind;
  completedAt?: number;
}

export interface DailyPlan {
  date: string;
  createdAt: number;
  items: DailyPlanItem[];
}

export interface AppState {
  schemaVersion: 1;
  settings: Settings | null;
  problems: Record<string, ProblemProgress>;
  reviewLogs: ReviewLog[];
  pendingCompletions: Record<string, PendingCompletion>;
  dailyPlans: Record<string, DailyPlan>;
}

export interface DashboardPlanItem extends DailyPlanItem {
  problem: Problem;
}

export interface Dashboard {
  settings: Settings | null;
  date: string;
  plan: DailyPlan | null;
  items: DashboardPlanItem[];
  pending: Array<PendingCompletion & { problem: Problem }>;
  overdueBacklog: number;
}

export const DEFAULT_SETTINGS: Settings = {
  dailyTotal: 5,
  requestedNew: 2,
  requestRetention: 0.9,
  maximumIntervalDays: 365,
};

export function createDefaultState(): AppState {
  return {
    schemaVersion: 1,
    settings: null,
    problems: {},
    reviewLogs: [],
    pendingCompletions: {},
    dailyPlans: {},
  };
}
