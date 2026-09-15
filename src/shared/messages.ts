import { z } from "zod";

import type {
  Dashboard,
  PendingCompletion,
  Problem,
  Settings,
  UserRating,
} from "../domain/models";
import { ProblemSchema, SettingsSchema } from "../storage/schema";

export const BackgroundMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("GET_DASHBOARD") }),
  z.object({
    type: z.literal("SAVE_SETTINGS"),
    settings: SettingsSchema,
  }),
  z.object({
    type: z.literal("RECORD_COMPLETION"),
    problem: ProblemSchema,
    source: z.enum(["automatic", "manual"]),
    detectedAt: z.number(),
  }),
  z.object({
    type: z.literal("RATE_COMPLETION"),
    pendingCompletionId: z.string().min(1),
    rating: z.enum(["needed-help", "solved", "easy"]),
    ratedAt: z.number(),
  }),
  z.object({
    type: z.literal("OPEN_PROBLEM"),
    url: z.string().url(),
  }),
]);

export type BackgroundMessage = z.infer<typeof BackgroundMessageSchema>;

export type ContentMessage = { type: "GET_CURRENT_PROBLEM" };

export interface BackgroundResponseMap {
  GET_DASHBOARD: Dashboard;
  SAVE_SETTINGS: Dashboard;
  RECORD_COMPLETION: {
    created: boolean;
    pending: PendingCompletion | null;
  };
  RATE_COMPLETION: Dashboard;
  OPEN_PROBLEM: { ok: true };
}

export async function sendBackgroundMessage<
  T extends BackgroundMessage["type"],
>(
  message: Extract<BackgroundMessage, { type: T }>,
): Promise<BackgroundResponseMap[T]> {
  const response = (await chrome.runtime.sendMessage(message)) as
    BackgroundResponseMap[T] | { error: string };
  if (
    typeof response === "object" &&
    response !== null &&
    "error" in response
  ) {
    throw new Error(response.error);
  }
  return response;
}

export function saveSettingsMessage(
  settings: Settings,
): Extract<BackgroundMessage, { type: "SAVE_SETTINGS" }> {
  return { type: "SAVE_SETTINGS", settings };
}

export function rateCompletionMessage(
  pendingCompletionId: string,
  rating: UserRating,
): Extract<BackgroundMessage, { type: "RATE_COMPLETION" }> {
  return {
    type: "RATE_COMPLETION",
    pendingCompletionId,
    rating,
    ratedAt: Date.now(),
  };
}

export function recordCompletionMessage(
  problem: Problem,
  source: "automatic" | "manual",
): Extract<BackgroundMessage, { type: "RECORD_COMPLETION" }> {
  return {
    type: "RECORD_COMPLETION",
    problem,
    source,
    detectedAt: Date.now(),
  };
}
