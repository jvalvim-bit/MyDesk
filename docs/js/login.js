'use strict';

/* ── Utilitários mínimos necessários para auth ── */
function $(id) { return document.getElementById(id); }
function $v(id) { return $(id).value; }
function showErr(id, msg) { const e = $(id); e.textContent = msg; e.classList.add('show'); }
function hideErr(id) { const e = $(id); if (e) { e.classList.remove('show'); e.textContent = ''; } }

function toast(icon, msg) {
  const t = $('toast');
  if (!t) return;
  $('t-ico').textContent = icon;
  $('t-msg').textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

/* ── Firebase helpers ── */
let _db = null;
let _auth = null;
let _fbReady = false;

function loadFirebase() {
  return new Promise((ok) => {
    if (_fbReady) { ok(); return; }
    function tryInit() {
      if (window._fbInitDone) {
        _db = window._fbDB; _auth = window._fbAuth; _fbReady = true; ok();
      } else { setTimeout(tryInit, 50); }
    }
    tryInit();
  });
}

function getAuth() { return _auth || window._fbAuth || null; }
function fbGet(path) { return _db.ref(path).once('value').then(s => s.val()); }
function fbSet(path, val) { return _db.ref(path).set(val); }

/* ── Tab de login/registro ── */
function switchTab(t) {
  $('form-login').style.display = t === 'login' ? 'block' : 'none';
  $('form-reg').style.display   = t === 'reg'   ? 'block' : 'none';
  $('tab-login').classList.toggle('active', t === 'login');
  $('tab-reg').classList.toggle('active',   t === 'reg');
  $('login-err').textContent = '';
  $('reg-err').textContent   = '';
}

/* ── Mapeamento de erros Firebase — PT-BR / EN, escolhido pelo idioma do usuário ──
   Nunca repassamos e.message (texto cru do SDK do Firebase, sempre em inglês
   técnico) para a tela — sempre uma mensagem traduzida e amigável. */
const AUTH_ERR_MSGS = {
  pt: {
    'auth/email-already-in-use':      'Este e-mail já está cadastrado.',
    'auth/invalid-email':             'E-mail inválido.',
    'auth/weak-password':             'Senha muito fraca. Use pelo menos 8 caracteres.',
    'auth/user-not-found':            'E-mail não encontrado.',
    'auth/wrong-password':            'Senha incorreta.',
    'auth/invalid-credential':        'E-mail ou senha incorretos.',
    'auth/invalid-login-credentials': 'E-mail ou senha incorretos.',
    'auth/missing-password':          'Informe a senha.',
    'auth/too-many-requests':         'Muitas tentativas. Tente novamente mais tarde.',
    'auth/network-request-failed':    'Sem conexão com a internet.',
    'auth/user-disabled':             'Esta conta foi desativada.',
    'auth/operation-not-allowed':     'Registro desativado. Contate o administrador.',
    'auth/configuration-not-found':   'Firebase não configurado corretamente.',
    default:                          'Erro ao autenticar. Tente novamente.',
  },
  en: {
    'auth/email-already-in-use':      'This email is already registered.',
    'auth/invalid-email':             'Invalid email.',
    'auth/weak-password':             'Password too weak. Use at least 8 characters.',
    'auth/user-not-found':            'Email not found.',
    'auth/wrong-password':            'Incorrect password.',
    'auth/invalid-credential':        'Incorrect email or password.',
    'auth/invalid-login-credentials': 'Incorrect email or password.',
    'auth/missing-password':          'Enter your password.',
    'auth/too-many-requests':         'Too many attempts. Try again later.',
    'auth/network-request-failed':    'No internet connection.',
    'auth/user-disabled':             'This account has been disabled.',
    'auth/operation-not-allowed':     'Registration disabled. Contact the administrator.',
    'auth/configuration-not-found':   'Firebase is not configured correctly.',
    default:                          'Authentication error. Please try again.',
  },
};

// Mesma chave (md_lang) usada pelo detector de idioma/geolocalização em app.js,
// para manter a preferência consistente entre login.html e index.html.
function currentAuthLang() {
  const saved = localStorage.getItem('md_lang');
  if (saved && AUTH_ERR_MSGS[saved]) return saved;
  const browserLang = (navigator.language || navigator.userLanguage || 'pt').slice(0, 2).toLowerCase();
  return AUTH_ERR_MSGS[browserLang] ? browserLang : 'pt';
}

function authErrMsg(code) {
  const dict = AUTH_ERR_MSGS[currentAuthLang()];
  return dict[code] || dict.default;
}

/* ── Hash de senha para modo demo (offline, sem Firebase) ──
   PBKDF2 com salt aleatório por conta — evita que um único rainbow table
   sirva pra todas as contas (o antigo SHA-256 com "sal" fixo era fraco
   nesse sentido). _demoHashPassLegacy fica só pra migrar contas antigas. */
function _demoGenSalt() {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}
async function _demoHashPass(pass, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: 100000, hash: 'SHA-256' },
    keyMaterial, 256
  );
  return Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('');
}
async function _demoHashPassLegacy(pass) {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest('SHA-256', enc.encode('mydesk-demo-v1:' + pass));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/* ── Redirecionar para o app após login ── */
function goToApp(userData) {
  if (userData && userData.uid && userData.uid.startsWith('demo_')) {
    localStorage.setItem('md_sess_demo', JSON.stringify(userData));
  }
  sessionStorage.setItem('_md_just_logged_in', '1');
  window.location.href = 'index.html';
}

/* ── Registro ── */
async function doRegister() {
  const name  = $v('r-name').trim();
  const user  = $v('r-user').trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
  const email = $v('r-email').trim().toLowerCase();
  const role  = $v('r-role').trim();
  const pass  = $v('r-pass');
  const pass2 = $v('r-pass2');

  if (!name)  return showErr('reg-err', 'Informe seu nome.');
  if (!user)  return showErr('reg-err', 'Informe um nome de usuário (letras, números, _).');
  if (user.length < 2) return showErr('reg-err', 'Usuário deve ter ao menos 2 caracteres.');
  if (!email) return showErr('reg-err', 'Informe seu e-mail.');
  if (!pass)  return showErr('reg-err', 'Informe uma senha.');
  if (pass.length < 8 || !/[A-Za-z]/.test(pass) || !/[0-9]/.test(pass))
    return showErr('reg-err', 'Senha deve ter ao menos 8 caracteres com letras e números.');
  if (pass !== pass2) return showErr('reg-err', 'As senhas não coincidem.');

  const btn = $('btn-register');
  btn.textContent = 'Criando…'; btn.disabled = true;

  // Modo demo (Firebase indisponível)
  if (!window._fbInitDone) {
    const accs = JSON.parse(localStorage.getItem('md_acc') || '{}');
    if (accs[user]) { showErr('reg-err', 'Usuário já existe.'); btn.textContent = 'Criar conta →'; btn.disabled = false; return; }
    const salt     = _demoGenSalt();
    const passHash = await _demoHashPass(pass, salt);
    accs[user] = { username: user, name, role, email, passHash, salt };
    localStorage.setItem('md_acc', JSON.stringify(accs));
    goToApp({ uid: 'demo_' + user, username: user, name, role, email });
    return;
  }

  try {
    await loadFirebase();
    const auth = getAuth();

    let existing = null;
    try { existing = await fbGet('usernames/' + user); } catch(_) {}
    if (existing) {
      showErr('reg-err', 'Este nome de usuário já está em uso.');
      btn.textContent = 'Criar conta →'; btn.disabled = false;
      return;
    }

    let cred;
    try {
      cred = await auth.createUserWithEmailAndPassword(email, pass);
    } catch(e) {
      showErr('reg-err', authErrMsg(e.code));
      btn.textContent = 'Criar conta →'; btn.disabled = false;
      return;
    }

    const uid = cred.user.uid;
    await cred.user.updateProfile({ displayName: user }).catch(() => {});

    let claimed = false;
    try {
      const tx = await _db.ref('usernames/' + user).transaction(val => {
        if (val === null) return uid;
        if (val === uid)  return uid;
        return undefined;
      });
      claimed = tx.committed;
    } catch(_) { claimed = false; }

    if (!claimed) {
      await cred.user.delete().catch(() => {});
      showErr('reg-err', 'Este nome de usuário foi registrado por outra pessoa. Tente outro.');
      btn.textContent = 'Criar conta →'; btn.disabled = false;
      return;
    }

    const profile = { name, role: role || '', email, uid, username: user };
    await _db.ref().update({
      ['uids/' + uid]:                user,
      ['users/' + uid + '/profile']:  profile,
      ['users/' + user + '/profile']: profile,
    }).catch(async () => {
      await fbSet('uids/' + uid, user).catch(() => {});
      await fbSet('users/' + uid + '/profile', profile).catch(() => {});
      await fbSet('users/' + user + '/profile', profile).catch(() => {});
    });

    goToApp({ uid, username: user, name, role, email });

  } catch(e) {
    console.error('Register error:', e);
    showErr('reg-err', authErrMsg(e.code));
    btn.textContent = 'Criar conta →'; btn.disabled = false;
  }
}

/* ── Login ── */
async function doLogin() {
  const email = $v('l-email').trim().toLowerCase();
  const pass  = $v('l-pass');

  if (!email) return showErr('login-err', 'Informe seu e-mail.');
  if (!pass)  return showErr('login-err', 'Informe sua senha.');

  const btn = $('btn-login');
  btn.textContent = 'Entrando…'; btn.disabled = true;

  // Modo demo
  if (!window._fbInitDone) {
    const username = email.split('@')[0].replace(/[^a-z0-9_]/gi, '') || 'demo';
    const accs = JSON.parse(localStorage.getItem('md_acc') || '{}');
    const acc = Object.values(accs).find(a => a.email === email);
    if (acc) {
      let match, needsRehash = false;
      if (acc.salt && acc.passHash) {
        match = acc.passHash === await _demoHashPass(pass, acc.salt);
      } else if (acc.passHash) {
        // Conta antiga: hash sem salt por conta. Migra pro PBKDF2 salgado no acerto.
        match = acc.passHash === await _demoHashPassLegacy(pass);
        needsRehash = match;
      } else {
        // Conta bem antiga: senha em texto puro. Migra também.
        match = acc.passDemo === pass;
        needsRehash = match;
      }
      if (!match) {
        showErr('login-err', 'Senha incorreta.');
        btn.textContent = 'Entrar →'; btn.disabled = false;
        return;
      }
      if (needsRehash) {
        acc.salt     = _demoGenSalt();
        acc.passHash = await _demoHashPass(pass, acc.salt);
        delete acc.passDemo;
        localStorage.setItem('md_acc', JSON.stringify(accs));
      }
      goToApp({ uid: 'demo_' + acc.username, username: acc.username, name: acc.name, role: acc.role || '', email });
    } else {
      const salt     = _demoGenSalt();
      const passHash = await _demoHashPass(pass, salt);
      const newAcc = { username, name: username, role: '', email, passHash, salt };
      accs[username] = newAcc;
      localStorage.setItem('md_acc', JSON.stringify(accs));
      goToApp({ uid: 'demo_' + username, username, name: username, role: '', email });
    }
    return;
  }

  try {
    await loadFirebase();
    const auth = getAuth();
    const cred = await auth.signInWithEmailAndPassword(email, pass);
    // Redirect immediately — app.js (tryAutoLogin) handles profile loading
    goToApp({ uid: cred.user.uid, email });

  } catch(e) {
    console.error('Login error:', e.code, e.message);
    showErr('login-err', authErrMsg(e.code));
    btn.textContent = 'Entrar →'; btn.disabled = false;
  }
}

/* ── Login com Google ── */
async function doGoogleLogin() {
  if (!window._fbInitDone) { toast('⚠', 'Firebase não carregado.'); return; }
  const auth = getAuth();
  if (!auth) { toast('⚠', 'Auth não disponível.'); return; }

  const btn = document.getElementById('btn-google-login') || document.getElementById('btn-google-reg');
  const originalText = btn?.innerHTML;
  if (btn) { btn.disabled = true; btn.style.opacity = '.6'; }

  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const cred = await auth.signInWithPopup(provider);
    const user = cred.user;

    await loadFirebase();
    let username = await fbGet('uids/' + user.uid).catch(() => null);

    if (!username) {
      const emailPrefix = (user.email || '').split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 20);
      const displayName = user.displayName || emailPrefix;
      let candidate = emailPrefix;
      let attempts = 0;
      while (attempts < 5) {
        const taken = await fbGet('usernames/' + candidate).catch(() => null);
        if (!taken) break;
        candidate = emailPrefix + Math.floor(Math.random() * 9000 + 1000);
        attempts++;
      }
      username = candidate;
      const profile = { name: displayName, role: '', email: user.email || '', uid: user.uid, username, photo: user.photoURL || null };
      await fbSet('usernames/' + username, user.uid);
      await fbSet('uids/' + user.uid, username);
      await fbSet('users/' + user.uid + '/profile', profile);
      await fbSet('users/' + username + '/profile', profile);
      goToApp({ uid: user.uid, username, name: displayName, role: '', email: user.email || '' });
    } else {
      let profile = await fbGet('users/' + user.uid + '/profile').catch(() => null)
               || await fbGet('users/' + username + '/profile').catch(() => null)
               || {};
      goToApp({ uid: user.uid, username, name: profile.name || username, role: profile.role || '', email: user.email || '' });
    }

  } catch(e) {
    if (btn) { btn.disabled = false; btn.innerHTML = originalText; btn.style.opacity = ''; }
    if (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request') return;
    console.error('Google login error:', e);
    showErr('login-err', 'Erro ao entrar com Google: ' + (e.message || e.code));
  }
}

