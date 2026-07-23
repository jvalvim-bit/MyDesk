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

  // O texto do hero some/encolhe suavemente conforme ele sai de vista
  // (o fundo agora é estático — grade de pontos + glow, sem parallax).
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
