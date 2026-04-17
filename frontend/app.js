const API = "http://localhost:8000";
let currentTopic = null;
let ACTIVE_PLAN_ID = null;
// 🔥 STORE RESULTS FOR COMPARISON
const results = {
  join: null,
  limit: null,
  direct: null
};
let isLoginMode = true;


async function init() {
  await loadPlans();

  if (!ACTIVE_PLAN_ID) {
    console.warn("No active plan — skipping dependent loads");
    clearUIForNoPlan();
    return;
  }

  await Promise.all([
    loadTopics(),
    loadSchedule(),
    loadToday()
  ]);
}

async function loadPlans() {
  const res = await apiFetch(`${API}/plans`);
  const plans = await res.json();

  const select = document.getElementById("planSelect");
  select.innerHTML = "";

  if (!plans || plans.length === 0) {
    ACTIVE_PLAN_ID = null;

    const opt = document.createElement("option");
    opt.innerText = "No plans yet";
    opt.disabled = true;
    opt.selected = true;
    select.appendChild(opt);

    return;
  }

  plans.forEach(p => {
    const option = document.createElement("option");
    option.value = p.id;
    option.innerText = p.title || `Plan ${p.id}`;
    select.appendChild(option);
  });

  // ✅ ensure valid active plan
  if (!ACTIVE_PLAN_ID || !plans.find(p => p.id == ACTIVE_PLAN_ID)) {
    ACTIVE_PLAN_ID = plans[0].id;
  }

  select.value = ACTIVE_PLAN_ID;
}
async function changePlan() {
  const select = document.getElementById("planSelect");
  const id = select.value;

  if (!id) return;

  ACTIVE_PLAN_ID = id;

  await init();
}

async function loadToday() {
  if (!ACTIVE_PLAN_ID) return;

  const container = document.getElementById("todayContainer");
  const hoursEl = document.getElementById("scheduleHours");

  if (!container || !hoursEl) {
    console.error("❌ todayContainer or todayHours missing");
    return;
  }

  container.innerHTML = "Loading...";
  hoursEl.innerText = 0;

  try {
    const res = await apiFetch(
      `${API}/schedule/today?planId=${ACTIVE_PLAN_ID}`
    );

    const schedule = await res.json();

    if (!schedule || !schedule.ScheduleItems?.length) {
      container.innerHTML = "<p>No tasks available</p>";
      return;
    }

    const today = new Date();
    const scheduleDate = new Date(schedule.date);

    const isToday =
      today.toDateString() === scheduleDate.toDateString();

    container.innerHTML = `
      <span class="task-label ${isToday ? "label-today" : "label-upcoming"}">
        ${isToday ? "Today's Tasks" : "Upcoming Tasks"}
      </span>
    `;

    let total = 0;

    schedule.ScheduleItems.forEach(item => {
      if (item.StudyLogs && item.StudyLogs.length > 0) {
        return; // skip completed tasks
      }
      total += Number(item.allocated_hours);

      const div = document.createElement("div");
      div.className = "task-item";

      div.innerHTML = `
        <div class="task-main">
          <span class="task-name">${item.topic_name}</span>
          <span class="task-hours">${item.allocated_hours} hrs</span>
        </div>

        <div class="task-actions">
          <button class="done-btn easy">Easy</button>
          <button class="done-btn medium">Medium</button>
          <button class="done-btn hard">Hard</button>
        </div>
      `;

      const buttons = div.querySelectorAll(".done-btn");
      console.log("ITEM HOURS:", item.allocated_hours);
      console.log("TOTAL:", total);
      buttons.forEach(btn => {
        btn.addEventListener("click", async () => {
          if (btn.dataset.clicked) return;
          btn.dataset.clicked = "true";

          buttons.forEach(b => (b.disabled = true));

          try {
            await markDone(
              item.id,
              btn.innerText.toLowerCase(),
              buttons,
              div,
              item.allocated_hours,
              hoursEl
            );
          } catch (err) {
            buttons.forEach(b => (b.disabled = false));
            delete btn.dataset.clicked;
          }
        });
      });

      container.appendChild(div);
    });

    // ✅ CORRECT TOTAL HOURS
    hoursEl.innerText = total;

  } catch (err) {
    console.error("❌ loadToday error:", err);
    container.innerHTML = "<p>Error loading tasks</p>";
    hoursEl.innerText = 0;
  }
}
//
// 🔹 LOAD TOPICS
//

