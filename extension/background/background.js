/* PromptBoost AI — Background Service Worker v3 */

// ─── On Install ───────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(() => {
  console.log("PromptBoost AI v3 installed");

  // Create context menu for selected text
  chrome.contextMenus.create({
    id: "promptboost-optimize-selection",
    title: "⚡ Optimize with PromptBoost",
    contexts: ["selection"],
  });
});

// ─── Context Menu Click ───────────────────────────────────────
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (
    info.menuItemId === "promptboost-optimize-selection" &&
    info.selectionText &&
    tab?.id
  ) {
    chrome.tabs.sendMessage(tab.id, {
      action: "optimize-selection",
      text: info.selectionText.trim(),
    });
  }
});

// ─── Keyboard Shortcut (Alt+Shift+O) ─────────────────────────
chrome.commands.onCommand.addListener((command) => {
  if (command === "optimize-current-prompt") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: "optimize-current",
        });
      }
    });
  }
});
