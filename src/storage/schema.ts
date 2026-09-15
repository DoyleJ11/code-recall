import { z } from "zod";

export const DifficultySchema = z.enum(["Easy", "Medium", "Hard", "Unknown"]);

export const ProblemSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  url: z.string().url(),
  category: z.string().min(1),
  difficulty: DifficultySchema,
  roadmapOrder: z.number().int().nonnegative().nullable(),
});

export const SettingsSchema = z
  .object({
    dailyTotal: z.number().int().min(1).max(50),
    requestedNew: z.number().int().min(0).max(50),
    requestRetention: z.number().min(0.7).max(0.99),
    maximumIntervalDays: z.number().int().min(1).max(3650),
  })
  .refine((value) => value.requestedNew <= value.dailyTotal, {
    message: "New problems cannot exceed the daily total.",
    path: ["requestedNew"],
  });

const SerializedCardSchema = z
  .object({
    due: z.number(),
    last_review: z.number().optional(),
  })
  .loose();

const ProblemProgressSchema = z.object({
  problem: ProblemSchema,
  firstCompletedAt: z.number(),
  lastCompletionDetectedAt: z.number(),
  lastReviewedAt: z.number().optional(),
  card: SerializedCardSchema.optional(),
});

const ReviewLogSchema = z.object({
  id: z.string(),
  problemId: z.string(),
  pendingCompletionId: z.string(),
  userRating: z.enum(["needed-help", "solved", "easy"]),
  fsrsRating: z.enum(["Again", "Good", "Easy"]),
  completedAt: z.number(),
  ratedAt: z.number(),
  previousDue: z.number().optional(),
  nextDue: z.number(),
  scheduledDays: z.number(),
  source: z.enum(["automatic", "manual"]),
});

const PendingCompletionSchema = z.object({
  id: z.string(),
  problemId: z.string(),
  source: z.enum(["automatic", "manual"]),
  detectedAt: z.number(),
});

const DailyPlanSchema = z.object({
  date: z.string(),
  createdAt: z.number(),
  items: z.array(
    z.object({
      problemId: z.string(),
      kind: z.enum(["review", "new"]),
      completedAt: z.number().optional(),
    }),
  ),
});

export const AppStateSchema = z.object({
  schemaVersion: z.literal(1),
  settings: SettingsSchema.nullable(),
  problems: z.record(z.string(), ProblemProgressSchema),
  reviewLogs: z.array(ReviewLogSchema),
  pendingCompletions: z.record(z.string(), PendingCompletionSchema),
  dailyPlans: z.record(z.string(), DailyPlanSchema),
});