async function loadTopics() {
  const container = document.getElementById("topicsContainer");
  const countEl = document.getElementById("topicCount");

  if (!ACTIVE_PLAN_ID) {
    container.innerHTML = "<p class='text-gray-500'>Select a plan first</p>";
    countEl.innerText = 0;
    return;
  }

  const requestPlanId = ACTIVE_PLAN_ID; // 🔥 SNAPSHOT

  container.innerHTML = "Loading...";

  let res;

  try {
    res = await apiFetch(`${API}/topics?planId=${requestPlanId}`);
  } catch (err) {
    console.error(err);
    container.innerHTML = "<p class='text-red-500'>Failed to load topics</p>";
    return;
  }

  if (!res || !res.ok) {
    container.innerHTML = "<p class='text-red-500'>Error loading topics</p>";
    return;
  }

  const topics = await res.json();

  // 🔴 CRITICAL CHEC

  if (!Array.isArray(topics) || topics.length === 0) {
    container.innerHTML = "<p class='text-gray-500'>No topics in this plan</p>";
    countEl.innerText = 0;
    return;
  }

  container.innerHTML = "";

  topics.forEach(t => {
    const div = document.createElement("div");
    div.className = "bg-white p-5 rounded-xl shadow";

    div.innerHTML = `
      <h3 class="font-semibold">${t.name}</h3>
      <p class="text-sm">${new Date(t.deadline).toLocaleDateString()}</p>
    `;

    container.appendChild(div);
  });

  countEl.innerText = topics.length;
}
//
// 🔹 ADD TOPIC
//
async function addTopic() {
  const nameInput = document.querySelector("#topicName");
  const difficultyInput = document.querySelector("#difficulty");
  const hoursInput = document.querySelector("#hours");
  const deadlineInput = document.querySelector("#deadline");

  if (!nameInput || !difficultyInput || !hoursInput || !deadlineInput) {
    console.error("❌ Missing input fields");
    return;
  }

  const name = nameInput.value.trim();
  const difficulty = Number(difficultyInput.value);
  const estimated_hours = Number(hoursInput.value);
  const deadline = deadlineInput.value;

  if (!name || !estimated_hours || !ACTIVE_PLAN_ID) {
    alert("Fill all fields and select a plan");
    return;
  }

  await apiFetch(`${API}/topics`, {
    method: "POST",
    body: JSON.stringify({
      name,
      difficulty,
      estimated_hours,
      deadline,
      planId: ACTIVE_PLAN_ID
    })
  });

  alert("✅ Topic added");

  // clear inputs
  nameInput.value = "";
  difficultyInput.value = "";
  hoursInput.value = "";
  deadlineInput.value = "";

  await loadTopics();
}

