import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { create } from "zustand";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "./api";
import { TopicIntelligencePanel, TopicManagement } from "./components/TopicManagement";
import { APP_NAME, APP_TAGLINE } from "./shared/branding";
import "./styles.css";

const getMigratedKey = (newKey, oldKey) => {
  const val = localStorage.getItem(newKey) ?? localStorage.getItem(oldKey);
  if (localStorage.getItem(oldKey) !== null) {
    if (val !== null) {
      localStorage.setItem(newKey, val);
    }
    localStorage.removeItem(oldKey);
  }
  return val;
};

const tokenInit = getMigratedKey("studyflow_token", "acadence_token");
const userInit = getMigratedKey("studyflow_user", "acadence_user");

const useSession = create(set => ({
  token: tokenInit,
  user: JSON.parse(userInit || "null"),
  setSession: ({ token, user }) => {
    localStorage.setItem("studyflow_token", token);
    localStorage.setItem("studyflow_user", JSON.stringify(user));
    localStorage.removeItem("studyflow_active_plan_id");
    set({ token, user });
  },
  clearSession: () => {
    localStorage.removeItem("studyflow_token");
    localStorage.removeItem("studyflow_user");
    set({ token: null, user: null });
  }
}));

function Shell() {
  const { token, user, setSession, clearSession } = useSession();
  const [activePlanId, setActivePlanIdState] = useState(
    getMigratedKey("studyflow_active_plan_id", "acadence_active_plan_id")
  );
  const [selectedItem, setSelectedItem] = useState(null);
  const [activeTopics, setActiveTopics] = useState([]);
  const [activeNavItem, setActiveNavItem] = useState("Dashboard");

  const queryClient = useQueryClient();
  const [followConfirmPlan, setFollowConfirmPlan] = useState(null);
  const [successFeedback, setSuccessFeedback] = useState(null);
  const [serverErrorFeedback, setServerErrorFeedback] = useState(null);

  // Auto-clear feedback messages after 5 seconds
  useEffect(() => {
    if (successFeedback) {
      const timer = setTimeout(() => setSuccessFeedback(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successFeedback]);

  useEffect(() => {
    if (serverErrorFeedback) {
      const timer = setTimeout(() => setServerErrorFeedback(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [serverErrorFeedback]);

  // Query plans at Shell level to share active plan context with topbar
  const plans = useQuery({
    queryKey: ["plans"],
    queryFn: () => api("/plans?limit=50", { token }),
    enabled: Boolean(token)
  });

  const follow = useMutation({
    mutationFn: (planId) => api(`/plans/${planId}/follow`, {
      method: "POST",
      token
    }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["plans"] });
      if (data?.plan?.id) {
        setActivePlanId(data.plan.id);
        setSuccessFeedback(`Followed & cloned public template. You are now viewing your personal copy: "${data.plan.title}".`);
        setActiveNavItem("Plans");
      }
    },
    onError: (err) => {
      setServerErrorFeedback(err.message || "Failed to follow and clone public template.");
    }
  });

  useEffect(() => {
    function handleSessionRefreshed(event) {
      if (event.detail?.accessToken && event.detail?.user) {
        setSession({ token: event.detail.accessToken, user: event.detail.user });
      }
    }

    window.addEventListener("studyflow:session-refreshed", handleSessionRefreshed);
    window.addEventListener("studyflow:session-expired", clearSession);

    return () => {
      window.removeEventListener("studyflow:session-refreshed", handleSessionRefreshed);
      window.removeEventListener("studyflow:session-expired", clearSession);
    };
  }, [clearSession, setSession]);

  function navigateToSection(item) {
    setActiveNavItem(item.label);
  }

  function setActivePlanId(planId) {
    if (planId) {
      localStorage.setItem("studyflow_active_plan_id", String(planId));
    } else {
      localStorage.removeItem("studyflow_active_plan_id");
    }
    setSelectedItem(null);
    setActivePlanIdState(planId);
  }

  function handleLogout() {
    localStorage.removeItem("studyflow_active_plan_id");
    setActivePlanIdState(null);
    setSelectedItem(null);
    clearSession();
  }

  if (!token) return <AuthScreen />;

  const ownedPlans = plans.data?.plans || [];
  const selectedPlan = ownedPlans.find(plan => String(plan.id) === String(activePlanId));

  return (
    <div className="app-shell">
      <Sidebar user={user} activeNavItem={activeNavItem} onNavigate={navigateToSection} onLogout={handleLogout} />
      <main className="workspace">
        <Header activePlan={selectedPlan} activeView={activeNavItem} />
        
        {successFeedback && (
          <div className="success-text" style={{
            margin: "16px 0 0 0",
            padding: "12px 16px",
            background: "#ecfdf5",
            border: "1px solid #a7f3d0",
            borderRadius: "8px",
            color: "#065f46",
            fontSize: "14px",
            fontWeight: "500",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}>
            <span>{successFeedback}</span>
            <button type="button" onClick={() => setSuccessFeedback(null)} style={{ background: "none", border: "none", color: "inherit", fontWeight: "bold", cursor: "pointer", fontSize: "16px", padding: 0 }}>×</button>
          </div>
        )}
        
        {serverErrorFeedback && (
          <div className="error-text" style={{
            margin: "16px 0 0 0",
            padding: "12px 16px",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "8px",
            color: "#991b1b",
            fontSize: "14px",
            fontWeight: "500",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}>
            <span>{serverErrorFeedback}</span>
            <button type="button" onClick={() => setServerErrorFeedback(null)} style={{ background: "none", border: "none", color: "inherit", fontWeight: "bold", cursor: "pointer", fontSize: "16px", padding: 0 }}>×</button>
          </div>
        )}

        <Dashboard
          activeView={activeNavItem}
          user={user}
          token={token}
          activePlanId={activePlanId}
          setActivePlanId={setActivePlanId}
          selectedItem={selectedItem}
          setSelectedItem={setSelectedItem}
          setActiveTopics={setActiveTopics}
          plansQuery={plans}
          onFollowConfirm={setFollowConfirmPlan}
          followPending={follow.isPending}
          followVariables={follow.variables}
          setSuccessFeedback={setSuccessFeedback}
          setServerErrorFeedback={setServerErrorFeedback}
        />
      </main>
      <UtilityPanel
        token={token}
        activePlanId={activePlanId}
        selectedItem={selectedItem}
        setSelectedItem={setSelectedItem}
        activeTopics={activeTopics}
      />

      {followConfirmPlan && (
        <div className="modal-overlay" onClick={() => setFollowConfirmPlan(null)} style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(15, 23, 42, 0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          backdropFilter: "blur(4px)"
        }}>
          <div className="panel" onClick={e => e.stopPropagation()} style={{
            width: "min(460px, 100%)",
            padding: "24px",
            background: "#fff",
            borderRadius: "12px",
            boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)",
            display: "grid",
            gap: "16px"
          }}>
            <div style={{ display: "grid", gap: "6px" }}>
              <p className="eyebrow" style={{ margin: 0 }}>Follow & Clone Template</p>
              <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0 }}>{followConfirmPlan.title}</h2>
              <p className="muted" style={{ fontSize: "14px", marginTop: "8px", lineHeight: "1.5" }}>
                This will create your own editable copy of the public template.
              </p>
              <p className="muted" style={{ fontSize: "14px", lineHeight: "1.5" }}>
                Your copy can be modified independently and will not affect the original template.
              </p>
            </div>
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "8px" }}>
              <button type="button" className="secondary" onClick={() => setFollowConfirmPlan(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="primary"
                onClick={() => {
                  follow.mutate(followConfirmPlan.id);
                  setFollowConfirmPlan(null);
                }}
              >
                Create My Copy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AuthScreen() {
  const setSession = useSession(state => state.setSession);
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "student" });
  const mutation = useMutation({
    mutationFn: () => api(`/auth/${mode}`, {
      method: "POST",
      body: mode === "login"
        ? { email: form.email, password: form.password }
        : form
    }),
    onSuccess: data => setSession({ token: data.accessToken, user: data.user })
  });

  return (
    <div className="auth-page">
      <section className="auth-card">
        <p className="eyebrow">{APP_NAME}</p>
        <h1>{APP_TAGLINE}</h1>
        <p className="muted">Sign in to inspect plans, schedules, recovery pressure, and scheduler reasoning from one operational dashboard.</p>
        <div className="segmented">
          <button className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>Login</button>
          <button className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>Register</button>
        </div>
        <form onSubmit={event => { event.preventDefault(); mutation.mutate(); }} className="form-grid">
          {mode === "register" && (
            <>
              <input value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} placeholder="Name" />
              <select value={form.role} onChange={event => setForm({ ...form, role: event.target.value })}>
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
              </select>
            </>
          )}
          <input value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} placeholder="Email" />
          <input type="password" value={form.password} onChange={event => setForm({ ...form, password: event.target.value })} placeholder="Password" />
          {mode === "register" && <p className="field-hint">Use at least 8 characters with one letter and one number.</p>}
          {mutation.error && <p className="error-text">{mutation.error.message}</p>}
          <button className="primary" disabled={mutation.isPending}>{mutation.isPending ? "Working" : mode === "login" ? "Login" : "Create account"}</button>
        </form>
      </section>
    </div>
  );
}

function Sidebar({ user, activeNavItem, onNavigate, onLogout }) {
  const items = [
    { label: "Dashboard" },
    { label: "Plans" },
    { label: "Schedule" },
    { label: "Recovery" },
    { label: "Analytics" },
    { label: "History" },
    { label: "Settings" }
  ];
  return (
    <aside className="sidebar">
      <div>
        <h2>{APP_NAME}</h2>
        <p className="muted small">Scheduling intelligence platform</p>
      </div>
      <nav>
        {items.map(item => (
          <button
            type="button"
            key={item.label}
            className={activeNavItem === item.label ? "nav active" : "nav"}
            onClick={() => onNavigate(item)}
          >
            {item.label}
          </button>
        ))}
      </nav>
      <div id="settings-section" className="profile-card">
        <strong>{user?.name}</strong>
        <span>{user?.role}</span>
        <button className="secondary" onClick={onLogout}>Logout</button>
      </div>
    </aside>
  );
}

function formatSchedulerError(message) {
  if (message === "Plan has no schedulable topics") {
    return "This plan currently has no schedulable topics. Add topics with workload, difficulty, and deadlines before generating a schedule.";
  }
  if (message && message.toLowerCase().includes("impossible")) {
    return "The required study workload exceeds your daily hour capacity. Try increasing capacity, extending deadlines, or reducing difficulty.";
  }
  return message || "An unexpected scheduler error occurred. Please try again.";
}

function Header({ activePlan, activeView }) {
  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">Operational dashboard</p>
        <h1>{activeView === "Dashboard" ? "Study execution overview" : activeView}</h1>
      </div>
      <div className={activePlan ? "status-pill" : "status-pill warning"}>
        {activePlan ? `Active Plan: ${activePlan.title}` : "Select a plan"}
      </div>
    </header>
  );
}

function Dashboard({
  activeView,
  user,
  token,
  activePlanId,
  setActivePlanId,
  selectedItem,
  setSelectedItem,
  setActiveTopics,
  plansQuery: plans,
  onFollowConfirm,
  followPending,
  followVariables,
  setSuccessFeedback,
  setServerErrorFeedback
}) {
  const queryClient = useQueryClient();
  const [planForm, setPlanForm] = useState({ title: "", visibility: "private" });
  const [planError, setPlanError] = useState("");

  const userProfile = useQuery({
    queryKey: ["user-profile"],
    queryFn: () => api("/users/profile", { token }),
    enabled: Boolean(token) && activeView === "Settings"
  });

  const setSession = useSession(state => state.setSession);
  const [profileForm, setProfileForm] = useState({ name: "", email: "" });
  const [profileSuccess, setProfileSuccess] = useState("");
  const [profileError, setProfileError] = useState("");

  const [passwordForm, setPasswordForm] = useState({ oldPassword: "", newPassword: "", confirmPassword: "" });
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    if (userProfile.data?.profile) {
      setProfileForm({
        name: userProfile.data.profile.name || "",
        email: userProfile.data.profile.email || ""
      });
    }
  }, [userProfile.data]);

  const updateProfile = useMutation({
    mutationFn: (body) => api("/users/profile", {
      method: "PATCH",
      token,
      body
    }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      setSession({ token, user: data.profile });
      setProfileSuccess("Profile updated successfully.");
      setProfileError("");
    },
    onError: (err) => {
      setProfileError(err.message || "Failed to update profile.");
      setProfileSuccess("");
    }
  });

  const updatePassword = useMutation({
    mutationFn: (body) => api("/users/change-password", {
      method: "POST",
      token,
      body
    }),
    onSuccess: () => {
      setPasswordSuccess("Password updated successfully.");
      setPasswordError("");
      setPasswordForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
    },
    onError: (err) => {
      setPasswordError(err.message || "Failed to update password.");
      setPasswordSuccess("");
    }
  });

  const ownedPlans = Array.isArray(plans.data?.plans) ? plans.data.plans : [];
  const selectedPlan = ownedPlans.find(plan => String(plan.id) === String(activePlanId));
  const isPlanOwned = Boolean(selectedPlan);

  const publicPlans = useQuery({ queryKey: ["public-plans"], queryFn: () => api("/plans/public?limit=8", { token }) });
  const activeSchedule = useQuery({
    queryKey: ["active-schedule", activePlanId],
    queryFn: () => api(`/schedule-runs/active?planId=${activePlanId}`, { token }),
    enabled: Boolean(activePlanId) && !plans.isLoading && isPlanOwned,
    retry: false
  });
  const execution = useQuery({
    queryKey: ["execution", activePlanId],
    queryFn: () => api(`/execution/status?planId=${activePlanId}`, { token }),
    enabled: Boolean(activePlanId) && !plans.isLoading && isPlanOwned
  });
  const adherence = useQuery({
    queryKey: ["adherence", activePlanId],
    queryFn: () => api(`/execution/adherence?planId=${activePlanId}`, { token }),
    enabled: Boolean(activePlanId) && !plans.isLoading && isPlanOwned
  });
  const recovery = useQuery({
    queryKey: ["recovery", activePlanId],
    queryFn: () => api(`/execution/recovery?planId=${activePlanId}`, { token }),
    enabled: Boolean(activePlanId) && !plans.isLoading && isPlanOwned
  });
  const history = useQuery({
    queryKey: ["schedule-history", activePlanId],
    queryFn: () => api(`/schedule-runs?planId=${activePlanId}&limit=10`, { token }),
    enabled: Boolean(activePlanId) && !plans.isLoading && isPlanOwned && activeView === "History"
  });

  const generate = useMutation({
    mutationFn: () => api(`/plans/${activePlanId}/schedule-runs`, {
      method: "POST",
      token,
      body: { dailyCapacityHours: 2, forceRegenerate: true }
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active-schedule", activePlanId] });
      queryClient.invalidateQueries({ queryKey: ["execution", activePlanId] });
      queryClient.invalidateQueries({ queryKey: ["adherence", activePlanId] });
      queryClient.invalidateQueries({ queryKey: ["recovery", activePlanId] });
      setSuccessFeedback("Schedule generated successfully based on topic priorities.");
    }
  });

  const createPlan = useMutation({
    mutationFn: () => api("/plans", {
      method: "POST",
      token,
      body: {
        title: planForm.title.trim(),
        visibility: planForm.visibility
      }
    }),
    onSuccess: data => {
      setPlanError("");
      setPlanForm({ title: "", visibility: "private" });
      queryClient.invalidateQueries({ queryKey: ["plans"] });
      if (data?.plan?.id) {
        setActivePlanId(data.plan.id);
        setSuccessFeedback(`Plan "${data.plan.title}" created successfully!`);
      }
    },
    onError: error => setPlanError(error.message)
  });

  const days = Array.isArray(activeSchedule.data?.scheduleRun?.days) ? activeSchedule.data.scheduleRun.days : [];
  const templates = Array.isArray(publicPlans.data?.plans) ? publicPlans.data.plans : [];
  const scheduleHistory = Array.isArray(history.data?.scheduleRuns) ? history.data.scheduleRuns : [];
  const missedSessions = Array.isArray(recovery.data?.recovery?.missedSessions) ? recovery.data.recovery.missedSessions : [];

  const chartData = days.map(day => ({
    date: day.date.slice(5),
    planned: day.totalPlannedHours,
    completed: Array.isArray(day.items) ? day.items.filter(item => ["completed", "recovered"].includes(item.status)).length : 0
  }));
  const showAll = activeView === "Dashboard";
  const show = (...views) => showAll || views.includes(activeView);

  useEffect(() => {
    if (!plans.isLoading && !activePlanId && ownedPlans.length === 1) {
      setActivePlanId(ownedPlans[0].id);
      return;
    }

    if (!plans.isLoading && activePlanId && !selectedPlan) {
      setActivePlanId(null);
    }
  }, [plans.isLoading, activePlanId, ownedPlans, selectedPlan, setActivePlanId]);

  return (
    <div className="dashboard-grid">
      {show("Plans") && <section className="panel wide">
        <div className="section-title">
          <div>
            <h2>Plans</h2>
            <p>Owned plans and public templates stay separate. Following a template creates a private clone.</p>
          </div>
          <select value={activePlanId || ""} onChange={event => setActivePlanId(event.target.value || null)}>
            <option value="">Choose plan</option>
            {ownedPlans.map(plan => <option key={plan.id} value={plan.id}>{plan.title}</option>)}
          </select>
        </div>
        <form
          className="plan-create"
          onSubmit={event => {
            event.preventDefault();
            if (!planForm.title.trim()) {
              setPlanError("Plan title is required.");
              return;
            }
            createPlan.mutate();
          }}
        >
          <input
            value={planForm.title}
            onChange={event => setPlanForm({ ...planForm, title: event.target.value })}
            placeholder="Create a plan, e.g. Database Systems"
          />
          <select
            value={planForm.visibility}
            onChange={event => setPlanForm({ ...planForm, visibility: event.target.value })}
            title={user?.role === "student" ? "Students should usually keep plans private" : "Teachers can prepare public templates"}
          >
            <option value="private">Private plan</option>
            {["teacher", "admin"].includes(user?.role) && <option value="public">Public draft</option>}
          </select>
          <button className="primary" disabled={createPlan.isPending}>
            {createPlan.isPending ? "Creating" : "Create plan"}
          </button>
        </form>
        {planError && <p className="error-text plan-error">{planError}</p>}
        {plans.isLoading && (
          <EmptyState title="Loading plans" text="Retrieving your study plans..." />
        )}
        {!plans.isLoading && plans.isError && (
          <EmptyState title="Failed to load plans" text={plans.error.message || "Failed to retrieve plans."} />
        )}
        {!plans.isLoading && !plans.isError && ownedPlans.length === 0 && (
          <div className="empty plan-empty">
            <strong>No plans yet</strong>
            <span>Create your first study plan to begin scheduling and progress tracking.</span>
          </div>
        )}
        <div className="plan-list">
          {ownedPlans.map(plan => (
            <button key={plan.id} className={String(plan.id) === String(activePlanId) ? "plan-row selected" : "plan-row"} onClick={() => setActivePlanId(plan.id)}>
              <strong>{plan.title}</strong>
              <span>{plan.status} · {plan.visibility}</span>
            </button>
          ))}
        </div>
      </section>}

      {show("Analytics", "Recovery", "Schedule") && <>
        <Metric title="Adherence" value={`${Math.round((adherence.data?.adherence?.hourAdherence || 0) * 100)}%`} label="planned vs actual" isLoading={adherence.isLoading && Boolean(activePlanId)} />
        <Metric title="Recovery Debt" value={`${recovery.data?.recovery?.recoveryDebtHours || 0}h`} label={recovery.data?.recovery?.recommendationReason || "no plan selected"} isLoading={recovery.isLoading && Boolean(activePlanId)} />
        <Metric title="Execution" value={`${execution.data?.status?.items?.completed || 0}/${execution.data?.status?.items?.total || 0}`} label="completed sessions" isLoading={execution.isLoading && Boolean(activePlanId)} />
      </>}

      {show("Plans") && <TopicManagement
        token={token}
        activePlanId={activePlanId}
        selectedPlan={selectedPlan}
        onTopicsLoaded={setActiveTopics}
      />}

      {show("Schedule") && <section className="panel tall">
        <div className="section-title">
          <div>
            <h2>Schedule</h2>
            <p>{selectedPlan ? selectedPlan.title : "Select a plan to load schedule execution."}</p>
          </div>
          <button className="primary" disabled={!activePlanId || generate.isPending} onClick={() => generate.mutate()}>
            {generate.isPending ? "Regenerating" : "Regenerate"}
          </button>
        </div>
        {generate.error && (
          <div className="error-text" style={{
            marginTop: "12px",
            padding: "10px 14px",
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "8px",
            color: "#991b1b",
            fontSize: "14px"
          }}>
            <strong>Schedule Generation Failed:</strong> {formatSchedulerError(generate.error.message)}
          </div>
        )}
        {!activePlanId && (
          <EmptyState title="No plan selected" text="Choose or create a plan to view and manage your study schedule." />
        )}
        {activePlanId && activeSchedule.isLoading && (
          <EmptyState title="Loading schedule" text="Retrieving your study schedule from the backend..." />
        )}
        {activePlanId && !activeSchedule.isLoading && activeSchedule.isError && (
          <EmptyState title="No active schedule" text="Generate a schedule to allocate your workload across available study days." />
        )}
        {activePlanId && !activeSchedule.isLoading && !activeSchedule.isError && days.length === 0 && (
          <EmptyState title="Schedule is empty" text="This plan has no scheduled items. Add topics and click Regenerate." />
        )}
        {activePlanId && !activeSchedule.isLoading && days.map(day => (
          <div key={day.id} className="day-block">
            <div className="day-header">
              <strong>{day.date}</strong>
              <span>{day.totalPlannedHours} planned hrs</span>
            </div>
            {day.items.map(item => (
              <button key={item.id} className={selectedItem?.id === item.id ? "schedule-item selected" : "schedule-item"} onClick={() => setSelectedItem(item)}>
                <span>
                  <strong>{item.topic?.name || `Topic ${item.topicId}`}</strong>
                  <small>{item.allocatedHours}h · {item.status}</small>
                </span>
                <span className="score">{Math.round(item.priorityScore * 100)}</span>
              </button>
            ))}
          </div>
        ))}
      </section>}

      {show("Schedule", "Analytics") && <section className="panel">
        <h2>Workload Distribution</h2>
        {!activePlanId || activeSchedule.isError || days.length === 0 ? (
          <EmptyState title="No execution data yet" text="Complete study sessions to unlock adherence and progress analytics." />
        ) : (
          <div className="chart">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="planned" fill="#2563eb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>}

      {show("Plans") && <section className="panel">
        <h2>Public Templates</h2>
        {publicPlans.isLoading && (
          <EmptyState title="Loading templates" text="Fetching public templates..." />
        )}
        {!publicPlans.isLoading && publicPlans.isError && (
          <EmptyState title="Templates unavailable" text={publicPlans.error.message || "Failed to load"} />
        )}
        {!publicPlans.isLoading && !publicPlans.isError && templates.length === 0 && (
          <EmptyState title="No public templates" text="No public templates are currently published." />
        )}
        <div className="compact-list">
          {!publicPlans.isLoading && !publicPlans.isError && templates.map(plan => (
            <div className="template-row" key={plan.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <strong>{plan.title}</strong>
                <span style={{ display: "block", marginTop: "4px" }}>{plan.owner?.name || "Teacher"} · {plan.topicCount || 0} topics</span>
              </div>
              <button
                type="button"
                className="secondary"
                style={{ fontSize: "12px", padding: "6px 10px", alignSelf: "center", border: "1px solid #dbe4ef", background: "#fff", borderRadius: "8px", cursor: "pointer" }}
                disabled={followPending}
                onClick={() => onFollowConfirm(plan)}
              >
                {followPending && followVariables === plan.id ? "Cloning..." : "Follow & Clone"}
              </button>
            </div>
          ))}
        </div>
      </section>}

      {activeView === "Recovery" && (
        <section className="panel wide">
          <h2>Recovery Workspace</h2>
          <div className="recovery-grid">
            <Metric title="Recovery Debt" value={`${recovery.data?.recovery?.recoveryDebtHours || 0}h`} label={recovery.data?.recovery?.recommendationReason || "no plan selected"} isLoading={recovery.isLoading && Boolean(activePlanId)} />
            <Metric title="Overdue Topics" value={recovery.data?.recovery?.overdueTopics || 0} label="from execution state" isLoading={recovery.isLoading && Boolean(activePlanId)} />
            <Metric title="Regeneration" value={recovery.data?.recovery?.regenerationRecommended ? "Needed" : "Stable"} label="backend recommendation" isLoading={recovery.isLoading && Boolean(activePlanId)} />
          </div>
          <div className="compact-list">
            {recovery.isLoading && Boolean(activePlanId) && <EmptyState title="Loading recovery data" text="Fetching missed sessions and recovery details..." />}
            {!recovery.isLoading && missedSessions.map(session => (
              <div className="template-row" key={session.scheduleItemId}>
                <strong>{session.topicName}</strong>
                <span>{session.remainingHours}h remaining · {session.date}</span>
              </div>
            ))}
            {activePlanId && !recovery.isLoading && !missedSessions.length && <EmptyState title="No missed sessions" text="Recovery pressure is currently stable for this plan." />}
            {!activePlanId && <EmptyState title="Select a plan" text="Recovery state is plan-specific." />}
          </div>
        </section>
      )}

      {activeView === "History" && (
        <section className="panel wide">
          <h2>Schedule History</h2>
          <div className="compact-list">
            {!activePlanId && <EmptyState title="Select a plan" text="Schedule history is shown per plan." />}
            {history.isLoading && <EmptyState title="Loading history" text="Fetching historical schedule runs." />}
            {!history.isLoading && scheduleHistory.map(run => (
              <div className="template-row" key={run.id}>
                <strong>Run #{run.id}</strong>
                <span>{run.status} · {run.feasibilityStatus} · {new Date(run.generatedAt).toLocaleString()}</span>
              </div>
            ))}
            {activePlanId && !history.isLoading && !scheduleHistory.length && <EmptyState title="No history yet" text="Generate a schedule to create the first run." />}
          </div>
        </section>
      )}

      {activeView === "Settings" && (
        <section className="panel wide">
          <div className="section-title" style={{ marginBottom: "20px" }}>
            <div>
              <h2>Settings</h2>
              <p>Manage your StudyFlow account settings and profile credentials.</p>
            </div>
          </div>

          {userProfile.isLoading ? (
            <EmptyState title="Loading profile" text="Fetching your profile info..." />
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px" }}>
              
              {/* Profile Details Form */}
              <form onSubmit={e => {
                e.preventDefault();
                if (!profileForm.name.trim() || !profileForm.email.trim()) {
                  setProfileError("Name and email are required.");
                  return;
                }
                updateProfile.mutate(profileForm);
              }} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <h3 style={{ fontSize: "16px", marginBottom: "4px" }}>Edit Profile</h3>
                  <p className="muted" style={{ fontSize: "13px" }}>Update your display name and registered email address.</p>
                </div>
                
                <div className="field">
                  <span>Name</span>
                  <input
                    value={profileForm.name}
                    onChange={e => setProfileForm({ ...profileForm, name: e.target.value })}
                    placeholder="Your display name"
                  />
                </div>

                <div className="field">
                  <span>Email</span>
                  <input
                    type="email"
                    value={profileForm.email}
                    onChange={e => setProfileForm({ ...profileForm, email: e.target.value })}
                    placeholder="Your email address"
                  />
                </div>

                {profileError && <p className="error-text">{profileError}</p>}
                {profileSuccess && <p className="success-text">{profileSuccess}</p>}

                <button type="submit" className="primary" disabled={updateProfile.isPending} style={{ alignSelf: "flex-start", minWidth: "120px" }}>
                  {updateProfile.isPending ? "Saving..." : "Save Profile"}
                </button>
              </form>

              {/* Password Management Form */}
              <form onSubmit={e => {
                e.preventDefault();
                if (!passwordForm.oldPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
                  setPasswordError("All fields are required.");
                  return;
                }
                if (passwordForm.newPassword !== passwordForm.confirmPassword) {
                  setPasswordError("New passwords do not match.");
                  return;
                }
                updatePassword.mutate({
                  oldPassword: passwordForm.oldPassword,
                  newPassword: passwordForm.newPassword
                });
              }} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <h3 style={{ fontSize: "16px", marginBottom: "4px" }}>Change Password</h3>
                  <p className="muted" style={{ fontSize: "13px" }}>Change password to ensure account security.</p>
                </div>

                <div className="field">
                  <span>Current Password</span>
                  <input
                    type="password"
                    value={passwordForm.oldPassword}
                    onChange={e => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
                    placeholder="Current password"
                  />
                </div>

                <div className="field">
                  <span>New Password</span>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    placeholder="At least 8 chars (1 letter, 1 number)"
                  />
                </div>

                <div className="field">
                  <span>Confirm New Password</span>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    placeholder="Confirm new password"
                  />
                </div>

                {passwordError && <p className="error-text">{passwordError}</p>}
                {passwordSuccess && <p className="success-text">{passwordSuccess}</p>}

                <button type="submit" className="primary" disabled={updatePassword.isPending} style={{ alignSelf: "flex-start", minWidth: "120px" }}>
                  {updatePassword.isPending ? "Changing..." : "Change Password"}
                </button>
              </form>

            </div>
          )}

          <p className="muted settings-note" style={{ marginTop: "24px", paddingTop: "16px", borderTop: "1px solid #e1e7f0" }}>
            Account role is set to <strong>{user?.role || "student"}</strong>. For security, role adjustments and account deletion are handled by administrators.
          </p>
        </section>
      )}
    </div>
  );
}

function UtilityPanel({ token, activePlanId, selectedItem, setSelectedItem, activeTopics }) {
  const queryClient = useQueryClient();
  const [logHours, setLogHours] = useState("");
  const [logMessage, setLogMessage] = useState("");
  const recovery = useQuery({
    queryKey: ["utility-recovery", activePlanId],
    queryFn: () => api(`/execution/recovery?planId=${activePlanId}`, { token }),
    enabled: Boolean(activePlanId)
  });
  const score = selectedItem?.reason?.score;
  const canLogSelectedItem = Boolean(selectedItem) && ["planned", "active", "missed"].includes(selectedItem.status);

  useEffect(() => {
    setLogHours(selectedItem?.allocatedHours ? String(selectedItem.allocatedHours) : "");
    setLogMessage("");
  }, [selectedItem?.id, selectedItem?.allocatedHours]);

  const submitLog = useMutation({
    mutationFn: () => api(`/execution/schedule-items/${selectedItem.id}/logs`, {
      method: "POST",
      token,
      body: { hoursStudied: Number(logHours) }
    }),
    onSuccess: data => {
      setLogMessage(`Logged ${Number(data.studyLog.hoursStudied).toFixed(1)}h. Topic progress is ${Math.round(data.topicProgress.progress * 100)}%.`);
      queryClient.invalidateQueries({ queryKey: ["active-schedule", activePlanId] });
      queryClient.invalidateQueries({ queryKey: ["execution", activePlanId] });
      queryClient.invalidateQueries({ queryKey: ["adherence", activePlanId] });
      queryClient.invalidateQueries({ queryKey: ["recovery", activePlanId] });
      queryClient.invalidateQueries({ queryKey: ["utility-recovery", activePlanId] });
      setSelectedItem?.({
        ...selectedItem,
        status: data.scheduleItem.status
      });
    },
    onError: error => setLogMessage(error.message)
  });

  return (
    <aside className="utility">
      <section className="panel">
        <h2>Why scheduled?</h2>
        {!selectedItem && <EmptyState title="Select a schedule item" text="The reasoning panel will show score factors and constraints." />}
        {selectedItem && (
          <div className="reason-stack">
            <strong>{selectedItem.topic?.name}</strong>
            <p>{selectedItem.reason?.decision?.reason}</p>
            {score && Object.entries(score).filter(([key]) => !["weights", "total"].includes(key)).map(([key, value]) => (
              <div className="factor" key={key}>
                <span>{key.replace(/([A-Z])/g, " $1")}</span>
                <meter min="0" max="1" value={Number(value)} />
                <strong>{Number(value).toFixed(2)}</strong>
              </div>
            ))}
          </div>
        )}
      </section>
      <section className="panel">
        <h2>Log execution</h2>
        {!selectedItem && <EmptyState title="Select a schedule item" text="Study logs connect planned work to adaptive progress." />}
        {selectedItem && (
          <form
            className="log-form"
            onSubmit={event => {
              event.preventDefault();
              setLogMessage("");
              if (!Number.isFinite(Number(logHours)) || Number(logHours) <= 0) {
                setLogMessage("Hours studied must be greater than zero.");
                return;
              }
              submitLog.mutate();
            }}
          >
            <p className="muted small">{canLogSelectedItem ? "Record actual work for this scheduled session." : `This item is ${selectedItem.status} and cannot accept another log.`}</p>
            <label className="field">
              <span>Hours studied</span>
              <input
                disabled={!canLogSelectedItem || submitLog.isPending}
                type="number"
                min="0.25"
                step="0.25"
                value={logHours}
                onChange={event => setLogHours(event.target.value)}
              />
            </label>
            {logMessage && <p className={submitLog.isError ? "error-text" : "success-text"}>{logMessage}</p>}
            <button className="primary" disabled={!canLogSelectedItem || submitLog.isPending}>
              {submitLog.isPending ? "Logging" : "Log session"}
            </button>
          </form>
        )}
      </section>
      <section id="recovery-section" className="panel">
        <h2>Recovery Pressure</h2>
        <p className="large-number">{recovery.data?.recovery?.recoveryDebtHours || 0}h</p>
        <p className="muted">{recovery.data?.recovery?.recommendationReason || "Select a plan to inspect recovery pressure."}</p>
      </section>
      <section className="panel calendar-card">
        <h2>Calendar</h2>
        <p>{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</p>
        <p className="muted">Upcoming deadline intelligence comes from backend schedule and topic APIs.</p>
      </section>
      <TopicIntelligencePanel topics={activeTopics} />
    </aside>
  );
}

function Metric({ id, title, value, label, isLoading }) {
  return (
    <section id={id} className="metric-card">
      <span>{title}</span>
      <strong>{isLoading ? <span style={{ opacity: 0.5 }}>...</span> : value}</strong>
      <small>{label}</small>
    </section>
  );
}

function EmptyState({ title, text }) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      <span>{text}</span>
    </div>
  );
}

const queryClient = new QueryClient();

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <Shell />
    </QueryClientProvider>
  </React.StrictMode>
);