/* ── Esqueci a senha ── */
async function doForgotPassword() {
  const email = $v('l-email').trim();
  if (!email) return showErr('login-err', 'Informe seu e-mail para redefinir a senha.');
  try {
    await getAuth().sendPasswordResetEmail(email);
    const el = $('login-err');
    el.textContent = '✓ E-mail de redefinição enviado! Verifique sua caixa de entrada.';
    el.classList.add('show');
    el.style.color = '#6ee7b7';
  } catch(e) {
    showErr('login-err', authErrMsg(e.code));
  }
}

/* ── Animação de typewriter ── */
function startTypewriter() {
  const el     = document.getElementById('auth-typewriter');
  const cursor = document.getElementById('auth-cursor');
  if (!el || !cursor) return;
  const phrases = ['de notas.', 'colaborativo.', 'sem distrações.', 'do seu jeito.'];
  let pi = 0, ci = 0, deleting = false;
  function tick() {
    const phrase = phrases[pi];
    if (!deleting) {
      el.textContent = phrase.slice(0, ++ci);
      if (ci === phrase.length) { deleting = true; return setTimeout(tick, 1800); }
    } else {
      el.textContent = phrase.slice(0, --ci);
      if (ci === 0) { deleting = false; pi = (pi + 1) % phrases.length; return setTimeout(tick, 400); }
    }
    setTimeout(tick, deleting ? 45 : 90);
  }
  tick();
}

