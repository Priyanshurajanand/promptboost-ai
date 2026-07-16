/* PromptBoost AI — Content Script v3 */

console.log("PromptBoost AI v3 loaded (Groq + Modes + History)");

// ─── State ────────────────────────────────────────────────────
let optimizeButton = null;
let modeSelectorEl = null;
let suggestionBox  = null;
let overlayEl      = null;
let currentMode    = "default";

const MODES = [
  { key: "default",   label: "✨ Default"   },
  { key: "creative",  label: "🎨 Creative"  },
  { key: "technical", label: "⚙️ Technical" },
  { key: "concise",   label: "✂️ Concise"   },
  { key: "detailed",  label: "📋 Detailed"  },
  { key: "eli5",      label: "👶 ELI5"      },
];

// ─── Helpers ──────────────────────────────────────────────────

function getBoxText(box) {
  if (!box) return "";
  return box.value !== undefined ? box.value : box.innerText;
}

function setBoxText(box, text) {
  box.focus();
  if (box.value !== undefined) {
    box.value = "";
  } else {
    box.innerText = "";
  }
  document.execCommand("insertText", false, text);
  box.dispatchEvent(new Event("input", { bubbles: true }));
}

function findInputBox() {
  return (
    document.querySelector("div#prompt-textarea") ||
    document.querySelector("div[contenteditable='true'][data-lexical-editor]") ||
    document.querySelector("div.ql-editor[contenteditable='true']") ||
    document.querySelector("textarea") ||
    document.querySelector('[contenteditable="true"]')
  );
}

// ─── Core Optimize Function ───────────────────────────────────

async function optimizeText(text, mode, inputBox = null) {
  closeSuggestionBox();
  if (optimizeButton) setButtonLoading(true);

  try {
    const res = await fetch("http://localhost:8000/optimize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: text, mode }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();

    // Save to local history
    saveToHistory(text, data.optimized_prompt, mode);

    showSuggestionBox(inputBox, data.optimized_prompt, mode);

  } catch (err) {
    console.error("PromptBoost Error:", err);
    showToast("Backend unreachable — is it running?", "error");
  } finally {
    if (optimizeButton) setButtonLoading(false);
  }
}

// ─── Optimize Button + Mode Selector ─────────────────────────

function createOptimizeButton(inputBox) {
  if (document.getElementById("promptboost-btn")) return;

  // Mode selector pill row
  modeSelectorEl = document.createElement("div");
  modeSelectorEl.id = "promptboost-modes";

  MODES.forEach(({ key, label }) => {
    const pill = document.createElement("button");
    pill.type = "button";
    pill.className = "pb-mode-pill" + (key === currentMode ? " active" : "");
    pill.dataset.mode = key;
    pill.textContent = label;
    pill.title = `Optimize in ${label.split(" ").slice(1).join(" ")} mode`;
    pill.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      currentMode = key;
      document.querySelectorAll(".pb-mode-pill").forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
    });
    modeSelectorEl.appendChild(pill);
  });

  // Main optimize button
  optimizeButton = document.createElement("button");
  optimizeButton.id = "promptboost-btn";
  optimizeButton.type = "button";
  optimizeButton.title = "Optimize prompt (Alt+Shift+O)";
  optimizeButton.innerHTML = `<span>⚡</span><span>Optimize Prompt</span>`;

  optimizeButton.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const text = getBoxText(inputBox).trim();
    if (!text) { showToast("Type a prompt first!", "warn"); return; }
    await optimizeText(text, currentMode, inputBox);
  });

  if (inputBox.parentElement) {
    inputBox.parentElement.appendChild(modeSelectorEl);
    inputBox.parentElement.appendChild(optimizeButton);
  }
}

function setButtonLoading(loading) {
  if (!optimizeButton) return;
  optimizeButton.disabled = loading;
  optimizeButton.innerHTML = loading
    ? `<span class="pb-spinner"></span><span>Optimizing…</span>`
    : `<span>⚡</span><span>Optimize Prompt</span>`;
}

// ─── Suggestion Box ───────────────────────────────────────────

