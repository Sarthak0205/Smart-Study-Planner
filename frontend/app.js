const API = "http://localhost:8000";
let currentTopic = null;

// 🔥 STORE RESULTS FOR COMPARISON
const results = {
  join: null,
  limit: null,
  direct: null
};

init();

async function init() {
  await loadTopics();
  await loadSchedule();
}

//
// 🔹 LOAD TOPICS
//
async function loadTopics() {
  const res = await fetch(`${API}/topics`);
  const topics = await res.json();

  topicCount.innerText = topics.length;
  topicsContainer.innerHTML = "";

  topics.forEach(t => {
    topicsContainer.innerHTML += `
      <div class="bg-white p-5 rounded-xl shadow hover:shadow-lg transition">
        <h3 class="font-semibold text-lg">${t.name}</h3>

        <p class="text-sm text-gray-500 mt-2">
          ${new Date(t.deadline).toLocaleDateString()}
        </p>

        <div class="mt-3 flex justify-between">
          <span class="px-2 py-1 bg-blue-100 text-blue-600 rounded text-xs">
            Difficulty ${t.difficulty}
          </span>
          <span class="text-xs text-gray-400">
            ${(t.progress * 100 || 0).toFixed(0)}%
          </span>
        </div>
      </div>
    `;
  });
}

//
// 🔹 ADD TOPIC
//
async function addTopic() {
  const topic = {
    name: name.value,
    difficulty: parseFloat(difficulty.value),
    estimated_hours: parseFloat(hours.value),
    deadline: deadline.value
  };

  if (!topic.name || !topic.difficulty || !topic.estimated_hours || !topic.deadline) {
    alert("Fill all fields");
    return;
  }

  await fetch(`${API}/topics`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(topic)
  });

  alert("Added");
  loadTopics();
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

  await fetch(`${API}/schedule/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dailyHours: dh })
  });

  alert("Generated");
  loadSchedule();
}

//
// 🔹 LOAD SCHEDULE
//
async function loadSchedule() {
  const res = await fetch(`${API}/schedule`);
  const schedules = await res.json();

  scheduleTable.innerHTML = "";
  todayPlan.innerHTML = "";

  const today = new Date().toLocaleDateString();
  let total = 0;

  const todaySchedule = schedules.find(day =>
    new Date(day.date).toLocaleDateString() === today
  );

  if (todaySchedule) {
    const groupedToday = {};

    todaySchedule.ScheduleItems.forEach(item => {
      if (item.topic_name.startsWith("Reinforce")) return;

      groupedToday[item.topic_name] =
        (groupedToday[item.topic_name] || 0) + item.allocated_hours;
    });

    Object.entries(groupedToday).forEach(([topic, hours]) => {
      total += hours;

      todayPlan.innerHTML += `
        <div class="flex justify-between border-b pb-1">
          <span>${topic}</span>
          <span>${hours}h</span>
        </div>
      `;
    });
  }

  schedules.forEach(day => {
    const date = new Date(day.date).toLocaleDateString();
    const grouped = {};

    day.ScheduleItems.forEach(item => {
      if (item.topic_name.startsWith("Reinforce")) return;

      if (!grouped[item.topic_name]) {
        grouped[item.topic_name] = {
          hours: 0,
          priority: item.priority_score,
          reason: item.reason
        };
      }

      grouped[item.topic_name].hours += item.allocated_hours;
    });

    Object.entries(grouped).forEach(([topic, data]) => {
      const r = JSON.parse(data.reason || "{}");

      const reasonText = r.difficulty
        ? `Difficulty: ${r.difficulty}, Urgency: ${r.urgency}`
        : "System generated";

      const priority = Number(data.priority).toFixed(2);

      scheduleTable.innerHTML += `
        <tr class="border-b hover:bg-gray-50">
          <td class="p-3">${date}</td>
          <td>${topic}</td>
          <td class="text-center">${data.hours}</td>
          <td class="text-center">${priority}</td>
          <td>${reasonText}</td>
        </tr>
      `;
    });
  });

  todayHours.innerText = total;
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

    const res = await fetch(`${API}/api/db-analysis?mode=${mode}`);

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

