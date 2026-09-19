/* =========================================================
   Анимации и интерактив сайта-визитки
   ========================================================= */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------------------------------------------------------
     1. Переключатель языка RU / UA
     --------------------------------------------------------- */
  var TITLES = {
    uk: 'Рудяков Павло Павлович — тренер із шахів, онлайн-група для дітей',
    ru: 'Рудяков Павел Павлович — тренер по шахматам, онлайн-группа для детей'
  };

  // Основной язык страницы — украинский (текст лежит прямо в HTML),
  // русский перевод хранится в атрибуте data-ru рядом с ним.
  function applyLang(lang) {
    $$('[data-ru]').forEach(function (el) {
      if (el.dataset.ukText === undefined) el.dataset.ukText = el.textContent;
      el.textContent = lang === 'ru' ? el.dataset.ru : el.dataset.ukText;
    });
    document.documentElement.lang = lang === 'ru' ? 'ru' : 'uk';
    document.title = TITLES[lang] || TITLES.uk;
    $$('.lang-btn').forEach(function (b) {
      b.classList.toggle('is-active', b.dataset.lang === lang);
    });
    try { localStorage.setItem('gambit-lang', lang); } catch (e) {}
  }

  $$('.lang-btn').forEach(function (btn) {
    btn.addEventListener('click', function () { applyLang(btn.dataset.lang); });
  });

  var saved = null;
  try { saved = localStorage.getItem('gambit-lang'); } catch (e) {}
  if (saved === 'ru') applyLang('ru');

  /* ---------------------------------------------------------
     2. Шапка: фон при прокрутке, активный пункт, бургер
     --------------------------------------------------------- */
  var header = $('#header');
  var nav = $('#nav');
  var burger = $('#burger');
  var progress = $('.scroll-progress i');
  var navLinks = $$('#nav a');
  var sections = navLinks
    .map(function (a) { return $(a.getAttribute('href')); })
    .filter(Boolean);

  burger.addEventListener('click', function () {
    var open = nav.classList.toggle('is-open');
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    document.body.style.overflow = open ? 'hidden' : '';
  });

  navLinks.forEach(function (a) {
    a.addEventListener('click', function () {
      nav.classList.remove('is-open');
      burger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    });
  });

  function onScroll() {
    var y = window.pageYOffset;
    header.classList.toggle('is-stuck', y > 40);

    var h = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.width = (h > 0 ? Math.min(y / h, 1) * 100 : 0) + '%';

    var current = null;
    sections.forEach(function (sec) {
      if (sec.getBoundingClientRect().top <= window.innerHeight * 0.35) current = sec.id;
    });
    navLinks.forEach(function (a) {
      a.classList.toggle('is-active', a.getAttribute('href') === '#' + current);
    });
  }

  /* ---------------------------------------------------------
     3. Появление блоков при прокрутке
     --------------------------------------------------------- */
  var revealItems = $$('[data-reveal]');
  if (reduced || !('IntersectionObserver' in window)) {
    revealItems.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('is-in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    revealItems.forEach(function (el) { io.observe(el); });
  }

  /* ---------------------------------------------------------
     4. Счётчики (2 / 60 / 2 000)
     --------------------------------------------------------- */
  function runCounter(el) {
    var target = parseInt(el.dataset.count, 10);
    var suffix = el.dataset.suffix || '';
    var dur = 1500;
    var start = null;

    if (reduced) {
      el.textContent = target.toLocaleString('ru-RU') + suffix;
      return;
    }
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased).toLocaleString('ru-RU') + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  var counters = $$('[data-count]');
  if ('IntersectionObserver' in window) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { runCounter(e.target); cio.unobserve(e.target); }
      });
    }, { threshold: 0.5 });
    counters.forEach(function (el) { cio.observe(el); });
  } else {
    counters.forEach(runCounter);
  }

  /* ---------------------------------------------------------
     5. Шахматная доска в фоне героя + пробегающая подсветка
     --------------------------------------------------------- */
  var board = $('#heroBoard');
  if (board) {
    var cells = [];
    for (var r = 0; r < 14; r++) {
      for (var c = 0; c < 24; c++) {
        var cell = document.createElement('span');
        if ((r + c) % 2 === 0) cell.className = 'dark';
        board.appendChild(cell);
        cells.push(cell);
      }
    }
    if (!reduced) {
      setInterval(function () {
        if (document.hidden || window.pageYOffset > window.innerHeight) return;
        var cell = cells[Math.floor(Math.random() * cells.length)];
        cell.classList.remove('lit');
        void cell.offsetWidth;
        cell.classList.add('lit');
      }, 900);
    }
  }

  /* ---------------------------------------------------------
     6. Объёмный конь: экструзия из слоёв SVG
     --------------------------------------------------------- */
  var knight = $('#knight3d');
  if (knight) {
    var base = $('.knight-layer', knight);
    var LAYERS = reduced ? 1 : 42;
    var STEP = 0.95;
    var half = (LAYERS - 1) / 2;

    for (var i = 0; i < LAYERS; i++) {
      var layer = i === 0 ? base : base.cloneNode(true);
      var z = (i - half) * STEP;
      var t = half ? Math.abs(i - half) / half : 1;          // 0 — середина, 1 — грани
      var mixHex = function (a, b, k) {
        var out = '#';
        for (var j = 0; j < 3; j++) {
          var av = parseInt(a.substr(1 + j * 2, 2), 16);
          var bv = parseInt(b.substr(1 + j * 2, 2), 16);
          out += ('0' + Math.round(av + (bv - av) * k).toString(16)).slice(-2);
        }
        return out;
      };
      layer.style.fill = mixHex('#7A5F22', '#F6DFA9', Math.pow(t, 0.8));
      layer.style.transform = 'translateZ(' + z.toFixed(2) + 'px)';
      if (i !== 0) knight.appendChild(layer);
    }
  }

  /* ---------------------------------------------------------
     7. Параллакс: фигуры в герое, фото клуба
     --------------------------------------------------------- */
  var floaters = $$('.floater');
  var clubImg = $('.club-media img');
  var mouseX = 0, mouseY = 0, tx = 0, ty = 0;

  if (!reduced) {
    window.addEventListener('mousemove', function (e) {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });
  }

  var ticking = false;
  function frame() {
    ticking = false;
    if (document.hidden) return;
    var y = window.pageYOffset;

    tx += (mouseX - tx) * 0.06;
    ty += (mouseY - ty) * 0.06;

    if (!reduced) {
      floaters.forEach(function (f) {
        var d = parseFloat(f.dataset.depth) || 20;
        f.style.marginLeft = (tx * d * 0.5).toFixed(2) + 'px';
        f.style.marginTop = (ty * d * 0.5 - y * d * 0.035).toFixed(2) + 'px';
      });

      if (clubImg) {
        var rect = clubImg.parentNode.getBoundingClientRect();
        if (rect.bottom > 0 && rect.top < window.innerHeight) {
          var rel = (rect.top + rect.height / 2 - window.innerHeight / 2) / window.innerHeight;
          clubImg.style.transform = 'translate3d(0,' + (rel * 46).toFixed(2) + 'px,0) scale(1.04)';
        }
      }
    }
  }

  function requestFrame() {
    if (!ticking) { ticking = true; requestAnimationFrame(frame); }
  }

  window.addEventListener('scroll', function () { onScroll(); requestFrame(); }, { passive: true });
  window.addEventListener('mousemove', requestFrame, { passive: true });
  window.addEventListener('resize', function () { onScroll(); requestFrame(); }, { passive: true });

  // плавное «догоняющее» движение фигур за курсором — только на устройствах с мышью
  if (!reduced && window.matchMedia('(hover:hover)').matches) {
    (function loop() { requestFrame(); setTimeout(loop, 60); })();
  }

  onScroll();
  frame();

  /* ---------------------------------------------------------
     8. FAQ: одновременно открыт только один вопрос
     --------------------------------------------------------- */
  var items = $$('.faq details');
  items.forEach(function (d) {
    d.addEventListener('toggle', function () {
      if (d.open) items.forEach(function (o) { if (o !== d) o.open = false; });
    });
  });
})();
