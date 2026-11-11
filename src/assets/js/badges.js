// Altmetric attention badges, loaded only for papers that scroll into view.
// The badge links to Altmetric's page listing news, policy and social media mentions.
(function () {
  let loader;
  function loadAltmetric() {
    if (!loader) loader = new Promise((resolve) => {
      const s = document.createElement('script');
      s.src = 'https://embed.altmetric.com/assets/embed.js';
      s.async = true; s.onload = resolve; s.onerror = resolve;
      document.head.appendChild(s);
    });
    return loader;
  }
  const io = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target; io.unobserve(el);
      if (el.dataset.done) return; el.dataset.done = '1';
      el.innerHTML = `<div class="altmetric-embed" data-badge-type="donut" data-badge-popover="left" data-hide-no-mentions="true" data-pmid="${el.dataset.pmid}"></div>`;
      loadAltmetric().then(() => window._altmetric_embed_init && window._altmetric_embed_init(el));
    });
  }, { rootMargin: '200px' }) : null;
  function watch() {
    if (!io) return;
    document.querySelectorAll('.pub-badge[data-pmid]:not([data-done])').forEach((el) => {
      if (el.closest('.pub') && el.closest('.pub').hidden) return;
      io.observe(el);
    });
  }
  document.addEventListener('pubs:updated', watch);
  if (document.readyState !== 'loading') watch(); else document.addEventListener('DOMContentLoaded', watch);
})();