//
// 🔹 GENERATE SCHEDULE
//
async function generateSchedule() {
  const dh = parseFloat(dailyHours.value);

  if (!dh) {
    alert("Enter daily hours");
    return;
  }
  if (!ACTIVE_PLAN_ID) {
    alert("Select a plan first");
    return;
  }

  await apiFetch(`${API}/schedule/plans/${ACTIVE_PLAN_ID}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dailyHours: dh })
  });

  alert("Generated");
  await loadSchedule();
  await loadToday();
}

//
// 🔹 LOAD SCHEDULE
//
async function loadSchedule() {
  if (!ACTIVE_PLAN_ID) {
    console.warn("Skipping schedule load — no plan");
    scheduleTable.innerHTML = "";
    return;
  }

  let res;

  try {
    res = await apiFetch(`${API}/schedule?planId=${ACTIVE_PLAN_ID}`);
  } catch (err) {
    console.error("Schedule API failed", err);
    return;
  }

  if (res.status === 404) {
    scheduleTable.innerHTML = `
    <tr>
      <td colspan="5" class="text-center text-gray-500 p-4">
        No schedule yet. Click "Generate Schedule".
      </td>
    </tr>
  `;
    return;
  }

  if (!res.ok) {
    console.error("Failed to load schedule", res.status);
    return;
  }

  const schedules = await res.json();

  if (!Array.isArray(schedules)) {
    console.error("Invalid schedule response", schedules);
    return;
  }

  scheduleTable.innerHTML = "";

  schedules.forEach(day => {
    const date = new Date(day.date).toLocaleDateString();

    day.ScheduleItems.forEach(item => {
      const r = JSON.parse(item.reason || "{}");

      const reasonText = r.difficulty
        ? `Difficulty: ${r.difficulty}, Urgency: ${r.urgency}`
        : "System generated";

      const priority = item.priority_score
        ? Number(item.priority_score).toFixed(2)
        : "-";

      scheduleTable.innerHTML += `
        <tr class="border-b hover:bg-gray-50">
          <td class="p-3">${date}</td>
          <td>${item.topic_name}</td>
          <td class="text-center">${item.allocated_hours}</td>
          <td class="text-center">${priority}</td>
          <td>${reasonText}</td>
        </tr>
      `;
    });
  });
}

// =============================
// 🔥 GLOBAL STATE
// =============================

let activeMode = "join";

// =============================
// 🔥 MAIN FUNCTION
// =============================
async function runDBAnalysis(mode) {
  activeMode = mode;

  const statusEl = document.getElementById("statusMessage");

  try {
    ["joinBtn", "limitBtn", "directBtn"].forEach(id => {
      document.getElementById(id)?.classList.remove("ring-2", "ring-offset-2");
    });

    document.getElementById(`${mode}Btn`)?.classList.add("ring-2", "ring-offset-2");

    // Reset error
    if (statusEl) {
      statusEl.innerText = "";
      statusEl.classList.remove("text-red-600");
    }

    // Reset plan (🔥 prevents glitch)
    document.getElementById("queryPlan").innerText = "";

    const res = await apiFetch(`${API}/api/db-analysis?mode=${mode}`);

    if (!res.ok) throw new Error("Network error");

    const data = await res.json();

    results[mode] = {
      time: data.executionTime,
      rows: data.metrics.rowsProcessed,
      hasSort: data.flags.hasSort,
      indexOptimized: data.flags.indexOptimizedOrder,
      usesIndex: data.flags.usesIndex,
      plan: JSON.stringify(data.plan, null, 2)
    };

    updateComparisonUI(mode);

  } catch (err) {
    console.error(err);

    if (statusEl) {
      statusEl.innerText = "❌ Failed to fetch analysis data";
      statusEl.classList.add("text-red-600");
    }
  }
}
// =============================
// 🔥 EXECUTION PLAN TOGGLE
// =============================
function togglePlan() {
  const plan = document.getElementById("queryPlan");

  if (plan.classList.contains("hidden")) {
    plan.classList.remove("hidden");
  } else {
    plan.classList.add("hidden");
  }
}


// ==============================
// 🔥 UPDATE UI (FINAL LOGIC)
// ==============================
function updateComparisonUI(mode) {

  const join = results.join;
  const limit = results.limit;
  const direct = results.direct;

  function update(id, val) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerText = val;
  }

  // Summary
  if (join) update("joinTime", `${join.time.toFixed(3)} ms • ${join.rows}`);
  if (limit) update("limitTime", `${limit.time.toFixed(3)} ms • ${limit.rows}`);
  if (direct) update("directTime", `${direct.time.toFixed(3)} ms • ${direct.rows}`);

  if (join && limit && direct) {
    const arr = [
      { k: "join", r: join.rows },
      { k: "limit", r: limit.rows },
      { k: "direct", r: direct.rows }
    ].sort((a, b) => a.r - b.r);

    document.getElementById("joinLabel").innerText = "";
    document.getElementById("limitLabel").innerText = "";
    document.getElementById("directLabel").innerText = "";

    document.getElementById(arr[0].k + "Label").innerText = "🔥 Most Efficient";
    document.getElementById(arr[1].k + "Label").innerText = "⚖️ Moderate";
    document.getElementById(arr[2].k + "Label").innerText = "⚠️ Heavy";
  }

  const cur = results[mode];
  if (!cur) return;

  update("rowsProcessed", cur.rows);
  update("execTime", cur.time.toFixed(3) + " ms");

  document.getElementById("sortUsed").innerText = cur.hasSort ? "YES ⚠️" : "NO 🔥";
  document.getElementById("indexUsed").innerText =
    cur.indexOptimized ? "Optimized 🔥" :
      cur.usesIndex ? "Index Used ⚠️" : "No Index ❌";


  const insights = {
    join: "Full dataset processed → join + sort required",
    limit: "LIMIT reduces output, not computation → full dataset still sorted",
    direct: "Composite index satisfies ORDER BY → no sorting needed"
  };

  document.getElementById("insightBox").innerText = insights[mode];

  if (join && direct) {
    const reduction = join.rows - direct.rows;
    document.getElementById("verdictBox").innerText =
      `✅ Index optimization reduces work by ${reduction} rows`;
  }

  document.getElementById("queryPlan").innerText = cur.plan;

  // 👇 KEEP THIS AT VERY END ONLY
  const modeMap = {
    join: "JOIN Query",
    limit: "LIMIT Query",
    direct: "DIRECT Query"
  };

  const labelEl = document.getElementById("modeLabel");
  if (labelEl) {
    labelEl.textContent = modeMap[mode] || "";

    // 🔥 FORCE REPAINT FIX
    labelEl.style.display = "none";
    labelEl.offsetHeight; // trigger reflow
    labelEl.style.display = "block";
  }
  console.log("MODE LABEL UPDATE:", mode);
}
//
// 🔹 NAVIGATION
//
function showSection(event, sectionId) {
  const sections = ["dashboardSection", "topicsSection", "scheduleSection", "dbSection"];

  sections.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add("hidden");
  });

  document.getElementById(sectionId).classList.remove("hidden");

  document.querySelectorAll("li").forEach(li =>
    li.classList.remove("text-blue-500")
  );

  event.target.classList.add("text-blue-500");
}

async function handleAuth() {
  clearAuthError();

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const name = document.getElementById("authName").value;
  const roleEl = document.getElementById("role"); // 🔥 FIX
  const role = roleEl ? roleEl.value : "student";

  if (!email || !password) {
    showAuthError("Fill all required fields");
    return;
  }

  try {
    if (isLoginMode) {
      // 🔐 LOGIN (NO ROLE SENT)
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password
        })
      });

      const data = await res.json();

      if (!res.ok) {
        showAuthError(data.message || "Invalid credentials");
        return;
      }

      // ✅ STORE TOKEN + ROLE
      localStorage.setItem("token", data.token);
      localStorage.setItem("role", data.user.role);

    } else {
      // 🆕 REGISTER (ROLE INCLUDED)
      if (!name) {
        showAuthError("Enter name");
        return;
      }

      const res = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          role   // 🔥 FIXED
        })
      });

      const data = await res.json();

      if (!res.ok) {
        showAuthError(data.message || "Registration failed");
        return;
      }

      showAuthError("Registered successfully. Now login.");
      toggleAuthMode();
      return;
    }

    // ✅ SUCCESS → ENTER APP
    document.getElementById("loginSection").classList.add("hidden");
    document.getElementById("app").classList.remove("hidden");

    init();

  } catch (err) {
    console.error(err);
    showAuthError("Something went wrong");
  }
}
function toggleAuthMode() {
  isLoginMode = !isLoginMode;

  const title = document.getElementById("authTitle");
  const btn = document.getElementById("authBtn");
  const toggleText = document.getElementById("toggleText");
  const nameInput = document.getElementById("authName");
  const roleField = document.getElementById("role"); // 🔥 FIX

  if (isLoginMode) {
    title.innerText = "Login";
    btn.innerText = "Login";
    toggleText.innerText = "Don't have an account?";

    nameInput.classList.add("hidden");
    if (roleField) roleField.classList.add("hidden");

  } else {
    title.innerText = "Register";
    btn.innerText = "Register";
    toggleText.innerText = "Already have an account?";

    nameInput.classList.remove("hidden");
    if (roleField) roleField.classList.remove("hidden");
  }
}

function logout() {
  localStorage.removeItem("token");
  location.reload();
}



async function apiFetch(url, options = {}) {
  const token = localStorage.getItem("token");

  if (!token) {
    alert("Not logged in");
    throw new Error("No token");
  }

  options.headers = {
    ...(options.headers || {}),
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
  };

  const res = await fetch(url, options);

  // 🔥 HANDLE EXPIRED TOKEN
  if (res.status === 401) {
    localStorage.removeItem("token");
    alert("Session expired. Login again.");
    location.reload();
    return;
  }

  return res;
}


function clearUIForNoPlan() {
  document.getElementById("topicsContainer").innerHTML =
    "<p class='text-gray-500'>No plan selected</p>";

  document.getElementById("topicCount").innerText = 0;

  document.getElementById("todayHours").innerText = 0;

  scheduleTable.innerHTML = "";
}

async function markDone(
  scheduleItemId,
  feedback,
  buttons,
  taskDiv,
  allocatedHours
) {
  if (!scheduleItemId) throw new Error("Missing scheduleItemId");

  // prevent double click
  if (taskDiv.dataset.logged) return;
  taskDiv.dataset.logged = "true";

  buttons.forEach(b => (b.disabled = true));

  try {
    const res = await apiFetch(`${API}/log`, {
      method: "POST",
      body: JSON.stringify({
        scheduleItemId,
        difficulty_feedback: feedback,
        hours_studied: allocatedHours
      })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Logging failed");
    }

    // ✅ UPDATE HOURS FIRST (IMPORTANT ORDER)
    const hoursEl = document.getElementById("scheduleHours");

    const current = parseInt(hoursEl.textContent.trim()) || 0;
    const updated = Math.max(0, current - Number(allocatedHours));

    hoursEl.textContent = updated;

    console.log("Hours:", current, "→", updated);

    // ✅ VISUAL FEEDBACK
    taskDiv.style.opacity = "0.5";

    const badge = document.createElement("span");
    badge.className = "completed-badge";
    badge.innerText = `✔ ${feedback}`;
    taskDiv.appendChild(badge);

    // ✅ REMOVE TASK (KEY FOR DEMO CLARITY)
    setTimeout(() => {
      taskDiv.remove();
    }, 400);

  } catch (err) {
    console.error("❌ markDone error:", err);

    if (err.message.includes("Already")) {
      console.log("Already logged — treating as success");

      const hoursEl = document.getElementById("scheduleHours");

      const current = parseInt(hoursEl.textContent.trim()) || 0;
      const updated = Math.max(0, current - Number(allocatedHours));

      hoursEl.textContent = updated;

      taskDiv.style.opacity = "0.5";

      const badge = document.createElement("span");
      badge.className = "completed-badge";
      badge.innerText = `✔ ${feedback}`;
      taskDiv.appendChild(badge);

      setTimeout(() => {
        taskDiv.remove();
      }, 400);

      return;
    }

    buttons.forEach(b => (b.disabled = false));
    delete taskDiv.dataset.logged;

    alert(err.message);
  }
}
async function regeneratePlan() {
  await apiFetch(`${API}/schedule/plans/${ACTIVE_PLAN_ID}/generate`, {
    method: "POST"
  });

  await loadToday();
}

window.onload = () => {
  const token = localStorage.getItem("token");

  if (token) {
    document.getElementById("loginSection").classList.add("hidden");
    document.getElementById("app").classList.remove("hidden");
    init();
  }
};

function showAuthError(msg) {
  const el = document.getElementById("authError");
  el.innerText = msg;
  el.classList.remove("hidden");
}

function clearAuthError() {
  const el = document.getElementById("authError");
  el.innerText = "";
  el.classList.add("hidden");
}

function openPlanModal() {
  document.getElementById("planModal").classList.remove("hidden");
}

function closePlanModal() {
  document.getElementById("planModal").classList.add("hidden");
  document.getElementById("planNameInput").value = "";
  document.getElementById("planError").classList.add("hidden");
}

async function submitPlan() {
  const input = document.getElementById("planNameInput");
  const error = document.getElementById("planError");

  const name = input.value.trim();

  // 🔴 VALIDATION
  if (!name) {
    error.innerText = "Enter plan name";
    error.classList.remove("hidden");
    return;
  }

  try {
    // 🔥 CREATE PLAN
    const res = await apiFetch(`${API}/plans`, {
      method: "POST",
      body: JSON.stringify({
        title: name   // ✅ MUST MATCH BACKEND
      })
    });

    if (!res.ok) {
      error.innerText = "Failed to create plan";
      error.classList.remove("hidden");
      return;
    }

    const data = await res.json();
    const newPlanId = data.planId;

    // 🔥 CLOSE MODAL
    closePlanModal();

    // 🔥 RELOAD PLANS
    await loadPlans();

    // 🔥 SET ACTIVE PLAN (CRITICAL FIX)
    ACTIVE_PLAN_ID = newPlanId;

    // 🔥 UPDATE DROPDOWN UI
    const select = document.getElementById("planSelect");
    if (select) {
      select.value = newPlanId;
    }

    // 🔥 REFRESH WHOLE UI
    await init();

  } catch (err) {
    console.error(err);
    error.innerText = "Something went wrong";
    error.classList.remove("hidden");
  }
}
function openPlanModal() {
  const modal = document.getElementById("planModal");
  modal.classList.remove("hidden");

  setTimeout(() => {
    document.getElementById("planNameInput").focus();
  }, 100);
}
function handlePlanChange(select) {
  ACTIVE_PLAN_ID = select.value;

  console.log("✅ Active Plan Set:", ACTIVE_PLAN_ID);

  if (!ACTIVE_PLAN_ID) {
    console.warn("No plan selected");
    return;
  }

  loadSchedule();
  loadToday();
}

function setInitialPlan(plans) {
  if (plans.length > 0) {
    ACTIVE_PLAN_ID = plans[0].id;

    document.getElementById("planSelect").value = ACTIVE_PLAN_ID;

    console.log("✅ Default Plan Set:", ACTIVE_PLAN_ID);
  }
}