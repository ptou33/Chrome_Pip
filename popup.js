const pipButton = document.getElementById('pipButton');
const nextButton = document.getElementById('nextButton');
const volumeRange = document.getElementById('volumeRange');
const statusText = document.getElementById('status');

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function sendMessage(action, data = {}) {
  const tab = await getActiveTab();
  if (!tab || !tab.id) return null;

  return chrome.tabs.sendMessage(tab.id, { action, ...data });
}

function updateUI(status) {
  if (!status || !status.hasVideo) {
    statusText.textContent = 'Nessun video rilevato nella scheda attiva.';
    pipButton.disabled = true;
    nextButton.disabled = true;
    volumeRange.disabled = true;
    return;
  }

  pipButton.disabled = false;
  nextButton.disabled = false;
  volumeRange.disabled = false;

  volumeRange.value = Math.round((status.volume ?? 1) * 100);
  pipButton.textContent = status.inPiP ? 'Chiudi PiP' : 'Apri PiP';
  statusText.textContent = status.inPiP
    ? 'Video in finestra flottante.'
    : 'Video pronto per Picture-in-Picture.';
}

async function refreshStatus() {
  const response = await sendMessage('getStatus');
  if (response) {
    updateUI(response.status);
  }
}

pipButton.addEventListener('click', async () => {
  const response = await sendMessage('togglePiP');
  if (!response?.success && response?.error) {
    statusText.textContent = response.error;
  }
  await refreshStatus();
});

volumeRange.addEventListener('input', async (event) => {
  const value = Number(event.target.value) / 100;
  const response = await sendMessage('setVolume', { value });
  if (!response?.success && response?.error) {
    statusText.textContent = response.error;
  }
});

nextButton.addEventListener('click', async () => {
  const response = await sendMessage('nextVideo');
  if (!response?.success && response?.error) {
    statusText.textContent = response.error;
  }
  await refreshStatus();
});

refreshStatus();
