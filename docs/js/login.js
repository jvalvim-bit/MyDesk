'use strict';

/* ═════════════════════════════════════════════════════════════
   MyDesk — página de login/registro (design "aurora", 1:1 com o
   arquivo enviado — telefone removido, senha também no cadastro
   porque o Firebase exige senha pra criar conta).
   ═════════════════════════════════════════════════════════════ */

const $  = id => document.getElementById(id);
const $v = id => $(id).value;

const form   = $('form');
const submit = $('submit');
const msg    = $('msg');
const thumb  = $('thumb');
let mode = 'signup';

/* ── gira o gradiente cônico (a cor viaja pelo arco) ── */
if (window.CSS && CSS.registerProperty) {
  try {
    CSS.registerProperty({ name: '--ang', syntax: '<angle>', initialValue: '168deg', inherits: false });
    const s = document.createElement('style');
    s.textContent = `
      @keyframes hue{to{--ang:528deg}}
      .aurora,.haze{animation:hue 96s linear infinite, sway 34s ease-in-out infinite alternate!important}
      .aurora{background:conic-gradient(from var(--ang),
        #0a1856 0deg,#1d3fd6 30deg,#5a35d9 58deg,#a531c4 84deg,#e0603a 106deg,
        #f2b04a 124deg,#4fdba4 150deg,#1f86dc 180deg,#17246a 214deg,#0a1856 360deg)}
      .haze{background:conic-gradient(from var(--ang),
        #16256e 0deg,#2c46c8 40deg,#7b3ad2 78deg,#cf4a8e 104deg,#e07a3c 126deg,
        #43c8a0 156deg,#1c6fc4 190deg,#16256e 360deg)}`;
    document.head.appendChild(s);
  } catch (e) {}
}

/* ── segmentado (Criar conta / Entrar) ── */
function moveThumb() {
  const on = document.querySelector('.seg button[aria-selected="true"]');
  thumb.style.width = on.offsetWidth + 'px';
  thumb.style.transform = `translateX(${on.offsetLeft - 3}px)`;
}
function setMode(m) {
  mode = m;
  document.querySelectorAll('.seg button').forEach(b =>
    b.setAttribute('aria-selected', String(b.dataset.mode === m)));
  const up = m === 'signup';
  $('cNames').toggleAttribute('data-off', !up);
  $('ttl').textContent = up ? 'Criar conta' : 'Bem-vindo de volta';
  submit.textContent   = up ? 'Criar conta' : 'Entrar';
  clearErrors();
  moveThumb();
}
document.querySelectorAll('.seg button').forEach(b => b.onclick = () => setMode(b.dataset.mode));
addEventListener('resize', moveThumb);
document.fonts ? document.fonts.ready.then(moveThumb) : moveThumb();
moveThumb();

/* ── senha visível ── */
$('eye').onclick = () => {
  const p = $('password');
  p.type = p.type === 'password' ? 'text' : 'password';
  $('eye').setAttribute('aria-label', p.type === 'password' ? 'Mostrar senha' : 'Ocultar senha');
  p.focus();
};

/* ── validação ── */
const emailOk = v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
function clearErrors() {
  document.querySelectorAll('.ctrl').forEach(c => c.classList.remove('bad'));
  msg.classList.remove('on', 'ok');
}
function fail(text, ...fields) {
  fields.forEach(f => f && f.closest('.ctrl').classList.add('bad'));
  msg.textContent = text;
  msg.classList.remove('ok');
  msg.classList.add('on');
  return false;
}
function okMsg(text) {
  msg.textContent = text;
  msg.classList.add('on', 'ok');
}

