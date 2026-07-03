import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import { deadlineLabel, EDITABLE_STATUSES, EMPTY_TOPIC, getRisk, validateTopic } from "./topicLogic";

function topicPayload(form, includeStatus = false) {
  return {
    name: form.name.trim(),
    difficulty: Number(form.difficulty),
    estimatedHours: Number(form.estimatedHours),
    deadline: form.deadline,
    ...(includeStatus ? { status: form.status } : {})
  };
}

export function TopicManagement({ token, activePlanId, selectedPlan, onTopicsLoaded }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(EMPTY_TOPIC);
  const [editingTopic, setEditingTopic] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const canMutate = Boolean(selectedPlan)
    && selectedPlan.status !== "archived"
    && !(selectedPlan.visibility === "public" && selectedPlan.status === "published");

  const topicsQuery = useQuery({
    queryKey: ["topics", activePlanId],
    queryFn: () => api(`/plans/${activePlanId}/topics`, { token }),
    enabled: Boolean(activePlanId) && Boolean(selectedPlan)
  });
  const topics = useMemo(() => Array.isArray(topicsQuery.data?.topics) ? topicsQuery.data.topics : [], [topicsQuery.data]);
  React.useEffect(() => {
    onTopicsLoaded?.(topics);
  }, [topics, onTopicsLoaded]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["topics", activePlanId] });
    queryClient.invalidateQueries({ queryKey: ["plans"] });
    queryClient.invalidateQueries({ queryKey: ["active-schedule", activePlanId] });
    queryClient.invalidateQueries({ queryKey: ["execution", activePlanId] });
    queryClient.invalidateQueries({ queryKey: ["adherence", activePlanId] });
    queryClient.invalidateQueries({ queryKey: ["recovery", activePlanId] });
  };

  const createTopic = useMutation({
    mutationFn: payload => api(`/plans/${activePlanId}/topics`, { method: "POST", token, body: payload }),
    onSuccess: () => {
      setForm(EMPTY_TOPIC);
      setServerError("");
      invalidate();
    },
    onError: error => setServerError(error.message)
  });

  const updateTopic = useMutation({
    mutationFn: ({ id, payload }) => api(`/plans/${activePlanId}/topics/${id}`, { method: "PATCH", token, body: payload }),
    onSuccess: () => {
      setEditingTopic(null);
      setForm(EMPTY_TOPIC);
      setServerError("");
      invalidate();
    },
    onError: error => setServerError(error.message)
  });

  const deleteTopic = useMutation({
    mutationFn: id => api(`/plans/${activePlanId}/topics/${id}`, { method: "DELETE", token }),
    onSuccess: invalidate,
    onError: error => setServerError(error.message)
  });

  const reorderTopic = useMutation({
    mutationFn: nextTopics => api(`/plans/${activePlanId}/topics/reorder`, {
      method: "PATCH",
      token,
      body: { topicOrder: nextTopics.map(topic => topic.id) }
    }),
    onMutate: async nextTopics => {
      await queryClient.cancelQueries({ queryKey: ["topics", activePlanId] });
      const previous = queryClient.getQueryData(["topics", activePlanId]);
      queryClient.setQueryData(["topics", activePlanId], { topics: nextTopics });
      return { previous };
    },
    onError: (error, _nextTopics, context) => {
      setServerError(error.message);
      if (context?.previous) queryClient.setQueryData(["topics", activePlanId], context.previous);
    },
    onSettled: invalidate
  });

  const summary = useMemo(() => {
    const estimated = topics.reduce((sum, topic) => sum + Number(topic.estimatedHours || 0), 0);
    const remaining = topics.reduce((sum, topic) => sum + Number(topic.estimatedHours || 0) * (1 - Number(topic.progress || 0)), 0);
    const risky = topics.filter(topic => ["red", "amber"].includes(getRisk(topic).tone)).length;
    return { estimated, remaining, risky };
  }, [topics]);

  function submit(event) {
    event.preventDefault();
    setServerError("");
    const errors = validateTopic(form);
    setFormErrors(errors);
    if (Object.keys(errors).length) return;

    if (editingTopic) {
      updateTopic.mutate({ id: editingTopic.id, payload: topicPayload(form, true) });
      return;
    }

    createTopic.mutate(topicPayload(form));
  }

  function startEdit(topic) {
    setEditingTopic(topic);
    setForm({
      name: topic.name,
      difficulty: topic.difficulty,
      estimatedHours: topic.estimatedHours,
      deadline: topic.deadline,
      status: topic.status
    });
    setFormErrors({});
    setServerError("");
  }

  function moveTopic(index, direction) {
    const target = index + direction;
    if (target < 0 || target >= topics.length) return;
    const next = [...topics];
    [next[index], next[target]] = [next[target], next[index]];
    reorderTopic.mutate(next);
  }

  if (!activePlanId) {
    return (
      <section className="panel wide">
        <EmptyTopicState title="Select a plan to manage topics" text="Choose or create a plan to view and manage your study schedule." />
      </section>
    );
  }

  return (
    <section className="panel wide topic-management">
      <div className="section-title">
        <div>
          <h2>Topic Management</h2>
          <p>Manage scheduling inputs without duplicating scheduler logic in the frontend.</p>
        </div>
        <div className={canMutate ? "status-pill" : "status-pill warning"}>
          {canMutate ? "Mutable plan" : "Read-only template"}
        </div>
      </div>

      {!canMutate && (
        <div className="read-only-banner">
          This plan cannot be edited here. Published public templates and archived plans are protected by backend ownership and immutability rules.
        </div>
      )}

      <div className="topic-grid">
        <div className="topic-list">
          <div className="topic-summary-row">
            <TopicStat label="Topics" value={topics.length} />
            <TopicStat label="Estimated" value={`${summary.estimated.toFixed(1)}h`} />
            <TopicStat label="Remaining" value={`${summary.remaining.toFixed(1)}h`} />
            <TopicStat label="Risky" value={summary.risky} />
          </div>

          {topicsQuery.isLoading && <EmptyTopicState title="Loading topics" text="Fetching workload inputs from the backend." />}
          {topicsQuery.isError && <EmptyTopicState title="Topics unavailable" text={topicsQuery.error.message} />}
          {!topicsQuery.isLoading && !topicsQuery.isError && topics.length === 0 && (
            <EmptyTopicState
              title="This plan has no topics"
              text="Add topics with workload, difficulty, and deadlines to generate a schedule."
            />
          )}

          {topics.map((topic, index) => (
            <TopicCard
              key={topic.id}
              topic={topic}
              index={index}
              canMutate={canMutate}
              onEdit={() => startEdit(topic)}
              onDelete={() => deleteTopic.mutate(topic.id)}
              onMoveUp={() => moveTopic(index, -1)}
              onMoveDown={() => moveTopic(index, 1)}
              disableUp={index === 0 || reorderTopic.isPending}
              disableDown={index === topics.length - 1 || reorderTopic.isPending}
            />
          ))}
        </div>

        <form className="topic-form" onSubmit={submit}>
          <div>
            <h3>{editingTopic ? "Edit topic" : "Create topic"}</h3>
            <p>Keep inputs clean. The scheduler reads these values directly.</p>
          </div>
          <Field label="Topic title" error={formErrors.name}>
            <input disabled={!canMutate} value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} placeholder="e.g. PostgreSQL indexing" />
          </Field>
          <div className="form-row">
            <Field label="Difficulty" error={formErrors.difficulty}>
              <input disabled={!canMutate} type="number" min="1" max="5" step="1" value={form.difficulty} onChange={event => setForm({ ...form, difficulty: event.target.value })} />
            </Field>
            <Field label="Estimated hours" error={formErrors.estimatedHours}>
              <input disabled={!canMutate} type="number" min="0.25" step="0.25" value={form.estimatedHours} onChange={event => setForm({ ...form, estimatedHours: event.target.value })} />
            </Field>
          </div>
          <Field label="Deadline" error={formErrors.deadline}>
            <input
              disabled={!canMutate}
              value={form.deadline}
              onChange={event => setForm({ ...form, deadline: event.target.value })}
              placeholder="YYYY-MM-DD"
              inputMode="numeric"
            />
          </Field>
          {editingTopic && (
            <Field label="Status">
              <select disabled={!canMutate} value={form.status} onChange={event => setForm({ ...form, status: event.target.value })}>
                {EDITABLE_STATUSES.map(status => <option key={status} value={status}>{status.replace("_", " ")}</option>)}
              </select>
            </Field>
          )}
          {serverError && <p className="error-text">{serverError}</p>}
          <div className="form-actions">
            {editingTopic && <button type="button" className="secondary" onClick={() => { setEditingTopic(null); setForm(EMPTY_TOPIC); }}>Cancel</button>}
            <button className="primary" disabled={!canMutate || createTopic.isPending || updateTopic.isPending}>
              {editingTopic ? "Save topic" : "Add topic"}
            </button>
          </div>
          <p className="muted small">Notes are intentionally omitted because the current backend topic contract does not persist them.</p>
        </form>
      </div>
    </section>
  );
}

