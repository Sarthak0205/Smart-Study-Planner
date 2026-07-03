import { describe, expect, it } from "vitest";
import { deadlineLabel, getRisk, validateTopic } from "./topicLogic";

const now = new Date("2026-05-25T00:00:00");

describe("topic validation", () => {
  it("rejects invalid scheduling inputs", () => {
    const errors = validateTopic({ name: "", difficulty: 8, estimatedHours: 0, deadline: "" });

    expect(errors.name).toBeTruthy();
    expect(errors.difficulty).toBeTruthy();
    expect(errors.estimatedHours).toBeTruthy();
    expect(errors.deadline).toBeTruthy();
  });

  it("accepts valid scheduling inputs", () => {
    const errors = validateTopic({ name: "Indexes", difficulty: 4, estimatedHours: 3, deadline: "2026-05-30" });

    expect(errors).toEqual({});
  });
});

describe("topic risk indicators", () => {
  it("marks overdue incomplete topics as red", () => {
    const risk = getRisk({ deadline: "2026-05-20", estimatedHours: 3, progress: 0.25, difficulty: 3, status: "in_progress" }, now);

    expect(risk.tone).toBe("red");
  });

  it("marks near-deadline heavy workload as high pressure", () => {
    const risk = getRisk({ deadline: "2026-05-26", estimatedHours: 8, progress: 0.1, difficulty: 3, status: "pending" }, now);

    expect(risk.tone).toBe("amber");
  });

  it("formats deadline labels", () => {
    expect(deadlineLabel("2026-05-25", now)).toBe("Today");
    expect(deadlineLabel("2026-05-24", now)).toBe("1d overdue");
  });
});
