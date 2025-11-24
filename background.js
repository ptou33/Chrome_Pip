chrome.action.onClicked.addListener((tab) => {
  if (!tab.id) return;
  chrome.tabs.sendMessage(tab.id, { action: 'toggleFloating' }).catch((error) => {
    console.error('Impossibile comunicare con la scheda:', error);
  });
});