export function TopicIntelligencePanel({ topics = [] }) {
  const sortedByDeadline = [...topics].sort((a, b) => String(a.deadline).localeCompare(String(b.deadline))).slice(0, 4);
  const risky = topics.filter(topic => ["red", "amber"].includes(getRisk(topic).tone));
  const remaining = topics.reduce((sum, topic) => sum + Number(topic.estimatedHours || 0) * (1 - Number(topic.progress || 0)), 0);

  return (
    <section className="panel">
      <h2>Topic Intelligence</h2>
      <div className="mini-metrics">
        <TopicStat label="Remaining" value={`${remaining.toFixed(1)}h`} />
        <TopicStat label="Risky" value={risky.length} />
      </div>
      <div className="deadline-list">
        {sortedByDeadline.length === 0 && <p className="muted">Select a plan to inspect deadlines.</p>}
        {sortedByDeadline.map(topic => (
          <div key={topic.id} className="deadline-row">
            <span>{topic.name}</span>
            <strong>{deadlineLabel(topic.deadline)}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function TopicCard({ topic, canMutate, onEdit, onDelete, onMoveUp, onMoveDown, disableUp, disableDown }) {
  const risk = getRisk(topic);
  const remaining = Math.max(0, Number(topic.estimatedHours || 0) * (1 - Number(topic.progress || 0)));

  return (
    <article className="topic-card">
      <div className="topic-card-main">
        <div>
          <div className="topic-title-row">
            <strong>{topic.name}</strong>
            <RiskBadge risk={risk} />
          </div>
          <p>{risk.reason}</p>
        </div>
        <div className="topic-actions">
          <button className="icon-btn" disabled={!canMutate || disableUp} onClick={onMoveUp} title="Move up">↑</button>
          <button className="icon-btn" disabled={!canMutate || disableDown} onClick={onMoveDown} title="Move down">↓</button>
          <button className="secondary" disabled={!canMutate} onClick={onEdit}>Edit</button>
          <button className="secondary danger" disabled={!canMutate} onClick={onDelete}>Delete</button>
        </div>
      </div>
      <div className="progress-line">
        <span style={{ width: `${Math.round(Number(topic.progress || 0) * 100)}%` }} />
      </div>
      <div className="topic-meta-grid">
        <MetaChip label="Difficulty" value={`${topic.difficulty}/5`} />
        <MetaChip label="Workload" value={`${Number(topic.estimatedHours).toFixed(1)}h`} />
        <MetaChip label="Remaining" value={`${remaining.toFixed(1)}h`} />
        <MetaChip label="Deadline" value={deadlineLabel(topic.deadline)} />
        <MetaChip label="Status" value={topic.status.replace("_", " ")} />
      </div>
    </article>
  );
}

function Field({ label, error, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {error && <small className="error-text">{error}</small>}
    </label>
  );
}

function TopicStat({ label, value }) {
  return (
    <div className="topic-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function MetaChip({ label, value }) {
  return (
    <div className="meta-chip">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function RiskBadge({ risk }) {
  return <span className={`risk-badge ${risk.tone}`}>{risk.label}</span>;
}

function EmptyTopicState({ title, text }) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      <span>{text}</span>
    </div>
  );
}
