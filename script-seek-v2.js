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
    const sceneButtons = comparison.querySelectorAll('[data-appearance-scene]');
    const viewButtons = comparison.querySelectorAll('[data-appearance-view]');
    const sweepButton = comparison.querySelector('[data-sweep]');
    let sweepFrame = 0;
    let activeScene = 'room_0';
    let activeView = 'ego_01';
    let selectionVersion = 0;
    const cachedImages = new Map();

    const preloadImage = (src) => {
      if (cachedImages.has(src)) return cachedImages.get(src);
      const image = new Image();
      const ready = new Promise((resolve) => {
        image.onload = resolve;
        image.onerror = resolve;
      });
      image.decoding = 'async';
      image.src = src;
      cachedImages.set(src, ready);
      return ready;
    };

    const preloadPair = (scene, view) => {
      const stem = `assets/appearance-slider/visual_15deg_${scene}_${view}`;
      preloadImage(`${stem}_gaussgym.webp`);
      preloadImage(`${stem}_r2s_ego.webp`);
    };

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

    const showSelection = async () => {
      stopSweep();
      const version = ++selectionVersion;
      const stem = `assets/appearance-slider/visual_15deg_${activeScene}_${activeView}`;
      const gaussSrc = `${stem}_gaussgym.webp`;
      const r2sSrc = `${stem}_r2s_ego.webp`;
      await Promise.all([preloadImage(gaussSrc), preloadImage(r2sSrc)]);
      if (version !== selectionVersion) return;
      gaussImage.src = gaussSrc;
      r2sImage.src = r2sSrc;
      r2sImage.alt = `R2S-EGO rendering from ${activeScene.replace('_', ' ')}, 15-degree ${activeView.replace('_', ' camera ')}`;
      setSplit(50);
    };

    sceneButtons.forEach((button) => button.addEventListener('click', () => {
      activeScene = button.dataset.appearanceScene;
      sceneButtons.forEach((item) => item.classList.toggle('is-active', item === button));
      showSelection();
    }));
    sceneButtons.forEach((button) => button.addEventListener('pointerenter', () => {
      preloadPair(button.dataset.appearanceScene, activeView);
    }, { passive: true }));

    viewButtons.forEach((button) => button.addEventListener('click', () => {
      activeView = button.dataset.appearanceView;
      viewButtons.forEach((item) => item.classList.toggle('is-active', item === button));
      showSelection();
    }));
    viewButtons.forEach((button) => button.addEventListener('pointerenter', () => {
      preloadPair(activeScene, button.dataset.appearanceView);
    }, { passive: true }));

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
