type ParticleController = { update: (paused: boolean) => void; dispose: () => void };

export function initializeExperience() {
  const start = () => {
    const field = document.querySelector<HTMLElement>('[data-particle-field]');
    if (!field || field.dataset.ready) return;
    field.dataset.ready = 'true';
    const root = document.documentElement;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    let manualChoice: boolean | null = null;
    try {
      const preference = localStorage.getItem('osz-ai-motion');
      if (preference === 'paused' || preference === 'active') manualChoice = preference === 'paused';
    } catch { /* Optional preference. */ }
    let paused = manualChoice ?? (reduced.matches || !!saveData);
    let particles: ParticleController | undefined;
    let disposed = false;
    let loading = false;
    const motionButton = document.querySelector<HTMLButtonElement>('[data-motion-toggle]');
    const videos = [...document.querySelectorAll<HTMLVideoElement>('[data-motion-video]')];
    const visibleVideos = new Set<HTMLVideoElement>();

    function updateVideo(video: HTMLVideoElement) {
      if (paused || document.hidden || !visibleVideos.has(video)) { video.pause(); return; }
      if (!video.dataset.loaded) {
        video.querySelectorAll<HTMLSourceElement>('source[data-src]').forEach(source => { source.src = source.dataset.src!; });
        video.dataset.loaded = 'true';
        video.load();
      }
      void video.play().catch(() => { /* The poster remains visible if autoplay is blocked. */ });
    }
    const videoObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const video = entry.target as HTMLVideoElement;
        if (entry.isIntersecting) visibleVideos.add(video); else visibleVideos.delete(video);
        updateVideo(video);
      });
    }, { threshold: .08 });
    videos.forEach(video => videoObserver.observe(video));

    async function applyMotion() {
      root.dataset.motion = paused ? 'paused' : 'active';
      if (motionButton) {
        motionButton.hidden = false;
        motionButton.setAttribute('aria-pressed', String(paused));
        motionButton.setAttribute('aria-label', paused ? 'Activar animaciones' : 'Pausar animaciones');
        motionButton.querySelector('[data-motion-label]')!.textContent = paused ? 'Activar animación' : 'Pausar animación';
      }
      videos.forEach(updateVideo);
      particles?.update(paused);
      if (!paused && !particles && !loading && !disposed) {
        loading = true;
        try {
          const { createParticleScene } = await import('./particles');
          if (!disposed) { particles = createParticleScene(field!); particles.update(paused); }
        } catch {
          field!.dataset.renderer = 'fallback';
        }
      }
    }
    motionButton?.addEventListener('click', () => {
      paused = !paused;
      manualChoice = paused;
      try { localStorage.setItem('osz-ai-motion', paused ? 'paused' : 'active'); } catch { /* Optional preference. */ }
      void applyMotion();
    });
    reduced.addEventListener('change', () => {
      if (manualChoice === null) { paused = reduced.matches || !!saveData; void applyMotion(); }
    });
    document.addEventListener('visibilitychange', () => { videos.forEach(updateVideo); particles?.update(paused); });
    window.addEventListener('pagehide', event => {
      videos.forEach(video => video.pause());
      particles?.update(true);
      if (!event.persisted) { disposed = true; particles?.dispose(); videoObserver.disconnect(); }
    });
    window.addEventListener('pageshow', event => { if (event.persisted) void applyMotion(); });
    initializeJourney(() => paused);
    void applyMotion();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true }); else start();
}

function initializeJourney(isPaused: () => boolean) {
  const journey = document.querySelector<HTMLElement>('[data-journey]');
  const track = journey?.querySelector<HTMLElement>('.journey-track');
  if (!journey || !track) return;
  const cards = [...track.querySelectorAll<HTMLElement>('.journey-card')];
  const prev = journey.querySelector<HTMLButtonElement>('[data-journey-prev]')!;
  const next = journey.querySelector<HTMLButtonElement>('[data-journey-next]')!;
  const count = journey.querySelector<HTMLElement>('.journey-count')!;
  let index = 0;
  let frame = 0;
  const positions = () => cards.map(card => card.offsetLeft - cards[0].offsetLeft);
  function sync() {
    const max = track!.scrollWidth - track!.clientWidth;
    const progress = max > 0 ? track!.scrollLeft / max : 0;
    const targets = positions();
    index = targets.reduce((closest, position, i) => Math.abs(position - track!.scrollLeft) < Math.abs(targets[closest] - track!.scrollLeft) ? i : closest, 0);
    if (max > 0 && track!.scrollLeft >= max - 3) index = cards.length - 1;
    prev.disabled = track!.scrollLeft < 3;
    next.disabled = max < 3 || track!.scrollLeft >= max - 3;
    count.innerHTML = `${String(index + 1).padStart(2, '0')} <span>/ 04</span>`;
    journey!.style.setProperty('--journey-progress', String(progress));
    journey!.dataset.index = String(index);
    window.dispatchEvent(new CustomEvent('osz:journey', { detail: progress }));
    frame = 0;
  }
  function move(direction: number) {
    const max = track!.scrollWidth - track!.clientWidth;
    const stops = [...new Set(positions().map(position => Math.min(position, max)))];
    const current = track!.scrollLeft;
    const target = direction > 0
      ? stops.find(position => position > current + 3) ?? max
      : stops.slice().reverse().find(position => position < current - 3) ?? 0;
    track!.scrollTo({ left: target, behavior: isPaused() ? 'instant' : 'smooth' });
  }
  prev.addEventListener('click', () => move(-1));
  next.addEventListener('click', () => move(1));
  track.addEventListener('scroll', () => { if (!frame) frame = requestAnimationFrame(sync); }, { passive: true });
  track.addEventListener('keydown', event => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); move(event.key === 'ArrowRight' ? 1 : -1); }
  });
  new ResizeObserver(sync).observe(track);
  sync();
}
