'use strict';

/* Landing page — sem autenticação: reveal com stagger, parallax no
   hero e nav que reage ao scroll. O login/registro real vive em
   login.html. */

/* Navegação com fade: some a página antes de trocar de URL — usado
   por todos os botões/links que levam ao login. */
function goTo(url) {
  document.body.classList.remove('page-ready');
  setTimeout(() => { window.location.href = url; }, 380);
}

window.addEventListener('DOMContentLoaded', () => {
  requestAnimationFrame(() => document.body.classList.add('page-ready'));

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Título do hero: cada palavra entra com leve movimento e depois fica
  // flutuando em onda continuamente (cada uma com uma fase diferente)
  const heroTitle = document.querySelector('.hero h1');
  if (heroTitle) {
    heroTitle.querySelectorAll('.word-in').forEach((w, i) => {
      w.style.transitionDelay = (i * 55) + 'ms';
    });
    heroTitle.querySelectorAll('.word-bob').forEach((w, i) => {
      w.style.animationDelay = (i * 55 + 850) + 'ms';
    });
    requestAnimationFrame(() => requestAnimationFrame(() => heroTitle.classList.add('words-in')));
  }

  // Escalona a entrada dos filhos diretos de .stagger (cards, steps, faq...)
  document.querySelectorAll('.stagger').forEach(group => {
    Array.from(group.children).forEach((child, i) => {
      child.style.transitionDelay = (i * 70) + 'ms';
    });
  });

  // Scroll reveal — .lp-reveal e .stagger entram com fade + slide sutil
  const revealEls = document.querySelectorAll('.lp-reveal, .stagger');
  if (revealEls.length && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
    revealEls.forEach(el => io.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('in-view'));
  }

  // Nav: link ativo conforme a seção visível
  const navLinks = document.querySelectorAll('.nav-links a');
  if (navLinks.length) {
    const sections = Array.from(navLinks).map(a => document.querySelector(a.getAttribute('href'))).filter(Boolean);
    const navIo = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const link = document.querySelector('.nav-links a[href="#' + entry.target.id + '"]');
        if (link) link.classList.toggle('active', entry.isIntersecting);
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    sections.forEach(s => navIo.observe(s));
  }

  // Nav ganha fundo mais forte assim que sai do topo
  const nav = document.querySelector('.nav');
  if (nav) {
    window.addEventListener('scroll', () => {
      nav.classList.toggle('scrolled', window.scrollY > 30);
    }, { passive: true });
  }

  if (reduceMotion) return;

  initHeroParticles();

  // O texto do hero some/encolhe suavemente conforme ele sai de vista
  const heroWrap = document.querySelector('.hero-wrap');
  const heroText = document.querySelector('.hero');
  if (heroWrap && heroText) {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const heroH = heroWrap.offsetHeight || 1;
        const progress = Math.min(1, y / (heroH * 0.85));
        heroText.style.opacity   = String(1 - progress * 0.85);
        heroText.style.transform = 'translateY(' + (progress * 34) + 'px) scale(' + (1 - progress * 0.04) + ')';
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }
});

/* ── Partículas do hero — campo denso de pontos à deriva, com brilho
   sutil, na paleta da marca (branco/indigo/teal). Pausa quando o hero
   sai da tela pra não gastar CPU à toa. ── */
function initHeroParticles() {
  const canvas = document.getElementById('hero-particles');
  const wrap   = document.querySelector('.hero-wrap');
  if (!canvas || !wrap) return;
  const ctx = canvas.getContext('2d');
  const COLORS = ['#ffffff', '#a5b4fc', '#818cf8', '#5eead4'];
  const DENSITY = 0.00014; // partículas por px² — dá umas 130-180 num hero típico
  let W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
  let particles = [];
  let running = false, rafId = null;

  function resize() {
    W = wrap.clientWidth;
    H = wrap.clientHeight;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.max(60, Math.min(220, Math.round(W * H * DENSITY)));
    particles = Array.from({ length: count }, () => spawn());
  }
  function spawn() {
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.18,
      vy: (Math.random() - 0.5) * 0.14,
      r: Math.random() * 1.4 + 0.4,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      phase: Math.random() * Math.PI * 2,
      speed: 0.4 + Math.random() * 0.8,
      base: 0.25 + Math.random() * 0.55,
    };
  }
  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < -4) p.x = W + 4; else if (p.x > W + 4) p.x = -4;
      if (p.y < -4) p.y = H + 4; else if (p.y > H + 4) p.y = -4;
      const twinkle = 0.5 + 0.5 * Math.sin(t * 0.001 * p.speed + p.phase);
      ctx.globalAlpha = p.base * twinkle;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    if (running) rafId = requestAnimationFrame(draw);
  }
  function start() { if (running) return; running = true; rafId = requestAnimationFrame(draw); }
  function stop()  { running = false; if (rafId) cancelAnimationFrame(rafId); }

  resize();
  start();

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 200);
  });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      entries.forEach(entry => entry.isIntersecting ? start() : stop());
    }, { threshold: 0 }).observe(wrap);
  }
}
