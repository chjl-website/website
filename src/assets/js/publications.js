// Filters the publications list in the browser. Filters are kept in the address
// (e.g. ?topic=immigrant-health&member=adam-gaffney) so filtered views can be shared.
(function () {
  const form = document.getElementById('filters');
  const items = Array.from(document.querySelectorAll('#pubs > .pub'));
  const count = document.getElementById('count');
  const more = document.getElementById('more');
  const PAGE = 30;
  let shown = PAGE;

  const years = [...new Set(items.map((li) => li.dataset.year))].filter(Boolean).sort((a, b) => b - a);
  const fromSel = form.elements.from;
  years.forEach((y) => fromSel.add(new Option(`${y} or later`, y)));

  items.forEach((li) => { li._text = li.textContent.toLowerCase(); });

  const params = new URLSearchParams(location.search);
  ['q', 'topic', 'member', 'type', 'from'].forEach((k) => { if (params.get(k)) form.elements[k].value = params.get(k); });

  function apply(resetPaging) {
    if (resetPaging) shown = PAGE;
    const f = Object.fromEntries(new FormData(form));
    const q = (f.q || '').trim().toLowerCase();
    let matched = 0;
    items.forEach((li) => {
      const ok = (!f.topic || li.dataset.topics.split(' ').includes(f.topic)) &&
        (!f.member || li.dataset.members.split(' ').includes(f.member)) &&
        (!f.type || li.dataset.type === f.type) &&
        (!f.from || Number(li.dataset.year) >= Number(f.from)) &&
        (!q || q.split(/\s+/).every((w) => li._text.includes(w)));
      if (ok) matched++;
      li.hidden = !ok || matched > shown;
    });
    count.textContent = `${matched} publication${matched === 1 ? '' : 's'}`;
    more.hidden = matched <= shown;
    const p = new URLSearchParams();
    Object.entries(f).forEach(([k, v]) => v && p.set(k, v));
    history.replaceState(null, '', p.toString() ? `?${p}` : location.pathname);
    document.dispatchEvent(new Event('pubs:updated'));
  }

  form.addEventListener('input', () => apply(true));
  form.addEventListener('change', () => apply(true));
  more.addEventListener('click', () => { shown += PAGE; apply(false); });
  document.getElementById('reset').addEventListener('click', () => { form.reset(); apply(true); });
  apply(true);
})();
