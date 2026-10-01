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
  /** Any pixel of the shell still intersects the viewport. */
  inView: boolean;
  onLoaded: () => void;
  onCanPlay: () => void;
  onPlaying: () => void;
  onError: () => void;
};

const bindings = new Map<HTMLVideoElement, VideoBinding>();
const deferredKickoffs = new Set<HTMLVideoElement>();
let observer: IntersectionObserver | null = null;
let bandUnsub: (() => void) | null = null;
/** Edge-detect top band so mid-scroll does not crush manual play. */
let bandPrimed = false;
let wasAtTop = false;

function revealShell(shell: HTMLElement | null) {
  if (!shell || shell.classList.contains('is-failed')) return;
  shell.classList.add('is-loaded');
}

function failShell(shell: HTMLElement | null) {
  shell?.classList.add('is-failed');
  shell?.classList.remove('is-loaded');
}

function observeTarget(binding: VideoBinding): Element {
  return binding.shell ?? binding.video;
}

function playCaseVideo(video: HTMLVideoElement) {
  const binding = bindings.get(video);
  if (binding && !binding.inView) return;
  const shell = binding?.shell ?? null;
  video
    .play()
    .then(() => {
      revealShell(shell);
    })
    .catch(() => {});
}

function pauseIfPlaying(video: HTMLVideoElement) {
  if (!video.paused) video.pause();
}

/** Old top-band autoplay: at top → play; leave top → pause. No play-event block. */
function onTopBand(atTop: boolean) {
  if (!bandPrimed) {
    bandPrimed = true;
    wasAtTop = atTop;
    return;
  }
  if (atTop === wasAtTop) return;
  wasAtTop = atTop;

  if (atTop) {
    for (const { video, inView } of bindings.values()) {
      if (inView && !deferredKickoffs.has(video)) playCaseVideo(video);
    }
    return;
  }

  for (const { video } of bindings.values()) {
    pauseIfPlaying(video);
  }
}

function ensureBandSync() {
  if (bandUnsub) return;
  bandPrimed = false;
  bandUnsub = subscribeCaseTopBand(onTopBand);
}

function releaseBandSync() {
  if (bindings.size > 0 || bandUnsub == null) return;
  bandUnsub();
  bandUnsub = null;
  bandPrimed = false;
  wasAtTop = false;
}

function onIntersection(entries: IntersectionObserverEntry[]) {
  for (const entry of entries) {
    const target = entry.target;
    for (const binding of bindings.values()) {
      if (observeTarget(binding) !== target) continue;
      const wasInView = binding.inView;
      binding.inView = entry.isIntersecting;
      // Fully out of viewport → pause if still playing (manual play ok while in view).
      if (!entry.isIntersecting) {
        pauseIfPlaying(binding.video);
      } else if (
        !wasInView &&
        isCaseAtTop() &&
        !deferredKickoffs.has(binding.video)
      ) {
        playCaseVideo(binding.video);
      }
      break;
    }
  }
}

function ensureObserver() {
  if (observer || !import.meta.client) return;
  observer = new IntersectionObserver(onIntersection, {
    root: null,
    threshold: 0,
  });
}

function releaseObserver() {
  if (bindings.size > 0 || !observer) return;
  observer.disconnect();
  observer = null;
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

  const onLoaded = () => {
    // Keep poster up during deferred warm-buffer; reveal on play/playing.
    if (deferredKickoffs.has(video)) return;
    revealShell(shell);
    if (isCaseAtTop()) playCaseVideo(video);
  };

  const onCanPlay = () => {
    if (deferredKickoffs.has(video)) return;
    revealShell(shell);
    if (isCaseAtTop()) playCaseVideo(video);
  };

  const onPlaying = () => {
    revealShell(shell);
  };

  const onError = () => {
    failShell(shell);
  };

  video.addEventListener('loadeddata', onLoaded);
  video.addEventListener('canplay', onCanPlay);
  video.addEventListener('playing', onPlaying);
  video.addEventListener('error', onError);

  const target = shell ?? video;

  bindings.set(video, {
    video,
    shell,
    // Frame may be unlaid-out during enter beats; IntersectionObserver corrects this.
    inView: true,
    onLoaded,
    onCanPlay,
    onPlaying,
    onError,
  });

  ensureObserver();
  observer?.observe(target);

  if (deferKickoff && isCaseAtTop()) {
    deferredKickoffs.add(video);
    warmStart(video);
  } else if (isCaseAtTop()) {
    playCaseVideo(video);
  }
}

function unbindVideo(video: HTMLVideoElement) {
  const binding = bindings.get(video);
  if (!binding) return;

  video.removeEventListener('loadeddata', binding.onLoaded);
  video.removeEventListener('canplay', binding.onCanPlay);
  video.removeEventListener('playing', binding.onPlaying);
  video.removeEventListener('error', binding.onError);
  observer?.unobserve(observeTarget(binding));
  video.pause();

  bindings.delete(video);
  deferredKickoffs.delete(video);
}

/** Attach top-band + viewport playback to all case hero videos under `root`. */
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
    releaseObserver();
  };
}

/** First programmatic play after enter reveal (deferred kickoff queue). */
export function kickoffDeferredCaseVideos() {
  if (!isCaseAtTop()) {
    deferredKickoffs.clear();
    return;
  }

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
  bandPrimed = false;
  wasAtTop = false;
  if (observer) {
    observer.disconnect();
    observer = null;
  }
}
