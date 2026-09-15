import {
  extractProblemFromPage,
  hasAcceptedSignal,
  isQuestionPage,
  isSubmitControl,
} from "./neetcodeAdapter";
import { showRatingPrompt } from "./ratingPrompt";
import {
  recordCompletionMessage,
  sendBackgroundMessage,
  type ContentMessage,
} from "../shared/messages";

const SUBMISSION_WINDOW_MS = 2 * 60 * 1000;
let submissionArmedUntil = 0;
let reportedForAttempt = false;
let currentHref = location.href;

async function reportAcceptedCompletion(): Promise<void> {
  const problem = extractProblemFromPage(document, location.href);
  if (!problem || reportedForAttempt) return;
  reportedForAttempt = true;

  try {
    const result = await sendBackgroundMessage(
      recordCompletionMessage(problem, "automatic"),
    );
    if (result.pending) showRatingPrompt(problem, result.pending.id);
  } catch (error) {
    console.warn("Code Recall could not record this completion.", error);
    reportedForAttempt = false;
  }
}

function resetForRouteChange(): void {
  if (location.href === currentHref) return;
  currentHref = location.href;
  submissionArmedUntil = 0;
  reportedForAttempt = false;
}

document.addEventListener(
  "click",
  (event) => {
    resetForRouteChange();
    if (!isQuestionPage(location.href) || !isSubmitControl(event.target))
      return;
    submissionArmedUntil = Date.now() + SUBMISSION_WINDOW_MS;
    reportedForAttempt = false;
  },
  true,
);

const observer = new MutationObserver((mutations) => {
  resetForRouteChange();
  if (
    reportedForAttempt ||
    Date.now() > submissionArmedUntil ||
    !isQuestionPage(location.href)
  ) {
    return;
  }

  const accepted = mutations.some((mutation) => {
    if (mutation.type === "characterData") {
      return hasAcceptedSignal(mutation.target);
    }
    return Array.from(mutation.addedNodes).some(hasAcceptedSignal);
  });
  if (accepted) void reportAcceptedCompletion();
});

observer.observe(document.documentElement, {
  childList: true,
  characterData: true,
  subtree: true,
});

chrome.runtime.onMessage.addListener(
  (message: ContentMessage, _sender, sendResponse) => {
    if (message?.type !== "GET_CURRENT_PROBLEM") return false;
    sendResponse(extractProblemFromPage(document, location.href));
    return false;
  },
);
