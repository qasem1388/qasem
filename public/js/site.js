/* سكربت الموقع العام: القائمة، السلايدر، العدادات، التبويبات، عارض PDF، معرض الصور، فيديو YouTube */
(function () {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isRtl = document.documentElement.dir === 'rtl';

  // ===== القائمة على الجوال =====
  const body = document.body;
  const openBtn = $('[data-nav-open]');
  const setNav = (open) => {
    body.classList.toggle('nav-open', open);
    if (openBtn) openBtn.setAttribute('aria-expanded', String(open));
    if (open) { const first = $('#mainNav a'); if (first) first.focus(); }
  };
  if (openBtn) openBtn.addEventListener('click', () => setNav(true));
  $$('[data-nav-close]').forEach((el) => el.addEventListener('click', () => setNav(false)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && body.classList.contains('nav-open')) { setNav(false); openBtn && openBtn.focus(); } });
  $$('.submenu-toggle').forEach((btn) => btn.addEventListener('click', () => {
    const sub = btn.nextElementSibling;
    const open = btn.getAttribute('aria-expanded') !== 'true';
    btn.setAttribute('aria-expanded', String(open));
    sub.classList.toggle('is-open', open);
  }));

  // ظل الرأس عند التمرير
  const header = $('#siteHeader');
  if (header) {
    const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // ===== السلايدر =====
  $$('[data-slider]').forEach((slider) => {
    const slides = $$('.hero-slide', slider);
    const dots = $$('[data-dot]', slider);
    if (slides.length < 2) return;
    let index = 0;
    let timer = null;
    const interval = Number(slider.dataset.interval) || 6000;
    const go = (i) => {
      index = (i + slides.length) % slides.length;
      slides.forEach((s, k) => {
        s.classList.toggle('is-active', k === index);
        s.setAttribute('aria-hidden', String(k !== index));
        $$('a, button', s).forEach((el) => { el.tabIndex = k === index ? 0 : -1; });
      });
      dots.forEach((d, k) => d.setAttribute('aria-current', String(k === index)));
    };
    const play = () => { if (!reduceMotion) { stop(); timer = setInterval(() => go(index + 1), interval); } };
    const stop = () => { if (timer) clearInterval(timer); timer = null; };
    $('[data-next]', slider).addEventListener('click', () => { go(index + 1); play(); });
    $('[data-prev]', slider).addEventListener('click', () => { go(index - 1); play(); });
    dots.forEach((d) => d.addEventListener('click', () => { go(Number(d.dataset.dot)); play(); }));
    slider.addEventListener('mouseenter', stop);
    slider.addEventListener('mouseleave', play);
    slider.addEventListener('focusin', stop);
    // السحب باللمس
    let x0 = null;
    slider.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; stop(); }, { passive: true });
    slider.addEventListener('touchend', (e) => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 40) go(index + ((dx > 0) === isRtl ? 1 : -1));
      x0 = null;
      play();
    });
    go(0);
    play();
  });

  // ===== العدادات المتحركة + حركة الظهور =====
  const animateCount = (el) => {
    const target = Number(el.dataset.count) || 0;
    if (reduceMotion || target === 0) return;
    const fmt = new Intl.NumberFormat('en-US');
    const start = performance.now();
    const dur = 1600;
    const step = (now) => {
      const p = Math.min((now - start) / dur, 1);
      el.textContent = fmt.format(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(step);
    };
    el.textContent = '0';
    requestAnimationFrame(step);
  };
  const revealEls = $$('.mvv-card, .service-card, .news-card, .stat, .person-card, .file-item, .content-block');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (!en.isIntersecting) return;
      en.target.classList.add('is-visible');
      $$('[data-count]', en.target).forEach(animateCount);
      if (en.target.matches('[data-count]')) animateCount(en.target);
      io.unobserve(en.target);
    }), { threshold: 0.15 });
    revealEls.forEach((el) => { el.classList.add('reveal'); io.observe(el); });
    $$('.stats-grid').forEach((g) => { if (!g.closest('.reveal')) io.observe(g); });
  }

  // ===== التبويبات =====
  $$('[data-tabs]').forEach((tabs) => {
    const list = $$('[role="tab"]', tabs);
    const select = (tab) => {
      list.forEach((t) => {
        const on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
      });
    };
    list.forEach((t, i) => {
      t.addEventListener('click', () => select(t));
      t.addEventListener('keydown', (e) => {
        const dir = { ArrowLeft: isRtl ? 1 : -1, ArrowRight: isRtl ? -1 : 1 }[e.key];
        if (dir) { const n = list[(i + dir + list.length) % list.length]; n.focus(); select(n); }
      });
    });
  });

  // ===== تغليف الجداول للتمرير الأفقي على الجوال =====
  $$('.rich table').forEach((tbl) => {
    if (tbl.parentElement.classList.contains('table-wrap')) return;
    const wrap = document.createElement('div');
    wrap.className = 'table-wrap';
    tbl.parentNode.insertBefore(wrap, tbl);
    wrap.appendChild(tbl);
  });

  // ===== عارض PDF =====
  const pdfModal = $('#pdfModal');
  const isMobile = () => window.matchMedia('(max-width: 640px), (pointer: coarse)').matches;
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-pdf]');
    if (!btn) return;
    e.preventDefault();
    const url = btn.dataset.pdf;
    // متصفحات الجوال لا تعرض PDF داخل الإطارات بشكل جيد، فيُفتح في تبويب جديد
    if (!pdfModal || !pdfModal.showModal || isMobile()) { window.open(url, '_blank', 'noopener'); return; }
    $('#pdfTitle').textContent = btn.dataset.title || '';
    $('#pdfFrame').src = url;
    $('#pdfOpen').href = url;
    $('#pdfDownload').href = url;
    pdfModal.showModal();
  });
  if (pdfModal) {
    const closePdf = () => { pdfModal.close(); $('#pdfFrame').src = 'about:blank'; };
    $('[data-pdf-close]', pdfModal).addEventListener('click', closePdf);
    pdfModal.addEventListener('click', (e) => { if (e.target === pdfModal) closePdf(); });
  }

  // ===== معرض الصور (Lightbox) =====
  const lb = $('#lightbox');
  if (lb && lb.showModal) {
    let items = [];
    let cur = 0;
    const show = (i) => {
      cur = (i + items.length) % items.length;
      $('#lbImg').src = items[cur].href;
      $('#lbImg').alt = items[cur].dataset.caption || '';
      $('#lbCap').textContent = items[cur].dataset.caption || '';
    };
    $$('[data-gallery]').forEach((g) => g.addEventListener('click', (e) => {
      const a = e.target.closest('a');
      if (!a) return;
      e.preventDefault();
      items = $$('a', g);
      show(items.indexOf(a));
      lb.showModal();
    }));
    $('[data-lb-close]', lb).addEventListener('click', () => lb.close());
    $('[data-lb-prev]', lb).addEventListener('click', () => show(cur - 1));
    $('[data-lb-next]', lb).addEventListener('click', () => show(cur + 1));
    lb.addEventListener('click', (e) => { if (e.target === lb) lb.close(); });
    lb.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') show(cur + (isRtl ? 1 : -1));
      if (e.key === 'ArrowRight') show(cur + (isRtl ? -1 : 1));
    });
  }

  // ===== تحميل فيديو YouTube عند الطلب فقط (أسرع للصفحة) =====
  document.addEventListener('click', (e) => {
    const box = e.target.closest('[data-youtube]');
    if (!box || box.querySelector('iframe')) return;
    const id = box.dataset.youtube;
    if (!/^[\w-]{11}$/.test(id)) return;
    const f = document.createElement('iframe');
    f.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
    f.title = box.dataset.title || 'YouTube';
    f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    f.allowFullscreen = true;
    box.appendChild(f);
  });
})();
