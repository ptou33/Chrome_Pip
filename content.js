const overlayState = {
  container: null,
  shadow: null,
  video: null,
  placeholder: null,
};

function getCandidateVideos() {
  return Array.from(document.querySelectorAll('video'));
}

function getActiveVideo() {
  const videos = getCandidateVideos();
  if (!videos.length) return null;

  const playing = videos.find((video) => !video.paused && !video.ended && video.readyState > 2);
  return playing || videos[0];
}

function createStyles() {
  const style = document.createElement('style');
  style.textContent = `
    :host {
      all: initial;
      font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }

    .pip-wrapper {
      position: fixed;
      bottom: 16px;
      right: 16px;
      width: 380px;
      max-width: 90vw;
      background: rgba(0, 0, 0, 0.75);
      color: #f5f5f5;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
      z-index: 2147483647;
      backdrop-filter: blur(4px);
    }

    .video-shell {
      position: relative;
      width: 100%;
      background: #000;
    }

    video {
      width: 100%;
      height: auto;
      display: block;
      background: #000;
    }

    .controls {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      box-sizing: border-box;
    }

    .controls button {
      appearance: none;
      border: none;
      background: #f5f5f5;
      color: #111;
      padding: 8px 12px;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 120ms ease, box-shadow 120ms ease;
    }

    .controls button:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }

    .controls button:active {
      transform: translateY(0);
      box-shadow: none;
    }

    .slider {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }

    input[type='range'] {
      flex: 1;
      accent-color: #4ade80;
      cursor: pointer;
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 12px 0;
      color: #d1d5db;
      font-size: 12px;
      letter-spacing: 0.01em;
      opacity: 0.9;
    }
  `;
  return style;
}

function restoreVideo() {
  if (!overlayState.video || !overlayState.placeholder) return;
  overlayState.placeholder.replaceWith(overlayState.video);
  overlayState.placeholder = null;
}

function removeOverlay() {
  if (overlayState.container) {
    overlayState.container.remove();
  }

  restoreVideo();
  overlayState.container = null;
  overlayState.shadow = null;
  overlayState.video = null;
}

function updateVolumeLabel(labelEl, value) {
  const percentage = Math.round(value * 100);
  labelEl.textContent = `${percentage}%`;
}

function buildOverlay(video) {
  const container = document.createElement('div');
  container.id = 'floating-pip-overlay';

  const shadow = container.attachShadow({ mode: 'open' });
  shadow.appendChild(createStyles());

  const wrapper = document.createElement('div');
  wrapper.className = 'pip-wrapper';

  const header = document.createElement('div');
  header.className = 'header';
  header.textContent = 'Video flottante';

  const videoShell = document.createElement('div');
  videoShell.className = 'video-shell';
  videoShell.appendChild(video);

  const controls = document.createElement('div');
  controls.className = 'controls';

  const sliderWrap = document.createElement('div');
  sliderWrap.className = 'slider';

  const volumeLabel = document.createElement('span');
  updateVolumeLabel(volumeLabel, video.volume);

  const volumeSlider = document.createElement('input');
  volumeSlider.type = 'range';
  volumeSlider.min = '0';
  volumeSlider.max = '1';
  volumeSlider.step = '0.01';
  volumeSlider.value = video.volume;

  volumeSlider.addEventListener('input', () => {
    const level = Number(volumeSlider.value);
    video.volume = level;
    video.muted = level === 0;
    updateVolumeLabel(volumeLabel, level);
  });

  sliderWrap.append(volumeSlider, volumeLabel);

  const nextButton = document.createElement('button');
  nextButton.textContent = 'Prossimo video';
  nextButton.addEventListener('click', () => {
    goToNextVideo();
  });

  const closeButton = document.createElement('button');
  closeButton.textContent = 'Chiudi';
  closeButton.addEventListener('click', () => {
    removeOverlay();
  });

  controls.append(sliderWrap, nextButton, closeButton);

  wrapper.append(header, videoShell, controls);
  shadow.appendChild(wrapper);

  overlayState.container = container;
  overlayState.shadow = shadow;

  document.documentElement.appendChild(container);
}

function goToNextVideo() {
  const video = overlayState.video || getActiveVideo();
  if (!video) return;

  const url = window.location.hostname;

  if (url.includes('youtube.com')) {
    const nextButton = document.querySelector('.ytp-next-button');
    if (nextButton) {
      nextButton.click();
      return;
    }
  }

  if (Number.isFinite(video.duration)) {
    video.currentTime = Math.max(video.duration - 0.5, video.currentTime);
  }
}

function toggleFloating() {
  if (overlayState.container) {
    removeOverlay();
    return { active: false };
  }

  const video = getActiveVideo();
  if (!video) {
    throw new Error('Nessun video trovato nella pagina.');
  }

  const placeholder = document.createElement('span');
  placeholder.style.display = 'none';
  video.parentNode.insertBefore(placeholder, video);

  overlayState.video = video;
  overlayState.placeholder = placeholder;

  buildOverlay(video);

  return { active: true, volume: video.volume };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  try {
    if (message.action === 'toggleFloating') {
      const status = toggleFloating();
      sendResponse({ success: true, status });
    }
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }

  return true;
});