/* ── Firebase helpers ── */
let _db = null, _auth = null, _fbReady = false;
function loadFirebase() {
  return new Promise(ok => {
    if (_fbReady) { ok(); return; }
    (function tryInit() {
      if (window._fbInitDone) { _db = window._fbDB; _auth = window._fbAuth; _fbReady = true; ok(); }
      else setTimeout(tryInit, 50);
    })();
  });
}
function getAuth() { return _auth || window._fbAuth || null; }
function fbGet(path) { return _db.ref(path).once('value').then(s => s.val()); }
function fbSet(path, val) { return _db.ref(path).set(val); }

/* ── Mensagens de erro Firebase, traduzidas ── */
const AUTH_ERR_MSGS = {
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
};
function authErrMsg(code) { return AUTH_ERR_MSGS[code] || AUTH_ERR_MSGS.default; }

/* ── Hash de senha para modo demo (offline, sem Firebase) ── */
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

/* ── nome de usuário derivado do e-mail (sem campo visível no formulário —
   o design enviado não tem esse campo; a mesma estratégia já é usada no
   fluxo de login com Google, que também não coleta usuário) ── */
async function deriveUsername(email) {
  const prefix = (email || '').split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 20) || 'user';
  let candidate = prefix, attempts = 0;
  while (attempts < 5) {
    const taken = await fbGet('usernames/' + candidate).catch(() => null);
    if (!taken) break;
    candidate = prefix + Math.floor(Math.random() * 9000 + 1000);
    attempts++;
  }
  return candidate;
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
  const first = $v('first').trim();
  const last  = $v('last').trim();
  const name  = (first + ' ' + last).trim();
  const email = $v('email').trim().toLowerCase();
  const pass  = $v('password');

  if (!first)  return fail('Informe seu nome.', $('first'));
  if (!emailOk(email)) return fail('Informe um e-mail válido.', $('email'));
  if (pass.length < 8) return fail('A senha precisa ter pelo menos 8 caracteres.', $('password'));

  submit.disabled = true;
  submit.textContent = 'Criando…';

  // Modo demo (Firebase indisponível)
  if (!window._fbInitDone) {
    const user = email.split('@')[0].replace(/[^a-z0-9_]/gi, '') || 'user';
    const accs = JSON.parse(localStorage.getItem('md_acc') || '{}');
    if (accs[user]) { fail('Já existe uma conta com este e-mail.', $('email')); submit.disabled = false; submit.textContent = 'Criar conta'; return; }
    const salt     = _demoGenSalt();
    const passHash = await _demoHashPass(pass, salt);
    accs[user] = { username: user, name, role: '', email, passHash, salt };
    localStorage.setItem('md_acc', JSON.stringify(accs));
    goToApp({ uid: 'demo_' + user, username: user, name, role: '', email });
    return;
  }

  try {
    await loadFirebase();
    const auth = getAuth();

    let cred;
    try {
      cred = await auth.createUserWithEmailAndPassword(email, pass);
    } catch (e) {
      fail(authErrMsg(e.code), $('email'));
      submit.disabled = false; submit.textContent = 'Criar conta';
      return;
    }

    const uid = cred.user.uid;
    const user = await deriveUsername(email);
    await cred.user.updateProfile({ displayName: user }).catch(() => {});

    let claimed = false;
    try {
      const tx = await _db.ref('usernames/' + user).transaction(val => {
        if (val === null) return uid;
        if (val === uid)  return uid;
        return undefined;
      });
      claimed = tx.committed;
    } catch (_) { claimed = false; }

    const profile = { name, role: '', email, uid, username: claimed ? user : uid };
    await _db.ref().update({
      ['uids/' + uid]:                          claimed ? user : uid,
      ['users/' + uid + '/profile']:            profile,
      ['users/' + (claimed ? user : uid) + '/profile']: profile,
    }).catch(async () => {
      await fbSet('uids/' + uid, claimed ? user : uid).catch(() => {});
      await fbSet('users/' + uid + '/profile', profile).catch(() => {});
      await fbSet('users/' + (claimed ? user : uid) + '/profile', profile).catch(() => {});
    });

    goToApp({ uid, username: profile.username, name, role: '', email });

  } catch (e) {
    console.error('Register error:', e);
    fail(authErrMsg(e.code));
    submit.disabled = false; submit.textContent = 'Criar conta';
  }
}

