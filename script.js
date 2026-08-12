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
        if (video.readyState >= HTMLMediaElement.HAVE_METADATA || video.dataset.blobFallback) return;
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
      }, 3500);
    });
  };

  enableAnonymousVideoFallback();
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
