import { beforeEach, describe, expect, it } from "vitest";

import {
  extractProblemFromPage,
  hasAcceptedSignal,
  isQuestionPage,
  isSubmitControl,
  problemIdFromUrl,
} from "../../src/content/neetcodeAdapter";

describe("NeetCode adapter", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    document.title = "";
  });

  it("parses current and catalog problem URLs", () => {
    const href =
      "https://neetcode.io/problems/duplicate-integer/question?list=neetcode150";

    expect(problemIdFromUrl(href)).toBe("duplicate-integer");
    expect(isQuestionPage(href)).toBe(true);
    expect(
      isQuestionPage("https://neetcode.io/problems/duplicate-integer/solution"),
    ).toBe(false);
    expect(extractProblemFromPage(document, href)?.title).toBe(
      "Contains Duplicate",
    );
  });

  it("extracts metadata for a problem outside the bundled catalog", () => {
    document.title = "A Fresh Problem - NeetCode";
    document.body.innerHTML = "<button>Hard</button>";

    expect(
      extractProblemFromPage(
        document,
        "https://neetcode.io/problems/a-fresh-problem/question",
      ),
    ).toMatchObject({
      id: "a-fresh-problem",
      title: "A Fresh Problem",
      category: "Outside NeetCode 150",
      difficulty: "Hard",
    });
  });

  it("recognizes semantic accepted signals and submit controls", () => {
    const result = document.createElement("div");
    result.innerHTML = '<div role="status">All test cases passed!</div>';
    const submit = document.createElement("button");
    submit.innerHTML = "<span>Submit</span>";

    expect(hasAcceptedSignal(result)).toBe(true);
    expect(
      hasAcceptedSignal(result.querySelector("[role=status]")!.firstChild!),
    ).toBe(true);
    expect(isSubmitControl(submit.firstElementChild)).toBe(true);
  });

  it("does not match unrelated page text", () => {
    const result = document.createElement("div");
    result.textContent = "Your code finished running.";

    expect(hasAcceptedSignal(result)).toBe(false);
  });
});
