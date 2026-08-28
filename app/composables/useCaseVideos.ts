import {
  isCaseAtTop,
  subscribeCaseTopBand,
} from '~/composables/useCaseTopScrollBand';

const VIDEO_SELECTOR = '[data-case-video]';
const SHELL_SELECTOR = '[data-case-video-shell]';

type VideoBinding = {
  video: HTMLVideoElement;
  shell: HTMLElement | null;
  onPlay: () => void;
  onLoaded: () => void;
  onCanPlay: () => void;
  onError: () => void;
};

const bindings = new Map<HTMLVideoElement, VideoBinding>();
const deferredKickoffs = new Set<HTMLVideoElement>();
let bandUnsub: (() => void) | null = null;

function revealShell(shell: HTMLElement | null) {
  shell?.classList.add('is-loaded');
}

function playCaseVideo(video: HTMLVideoElement) {
  if (!isCaseAtTop()) return;
  video.play().catch(() => {});
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

function bindVideo(video: HTMLVideoElement, deferKickoff: boolean) {
  if (bindings.has(video)) return;

  const shell =
    video.closest<HTMLElement>(SHELL_SELECTOR) ?? video.parentElement;

  const onPlay = () => {
    if (!isCaseAtTop()) video.pause();
  };

  const onLoaded = () => {
    revealShell(shell);
    if (deferredKickoffs.has(video)) return;
    syncVideo(video);
  };

  const onCanPlay = () => {
    revealShell(shell);
    if (deferredKickoffs.has(video)) return;
    syncVideo(video);
  };

  const onError = () => {
    revealShell(shell);
  };

  video.addEventListener('play', onPlay);
  video.addEventListener('loadeddata', onLoaded);
  video.addEventListener('canplay', onCanPlay);
  video.addEventListener('error', onError);

  bindings.set(video, { video, shell, onPlay, onLoaded, onCanPlay, onError });

  if (deferKickoff && isCaseAtTop()) {
    deferredKickoffs.add(video);
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
