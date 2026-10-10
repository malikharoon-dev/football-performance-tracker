const form = document.getElementById("session-form");
const activityList = document.getElementById("activity-list");
const formMessage = document.getElementById("form-message");

const STORAGE_KEY = "footyTrackSessions";

let sessions = loadSessions();

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
    console.error("Could not save sessions:", error);
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

function updateDashboard() {
  const matches = sessions.filter(
    session => session.type === "Match"
  );

  const training = sessions.filter(
    session => session.type === "Training"
  );

  const goals = matches.reduce(
    (total, session) => total + session.goals, 0
  );

  const assists = matches.reduce(
    (total, session) => total + session.assists, 0
  );

  const trainingMinutes = training.reduce(
    (total, session) => total + session.duration, 0
  );

  document.getElementById("matches-count").textContent =
    matches.length;

  document.getElementById("goals-count").textContent = goals;

  document.getElementById("assists-count").textContent = assists;

  document.getElementById("training-hours").textContent =
    (trainingMinutes / 60).toFixed(1);

  renderActivity();
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
    session.fitness < 1 ||
    session.fitness > 10 ||
    session.goals < 0 ||
    session.assists < 0
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