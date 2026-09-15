import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DEFAULT_SETTINGS } from "../../src/domain/models";
import { SettingsForm } from "../../src/popup/components/SettingsForm";

describe("SettingsForm", () => {
  it("validates and submits a daily goal", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<SettingsForm initial={DEFAULT_SETTINGS} onSave={onSave} />);

    fireEvent.change(screen.getByLabelText("Problems per day"), {
      target: { value: "6" },
    });
    fireEvent.change(screen.getByLabelText("New problems"), {
      target: { value: "3" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save for tomorrow" }));

    expect(onSave).toHaveBeenCalledWith({
      ...DEFAULT_SETTINGS,
      dailyTotal: 6,
      requestedNew: 3,
    });
  });
});
