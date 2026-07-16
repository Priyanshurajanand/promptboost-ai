const API = "http://localhost:8000";

// ─── DOM Refs ──────────────────────────────────────────────────
const authPanel      = document.getElementById("authPanel");
const loggedInPanel  = document.getElementById("loggedInPanel");
const historyPanel   = document.getElementById("historyPanel");
const emailInput     = document.getElementById("email");
const passwordInput  = document.getElementById("password");
const loginBtn       = document.getElementById("loginBtn");
const registerBtn    = document.getElementById("registerBtn");
const logoutBtn      = document.getElementById("logoutBtn");
const authMessage    = document.getElementById("authMessage");
const statusBadge    = document.getElementById("statusBadge");
const statusText     = document.getElementById("statusText");
const userEmailEl    = document.getElementById("userEmail");
const userAvatarEl   = document.getElementById("userAvatar");
const historyList    = document.getElementById("historyList");
const clearHistoryBtn = document.getElementById("clearHistoryBtn");

// ─── Utilities ─────────────────────────────────────────────────

function showMessage(text, type = "error") {
  authMessage.textContent = text;
  authMessage.className = `auth-message ${type}`;
  authMessage.classList.remove("hidden");
}

function clearMessage() {
  authMessage.className = "auth-message hidden";
  authMessage.textContent = "";
}

function setLoadingBtn(btn, loading) {
  btn.disabled = loading;
  btn.style.opacity = loading ? "0.6" : "1";
}

// ─── Backend Health ─────────────────────────────────────────────

async function checkBackendStatus() {
  try {
    const res = await fetch(`${API}/`, { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      statusBadge.classList.add("online");
      statusText.textContent = "Online";
    }
  } catch {
    statusBadge.classList.remove("online");
    statusText.textContent = "Offline";
  }
}

// ─── Auth State ─────────────────────────────────────────────────

function showLoggedIn(email) {
  authPanel.classList.add("hidden");
  loggedInPanel.classList.remove("hidden");
  historyPanel.classList.remove("hidden");
  userEmailEl.textContent = email;
  userAvatarEl.textContent = email.charAt(0).toUpperCase();
  loadHistory();
}

function showLoggedOut() {
  loggedInPanel.classList.add("hidden");
  historyPanel.classList.add("hidden");
  authPanel.classList.remove("hidden");
}

chrome.storage.sync.get(["token", "userEmail"], ({ token, userEmail: email }) => {
  if (token && email) showLoggedIn(email);
  else showLoggedOut();
});

// ─── Register ──────────────────────────────────────────────────

registerBtn.onclick = async () => {
  const email    = emailInput.value.trim();
  const password = passwordInput.value;
  if (!email || !password) { showMessage("Enter email and password."); return; }

  clearMessage();
  setLoadingBtn(registerBtn, true);
  registerBtn.textContent = "Registering…";

  try {
    const res  = await fetch(`${API}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (res.ok) showMessage("✓ Registered! Now log in.", "success");
    else        showMessage(data.detail || "Registration failed.");
  } catch {
    showMessage("Cannot reach backend. Is it running?");
  } finally {
    setLoadingBtn(registerBtn, false);
    registerBtn.textContent = "Register";
  }
};

// ─── Login ─────────────────────────────────────────────────────

loginBtn.onclick = async () => {
  const email    = emailInput.value.trim();
  const password = passwordInput.value;
  if (!email || !password) { showMessage("Enter email and password."); return; }

  clearMessage();
  setLoadingBtn(loginBtn, true);
  loginBtn.innerHTML = `<span class="btn-icon">⏳</span> Logging in…`;

  try {
    const res  = await fetch(`${API}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (res.ok && data.access_token) {
      chrome.storage.sync.set({ token: data.access_token, userEmail: email });
      showLoggedIn(email);
    } else {
      showMessage(data.detail || "Invalid credentials.");
    }
  } catch {
    showMessage("Cannot reach backend. Is it running?");
  } finally {
    setLoadingBtn(loginBtn, false);
    loginBtn.innerHTML = `<span class="btn-icon">→</span> Login`;
  }
};

// ─── Logout ────────────────────────────────────────────────────

logoutBtn.onclick = () => {
  chrome.storage.sync.remove(["token", "userEmail"]);
  emailInput.value    = "";
  passwordInput.value = "";
  clearMessage();
  showLoggedOut();
};

// ─── History (Feature 2) ────────────────────────────────────────

const MODE_ICONS = {
  default:   "✨",
  creative:  "🎨",
  technical: "⚙️",
  concise:   "✂️",
  detailed:  "📋",
  eli5:      "👶",
};

function formatRelativeTime(isoString) {
  const diff = Date.now() - new Date(isoString).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0)  return `${d}d ago`;
  if (h > 0)  return `${h}h ago`;
  if (m > 0)  return `${m}m ago`;
  return "just now";
}

function loadHistory() {
  chrome.storage.local.get({ pb_history: [] }, ({ pb_history }) => {
    if (!pb_history.length) {
      historyList.innerHTML = '<div class="history-empty">No prompts optimized yet</div>';
      return;
    }

    historyList.innerHTML = pb_history.slice(0, 8).map(item => `
      <div class="history-item">
        <div class="history-item-top">
          <span class="history-mode-badge">${MODE_ICONS[item.mode] || "✨"} ${item.mode}</span>
          <span class="history-time">${formatRelativeTime(item.timestamp)}</span>
        </div>
        <div class="history-original">${item.original.slice(0, 70)}${item.original.length > 70 ? "…" : ""}</div>
        <div class="history-arrow">↓</div>
        <div class="history-optimized">${item.optimized.slice(0, 70)}${item.optimized.length > 70 ? "…" : ""}</div>
      </div>
    `).join("");
  });
}

clearHistoryBtn.onclick = () => {
  chrome.storage.local.set({ pb_history: [] });
  historyList.innerHTML = '<div class="history-empty">History cleared</div>';
};

// ─── Init ──────────────────────────────────────────────────────
checkBackendStatus();
