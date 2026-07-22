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

/* ── Mapeamento de erros Firebase ── */
function authErrMsg(code, fallback) {
  const map = {
    'auth/email-already-in-use':   'Este e-mail já está cadastrado.',
    'auth/invalid-email':           'E-mail inválido.',
    'auth/weak-password':           'Senha muito fraca. Use pelo menos 8 caracteres.',
    'auth/user-not-found':          'E-mail não encontrado.',
    'auth/wrong-password':          'Senha incorreta.',
    'auth/invalid-credential':      'E-mail ou senha incorretos.',
    'auth/too-many-requests':       'Muitas tentativas. Tente novamente mais tarde.',
    'auth/network-request-failed':  'Sem conexão com a internet.',
    'auth/user-disabled':           'Esta conta foi desativada.',
    'auth/operation-not-allowed':   'Registro desativado. Contate o administrador.',
    'auth/configuration-not-found': 'Firebase não configurado corretamente.',
  };
  return map[code] || fallback || 'Erro ao autenticar. Tente novamente.';
}

/* ── Hash de senha para modo demo ── */
async function _demoHashPass(pass) {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest('SHA-256', enc.encode('mydesk-demo-v1:' + pass));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/* ── Redirecionar para o app após login ── */
function goToApp(userData) {
  // Salvar sessão demo se necessário
  if (userData && userData.uid.startsWith('demo_')) {
    localStorage.setItem('md_sess_demo', JSON.stringify(userData));
  }
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
    const passHash = await _demoHashPass(pass);
    accs[user] = { username: user, name, role, email, passHash };
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
    showErr('reg-err', e.message || authErrMsg(e.code));
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
      const inputHash = await _demoHashPass(pass);
      const match = acc.passHash ? (acc.passHash === inputHash) : (acc.passDemo === pass);
      if (!match) {
        showErr('login-err', 'Senha incorreta.');
        btn.textContent = 'Entrar →'; btn.disabled = false;
        return;
      }
      if (!acc.passHash) {
        acc.passHash = inputHash; delete acc.passDemo;
        localStorage.setItem('md_acc', JSON.stringify(accs));
      }
      goToApp({ uid: 'demo_' + acc.username, username: acc.username, name: acc.name, role: acc.role || '', email });
    } else {
      const passHash = await _demoHashPass(pass);
      const newAcc = { username, name: username, role: '', email, passHash };
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
    const uid  = cred.user.uid;

    let username = null;
    try { username = await fbGet('uids/' + uid); } catch(_) {}
    if (!username && cred.user.displayName) username = cred.user.displayName;
    if (!username) {
      try { const p = await fbGet('users/' + uid + '/profile'); if (p?.username) username = p.username; } catch(_) {}
    }
    if (!username) throw { code: 'auth/user-not-found' };

    let profile = {};
    try { profile = await fbGet('users/' + uid + '/profile') || {}; } catch(_) {}
    if (!profile.name) {
      try { profile = await fbGet('users/' + username + '/profile') || {}; } catch(_) {}
    }

    goToApp({ uid, username, name: profile.name || username, role: profile.role || '', email });

  } catch(e) {
    console.error('Login error:', e.code, e.message);
    showErr('login-err', authErrMsg(e.code, e.message));
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

  // Enter key para submeter
  document.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    if ($('form-login') && $('form-login').style.display !== 'none') doLogin();
    else doRegister();
  });
});
