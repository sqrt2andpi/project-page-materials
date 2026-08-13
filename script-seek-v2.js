(() => {
  document.documentElement.classList.remove('no-js');
  document.documentElement.classList.add('js');

  const header = document.querySelector('[data-header]');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const updateHeader = () => header?.classList.toggle('is-scrolled', window.scrollY > 12);
  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });

  const ambientVideos = document.querySelectorAll('[data-autoplay-video]');

  // Anonymous GitHub's page proxy serves MP4 files without byte-range headers.
  // Chromium may leave those direct media requests at HAVE_NOTHING even after
  // the response is downloaded. Fall back to an object URL only on that host.
  const enableAnonymousVideoFallback = () => {
    if (window.location.hostname !== 'anonymous.4open.science') return;

    document.querySelectorAll('video').forEach((video) => {
      window.setTimeout(async () => {
        const needsSeekableBlob = video.matches('[data-seekable-video]');
        if ((!needsSeekableBlob && video.readyState >= HTMLMediaElement.HAVE_METADATA) || video.dataset.blobFallback) return;
        const source = video.querySelector('source[src]');
        if (!source) return;

        video.dataset.blobFallback = 'loading';
        try {
          const response = await fetch(source.src);
          if (!response.ok) throw new Error(`Video request failed: ${response.status}`);
          const objectUrl = URL.createObjectURL(await response.blob());
          video.src = objectUrl;
          video.dataset.blobFallback = 'ready';
          video.load();
          if ((video.autoplay || video.matches('[data-autoplay-video]')) && !reducedMotion) {
            video.play().catch(() => {});
          }
        } catch {
          video.dataset.blobFallback = 'failed';
        }
      }, video.matches('[data-seekable-video]') ? 0 : 3500);
    });
  };

  enableAnonymousVideoFallback();

  document.querySelectorAll('[data-video-chapters]').forEach((chapters) => {
    const video = document.querySelector(chapters.dataset.videoChapters);
    if (!video) return;
    chapters.addEventListener('click', (event) => {
      const button = event.target.closest('[data-seek-time]');
      if (!button) return;
      const seek = () => {
        video.currentTime = Number(button.dataset.seekTime);
        video.play().catch(() => {});
      };
      if (video.readyState >= HTMLMediaElement.HAVE_METADATA) seek();
      else video.addEventListener('loadedmetadata', seek, { once: true });
    });
  });

  document.querySelectorAll('[data-appearance-comparison]').forEach((comparison) => {
    const stage = comparison.querySelector('.appearance-stage');
    const range = comparison.querySelector('.appearance-range');
    const revealInner = comparison.querySelector('[data-reveal-inner]');
    const gaussImage = comparison.querySelector('[data-gauss-image]');
    const r2sImage = comparison.querySelector('[data-r2s-image]');
    const sceneButtons = comparison.querySelectorAll('[data-gauss][data-r2s]');
    const sweepButton = comparison.querySelector('[data-sweep]');
    let sweepFrame = 0;

    const resizeReveal = () => { revealInner.style.width = `${stage.clientWidth}px`; };
    const setSplit = (value) => {
      const split = Math.max(0, Math.min(100, Number(value)));
      range.value = String(split);
      stage.style.setProperty('--split', `${split}%`);
    };
    const stopSweep = () => {
      if (sweepFrame) cancelAnimationFrame(sweepFrame);
      sweepFrame = 0;
      sweepButton.textContent = 'Play sweep';
    };

    resizeReveal();
    if ('ResizeObserver' in window) new ResizeObserver(resizeReveal).observe(stage);
    else window.addEventListener('resize', resizeReveal, { passive: true });

    range.addEventListener('input', () => {
      stopSweep();
      setSplit(range.value);
    });

    sceneButtons.forEach((button) => button.addEventListener('click', () => {
      stopSweep();
      sceneButtons.forEach((item) => item.classList.toggle('is-active', item === button));
      gaussImage.src = button.dataset.gauss;
      r2sImage.src = button.dataset.r2s;
      r2sImage.alt = `R2S-EGO rendering from ${button.dataset.scene}, ${button.dataset.view.replace('_', ' camera ')}`;
      setSplit(50);
    }));

    sweepButton.addEventListener('click', () => {
      if (sweepFrame) {
        stopSweep();
        return;
      }
      sweepButton.textContent = 'Stop sweep';
      const started = performance.now();
      const duration = 4200;
      const animate = (now) => {
        const elapsed = now - started;
        const phase = Math.min(1, elapsed / duration);
        setSplit(50 + 42 * Math.sin(phase * Math.PI * 2 - Math.PI / 2));
        if (phase < 1) sweepFrame = requestAnimationFrame(animate);
        else {
          sweepFrame = 0;
          setSplit(50);
          sweepButton.textContent = 'Play sweep';
        }
      };
      sweepFrame = requestAnimationFrame(animate);
    });
  });

  if ('IntersectionObserver' in window) {
    const videoObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const video = entry.target;
        if (entry.isIntersecting && !reducedMotion) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      });
    }, { threshold: 0.42 });
    ambientVideos.forEach((video) => videoObserver.observe(video));
  }
})();
