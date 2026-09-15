import rawCatalog from "./neetcode150.json";

import type { Problem } from "../domain/models";
import { ProblemSchema } from "../storage/schema";

export const neetcode150: Problem[] = rawCatalog.map((problem) =>
  ProblemSchema.parse(problem),
);

export const catalogById = new Map(
  neetcode150.map((problem) => [problem.id, problem]),
);
