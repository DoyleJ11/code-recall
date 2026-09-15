import { catalogById } from "../catalog";
import type { Difficulty, Problem } from "../domain/models";

const PROBLEM_PATH = /^\/problems\/([^/?#]+)(?:\/([^/?#]+))?/;
const ACCEPTED_PATTERNS = [
  /^accepted(?:!|\s|$)/i,
  /^submission accepted!?$/i,
  /^all test cases passed!?$/i,
];

export function problemIdFromUrl(href: string): string | null {
  try {
    return new URL(href).pathname.match(PROBLEM_PATH)?.[1] ?? null;
  } catch {
    return null;
  }
}

export function isQuestionPage(href: string): boolean {
  try {
    const match = new URL(href).pathname.match(PROBLEM_PATH);
    return (
      match !== null && (match[2] === undefined || match[2] === "question")
    );
  } catch {
    return false;
  }
}

function titleFromDocument(document: Document, fallbackId: string): string {
  const heading = Array.from(document.querySelectorAll("h1, h2")).find(
    (candidate) => (candidate.textContent?.trim().length ?? 0) > 0,
  )?.textContent;
  const pageTitle = document.title.replace(/\s*[-|]\s*NeetCode.*$/i, "");

  return heading?.trim() || pageTitle.trim() || fallbackId.replaceAll("-", " ");
}

function difficultyFromDocument(document: Document): Difficulty {
  const candidates = document.querySelectorAll(
    '[class*="difficulty" i], [data-difficulty], button',
  );
  for (const candidate of candidates) {
    const text = candidate.textContent?.trim();
    if (text === "Easy" || text === "Medium" || text === "Hard") return text;
  }
  return "Unknown";
}

export function extractProblemFromPage(
  document: Document,
  href: string,
): Problem | null {
  const id = problemIdFromUrl(href);
  if (!id) return null;

  const catalogProblem = catalogById.get(id);
  if (catalogProblem) return catalogProblem;

  return {
    id,
    title: titleFromDocument(document, id),
    url: `https://neetcode.io/problems/${id}/question`,
    category: "Outside NeetCode 150",
    difficulty: difficultyFromDocument(document),
    roadmapOrder: null,
  };
}

function elementHasAcceptedText(element: Element): boolean {
  if (element.closest('[aria-hidden="true"]')) return false;
  const text = element.textContent?.trim().replace(/\s+/g, " ") ?? "";
  return (
    text.length <= 80 && ACCEPTED_PATTERNS.some((pattern) => pattern.test(text))
  );
}

export function hasAcceptedSignal(root: Node): boolean {
  const element =
    root instanceof Element
      ? root
      : root.nodeType === Node.TEXT_NODE
        ? root.parentElement
        : null;
  if (!element) return false;
  if (elementHasAcceptedText(element)) return true;

  return Array.from(
    element.querySelectorAll(
      '[role="status"], [role="alert"], [class*="result" i], [class*="submission" i], [data-state]',
    ),
  ).some(elementHasAcceptedText);
}

export function isSubmitControl(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  const control = target.closest('button, [role="button"]');
  return control?.textContent?.trim().toLowerCase() === "submit";
}
