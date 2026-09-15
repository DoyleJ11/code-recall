/* eslint-disable react-refresh/only-export-components */
import { useState } from "react";
import { createRoot } from "react-dom/client";

import type { Problem, UserRating } from "../domain/models";
import {
  rateCompletionMessage,
  sendBackgroundMessage,
} from "../shared/messages";

const HOST_ID = "code-recall-rating-host";

const styles = `
  :host { all: initial; }
  .card {
    position: fixed;
    right: 24px;
    bottom: 24px;
    z-index: 2147483647;
    width: 320px;
    box-sizing: border-box;
    padding: 18px;
    border: 1px solid #2f3b52;
    border-radius: 16px;
    background: #101827;
    color: #f8fafc;
    box-shadow: 0 18px 50px rgba(0, 0, 0, .38);
    font: 14px/1.45 Inter, ui-sans-serif, system-ui, sans-serif;
  }
  .eyebrow { color: #7dd3fc; font-size: 11px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
  h2 { margin: 5px 0 4px; font-size: 18px; }
  p { margin: 0 0 14px; color: #b8c3d9; }
  .ratings { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  button { border: 0; border-radius: 9px; padding: 9px 7px; cursor: pointer; font: inherit; font-weight: 650; }
  button:disabled { cursor: wait; opacity: .65; }
  .help { background: #fee2e2; color: #991b1b; }
  .solved { background: #dbeafe; color: #1e40af; }
  .easy { background: #dcfce7; color: #166534; }
  .dismiss { position: absolute; top: 9px; right: 11px; padding: 4px 7px; background: transparent; color: #94a3b8; }
  .error { margin-top: 10px; color: #fca5a5; }
`;

interface RatingPromptProps {
  problem: Problem;
  pendingCompletionId: string;
  close: () => void;
}

function RatingPrompt({
  problem,
  pendingCompletionId,
  close,
}: RatingPromptProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function rate(rating: UserRating) {
    setSaving(true);
    setError("");
    try {
      await sendBackgroundMessage(
        rateCompletionMessage(pendingCompletionId, rating),
      );
      close();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not save rating.",
      );
      setSaving(false);
    }
  }

  return (
    <div className="card" role="dialog" aria-label="Rate your solution">
      <style>{styles}</style>
      <button
        className="dismiss"
        type="button"
        onClick={close}
        aria-label="Rate later"
      >
        ×
      </button>
      <div className="eyebrow">Completion saved</div>
      <h2>{problem.title}</h2>
      <p>How well could you reconstruct the solution?</p>
      <div className="ratings">
        <button
          className="help"
          disabled={saving}
          onClick={() => void rate("needed-help")}
        >
          Needed help
        </button>
        <button
          className="solved"
          disabled={saving}
          onClick={() => void rate("solved")}
        >
          Solved
        </button>
        <button
          className="easy"
          disabled={saving}
          onClick={() => void rate("easy")}
        >
          Easy
        </button>
      </div>
      {error ? <div className="error">{error}</div> : null}
    </div>
  );
}

export function showRatingPrompt(
  problem: Problem,
  pendingCompletionId: string,
): void {
  document.getElementById(HOST_ID)?.remove();
  const host = document.createElement("div");
  host.id = HOST_ID;
  document.documentElement.append(host);
  const shadow = host.attachShadow({ mode: "open" });
  const mount = document.createElement("div");
  shadow.append(mount);
  const root = createRoot(mount);
  const close = () => {
    root.unmount();
    host.remove();
  };
  root.render(
    <RatingPrompt
      problem={problem}
      pendingCompletionId={pendingCompletionId}
      close={close}
    />,
  );
}
