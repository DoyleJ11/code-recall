import type { AppState } from "../domain/models";
import { createDefaultState } from "../domain/models";
import { AppStateSchema } from "./schema";

export function migrateState(value: unknown): AppState {
  if (value === undefined || value === null) return createDefaultState();

  const parsed = AppStateSchema.safeParse(value);
  if (parsed.success) return parsed.data as AppState;

  console.warn("Code Recall ignored invalid stored state.", parsed.error);
  return createDefaultState();
}
