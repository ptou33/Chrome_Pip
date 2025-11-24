const state = {
  lastVideo: null,
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

async function enterPictureInPicture(video) {
  if (!document.pictureInPictureEnabled) {
    throw new Error('Picture-in-Picture non è supportato in questa pagina.');
  }

  if (video !== document.pictureInPictureElement) {
    state.lastVideo = video;
    await video.requestPictureInPicture();
  }
}

async function exitPictureInPicture() {
  if (document.pictureInPictureElement) {
    await document.exitPictureInPicture();
  }
}

function setVolume(level) {
  const video = getActiveVideo();
  if (!video) throw new Error('Nessun video trovato nella pagina.');

  video.volume = level;
  state.lastVideo = video;

  if (level === 0) {
    video.muted = true;
  } else if (video.muted) {
    video.muted = false;
  }
}

function goToNextVideo() {
  const video = getActiveVideo();
  if (!video) throw new Error('Nessun video trovato nella pagina.');

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

function getStatus() {
  const video = getActiveVideo();
  return {
    hasVideo: Boolean(video),
    inPiP: Boolean(document.pictureInPictureElement),
    volume: video ? video.volume : 0,
  };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    try {
      if (message.action === 'togglePiP') {
        const video = getActiveVideo();
        if (!video) throw new Error('Nessun video trovato nella pagina.');

        if (document.pictureInPictureElement) {
          await exitPictureInPicture();
        } else {
          await enterPictureInPicture(video);
        }

        sendResponse({ success: true, status: getStatus() });
      }

      if (message.action === 'setVolume') {
        setVolume(message.value);
        sendResponse({ success: true, status: getStatus() });
      }

      if (message.action === 'nextVideo') {
        goToNextVideo();
        sendResponse({ success: true, status: getStatus() });
      }

      if (message.action === 'getStatus') {
        sendResponse({ success: true, status: getStatus() });
      }
    } catch (error) {
      sendResponse({ success: false, error: error.message, status: getStatus() });
    }
  })();

  return true;
});
