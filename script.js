(() => {
  document.documentElement.classList.remove('no-js');
  document.documentElement.classList.add('js');

  const header = document.querySelector('[data-header]');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const updateHeader = () => header?.classList.toggle('is-scrolled', window.scrollY > 12);
  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });

  const ambientVideos = document.querySelectorAll('[data-autoplay-video]');
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
