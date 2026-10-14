
const form = document.getElementById("session-form");
const activityList = document.getElementById("activity-list");
const formMessage = document.getElementById("form-message");

const STORAGE_KEY = "footyTrackSessions";

let sessions = loadSessions();

const charts = {
  goals: null,
  training: null,
  fitness: null
};

function loadSessions() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const data = saved ? JSON.parse(saved) : [];
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Could not load saved sessions:", error);
    return [];
  }
}

function saveSessions() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    return true;
  } catch (error) {
    console.error("Could not save saved sessions:", error);
    formMessage.textContent =
      "Could not save data. Check your browser storage settings.";
    return false;
  }
}

function formatDate(dateString) {
  const date = new Date(dateString + "T12:00:00");

  return date.toLocaleDateString("en", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function getChronologicalSessions(type) {
  return sessions
    .filter(session => !type || session.type === type)
    .slice()
    .sort((a, b) => {
      const dateDifference = a.date.localeCompare(b.date);
      return dateDifference || a.createdAt - b.createdAt;
    });
}

function updateDashboard() {
  const matches = sessions.filter(
    session => session.type === "Match"
  );

  const training = sessions.filter(
    session => session.type === "Training"
  );

  const goals = matches.reduce(
    (total, session) => total + Number(session.goals || 0), 0
  );

  const assists = matches.reduce(
    (total, session) => total + Number(session.assists || 0), 0
  );

  const trainingMinutes = training.reduce(
    (total, session) => total + Number(session.duration || 0), 0
  );

  document.getElementById("matches-count").textContent =
    matches.length;

  document.getElementById("goals-count").textContent = goals;

  document.getElementById("assists-count").textContent = assists;

  document.getElementById("training-hours").textContent =
    (trainingMinutes / 60).toFixed(1);

  renderActivity();
  renderCharts();
}

function renderActivity() {
  if (sessions.length === 0) {
    activityList.innerHTML = `
      <div class="empty-state">
        <span>⚽</span>
        <h3>Your story starts here</h3>
        <p>Save your first training session or match to see it here.</p>
      </div>
    `;
    return;
  }

  const recentSessions = [...sessions]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 10);

  activityList.innerHTML = recentSessions.map(session => `
    <article class="activity-item">
      <div class="activity-top">
        <div>
          <div class="activity-title">${escapeHTML(session.type)}</div>
          <div class="activity-date">${formatDate(session.date)}</div>
        </div>
        <span class="activity-tag">${session.fitness}/10 fitness</span>
      </div>

      <div class="activity-stats">
        <span>⏱ ${session.duration} min</span>
        ${session.type === "Match" ? `
          <span>⚽ ${session.goals} goals</span>
          <span>🎯 ${session.assists} assists</span>
        ` : ""}
      </div>

      ${session.notes ? `
        <p class="activity-notes">${escapeHTML(session.notes)}</p>
      ` : ""}
    </article>
  `).join("");
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function createChart(canvasId, config) {
  const canvas = document.getElementById(canvasId);

  if (!canvas || typeof Chart === "undefined") {
    return null;
  }

  return new Chart(canvas, config);
}

function renderCharts() {
  // The dashboard still works if the chart library fails to load.
  if (typeof Chart === "undefined") {
    console.warn("Chart.js has not loaded. Check your internet connection.");
    return;
  }

  // Destroy old charts before rebuilding them.
  Object.keys(charts).forEach(key => {
    if (charts[key]) {
      charts[key].destroy();
      charts[key] = null;
    }
  });

  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: "#cbd5e1",
          usePointStyle: true,
          padding: 18
        }
      }
    },
    scales: {
      x: {
        ticks: {
          color: "#94a3b8",
          maxRotation: 35,
          minRotation: 0
        },
        grid: {
          color: "rgba(148, 163, 184, 0.10)"
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          color: "#94a3b8",
          precision: 0
        },
        grid: {
          color: "rgba(148, 163, 184, 0.12)"
        }
      }
    }
  };

  // Chart 1: goals and assists in recent matches.
  const recentMatches = getChronologicalSessions("Match").slice(-10);

  charts.goals = createChart("goals-chart", {
    type: "bar",
    data: {
      labels: recentMatches.map(session => formatDate(session.date)),
      datasets: [
        {
          label: "Goals",
          data: recentMatches.map(session => Number(session.goals || 0)),
          backgroundColor: "#22c55e",
          borderRadius: 5
        },
        {
          label: "Assists",
          data: recentMatches.map(session => Number(session.assists || 0)),
          backgroundColor: "#38bdf8",
          borderRadius: 5
        }
      ]
    },
    options: {
      ...commonOptions,
      scales: {
        ...commonOptions.scales,
        y: {
          ...commonOptions.scales.y,
          suggestedMax: 1
        }
      }
    }
  });

  // Chart 2: duration of recent training sessions.
  const recentTraining = getChronologicalSessions("Training").slice(-10);

  charts.training = createChart("training-chart", {
    type: "line",
    data: {
      labels: recentTraining.map(session => formatDate(session.date)),
      datasets: [{
        label: "Minutes trained",
        data: recentTraining.map(session => Number(session.duration || 0)),
        borderColor: "#a78bfa",
        backgroundColor: "rgba(167, 139, 250, 0.15)",
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        pointBackgroundColor: "#a78bfa"
      }]
    },
    options: commonOptions
  });

  // Chart 3: fitness ratings across recent sessions.
  const recentFitness = getChronologicalSessions().slice(-10);

  charts.fitness = createChart("fitness-chart", {
    type: "line",
    data: {
      labels: recentFitness.map(session => formatDate(session.date)),
      datasets: [{
        label: "Fitness rating / 10",
        data: recentFitness.map(session => Number(session.fitness || 0)),
        borderColor: "#fb923c",
        backgroundColor: "rgba(251, 146, 60, 0.15)",
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        pointBackgroundColor: "#fb923c"
      }]
    },
    options: {
      ...commonOptions,
      scales: {
        ...commonOptions.scales,
        y: {
          ...commonOptions.scales.y,
          min: 0,
          max: 10,
          ticks: {
            ...commonOptions.scales.y.ticks,
            stepSize: 2
          }
        }
      }
    }
  });
}

