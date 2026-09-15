import { useCallback, useEffect, useMemo, useState } from "react";

import {
  DEFAULT_SETTINGS,
  type Dashboard,
  type Problem,
  type Settings,
  type UserRating,
} from "../domain/models";
import {
  rateCompletionMessage,
  recordCompletionMessage,
  saveSettingsMessage,
  sendBackgroundMessage,
  type ContentMessage,
} from "../shared/messages";
import { DailyQueue } from "./components/DailyQueue";
import { RatingButtons } from "./components/RatingButtons";
import { SettingsForm } from "./components/SettingsForm";

function completedCount(dashboard: Dashboard): number {
  return dashboard.items.filter((item) => item.completedAt !== undefined)
    .length;
}

export function App() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [currentProblem, setCurrentProblem] = useState<Problem | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [ratingId, setRatingId] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    try {
      const next = await sendBackgroundMessage({ type: "GET_DASHBOARD" });
      setError("");
      setDashboard(next);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not load Code Recall.",
      );
    }
  }, []);

  const loadCurrentProblem = useCallback(async () => {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!tab.id || !tab.url?.startsWith("https://neetcode.io/problems/")) {
        setCurrentProblem(null);
        return;
      }
      const problem = (await chrome.tabs.sendMessage(tab.id, {
        type: "GET_CURRENT_PROBLEM",
      } satisfies ContentMessage)) as Problem | null;
      setCurrentProblem(problem);
    } catch {
      // A newly installed content script needs the NeetCode tab to be refreshed.
      setCurrentProblem(null);
    }
  }, []);

  useEffect(() => {
    // Chrome API reads are asynchronous; this effect synchronizes their external state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void Promise.all([loadDashboard(), loadCurrentProblem()]);
  }, [loadCurrentProblem, loadDashboard]);

  const progress = useMemo(() => {
    if (!dashboard || dashboard.items.length === 0) return 0;
    return Math.round(
      (completedCount(dashboard) / dashboard.items.length) * 100,
    );
  }, [dashboard]);

  async function saveSettings(settings: Settings) {
    setSaving(true);
    try {
      setError("");
      setDashboard(await sendBackgroundMessage(saveSettingsMessage(settings)));
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not save settings.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function markCurrentProblem() {
    if (!currentProblem) return;
    setSaving(true);
    try {
      setError("");
      await sendBackgroundMessage(
        recordCompletionMessage(currentProblem, "manual"),
      );
      await loadDashboard();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not save completion.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function rate(pendingCompletionId: string, rating: UserRating) {
    setRatingId(pendingCompletionId);
    try {
      setError("");
      setDashboard(
        await sendBackgroundMessage(
          rateCompletionMessage(pendingCompletionId, rating),
        ),
      );
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not save rating.",
      );
    } finally {
      setRatingId(null);
    }
  }

  async function openProblem(url: string) {
    try {
      await sendBackgroundMessage({ type: "OPEN_PROBLEM", url });
      window.close();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not open problem.",
      );
    }
  }

  if (!dashboard) {
    return (
      <main className="shell loading-shell">
        <div className="loader" />
        <p>Building today’s plan…</p>
        {error ? <p className="error">{error}</p> : null}
      </main>
    );
  }

  if (!dashboard.settings) {
    return (
      <main className="shell onboarding">
        <div className="brand-mark">CR</div>
        <p className="eyebrow">Welcome to Code Recall</p>
        <h1>Practice on purpose.</h1>
        <p className="lede">
          Choose a sustainable daily goal. Reviews use spaced repetition; open
          slots become new problems.
        </p>
        {error ? <p className="error callout">{error}</p> : null}
        <SettingsForm
          initial={DEFAULT_SETTINGS}
          onboarding
          saving={saving}
          onSave={saveSettings}
        />
      </main>
    );
  }

  const done = completedCount(dashboard);

  return (
    <main className="shell">
      <header className="header">
        <div>
          <p className="eyebrow">Code Recall</p>
          <h1>Today’s practice</h1>
        </div>
        <span className="date">{dashboard.date}</span>
      </header>

      <section className="progress-card" aria-label="Daily progress">
        <div className="progress-copy">
          <strong>
            {done} of {dashboard.items.length}
          </strong>
          <span>{progress}% complete</span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        {dashboard.overdueBacklog > 0 ? (
          <p className="backlog">
            {dashboard.overdueBacklog} overdue review
            {dashboard.overdueBacklog === 1 ? "" : "s"} waiting after today.
          </p>
        ) : null}
      </section>

      {error ? <p className="error callout">{error}</p> : null}

      {dashboard.pending.length > 0 ? (
        <section className="section pending-section">
          <div className="section-heading">
            <h2>Rate recent work</h2>
            <span>{dashboard.pending.length}</span>
          </div>
          {dashboard.pending.map((pending) => (
            <article className="pending-card" key={pending.id}>
              <strong>{pending.problem.title}</strong>
              <small>How well could you reconstruct it?</small>
              <RatingButtons
                disabled={ratingId === pending.id}
                onRate={(rating) => void rate(pending.id, rating)}
              />
            </article>
          ))}
        </section>
      ) : null}

      <section className="section">
        <div className="section-heading">
          <h2>Queue</h2>
          <span>{dashboard.items.length}</span>
        </div>
        <DailyQueue
          items={dashboard.items}
          onOpen={(url) => void openProblem(url)}
        />
      </section>

      <section className="manual-card">
        <div>
          <strong>Automatic detection missed it?</strong>
          <small>
            {currentProblem
              ? `Mark ${currentProblem.title} complete.`
              : "Open or refresh a NeetCode problem page first."}
          </small>
        </div>
        <button
          className="secondary"
          disabled={!currentProblem || saving}
          onClick={() => void markCurrentProblem()}
        >
          Mark done
        </button>
      </section>

      <details className="settings-panel">
        <summary>Daily goal settings</summary>
        <p>Changes take effect when the next daily plan is created.</p>
        <SettingsForm
          initial={dashboard.settings}
          saving={saving}
          onSave={saveSettings}
        />
      </details>
    </main>
  );
}
