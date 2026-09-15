import type { AppState } from "../domain/models";
import { migrateState } from "./migrations";

export const STORAGE_KEY = "codeRecallState";

let writeQueue: Promise<unknown> = Promise.resolve();

export async function readState(): Promise<AppState> {
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  return migrateState(stored[STORAGE_KEY]);
}

export function updateState<T>(
  update: (state: AppState) => T | Promise<T>,
): Promise<T> {
  const operation = writeQueue.then(async () => {
    const state = structuredClone(await readState());
    const result = await update(state);
    await chrome.storage.local.set({ [STORAGE_KEY]: state });
    return result;
  });

  writeQueue = operation.then(
    () => undefined,
    () => undefined,
  );

  return operation;
}
