import {
  isCaseAtTop,
  subscribeCaseTopBand,
} from '~/composables/useCaseTopScrollBand';

const VIDEO_SELECTOR = '[data-case-video]';
const SHELL_SELECTOR = '[data-case-video-shell]';

/** HTMLMediaElement.HAVE_CURRENT_DATA — first frame available. */
const HAVE_CURRENT_DATA = 2;

type VideoBinding = {
  video: HTMLVideoElement;
  shell: HTMLElement | null;
  onPlay: () => void;
  onLoaded: () => void;
  onCanPlay: () => void;
  onPlaying: () => void;
  onError: () => void;
};

const bindings = new Map<HTMLVideoElement, VideoBinding>();
const deferredKickoffs = new Set<HTMLVideoElement>();
let bandUnsub: (() => void) | null = null;

function revealShell(shell: HTMLElement | null) {
  if (!shell || shell.classList.contains('is-failed')) return;
  shell.classList.add('is-loaded');
}

function failShell(shell: HTMLElement | null) {
  shell?.classList.add('is-failed');
  shell?.classList.remove('is-loaded');
}

function playCaseVideo(video: HTMLVideoElement) {
  if (!isCaseAtTop()) return;
  const shell = bindings.get(video)?.shell ?? null;
  video
    .play()
    .then(() => {
      revealShell(shell);
    })
    .catch(() => {});
}

function syncVideo(video: HTMLVideoElement) {
  if (isCaseAtTop()) {
    playCaseVideo(video);
  } else {
    video.pause();
  }
}

function syncAllVideos() {
  for (const { video } of bindings.values()) {
    syncVideo(video);
  }
}

function ensureBandSync() {
  if (bandUnsub) return;
  bandUnsub = subscribeCaseTopBand(() => {
    syncAllVideos();
  });
}

function releaseBandSync() {
  if (bindings.size > 0 || bandUnsub == null) return;
  bandUnsub();
  bandUnsub = null;
}

/**
 * Start buffering without playing — avoids waiting for deferred kickoff
 * play() to discover a multi‑MB mp4 from cold `preload="none"`.
 */
function warmStart(video: HTMLVideoElement) {
  if (video.readyState >= HAVE_CURRENT_DATA) return;
  if (video.networkState === HTMLMediaElement.NETWORK_LOADING) return;
  video.preload = 'auto';
  try {
    video.load();
  } catch {
    /* ignore */
  }
}

function bindVideo(video: HTMLVideoElement, deferKickoff: boolean) {
  if (bindings.has(video)) return;

  const shell =
    video.closest<HTMLElement>(SHELL_SELECTOR) ?? video.parentElement;

  shell?.classList.remove('is-failed');

  // Re-init race: playback already running while listeners were torn down.
  if (!video.paused && video.readyState >= HAVE_CURRENT_DATA) {
    revealShell(shell);
  }

  const onPlay = () => {
    if (!isCaseAtTop()) video.pause();
  };

  const onLoaded = () => {
    // Keep poster up during deferred warm-buffer; reveal on play/playing.
    if (deferredKickoffs.has(video)) return;
    revealShell(shell);
    syncVideo(video);
  };

  const onCanPlay = () => {
    if (deferredKickoffs.has(video)) return;
    revealShell(shell);
    syncVideo(video);
  };

  const onPlaying = () => {
    revealShell(shell);
  };

  const onError = () => {
    failShell(shell);
  };

  video.addEventListener('play', onPlay);
  video.addEventListener('loadeddata', onLoaded);
  video.addEventListener('canplay', onCanPlay);
  video.addEventListener('playing', onPlaying);
  video.addEventListener('error', onError);

  bindings.set(video, {
    video,
    shell,
    onPlay,
    onLoaded,
    onCanPlay,
    onPlaying,
    onError,
  });

  if (deferKickoff && isCaseAtTop()) {
    deferredKickoffs.add(video);
    warmStart(video);
  } else {
    syncVideo(video);
  }
}

function unbindVideo(video: HTMLVideoElement) {
  const binding = bindings.get(video);
  if (!binding) return;

  video.removeEventListener('play', binding.onPlay);
  video.removeEventListener('loadeddata', binding.onLoaded);
  video.removeEventListener('canplay', binding.onCanPlay);
  video.removeEventListener('playing', binding.onPlaying);
  video.removeEventListener('error', binding.onError);
  video.pause();

  bindings.delete(video);
  deferredKickoffs.delete(video);
}

/** Attach scroll-gated playback to all case hero videos under `root`. */
export function initCaseVideos(
  root: HTMLElement,
  opts?: { deferKickoff?: boolean },
): () => void {
  const deferKickoff = opts?.deferKickoff ?? false;
  const videos = [...root.querySelectorAll<HTMLVideoElement>(VIDEO_SELECTOR)];

  if (videos.length === 0) return () => {};

  ensureBandSync();

  for (const video of videos) {
    bindVideo(video, deferKickoff);
  }

  return () => {
    for (const video of videos) {
      unbindVideo(video);
    }
    releaseBandSync();
  };
}

/** First programmatic play after enter reveal (deferred kickoff queue). */
export function kickoffDeferredCaseVideos() {
  if (!isCaseAtTop()) return;

  for (const video of deferredKickoffs) {
    playCaseVideo(video);
  }
  deferredKickoffs.clear();
}

/** Tear down every bound video (route leave). */
export function disposeAllCaseVideos() {
  for (const video of [...bindings.keys()]) {
    unbindVideo(video);
  }
  deferredKickoffs.clear();
  if (bandUnsub) {
    bandUnsub();
    bandUnsub = null;
  }
}