function getLocalDate() {
  const now = new Date();
  const timezoneOffset = now.getTimezoneOffset() * 60000;

  return new Date(now.getTime() - timezoneOffset)
    .toISOString()
    .slice(0, 10);
}

document.getElementById("session-date").value = getLocalDate();

form.addEventListener("submit", function (event) {
  event.preventDefault();

  const session = {
    id: Date.now(),
    createdAt: Date.now(),
    type: document.getElementById("session-type").value,
    date: document.getElementById("session-date").value,
    duration: Number(document.getElementById("duration").value),
    fitness: Number(document.getElementById("fitness").value),
    goals: Number(document.getElementById("goals").value),
    assists: Number(document.getElementById("assists").value),
    notes: document.getElementById("notes").value.trim()
  };

  if (
    !session.date ||
    session.duration < 1 ||
    session.duration > 600 ||
    !Number.isFinite(session.duration) ||
    session.fitness < 1 ||
    session.fitness > 10 ||
    !Number.isFinite(session.fitness) ||
    session.goals < 0 ||
    session.goals > 99 ||
    !Number.isFinite(session.goals) ||
    session.assists < 0 ||
    session.assists > 99 ||
    !Number.isFinite(session.assists)
  ) {
    formMessage.textContent = "Please check your entries and try again.";
    return;
  }

  sessions.push(session);

  if (!saveSessions()) {
    sessions.pop();
    return;
  }

  updateDashboard();
  form.reset();

  document.getElementById("session-date").value = getLocalDate();
  document.getElementById("goals").value = 0;
  document.getElementById("assists").value = 0;

  formMessage.textContent = "Session saved successfully! Keep it up. ⚽";
});

updateDashboard();
