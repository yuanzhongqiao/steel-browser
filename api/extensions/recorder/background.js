// Function to inject the script
function injectScript(tabId, changeInfo, tab) {
  // Only injected once the tab is completely loaded
  if (changeInfo.status === "complete" && tab.url) {
    chrome.tabs.executeScript(
      tabId,
      {
        file: "inject.js",
      },
      function () {
        if (chrome.runtime.lastError) {
          console.log("Script injection failed: ", chrome.runtime.lastError.message);
        }
      },
    );
  }
}

// Listen for any tab updates
chrome.tabs.onUpdated.addListener(injectScript);