function showSuggestionBox(inputBox, optimizedText, mode) {
  closeSuggestionBox();

  // Backdrop
  overlayEl = document.createElement("div");
  overlayEl.id = "promptboost-overlay";
  overlayEl.addEventListener("click", closeSuggestionBox);
  document.body.appendChild(overlayEl);

  // Box
  suggestionBox = document.createElement("div");
  suggestionBox.id = "promptboost-suggestion";

  const modeInfo = MODES.find(m => m.key === mode) || MODES[0];

  // Header
  const header = document.createElement("div");
  header.className = "pb-header";
  header.innerHTML = `
    <div class="pb-title">
      <div class="pb-title-icon">✨</div>
      <span>Optimized Prompt</span>
      <span class="pb-groq-tag">⚡ Groq</span>
      <span class="pb-mode-tag">${modeInfo.label}</span>
    </div>
    <button class="pb-close-btn" id="pb-close-x">✕</button>
  `;

  const divider = document.createElement("div");
  divider.className = "pb-divider";

  const label = document.createElement("div");
  label.className = "pb-label";
  label.textContent = "Optimized version — edit freely before using";

  // Textarea
  const textArea = document.createElement("textarea");
  textArea.className = "pb-textarea";
  textArea.value = optimizedText;
  textArea.spellcheck = false;

  // Actions row
  const actions = document.createElement("div");
  actions.className = "pb-actions";

  const charCount = document.createElement("span");
  charCount.className = "pb-char-count";
  charCount.textContent = `${optimizedText.length} chars`;
  textArea.addEventListener("input", () => {
    charCount.textContent = `${textArea.value.length} chars`;
  });

  // 📋 Copy button (Feature 3)
  const copyBtn = document.createElement("button");
  copyBtn.className = "pb-btn pb-btn-copy";
  copyBtn.innerHTML = `📋 Copy`;
  copyBtn.addEventListener("click", () => {
    navigator.clipboard.writeText(textArea.value).then(() => {
      copyBtn.innerHTML = `✓ Copied!`;
      copyBtn.classList.add("copied");
      setTimeout(() => {
        copyBtn.innerHTML = `📋 Copy`;
        copyBtn.classList.remove("copied");
      }, 2000);
    }).catch(() => {
      showToast("Clipboard access denied", "error");
    });
  });

  const discardBtn = document.createElement("button");
  discardBtn.className = "pb-btn pb-btn-discard";
  discardBtn.innerHTML = `✕ Discard`;
  discardBtn.addEventListener("click", closeSuggestionBox);

  const acceptBtn = document.createElement("button");
  acceptBtn.className = "pb-btn pb-btn-accept";
  acceptBtn.innerHTML = `✓ Use This Prompt`;
  acceptBtn.addEventListener("click", () => {
    if (inputBox) {
      setBoxText(inputBox, textArea.value);
      showToast("Prompt inserted! ⚡", "success");
    } else {
      navigator.clipboard.writeText(textArea.value);
      showToast("Copied to clipboard! ⚡", "success");
    }
    closeSuggestionBox();
  });

  actions.appendChild(charCount);
  actions.appendChild(copyBtn);
  actions.appendChild(discardBtn);
  actions.appendChild(acceptBtn);

  suggestionBox.appendChild(header);
  suggestionBox.appendChild(divider);
  suggestionBox.appendChild(label);
  suggestionBox.appendChild(textArea);
  suggestionBox.appendChild(actions);

  document.body.appendChild(suggestionBox);

  // Wire close button
  document.getElementById("pb-close-x").addEventListener("click", closeSuggestionBox);
}

function closeSuggestionBox() {
  if (suggestionBox) { suggestionBox.remove(); suggestionBox = null; }
  if (overlayEl)     { overlayEl.remove();     overlayEl = null;     }
}

// Escape key closes modal
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeSuggestionBox();
});

// ─── History (Feature 2) ──────────────────────────────────────

function saveToHistory(original, optimized, mode) {
  chrome.storage.local.get({ pb_history: [] }, ({ pb_history }) => {
    const item = {
      id: Date.now(),
      original: original.slice(0, 300),
      optimized: optimized.slice(0, 800),
      mode,
      timestamp: new Date().toISOString(),
    };
    const updated = [item, ...pb_history].slice(0, 20); // keep last 20
    chrome.storage.local.set({ pb_history: updated });
  });
}

// ─── Toast Notifications ──────────────────────────────────────

function showToast(message, type = "info") {
  const existing = document.getElementById("promptboost-toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.id = "promptboost-toast";

  const colors = {
    success: { bg: "rgba(34,197,94,0.15)",  border: "rgba(34,197,94,0.4)",  text: "#22c55e" },
    error:   { bg: "rgba(239,68,68,0.15)",  border: "rgba(239,68,68,0.4)",  text: "#ef4444" },
    warn:    { bg: "rgba(234,179,8,0.15)",  border: "rgba(234,179,8,0.4)",  text: "#eab308" },
    info:    { bg: "rgba(99,102,241,0.15)", border: "rgba(99,102,241,0.4)", text: "#a5b4fc" },
  };

  const c = colors[type] || colors.info;

  Object.assign(toast.style, {
    position: "fixed",
    bottom: "24px",
    right: "24px",
    zIndex: "2147483647",
    background: c.bg,
    border: `1px solid ${c.border}`,
    color: c.text,
    fontFamily: "'Inter', sans-serif",
    fontSize: "13px",
    fontWeight: "600",
    padding: "10px 16px",
    borderRadius: "10px",
    backdropFilter: "blur(12px)",
    boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
    maxWidth: "280px",
    animation: "pb-slide-in 0.25s ease forwards",
  });

  if (!document.getElementById("pb-toast-style")) {
    const s = document.createElement("style");
    s.id = "pb-toast-style";
    s.textContent = `@keyframes pb-slide-in { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }`;
    document.head.appendChild(s);
  }

  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

// ─── Message Listener (Background → Content) ─────────────────

chrome.runtime.onMessage.addListener((msg) => {
  // Feature 4: Context menu — optimize selected text
  if (msg.action === "optimize-selection" && msg.text) {
    showToast(`Optimizing selected text (${msg.text.length} chars)…`, "info");
    optimizeText(msg.text, currentMode, null);
  }

  // Feature 6: Keyboard shortcut — optimize current input box
  if (msg.action === "optimize-current") {
    const inputBox = findInputBox();
    if (!inputBox) {
      showToast("No input box found on this page", "warn");
      return;
    }
    const text = getBoxText(inputBox).trim();
    if (!text) {
      showToast("Type a prompt first!", "warn");
      return;
    }
    showToast("Optimizing… ⚡", "info");
    optimizeText(text, currentMode, inputBox);
  }
});

// ─── Page Observer ────────────────────────────────────────────

function observePage() {
  const observer = new MutationObserver(() => {
    const inputBox = findInputBox();
    if (inputBox && getBoxText(inputBox).trim().length > 0) {
      createOptimizeButton(inputBox);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

observePage();