/* ── Login ── */
async function doLogin() {
  const email = $v('email').trim().toLowerCase();
  const pass  = $v('password');

  if (!emailOk(email)) return fail('Informe um e-mail válido.', $('email'));
  if (!pass) return fail('Informe sua senha.', $('password'));

  submit.disabled = true;
  submit.textContent = 'Entrando…';

  // Modo demo
  if (!window._fbInitDone) {
    const accs = JSON.parse(localStorage.getItem('md_acc') || '{}');
    const acc = Object.values(accs).find(a => a.email === email);
    if (acc) {
      const match = acc.passHash === await _demoHashPass(pass, acc.salt);
      if (!match) {
        fail('Senha incorreta.', $('password'));
        submit.disabled = false; submit.textContent = 'Entrar';
        return;
      }
      goToApp({ uid: 'demo_' + acc.username, username: acc.username, name: acc.name, role: acc.role || '', email });
    } else {
      const username = email.split('@')[0].replace(/[^a-z0-9_]/gi, '') || 'demo';
      const salt     = _demoGenSalt();
      const passHash = await _demoHashPass(pass, salt);
      accs[username] = { username, name: username, role: '', email, passHash, salt };
      localStorage.setItem('md_acc', JSON.stringify(accs));
      goToApp({ uid: 'demo_' + username, username, name: username, role: '', email });
    }
    return;
  }

  try {
    await loadFirebase();
    const auth = getAuth();
    const cred = await auth.signInWithEmailAndPassword(email, pass);
    goToApp({ uid: cred.user.uid, email });
  } catch (e) {
    console.error('Login error:', e.code, e.message);
    fail(authErrMsg(e.code));
    submit.disabled = false; submit.textContent = 'Entrar';
  }
}

/* ── Login com Google ── */
async function doGoogleLogin() {
  if (!window._fbInitDone) { return fail('Firebase não carregado.'); }
  const auth = getAuth();
  if (!auth) { return fail('Autenticação não disponível.'); }

  const btn = $('btn-google');
  btn.disabled = true; btn.style.opacity = '.6';

  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const cred = await auth.signInWithPopup(provider);
    const user = cred.user;

    await loadFirebase();
    let username = await fbGet('uids/' + user.uid).catch(() => null);

    if (!username) {
      const displayName = user.displayName || (user.email || '').split('@')[0];
      username = await deriveUsername(user.email || user.uid);
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
  } catch (e) {
    btn.disabled = false; btn.style.opacity = '';
    if (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request') return;
    console.error('Google login error:', e);
    fail('Erro ao entrar com Google: ' + (e.message || e.code));
  }
}

/* ── submit do formulário ── */
form.addEventListener('submit', e => {
  e.preventDefault();
  clearErrors();
  if (mode === 'signup') doRegister(); else doLogin();
});

$('btn-google').addEventListener('click', doGoogleLogin);
$('btn-apple').addEventListener('click', () => fail('Login com Apple em breve por aqui — use e-mail ou Google por enquanto.'));
$('close').addEventListener('click', () => window.location.assign('landing.html'));
addEventListener('keydown', e => { if (e.key === 'Escape') $('close').click(); });

/* ── Guard: se já autenticado, ir direto para o app ── */
window.addEventListener('DOMContentLoaded', () => {
  const sess = localStorage.getItem('md_sess_demo');
  if (sess) {
    try { const u = JSON.parse(sess); if (u?.username) { window.location.href = 'index.html'; return; } }
    catch (_) {}
  }
  if (window._fbInitDone && window._fbAuth) {
    window._fbAuth.onAuthStateChanged(user => { if (user) window.location.href = 'index.html'; });
  }

  if (new URLSearchParams(location.search).get('mode') === 'signin') setMode('signin');
});
