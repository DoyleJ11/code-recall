import { useState, type FormEvent } from "react";

import type { Settings } from "../../domain/models";

interface SettingsFormProps {
  initial: Settings;
  onboarding?: boolean;
  saving?: boolean;
  onSave: (settings: Settings) => Promise<void>;
}

export function SettingsForm({
  initial,
  onboarding = false,
  saving,
  onSave,
}: SettingsFormProps) {
  const [dailyTotal, setDailyTotal] = useState(initial.dailyTotal);
  const [requestedNew, setRequestedNew] = useState(initial.requestedNew);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (dailyTotal < 1 || dailyTotal > 50) {
      setError("Choose between 1 and 50 problems.");
      return;
    }
    if (requestedNew < 0 || requestedNew > dailyTotal) {
      setError("New problems must be between 0 and the daily total.");
      return;
    }
    setError("");
    await onSave({ ...initial, dailyTotal, requestedNew });
  }

  return (
    <form className="settings-form" onSubmit={(event) => void submit(event)}>
      <label>
        Problems per day
        <input
          type="number"
          min="1"
          max="50"
          value={dailyTotal}
          onChange={(event) => setDailyTotal(event.currentTarget.valueAsNumber)}
        />
      </label>
      <label>
        New problems
        <input
          type="number"
          min="0"
          max={dailyTotal}
          value={requestedNew}
          onChange={(event) =>
            setRequestedNew(event.currentTarget.valueAsNumber)
          }
        />
      </label>
      {error ? <p className="error">{error}</p> : null}
      <button className="primary wide" type="submit" disabled={saving}>
        {saving
          ? "Saving…"
          : onboarding
            ? "Create today’s plan"
            : "Save for tomorrow"}
      </button>
    </form>
  );
}