/* ── Tema claro/escuro ── */
function toggleTheme() {
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  const next = isLight ? 'dark' : 'light';
  if (next === 'light') document.documentElement.setAttribute('data-theme', 'light');
  else document.documentElement.removeAttribute('data-theme');
  localStorage.setItem('md_theme', next);
}

/* ── Guard: se já autenticado, ir direto para o app ── */
window.addEventListener('DOMContentLoaded', () => {
  // Verificar sessão demo
  const sess = localStorage.getItem('md_sess_demo');
  if (sess) {
    try {
      const u = JSON.parse(sess);
      if (u?.username) { window.location.href = 'index.html'; return; }
    } catch(_) {}
  }

  // Verificar Firebase Auth
  if (window._fbInitDone && window._fbAuth) {
    window._fbAuth.onAuthStateChanged(user => {
      if (user) window.location.href = 'index.html';
    });
  }

  // Animação
  startTypewriter();

  // Bindagem dos botões
  $('tab-login')?.addEventListener('click', () => switchTab('login'));
  $('tab-reg')?.addEventListener('click',   () => switchTab('reg'));
  $('btn-login')?.addEventListener('click', doLogin);
  $('btn-register')?.addEventListener('click', doRegister);
  document.getElementById('btn-google-login')?.addEventListener('click', doGoogleLogin);
  document.getElementById('btn-google-reg')?.addEventListener('click',   doGoogleLogin);
  document.getElementById('forgot-pass')?.addEventListener('click', doForgotPassword);

  // Enter key para submeter
  document.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    if ($('form-login') && $('form-login').style.display !== 'none') doLogin();
    else doRegister();
  });

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
    revealEls.forEach(el => el.classList.add('in-view')); // sem suporte — mostra direto
  }

  // Nav: link ativo conforme a seção visível
  const navLinks = document.querySelectorAll('.lp-nav-links a');
  if (navLinks.length) {
    const sections = Array.from(navLinks).map(a => document.querySelector(a.getAttribute('href'))).filter(Boolean);
    const navIo = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const link = document.querySelector('.lp-nav-links a[href="#' + entry.target.id + '"]');
        if (link) link.classList.toggle('active', entry.isIntersecting);
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    sections.forEach(s => navIo.observe(s));
  }
});
