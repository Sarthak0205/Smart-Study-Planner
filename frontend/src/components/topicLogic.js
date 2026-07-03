export const EMPTY_TOPIC = {
  name: "",
  difficulty: 3,
  estimatedHours: 2,
  deadline: "",
  status: "pending"
};

export const EDITABLE_STATUSES = ["pending", "not_started", "in_progress", "completed", "overdue", "archived"];

export function toDate(value) {
  return value ? new Date(`${value}T00:00:00`) : null;
}

export function daysUntil(deadline, now = new Date()) {
  const target = toDate(deadline);
  if (!target) return null;
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target - today) / 86400000);
}

export function getRisk(topic, now = new Date()) {
  const remainingHours = Math.max(0, Number(topic.estimatedHours || 0) * (1 - Number(topic.progress || 0)));
  const days = daysUntil(topic.deadline, now);
  if (topic.status === "completed") return { tone: "green", label: "Complete", reason: "No remaining workload." };
  if (topic.status === "overdue" || (days !== null && days < 0)) return { tone: "red", label: "Overdue", reason: "Deadline has passed while progress is incomplete." };
  if (days !== null && days <= 2 && remainingHours > 2) return { tone: "amber", label: "High pressure", reason: "Deadline is close relative to remaining workload." };
  if (Number(topic.difficulty) >= 4 && remainingHours > 0) return { tone: "blue", label: "Scheduler relevant", reason: "High-difficulty unfinished topics receive stronger scheduler attention." };
  return { tone: "slate", label: "Stable", reason: "Workload and deadline pressure are currently manageable." };
}

export function validateTopic(form) {
  const errors = {};
  if (!form.name.trim()) errors.name = "Topic title is required.";
  if (!Number.isFinite(Number(form.estimatedHours)) || Number(form.estimatedHours) <= 0) errors.estimatedHours = "Estimated hours must be greater than zero.";
  if (!Number.isFinite(Number(form.difficulty)) || Number(form.difficulty) < 1 || Number(form.difficulty) > 5) errors.difficulty = "Difficulty must be between 1 and 5.";
  if (!form.deadline || Number.isNaN(toDate(form.deadline)?.getTime())) errors.deadline = "A valid deadline is required.";
  return errors;
}

export function deadlineLabel(deadline, now = new Date()) {
  const days = daysUntil(deadline, now);
  if (days === null) return "No deadline";
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `${days}d left`;
}
