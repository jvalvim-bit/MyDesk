'use strict';

/* Landing page — sem autenticação, só scroll reveal e nav ativo.
   O login/registro real vive em login.html. */
window.addEventListener('DOMContentLoaded', () => {
  // Scroll reveal — seções da landing entram com fade + slide sutil
  const revealEls = document.querySelectorAll('.lp-reveal');
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
});
