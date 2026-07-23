
'use strict';

/* ═══════════════════════════════════════════════════
   PALETA DE CORES DAS NOTAS
   20 temas: cor do card, borda, header e chip
═══════════════════════════════════════════════════ */
const PAL = {
  indigo:  {bar:'#6366f1',bg:'#0f1029',chip:'rgba(99,102,241,.18)',dot:'#818cf8',label:'Índigo'},
  violet:  {bar:'#8b5cf6',bg:'#160e2a',chip:'rgba(139,92,246,.18)',dot:'#a78bfa',label:'Violeta'},
  fuchsia: {bar:'#d946ef',bg:'#1e0b24',chip:'rgba(217,70,239,.16)',dot:'#e879f9',label:'Fúcsia'},
  rose:    {bar:'#f43f5e',bg:'#1f0710',chip:'rgba(244,63,94,.18)',dot:'#fb7185',label:'Rosa'},
  red:     {bar:'#ef4444',bg:'#1a0606',chip:'rgba(239,68,68,.16)',dot:'#f87171',label:'Vermelho'},
  orange:  {bar:'#f97316',bg:'#1e0e04',chip:'rgba(249,115,22,.16)',dot:'#fb923c',label:'Laranja'},
  amber:   {bar:'#f59e0b',bg:'#1e1504',chip:'rgba(245,158,11,.16)',dot:'#fbbf24',label:'Âmbar'},
  gold:    {bar:'#ca8a04',bg:'#1a1302',chip:'rgba(202,138,4,.16)',dot:'#eab308',label:'Ouro'},
  lime:    {bar:'#84cc16',bg:'#0e1a02',chip:'rgba(132,204,22,.14)',dot:'#a3e635',label:'Lima'},
  emerald: {bar:'#10b981',bg:'#071a10',chip:'rgba(16,185,129,.18)',dot:'#34d399',label:'Esmeralda'},
  teal:    {bar:'#14b8a6',bg:'#051816',chip:'rgba(20,184,166,.14)',dot:'#2dd4bf',label:'Teal'},
  cyan:    {bar:'#06b6d4',bg:'#04161e',chip:'rgba(6,182,212,.14)',dot:'#22d3ee',label:'Ciano'},
  sky:     {bar:'#0ea5e9',bg:'#051624',chip:'rgba(14,165,233,.16)',dot:'#38bdf8',label:'Céu'},
  blue:    {bar:'#3b82f6',bg:'#081020',chip:'rgba(59,130,246,.16)',dot:'#60a5fa',label:'Azul'},
  slate:   {bar:'#64748b',bg:'#0e1318',chip:'rgba(148,163,184,.12)',dot:'#94a3b8',label:'Cinza'},
  pink:    {bar:'#ec4899',bg:'#1e0616',chip:'rgba(236,72,153,.16)',dot:'#f472b6',label:'Pink'},
  white:   {bar:'#e2e8f0',bg:'#18191e',chip:'rgba(226,232,240,.1)',dot:'#e2e8f0',label:'Branco'},
  black:   {bar:'#374151',bg:'#0a0a0c',chip:'rgba(55,65,81,.2)',dot:'#6b7280',label:'Preto'},
  golden:  {bar:'#eab308',bg:'#1a1600',chip:'rgba(234,179,8,.18)',dot:'#fde047',label:'Amarelo'},
};
const PKEYS = Object.keys(PAL);

/* ═══════════════════════════════════════════════════
   ESTADO GLOBAL DA APLICAÇÃO
   Variáveis compartilhadas por todo o sistema
═══════════════════════════════════════════════════ */
let CU     = null;
let notes  = [];
let zTop   = 10;
let selClr = 'indigo';
let drag   = null;
let remTmr = null;

// Password helpers — btoa/atob break on non-ASCII, so we use 4-digit hex encoding
function strToHex(s) {
  return Array.from(s).map(c => c.charCodeAt(0).toString(16).padStart(4,'0')).join('');
}
/* ═══════════════════════════════════════════════════════
   FIREBASE AUTH — login/register/logout
   CU = { uid, username, name, role, email }
═══════════════════════════════════════════════════════ */

function switchTab(t) {
  $('form-login').style.display = t === 'login' ? 'block' : 'none';
  $('form-reg').style.display   = t === 'reg'   ? 'block' : 'none';
  $('tab-login').classList.toggle('active', t === 'login');
  $('tab-reg').classList.toggle('active',   t === 'reg');
  $('login-err').textContent = '';
  $('reg-err').textContent   = '';
}

let _auth = null; // firebase.auth() instance

// Map Firebase error codes to friendly PT-BR / EN messages, picked by the
// user's detected language (T / LANGS, see detectLanguage() below).
// Never falls back to e.message — that's the raw Firebase SDK string
// (e.g. "Firebase: Error (auth/invalid-login-credentials).") and must
// never reach the UI untranslated.
const AUTH_ERR = {
  pt: {
    'auth/email-already-in-use':      'Este e-mail já está cadastrado.',
    'auth/invalid-email':             'E-mail inválido.',
    'auth/weak-password':             'Senha muito fraca. Use pelo menos 6 caracteres.',
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
    'auth/weak-password':             'Password too weak. Use at least 6 characters.',
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

function authErrMsg(code) {
  const langKey = Object.keys(LANGS).find(k => LANGS[k] === T);
  const dict = AUTH_ERR[langKey] || AUTH_ERR.en;
  return dict[code] || dict.default;
}

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
  if (pass.length < 8 || !/[A-Za-z]/.test(pass) || !/[0-9]/.test(pass)) return showErr('reg-err', 'Senha deve ter ao menos 8 caracteres com letras e números.');
  if (pass !== pass2) return showErr('reg-err', 'As senhas não coincidem.');

  const btn = $('btn-register');
  btn.textContent = 'Criando…'; btn.disabled = true;

  // Demo mode
  if (!window._fbInitDone) {
    const accs = JSON.parse(localStorage.getItem('md_acc') || '{}');
    if (accs[user]) { showErr('reg-err', 'Usuário já existe.'); btn.textContent = 'Criar conta →'; btn.disabled = false; return; }
    const salt     = _demoGenSalt();
    const passHash = await _demoHashPass(pass, salt);
    accs[user] = { username: user, name, role, email, passHash, salt };
    localStorage.setItem('md_acc', JSON.stringify(accs));
    CU = { uid: 'demo_' + user, username: user, name, role, email };
    btn.textContent = 'Criar conta →'; btn.disabled = false;
    launchApp(); return;
  }

  try {
    await loadFirebase();
    const auth = getAuth();

    // 1. Check username availability FIRST — before creating any account
    // /usernames has .read: true so this works without auth
    let existing = null;
    try { existing = await fbGet('usernames/' + user); } catch(_) {}
    if (existing) {
      showErr('reg-err', 'Este nome de usuário já está em uso.');
      btn.textContent = 'Criar conta →'; btn.disabled = false;
      return;
    }

    // 2. Block onAuthStateChanged from auto-launching while we finish setup
    window._registering = true;

    // 3. Create Firebase Auth account
    let cred;
    try {
      cred = await auth.createUserWithEmailAndPassword(email, pass);
    } catch(e) {
      window._registering = false;
      showErr('reg-err', authErrMsg(e.code));
      btn.textContent = 'Criar conta →'; btn.disabled = false;
      return;
    }

    const uid = cred.user.uid;
    await cred.user.updateProfile({ displayName: user }).catch(() => {});

    // 4. Claim username atomically — prevents race condition between step 1 and 3
    // If two users checked simultaneously and both got null, only one can commit here
    let claimed = false;
    try {
      const txResult = await _db.ref('usernames/' + user).transaction(currentVal => {
        if (currentVal === null) return uid;       // free — claim it
        if (currentVal === uid)  return uid;       // already ours
        return undefined;                          // taken — abort
      });
      claimed = txResult.committed;
    } catch(e) {
      claimed = false;
    }

    if (!claimed) {
      // Race condition: someone registered this username between steps 1 and 4
      await cred.user.delete().catch(() => {});
      window._registering = false;
      showErr('reg-err', 'Este nome de usuário foi registrado por outra pessoa. Tente outro.');
      btn.textContent = 'Criar conta →'; btn.disabled = false;
      return;
    }

    // 5. Write remaining profile data
    const profile = { name, role: role || '', email, uid, username: user };
    try {
      await _db.ref().update({
        ['uids/' + uid]:                user,
        ['users/' + uid + '/profile']:  profile,
        ['users/' + user + '/profile']: profile,
      });
    } catch(e) {
      try { await _db.ref('uids/' + uid).set(user); } catch(_) {}
      try { await _db.ref('users/' + uid + '/profile').set(profile); } catch(_) {}
      try { await _db.ref('users/' + user + '/profile').set(profile); } catch(_) {}
    }

    // 6. Launch app manually — bypass onAuthStateChanged
    window._registering = false;

    CU = { uid, username: user, name, role, email };
    btn.textContent = 'Criar conta →'; btn.disabled = false;
    launchApp();

  } catch(e) {
    console.error('Register error:', e);
    showErr('reg-err', authErrMsg(e.code));
    btn.textContent = 'Criar conta →'; btn.disabled = false;
  }
}

async function doLogin() {
  const email = $v('l-email').trim().toLowerCase();
  const pass  = $v('l-pass');

  if (!email) return showErr('login-err', 'Informe seu e-mail.');
  if (!pass)  return showErr('login-err', 'Informe sua senha.');

  const btn = $('btn-login');
  btn.textContent = 'Entrando…'; btn.disabled = true;

  // Demo mode: Firebase not available (sandbox/preview)
  if (!window._fbInitDone) {
    const username = email.split('@')[0].replace(/[^a-z0-9_]/gi, '') || 'demo';
    const accs = JSON.parse(localStorage.getItem('md_acc') || '{}');
    // Find account by email
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
      CU = { uid: 'demo_' + acc.username, username: acc.username, name: acc.name, role: acc.role || '', email };
    } else {
      // Auto-create demo account on first login attempt
      const newUser = username;
      const salt     = _demoGenSalt();
      const passHash = await _demoHashPass(pass, salt);
      const newAcc = { username: newUser, name: newUser, role: '', email, passHash, salt };
      accs[newUser] = newAcc;
      localStorage.setItem('md_acc', JSON.stringify(accs));
      CU = { uid: 'demo_' + newUser, username: newUser, name: newUser, role: '', email };
    }
    btn.textContent = 'Entrar →'; btn.disabled = false;
    launchApp(); return;
  }

  try {
    await loadFirebase();
    const auth = getAuth();
    const cred = await auth.signInWithEmailAndPassword(email, pass);
    const uid  = cred.user.uid;

    // Get username — try multiple sources
    let username = null;

    // Source 1: /uids/{uid} mapping
    try { username = await fbGet('uids/' + uid); } catch(_) {}

    // Source 2: Firebase Auth displayName (always available)
    if (!username && cred.user.displayName) {
      username = cred.user.displayName;
    }

    // Source 3: profile stored under uid
    if (!username) {
      try {
        const p = await fbGet('users/' + uid + '/profile');
        if (p?.username) username = p.username;
      } catch(_) {}
    }

    if (!username) {
      throw { code: 'auth/user-not-found' };
    }

    // Get profile — uid path is source of truth (always written on name change)
    let profile = {};
    try { profile = await fbGet('users/' + uid + '/profile') || {}; } catch(_) {}
    if (!profile.name) {
      try { profile = await fbGet('users/' + username + '/profile') || {}; } catch(_) {}
    }
    // Sync username path if it has stale data
    if (profile.name && _fbReady) {
      fbGet('users/' + username + '/profile').then(up => {
        if (!up || up.name !== profile.name) {
          fbSet('users/' + username + '/profile', profile).catch(() => {});
        }
      }).catch(() => {});
    }

    CU = { uid, username, name: profile.name || username, role: profile.role || '', email };
    btn.textContent = 'Entrar →'; btn.disabled = false;
    launchApp();
  } catch(e) {
    console.error('Login error:', e.code, e.message);
    showErr('login-err', authErrMsg(e.code));
    btn.textContent = 'Entrar →'; btn.disabled = false;
  }
}

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

    // Check if this Google account already has a profile in DB
    await loadFirebase();
    let username = await fbGet('uids/' + user.uid).catch(() => null);

    if (!username) {
      // New Google user — create profile using email prefix as username candidate
      const emailPrefix = (user.email || '').split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 20);
      const displayName = user.displayName || emailPrefix;

      // Find unique username
      let candidate = emailPrefix;
      let attempts = 0;
      while (attempts < 5) {
        const taken = await fbGet('usernames/' + candidate).catch(() => null);
        if (!taken) break;
        candidate = emailPrefix + Math.floor(Math.random() * 9000 + 1000);
        attempts++;
      }
      username = candidate;

      // Write username mapping
      await fbSet('usernames/' + username, user.uid);
      await fbSet('uids/' + user.uid, username);

      // Write profile (use Google photo if available)
      const profile = {
        name:     displayName,
        role:     '',
        email:    user.email || '',
        uid:      user.uid,
        username: username,
        photo:    user.photoURL || null,
      };
      await fbSet('users/' + user.uid + '/profile', profile);
      await fbSet('users/' + username + '/profile', profile);

      CU = { uid: user.uid, username, name: displayName, role: '', email: user.email || '' };
    } else {
      // Returning Google user — load profile
      let profile = await fbGet('users/' + user.uid + '/profile').catch(() => null)
                 || await fbGet('users/' + username + '/profile').catch(() => null)
                 || {};
      CU = { uid: user.uid, username, name: profile.name || username, role: profile.role || '', email: user.email || '' };
    }

    if (btn) { btn.disabled = false; btn.innerHTML = originalText; btn.style.opacity = ''; }
    launchApp();

  } catch(e) {
    if (btn) { btn.disabled = false; btn.innerHTML = originalText; btn.style.opacity = ''; }
    if (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request') return;
    console.error('Google login error:', e);
    const errEl = document.getElementById('login-err') || document.getElementById('reg-err');
    showErr(errEl?.id || 'login-err', 'Erro ao entrar com Google: ' + (e.message || e.code));
  }
}

async function doForgotPassword() {
  const email = $v('l-email').trim();
  if (!email) return showErr('login-err', 'Informe seu e-mail para redefinir a senha.');
  try {
    await getAuth().sendPasswordResetEmail(email);
    showErr('login-err', '✓ E-mail de redefinição enviado! Verifique sua caixa de entrada.');
    document.getElementById('login-err').style.color = '#6ee7b7';
  } catch(e) {
    showErr('login-err', authErrMsg(e.code));
  }
}

/* PBKDF2 com salt aleatório por conta — evita que um único rainbow table
   sirva pra todas as contas. _demoHashPassLegacy fica só pra migrar contas
   antigas (hash SHA-256 com "sal" fixo, igual pra todo mundo). */
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

// Legacy helpers kept for compatibility (no longer used for auth)
function getAccounts()    { try{return JSON.parse(localStorage.getItem('md_acc')||'{}')}catch{return{}} }
function setAccounts(obj) { localStorage.setItem('md_acc', JSON.stringify(obj)); }
// Session handled by Firebase Auth persistence
            // no-op
function isHashValid(h)   { return false; }

/* ════════════════════════════════════════════════
   LO-FI RADIO PLAYER
   Streams: SomaFM (copyright-free, always online)
════════════════════════════════════════════════ */
const LOFI_STATIONS = [
  {
    name: 'Chill Lofi · SomaFM',
    stream: 'https://ice6.somafm.com/groovesalad-128-mp3',
    meta:   'https://somafm.com/groovesalad/songhistory.json'
  },
  {
    name: 'Deep Space · SomaFM',
    stream: 'https://ice6.somafm.com/deepspaceone-128-mp3',
    meta:   'https://somafm.com/deepspaceone/songhistory.json'
  },
  {
    name: 'Drone Zone · SomaFM',
    stream: 'https://ice6.somafm.com/dronezone-128-mp3',
    meta:   'https://somafm.com/dronezone/songhistory.json'
  },
  {
    name: 'Illinois Street · SomaFM',
    stream: 'https://ice6.somafm.com/illstreet-128-mp3',
    meta:   'https://somafm.com/illstreet/songhistory.json'
  },
];

let _lofiAudio    = null;
let _lofiPlaying  = false;
let _lofiStation  = 0;
let _lofiMetaTmr  = null;

function toggleLofi() {
  if (!_lofiAudio) initLofi();
  if (_lofiPlaying) pauseLofi();
  else              playLofi();
}

function initLofi() {
  _lofiAudio = new Audio();
  _lofiAudio.crossOrigin = 'anonymous';
  _lofiAudio.volume = 0.35;
  _lofiAudio.addEventListener('playing', () => {
    _lofiPlaying = true;
    updateLofiUI();
    startLofiMeta();
  });
  _lofiAudio.addEventListener('pause',   () => { _lofiPlaying = false; updateLofiUI(); });
  _lofiAudio.addEventListener('error',   () => nextLofiStation());
  _lofiAudio.addEventListener('stalled', () => nextLofiStation());
}

function playLofi() {
  if (!_lofiAudio) initLofi();
  const st = LOFI_STATIONS[_lofiStation];
  if (_lofiAudio.src !== st.stream) _lofiAudio.src = st.stream;
  _lofiAudio.play().catch(() => nextLofiStation());
  _lofiPlaying = true;
  updateLofiUI();
  startLofiMeta();
}

function pauseLofi() {
  if (_lofiAudio) _lofiAudio.pause();
  _lofiPlaying = false;
  stopLofiMeta();
  updateLofiUI();
}

function nextLofiStation() {
  _lofiStation = (_lofiStation + 1) % LOFI_STATIONS.length;
  if (_lofiAudio) { _lofiAudio.src = ''; }
  if (_lofiPlaying) setTimeout(playLofi, 500);
}

function updateLofiUI() {
  const btn   = document.getElementById('lofi-btn');
  const icon  = document.getElementById('lofi-icon');
  const label = document.getElementById('lofi-label');
  const track = document.getElementById('lofi-track');
  if (!btn) return;
  if (_lofiPlaying) {
    btn.classList.add('playing');
    icon.textContent  = '▶';
    label.textContent = LOFI_STATIONS[_lofiStation].name.split('·')[0].trim();
    track.style.display = 'inline';
  } else {
    btn.classList.remove('playing');
    icon.textContent  = '🎵';
    label.textContent = 'Lo-Fi';
    track.style.display = 'none';
    track.textContent   = '';
  }
}

function startLofiMeta() {
  stopLofiMeta();
  fetchLofiMeta();
  _lofiMetaTmr = setInterval(fetchLofiMeta, 20000);
}

function stopLofiMeta() {
  if (_lofiMetaTmr) { clearInterval(_lofiMetaTmr); _lofiMetaTmr = null; }
}

async function fetchLofiMeta() {
  const st = LOFI_STATIONS[_lofiStation];
  const track = document.getElementById('lofi-track');
  if (!track) return;
  try {
    const r = await fetch(st.meta);
    const d = await r.json();
    const song = d.songs?.[0];
    if (song) {
      const title = [song.artist, song.title].filter(Boolean).join(' — ');
      track.textContent = title || st.name;
    }
  } catch {
    track.textContent = st.name;
  }
}

/* ═══════════════════════════════════════════════════
   INICIALIZAÇÃO DO APP
   Chamado após login bem-sucedido
═══════════════════════════════════════════════════ */
async function launchApp() {
  if (window._appLaunched) return; // prevent double-launch (onAuthStateChanged + doLogin)
  window._appLaunched = true;

  _loadIcsEvents();
  _loadOutlookCache();
  _handleOutlookRedirect();

  // Check if returning from payment confirmation
  if (window.location.search.includes('premium=activated')) {
    setTimeout(() => {
      toast('⭐', 'Pagamento detectado! Aguarde a confirmação (pode levar até 1 min).');
      // Reload plan after 5s to pick up Firebase update from webhook
      setTimeout(async () => {
        await loadUserPlan();
        if (isPremium()) {
          toast('🎉', 'Premium ativado com sucesso!');
        } else {
          toast('⏳', 'Ativação em processamento. Atualiza a página em alguns instantes.');
        }
      }, 5000);
    }, 1500);
    // Clean URL
    window.history.replaceState({}, '', window.location.pathname);
  }
  // Clear demo localStorage if using real Firebase account (prevent ghost data)
  if (CU && CU.uid && !CU.uid.startsWith('demo_')) {
    localStorage.removeItem('md_sess_demo');
    // Remove any demo notes cache for this username — Firebase is source of truth
    localStorage.removeItem('md_n_' + CU.username);
  }
  const as = $('auth-screen');
  if (as) { as.classList.remove('landing-scroll'); as.style.display = 'none'; as.scrollTop = 0; }
  $('toolbar').style.display = 'flex';
  $('board').style.display   = 'block';

  const label = CU.role ? CU.name + ' · ' + CU.role : CU.name;
  $('t-user-label').textContent = label;

  // Exibir botão admin apenas para administradores
  const adminBtn = document.getElementById('btn-admin');
  if (adminBtn) adminBtn.style.display = window.authState?.isAdmin ? 'flex' : 'none';

  notes = []; zTop = 10;
  document.querySelectorAll('.note').forEach(e => e.remove());
  _soundReady = false;
  setTimeout(() => { _soundReady = true; }, 3000);
  buildMColors();
  loadWallpaper();
  initSocialChannel();
  startOnlineHeartbeat();
  loadUserPlan(); // load plan & usage counter
  updateSocialBadge();

  if (typeof FB_CONFIG !== 'undefined' && FB_CONFIG.apiKey.includes('DEMO_REPLACE')) {
    document.getElementById('fb-setup-banner').classList.add('show');
  }

  // Load notes from Firebase (or localStorage fallback)
  const rawNotes = await loadNotesRaw(CU.username);
  rawNotes.forEach(r => {
    if (r.type === 'client' || String(r.id || '').startsWith('crm_')) return; // skip CRM records
    const n = {
      id:r.id, color:r.color, title:r.title, body:r.body,
      start:r.start, end:r.end, reminder:r.reminder, remDays:r.remDays,
      status:r.status||'todo',
      titleH:r.titleH||0, bodyH:r.bodyH||0,
      w:r.w||0, h:r.h||0,
      x:r.x, y:r.y, z:r.z, files:r.files||[],
      stackId:r.stackId||null, stackOrder:r.stackOrder||0, pinned:r.pinned||false,
      _isClientNote: r._isClientNote || false,
      _crmRecordId:  r._crmRecordId  || null
    };
    if (n.z > zTop) zTop = n.z;
    notes.push(n); mountNote(n);
  });
  syncCount();
  startRemCheck();
  // Restore stacks
  const stackIds = [...new Set(notes.filter(n => n.stackId).map(n => n.stackId))];
  setTimeout(() => stackIds.forEach(sid => renderStack(sid)), 0);

  // ── Real-time personal notes listener (content sync across devices) ──
  if (_fbReady && CU.uid && !CU.uid.startsWith('demo_')) {
    _db.ref('users/' + CU.uid + '/notes').on('child_changed', snap => {
      if (_activeWs || _activeGroupWs) return; // only personal board
      const r = snap.val();
      if (!r?.id) return;
      const n = notes.find(n => n.id === r.id);
      if (!n) return;
      const el = document.querySelector('.note[data-id="' + n.id + '"]');
      if (!el) return;
      const ta1 = el.querySelector('.n-title');
      const ta2 = el.querySelector('.n-text');
      if (ta1 && document.activeElement !== ta1 && r.title !== undefined) { n.title = r.title; ta1.value = r.title; }
      if (ta2 && document.activeElement !== ta2 && r.body  !== undefined) { n.body  = r.body;  ta2.value = r.body; }
      if (r.status && r.status !== n.status) { n.status = r.status; applyNoteStatus(el, r.status); }
      if (r.color  && r.color  !== n.color)  { n.color  = r.color; }
    });
    _db.ref('users/' + CU.uid + '/notes').on('child_removed', snap => {
      if (_activeWs || _activeGroupWs) return;
      const r = snap.val();
      if (!r?.id) return;
      const idx = notes.findIndex(n => n.id === r.id);
      if (idx === -1) return;
      notes.splice(idx, 1);
      document.querySelector('.note[data-id="' + r.id + '"]')?.remove();
      syncCount();
    });
    _db.ref('users/' + CU.uid + '/notes').on('child_added', snap => {
      if (_activeWs || _activeGroupWs) return;
      const r = snap.val();
      if (!r?.id || notes.find(n => n.id === r.id)) return;
      const n = { id:r.id, color:r.color||'indigo', title:r.title||'', body:r.body||'',
        start:r.start||'', end:r.end||'', reminder:r.reminder||false, remDays:r.remDays||3,
        status:r.status||'todo', titleH:r.titleH||0, bodyH:r.bodyH||0,
        w:r.w||0, h:r.h||0, x:r.x||100, y:r.y||100, z:r.z||++zTop,
        files:[], stackId:r.stackId||null, stackOrder:r.stackOrder||0, pinned:r.pinned||false,
        _isClientNote: r._isClientNote || false,
        _crmRecordId:  r._crmRecordId  || null };
      if (n.z > zTop) zTop = n.z;
      notes.push(n); mountNote(n); syncCount();
    });
  }
}

/* ═══════════════════════════════════════════════════
   LOGOUT
   Síncrono — limpa estado, para listeners, volta ao login
═══════════════════════════════════════════════════ */
function doLogout() {
  stopPixelAnimation();
  _hideRestoreBtn();
  _activePersonalWs = null;
  _userPlan = null;
  _planLoaded = false;
  document.getElementById('t-plan-badge')?.remove();
  document.getElementById('pw-panel')?.classList.remove('open');
  _pwPanelOpen = false;
  const lastUser = CU ? CU.username : '';

  // stop timers & clear state
  stopRemCheck();
  stopOnlineHeartbeat();
  resetSocialState();
  if (_wsListener) { _wsListener.off(); _wsListener = null; }
  _activeWs = null;
  const wsBtn = document.getElementById('ws-toolbar-btn');
  if (wsBtn) { wsBtn.innerHTML = ''; wsBtn.style.display = 'none'; }
  openChats.forEach((_, friend) => closeChatWin(friend));
  socialOpen = false;
  const sp = document.getElementById('social-panel');
  if (sp) sp.classList.remove('open');
  closeAllViewers();
  notes = []; zTop = 10; CU = null;
  window._appLaunched = false; // allow re-launch on next login

  // remove notes from DOM
  document.querySelectorAll('.note').forEach(e => e.remove());

  // clear session key
  // Sign out
  localStorage.removeItem('md_sess_demo');
  try { if (getAuth()) getAuth().signOut(); } catch(_) {}

  // swap UI panels — index.html no longer has an inline auth-screen,
  // so logging out always sends the user back to the landing page
  $('toolbar').style.display = 'none';
  $('board').style.display   = 'none';
  window.location.replace('landing.html');
}

/* ═══════════════════════════════════════════════════
   MODAL DE CRIAÇÃO DE NOTA
   Formulário: título, corpo, datas, cor, lembrete
═══════════════════════════════════════════════════ */
function buildMColors() {
  const row = $('m-colors'); row.innerHTML = '';
  PKEYS.forEach(k => {
    const p = PAL[k], d = document.createElement('div');
    d.className = 'm-sw' + (k === selClr ? ' sel' : '');
    d.style.background = p.bar; d.title = p.label;
    d.addEventListener('click', () => {
      selClr = k;
      row.querySelectorAll('.m-sw').forEach(s => s.classList.remove('sel'));
      d.classList.add('sel');
    });
    row.appendChild(d);
  });
}

function openModal() {
  buildMColors();
  // Reset personal form
  ['m-title','m-body','m-start','m-end'].forEach(id => { const el = $(id); if(el) el.value = ''; });
  const rc = $('m-rem-chk'); if(rc) rc.checked = false;
  const rd = $('m-rem-days'); if(rd) rd.value = '3';
  const rs = $('m-rem-sub'); if(rs) { rs.style.opacity='.3'; rs.style.pointerEvents='none'; }
  // Reset client form
  ['mc-name','mc-desc','mc-value','mc-due'].forEach(id => { const el = $(id); if(el) el.value = ''; });
  // Reset status to pending
  const srow = document.getElementById('mc-status-row');
  if (srow) {
    srow.querySelectorAll('.crm-status-opt').forEach(o => o.classList.remove('sel-paid','sel-pending'));
    const p = srow.querySelector('[data-status="pending"]');
    if (p) p.classList.add('sel-pending');
  }
  // Build client form colors
  _buildClientModalColors();
  // Show type picker
  _showModalPanel('type-picker');
  $('modal').style.display = 'flex';
}

function closeModal() {
  $('modal').style.display = 'none';
}

function pickNoteType(type) {
  if (type === 'personal') {
    _showModalPanel('personal');
    setTimeout(() => { const el = $('m-title'); if(el) el.focus(); }, 60);
  } else {
    _showModalPanel('client');
    setTimeout(() => { const el = $('mc-name'); if(el) el.focus(); }, 60);
  }
}

function backToTypePicker() {
  _showModalPanel('type-picker');
}

function _showModalPanel(name) {
  // name: 'type-picker' | 'personal' | 'client'
  document.getElementById('modal-type-picker').style.display = name === 'type-picker' ? 'block' : 'none';
  document.getElementById('modal-personal').style.display    = name === 'personal'    ? 'block' : 'none';
  document.getElementById('modal-client').style.display      = name === 'client'      ? 'block' : 'none';
}

// Build color swatches for client modal (separate grid from personal)
function _buildClientModalColors() {
  const grid = document.getElementById('mc-colors');
  if (!grid || grid.dataset.built) return;
  grid.dataset.built = '1';
  PKEYS.forEach(k => {
    const p = PAL[k];
    const sw = document.createElement('div');
    sw.className = 'm-sw' + (k === selClr ? ' sel' : '');
    sw.style.background = p.bar;
    sw.dataset.clr = k;
    sw.title = p.label;
    sw.onclick = () => {
      grid.querySelectorAll('.m-sw').forEach(s => s.classList.remove('sel'));
      sw.classList.add('sel');
    };
    grid.appendChild(sw);
  });
}

// Get selected color from client modal
function _getClientModalColor() {
  const grid = document.getElementById('mc-colors');
  if (!grid) return selClr;
  const sel = grid.querySelector('.m-sw.sel');
  return sel ? sel.dataset.clr : selClr;
}

/* ─────────────────────────────────────────────────────
   CRIAR NOTA DE CLIENTE — cria nota no board E registro
   no CRM ao mesmo tempo, com sincronização bidirecional
───────────────────────────────────────────────────── */
async function createClientNote() {
  const name  = ($('mc-name')?.value || '').trim();
  const desc  = ($('mc-desc')?.value || '').trim();
  const value = parseFloat($('mc-value')?.value) || 0;
  const due   = $('mc-due')?.value || '';
  const srow  = document.getElementById('mc-status-row');
  const sSel  = srow?.querySelector('.crm-status-opt.sel-paid, .crm-status-opt.sel-pending');
  const status = sSel ? sSel.dataset.status : 'pending';
  const color  = _getClientModalColor();

  if (!name) {
    const inp = $('mc-name');
    if (inp) { inp.style.borderColor='var(--clr-danger)'; inp.focus(); }
    return;
  }

  // Hard limit check BEFORE closing modal or doing anything
  const check = _crmCanCreate();
  if (!check.ok) {
    toast('🔒', 'Limite de ' + check.limit + ' itens atingido. Faça upgrade!');
    if (typeof showPremiumModal === 'function') showPremiumModal();
    return;  // Modal permanece aberto, nada é criado
  }

  const btn = $('mc-ok');
  if (btn) { btn.textContent = 'Criando…'; btn.disabled = true; }
  closeModal();

  try {
    // 1. Criar o registro CRM
    const rec = await createRecord({ name, description: desc, value, status, dueDate: due, color });
    if (!rec) {
      // createRecord falhou (limite ou erro Firebase)
      if(btn){btn.textContent='Criar cliente';btn.disabled=false;}
      return;
    }

    // Atualização otimista: garante que nome e valor renderizem no card imediatamente
    if (rec && !_records.find(r => r.id === rec.id)) {
      _records.unshift(rec);
    }

    // 2. Criar a nota no board vinculada ao registro CRM
    const noteData = {
      title: name,
      body:  desc, // Corrigido: envia apenas a descrição, sem concatenar o valor
      color, status: 'todo',
      end: due, start: '',
      reminder: false, remDays: 3,
      _crmRecordId:  rec.id,
      _isClientNote: true
    };

    if (typeof addNote === 'function') {
      addNote(noteData);
    }
    
    // Corrigido: Contabiliza a nota de cliente na cota mensal
    if (typeof incrementNoteCounter === 'function') {
      incrementNoteCounter();
    }

    toast('💼', '"' + name + '" adicionado ao board e a Clientes!');
  } catch(e) {
    console.error('createClientNote error:', e);
    toast('❌', 'Erro ao criar. Tente novamente.');
  } finally {
    if (btn) { btn.textContent = 'Criar cliente'; btn.disabled = false; }
  }
}

/* ─────────────────────────────────────────────
   MONTAR NOTA DE CLIENTE — extensão visual
   Adiciona bloco de valor + status na nota
───────────────────────────────────────────── */
function mountClientNoteExtras(noteEl, noteId) {
  const n = notes.find(n => n.id === noteId);
  if (!n || !n._isClientNote) return;
  const recId = n._crmRecordId;
  if (!recId) return;

  // Mark note as client note (wider width via CSS)
  noteEl.classList.add('is-client-note');

  // Evita duplicação
  if (noteEl.querySelector('.n-client-value')) return;

  const bodyInline = noteEl.querySelector('.n-body-inline');
  if (!bodyInline) return;

  const rec = _records.find(r => r.id === recId);
  const val = rec ? rec.value  : 0;
  const dd  = rec ? rec.dueDate: '';
  const ds  = rec ? getRecordDisplayStatus(rec) : 'pending';
  const labels = { paid:'✓ Pago', pending:'⏳ Pendente', overdue:'⚠ Atrasado' };
  const dotColor = ds==='paid' ? 'var(--clr-success)' : ds==='overdue' ? 'var(--clr-danger)' : 'var(--clr-warning)';

  const wrap = document.createElement('div');
  wrap.className = 'n-client-block';
  wrap.dataset.recId = recId;
  wrap.innerHTML = `
    <div style="height:1px;background:rgba(255,255,255,.08);"></div>
    <div class="n-client-value">
      <span class="n-client-val-num ${ds}" id="ncv-${recId}">${fmtBRL(val)}</span>
      <span class="n-client-status-toggle ${ds}" id="ncs-${recId}">
        <span class="n-client-dot" style="background:${dotColor};border-radius:50%;width:5px;height:5px;flex-shrink:0;display:inline-block;"></span>
        ${labels[ds] || labels.pending}
      </span>
    </div>
    ${dd ? `<div class="n-client-due ${ds==='overdue'?'overdue':''}" id="ncd-${recId}">📅 ${new Date(dd+'T12:00:00').toLocaleDateString('pt-BR')}</div>` : ''}
  `;

  const stBtn = wrap.querySelector('.n-client-status-toggle');
  if (stBtn) {
    stBtn.addEventListener('click', e => {
      e.stopPropagation();
      toggleRecordStatus(recId);
    });
  }

  bodyInline.after(wrap);

  // Adicionar chip CRM na chip-row se não existir
  const chipRow = noteEl.querySelector('.n-chip-row');
  if (chipRow && !chipRow.querySelector('.n-crm-chip')) {
    const chip = document.createElement('span');
    chip.className = 'n-crm-chip';
    chip.textContent = '💼 Cliente';
    chip.title = 'Nota de Cliente — sincronizada com CRM';
    const delBtn = chipRow.querySelector('.n-del');
    if (delBtn) chipRow.insertBefore(chip, delBtn);
    else chipRow.appendChild(chip);
  }
}

function updateClientNoteBlock(recId) {
  // Query pelo atributo correto (data-rec-id)
  const block = document.querySelector('.n-client-block[data-rec-id="' + recId + '"]');
  if (!block) return;
  const rec = _records.find(r => r.id === recId);
  if (!rec) return;
  const ds = getRecordDisplayStatus(rec);
  const labels = { paid:'✓ Pago', pending:'⏳ Pendente', overdue:'⚠ Atrasado' };
  const dotColor = ds==='paid' ? 'var(--clr-success)' : ds==='overdue' ? 'var(--clr-danger)' : 'var(--clr-warning)';
  const valEl = document.getElementById('ncv-' + recId);
  const stEl  = document.getElementById('ncs-' + recId);
  if (valEl) { valEl.textContent = fmtBRL(rec.value); valEl.className = 'n-client-val-num ' + ds; }
  if (stEl) {
    stEl.className = 'n-client-status-toggle ' + ds;
    stEl.innerHTML = `<span class="n-client-dot" style="background:${dotColor};border-radius:50%;width:5px;height:5px;flex-shrink:0;display:inline-block;"></span>${labels[ds]||labels.pending}`;
    stEl.onclick = e => { e.stopPropagation(); toggleRecordStatus(recId); };
  }
}

/* ─────────────────────────────────────────────
   APAGAR TUDO — registros CRM
───────────────────────────────────────────── */
function confirmClearAllRecords() {
  if (_records.length === 0) { toast('ℹ', 'Nenhum registro para apagar.'); return; }

  const pop = document.createElement('div');
  pop.className = 'confirm-clear-pop';
  pop.innerHTML = `
    <div class="confirm-clear-card">
      <div class="confirm-clear-icon">🗑</div>
      <div class="confirm-clear-title">Apagar todos os clientes?</div>
      <div class="confirm-clear-desc">Esta ação removerá <strong>${_records.length} registro${_records.length!==1?'s':''}</strong> permanentemente. Não pode ser desfeito.</div>
      <div class="confirm-clear-btns">
        <button class="confirm-clear-cancel" id="ccr-no">Cancelar</button>
        <button class="confirm-clear-ok" id="ccr-yes">Apagar tudo</button>
      </div>
    </div>`;
  document.body.appendChild(pop);
  requestAnimationFrame(() => pop.classList.add('visible'));

  const close = async (doIt) => {
    pop.classList.remove('visible');
    setTimeout(() => pop.remove(), 200);
    if (!doIt) return;
    // Deleta todos em paralelo
    const ids = _records.map(r => r.id);
    await Promise.all(ids.map(id => deleteRecord(id)));
    toast('🗑', ids.length + ' registro' + (ids.length!==1?'s':'') + ' removido' + (ids.length!==1?'s':'') + '.');
  };

  pop.querySelector('#ccr-no').onclick  = () => close(false);
  pop.querySelector('#ccr-yes').onclick = () => close(true);
  pop.addEventListener('click', e => { if (e.target === pop) close(false); });
}

/* ═══════════════════════════════════════════════════════
   SISTEMA DE PLANOS — FREE vs PREMIUM
   Limite: 18 notas criadas/mês para free
   Contador não diminui ao apagar (criação mensal)
   Reset lazy: reseta quando muda o mês
   Pagamento via Pix — ativação manual pelo admin
═══════════════════════════════════════════════════════ */

const PLAN_FREE_LIMIT = 30;

let _userPlan  = null; // { plan, planExpiresAt, notesCreatedThisMonth, lastReset }
let _planLoaded = false;

// ── Load user plan from Firebase ──
async function loadUserPlan() {
  if (!_fbReady || !CU?.uid) return;
  try {
    const snap = await fbGet('users/' + CU.uid + '/plan');
    const ym   = _currentYM();
    if (!snap) {
      _userPlan = { plan: 'free', notesCreatedThisMonth: 0, lastReset: ym };
    } else {
      _userPlan = snap;
      // Lazy reset: if month changed, reset counter
      if (_userPlan.lastReset !== ym) {
        _userPlan.notesCreatedThisMonth = 0;
        _userPlan.lastReset = ym;
        await fbSet('users/' + CU.uid + '/plan', _userPlan).catch(() => {});
      }
    }
    // Check premium expiry
    if (_userPlan.plan === 'premium' && _userPlan.planExpiresAt) {
      if (Date.now() > _userPlan.planExpiresAt) {
        _userPlan.plan = 'free';
        await fbUpdate('users/' + CU.uid + '/plan', { plan: 'free' }).catch(() => {});
      }
    }
    _planLoaded = true;
    _updatePremiumBadge();
  } catch(e) {
    console.warn('loadUserPlan error:', e);
    _userPlan = { plan: 'free', notesCreatedThisMonth: 0, lastReset: _currentYM() };
    _planLoaded = true;
  }
}

function _currentYM() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}

function isPremium() {
  if (window.authState?.isAdmin) return true; // admins ignoram todos os limites de plano
  if (!_userPlan) return false;
  if (_userPlan.plan !== 'premium') return false;
  if (_userPlan.planExpiresAt && Date.now() > _userPlan.planExpiresAt) return false;
  return true;
}

function getNotesUsed() {
  return _userPlan?.notesCreatedThisMonth || 0;
}

// ── Check if can create note ──
async function canCreateNote() {
  if (!_planLoaded) await loadUserPlan();
  if (isPremium()) return { ok: true };

  // Group workspace: check leader's plan
  if (_activeGroupWs) {
    const groupId = _activeGroupWs.groupId;
    try {
      const group = await fbGet('groups/' + groupId);
      const owner = group?.owner;
      if (owner && owner !== CU.username) {
        const ownerUid = await fbGet('usernames/' + owner).catch(() => null);
        if (ownerUid) {
          const ownerPlan = await fbGet('users/' + ownerUid + '/plan').catch(() => null);
          if (ownerPlan?.plan === 'premium' && (!ownerPlan.planExpiresAt || Date.now() <= ownerPlan.planExpiresAt)) {
            return { ok: true }; // leader is premium → unlimited for group
          }
          // Leader is free → check group monthly counter
          const groupUsed = ownerPlan?.groupNotesThisMonth?.[groupId] || 0;
          if (groupUsed >= PLAN_FREE_LIMIT) {
            return { ok: false, reason: 'group', used: groupUsed, limit: PLAN_FREE_LIMIT };
          }
          return { ok: true };
        }
      }
    } catch(e) { /* fallback to personal check */ }
  }

  const used = getNotesUsed() + (_records ? _records.length : 0);
  if (used >= PLAN_FREE_LIMIT) {
    return { ok: false, reason: 'personal', used, limit: PLAN_FREE_LIMIT };
  }
  return { ok: true, used, limit: PLAN_FREE_LIMIT };
}

// ── Increment note counter after creation ──
async function incrementNoteCounter() {
  if (!_fbReady || !CU?.uid || isPremium()) return;
  if (!_userPlan) _userPlan = { plan: 'free', notesCreatedThisMonth: 0, lastReset: _currentYM() };
  _userPlan.notesCreatedThisMonth = (_userPlan.notesCreatedThisMonth || 0) + 1;
  await fbUpdate('users/' + CU.uid + '/plan', {
    notesCreatedThisMonth: _userPlan.notesCreatedThisMonth,
    lastReset: _userPlan.lastReset || _currentYM(),
    plan: _userPlan.plan || 'free',
  }).catch(() => {});
  _updatePremiumBadge();
}

// ── Premium badge on toolbar (shows usage for free users) ──
function _updatePremiumBadge() {
  const pill = document.getElementById('t-pill-ws');
  if (!pill) return;
  let badge = document.getElementById('t-plan-badge');
  if (!badge) {
    badge = document.createElement('span');
    badge.id = 't-plan-badge';
    badge.className = 't-premium-badge';
    badge.addEventListener('click', e => { e.stopPropagation(); showPremiumModal(); });
    pill.parentNode.insertBefore(badge, pill.nextSibling);
  }

  if (isPremium()) {
    badge.innerHTML = '⭐ Premium';
    badge.title = 'Plano Premium ativo';
    badge.style.background = 'linear-gradient(135deg,rgba(245,158,11,.25),rgba(251,191,36,.12))';
    badge.style.borderColor = 'rgba(245,158,11,.45)';
  } else {
    const used  = getNotesUsed();
    const left  = Math.max(0, PLAN_FREE_LIMIT - used);
    const pct   = Math.min(100, Math.round(used / PLAN_FREE_LIMIT * 100));
    badge.innerHTML = used >= PLAN_FREE_LIMIT
      ? '🔒 Limite atingido'
      : `📝 ${used}/${PLAN_FREE_LIMIT}`;
    badge.title = `${used} de ${PLAN_FREE_LIMIT} notas usadas este mês`;
    badge.style.background = used >= PLAN_FREE_LIMIT
      ? 'rgba(239,68,68,.15)' : used >= 15
      ? 'rgba(245,158,11,.15)' : '';
    badge.style.borderColor = used >= PLAN_FREE_LIMIT
      ? 'rgba(239,68,68,.35)' : used >= 15
      ? 'rgba(245,158,11,.35)' : '';
    badge.style.color = used >= PLAN_FREE_LIMIT
      ? '#fca5a5' : used >= 15 ? '#fbbf24' : '';
  }
}

// ── Show premium modal with QR Code ──
const VERCEL_API = 'https://mydesk-eta.vercel.app';

async function showPremiumModal() {
  document.querySelector('.premium-modal-bg')?.remove();

  const used = getNotesUsed();
  const pct  = Math.min(100, Math.round(used / PLAN_FREE_LIMIT * 100));
  const fillClass = pct >= 100 ? 'full' : pct >= 80 ? 'warn' : '';

  const bg = document.createElement('div');
  bg.className = 'premium-modal-bg';
  bg.innerHTML = `
    <div class="premium-modal">
      <button class="pm-close" id="pm-close">✕</button>
      <div class="pm-badge">⭐ MyDesk Premium</div>
      <div class="pm-title">Desbloqueie o<br><span class="hl">poder total.</span></div>
      <div class="pm-desc">Crie notas ilimitadas, sem restrições mensais. Acesso completo a todos os workspaces.</div>

      ${!isPremium() ? `
      <div class="pm-limit-bar">
        <div class="pm-limit-label"><span>Notas criadas este mês</span><b>${used} / ${PLAN_FREE_LIMIT}</b></div>
        <div class="pm-limit-track"><div class="pm-limit-fill ${fillClass}" style="width:${pct}%"></div></div>
      </div>` : '<div style="background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.25);border-radius:10px;padding:10px 14px;font-size:.8rem;color:#6ee7b7;margin-bottom:16px;text-align:center;">✓ Plano Premium ativo — notas ilimitadas!</div>'}

      <div class="pm-features">
        <div class="pm-feat"><div class="pm-feat-icon">∞</div>Notas ilimitadas todo mês</div>
        <div class="pm-feat"><div class="pm-feat-icon">👥</div>Workspaces de grupo ilimitados</div>
        <div class="pm-feat"><div class="pm-feat-icon">🗂️</div>Workspaces pessoais ilimitados</div>
        <div class="pm-feat"><div class="pm-feat-icon">⭐</div>Suporte prioritário</div>
      </div>

      ${!isPremium() ? `
      <div class="pm-price"><div class="pm-price-val">R$&nbsp;10</div><div class="pm-price-period">/mês via Pix</div></div>
      <div class="pm-pix-box">
        <div class="pm-pix-label" id="pm-pix-label">Gerando cobrança Pix…</div>
        <div id="pm-pay-wrap" style="display:flex;justify-content:center;padding:12px 0;">
          <div style="font-size:1.5rem;animation:spin 1s linear infinite;display:inline-block;">⟳</div>
        </div>
      </div>
      <div class="pm-note">O plano é ativado automaticamente após o pagamento ser confirmado.</div>` : ''}
    </div>`;

  // Spin animation
  const style = document.createElement('style');
  style.textContent = '@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}';
  bg.appendChild(style);

  document.body.appendChild(bg);
  bg.querySelector('#pm-close').addEventListener('click', () => bg.remove());
  bg.addEventListener('click', e => { if (e.target === bg) bg.remove(); });

  if (!isPremium() && CU?.uid) {
    // Tentar backend Vercel para criar cobrança real no AbacatePay
    try {
      const fbUser = window._fbAuth?.currentUser;
      if (!fbUser) throw new Error('Sem sessão Firebase (modo demo)');
      const idToken = await fbUser.getIdToken();

      const _ctrl = new AbortController();
      const _timer = setTimeout(() => _ctrl.abort(), 8000);
      const resp = await fetch(VERCEL_API + '/api/create-charge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + idToken },
        signal: _ctrl.signal,
      }).finally(() => clearTimeout(_timer));

      // Se não for 2xx, vai para o fallback
      if (!resp || !resp.ok) throw new Error('HTTP ' + (resp?.status || 0));

      // Verificar se a resposta é JSON válido antes de parsear
      const contentType = resp.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) throw new Error('Not JSON');

      const data = await resp.json();

      const payWrap  = bg.querySelector('#pm-pay-wrap');
      const pixLabel = bg.querySelector('#pm-pix-label');
      const safeUrl  = (data.ok && typeof data.url === 'string' && /^https:\/\//.test(data.url)) ? data.url : null;

      if (safeUrl) {
        if (pixLabel) pixLabel.textContent = 'Cobrança gerada — finalize o pagamento:';
        if (payWrap) {
          payWrap.innerHTML = '';
          const anchor = document.createElement('a');
          anchor.href = safeUrl;
          anchor.target = '_blank';
          anchor.rel = 'noopener noreferrer';
          anchor.style.cssText = 'display:inline-block;width:100%;text-align:center;padding:12px;background:linear-gradient(135deg,#6366f1,#4f46e5);border-radius:10px;font-family:Inter,sans-serif;font-size:.86rem;font-weight:600;color:#fff;text-decoration:none;box-shadow:0 4px 18px rgba(99,102,241,.35);';
          anchor.textContent = 'Pagar com Pix →';
          payWrap.appendChild(anchor);
          // Abre automaticamente a página de pagamento hospedada pela AbacatePay
          // (QR Code + copia-e-cola são exibidos lá — mais confiável do que
          // tentar renderizar isso dentro do nosso próprio modal).
          window.open(safeUrl, '_blank', 'noopener,noreferrer');
        }
      }
      // se não veio url válida, cai pro fallback abaixo
    } catch(err) {
      console.warn('[Premium] API indisponível:', err.message || err);
      // Exibe mensagem de erro ao usuário em vez de fallback com dados sensíveis
      const pixLabel = bg.querySelector('#pm-pix-label');
      if (pixLabel) pixLabel.textContent = 'Serviço de pagamento temporariamente indisponível. Tente novamente em instantes.';
    }
  }
}

async function createNote() {
  // ── Check plan limit before creating ──
  const check = await canCreateNote();
  if (!check.ok) {
    closeModal();
    showPremiumModal();
    toast('🔒', `Limite de ${PLAN_FREE_LIMIT} notas/mês atingido. Assine o Premium!`);
    return;
  }

  const title = $('m-title').value.trim() || 'Sem título';
  const body  = $('m-body').value.trim();
  const start = $('m-start').value;
  const end   = $('m-end').value;
  const rem   = $('m-rem-chk').checked;
  const remD  = parseInt($('m-rem-days').value) || 3;
  const W = window.innerWidth, H = window.innerHeight, TB = 54;
  const x = 80  + Math.random() * Math.max(W - 400, 120);
  const y = TB + 40 + Math.random() * Math.max(H - TB - 320, 80);
  const n = { id:Date.now(), color:selClr, title, body, start, end,
              reminder:rem, remDays:remD, status:'todo', x, y, z:++zTop, files:[] };
  notes.push(n);
  mountNote(n);
  saveNotes();
  syncCount(); closeModal(); checkReminders();

  // Increment counter after successful creation
  incrementNoteCounter();

  // Warn when approaching limit
  const used = getNotesUsed();
  if (!isPremium() && used === PLAN_FREE_LIMIT - 3) {
    toast('⚠', `Atenção: ${PLAN_FREE_LIMIT - used} notas restantes este mês.`);
  }
}

/* ═══════════════════════════════════════════════════
   RENDERIZAÇÃO DAS NOTAS
   mountNote() — cria o elemento DOM e conecta eventos
═══════════════════════════════════════════════════ */
const iCal  = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:9px;height:9px;opacity:.5;flex-shrink:0"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`;
const iBell = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`;
const iX    = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

function mountNote(n) {
  const p = PAL[n.color] || PAL.indigo;
  const el = document.createElement('div');
  el.className = 'note'; el.dataset.id = n.id;
  const _nw = n.w || 0;
  const _nh = Math.min(n.h || 0, 520, Math.round(window.innerHeight * 0.7));
  el.style.cssText = `left:${n.x}px;top:${n.y}px;z-index:${n.z};background:${p.bg};border-color:${p.bar}30;${_nw > 0 ? 'width:'+_nw+'px;' : ''}${_nh > 0 ? 'height:'+_nh+'px;overflow-y:auto;' : ''}`;

  el.innerHTML = `
    <div class="n-bar" style="background:${p.bar}"></div>
    <div class="n-head" data-drag>
      <div class="n-chip-row">
        <div class="n-chip" style="background:${p.chip};border:1px solid ${p.bar}40;">
          <div class="n-chip-dot" style="background:${p.dot}"></div>
          <span style="color:${p.dot}">${p.label}</span>
        </div>
        <div class="n-status-pill s-${n.status||'todo'}" id="sp-${n.id}">
          <span class="n-status-dot"></span>
          <span class="n-status-label">${statusLabel(n.status||'todo')}</span>
        </div>
        <span class="n-cl-badge" style="display:none"></span>
        <button class="n-pin-btn" id="np-${n.id}" title="Fixar expandida">${n.pinned ? '📌' : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="10" height="10"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"/></svg>'}</button>
        <button class="n-del">${iX}</button>
      </div>
      <div class="n-title-row">
        <textarea class="n-title" rows="1" maxlength="80" spellcheck="false" placeholder="${T.phNoteTitle||'Título da nota'}">${xe(n.title)}</textarea>
      </div>
      <div class="n-body-inline">
        <textarea class="n-text" spellcheck="false" placeholder="${T.phNoteBody||'Descrição, links ou tarefas…'}">${xe(n.body)}</textarea>
      </div>
    </div>
    <div class="n-expand-area">
      <div class="n-sep"></div>
      <div class="n-dates">
        <div class="n-date-row">${iCal}<span class="n-date-tag">Início</span><input class="n-dinput" type="date" value="${n.start||''}"></div>
        <div class="n-date-row">${iCal}<span class="n-date-tag">Prazo</span><input class="n-dinput" type="date" value="${n.end||''}"></div>
      </div>
      <div class="n-badge" id="nb-${n.id}" style="display:none">${iBell}<span></span></div>
      <div class="n-checklist-wrap">
        <div class="n-checklist-head">
          <span>Checklist</span>
          <button class="n-checklist-add" title="Adicionar item">+</button>
        </div>
        <div class="n-checklist-list" id="ncl-${n.id}"></div>
      </div>
      <div class="n-color-wrap" style="padding:0 10px 8px;position:relative;">
        <button class="n-color-btn" id="ncb-${n.id}">
          <span class="n-color-dot" style="background:${p.bar};"></span>
          Cor
        </button>
      </div>
      <div class="n-files" id="nf-${n.id}"></div>
    </div>
    <div class="n-resize" title="Redimensionar">
      <svg viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
        <line x1="9" y1="1" x2="1" y2="9"/><line x1="9" y1="5" x2="5" y2="9"/>
      </svg>
    </div>`;

  el.querySelector('.n-del').addEventListener('click', e => {
    e.stopPropagation();
    removeNote(n.id);
  });

  // Pin button — toggle expand lock
  const pinBtn = el.querySelector('.n-pin-btn');
  if (pinBtn) {
    if (n.pinned) { el.classList.add('pinned'); pinBtn.classList.add('active'); }
    pinBtn.addEventListener('click', e => {
      e.stopPropagation();
      n.pinned = !n.pinned;
      el.classList.toggle('pinned', n.pinned);
      pinBtn.classList.toggle('active', n.pinned);
      saveNotes();
    });
  }

  // Apply initial status visual
  applyNoteStatus(el, n.status || 'todo');

  // Status pill click → open dropdown
  const pillEl = el.querySelector('.n-status-pill');
  if (pillEl) {
    pillEl.addEventListener('click', e => {
      e.stopPropagation();
      openStatusMenu(el, n, pillEl);
    });
  }

  const ta1 = el.querySelector('.n-title');
  const ta2 = el.querySelector('.n-text');
  ta1.addEventListener('input', () => { ar(ta1); n.title = ta1.value; n.titleH = ta1.scrollHeight; saveNotes(); });
  ta2.addEventListener('input', () => { ar(ta2); n.body  = ta2.value; n.bodyH  = ta2.scrollHeight; saveNotes(); });
  // Restore saved height instead of recalculating (prevents shrink on reload)
  if (n.titleH > 0) ta1.style.height = n.titleH + 'px'; else ar(ta1);
  if (n.bodyH  > 0) ta2.style.height = n.bodyH  + 'px'; else ar(ta2);

  const dins = el.querySelectorAll('.n-dinput');
  dins[0].addEventListener('change', () => { n.start = dins[0].value; saveNotes(); updateBadge(n); });
  dins[1].addEventListener('change', () => { n.end   = dins[1].value; saveNotes(); updateBadge(n); });

  // Checklist
  renderChecklist(n, el);
  const clAddBtn = el.querySelector('.n-checklist-add');
  if (clAddBtn) {
    clAddBtn.addEventListener('click', e => {
      e.stopPropagation();
      n.checklist = n.checklist || [];
      n.checklist.push({ text: '', done: false });
      saveNotes();
      renderChecklist(n, el);
      const inputs = el.querySelectorAll('.n-cl-text');
      inputs[inputs.length - 1]?.focus();
    });
  }

  // Color picker button → toggle popover
  const colorBtn = el.querySelector('#ncb-'+n.id);
  if (colorBtn) {
    colorBtn.addEventListener('click', e => {
      e.stopPropagation();
      // Close any other open color popover
      document.querySelectorAll('.n-color-pop').forEach(p => p.remove());
      // Build popover
      const pop = document.createElement('div');
      pop.className = 'n-color-pop';
      PKEYS.forEach(k => {
        const sw = document.createElement('div');
        sw.className = 'swatch' + (k === n.color ? ' active' : '');
        sw.style.background = PAL[k].bar;
        sw.title = PAL[k].label;
        sw.addEventListener('click', ev => {
            ev.stopPropagation();
            const p2 = PAL[k];
            n.color = k;
            el.style.background = p2.bg;
            el.querySelector('.n-bar').style.background      = p2.bar;
            el.querySelector('.n-chip').style.background     = p2.chip;
            el.querySelector('.n-chip-dot').style.background = p2.dot;
            el.querySelector('.n-chip span').style.color     = p2.dot;
            el.querySelector('.n-chip span').textContent     = p2.label;
            // Update button dot only
            const btn = el.querySelector('#ncb-'+n.id);
            if (btn) {
              btn.querySelector('.n-color-dot').style.background = p2.bar;
            }
            pop.querySelectorAll('.swatch').forEach(s2 => s2.classList.toggle('active', s2 === sw));
            saveNotes();
            pop.remove();
          });
          pop.appendChild(sw);
        });
        // Position popover below the button
        const rect = colorBtn.getBoundingClientRect();
        pop.style.position = 'fixed';
        pop.style.top  = (rect.bottom + 6) + 'px';
        pop.style.left = rect.left + 'px';
        document.body.appendChild(pop);
        // Close on outside click
        const closePopover = (ev) => {
          if (!pop.contains(ev.target) && ev.target !== colorBtn) {
            pop.remove(); document.removeEventListener('mousedown', closePopover);
          }
        };
        setTimeout(() => document.addEventListener('mousedown', closePopover), 0);
      });
    }

  el.querySelector('[data-drag]').addEventListener('mousedown', e => {
    const t = e.target.tagName;
    if (t==='TEXTAREA'||t==='INPUT'||t==='BUTTON'||t==='A') return;
    if (e.target.closest('.n-status-pill')) return;
    if (e.target.closest('.n-color-btn'))  return;
    e.preventDefault();
    bringFront(el, n);
    const r = el.getBoundingClientRect();
    drag = { el, n, ox: e.clientX - r.left, oy: e.clientY - r.top };
    el.classList.add('dragging');
    window.addEventListener('mousemove', onDrag);
    window.addEventListener('mouseup',   endDrag);
  });
  // Touch support for mobile drag
  el.querySelector('[data-drag]').addEventListener('touchstart', e => {
    const t = e.target.tagName;
    if (t==='TEXTAREA'||t==='INPUT'||t==='BUTTON'||t==='A') return;
    const touch = e.touches[0];
    bringFront(el, n);
    const r = el.getBoundingClientRect();
    drag = { el, n, ox: touch.clientX - r.left, oy: touch.clientY - r.top };
    el.classList.add('dragging');
  }, { passive: true });
  el.querySelector('[data-drag]').addEventListener('touchmove', e => {
    if (!drag || drag.el !== el) return;
    e.preventDefault();
    const touch = e.touches[0];
    const brd = document.getElementById('board').getBoundingClientRect();
    n.x = touch.clientX - drag.ox - brd.left;
    n.y = touch.clientY - drag.oy - brd.top;
    el.style.left = n.x + 'px';
    el.style.top  = n.y + 'px';
  }, { passive: false });
  el.querySelector('[data-drag]').addEventListener('touchend', () => {
    if (!drag || drag.el !== el) return;
    el.classList.remove('dragging');
    drag = null;
    saveNotes();
  });
  el.addEventListener('mousedown', () => bringFront(el, n));

  // ── Resize handle drag ──
  const resizeHandle = el.querySelector('.n-resize');
  if (resizeHandle) {
    resizeHandle.addEventListener('mousedown', e => {
      e.preventDefault(); e.stopPropagation();
      bringFront(el, n);
      const startX = e.clientX, startY = e.clientY;
      const startW = el.offsetWidth, startH = el.offsetHeight;
      document.body.style.cursor = 'se-resize';
      const onMove = ev => {
        const newW = Math.max(200, Math.min(600, startW + ev.clientX - startX));
        const maxH = Math.min(520, Math.round(window.innerHeight * 0.7));
        const newH = Math.max(0, Math.min(maxH, startH + ev.clientY - startY));
        el.style.width = newW + 'px';
        if (newH > 120) { el.style.height = newH + 'px'; el.style.overflowY = 'auto'; }
        else            { el.style.height = ''; el.style.overflowY = ''; }
        n.w = newW; n.h = newH > 120 ? newH : 0;
      };
      const onUp = () => {
        document.body.style.cursor = '';
        saveNotes();
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    });
  }

  $('board').appendChild(el);
  renderFiles(n); updateBadge(n); syncEmpty();
}

/* ═══════════════════════════════════════════════════
   CHECKLIST DA NOTA
═══════════════════════════════════════════════════ */
function renderChecklist(n, el) {
  const host = el.querySelector('#ncl-' + n.id);
  if (!host) return;
  const items = n.checklist || [];

  host.innerHTML = items.map((it, i) => `
    <div class="n-cl-item ${it.done ? 'done' : ''}" data-idx="${i}">
      <input type="checkbox" class="n-cl-check" ${it.done ? 'checked' : ''}>
      <input type="text" class="n-cl-text" value="${sanitizeAttr(it.text || '')}" placeholder="Item da checklist…">
      <button class="n-cl-del" title="Remover">${iX}</button>
    </div>`).join('');

  host.querySelectorAll('.n-cl-item').forEach(row => {
    const idx = Number(row.dataset.idx);
    row.querySelector('.n-cl-check').addEventListener('change', e => {
      n.checklist[idx].done = e.target.checked;
      row.classList.toggle('done', e.target.checked);
      saveNotes();
      _updateChecklistBadge(n, el);
    });
    row.querySelector('.n-cl-text').addEventListener('input', e => {
      n.checklist[idx].text = e.target.value;
      saveNotes();
    });
    row.querySelector('.n-cl-text').addEventListener('keydown', e => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      el.querySelector('.n-checklist-add')?.click();
    });
    row.querySelector('.n-cl-del').addEventListener('click', e => {
      e.stopPropagation();
      n.checklist.splice(idx, 1);
      saveNotes();
      renderChecklist(n, el);
      _updateChecklistBadge(n, el);
    });
  });

  _updateChecklistBadge(n, el);
}

function _updateChecklistBadge(n, el) {
  const badge = el.querySelector('.n-cl-badge');
  if (!badge) return;
  const items = n.checklist || [];
  if (!items.length) { badge.style.display = 'none'; return; }
  const done = items.filter(i => i.done).length;
  badge.style.display = 'inline-flex';
  badge.textContent = `✓ ${done}/${items.length}`;
  badge.classList.toggle('complete', done === items.length);
}

/* ═══════════════════════════════════════════════════
   STATUS DAS NOTAS
   A fazer / Andamento / Concluído / Encerrado
═══════════════════════════════════════════════════ */
const STATUS_OPTS = [
  { key:'todo',     get label(){ return T.statusTodo     || 'A fazer';    }, dot:'#94a3b8' },
  { key:'progress', get label(){ return T.statusProgress || 'Andamento';  }, dot:'#6366f1' },
  { key:'done',     get label(){ return T.statusDone     || 'Concluído';  }, dot:'#10b981' },
  { key:'closed',   get label(){ return T.statusClosed   || 'Encerrado';  }, dot:'#ef4444' },
];

function statusLabel(key) {
  return (STATUS_OPTS.find(o => o.key === key) || STATUS_OPTS[0]).label;
}

function applyNoteStatus(noteEl, status) {
  // Update pill appearance
  const pill = noteEl.querySelector('.n-status-pill');
  if (pill) {
    STATUS_OPTS.forEach(o => pill.classList.remove('s-' + o.key));
    pill.classList.add('s-' + status);
    const lbl = pill.querySelector('.n-status-label');
    if (lbl) lbl.textContent = statusLabel(status);
  }
  // Update note-level CSS classes for visual effects
  STATUS_OPTS.forEach(o => noteEl.classList.remove('status-' + o.key));
  noteEl.classList.add('status-' + status);

  // ── Update status badge in stack row if note is stacked ──
  const noteId = noteEl.dataset.id;
  const statusOpt = STATUS_OPTS.find(o => o.key === status) || STATUS_OPTS[0];
  const stackRow = document.querySelector(`.stack-card-row[data-note-id="${noteId}"]`);
  if (stackRow) {
    const badge = stackRow.querySelector('.stack-card-row-status');
    if (badge) {
      badge.innerHTML = `<span style="width:6px;height:6px;border-radius:50%;background:${statusOpt.dot};flex-shrink:0;display:inline-block;"></span> ${statusOpt.label}`;
    }
  }

  // ── Trigger animation ──
  const animMap = { done:'anim-done', closed:'anim-closed', progress:'anim-progress' };
  const animClass = animMap[status];
  if (animClass) {
    ['anim-done','anim-closed','anim-progress'].forEach(c => noteEl.classList.remove(c));
    void noteEl.offsetWidth; // reflow
    noteEl.classList.add(animClass);
    noteEl.addEventListener('animationend', () => noteEl.classList.remove(animClass), { once: true });

    // ── Particle burst ──
    const colors = {
      done:     ['#10b981','#34d399','#6ee7b7','#a7f3d0'],
      closed:   ['#ef4444','#f87171','#fca5a5'],
      progress: ['#6366f1','#818cf8','#a5b4fc','#c7d2fe'],
    };
    const burst = document.createElement('div');
    burst.className = 'note-burst';
    noteEl.appendChild(burst);
    const cx = noteEl.offsetWidth / 2, cy = noteEl.offsetHeight / 2;
    const palette = colors[status] || colors.done;
    for (let i = 0; i < 12; i++) {
      const p = document.createElement('div');
      p.className = 'burst-particle';
      const size = 5 + Math.random() * 5;
      const angle = (i / 12) * 360 + Math.random() * 20;
      const dist  = 40 + Math.random() * 40;
      const rad   = angle * Math.PI / 180;
      p.style.cssText = `
        width:${size}px;height:${size}px;
        left:${cx}px;top:${cy}px;
        background:${palette[i % palette.length]};
        --tx:${Math.cos(rad)*dist}px;
        --ty:${Math.sin(rad)*dist}px;
        animation-delay:${Math.random()*80}ms;
      `;
      burst.appendChild(p);
    }
    setTimeout(() => burst.remove(), 700);

    // ── Sound ──
    playStatusSound(status);
  }

  // Auto-update sort/filter if active
  setTimeout(onStatusChangedReorganize, 50);
}

/* ═══════════════════════════════════════════════════
   MOTOR DE SOM
   Web Audio API — tons de status e notificação
═══════════════════════════════════════════════════ */
let _audioCtx = null;
function getAudioCtx() {
  if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return _audioCtx;
}

let _soundReady = false; // muted during first 3s after login

function playTone(freq, type, duration, vol, delay = 0) {
  if (!_soundReady) return; // suppress sounds during login initialization
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
    gain.gain.setValueAtTime(0, ctx.currentTime + delay);
    gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + delay + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
    osc.start(ctx.currentTime + delay);
    osc.stop(ctx.currentTime + delay + duration + 0.05);
  } catch(_) {}
}

function playStatusSound(status) {
  if (status === 'done') {
    // Two ascending soft chimes — satisfying completion
    playTone(523, 'sine', 0.18, 0.12, 0.00);
    playTone(784, 'sine', 0.22, 0.10, 0.12);
    playTone(1047,'sine', 0.28, 0.08, 0.22);
  } else if (status === 'closed') {
    // Descending soft thud
    playTone(440, 'sine', 0.15, 0.10, 0.00);
    playTone(330, 'sine', 0.20, 0.08, 0.10);
    playTone(220, 'sine', 0.25, 0.06, 0.18);
  } else if (status === 'progress') {
    // Short rising pulse
    playTone(440, 'sine', 0.12, 0.08, 0.00);
    playTone(554, 'sine', 0.16, 0.07, 0.10);
  } else if (status === 'todo') {
    playTone(330, 'sine', 0.14, 0.06, 0.00);
  }
}

function playNotifSound() {
  // Soft double ping for incoming message
  playTone(880, 'sine', 0.14, 0.09, 0.00);
  playTone(1108,'sine', 0.18, 0.07, 0.10);
}

function playOnlineSound() {
  // Gentle ascending pop for friend coming online
  playTone(660, 'sine', 0.10, 0.07, 0.00);
  playTone(880, 'sine', 0.14, 0.06, 0.08);
}

let _openStatusMenu = null;

function openStatusMenu(noteEl, n, pillEl) {
  if (_openStatusMenu) { _openStatusMenu.remove(); _openStatusMenu = null; }

  const menu = document.createElement('div');
  menu.className = 'n-status-menu';

  STATUS_OPTS.forEach(opt => {
    const row = document.createElement('div');
    row.className = 'n-status-opt' + (n.status === opt.key ? ' sel' : '');
    row.innerHTML = `<span class="n-status-opt-dot" style="background:${opt.dot}"></span>${opt.label}`;
    row.addEventListener('mousedown', e => {
      e.stopPropagation();
      n.status = opt.key;
      applyNoteStatus(noteEl, opt.key);
      _handleSmartStackTransition(n, opt.key);
      saveNotes();
      menu.remove(); _openStatusMenu = null;
    });
    menu.appendChild(row);
  });

  // Append to body with fixed position to escape overflow:hidden
  menu.style.position = 'fixed';
  menu.style.zIndex   = '99999';
  document.body.appendChild(menu);
  _openStatusMenu = menu;

  // Position below the pill
  const r = pillEl.getBoundingClientRect();
  menu.style.top  = (r.bottom + 6) + 'px';
  menu.style.left = r.left + 'px';

  const close = e => {
    if (!menu.contains(e.target) && e.target !== pillEl) {
      menu.remove(); _openStatusMenu = null;
      document.removeEventListener('mousedown', close, true);
    }
  };
  setTimeout(() => document.addEventListener('mousedown', close, true), 0);
}

/* ═══════════════════════════════════════════════════
   DRAG & DROP
   Arrastar notas, formar pilhas, snap de proximidade
═══════════════════════════════════════════════════ */
/* ── Stack highlight on drag ── */
function findDropTarget(dragEl, dragN) {
  const SNAP = 120;
  const dr = dragEl.getBoundingClientRect();
  const dCx = dr.left + dr.width / 2;
  const dCy = dr.top  + dr.height / 2;
  const MAX_STACK = 20;

  let best = null, bestDist = SNAP;

  // 1. Check loose visible notes
  document.querySelectorAll('.note').forEach(el => {
    if (el === dragEl) return;
    if (el.style.display === 'none') return;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return;
    const cx = r.left + r.width / 2;
    const cy = r.top  + r.height / 2;
    const dist = Math.hypot(dCx - cx, dCy - cy);
    if (dist < bestDist) {
      // Check stack size limit
      const tid = parseInt(el.dataset.id);
      const tn = notes.find(n => n.id === tid);
      if (tn?.stackId) {
        if (getStackNotes(tn.stackId).length >= MAX_STACK) return;
      } else {
        // Would form a new stack of 2 — always OK
      }
      bestDist = dist; best = el;
    }
  });

  // 2. Check stack-wrap headers (collapsed stacks)
  document.querySelectorAll('.stack-wrap').forEach(wrap => {
    const stackId = wrap.dataset.stack;
    if (!stackId) return;
    const stackNs = getStackNotes(stackId);
    if (stackNs.length >= MAX_STACK) return; // at capacity
    const r = wrap.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top  + r.height / 2;
    const dist = Math.hypot(dCx - cx, dCy - cy);
    if (dist < bestDist) {
      // Return a proxy: the first visible note of this stack
      const firstNote = stackNs[0];
      const el = document.querySelector('.note[data-id="'+firstNote?.id+'"]');
      if (el) { bestDist = dist; best = el; }
    }
  });

  return best;
}

function onDrag(e) {
  if (!drag) return;
  const x = e.clientX - drag.ox, y = e.clientY - drag.oy;
  drag.el.style.left = x+'px'; drag.el.style.top = y+'px';
  drag.n.x = x; drag.n.y = y;
  if (viewers.has(drag.n.id)) {
    const v = viewers.get(drag.n.id);
    positionViewer(drag.el, v.el);
    v.el.style.zIndex = String(parseInt(drag.el.style.zIndex) + 1);
  }
  // Highlight potential stack target
  document.querySelectorAll('.note.stack-target').forEach(e => e.classList.remove('stack-target'));
  document.querySelectorAll('.stack-wrap.stack-target').forEach(e => e.classList.remove('stack-target'));
  const target = findDropTarget(drag.el, drag.n);
  if (target) {
    target.classList.add('stack-target');
    // Also highlight the stack-wrap if target is inside a stack
    const tid = parseInt(target.dataset.id);
    const tn = notes.find(n => n.id === tid);
    if (tn?.stackId) {
      document.querySelector('.stack-wrap[data-stack="'+tn.stackId+'"]')?.classList.add('stack-target');
    }
  }
}

function endDrag() {
  if (!drag) return;
  drag.el.classList.remove('dragging');
  document.querySelectorAll('.note.stack-target').forEach(e => e.classList.remove('stack-target'));

  const W=window.innerWidth, H=window.innerHeight, TB=54;
  let x=drag.n.x, y=drag.n.y;

  // Check if dropped on another note → create/join stack
  const target = findDropTarget(drag.el, drag.n);
  if (target) {
    const targetId = parseInt(target.dataset.id);
    const targetN  = notes.find(n => n.id === targetId);
    if (targetN) {
      stackNotes(drag.n, targetN);
      drag = null;
      window.removeEventListener('mousemove', onDrag);
      window.removeEventListener('mouseup',   endDrag);
      return;
    }
  }

  x = Math.max(-(drag.el.offsetWidth-50), Math.min(W-50, x));
  y = Math.max(TB, Math.min(H-50, y));

  // Push note away from any stack-wrap it overlaps
  const GAP = 20;
  document.querySelectorAll('.stack-wrap').forEach(wrap => {
    const wr = wrap.getBoundingClientRect();
    const board = document.getElementById('board').getBoundingClientRect();
    const wx = wr.left - board.left, wy = wr.top - board.top;
    const ww = wr.width, wh = wr.height;
    const nw = drag.el.offsetWidth, nh = drag.el.offsetHeight;
    // Check overlap
    if (x < wx + ww + GAP && x + nw + GAP > wx &&
        y < wy + wh + GAP && y + nh + GAP > wy) {
      // Push to the right of the stack
      x = wx + ww + GAP;
    }
  });

  drag.el.style.left = x+'px'; drag.el.style.top = y+'px';
  drag.n.x=x; drag.n.y=y; drag=null;
  window.removeEventListener('mousemove', onDrag);
  window.removeEventListener('mouseup',   endDrag);
  saveNotes();
}
function bringFront(el,n){ n.z=++zTop; el.style.zIndex=n.z; }

/* ════════════════════════════════════════════════
   STACK SYSTEM — pilhas compactas
   Arrastar nota sobre outra → formam uma pilha
   Pilha mostra só títulos; clica para expandir
════════════════════════════════════════════════ */

// Stack titles: { stackId: 'Título da pilha' }
function getStackTitles() {
  if (!CU) return {};
  try { return JSON.parse(localStorage.getItem('md_stktitles_' + CU.username) || '{}'); } catch { return {}; }
}
function saveStackTitle(stackId, title) {
  if (!CU) return;
  const titles = getStackTitles();
  titles[stackId] = title;
  localStorage.setItem('md_stktitles_' + CU.username, JSON.stringify(titles));
}
function removeStackTitle(stackId) {
  if (!CU) return;
  const titles = getStackTitles();
  delete titles[stackId];
  delete titles[stackId + '_smart'];
  localStorage.setItem('md_stktitles_' + CU.username, JSON.stringify(titles));
}

/* ── Pilhas inteligentes: renomear uma pilha para "Encerrado" ou
   "Concluído" transforma ela numa pasta que auto-recebe qualquer nota
   cujo status mude pra esse mesmo estado, e libera qualquer nota que
   deixe de estar finalizada — tudo automático, sem precisar arrastar. ── */
function _smartStackKind(title) {
  const t = (title || '').trim().toLowerCase();
  if (!t) return null;
  // Cobre os 4 idiomas suportados pelo app (pt/en/es/fr), já que o usuário
  // pode estar em qualquer um deles ao renomear a pilha.
  if (['concluído','concluido','done','completado','terminé','termine'].includes(t)) return 'done';
  if (['encerrado','closed','cerrado','clôturé','cloture'].includes(t)) return 'closed';
  return null;
}
function isSmartStack(stackId) {
  return !!getStackTitles()[stackId + '_smart'];
}
function findSmartStackId(kind) {
  const titles = getStackTitles();
  for (const k in titles) {
    if (k.endsWith('_smart') && titles[k] === kind) return k.slice(0, -'_smart'.length);
  }
  return null;
}
// Move `n` pra dentro da pilha `targetStackId`, saindo de qualquer pilha anterior primeiro.
function _moveNoteIntoStack(n, targetStackId) {
  if (n.stackId === targetStackId) return;

  if (n.stackId) {
    const oldStackId = n.stackId;
    n.stackId = null; n.stackOrder = null;
    const remaining = getStackNotes(oldStackId);
    document.querySelector('.stack-wrap[data-stack="'+oldStackId+'"]')?.remove();
    if (remaining.length >= 2 || (remaining.length === 1 && isSmartStack(oldStackId))) {
      renderStack(oldStackId);
    } else if (remaining.length === 1) {
      const last = remaining[0]; last.stackId = null; last.stackOrder = null;
      const lastEl = document.querySelector('.note[data-id="'+last.id+'"]');
      if (lastEl) { lastEl.style.display=''; lastEl.style.position='absolute'; lastEl.style.left=last.x+'px'; lastEl.style.top=last.y+'px'; document.getElementById('board').appendChild(lastEl); }
      removeStackTitle(oldStackId);
    }
  }

  const targetMembers = getStackNotes(targetStackId);
  const anchor = targetMembers[0] || n;
  n.stackId    = targetStackId;
  n.stackOrder = targetMembers.length;
  n.x = anchor.x;
  n.y = anchor.y;

  saveNotes();
  if (_activeGroupWs) saveGroupNote(n);
  else if (_activeWs)  saveSharedNote(n);
  renderStack(targetStackId);
}
// Chamado sempre que o usuário muda o status de uma nota manualmente.
function _handleSmartStackTransition(n, newStatus) {
  if (newStatus === 'done' || newStatus === 'closed') {
    const targetStackId = findSmartStackId(newStatus);
    if (targetStackId && n.stackId !== targetStackId) _moveNoteIntoStack(n, targetStackId);
  } else if (n.stackId && isSmartStack(n.stackId)) {
    // Deixou de estar finalizada enquanto estava numa pasta inteligente → sai dela
    unstackNote(n);
  }
}

function openStackHeaderColorPicker(anchor, stackId, barEl) {
  document.querySelector('.stack-color-pop')?.remove();
  const pop = document.createElement('div');
  pop.className = 'status-menu-pop stack-color-pop';
  pop.style.cssText = 'display:flex;flex-wrap:wrap;gap:5px;padding:10px;max-width:188px;';

  const currentColor = getStackTitles()[stackId + '_color'] || 'indigo';
  PKEYS.forEach(key => {
    const c = PAL[key];
    const btn = document.createElement('button');
    btn.style.cssText = `width:20px;height:20px;border-radius:50%;background:${c.bar};
      border:2px solid ${currentColor===key ? '#fff' : 'transparent'};
      cursor:pointer;transition:transform .12s;padding:0;flex-shrink:0;`;
    btn.title = c.label;
    btn.addEventListener('mouseenter', () => btn.style.transform = 'scale(1.2)');
    btn.addEventListener('mouseleave', () => btn.style.transform = 'scale(1)');
    btn.addEventListener('mousedown', e => {
      e.stopPropagation();
      e.preventDefault();
      // Save color
      const titles = getStackTitles();
      titles[stackId + '_color'] = key;
      localStorage.setItem('md_stktitles_' + CU.username, JSON.stringify(titles));
      // Update dot and bar directly via passed references
      anchor.style.background = c.bar;
      barEl.style.background  = c.bar;
      // Update wrap background and border
      const wrapEl = document.querySelector('.stack-wrap[data-stack="' + stackId + '"]');
      if (wrapEl) {
        wrapEl.style.background = c.bg;
        wrapEl.style.border = '1px solid ' + c.bar + '40';
      }
      pop.remove();
    });
    pop.appendChild(btn);
  });

  const r = anchor.getBoundingClientRect();
  pop.style.top  = (r.bottom + 6) + 'px';
  pop.style.left = Math.max(8, r.left - 40) + 'px';
  document.body.appendChild(pop);
  setTimeout(() => document.addEventListener('click', function close() {
    pop.remove(); document.removeEventListener('click', close);
  }), 0);
}

function openStackCardColorPicker(anchor, n, row, stackId) {
  document.querySelector('.stack-color-pop')?.remove();
  const pop = document.createElement('div');
  pop.className = 'status-menu-pop stack-color-pop';
  pop.style.cssText = 'display:flex;flex-wrap:wrap;gap:5px;padding:10px;max-width:188px;';

  PKEYS.forEach(key => {
    const c = PAL[key];
    const btn = document.createElement('button');
    btn.style.cssText = `width:20px;height:20px;border-radius:50%;background:${c.bar};
      border:2px solid ${n.color===key ? '#fff' : 'transparent'};
      cursor:pointer;transition:transform .12s;padding:0;flex-shrink:0;`;
    btn.title = c.label;
    btn.addEventListener('mouseenter', () => btn.style.transform = 'scale(1.2)');
    btn.addEventListener('mouseleave', () => btn.style.transform = 'scale(1)');
    btn.addEventListener('click', () => {
      // Update note color
      n.color = key;
      // Update bar in row
      const bar = row.querySelector('.stack-card-row-bar');
      if (bar) bar.style.background = c.bar;
      anchor.style.background = c.bar;
      // Update the hidden note element too
      const noteEl = document.querySelector(`.note[data-id="${n.id}"]`);
      if (noteEl) {
        noteEl.style.background = c.bg;
        const nBar = noteEl.querySelector('.n-bar');
        if (nBar) nBar.style.background = c.bar;
      }
      saveNotes();
      pop.remove();
    });
    pop.appendChild(btn);
  });

  const r = anchor.getBoundingClientRect();
  pop.style.top  = (r.bottom + 6) + 'px';
  pop.style.left = Math.max(8, r.left - 80) + 'px';
  document.body.appendChild(pop);
  setTimeout(() => document.addEventListener('click', function close() {
    pop.remove(); document.removeEventListener('click', close);
  }), 0);
}

function getStackNotes(stackId) {
  return notes.filter(n => n.stackId === stackId)
              .sort((a,b) => (a.stackOrder||0)-(b.stackOrder||0));
}

function stackNotes(dragN, targetN) {
  // If dragged note was in a different stack, remove it first
  if (dragN.stackId && dragN.stackId !== targetN.stackId) {
    const oldStackId = dragN.stackId;
    dragN.stackId = null; dragN.stackOrder = null;
    const remaining = getStackNotes(oldStackId);
    document.querySelector('.stack-wrap[data-stack="'+oldStackId+'"]')?.remove();
    if (remaining.length >= 2 || (remaining.length === 1 && isSmartStack(oldStackId))) {
      renderStack(oldStackId);
    } else if (remaining.length === 1) {
      const last = remaining[0]; last.stackId = null; last.stackOrder = null;
      const lastEl = document.querySelector('.note[data-id="'+last.id+'"]');
      if (lastEl) { lastEl.style.display=''; lastEl.style.position='absolute'; lastEl.style.left=last.x+'px'; lastEl.style.top=last.y+'px'; document.getElementById('board').appendChild(lastEl); }
      removeStackTitle(oldStackId);
    }
  }

  const stackId = targetN.stackId || ('stk_' + Date.now());
  const members = notes.filter(n =>
    n.id === dragN.id || n.id === targetN.id ||
    (n.stackId && n.stackId === stackId)
  );
  members.forEach((n, i) => {
    n.stackId    = stackId;
    n.stackOrder = i;
    n.x = targetN.x;
    n.y = targetN.y;
  });

  // Push loose notes that overlap the stack away
  const GAP = 32, stackW = 270, stackH = 200;
  notes.forEach(n => {
    if (n.stackId) return;
    const el = document.querySelector(`.note[data-id="${n.id}"]`);
    if (!el) return;
    const nw = el.offsetWidth || 270, nh = el.offsetHeight || 200;
    if (n.x < targetN.x + stackW + GAP && n.x + nw + GAP > targetN.x &&
        n.y < targetN.y + stackH + GAP && n.y + nh + GAP > targetN.y) {
      n.x = targetN.x + stackW + GAP;
      el.style.left = n.x + 'px';
    }
  });

  saveNotes();
  // Sync stack to group/shared workspace in real-time
  if (_activeGroupWs) members.forEach(n => saveGroupNote(n));
  else if (_activeWs)  members.forEach(n => saveSharedNote(n));
  renderStack(stackId);
}

function repositionStacksBelow(changedStackId) {
  const PAD = 24, GAP = 20;
  const TB  = 54;

  // Get all stack wraps sorted by their current top position
  const allWraps = [...document.querySelectorAll('.stack-wrap')].sort((a, b) => {
    return parseFloat(a.style.top) - parseFloat(b.style.top);
  });

  if (allWraps.length < 2) return;

  // Find the changed stack
  const changedEl = document.querySelector('.stack-wrap[data-stack="'+changedStackId+'"]');
  if (!changedEl) return;

  const changedIdx = allWraps.indexOf(changedEl);
  if (changedIdx === -1) return;

  // All stacks share same X (left column)
  const colX = parseFloat(changedEl.style.left) || PAD;

  // Only reposition stacks that come AFTER the changed one
  let curY = parseFloat(changedEl.style.top) + changedEl.offsetHeight + GAP;

  const anim = 'top .3s cubic-bezier(.16,1,.3,1)';
  for (let i = changedIdx + 1; i < allWraps.length; i++) {
    const w = allWraps[i];
    const sid = w.dataset.stack;
    w.style.transition = anim;
    w.style.top = curY + 'px';
    // Update note positions in data
    if (sid) notes.filter(n => n.stackId === sid).forEach(n => { n.y = curY; });
    curY += w.offsetHeight + GAP;
    setTimeout(() => { w.style.transition = ''; }, 350);
  }
  saveNotes();
}

function renderStack(stackId) {
  const stackNs = getStackNotes(stackId);
  if (!stackNs.length) return;
  const anchor = stackNs[0];

  // Remove existing wrapper
  document.querySelector('.stack-wrap[data-stack="'+stackId+'"]')?.remove();

  const wrap = document.createElement('div');
  wrap.className = 'stack-wrap';
  wrap.dataset.stack = stackId;
  const savedColor = getStackTitles()[stackId + '_color'] || 'indigo';
  const wp = PAL[savedColor] || PAL.indigo;
  wrap.style.cssText = `position:absolute;left:${anchor.x}px;top:${anchor.y}px;z-index:${anchor.z};width:270px;background:${wp.bg};border:1px solid ${wp.bar}40;`;

  // ── Compact header row ──
  const header = document.createElement('div');
  header.className = 'stack-header';
  const savedTitle = getStackTitles()[stackId] || '';
  const hp = PAL[savedColor] || PAL.indigo;
  header.innerHTML = `
    <button class="stack-header-color-dot" title="Mudar cor" style="width:12px;height:12px;border-radius:50%;background:${hp.bar};border:none;cursor:pointer;flex-shrink:0;padding:0;transition:transform .15s;"></button>
    <div class="shb" style="background:${hp.bar}"></div>
    <input class="stack-header-title" value="${xe(savedTitle)}" placeholder="Título da pilha…" maxlength="60">
    <span class="stack-header-count">${stackNs.length}</span>
    <button class="stack-toggle-btn" title="Expandir/recolher">▾</button>`;

  // Color picker on dot
  header.querySelector('.stack-header-color-dot').addEventListener('click', e => {
    e.stopPropagation();
    const barEl = header.querySelector('.shb');
    openStackHeaderColorPicker(e.currentTarget, stackId, barEl);
  });
  header.querySelector('.stack-header-color-dot').addEventListener('mousedown', e => e.stopPropagation());

  // Save title on change
  const titleInp = header.querySelector('.stack-header-title');
  titleInp.addEventListener('click',  e => e.stopPropagation());
  titleInp.addEventListener('mousedown', e => e.stopPropagation());
  titleInp.addEventListener('change', () => {
    const newTitle = titleInp.value.trim();
    saveStackTitle(stackId, newTitle);

    const kind = _smartStackKind(newTitle);
    const titles = getStackTitles();
    if (kind) titles[stackId + '_smart'] = kind; else delete titles[stackId + '_smart'];
    localStorage.setItem('md_stktitles_' + CU.username, JSON.stringify(titles));

    if (kind) {
      // Virou pasta inteligente "Encerrado"/"Concluído" — tudo que já está
      // dentro dela passa a ser finalizado nesse mesmo status.
      let changed = false;
      getStackNotes(stackId).forEach(n => {
        if (n.status !== kind) {
          n.status = kind;
          const el = document.querySelector('.note[data-id="'+n.id+'"]');
          if (el) applyNoteStatus(el, kind);
          changed = true;
        }
      });
      if (changed) { saveNotes(); renderStack(stackId); }
    }
  });
  titleInp.addEventListener('keydown', e => { if (e.key === 'Enter') titleInp.blur(); });

  // Make header draggable (moves whole stack)
  let swDrag = null;
  header.addEventListener('mousedown', e => {
    if (e.target.closest('.stack-toggle-btn')) return;
    const r = wrap.getBoundingClientRect();
    swDrag = { ox: e.clientX - r.left, oy: e.clientY - r.top };
    e.preventDefault();
    const onM = ev => {
      const nx = ev.clientX - swDrag.ox;
      const ny = ev.clientY - swDrag.oy;
      wrap.style.left = nx + 'px';
      wrap.style.top  = ny + 'px';
      stackNs.forEach(n => { n.x = nx; n.y = ny; });
    };
    const onU = () => {
      swDrag = null;
      saveNotes();
      window.removeEventListener('mousemove', onM);
      window.removeEventListener('mouseup',   onU);
    };
    window.addEventListener('mousemove', onM);
    window.addEventListener('mouseup',   onU);
  });

  wrap.appendChild(header);

  // ── Cards body ──
  const body = document.createElement('div');
  body.className = 'stack-body collapsed';
  body.id = 'sb-' + stackId;

  // Toggle expand/collapse — reposition stacks below after animation
  let expanded = false;
  const toggle = () => {
    expanded = !expanded;
    body.classList.toggle('collapsed', !expanded);
    header.querySelector('.stack-toggle-btn').textContent = expanded ? '▴' : '▾';
    // After CSS transition (250ms), reposition stacks below this one
    setTimeout(() => repositionStacksBelow(stackId), 260);
  };
  header.querySelector('.stack-toggle-btn').addEventListener('click', e => { e.stopPropagation(); toggle(); });
  header.addEventListener('dblclick', toggle);

  // ── Compact rows ──
  stackNs.forEach((n, i) => {
    const p = PAL[n.color] || PAL.indigo;
    const statusOpt = STATUS_OPTS.find(o => o.key === (n.status || 'todo')) || STATUS_OPTS[0];
    const row = document.createElement('div');
    row.className = 'stack-card-row';
    row.dataset.noteId = n.id;
    row.innerHTML = `
      <div class="stack-card-row-bar" style="background:${p.bar}"></div>
      <button class="stack-card-row-color" title="Mudar cor" style="width:10px;height:10px;border-radius:50%;background:${p.bar};border:none;cursor:pointer;flex-shrink:0;transition:transform .15s;padding:0;"></button>
      <span class="stack-card-row-title">${xe(n.title || '(sem título)')}</span>
      <span class="stack-card-row-status" title="${statusOpt.label}" style="display:inline-flex;align-items:center;gap:3px;flex-shrink:0;font-family:'Inter',sans-serif;font-size:.6rem;font-weight:600;color:rgba(240,240,240,.4);white-space:nowrap;">
        <span style="width:6px;height:6px;border-radius:50%;background:${statusOpt.dot};flex-shrink:0;display:inline-block;"></span>
        ${statusOpt.label}
      </span>
      <button class="stack-card-row-expand" title="Abrir nota">⤢</button>
      <button class="stack-card-row-unstack" title="Remover da pilha">↗</button>`;

    // Color picker
    row.querySelector('.stack-card-row-color').addEventListener('click', e => {
      e.stopPropagation();
      openStackCardColorPicker(e.currentTarget, n, row, stackId);
    });

    // Expand: pops the full note out as floating
    row.querySelector('.stack-card-row-expand').addEventListener('click', e => {
      e.stopPropagation();
      popNoteFromStack(n, wrap);
    });

    // Unstack: remove from stack, put back on board
    row.querySelector('.stack-card-row-unstack').addEventListener('click', e => {
      e.stopPropagation();
      unstackNote(n);
    });

    body.appendChild(row);
  });

  wrap.appendChild(body);

  // Move note elements OUT of board into wrap (hidden, managed by stack)
  stackNs.forEach(n => {
    const el = document.querySelector('.note[data-id="'+n.id+'"]');
    if (el) el.style.display = 'none'; // hidden while in stack
  });

  document.getElementById('board').appendChild(wrap);

  // After rendering, push any loose notes that overlap this stack
  requestAnimationFrame(() => {
    const wr = wrap.getBoundingClientRect();
    const board = document.getElementById('board').getBoundingClientRect();
    const wx = wr.left - board.left, wy = wr.top - board.top;
    const ww = wr.width, wh = wr.height;
    const GAP = 24;
    notes.forEach(n => {
      if (n.stackId) return;
      const el = document.querySelector(`.note[data-id="${n.id}"]`);
      if (!el) return;
      const nw = el.offsetWidth, nh = el.offsetHeight;
      if (n.x < wx + ww + GAP && n.x + nw + GAP > wx &&
          n.y < wy + wh + GAP && n.y + nh + GAP > wy) {
        n.x = wx + ww + GAP;
        el.style.left = n.x + 'px';
      }
    });
    saveNotes();
  });
}

// Pop a note out of the stack as a visible floating card
function popNoteFromStack(n, wrap) {
  const el = document.querySelector('.note[data-id="'+n.id+'"]');
  if (!el) return;
  // Show the note floating near the stack
  const r = wrap.getBoundingClientRect();
  const board = document.getElementById('board');
  el.style.display = '';
  el.style.position = 'absolute';
  el.style.left = (r.right + 16) + 'px';
  el.style.top  = r.top + 'px';
  el.style.zIndex = String(++zTop);
  board.appendChild(el);
  // Mark as "popped" (still in stack data, just temporarily visible)
  el.dataset.popped = '1';
}

function unstackNote(n) {
  if (!n.stackId) return;
  const stackId = n.stackId;

  n.stackId    = null;
  n.stackOrder = null;

  // Make note visible on board
  const el = document.querySelector('.note[data-id="'+n.id+'"]');
  const wrap = document.querySelector('.stack-wrap[data-stack="'+stackId+'"]');
  if (el) {
    const r = wrap ? wrap.getBoundingClientRect() : { left: n.x, top: n.y };
    el.style.display   = '';
    el.style.position  = 'absolute';
    el.style.left      = (r.left + 24) + 'px';
    el.style.top       = (r.top  + 24) + 'px';
    el.style.zIndex    = String(++zTop);
    document.getElementById('board').appendChild(el);
    n.x = r.left + 24; n.y = r.top + 24;
  }

  // Re-render or dissolve remaining stack
  const remaining = getStackNotes(stackId);
  wrap?.remove();
  if (remaining.length >= 2 || (remaining.length === 1 && isSmartStack(stackId))) {
    renderStack(stackId);
  } else if (remaining.length === 1) {
    const last = remaining[0];
    last.stackId = null; last.stackOrder = null;
    const lastEl = document.querySelector('.note[data-id="'+last.id+'"]');
    if (lastEl) {
      lastEl.style.display  = '';
      lastEl.style.position = 'absolute';
      lastEl.style.left     = last.x + 'px';
      lastEl.style.top      = last.y + 'px';
      lastEl.style.zIndex   = String(++zTop);
      document.getElementById('board').appendChild(lastEl);
    }
    removeStackTitle(stackId);
  }
  saveNotes();
}

/* ═══════════════════════════════════════════════════
   LEMBRETES
   Verificação periódica de prazos (1x/minuto)
═══════════════════════════════════════════════════ */

/* ── Beep de alerta via Web Audio — sem arquivo de áudio nem CDN externo,
   respeita a CSP do projeto (nenhuma origem extra precisa ser liberada). ── */
let _alertAudioCtx = null;
function playOverdueAlertSound() {
  try {
    _alertAudioCtx = _alertAudioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const ctx = _alertAudioCtx;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    const now = ctx.currentTime;
    [880, 660].forEach((freq, i) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const t0 = now + i * 0.16;
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(0.18, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.28);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + 0.3);
    });
  } catch (_) { /* Web Audio indisponível (autoplay bloqueado etc.) — falha silenciosa */ }
}

// Pisca uma vez (animação curta) no elemento que acabou de ficar atrasado,
// além do estado "overdue" permanente já aplicado via classList.
function _flashOverdueEl(el) {
  if (!el) return;
  el.classList.remove('overdue-flash'); void el.offsetWidth; // reinicia a animação CSS
  el.classList.add('overdue-flash');
  setTimeout(() => el.classList.remove('overdue-flash'), 2200);
}

// Rastreia quais notas/registros já estavam atrasados, para só alertar
// (som + flash) em transições ao vivo — nunca no carregamento inicial,
// senão tocaria som pra tudo que já estava vencido há dias.
const _overdueTrack = { notes: { init: false, set: new Set() }, records: { init: false, set: new Set() } };
function _handleOverdueTransition(track, currentIds, onNewOverdue) {
  if (!track.init) { track.init = true; track.set = new Set(currentIds); return; }
  const newlyOverdue = currentIds.filter(id => !track.set.has(id));
  track.set = new Set(currentIds);
  if (newlyOverdue.length) {
    playOverdueAlertSound();
    newlyOverdue.forEach(onNewOverdue);
  }
}

function updateBadge(n) {
  const badge = document.getElementById('nb-'+n.id);
  if (!badge) return;
  if (!n.end) { badge.style.display='none'; return; }
  const today = new Date(); today.setHours(0,0,0,0);
  const due   = new Date(n.end+'T00:00:00');
  const diff  = Math.ceil((due-today)/86400000);
  const noteEl= document.querySelector('.note[data-id="'+n.id+'"]');
  if (diff < 0) {
    badge.style.display='flex'; badge.className='n-badge urgent';
    badge.querySelector('span').textContent = 'Vencido há '+Math.abs(diff)+'d';
    if (noteEl) noteEl.classList.add('overdue');
  } else if (n.reminder && diff <= n.remDays) {
    badge.style.display='flex';
    badge.className = diff<=2 ? 'n-badge urgent' : 'n-badge warn';
    badge.querySelector('span').textContent = diff===0 ? 'Prazo: hoje!' : diff+'d para o prazo';
    if (noteEl) noteEl.classList.toggle('overdue', diff===0);
  } else {
    badge.style.display='none';
    if (noteEl) noteEl.classList.remove('overdue');
  }
}

function checkReminders() {
  notes.forEach(n => updateBadge(n));

  const today = new Date(); today.setHours(0,0,0,0);
  const overdueNoteIds = notes.filter(n => n.end && new Date(n.end+'T00:00:00') < today).map(n => n.id);
  _handleOverdueTransition(_overdueTrack.notes, overdueNoteIds, (id) => {
    _flashOverdueEl(document.querySelector('.note[data-id="'+id+'"]'));
    const n = notes.find(x => x.id === id);
    toast('⏰', (n?.title ? '"' + n.title + '"' : 'Nota') + ' passou do prazo!');
  });

  checkCRMOverdueTransitions();
  updateEventsBadge();
}

/* ═══════════════════════════════════════════════════
   PRÓXIMOS EVENTOS
   Painel com notas e vencimentos de clientes que ainda
   não venceram, dentro dos próximos 14 dias.
═══════════════════════════════════════════════════ */
function _upcomingEvents(days) {
  const today = new Date(); today.setHours(0,0,0,0);
  const limit = new Date(today); limit.setDate(limit.getDate() + days);
  const items = [];

  notes.forEach(n => {
    if (!n.end) return;
    const due = new Date(n.end + 'T00:00:00');
    if (due >= today && due <= limit) {
      items.push({ kind: 'note', id: n.id, title: n.title || 'Sem título', date: due });
    }
  });

  if (Array.isArray(_records)) {
    _records.forEach(r => {
      if (!r.dueDate || r.status === 'paid') return;
      const due = new Date(r.dueDate + 'T00:00:00');
      if (due >= today && due <= limit) {
        items.push({ kind: 'client', id: r.id, title: r.name || 'Cliente', date: due, value: r.value });
      }
    });
  }

  if (Array.isArray(_icsEvents)) {
    _icsEvents.forEach((ev, i) => {
      if (!ev.date) return;
      const due = new Date(ev.date + 'T00:00:00');
      if (due >= today && due <= limit) {
        items.push({ kind: 'ics', id: 'ics_' + i, title: ev.title || 'Evento', date: due });
      }
    });
  }

  if (Array.isArray(_outlookEvents)) {
    _outlookEvents.forEach((ev, i) => {
      if (!ev.date) return;
      const due = new Date(ev.date + 'T00:00:00');
      if (due >= today && due <= limit) {
        items.push({ kind: 'outlook', id: 'outlook_' + i, title: ev.title || 'Evento', date: due });
      }
    });
  }

  items.sort((a, b) => a.date - b.date);
  return items;
}

function _relativeDay(date) {
  const today = new Date(); today.setHours(0,0,0,0);
  const diff = Math.round((date - today) / 86400000);
  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Amanhã';
  return 'em ' + diff + ' dias';
}

function updateEventsBadge() {
  const badge = document.getElementById('events-badge');
  if (!badge) return;
  const count = _upcomingEvents(7).length; // urgência: próximos 7 dias
  if (count > 0) { badge.textContent = count; badge.style.display = 'flex'; }
  else badge.style.display = 'none';
}

function renderEventsList() {
  const host = document.getElementById('events-list');
  if (!host) return;
  const items = _upcomingEvents(14);

  if (!items.length) {
    host.innerHTML = '<div class="events-empty">Nenhum evento nos próximos 14 dias 🎉</div>';
    return;
  }

  host.innerHTML = items.map(it => `
    <div class="events-item" data-kind="${it.kind}" data-id="${it.id}">
      <span class="events-item-icon">${it.kind === 'client' ? '💼' : it.kind === 'ics' ? '📅' : it.kind === 'outlook' ? '📧' : '📝'}</span>
      <div class="events-item-body">
        <div class="events-item-title">${xe(it.title)}</div>
        <div class="events-item-sub">${it.kind === 'client' && it.value ? xe(fmtBRL(it.value)) + ' · ' : ''}${_relativeDay(it.date)}</div>
      </div>
    </div>`).join('');

  host.querySelectorAll('.events-item').forEach(el => {
    el.addEventListener('click', () => {
      const { kind, id } = el.dataset;
      document.getElementById('events-panel').classList.remove('open');
      if (kind === 'client') {
        if (!_crmMode) toggleCRMView();
        setTimeout(() => openEditRecordModal(id), 150);
      } else if (kind === 'ics' || kind === 'outlook') {
        // Evento importado do calendário — não tem nota/registro pra abrir
      } else {
        const noteEl = document.querySelector('.note[data-id="' + id + '"]');
        if (noteEl) {
          if (_crmMode) toggleCRMView();
          bringFront(noteEl, notes.find(n => n.id == id));
          noteEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          noteEl.classList.add('overdue-flash');
          setTimeout(() => noteEl.classList.remove('overdue-flash'), 1300);
        }
      }
    });
  });
}

let _eventsPanelLoaded = false;
function toggleEventsPanel() {
  const panel = document.getElementById('events-panel');
  if (!panel) return;
  const opening = !panel.classList.contains('open');
  panel.classList.toggle('open', opening);
  if (opening) {
    renderEventsList();
    if (!_eventsPanelLoaded) {
      _eventsPanelLoaded = true;
      _loadBudget(); _loadExpenses(); _loadMonthlyTasks();
    }
  }
}

function switchEventsTab(tab) {
  document.querySelectorAll('.events-tab').forEach(b => b.classList.toggle('active', b.dataset.etab === tab));
  document.querySelectorAll('.events-tab-body').forEach(b => b.classList.toggle('active', b.id === 'etab-' + tab));
}

document.addEventListener('click', e => {
  const panel = document.getElementById('events-panel');
  const btn   = document.getElementById('btn-events');
  if (!panel || !panel.classList.contains('open')) return;
  if (!panel.contains(e.target) && e.target !== btn && !btn?.contains(e.target)) {
    panel.classList.remove('open');
  }
});

/* ═══════════════════════════════════════════════════
   PAINEL PESSOAL — Orçamento, Despesas, Tarefas mensais
   Recurso 100% gratuito (sem gate de Premium).
   Persistido em users/{uid}/personal/* no Firebase, com
   fallback em localStorage no modo demo.
═══════════════════════════════════════════════════ */
function _personalPath(sub) { return 'users/' + CU.uid + '/personal/' + sub; }
function _curMonth() { return new Date().toISOString().slice(0, 7); }

const EXPENSE_CATEGORIES = [
  { key: 'alimentacao', label: 'Alimentação', icon: '🍔', color: '#f59e0b' },
  { key: 'transporte',  label: 'Transporte',  icon: '🚗', color: '#3b82f6' },
  { key: 'moradia',     label: 'Moradia',     icon: '🏠', color: '#8b5cf6' },
  { key: 'lazer',       label: 'Lazer',       icon: '🎮', color: '#ec4899' },
  { key: 'saude',       label: 'Saúde',       icon: '💊', color: '#10b981' },
  { key: 'assinaturas', label: 'Assinaturas', icon: '📱', color: '#14b8a6' },
  { key: 'outros',      label: 'Outros',      icon: '📦', color: '#64748b' },
];
function _expCat(key) { return EXPENSE_CATEGORIES.find(c => c.key === key) || EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1]; }
function _populateExpenseCatSelect() {
  const sel = document.getElementById('expense-cat-inp');
  if (!sel || sel.options.length) return;
  sel.innerHTML = EXPENSE_CATEGORIES.map(c => `<option value="${c.key}">${c.icon} ${c.label}</option>`).join('');
}

/* ── Orçamento mensal ── */
let _budgetMonthly = 0;
async function _loadBudget() {
  if (!CU) return;
  if (_fbReady && CU.uid) {
    _budgetMonthly = Number(await fbGet(_personalPath('budgetMonthly'))) || 0;
  } else {
    _budgetMonthly = Number(localStorage.getItem('md_budget_' + CU.username)) || 0;
  }
  const inp = document.getElementById('budget-monthly-inp');
  if (inp) inp.value = _budgetMonthly || '';
  renderBudgetSummary();
}
async function _saveBudgetMonthly(val) {
  _budgetMonthly = Number(val) || 0;
  if (_fbReady && CU?.uid) await fbSet(_personalPath('budgetMonthly'), _budgetMonthly);
  else localStorage.setItem('md_budget_' + CU.username, _budgetMonthly);
  renderBudgetSummary();
}
function _expensesInMonth(month) {
  return (_expenses || []).filter(e => (e.date || '').slice(0, 7) === month);
}
function renderBudgetSummary() {
  const host = document.getElementById('budget-summary');
  if (!host) return;
  const curMonth = _curMonth();
  const spent = _expensesInMonth(curMonth).reduce((s, e) => s + (Number(e.value) || 0), 0);
  const remaining = _budgetMonthly - spent;
  const pct = _budgetMonthly > 0 ? Math.min(100, Math.round((spent / _budgetMonthly) * 100)) : 0;
  const over = spent > _budgetMonthly && _budgetMonthly > 0;

  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = Math.max(1, daysInMonth - now.getDate() + 1);
  const dailyAllowance = _budgetMonthly > 0 ? Math.max(0, remaining) / daysLeft : 0;

  host.innerHTML = `
    <div class="budget-row"><span>Orçamento</span><b>${fmtBRL(_budgetMonthly)}</b></div>
    <div class="budget-row"><span>Gasto este mês</span><b>${fmtBRL(spent)}</b></div>
    <div class="budget-bar-track"><div class="budget-bar-fill ${over ? 'over' : ''}" style="width:${pct}%"></div></div>
    <div class="budget-row"><span>${over ? 'Estourou em' : 'Resta'}</span><b style="color:${over ? 'var(--clr-danger-light)' : '#6ee7b7'}">${fmtBRL(Math.abs(remaining))}</b></div>
    ${_budgetMonthly > 0 && !over ? `<div class="budget-row"><span>Sugestão/dia (${daysLeft}d restantes)</span><b>${fmtBRL(dailyAllowance)}</b></div>` : ''}`;

  renderBudgetByCategory(curMonth);
}
function renderBudgetByCategory(month) {
  const host = document.getElementById('budget-by-category');
  if (!host) return;
  const items = _expensesInMonth(month);
  if (!items.length) { host.innerHTML = '<div class="expenses-empty">Sem despesas este mês.</div>'; return; }
  const totals = {};
  items.forEach(e => { const k = e.category || 'outros'; totals[k] = (totals[k] || 0) + (Number(e.value) || 0); });
  const max = Math.max(...Object.values(totals));
  const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  host.innerHTML = sorted.map(([key, val]) => {
    const c = _expCat(key);
    return `<div class="budget-cat-row">
      <span class="budget-cat-icon">${c.icon}</span>
      <span class="budget-cat-label">${xe(c.label)}</span>
      <div class="budget-cat-track"><div class="budget-cat-fill" style="width:${Math.round(val/max*100)}%;background:${c.color}"></div></div>
      <span class="budget-cat-val">${fmtBRL(val)}</span>
    </div>`;
  }).join('');
}

/* ── Despesas (com categoria, navegação por mês e gráfico) ── */
let _expenses = [];
let _expenseViewMonth = _curMonth();
async function _loadExpenses() {
  if (!CU) return;
  if (_fbReady && CU.uid) {
    const snap = await fbGet(_personalPath('expenses'));
    _expenses = snap ? Object.entries(snap).map(([id, v]) => ({ id, ...v })) : [];
  } else {
    _expenses = JSON.parse(localStorage.getItem('md_expenses_' + CU.username) || '[]');
  }
  _populateExpenseCatSelect();
  renderExpensesList();
  renderBudgetSummary();
}
async function addExpenseFromForm() {
  const descInp = document.getElementById('expense-desc-inp');
  const valInp  = document.getElementById('expense-value-inp');
  const catInp  = document.getElementById('expense-cat-inp');
  const desc = descInp.value.trim();
  const value = parseFloat(valInp.value) || 0;
  if (!desc || value <= 0) { toast('⚠', 'Preencha descrição e valor.'); return; }
  const exp = { desc, value, category: catInp?.value || 'outros', date: new Date().toISOString().slice(0, 10) };
  if (_fbReady && CU?.uid) {
    const ref = await fbPush(_personalPath('expenses'), exp);
    exp.id = ref.key;
  } else {
    exp.id = 'exp_' + Date.now();
  }
  _expenses.push(exp);
  if (!_fbReady || !CU?.uid) localStorage.setItem('md_expenses_' + CU.username, JSON.stringify(_expenses));
  descInp.value = ''; valInp.value = '';
  _expenseViewMonth = _curMonth();
  renderExpensesList();
  renderBudgetSummary();
}
async function removeExpense(id) {
  _expenses = _expenses.filter(e => e.id !== id);
  if (_fbReady && CU?.uid) await fbRemove(_personalPath('expenses/' + id));
  else localStorage.setItem('md_expenses_' + CU.username, JSON.stringify(_expenses));
  renderExpensesList();
  renderBudgetSummary();
}
function shiftExpenseMonth(delta) {
  const [y, m] = _expenseViewMonth.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  _expenseViewMonth = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  renderExpensesList();
}
function renderExpensesList() {
  const host  = document.getElementById('expenses-list');
  const label = document.getElementById('expense-month-label');
  if (!host) return;
  if (label) {
    const [y, m] = _expenseViewMonth.split('-').map(Number);
    label.textContent = new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }
  const monthly = _expensesInMonth(_expenseViewMonth).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  _renderExpenseChart(monthly);
  if (!monthly.length) { host.innerHTML = '<div class="expenses-empty">Nenhuma despesa nesse mês.</div>'; return; }
  host.innerHTML = monthly.map(e => {
    const c = _expCat(e.category);
    return `<div class="expense-item">
      <span class="expense-item-cat" title="${xe(c.label)}">${c.icon}</span>
      <span class="expense-item-desc">${xe(e.desc)}</span>
      <span class="expense-item-val">${fmtBRL(e.value)}</span>
      <button class="expense-item-del" onclick="removeExpense('${e.id}')">${iX}</button>
    </div>`;
  }).join('');
}
function _renderExpenseChart(monthly) {
  const host = document.getElementById('expense-chart-wrap');
  if (!host) return;
  if (!monthly.length) { host.innerHTML = ''; return; }
  const totals = {};
  monthly.forEach(e => { const k = e.category || 'outros'; totals[k] = (totals[k] || 0) + (Number(e.value) || 0); });
  const sum = Object.values(totals).reduce((a, b) => a + b, 0);
  if (!sum) { host.innerHTML = ''; return; }

  const R = 34, C = 2 * Math.PI * R;
  let offset = 0;
  const arcs = Object.entries(totals).map(([key, val]) => {
    const c = _expCat(key);
    const frac = val / sum;
    const len  = frac * C;
    const rot  = (offset / sum) * 360;
    offset += val;
    return `<circle cx="40" cy="40" r="${R}" fill="none" stroke="${c.color}" stroke-width="11"
              data-target="${len} ${C - len}" stroke-dasharray="0 ${C}"
              transform="rotate(${rot - 90} 40 40)"/>`;
  }).join('');

  host.innerHTML = `<svg width="80" height="80" viewBox="0 0 80 80" class="crm-donut-svg">${arcs}</svg>
    <div class="events-panel-sub" style="display:block;">Total do mês<br><b style="color:var(--clr-text);font-family:'JetBrains Mono',monospace;font-size:.9rem;">${fmtBRL(sum)}</b></div>`;
  requestAnimationFrame(() => {
    host.querySelectorAll('circle[data-target]').forEach(c => c.setAttribute('stroke-dasharray', c.dataset.target));
  });
}

/* ── Tarefas mensais (checklist que reseta todo mês, com dia opcional) ── */
let _monthlyTasks = [];
let _monthlyTasksLastReset = '';
async function _loadMonthlyTasks() {
  if (!CU) return;
  let data;
  if (_fbReady && CU.uid) data = await fbGet(_personalPath('monthlyTasks'));
  else data = JSON.parse(localStorage.getItem('md_mtasks_' + CU.username) || 'null');
  data = data || { items: [], lastReset: '' };
  _monthlyTasks = Array.isArray(data.items) ? data.items : Object.values(data.items || {});
  _monthlyTasksLastReset = data.lastReset || '';

  const curMonth = _curMonth();
  if (_monthlyTasksLastReset !== curMonth) {
    _monthlyTasks.forEach(t => t.done = false);
    _monthlyTasksLastReset = curMonth;
    await _saveMonthlyTasks();
  }
  renderMonthlyTasks();
}
async function _saveMonthlyTasks() {
  const payload = { items: _monthlyTasks, lastReset: _monthlyTasksLastReset };
  if (_fbReady && CU?.uid) await fbSet(_personalPath('monthlyTasks'), payload);
  else localStorage.setItem('md_mtasks_' + CU.username, JSON.stringify(payload));
}
function addMonthlyTask() {
  _monthlyTasks.push({ id: 'mt_' + Date.now(), text: '', done: false, day: null });
  _saveMonthlyTasks();
  renderMonthlyTasks();
  const inputs = document.querySelectorAll('#mtasks-list .mtask-item input[type=text]');
  inputs[inputs.length - 1]?.focus();
}
function renderMonthlyTasks() {
  const host = document.getElementById('mtasks-list');
  if (!host) return;
  if (!_monthlyTasks.length) { host.innerHTML = '<div class="mtasks-empty">Nenhuma tarefa ainda.</div>'; return; }
  const today = new Date().getDate();
  host.innerHTML = _monthlyTasks.map((t, i) => {
    const late = !t.done && t.day && Number(t.day) < today;
    return `<div class="mtask-item ${t.done ? 'done' : ''} ${late ? 'mtask-late' : ''}" data-i="${i}">
      <input type="checkbox" ${t.done ? 'checked' : ''}>
      <input type="text" value="${sanitizeAttr(t.text || '')}" placeholder="Tarefa do mês…">
      <input type="number" class="mtask-item-day" min="1" max="31" placeholder="dia" value="${t.day || ''}" title="Dia do mês (opcional) — alerta se passar sem concluir">
      <button class="mtask-item-del">${iX}</button>
    </div>`;
  }).join('');
  host.querySelectorAll('.mtask-item').forEach(row => {
    const idx = Number(row.dataset.i);
    row.querySelector('input[type=checkbox]').addEventListener('change', e => {
      _monthlyTasks[idx].done = e.target.checked;
      _saveMonthlyTasks();
      renderMonthlyTasks();
    });
    row.querySelector('input[type=text]').addEventListener('input', e => {
      _monthlyTasks[idx].text = e.target.value;
      _saveMonthlyTasks();
    });
    row.querySelector('.mtask-item-day').addEventListener('change', e => {
      const v = parseInt(e.target.value) || null;
      _monthlyTasks[idx].day = v && v >= 1 && v <= 31 ? v : null;
      _saveMonthlyTasks();
      renderMonthlyTasks();
    });
    row.querySelector('.mtask-item-del').addEventListener('click', () => {
      _monthlyTasks.splice(idx, 1);
      _saveMonthlyTasks();
      renderMonthlyTasks();
    });
  });
}

/* ── Importar calendário (.ics) na aba Eventos ── */
let _icsEvents = [];
function _loadIcsEvents() {
  if (!CU) return;
  _icsEvents = JSON.parse(localStorage.getItem('md_ics_' + CU.username) || '[]');
}
function _parseIcs(text) {
  const events = [];
  const blocks = text.split('BEGIN:VEVENT').slice(1);
  blocks.forEach(block => {
    const summaryMatch = block.match(/SUMMARY:(.*)/);
    const dtMatch      = block.match(/DTSTART[^:]*:(\d{8})/);
    if (!summaryMatch || !dtMatch) return;
    const raw = dtMatch[1]; // YYYYMMDD
    const iso = raw.slice(0, 4) + '-' + raw.slice(4, 6) + '-' + raw.slice(6, 8);
    events.push({ title: summaryMatch[1].trim().replace(/\\,/g, ','), date: iso });
  });
  return events;
}
document.addEventListener('change', e => {
  if (e.target?.id !== 'ics-file-inp') return;
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const parsed = _parseIcs(String(reader.result || ''));
    if (!parsed.length) { toast('⚠', 'Nenhum evento encontrado no arquivo.'); return; }
    _icsEvents = _icsEvents.concat(parsed);
    localStorage.setItem('md_ics_' + CU.username, JSON.stringify(_icsEvents));
    toast('📅', parsed.length + ' evento(s) importado(s)!');
    renderEventsList();
    updateEventsBadge();
  };
  reader.readAsText(file);
  e.target.value = '';
});

document.addEventListener('change', e => {
  if (e.target?.id !== 'budget-monthly-inp') return;
  _saveBudgetMonthly(e.target.value);
});

/* ═══════════════════════════════════════════════════
   CONEXÃO COM OUTLOOK (Microsoft Graph, OAuth2 + PKCE)
   Requer um App Registration no Azure AD (client público,
   sem secret). Sem isso não tem como funcionar: é a Microsoft
   quem exige um app registrado pra emitir token — não existe
   atalho técnico, vale pra qualquer site (Notion, Slack, etc.
   fazem o mesmo, só que uma vez só, do lado deles).

   OUTLOOK_CLIENT_ID: preencha aqui o Application (client) ID
   do App Registration do MyDesk assim que ele existir — a
   partir daí TODOS os usuários clicam "Conectar Outlook" e
   caem direto na tela de login da Microsoft, sem nenhum passo
   extra (igual Notion). Enquanto ficar vazio, cada usuário
   configura o dele uma única vez pelo modal abaixo.
═══════════════════════════════════════════════════ */
const OUTLOOK_CLIENT_ID = ''; // ← cole aqui o Client ID assim que o App Registration existir
const OUTLOOK_SCOPES = 'openid profile Calendars.Read offline_access';

function _b64url(bytes) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
async function _pkcePair() {
  const verifier = _b64url(crypto.getRandomValues(new Uint8Array(32)));
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return { verifier, challenge: _b64url(hash) };
}
function _outlookRedirectUri() {
  return window.location.origin + window.location.pathname;
}
function _outlookClientId() {
  return OUTLOOK_CLIENT_ID || localStorage.getItem('md_outlook_client_id') || '';
}

async function connectOutlook() {
  const clientId = _outlookClientId();
  if (clientId) return _startOutlookAuth(clientId);
  openOutlookSetupModal();
}

/* Modal de configuração única — some para sempre assim que
   OUTLOOK_CLIENT_ID for preenchido no código. */
function openOutlookSetupModal() {
  document.querySelector('.outlook-modal-bg')?.remove();
  const bg = document.createElement('div');
  bg.className = 'modal-bg outlook-modal-bg';
  bg.innerHTML = `
    <div class="modal" style="max-width:440px;">
      <div class="outlook-modal-brand">
        <svg width="20" height="20" viewBox="0 0 23 23"><rect x="1" y="1" width="10" height="10" fill="#f25022"/><rect x="12" y="1" width="10" height="10" fill="#7fba00"/><rect x="1" y="12" width="10" height="10" fill="#00a4ef"/><rect x="12" y="12" width="10" height="10" fill="#ffb900"/></svg>
        Microsoft
      </div>
      <div class="m-h1">Conectar sua conta Outlook</div>
      <div class="m-sub">Configuração única do MyDesk. Depois disso é só clicar e entrar com sua conta — igual Notion, Slack ou Zoom.</div>
      <div class="m-lbl">Client ID do App Registration</div>
      <input class="m-inp" id="outlook-m-clientid" placeholder="ex: a1b2c3d4-5678-90ab-cdef-1234567890ab">
      <div class="outlook-modal-help">Ainda não tem um? <a href="https://portal.azure.com" target="_blank" rel="noopener">Crie em portal.azure.com</a> → App registrations → New registration (~3 min, gratuito).</div>
      <div class="m-btns">
        <button class="m-cancel" id="outlook-m-cancel">Cancelar</button>
        <button class="m-confirm" id="outlook-m-confirm">Continuar para Microsoft →</button>
      </div>
    </div>`;
  document.body.appendChild(bg);
  const inp = bg.querySelector('#outlook-m-clientid');
  bg.querySelector('#outlook-m-cancel').onclick = () => bg.remove();
  bg.addEventListener('click', e => { if (e.target === bg) bg.remove(); });
  bg.querySelector('#outlook-m-confirm').onclick = () => {
    const id = inp.value.trim();
    if (!id) { inp.style.borderColor = 'var(--clr-danger)'; inp.focus(); return; }
    localStorage.setItem('md_outlook_client_id', id);
    bg.remove();
    _startOutlookAuth(id);
  };
  setTimeout(() => inp.focus(), 80);
}

async function _startOutlookAuth(clientId) {
  const { verifier, challenge } = await _pkcePair();
  sessionStorage.setItem('md_outlook_verifier', verifier);
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: _outlookRedirectUri(),
    response_mode: 'query',
    scope: OUTLOOK_SCOPES,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state: 'md_outlook',
  });
  window.location.href = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize?' + params.toString();
}

async function _handleOutlookRedirect() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('state') !== 'md_outlook' || !params.get('code')) return;
  const code     = params.get('code');
  const verifier = sessionStorage.getItem('md_outlook_verifier');
  const clientId = _outlookClientId();
  window.history.replaceState({}, '', window.location.pathname); // limpa ?code=... da URL
  if (!verifier || !clientId) return;

  try {
    const body = new URLSearchParams({
      client_id: clientId,
      grant_type: 'authorization_code',
      code,
      redirect_uri: _outlookRedirectUri(),
      code_verifier: verifier,
    });
    const res = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    const data = await res.json();
    if (!data.access_token) throw new Error(data.error_description || 'sem access_token');
    localStorage.setItem('md_outlook_token', data.access_token);
    if (data.refresh_token) localStorage.setItem('md_outlook_refresh', data.refresh_token);
    toast('📅', 'Outlook conectado!');
    await _syncOutlookEvents();
  } catch (e) {
    console.error('[Outlook] erro no token:', e);
    toast('⚠', 'Falha ao conectar com o Outlook.');
  }
}

async function _refreshOutlookToken() {
  const refreshToken = localStorage.getItem('md_outlook_refresh');
  const clientId     = _outlookClientId();
  if (!refreshToken || !clientId) return false;
  try {
    const body = new URLSearchParams({
      client_id: clientId,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      scope: OUTLOOK_SCOPES,
    });
    const res = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    const data = await res.json();
    if (!data.access_token) return false;
    localStorage.setItem('md_outlook_token', data.access_token);
    if (data.refresh_token) localStorage.setItem('md_outlook_refresh', data.refresh_token);
    return true;
  } catch (_) { return false; }
}

let _outlookEvents = [];
async function _syncOutlookEvents(isRetry) {
  const token = localStorage.getItem('md_outlook_token');
  if (!token) return;
  try {
    const now = new Date();
    const end = new Date(); end.setDate(end.getDate() + 30);
    const url = 'https://graph.microsoft.com/v1.0/me/calendarview?startDateTime=' + now.toISOString() +
                '&endDateTime=' + end.toISOString() + '&$top=50&$select=subject,start';
    const res = await fetch(url, { headers: { Authorization: 'Bearer ' + token } });
    if (res.status === 401 && !isRetry && await _refreshOutlookToken()) {
      return _syncOutlookEvents(true);
    }
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    _outlookEvents = (data.value || []).map(ev => ({
      title: ev.subject || 'Evento',
      date: (ev.start?.dateTime || '').slice(0, 10),
    }));
    if (CU?.username) localStorage.setItem('md_outlook_cache_' + CU.username, JSON.stringify(_outlookEvents));
    const btn = document.getElementById('outlook-connect-btn');
    const lbl = document.getElementById('outlook-btn-label');
    if (btn) btn.classList.add('connected');
    if (lbl) lbl.textContent = 'Outlook (' + _outlookEvents.length + ')';
    renderEventsList();
    updateEventsBadge();
  } catch (e) {
    console.error('[Outlook] erro ao buscar eventos:', e);
  }
}
function _loadOutlookCache() {
  if (!CU?.username) return;
  _outlookEvents = JSON.parse(localStorage.getItem('md_outlook_cache_' + CU.username) || '[]');
  if (localStorage.getItem('md_outlook_token')) {
    const btn = document.getElementById('outlook-connect-btn');
    const lbl = document.getElementById('outlook-btn-label');
    if (btn) btn.classList.add('connected');
    if (lbl) lbl.textContent = 'Outlook (' + _outlookEvents.length + ')';
  }
}

function checkCRMOverdueTransitions() {
  if (typeof _records === 'undefined' || !_records.length) return;
  updateCRMDashboard();
  const overdueIds = _records.filter(r => isOverdue(r)).map(r => r.id);
  _handleOverdueTransition(_overdueTrack.records, overdueIds, (id) => {
    const rec = _records.find(r => r.id === id);
    _flashOverdueEl(document.querySelector('tr[data-id="'+id+'"]'));
    toast('⏰', (rec?.name || 'Cliente') + ' está com pagamento atrasado!');
  });
}

function startRemCheck()  { checkReminders(); remTmr=setInterval(checkReminders,60000); }
function stopRemCheck()   { if(remTmr){clearInterval(remTmr);remTmr=null;} }

/* ═══════════════════════════════════════════════════
   PERSISTÊNCIA DAS NOTAS
   Firebase Realtime DB (primário) + localStorage (fallback)
═══════════════════════════════════════════════════ */
/* ── Note persistence: Firebase primary, localStorage fallback ── */
function _noteToRaw(n) {
  return {
    id:n.id, color:n.color, title:n.title, body:n.body,
    start:n.start||'', end:n.end||'', reminder:n.reminder||false, remDays:n.remDays||3,
    status:n.status||'todo', checklist:n.checklist||[],
    titleH:n.titleH||0, bodyH:n.bodyH||0,
    w:n.w||0, h:n.h||0,
    x:n.x, y:n.y, z:n.z,
    stackId:n.stackId||null, stackOrder:n.stackOrder||0, pinned:n.pinned||false,
    files:(n.files||[]).map(f=>({name:f.name,size:f.size,type:f.type,dataUrl:f.dataUrl})),
    _isClientNote: n._isClientNote || false,
    _crmRecordId: n._crmRecordId || null
  };
}

// Save all personal notes to Firebase (debounced to avoid hammering)
let _saveNotesTmr = null;
function saveNotesRaw(u, arr) {
  // Keep localStorage as cache for offline/demo mode
  localStorage.setItem('md_n_' + u, JSON.stringify(arr));
  // Save to Firebase — use UID (immutable) not username (mutable)
  if (!_fbReady || !CU || !CU.uid) return;
  const path = 'users/' + CU.uid + '/notes';
  
  const obj = {};
  arr.forEach(n => { obj[n.id] = n; });
  // Corrigido: Impede que o salvamento de notas delete os clientes do banco
  if (typeof _records !== 'undefined') {
    _records.forEach(r => { obj[r.id] = r; });
  }
  
  if (Object.keys(obj).length === 0) {
    fbSet(path, null).catch(e => console.warn('[saveNotes] Firebase error:', e.message));
  } else {
    fbSet(path, obj).catch(e => console.warn('[saveNotes] Firebase error:', e.message));
  }
}

async function loadNotesRaw(u) {
  // For real Firebase accounts, always use Firebase as source of truth
  if (_fbReady && CU && CU.uid && !CU.uid.startsWith('demo_')) {
    try {
      const snap = await fbGet('users/' + CU.uid + '/notes');
      if (snap) {
        const arr = Object.values(snap);
        localStorage.setItem('md_n_' + u, JSON.stringify(arr)); // update cache
        return arr;
      }
      // Firebase empty = new account, no notes yet — DO NOT migrate localStorage
      // (localStorage may contain old demo notes from a different account)
      return [];
    } catch {
      // Firebase failed — use localStorage cache as fallback
      try { return JSON.parse(localStorage.getItem('md_n_' + u) || '[]'); } catch { return []; }
    }
  }
  // Demo/offline mode — use localStorage only
  try { return JSON.parse(localStorage.getItem('md_n_' + u) || '[]'); } catch { return []; }
}

function saveNotes() {
  if (!CU || !CU.uid) return;
  if (_activeGroupWs) { notes.forEach(n => saveGroupNote(n)); return; }
  if (_activeWs)      { notes.forEach(n => saveSharedNote(n)); return; }
  clearTimeout(_saveNotesTmr);
  const savedUid = CU.uid;
  const savedPWs = _activePersonalWs?.id || null;
  _saveNotesTmr = setTimeout(() => {
    if (!CU || CU.uid !== savedUid) return;
    const arr = notes.map(n => _noteToRaw(n));
    if (savedPWs && _activePersonalWs?.id === savedPWs && _fbReady) {
      // Save to custom workspace Firebase path
      const obj = {};
      arr.forEach(n => { obj[n.id] = n; });
      // Impede deleção dos clientes no workspace personalizado
      if (typeof _records !== 'undefined') _records.forEach(r => { obj[r.id] = r; });
      fbSet(_pwPath(savedPWs), Object.keys(obj).length ? obj : null).catch(() => {});
    } else if (!savedPWs) {
      saveNotesRaw(CU.username, arr);
    }
  }, 500);
}

/* ═══════════════════════════════════════════════════
   REMOÇÃO DE NOTA
   Apaga do DOM, do estado e do Firebase
═══════════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════════
   SISTEMA DE BACKUP E RESTAURAÇÃO
   Guarda o último estado antes de qualquer deleção.
   Restaura com um clique no botão "Restaurar".
   Escopo: nota individual, "limpar tudo" e workspace.
═══════════════════════════════════════════════════════ */

// Backup state — only one level (last action)
let _backup = null;
// {
//   type: 'note' | 'all' | 'workspace',
//   snapshot: deep copy of notes array,
//   label: human-readable description,
//   workspaceKey: key (for shared workspaces),
//   groupId: groupId (for group workspaces),
// }

let _restoreTimer = null; // auto-hide timer

function _takeBackup(type, label) {
  // Deep-copy current notes (including files)
  _backup = {
    type,
    label,
    snapshot: notes.map(n => ({ ...n, files: (n.files || []).map(f => ({ ...f })) })),
    workspaceKey: _activeWs?.key || null,
    groupId:      _activeGroupWs?.groupId || null,
    ts: Date.now(),
  };
  _showRestoreBtn(label);
}

function _showRestoreBtn(label) {
  const btn = document.getElementById('btn-restore');
  if (!btn) return;
  btn.style.display = 'inline-flex';
  btn.title = 'Restaurar: ' + label;
  // Auto-hide after 30s
  clearTimeout(_restoreTimer);
  _restoreTimer = setTimeout(() => {
    btn.style.display = 'none';
    _backup = null;
  }, 30000);
}

function _hideRestoreBtn() {
  const btn = document.getElementById('btn-restore');
  if (btn) btn.style.display = 'none';
  clearTimeout(_restoreTimer);
  _backup = null;
}

async function doRestore() {
  if (!_backup) { toast('ℹ', 'Nenhum backup disponível.'); return; }

  const { snapshot, type, label, workspaceKey, groupId } = _backup;

  // Clear current board
  closeAllViewers();
  document.querySelectorAll('.note').forEach(e => e.remove());
  document.querySelectorAll('.stack-wrap').forEach(e => e.remove());

  // Restore notes array
  notes = snapshot.map(r => ({ ...r, files: (r.files || []).map(f => ({ ...f })) }));
  zTop  = Math.max(10, ...notes.map(n => n.z || 0));

  // Re-mount all notes
  notes.forEach(n => mountNote(n));

  // Restore stacks
  const stackIds = [...new Set(notes.filter(n => n.stackId).map(n => n.stackId))];
  setTimeout(() => stackIds.forEach(sid => renderStack(sid)), 0);

  // Persist restored state
  if (_activeGroupWs && groupId === _activeGroupWs.groupId && _fbReady) {
    // Restore to group workspace Firebase
    notes.forEach(n => saveGroupNote(n));
    toast('↩', 'Workspace do grupo restaurado.');
  } else if (_activeWs && workspaceKey === _activeWs.key && _fbReady) {
    // Restore to shared workspace
    notes.forEach(n => saveSharedNote(n));
    toast('↩', 'Workspace compartilhado restaurado.');
  } else {
    saveNotes();
    const msg = type === 'note' ? 'Nota restaurada.' : 'Board restaurado.';
    toast('↩', msg);
  }

  syncCount();
  _hideRestoreBtn();

  // Re-criar registros CRM de notas de cliente restauradas
  // (foram deletados junto com a nota — agora precisam voltar)
  const clientNotes = notes.filter(n => n._isClientNote && n._crmRecordId);
  if (clientNotes.length > 0) {
    clientNotes.forEach(n => {
      // Verificar se o registro ainda existe em _records
      const already = _records.find(r => r.id === n._crmRecordId);
      if (!already) {
        // Recriar o registro CRM com os dados da nota
        const rec = {
          id:           n._crmRecordId,
          type:         'client',
          name:         n.title || 'Sem nome',
          description:  n.body  || '',
          value:        0,
          status:       'pending',
          dueDate:      n.end   || '',
          createdAt:    Date.now(),
          updatedAt:    Date.now(),
          color:        n.color || 'indigo',
          sourceNoteId: n.id
        };
        // Salvar diretamente no Firebase
        const db = _crmDB();
        if (db) {
          db.ref(_recBasePath() + '/' + rec.id).set(rec).catch(e =>
            console.warn('[CRM] restore record error:', e)
          );
        } else {
          // Modo demo: adicionar em memória
          _records.unshift(rec);
          renderRecordsTable();
          updateCRMDashboard();
        }
      }
    });
    toast('↩', type === 'note' ? 'Nota e cliente restaurados.' : 'Board restaurado.');
  }
}

function removeNote(id) {
  const n = notes.find(n => n.id === id);
  // If note belongs to a stack and is just "popped" (temporarily shown), hide it back
  if (n && n.stackId) {
    const el = document.querySelector('.note[data-id="'+id+'"]');
    if (el) {
      el.style.transition = 'opacity .18s,transform .18s';
      el.style.opacity = '0'; el.style.transform = 'scale(.9) translateY(4px)';
      setTimeout(() => {
        el.style.display = 'none';
        el.style.opacity = '';
        el.style.transform = '';
        el.style.transition = '';
        delete el.dataset.popped;
        // Update the title in the stack row in case it was edited
        const row = document.querySelector(`.stack-card-row[data-note-id="${id}"]`);
        if (row) {
          const p = PAL[n.color] || PAL.indigo;
          // Update title
          const titleEl = row.querySelector('.stack-card-row-title');
          if (titleEl) titleEl.textContent = n.title || '(sem título)';
          // Update color dot and bar
          const colorDot = row.querySelector('.stack-card-row-color');
          if (colorDot) colorDot.style.background = p.bar;
          const bar = row.querySelector('.stack-card-row-bar');
          if (bar) bar.style.background = p.bar;
          // Update status badge
          const statusOpt = STATUS_OPTS.find(o => o.key === (n.status || 'todo')) || STATUS_OPTS[0];
          const badge = row.querySelector('.stack-card-row-status');
          if (badge) badge.innerHTML = `<span style="width:6px;height:6px;border-radius:50%;background:${statusOpt.dot};flex-shrink:0;display:inline-block;"></span> ${statusOpt.label}`;
        }
      }, 200);
    }
    saveNotes();
    return;
  }
  // ── Take backup before destructive deletion ──
  _takeBackup('note', '"' + (n?.title || 'sem título') + '"');
  closeViewer(id);
  if (_activeGroupWs) removeGroupNote(id);
  else if (_activeWs) removeSharedNote(id);
  notes = notes.filter(n => n.id !== id);
  const el = document.querySelector('.note[data-id="'+id+'"]');
  if (el) {
    el.style.transition = 'opacity .18s,transform .18s';
    el.style.opacity = '0'; el.style.transform = 'scale(.9) translateY(4px)';
    setTimeout(() => el.remove(), 200);
  }
  // Se é nota de cliente, remover também o registro CRM vinculado
  if (n && n._isClientNote && n._crmRecordId) {
    deleteRecord(n._crmRecordId);
  }
  saveNotes(); syncCount();
}

/* ── PDF.js self-hospedado (docs/js/vendor/pdfjs) ──
   Antes carregava de cdnjs.cloudflare.com, mas a CSP do site só libera
   script-src 'self' — o script nunca era executado de verdade, o visualizador
   de PDF sempre caía no fallback de erro em produção. O worker precisa virar
   uma blob: URL (fetch + Blob) porque worker-src da CSP só permite blob:. */
let _pdfJsLoadPromise = null;
function _ensurePdfJs() {
  if (_pdfJsLoadPromise) return _pdfJsLoadPromise;
  _pdfJsLoadPromise = new Promise((resolve, reject) => {
    const finish = async () => {
      const lib = window['pdfjs-dist/build/pdf'];
      if (!lib) { reject(new Error('pdfjs global não encontrado')); return; }
      if (!lib.GlobalWorkerOptions.workerSrc) {
        try {
          const res  = await fetch('js/vendor/pdfjs/pdf.worker.min.js');
          const code = await res.text();
          const blob = new Blob([code], { type: 'application/javascript' });
          lib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(blob);
        } catch (e) { reject(e); return; }
      }
      resolve(lib);
    };
    if (window['pdfjs-dist/build/pdf']) { finish(); return; }
    const script = document.createElement('script');
    script.src = 'js/vendor/pdfjs/pdf.min.js';
    script.onload = finish;
    script.onerror = () => reject(new Error('Falha ao carregar PDF.js'));
    document.head.appendChild(script);
  });
  return _pdfJsLoadPromise;
}

/* ═══════════════════════════════════════════════════
   SISTEMA DE ARQUIVOS
   Upload, validação, renderização e exclusão de anexos
═══════════════════════════════════════════════════ */
function renderFiles(n) {
  const area = document.getElementById('nf-'+n.id); if(!area) return; area.innerHTML='';
  n.files.forEach((f, i) => {
    const d = document.createElement('div'); d.className = 'f-item';
    const eyeSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;

    // ── Build row with DOM API (never inject user data into innerHTML) ──
    const icoEl = document.createElement('span');
    icoEl.innerHTML = fIco(f.type); // fIco is static SVG, safe

    const nameEl = document.createElement('span');
    nameEl.className = 'f-name';
    nameEl.style.cssText = 'flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.71rem;cursor:pointer;';
    nameEl.textContent = f.name; // textContent — XSS safe

    const szEl = document.createElement('span');
    szEl.className = 'f-sz';
    szEl.textContent = fSz(f.size);

    const eyeBtn = document.createElement('button');
    eyeBtn.className = 'f-eye';
    eyeBtn.title = 'Visualizar';
    eyeBtn.innerHTML = eyeSvg;

    // Validate dataUrl before using as href (blocks javascript: URIs)
    const safeUrl = safeDataUrl(f.dataUrl);
    const dlLink = document.createElement('a');
    dlLink.className = 'f-dl-icon';
    dlLink.title = 'Baixar';
    dlLink.style.cssText = 'color:rgba(240,240,240,.22);display:flex;align-items:center;padding:0 2px;transition:color .15s;';
    if (safeUrl) {
      dlLink.href = safeUrl;
      dlLink.download = f.name;
    } else {
      dlLink.removeAttribute('href');
    }
    dlLink.innerHTML = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>';

    const delBtn = document.createElement('button');
    delBtn.className = 'f-del';
    delBtn.textContent = '×';

    d.appendChild(icoEl);
    d.appendChild(nameEl);
    d.appendChild(szEl);
    d.appendChild(eyeBtn);
    d.appendChild(dlLink);
    d.appendChild(delBtn);

    delBtn.addEventListener('click', () => {
      closeViewer(n.id);
      if (_activeGroupWs && f.id) {
        // Remove from Firebase DB — syncs deletion to all members
        removeGroupNoteFile(n.id, f.id);
        n.files.splice(i, 1); renderFiles(n);
      } else {
        n.files.splice(i, 1); renderFiles(n);
        if (_activeWs) saveSharedNote(n);
        else saveNotes();
      }
    });
    const openPreview = () => openViewer(n, f, d);
    eyeBtn.addEventListener('click', openPreview);
    nameEl.addEventListener('click', openPreview);
    area.appendChild(d);
  });
  const drop = document.createElement('div'); drop.className = 'f-drop';
  drop.innerHTML = `<input type="file" multiple><span>＋ Anexar arquivo</span>`;
  drop.querySelector('input').addEventListener('change', e => addFiles(n, e.target.files));
  drop.addEventListener('dragover',  e => { e.preventDefault(); drop.classList.add('drag-on'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('drag-on'));
  drop.addEventListener('drop',      e => { e.preventDefault(); drop.classList.remove('drag-on'); addFiles(n, e.dataTransfer.files); });
  area.appendChild(drop);
}

/* ═══════════════════════════════════════════════════
   VISUALIZADOR DE ARQUIVOS
   PDF.js para PDFs, zoom+pan para imagens, fallback texto
═══════════════════════════════════════════════════ */
const viewers = new Map(); // noteId → { el, noteId }

function openViewer(n, f, itemEl) {
  // If this note already has a viewer open for this same file, close it (toggle)
  if (viewers.has(n.id)) {
    const existing = viewers.get(n.id);
    if (existing.fileName === f.name && existing.fileSize === f.size) {
      closeViewer(n.id);
      return;
    }
    closeViewer(n.id);
  }

  const noteEl = document.querySelector('.note[data-id="'+n.id+'"]');
  if (!noteEl) return;

  // Auto-pin the note so it stays expanded while viewer is open
  if (!n.pinned) {
    n.pinned = true;
    n._autopinned = true; // mark as auto-pinned (to unpin on close)
    noteEl.classList.add('pinned');
    const pinBtn = noteEl.querySelector('.n-pin-btn');
    if (pinBtn) pinBtn.classList.add('active');
    saveNotes();
  }

  noteEl.querySelectorAll('.f-item').forEach(el => el.classList.remove('viewing'));
  if (itemEl) itemEl.classList.add('viewing');

  const isPdf   = (f.type === 'application/pdf');
  const isImage = (f.type || '').startsWith('image/');
  const hasZoom = isPdf || isImage;
  const ext     = f.name.split('.').pop().toUpperCase().slice(0,6);
  const xSvg    = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;

  const viewer = document.createElement('div');
  viewer.className = 'f-viewer';
  viewer.dataset.noteId = n.id;

  viewer.innerHTML = `
    <div class="fv-header">
      <span class="fv-name" title="${xe(f.name)}">${xe(f.name)}</span>
      <span class="fv-type">${ext}</span>
      <a href="${f.dataUrl}" download="${f.name}" class="fv-dl-btn" style="padding:4px 8px;font-size:.68rem;margin:0" title="Baixar">↓</a>
      <button class="fv-close" id="fv-close-btn">${xSvg}</button>
      ${hasZoom ? `
      <div class="fv-zoom-bar">
        <button class="fv-zoom-btn" id="fv-zoom-out">−</button>
        <span class="fv-zoom-val" id="fv-zoom-val">100%</span>
        <button class="fv-zoom-btn" id="fv-zoom-in">+</button>
        <button class="fv-zoom-reset" id="fv-zoom-reset">${isImage ? 'ajustar tela' : 'ajustar à largura'}</button>
        <span class="fv-zoom-spacer"></span>
      </div>` : ''}
    </div>
    <div class="fv-body" id="fv-body-${n.id}"></div>`;

  positionViewer(noteEl, viewer);
  noteEl.classList.add('has-viewer');
  $('board').appendChild(viewer);

  const body = viewer.querySelector('.fv-body');

  // ── Shared zoom state ──
  let pdfRef    = null;
  let zoomLevel = 1.0;   // PDF: multiplier on fit-width; Image: CSS scale factor

  // ── PDF re-render ──
  function reRenderPdf() {
    if (!pdfRef) return;
    body.innerHTML = '';
    body.style.cssText += ';padding:10px;flex-direction:column;align-items:center;justify-content:flex-start;overflow-y:auto;gap:10px;';
    const renderPage = (pageNum) => {
      pdfRef.getPage(pageNum).then(page => {
        const dpr       = window.devicePixelRatio || 1;
        const bodyWidth = body.clientWidth - 20;
        const baseVP    = page.getViewport({ scale: 1 });
        const fitScale  = bodyWidth / baseVP.width;
        const scale     = fitScale * zoomLevel * dpr;
        const viewport  = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        canvas.width  = viewport.width;
        canvas.height = viewport.height;
        canvas.style.cssText = [
          'display:block',
          'width:'  + Math.round(viewport.width  / dpr) + 'px',
          'height:' + Math.round(viewport.height / dpr) + 'px',
          'border-radius:6px',
          'box-shadow:0 3px 14px rgba(0,0,0,.5)',
          'background:#fff',
          'flex-shrink:0',
        ].join(';');
        body.appendChild(canvas);

        const badge = document.createElement('div');
        badge.style.cssText = 'font-family:JetBrains Mono,monospace;font-size:.6rem;color:rgba(240,240,240,.3);text-align:center;flex-shrink:0;';
        badge.textContent = pageNum + ' / ' + pdfRef.numPages;
        body.appendChild(badge);

        page.render({ canvasContext: canvas.getContext('2d'), viewport })
          .promise.then(() => { if (pageNum < pdfRef.numPages) renderPage(pageNum + 1); });
      });
    };
    renderPage(1);
  }

  // ── Image zoom + pan (lupa) ──
  let imgEl   = null;   // set after renderViewerContent
  let panX    = 0;      // current pan offset in px
  let panY    = 0;
  let isPanning = false;
  let panStartX = 0, panStartY = 0, panOriginX = 0, panOriginY = 0;

  function applyImageZoom() {
    if (!imgEl) return;
    // keep pan within bounds
    clampPan();
    imgEl.style.transform   = `translate(${panX}px, ${panY}px) scale(${zoomLevel})`;
    imgEl.style.transformOrigin = 'center center';
    imgEl.style.transition  = isPanning ? 'none' : 'transform .15s ease';
    body.style.overflow     = 'hidden';   // we handle pan manually
    body.style.cursor       = zoomLevel > 1 ? (isPanning ? 'grabbing' : 'grab') : 'default';
    body.style.alignItems   = 'center';
    body.style.justifyContent = 'center';
  }

  function clampPan() {
    if (zoomLevel <= 1) { panX = 0; panY = 0; return; }
    // how much the image sticks out on each side
    const bw = body.clientWidth;
    const bh = body.clientHeight;
    const iw = imgEl.naturalWidth  || imgEl.clientWidth  || bw;
    const ih = imgEl.naturalHeight || imgEl.clientHeight || bh;
    // scaled size of the image
    const sw = Math.min(iw, bw) * zoomLevel;
    const sh = Math.min(ih, bh) * zoomLevel;
    const maxX = Math.max(0, (sw - bw) / 2);
    const maxY = Math.max(0, (sh - bh) / 2);
    panX = Math.max(-maxX, Math.min(maxX, panX));
    panY = Math.max(-maxY, Math.min(maxY, panY));
  }

  function setupImagePan() {
    body.addEventListener('mousedown', (e) => {
      if (zoomLevel <= 1 || !imgEl) return;
      e.preventDefault();
      isPanning   = true;
      panStartX   = e.clientX;
      panStartY   = e.clientY;
      panOriginX  = panX;
      panOriginY  = panY;
      body.style.cursor = 'grabbing';
    });
    window.addEventListener('mousemove', (e) => {
      if (!isPanning) return;
      panX = panOriginX + (e.clientX - panStartX);
      panY = panOriginY + (e.clientY - panStartY);
      applyImageZoom();
    });
    window.addEventListener('mouseup', () => {
      if (!isPanning) return;
      isPanning = false;
      if (imgEl) body.style.cursor = zoomLevel > 1 ? 'grab' : 'default';
    });
    // touch support
    body.addEventListener('touchstart', (e) => {
      if (zoomLevel <= 1 || !imgEl || e.touches.length !== 1) return;
      isPanning  = true;
      panStartX  = e.touches[0].clientX;
      panStartY  = e.touches[0].clientY;
      panOriginX = panX;
      panOriginY = panY;
    }, { passive: true });
    body.addEventListener('touchmove', (e) => {
      if (!isPanning || e.touches.length !== 1) return;
      e.preventDefault();
      panX = panOriginX + (e.touches[0].clientX - panStartX);
      panY = panOriginY + (e.touches[0].clientY - panStartY);
      applyImageZoom();
    }, { passive: false });
    body.addEventListener('touchend', () => { isPanning = false; });
  }

  // ── Zoom button wiring (shared for both PDF and image) ──
  if (hasZoom) {
    const updateZoomLabel = () => {
      const el = viewer.querySelector('#fv-zoom-val');
      if (el) el.textContent = Math.round(zoomLevel * 100) + '%';
    };
    viewer.querySelector('#fv-zoom-in').addEventListener('click', () => {
      zoomLevel = Math.min(zoomLevel + 0.25, 5);
      updateZoomLabel();
      isPdf ? reRenderPdf() : applyImageZoom();
    });
    viewer.querySelector('#fv-zoom-out').addEventListener('click', () => {
      zoomLevel = Math.max(zoomLevel - 0.25, 0.25);
      if (zoomLevel <= 1) { panX = 0; panY = 0; }
      updateZoomLabel();
      isPdf ? reRenderPdf() : applyImageZoom();
    });
    viewer.querySelector('#fv-zoom-reset').addEventListener('click', () => {
      zoomLevel = 1;
      panX = 0; panY = 0;
      updateZoomLabel();
      isPdf ? reRenderPdf() : applyImageZoom();
    });
    // Mouse-wheel zoom for both types
    body.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.15 : -0.15;
      zoomLevel = Math.min(5, Math.max(0.25, zoomLevel + delta));
      updateZoomLabel();
      isPdf ? reRenderPdf() : applyImageZoom();
    }, { passive: false });
  }

  // render content — pass pdfCallback + imgCallback
  renderViewerContent(body, f, (pdfDoc) => {
    pdfRef = pdfDoc;
    reRenderPdf();
  }, (img) => {
    imgEl = img;
    setupImagePan();   // enable drag-to-pan lupa behaviour
  });

  viewer.querySelector('#fv-close-btn').addEventListener('click', () => closeViewer(n.id));

  // register in Map
  viewers.set(n.id, { noteId: n.id, el: viewer, fileName: f.name, fileSize: f.size });

  bringFront(noteEl, n);
  viewer.style.zIndex = String(parseInt(noteEl.style.zIndex) + 1);

  // ── Collision avoidance: nudge overlapping notes out of the way ──
  setTimeout(() => nudgeOverlappingNotes(n.id, viewer), 50);
}

function nudgeOverlappingNotes(openNoteId, _viewer) {
  // ── Full relayout: ensure EVERY note fits on screen without overlapping any viewer ──
  const W   = window.innerWidth;
  const H   = window.innerHeight;
  const TB  = 54;   // toolbar height
  const GAP = 14;   // gap between items
  const NOTE_W = 270;

  // 1. Collect all open viewer rects (blockedZones)
  const blocked = [];
  viewers.forEach(v => {
    const r = v.el.getBoundingClientRect();
    blocked.push({ left: r.left, right: r.right, top: r.top, bottom: r.bottom });
  });

  if (blocked.length === 0) return;

  // 2. Find rightmost edge of ALL open viewers
  const maxViewerRight = Math.max(...blocked.map(z => z.right));

  // 3. Identify notes that overlap ANY blocked zone
  const toMove = [];
  notes.forEach(other => {
    if (other.id === openNoteId) return; // anchor note stays
    if (viewers.has(other.id))   return; // notes with their own viewer stay too
    const el = document.querySelector('.note[data-id="'+other.id+'"]');
    if (!el) return;
    const nr = el.getBoundingClientRect();
    const overlapsAny = blocked.some(z =>
      nr.left < z.right + GAP && nr.right > z.left - GAP &&
      nr.top  < z.bottom + GAP && nr.bottom > z.top - GAP
    );
    if (overlapsAny) toMove.push({ n: other, el });
  });

  if (toMove.length === 0) return;

  // 4. Pack displaced notes into a grid starting to the right of all viewers
  const startX = maxViewerRight + GAP + 10;
  const startY = TB + GAP;
  const availW = W - startX - GAP;

  // If there's not enough space to the right, stack them below all viewers instead
  const stackBelow = availW < NOTE_W;
  const belowY = Math.max(...blocked.map(z => z.bottom)) + GAP + 10;

  let curX = stackBelow ? GAP : startX;
  let curY = stackBelow ? belowY : startY;
  let rowH  = 0;

  toMove.forEach(({ n, el }) => {
    const elH = el.offsetHeight || 240;

    // Wrap to next row if we'd go off screen
    if (!stackBelow && curX + NOTE_W > W - GAP) {
      curX  = startX;
      curY += rowH + GAP;
      rowH  = 0;
    }
    if (stackBelow && curX + NOTE_W > W - GAP) {
      curX  = GAP;
      curY += rowH + GAP;
      rowH  = 0;
    }

    // Clamp vertically
    const safeY = Math.max(TB + GAP, Math.min(H - elH - GAP, curY));

    el.style.transition = 'left .38s cubic-bezier(.16,1,.3,1), top .38s cubic-bezier(.16,1,.3,1)';
    el.style.left = curX + 'px';
    el.style.top  = safeY + 'px';
    n.x = curX;
    n.y = safeY;

    setTimeout(() => { el.style.transition = 'box-shadow .2s,border-color .2s,transform .15s'; }, 450);

    rowH  = Math.max(rowH, elH);
    curX += NOTE_W + GAP;
  });

  saveNotes();
}

function positionViewer(noteEl, viewer) {
  const r = noteEl.getBoundingClientRect();
  viewer.style.top    = r.top + 'px';
  viewer.style.left   = (r.right) + 'px';
  // height matches note, with a min
  const h = Math.max(r.height, 320);
  viewer.style.height = h + 'px';
}

function renderViewerContent(body, f, pdfCallback, imgCallback) {
  const t = f.type || '';

  if (t.startsWith('image/')) {
    // ── Images: displayed with zoom support via CSS transform ──
    body.style.overflow     = 'hidden';
    body.style.cursor       = 'default';
    body.style.alignItems   = 'center';
    body.style.justifyContent = 'center';
    const img = document.createElement('img');
    img.style.cssText = [
      'max-width:100%',
      'max-height:100%',
      'object-fit:contain',
      'border-radius:6px',
      'box-shadow:0 4px 20px rgba(0,0,0,.5)',
      'display:block',
      'transform-origin:center center',
      'transition:transform .18s ease',
    ].join(';');
    img.src = f.dataUrl;
    img.alt = f.name;
    body.appendChild(img);
    // return the img element so zoom controls can scale it
    if (typeof imgCallback === 'function') imgCallback(img);

  } else if (t === 'application/pdf') {
    // ── PDF via PDF.js — canvas, zoom-aware, passes doc to callback ──
    body.style.cssText += ';padding:10px;flex-direction:column;align-items:center;justify-content:flex-start;overflow-y:auto;gap:10px;';

    const loading = document.createElement('div');
    loading.style.cssText = 'display:flex;align-items:center;justify-content:center;height:100%;color:rgba(240,240,240,.4);font-size:.8rem;gap:8px;flex-shrink:0;';
    loading.innerHTML = '<span>⏳</span> Carregando PDF…';
    body.appendChild(loading);

    function doLoadPdf() {
      const pdfjsLib = window['pdfjs-dist/build/pdf'];
      if (!pdfjsLib) {
        body.innerHTML = '<div style="padding:20px;color:rgba(240,240,240,.4);font-size:.8rem;text-align:center;">PDF.js não carregou.<br><a href="'+f.dataUrl+'" download="'+xe(f.name)+'" class="fv-dl-btn" style="margin-top:10px;display:inline-flex">↓ Baixar PDF</a></div>';
        return;
      }
      const b64 = f.dataUrl.split(',')[1];
      const raw = atob(b64);
      const bytes = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);

      pdfjsLib.getDocument({ data: bytes }).promise.then(pdf => {
        loading.remove();
        // Pass the pdf doc back so zoom controls can call reRenderPdf
        if (typeof pdfCallback === 'function') pdfCallback(pdf);
        // Initial render at scale 1 (fit-width) is handled by reRenderPdf via the callback
        // But we need a first render here too in case pdfCallback isn't set
        if (typeof pdfCallback !== 'function') {
          const renderPage = (pageNum) => {
            pdf.getPage(pageNum).then(page => {
              const dpr = window.devicePixelRatio || 1;
              const bodyWidth = body.clientWidth - 20;
              const baseVP = page.getViewport({ scale: 1 });
              const scale = (bodyWidth / baseVP.width) * dpr;
              const viewport = page.getViewport({ scale });
              const canvas = document.createElement('canvas');
              canvas.width = viewport.width; canvas.height = viewport.height;
              canvas.style.cssText = 'display:block;width:'+Math.round(viewport.width/dpr)+'px;height:'+Math.round(viewport.height/dpr)+'px;border-radius:6px;box-shadow:0 3px 14px rgba(0,0,0,.5);background:#fff;flex-shrink:0;';
              body.appendChild(canvas);
              page.render({ canvasContext: canvas.getContext('2d'), viewport })
                .promise.then(() => { if (pageNum < pdf.numPages) renderPage(pageNum + 1); });
            });
          };
          renderPage(1);
        }
      }).catch(err => {
        body.innerHTML = '<div style="padding:20px;color:rgba(240,240,240,.4);font-size:.8rem;text-align:center;">Erro ao renderizar PDF.<br><a href="'+f.dataUrl+'" download="'+xe(f.name)+'" class="fv-dl-btn" style="margin-top:10px;display:inline-flex">↓ Baixar PDF</a></div>';
        console.error('PDF render error:', err);
      });
    }

    _ensurePdfJs().then(() => { loading.remove(); doLoadPdf(); }).catch(() => {
      body.innerHTML = '<div style="padding:20px;color:rgba(240,240,240,.4);font-size:.8rem;text-align:center;">Não foi possível carregar o visualizador de PDF.<br><a href="'+f.dataUrl+'" download="'+xe(f.name)+'" class="fv-dl-btn" style="margin-top:10px;display:inline-flex">↓ Baixar PDF</a></div>';
    });

  } else if (t.startsWith('text/') || t === 'application/json' || t.includes('javascript') || t.includes('xml') || t.includes('csv')) {
    // ── Text / code: decode base64, show in <pre>
    try {
      const b64  = f.dataUrl.split(',')[1];
      const text = decodeURIComponent(escape(atob(b64)));
      const pre  = document.createElement('pre');
      pre.className = 'fv-text';
      pre.textContent = text;
      body.style.alignItems = 'flex-start';
      body.appendChild(pre);
    } catch(_) {
      showUnsupported(body, f);
    }

  } else {
    showUnsupported(body, f);
  }
}

function showUnsupported(body, f) {
  const ext = f.name.split('.').pop().toLowerCase();
  const icons = { doc:'📄', docx:'📄', xls:'📊', xlsx:'📊', ppt:'📑', pptx:'📑', zip:'🗜️', mp3:'🎵', mp4:'🎬', mov:'🎬' };
  const icon = icons[ext] || '📁';
  body.innerHTML = `
    <div class="fv-unsupported">
      <div class="fv-big-icon">${icon}</div>
      <p>Pré-visualização não disponível<br>para arquivos <strong>.${ext}</strong></p>
      <a href="${f.dataUrl}" download="${f.name}" class="fv-dl-btn">↓ Baixar arquivo</a>
    </div>`;
}

function closeViewer(noteId) {
  if (!viewers.has(noteId)) return;
  const v = viewers.get(noteId);
  const noteEl = document.querySelector('.note[data-id="'+noteId+'"]');
  if (noteEl) {
    noteEl.classList.remove('has-viewer');
    noteEl.querySelectorAll('.f-item').forEach(el => el.classList.remove('viewing'));
  }
  v.el.remove();
  viewers.delete(noteId);

  // Auto-unpin if was pinned automatically when viewer opened
  const n = notes.find(n => n.id === noteId);
  if (n && n._autopinned) {
    n.pinned = false;
    n._autopinned = false;
    if (noteEl) {
      noteEl.classList.remove('pinned');
      const pinBtn = noteEl.querySelector('.n-pin-btn');
      if (pinBtn) pinBtn.classList.remove('active');
    }
    saveNotes();
  }

  if (viewers.size > 0) {
    const firstId = viewers.keys().next().value;
    const firstViewer = viewers.get(firstId);
    setTimeout(() => nudgeOverlappingNotes(firstId, firstViewer.el), 60);
  }
}

function closeAllViewers() {
  viewers.forEach((_, id) => closeViewer(id));
}

// reposition viewer when note is dragged
const _origOnDrag = onDrag;
window._patchedDrag = true;
function addFiles(n, list) {
  const MAX = 5 * 1024 * 1024;
  Array.from(list).forEach(f => {
    // Size validation
    if (f.size > MAX) { toast('⚠', '"' + f.name + '" excede 5MB'); return; }
    // Type validation (whitelist + blocked extensions)
    if (!safeFileType(f)) {
      toast('⚠', '"' + f.name + '" — tipo de arquivo não permitido por segurança.');
      return;
    }
    const r = new FileReader();
    r.onload = e => {
      const dataUrl = safeDataUrl(e.target.result);
      if (!dataUrl) { toast('⚠', 'Arquivo inválido: ' + f.name); return; }
      const fileObj = { name: f.name, size: f.size, type: f.type, dataUrl };
      n.files.push(fileObj);
      renderFiles(n);
      if (_activeGroupWs) {
        // Compress then save to DB — syncs to all members via filesRef listener
        saveGroupNoteFile(n.id, fileObj).then(() => {
          toast('✓', '"' + f.name + '" compartilhado com o grupo.');
        });
      } else if (_activeWs) {
        saveSharedNote(n);
      } else {
        saveNotes();
      }
    };
    r.readAsDataURL(f);
  });
}
function fIco(t){
  const s='viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"';
  if(!t)             return`<svg ${s}><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>`;
  if(t.startsWith('image'))return`<svg ${s}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`;
  if(t.includes('pdf'))    return`<svg ${s}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/></svg>`;
  return`<svg ${s}><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>`;
}
function fSz(b){return b<1024?b+'B':b<1048576?(b/1024).toFixed(1)+'KB':(b/1048576).toFixed(1)+'MB';}

/* ═══ MISC ═══════════════════════════════════ */
/* ═══════════════════════════════════════════════════════
   PAINEL DE REORGANIZAÇÃO / FILTROS
   Ordena e filtra notas por status, cor, prazo e criação
═══════════════════════════════════════════════════════ */

// Active sort/filter state
let _sortOrder  = 'default'; // current sort key
let _sortPanelOpen = false;

function toggleSortPanel() {
  const panel = document.getElementById('sort-panel');
  _sortPanelOpen = !_sortPanelOpen;
  if (_sortPanelOpen) {
    panel.classList.add('open');
    // Close when clicking outside
    setTimeout(() => {
      document.addEventListener('click', _closeSortOnOutside);
    }, 10);
  } else {
    panel.classList.remove('open');
    document.removeEventListener('click', _closeSortOnOutside);
  }
}

function _closeSortOnOutside(e) {
  const panel = document.getElementById('sort-panel');
  const btn   = document.getElementById('btn-shuffle');
  if (!panel?.contains(e.target) && !btn?.contains(e.target)) {
    panel?.classList.remove('open');
    _sortPanelOpen = false;
    document.removeEventListener('click', _closeSortOnOutside);
  }
}



function _initSortChipEvents() {
  // Order chips
  document.querySelectorAll('#sort-order-chips .sort-chip').forEach(chip => {
    chip.onclick = (e) => {
      e.stopPropagation();
      document.querySelectorAll('#sort-order-chips .sort-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      _sortOrder = chip.dataset.sort;
      _applySortFilter();
    };
  });

  // Reset
  const resetBtn = document.getElementById('sort-reset-btn');
  if (resetBtn) resetBtn.onclick = (e) => { e.stopPropagation(); _resetSort(); };
}

function _resetSort() {
  _sortOrder  = 'default';
  // Reset all chips to default
  document.querySelectorAll('#sort-order-chips .sort-chip').forEach(c => c.classList.toggle('active', c.dataset.sort === 'default'));
  _applySortFilter();
  toast('↺', 'Reorganização resetada');
}

function _applySortFilter() {
  // Sort all loose notes (no filtering)
  const visibleNotes = notes.filter(n => !n.stackId);

  // Sort by chosen order
  const STATUS_SORT_ORDER = {'todo':0,'progress':1,'done':2,'closed':3};
  const COLOR_SORT_ORDER  = Object.fromEntries(Object.keys(PAL).map((k,i) => [k,i]));
  const sortFns = {
    'default':        (a,b) => a.id - b.id,
    'creation-asc':   (a,b) => a.id - b.id,
    'creation-desc':  (a,b) => b.id - a.id,
    'alpha-asc':      (a,b) => (a.title||'').localeCompare(b.title||''),
    'alpha-desc':     (a,b) => (b.title||'').localeCompare(a.title||''),
    'deadline-asc':   (a,b) => {
      const da = a.end ? new Date(a.end).getTime() : Infinity;
      const db = b.end ? new Date(b.end).getTime() : Infinity;
      return da - db;
    },
    'deadline-desc':  (a,b) => {
      const da = a.end ? new Date(a.end).getTime() : -Infinity;
      const db = b.end ? new Date(b.end).getTime() : -Infinity;
      return db - da;
    },
    // Group by status: todo → progress → done → closed, then by creation within group
    'by-status': (a,b) => {
      const sa = STATUS_SORT_ORDER[a.status||'todo'] ?? 99;
      const sb = STATUS_SORT_ORDER[b.status||'todo'] ?? 99;
      return sa !== sb ? sa - sb : a.id - b.id;
    },
    // Group by color palette order, then by creation within group
    'by-color': (a,b) => {
      const ca = COLOR_SORT_ORDER[a.color||'indigo'] ?? 99;
      const cb = COLOR_SORT_ORDER[b.color||'indigo'] ?? 99;
      return ca !== cb ? ca - cb : a.id - b.id;
    },
  };

  const sorted = [...visibleNotes].sort(sortFns[_sortOrder] || sortFns['default']);

  // 3. Reposition sorted visible notes (same layout as shuffleAll)
  const TOOLBAR = 54, PAD_X = 24, PAD_Y = 16, GAP = 20;
  const NOTE_TOP_START = TOOLBAR + PAD_Y;
  const NOTE_GAP = 12, MAX_PER_COL = 5, NOTE_W_FIXED = 272;
  const stackIds = [...new Set(notes.filter(n => n.stackId).map(n => n.stackId))];
  const notesStartX = stackIds.length > 0 ? PAD_X + 280 + GAP : PAD_X;
  const anim = 'left .35s cubic-bezier(.16,1,.3,1), top .35s cubic-bezier(.16,1,.3,1)';

  // Pilhas (pastas) ficam sempre na própria coluna reservada, à esquerda —
  // nunca no mesmo espaço dos cards soltos, pra não sobrepor nada ao reorganizar.
  let stackY = NOTE_TOP_START;
  stackIds.forEach(sid => {
    const members = getStackNotes(sid);
    if (!members.length) return;
    members.forEach(n => { n.x = PAD_X; n.y = stackY; });
    const wrapEl = document.querySelector('.stack-wrap[data-stack="'+sid+'"]');
    if (wrapEl) {
      void wrapEl.offsetWidth;
      wrapEl.style.transition = anim;
      wrapEl.style.left = PAD_X + 'px';
      wrapEl.style.top  = stackY + 'px';
      stackY += wrapEl.offsetHeight + GAP;
      setTimeout(() => { wrapEl.style.transition = ''; }, 400);
    } else {
      stackY += 60 + GAP; // fallback — pilha ainda não renderizada
    }
  });

  let col = 0, colCount = 0, noteY = NOTE_TOP_START, colX = notesStartX;

  // Pre-measure
  const heights = sorted.map(n => {
    const el = document.querySelector('.note[data-id="'+n.id+'"]');
    if (!el) return 180;
    el.style.transition = 'none';
    const wasExp = el.classList.contains('expanded');
    el.classList.add('expanded');
    const h = el.getBoundingClientRect().height || el.offsetHeight || 180;
    if (!wasExp) el.classList.remove('expanded');
    return h + (n._isClientNote ? 20 : 4);
  });

  sorted.forEach((n, idx) => {
    const el = document.querySelector('.note[data-id="'+n.id+'"]');
    if (!el) return;
    const nh = heights[idx] || 160;
    if (colCount >= MAX_PER_COL) { col++; colCount = 0; colX = notesStartX + col*(NOTE_W_FIXED+GAP); noteY = NOTE_TOP_START; }
    void el.offsetWidth;
    el.style.transition = anim;
    el.style.left = colX+'px'; el.style.top = noteY+'px';
    n.x = colX; n.y = noteY;
    setTimeout(() => { el.style.transition = 'box-shadow .2s,border-color .2s,transform .15s'; }, 400);
    noteY += nh + NOTE_GAP; colCount++;
  });

  // Update label
  const label = document.getElementById('sort-active-label');
  if (label) {
    const parts = [];
    if (_sortOrder !== 'default') parts.push(document.querySelector(`[data-sort="${_sortOrder}"]`)?.textContent?.trim() || _sortOrder);
    label.textContent = parts.length ? parts.join(' · ') : 'padrão';
  }

  saveNotes();
}

// Called automatically when a note's status changes
function onStatusChangedReorganize() {
  if (_sortOrder !== 'default') {
    _applySortFilter();
  }
}

function shuffleAll(){
  const TOOLBAR  = 54;  // toolbar height (viewport offset for fixed notes)
  const PAD_X    = 24;  // left margin
  const PAD_Y    = 16;  // gap below toolbar / board top
  const GAP      = 20;
  // Notes use position:fixed → top relative to viewport (TOOLBAR + PAD_Y)
  // Stacks use position:absolute in board → top relative to board (PAD_Y only)
  const NOTE_TOP_START  = TOOLBAR + PAD_Y;  // for notes (fixed)
  const STACK_TOP_START = PAD_Y;            // for stacks (absolute in board)
  const NOTE_W   = 240;
  const STACK_W  = 280;
  const anim     = 'left .4s cubic-bezier(.16,1,.3,1), top .4s cubic-bezier(.16,1,.3,1)';

  // ── 1. Stacks — vertical column on the left ──
  const stackIds = [...new Set(
    notes.filter(n => n.stackId).map(n => n.stackId)
  )].sort((a, b) => {
    const minA = Math.min(...notes.filter(n => n.stackId===a).map(n=>n.id));
    const minB = Math.min(...notes.filter(n => n.stackId===b).map(n=>n.id));
    return minA - minB;
  });

  let stackColH = STACK_TOP_START; // stacks: position:absolute in board

  stackIds.forEach(sid => {
    const wrapEl = document.querySelector('.stack-wrap[data-stack="'+sid+'"]');
    if (!wrapEl) return;

    notes.filter(n => n.stackId === sid).forEach(n => { n.x = PAD_X; n.y = stackColH; });
    wrapEl.style.transition = anim;
    wrapEl.style.left = PAD_X + 'px';
    wrapEl.style.top  = stackColH + 'px';
    setTimeout(() => { wrapEl.style.transition = ''; }, 450);

    stackColH += (wrapEl.offsetHeight || 60) + GAP;
  });

  // ── 2. Loose notes — multi-column (max 5 per column) ──
  const looseNotes = notes
    .filter(n => !n.stackId)
    .sort((a, b) => a.id - b.id);

  const notesStartX = stackIds.length > 0 ? PAD_X + STACK_W + GAP : PAD_X;
  const NOTE_GAP    = 12;
  const MAX_PER_COL = 5;
  const NOTE_W_FIXED = 272; // fixed column width to avoid measuring pre-transition widths

  // Pre-measure heights by temporarily removing transition
  const heights = looseNotes.map(n => {
    const el = document.querySelector('.note[data-id="'+n.id+'"]');
    if (!el || el.style.display === 'none') return 0;
    el.style.transition = 'none';
    // Force expand to measure true height (includes client block if present)
    const wasExpanded = el.classList.contains('expanded');
    el.classList.add('expanded');
    const h = el.getBoundingClientRect().height || el.offsetHeight || 200;
    if (!wasExpanded) el.classList.remove('expanded');
    // Add extra padding for client notes to prevent overlap
    const extraPad = n._isClientNote ? 20 : 4;
    return h + extraPad;
  });

  let col = 0, colCount = 0;
  let noteY = NOTE_TOP_START;
  let colX  = notesStartX;

  looseNotes.forEach((n, idx) => {
    const el = document.querySelector('.note[data-id="'+n.id+'"]');
    if (!el || el.style.display === 'none') return;

    const nh = heights[idx] || 160;

    // Start new column after MAX_PER_COL notes
    if (colCount >= MAX_PER_COL) {
      col++;
      colCount = 0;
      colX  = notesStartX + col * (NOTE_W_FIXED + GAP);
      noteY = NOTE_TOP_START;
    }

    // Force layout, then animate
    void el.offsetWidth; // reflow
    el.style.transition = anim;
    el.style.left = colX + 'px';
    el.style.top  = noteY + 'px';
    n.x = colX; n.y = noteY;

    if (viewers.has(n.id)) {
      const v = viewers.get(n.id);
      v.el.style.transition = anim;
      v.el.style.left = (colX + NOTE_W_FIXED + 4) + 'px';
      v.el.style.top  = noteY + 'px';
      setTimeout(() => { v.el.style.transition = ''; }, 450);
    }

    setTimeout(() => {
      el.style.transition = 'box-shadow .2s,border-color .2s,transform .15s';
    }, 450);

    noteY += nh + NOTE_GAP;
    colCount++;
  });

  saveNotes();
}
function showConfirmClear() {
  // Remove existing if any
  document.querySelector('.confirm-clear-pop')?.remove();

  const pop = document.createElement('div');
  pop.className = 'confirm-clear-pop';
  pop.innerHTML = `
    <div class="confirm-clear-card">
      <div class="confirm-clear-icon">🗑</div>
      <div class="confirm-clear-title">Limpar tudo?</div>
      <div class="confirm-clear-desc">Todas as notas e pilhas serão apagadas. Você poderá restaurar clicando em <b style="color:#6ee7b7;">Restaurar</b> na barra de ferramentas por 30 segundos.</div>
      <div class="confirm-clear-btns">
        <button class="confirm-clear-cancel">Cancelar</button>
        <button class="confirm-clear-ok">Sim, apagar tudo</button>
      </div>
    </div>`;

  document.body.appendChild(pop);
  requestAnimationFrame(() => pop.classList.add('visible'));

  pop.querySelector('.confirm-clear-cancel').addEventListener('click', () => {
    pop.classList.remove('visible');
    setTimeout(() => pop.remove(), 200);
  });

  pop.querySelector('.confirm-clear-ok').addEventListener('click', async () => {
    // ── Take backup before clearing ──
    const wsLabel = _activeGroupWs ? 'workspace do grupo' : _activeWs ? 'workspace compartilhado' : 'board pessoal';
    _takeBackup('all', 'todas as notas do ' + wsLabel);
    // Close all open viewers first
    closeAllViewers();
    // Clear notes array and DOM
    notes = [];
    document.querySelectorAll('.note').forEach(e => e.remove());
    document.querySelectorAll('.stack-wrap').forEach(e => e.remove());
    // If in a shared workspace, clear Firebase too
    if (_activeWs && _fbReady) {
      await fbRemove('shared_boards/' + _activeWs.key + '/notes');
    }
    if (_activeGroupWs && _fbReady) {
      await fbRemove('group_boards/' + _activeGroupWs.groupId + '/notes');
    }
    saveNotes(); syncCount();
    pop.classList.remove('visible');
    setTimeout(() => pop.remove(), 200);
  });

  // Close on backdrop click
  pop.addEventListener('click', e => {
    if (e.target === pop) {
      pop.classList.remove('visible');
      setTimeout(() => pop.remove(), 200);
    }
  });
}

function syncCount(){
  $('t-count').textContent = T.noteCount ? T.noteCount(notes.length) : notes.length+' nota'+(notes.length!==1?'s':'');
  syncEmpty();
}
function syncEmpty(){
  const h=$('empty-hint');
  if(h) h.style.display=notes.length?'none':'flex';
}
function ar(ta){ta.style.height='auto';ta.style.height=ta.scrollHeight+'px';}
/* ═══ SECURITY UTILITIES ═══════════════════════════════════
   xe()          — HTML-escape for innerHTML template literals
   sanitizeAttr() — attr-safe escape (adds single-quote + slash)
   safeDataUrl()  — validates dataUrl is only data: scheme
   safeFileType() — validates file MIME type whitelist
   assertAuth()   — throws if no authenticated user
═══════════════════════════════════════════════════════ */
function xe(s) {
  return (s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

function sanitizeAttr(s) {
  // For use in HTML attribute values — extra-strict
  return xe(s).replace(/`/g, '&#x60;').replace(/=/g, '&#x3D;');
}

// Validate dataUrl — only allow data: scheme, block javascript:/vbscript:
function safeDataUrl(url) {
  if (!url || typeof url !== 'string') return '';
  if (!url.startsWith('data:')) return '';
  return url;
}

// Validate + escape a user-supplied profile photo URL before use in an <img src="...">.
// profile.photo is stored in users/$uid/profile, which any authenticated user can write
// directly via the Firebase client SDK (see database.rules.json — the rule only checks
// auth.uid, not content). Never trust it: only allow https:// or data:image/*, and
// HTML-attribute-escape the result so it can't break out of the src="" attribute.
function isSafePhotoScheme(url) {
  return typeof url === 'string' &&
    (/^https:\/\//i.test(url) || /^data:image\/(png|jpe?g|gif|webp);base64,/i.test(url));
}
// For HTML-string contexts (innerHTML template literals) — escaped for attribute insertion.
function safePhotoUrl(url) {
  return isSafePhotoScheme(url) ? sanitizeAttr(url) : '';
}
// For direct DOM property assignment (el.src = ...) — no HTML-entity escaping (would break the URL).
function safePhotoUrlRaw(url) {
  return isSafePhotoScheme(url) ? url : '';
}

// Whitelist of allowed MIME types for file uploads
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg','image/png','image/gif','image/webp','image/svg+xml',
  'application/pdf',
  'text/plain','text/csv','text/markdown',
  'application/json',
  'application/zip',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/msword',
]);

// Blocked dangerous extensions (defense in depth)
const BLOCKED_EXTENSIONS = /\.(exe|bat|cmd|sh|ps1|msi|dll|vbs|js|jsx|ts|tsx|php|py|rb|pl|cgi|htaccess|env)$/i;

function safeFileType(file) {
  const ext = file.name.split('.').pop() || '';
  if (BLOCKED_EXTENSIONS.test(file.name)) return false;
  if (!ALLOWED_MIME_TYPES.has(file.type)) return false;
  return true;
}

// Assert user is authenticated before any write operation
function assertAuth() {
  if (!CU || !CU.uid) throw new Error('Not authenticated');
  return CU;
}

// Get the secure Firebase path for current user (uses uid, not username)
function userPath(subpath) {
  assertAuth();
  return 'users/' + CU.uid + (subpath ? '/' + subpath : '');
}
function $(id){return document.getElementById(id);}
function $v(id){return $(id).value;}
function showErr(id,msg){const e=$(id);e.textContent=msg;e.classList.add('show');}
function hideErr(id){const e=$(id);if(e){e.classList.remove('show');e.textContent='';}}
let toastTmr;
function toast(icon,msg){
  $('t-ico').textContent=icon; $('t-msg').textContent=msg;
  const t=$('toast'); t.classList.add('show');
  clearTimeout(toastTmr); toastTmr=setTimeout(()=>t.classList.remove('show'),2800);
}

/* ═══ INIT ═══════════════════════════════════ */
window.addEventListener('DOMContentLoaded', () => {
  requestAnimationFrame(() => document.body.classList.add('page-ready'));

  // On mobile: scroll auth-screen to top so login is visible
  const authScreen = document.getElementById('auth-screen');
  if (authScreen) authScreen.scrollTop = 0;

  document.getElementById('chat-lightbox')?.addEventListener('click', () => {
    document.getElementById('chat-lightbox')?.classList.remove('open');
  });

  /* detect language in background — never blocks UI */
  detectLanguage().catch(() => {});

  /* ── Auth UI — só existe em login.html ── */
  if (document.getElementById('auth-card')) {
    $('tab-login')?.addEventListener('click', ()=>switchTab('login'));
    $('tab-reg')?.addEventListener('click',   ()=>switchTab('reg'));
    $('goto-reg')?.addEventListener('click',  ()=>switchTab('reg'));
    $('goto-login')?.addEventListener('click',()=>switchTab('login'));
    $('btn-login')?.addEventListener('click',    doLogin);
    $('btn-register')?.addEventListener('click', doRegister);
    document.getElementById('btn-google-login')?.addEventListener('click', doGoogleLogin);
    document.getElementById('btn-google-reg')?.addEventListener('click',   doGoogleLogin);
    document.getElementById('forgot-pass')?.addEventListener('click', doForgotPassword);
    $('auth-card').classList.add('anim');
    startTypewriter();
    initPixelCanvas();
  }

  /* toolbar */
  $('btn-new').addEventListener('click',     openModal);
  $('btn-shuffle').addEventListener('click', toggleSortPanel);
  $('btn-exit').addEventListener('click',    doLogout);
  $('btn-social').addEventListener('click',  toggleSocialPanel);

  // Personal workspace panel
  document.getElementById('t-pill-ws')?.addEventListener('click', togglePwPanel);
  document.getElementById('pw-add-btn')?.addEventListener('click', () => {
    const inp = document.getElementById('pw-add-inp');
    const name = inp.value.trim();
    if (!name) { inp.focus(); return; }
    inp.value = '';
    _pwCreate(name);
  });
  document.getElementById('pw-add-inp')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const name = e.target.value.trim();
      if (!name) return;
      e.target.value = '';
      _pwCreate(name);
    }
  });

  // social panel tab buttons
  document.querySelectorAll('.sp-tab').forEach(t => {
    t.addEventListener('click', () => setSocialTab(t.dataset.stab));
  });

  // close social panel on outside click
  document.addEventListener('click', e => {
    if (!socialOpen) return;
    const panel = document.getElementById('social-panel');
    const btn   = document.getElementById('btn-social');
    if (!panel.contains(e.target) && !btn.contains(e.target)) {
      socialOpen = false; panel.classList.remove('open');
    }
  });
  $('btn-clear').addEventListener('click', () => {
    showConfirmClear();
  });
  document.getElementById('btn-restore')?.addEventListener('click', doRestore);

  /* modal */
  $('m-cancel').addEventListener('click', closeModal);
  $('m-ok').addEventListener('click',     createNote);
  $('modal').addEventListener('click', e=>{ if(e.target===e.currentTarget) closeModal(); });

  /* reminder toggle */
  $('m-rem-chk').addEventListener('change', function(){
    $('m-rem-sub').style.opacity       = this.checked ? '1' : '.3';
    $('m-rem-sub').style.pointerEvents = this.checked ? 'all' : 'none';
  });


  /* wallpaper */
  buildWpPanel();
  _initSortChipEvents(); // wire sort panel chip click events
  $('btn-wallpaper').addEventListener('click', toggleWpPanel);
  $('wp-reset').addEventListener('click', () => { resetWallpaper(); });
  $('wp-file').addEventListener('change', async function() {
    const file = this.files[0];
    if (!file) return;
    const btn = document.querySelector('.wp-upload-btn span');
    const orig = btn ? btn.textContent : '';
    if (btn) btn.textContent = '⏳ Aplicando…';

    // Convert to dataURL so display works immediately AND after reload
    const dataUrl = await new Promise((ok, fail) => {
      const fr = new FileReader();
      fr.onload  = () => ok(fr.result);
      fr.onerror = fail;
      fr.readAsDataURL(file);
    });

    // Display immediately at full quality
    _applyWpVisual({ type: 'image', value: dataUrl, key: null });

    // Save raw blob to IndexedDB (no quality loss in storage)
    await _wpIdbSave(CU.username, file);
    localStorage.setItem('md_wp_' + CU.username, JSON.stringify({ type: 'image', key: null }));

    if (btn) btn.textContent = '✓ Imagem aplicada!';
    setTimeout(() => { if (btn) btn.textContent = orig; }, 2500);
  });


  /* Firebase Auth state listener — handles auto-login & session persistence */
  function tryAutoLogin() {
    // Demo mode: no Firebase (sandbox/preview) — try local session
    if (!window._fbInitDone) {
      const sess = localStorage.getItem('md_sess_demo');
      if (sess) { try { const u = JSON.parse(sess); if (u?.username) { CU = u; launchApp(); return; } } catch(_) {} }
      window.location.replace('landing.html');
      return;
    }
    const auth = getAuth();
    if (!auth) { setTimeout(tryAutoLogin, 150); return; }
    auth.onAuthStateChanged(async user => {
      if (!user && !CU && !window._registering) { window.location.replace('landing.html'); return; }
      if (user && !CU && !window._registering) {
        try {
          // Resolve admin claim ANTES de launchApp para que isPremium() já enxergue isAdmin
          try {
            const tokenResult = await user.getIdTokenResult();
            window.authState = {
              user,
              isAuthenticated: true,
              isAdmin:         tokenResult.claims.admin === true,
              loading:         false,
            };
          } catch(_) {
            window.authState = { user, isAuthenticated: true, isAdmin: false, loading: false };
          }

          // Ensure Firebase DB SDK is loaded before reading
          await loadFirebase();
          const uid = user.uid;
          // Get username — try uid mapping, fallback to displayName
          let username = null;
          try { username = await fbGet('uids/' + uid); } catch(_) {}
          if (!username && user.displayName) username = user.displayName;
          // Fallback: try reading profile directly by uid
          let profile = {};
          try { profile = await fbGet('users/' + uid + '/profile') || {}; } catch(_) {}
          if (!username && profile.username) username = profile.username;
          // Last resort: derive from email
          if (!username && user.email) username = user.email.split('@')[0].replace(/[^a-z0-9_]/gi, '') || 'user';
          if (!profile.name && username) {
            try { profile = await fbGet('users/' + username + '/profile') || profile; } catch(_) {}
          }
          CU = { uid, username, name: profile.name || username, role: profile.role || '', email: user.email };
          launchApp();
        } catch(e) { console.warn('Auto-login failed:', e); }
      }
    });
  }
  setTimeout(tryAutoLogin, 300); // wait for Firebase SDK + loadFirebase
});

/* ═══ PIXEL ANIMATION (auth screen) ════════════════════
   Tiny 6×6 pixel "stars" drift across the auth left panel.
═══════════════════════════════════════════════════════ */
function initPixelCanvas() {
  const canvas = document.getElementById('pixel-canvas');
  if (!canvas) return;
  const parent = canvas.parentElement;
  const resize = () => { canvas.width = parent.offsetWidth; canvas.height = parent.offsetHeight; };
  resize();
  window.addEventListener('resize', resize);

  const ctx = canvas.getContext('2d');
  const PX = 6; // pixel size
  const COLS_PALETTE = ['#6366f1','#818cf8','#14b8a6','#2dd4bf','#f59e0b','#fb7185','#a78bfa','#67e8f9','#fcd34d'];

  // generate sparse pixel grid
  const pixels = [];
  for (let i = 0; i < 60; i++) {
    pixels.push({
      x: Math.random() * 400,
      y: Math.random() * 700,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.3,
      color: COLS_PALETTE[Math.floor(Math.random() * COLS_PALETTE.length)],
      alpha: Math.random() * 0.6 + 0.2,
      life: Math.random() * 200,
      maxLife: 150 + Math.random() * 200,
    });
  }

  let rafId;
  function draw() {
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    pixels.forEach(p => {
      p.life++;
      if (p.life > p.maxLife) {
        // reset
        p.x = Math.random() * W;
        p.y = Math.random() * H;
        p.life = 0;
        p.maxLife = 150 + Math.random() * 200;
        p.color = COLS_PALETTE[Math.floor(Math.random() * COLS_PALETTE.length)];
        p.alpha = Math.random() * 0.6 + 0.2;
      }
      // fade in/out
      const prog = p.life / p.maxLife;
      const fade = prog < 0.2 ? prog / 0.2 : prog > 0.8 ? (1 - prog) / 0.2 : 1;
      ctx.globalAlpha = p.alpha * fade;
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), PX, PX);
      p.x += p.vx;
      p.y += p.vy;
      // wrap
      if (p.x < -PX) p.x = W; if (p.x > W) p.x = -PX;
      if (p.y < -PX) p.y = H; if (p.y > H) p.y = -PX;
    });
    ctx.globalAlpha = 1;
    rafId = requestAnimationFrame(draw);
  }
  draw();

  // Stop animation when auth screen is hidden to save resources
  const _authScreenEl = document.getElementById('auth-screen');
  if (_authScreenEl) {
    const obs = new MutationObserver(() => {
      const hidden = _authScreenEl.style.display === 'none';
      if (hidden && rafId) { cancelAnimationFrame(rafId); rafId = null; }
      else if (!hidden && !rafId) draw();
    });
    obs.observe(_authScreenEl, { attributes: true, attributeFilter: ['style'] });
  }
}

/* ═══ TYPEWRITER (auth screen) ══════════════════════ */
function startTypewriter() {
  const el     = document.getElementById('auth-typewriter');
  const cursor = document.getElementById('auth-cursor');
  if (!el || !cursor) return;
  const phrases = T.typewriterPhrases || ['de notas.','colaborativo.','sem distrações.','do seu jeito.'];
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
const WP_SOLIDS = [
  '#0a0a0a','#0f172a','#1a0a2e','#0a1a2e','#0a200a',
  '#1a0a0a','#1c1200','#12121a','#1a1a0a','#0d1a1a',
  '#e8e8e8',
  // +9 new
  '#90ee90','#ffff99','#ccff66','#ffcc99','#ff99cc',
  '#ff9900','#87ceeb','#ff6699','#aaddff',
];
const WP_GRADS = [
  'linear-gradient(135deg,#0f0c29,#302b63,#24243e)',
  'linear-gradient(135deg,#0a0a0a,#1a1a2e,#16213e)',
  'linear-gradient(135deg,#0a1628,#0a2018,#0d1a1a)',
  'linear-gradient(135deg,#1a0a0a,#2d1b69,#11998e)',
  'linear-gradient(135deg,#0d0d0d,#1a1a1a,#2d2d2d)',
  'linear-gradient(135deg,#020024,#090979,#00d4ff)',
  'linear-gradient(135deg,#0a0a0a,#240a1c,#0a1628)',
  'linear-gradient(135deg,#141e30,#243b55)',
  'linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)',
  'linear-gradient(135deg,#0d1b2a,#1b4332,#081c15)',
  'linear-gradient(135deg,#0a0000,#3d0000,#1a0000)',
  'linear-gradient(135deg,#1a0000,#8b0000,#0a0a0a)',
  'linear-gradient(135deg,#0a0a0a,#2d0000,#6b0000)',
  'linear-gradient(135deg,#ffffff,#e8e8e8,#d4d4d4)',
  'linear-gradient(135deg,#f8f8f8,#e2e8f0,#f0f4f8)',
  'linear-gradient(135deg,#ffffff,#f5f0ff,#e8f4fd)',
];

let wpPanelOpen = false;
let activeWpKey = null; // tracks which swatch is active

// ── COLEÇÃO — imagens de fundo prontas (bundladas no app, sem upload) ──
const WP_GALLERY = [
  { key: 'gallery_city_sunset',        label: 'Cidade ao pôr do sol',    url: 'screenshots/wp-city-sunset.jpg',        type: 'image' },
  { key: 'gallery_synthwave_mountains', label: 'Montanhas synthwave',    url: 'screenshots/wp-synthwave-mountains.jpg', type: 'image' },
  { key: 'gallery_lofi_desk',          label: 'Mesa lofi',               url: 'screenshots/wp-lofi-desk.jpg',           type: 'image' },
  { key: 'gallery_lofi_video',         label: 'Lofi (vídeo em loop)',    url: 'media/wp-lofi-loop.mp4',                 type: 'video' },
];

// ── PIXEL ART THEMES (animated) ──────────────────────────
let _pixelAnimId = null;
let _pixelTick = 0;

function stopPixelAnimation() {
  if (_pixelAnimId) { cancelAnimationFrame(_pixelAnimId); _pixelAnimId = null; }
  const cv = document.getElementById('board-pixel-canvas');
  if (cv) cv.style.display = 'none';
}

function startPixelAnimation(theme) {
  stopPixelAnimation();
  const cv = document.getElementById('board-pixel-canvas');
  if (!cv) return;
  cv.style.display = 'block';
  const resize = () => { cv.width = window.innerWidth; cv.height = window.innerHeight; };
  resize();
  window.addEventListener('resize', resize);
  _pixelTick = 0;
  const ctx = cv.getContext('2d');
  const loop = () => {
    _pixelTick++;
    theme.draw(ctx, cv.width, cv.height, _pixelTick);
    _pixelAnimId = requestAnimationFrame(loop);
  };
  loop();
}

const WP_PIXEL_THEMES = [
  {
    key: 'pixel_city',
    label: 'Cidade',
    // fn receives canvas ctx, W, H
    draw(ctx, W, H, t=0) {
      const PX = Math.ceil(W / 64);
      ctx.fillStyle = '#0a0a1a'; ctx.fillRect(0, 0, W, H);
      // stars (twinkle)
      const stars = [[4,2],[12,5],[20,1],[30,3],[42,2],[55,4],[8,8],[35,6],[50,2],[18,9],[60,7]];
      stars.forEach(([x,y],i) => {
        const br = 0.5 + 0.5*Math.sin(t*0.008 + i*1.3);
        ctx.fillStyle=`rgba(255,255,255,${br})`; ctx.fillRect(x*PX,y*PX,PX,PX);
      });
      // shooting star
      const ss = Math.floor(t/300)%3;
      const ssx = ((t*0.2)%70)|0, ssy = 2+ss*3;
      if((t%300)<40){ ctx.fillStyle='rgba(255,255,220,0.8)'; ctx.fillRect(ssx*PX,ssy*PX,2*PX,PX); }
      // moon
      ctx.fillStyle='#fffbcc'; [[28,4],[29,3],[30,3],[31,4],[29,5],[30,5]].forEach(([x,y])=>ctx.fillRect(x*PX,y*PX,PX,PX));
      // buildings
      const blds = [
        {x:0,w:6,h:18,c:'#1a1a2e'},{x:6,w:4,h:22,c:'#0d0d1a'},
        {x:10,w:8,h:15,c:'#1e1e3a'},{x:18,w:5,h:25,c:'#141428'},
        {x:23,w:7,h:18,c:'#0f0f22'},{x:30,w:6,h:30,c:'#1a1a2e'},
        {x:36,w:4,h:20,c:'#0d0d1a'},{x:40,w:9,h:24,c:'#1e1e3a'},
        {x:49,w:5,h:16,c:'#141428'},{x:54,w:10,h:22,c:'#0f0f22'},
      ];
      const rows = Math.ceil(H/PX);
      blds.forEach(b => {
        ctx.fillStyle = b.c;
        ctx.fillRect(b.x*PX, (rows-b.h)*PX, b.w*PX, b.h*PX);
        // windows
        ctx.fillStyle = '#f59e0b';
        for(let wy=rows-b.h+1; wy<rows-1; wy+=3) {
          for(let wx=b.x+1; wx<b.x+b.w-1; wx+=2) {
            if(Math.random()>0.45) ctx.fillRect(wx*PX, wy*PX, PX, PX);
          }
        }
      });
      // ground
      ctx.fillStyle='#0d0d0d'; ctx.fillRect(0,H-PX*2,W,PX*2);
    }
  },
  {
    key: 'pixel_sunset',
    label: 'Pôr do Sol',
    draw(ctx, W, H, tick=0) {
      const PX = Math.ceil(W / 64);
      const rows = Math.ceil(H/PX);
      // Animate: slow sky color cycle
      const shift = Math.sin(tick * 0.005) * 0.5;
      // sky gradient
      const skyColors=['#0a0020','#1a0040','#3d0070','#7a0080','#c0206a','#e05030','#f08020','#f0b040'];
      for(let y=0;y<rows;y++){
        const t=y/rows * (skyColors.length-1);
        const i=Math.floor(t), f=t-i;
        const c1=skyColors[Math.min(i,skyColors.length-1)];
        const c2=skyColors[Math.min(i+1,skyColors.length-1)];
        const lerp=(a,b,t)=>Math.round(parseInt(a,16)*(1-t)+parseInt(b,16)*t);
        const r=lerp(c1.slice(1,3),c2.slice(1,3),f);
        const g=lerp(c1.slice(3,5),c2.slice(3,5),f);
        const b=lerp(c1.slice(5,7),c2.slice(5,7),f);
        ctx.fillStyle=`rgb(${r},${g},${b})`; ctx.fillRect(0,y*PX,W,PX);
      }
      // sun (pulsing glow)
      const sunY=Math.floor(rows*0.55);
      const sunPulse = 0.7 + 0.3*Math.sin(tick*0.01);
      ctx.fillStyle=`rgba(255,238,0,${sunPulse})`;
      [[-1,0],[0,-1],[1,0],[0,1],[0,0],[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([dx,dy])=>ctx.fillRect((32+dx)*PX,(sunY+dy)*PX,PX,PX));
      // sun rays
      ctx.fillStyle=`rgba(255,200,0,${sunPulse*0.4})`;
      [[-3,0],[3,0],[0,-3],[0,3],[-2,-2],[2,-2],[-2,2],[2,2]].forEach(([dx,dy])=>ctx.fillRect((32+dx)*PX,(sunY+dy)*PX,PX,PX));
      // horizon silhouette
      ctx.fillStyle='#1a0a0a';
      ctx.fillRect(0,(rows-4)*PX,W,4*PX);
      [[5,3],[6,3],[7,2],[8,2],[9,3],[15,3],[16,2],[17,1],[18,2],[19,3],[25,3],[26,2],[27,3],[35,3],[36,2],[37,2],[38,1],[39,2],[45,3],[46,2],[47,3],[55,3],[56,2],[57,3]].forEach(([x,dy])=>ctx.fillRect(x*PX,(rows-4-dy)*PX,PX,dy*PX));
    }
  },
  {
    key: 'pixel_lofi',
    label: 'Lo-Fi Dev',
    draw(ctx, W, H, t=0) {
      const PX = Math.max(3, Math.round(W / 80));
      const cols = Math.ceil(W/PX), rows = Math.ceil(H/PX);
      const slow = t * 0.006;

      // ════════════════════════════════════════
      // SKY — rose/amber/purple layered gradient
      // ════════════════════════════════════════
      for (let y = 0; y < rows; y++) {
        const yt = y / rows;
        let r, g, b;
        if (yt < 0.15) {           // top: deep purple
          r = Math.round(40  + yt/0.15 * 60);
          g = Math.round(10  + yt/0.15 * 10);
          b = Math.round(70  + yt/0.15 * 40);
        } else if (yt < 0.40) {    // mid: rose-magenta
          const f = (yt-0.15)/0.25;
          r = Math.round(100 + f*120);
          g = Math.round(20  + f*40);
          b = Math.round(110 - f*20);
        } else if (yt < 0.62) {    // lower: orange-amber
          const f = (yt-0.40)/0.22;
          r = Math.round(220 + f*20);
          g = Math.round(60  + f*100);
          b = Math.round(90  - f*60);
        } else {                   // horizon: warm haze
          const f = (yt-0.62)/0.38;
          r = Math.round(240 - f*80);
          g = Math.round(160 - f*60);
          b = Math.round(30  + f*10);
        }
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(0, y*PX, W, PX);
      }

      // ════════════════════════════════════════
      // CLOUDS — soft horizontal streaks, drifting
      // ════════════════════════════════════════
      const cDrift = (t * 0.04) % (cols * PX);
      [[8,4,18,2,0.15],[20,7,12,1,0.10],[38,5,20,2,0.12],[55,8,14,1,0.08]].forEach(([cx,cy,cw,ch,a]) => {
        ctx.fillStyle = `rgba(255,210,180,${a})`;
        for (let dx=0; dx<cw; dx++) for (let dy=0; dy<ch; dy++) {
          const px = ((cx*PX + dx*PX - cDrift + W) % W);
          ctx.fillRect(px, (cy + dy)*PX, PX, PX);
        }
      });

      // ════════════════════════════════════════
      // CITYSCAPE — 3 depth layers
      // ════════════════════════════════════════
      const horizonY = Math.floor(rows * 0.62);

      // Layer 1: far background (hazy purple)
      const farBlds = [
        {x:2,w:4,h:8},{x:7,w:3,h:10},{x:11,w:5,h:7},{x:17,w:3,h:12},
        {x:21,w:6,h:9},{x:28,w:4,h:14},{x:33,w:5,h:10},{x:39,w:3,h:8},
        {x:43,w:6,h:13},{x:50,w:4,h:9},{x:55,w:5,h:11},{x:61,w:3,h:7},
        {x:65,w:6,h:15},{x:72,w:4,h:10},{x:77,w:5,h:8},{x:83,w:3,h:12},
        {x:87,w:5,h:9},{x:93,w:4,h:11},
      ];
      farBlds.forEach(b => {
        ctx.fillStyle = 'rgba(80,40,100,0.55)';
        ctx.fillRect(b.x*PX, (horizonY-b.h)*PX, b.w*PX, b.h*PX);
        // tiny windows
        for (let wy=horizonY-b.h+1; wy<horizonY-1; wy+=2) {
          for (let wx=b.x+1; wx<b.x+b.w-1; wx+=2) {
            if (Math.sin(wx*3.1+wy*2.7+t*0.003) > 0.3) {
              ctx.fillStyle = 'rgba(255,180,80,0.5)';
              ctx.fillRect(wx*PX, wy*PX, PX, PX);
            }
          }
        }
      });

      // Layer 2: mid buildings (main skyline)
      const midBlds = [
        {x:3,w:7,h:20,c:'#2d1640'},{x:10,w:5,h:26,c:'#231235'},
        {x:15,w:9,h:18,c:'#2a1538'},{x:24,w:6,h:30,c:'#1e0f2e'},
        {x:30,w:8,h:22,c:'#281440'},{x:38,w:5,h:16,c:'#241038'},
        {x:43,w:10,h:35,c:'#1c0d2c'},{x:53,w:7,h:24,c:'#271340'},
        {x:60,w:6,h:19,c:'#221035'},{x:66,w:8,h:28,c:'#1e0f32'},
        {x:74,w:5,h:21,c:'#261240'},{x:79,w:7,h:18,c:'#231138'},
        {x:86,w:6,h:25,c:'#1d0e2e'},{x:92,w:5,h:20,c:'#28133a'},
      ];
      midBlds.forEach(b => {
        ctx.fillStyle = b.c;
        ctx.fillRect(b.x*PX, (horizonY-b.h)*PX, b.w*PX, b.h*PX);
        // lit windows — amber/orange glow
        for (let wy=horizonY-b.h+1; wy<horizonY-1; wy+=2) {
          for (let wx=b.x+1; wx<b.x+b.w-1; wx+=2) {
            const on = Math.sin(wx*2.3+wy*1.9+slow) > 0.1;
            if (on) {
              const warm = Math.sin(wx*1.1+wy*0.7+slow*0.5);
              ctx.fillStyle = warm > 0 ? 'rgba(255,200,80,0.85)' : 'rgba(255,150,60,0.7)';
              ctx.fillRect(wx*PX, wy*PX, PX, PX);
            }
          }
        }
        // antenna on tall buildings
        if (b.h > 25) {
          ctx.fillStyle = 'rgba(255,100,100,0.6)';
          if (Math.floor(t/60)%2===0) ctx.fillRect((b.x+b.w/2|0)*PX, (horizonY-b.h-2)*PX, PX, 2*PX);
        }
      });

      // ════════════════════════════════════════
      // ROOM — dark interior bottom 38%
      // ════════════════════════════════════════
      const roomY = horizonY;
      for (let y=roomY; y<rows; y++) {
        const d = (y-roomY)/(rows-roomY);
        const v = Math.round(12 + d*8);
        ctx.fillStyle = `rgb(${v+3},${v},${v+6})`;
        ctx.fillRect(0, y*PX, W, PX);
      }

      // ════════════════════════════════════════
      // WINDOW FRAME — thick dark border
      // ════════════════════════════════════════
      const fw = Math.floor(cols * 0.04); // frame width
      const fx1 = Math.floor(cols * 0.08);
      const fx2 = Math.floor(cols * 0.92);
      const fy1 = Math.floor(rows * 0.02);
      const fy2 = roomY + 2;
      const fmid = Math.floor((fx1+fx2)/2);
      ctx.fillStyle = '#1a1020';
      // left frame
      ctx.fillRect(fx1*PX, fy1*PX, fw*PX, (fy2-fy1)*PX);
      // right frame
      ctx.fillRect((fx2-fw)*PX, fy1*PX, fw*PX, (fy2-fy1)*PX);
      // top frame
      ctx.fillRect(fx1*PX, fy1*PX, (fx2-fx1)*PX, fw*PX);
      // center divider
      ctx.fillRect((fmid-1)*PX, fy1*PX, 3*PX, (fy2-fy1)*PX);
      // sill
      ctx.fillStyle = '#130c1c';
      ctx.fillRect(fx1*PX, fy2*PX, (fx2-fx1)*PX, 3*PX);

      // ════════════════════════════════════════
      // BOOKSHELF — left side, full height
      // ════════════════════════════════════════
      const bsX = 0, bsW = Math.floor(cols * 0.08);
      ctx.fillStyle = '#100c18';
      ctx.fillRect(bsX*PX, Math.floor(rows*0.08)*PX, bsW*PX, Math.floor(rows*0.75)*PX);
      // shelf lines
      const bookH = Math.floor(rows * 0.08);
      const bookColors = ['#8b1a1a','#6a0dad','#1a4a8b','#1a6b3a','#8b5a00','#8b2252','#2a5a6b','#6b3a00','#3a6b1a'];
      for (let shelf=1; shelf<=6; shelf++) {
        const sy = Math.floor(rows*0.08) + shelf*bookH;
        ctx.fillStyle = '#1e1628';
        ctx.fillRect(bsX*PX, (sy-1)*PX, bsW*PX, PX); // shelf plank
        // books
        let bx = bsX;
        for (let bi=0; bi<bsW*0.85; ) {
          const bw = 1 + (Math.abs(Math.sin(bi*2.3+shelf*4.7))*1.5|0);
          const bh = bookH - 1 - (Math.abs(Math.sin(bi*1.7+shelf*2.1))*2|0);
          ctx.fillStyle = bookColors[(bi+shelf*3)%bookColors.length];
          ctx.fillRect((bsX+bi)*PX, (sy-1-bh)*PX, bw*PX, bh*PX);
          bi += bw;
        }
      }

      // ════════════════════════════════════════
      // DESK — horizontal surface
      // ════════════════════════════════════════
      const deskY = Math.floor(rows * 0.76);
      ctx.fillStyle = '#1c1218';
      ctx.fillRect(Math.floor(cols*0.08)*PX, deskY*PX, Math.floor(cols*0.84)*PX, 2*PX);
      ctx.fillStyle = '#150e14';
      ctx.fillRect(Math.floor(cols*0.10)*PX, (deskY+2)*PX, Math.floor(cols*0.80)*PX, 8*PX);

      // desk items — keyboard, misc
      ctx.fillStyle = '#0e0a12';
      ctx.fillRect(Math.floor(cols*0.35)*PX, (deskY+2)*PX, Math.floor(cols*0.22)*PX, 2*PX);

      // ════════════════════════════════════════
      // MONITOR — center
      // ════════════════════════════════════════
      const mX = Math.floor(cols * 0.35);
      const mW = Math.floor(cols * 0.30);
      const mH = Math.floor(rows * 0.18);
      const mY = deskY - mH - 1;

      // outer bezel
      ctx.fillStyle = '#0d0a10';
      ctx.fillRect(mX*PX, mY*PX, mW*PX, mH*PX);

      // screen content — code editor style
      const scX = mX+1, scY = mY+1, scW = mW-2, scH = mH-2;
      // left panel: dark bg (file tree)
      ctx.fillStyle = '#1a1428';
      ctx.fillRect(scX*PX, scY*PX, Math.floor(scW*0.3)*PX, scH*PX);
      // right panel: lighter (editor)
      ctx.fillStyle = '#f0d080';
      ctx.fillRect((scX+Math.floor(scW*0.3))*PX, scY*PX, Math.floor(scW*0.7)*PX, scH*PX);

      // code lines on right panel
      const codeC = ['#c0392b','#8e44ad','#2471a3','#1e8449','#d35400','#7d3c98','#1a5276'];
      for (let ln=0; ln<scH-1; ln++) {
        const lw = 2 + (Math.abs(Math.sin(ln*2.3+slow*0.3))*Math.floor(scW*0.5))|0;
        ctx.fillStyle = codeC[ln%codeC.length];
        ctx.fillRect((scX+Math.floor(scW*0.31))*PX, (scY+ln)*PX, lw*PX, PX);
      }

      // file tree lines on left
      for (let ln=1; ln<scH-1; ln++) {
        const lw = 1 + (Math.abs(Math.sin(ln*1.7))*Math.floor(scW*0.2))|0;
        ctx.fillStyle = 'rgba(180,140,220,0.6)';
        ctx.fillRect((scX+1)*PX, (scY+ln)*PX, lw*PX, PX);
      }

      // highlighted line (cursor)
      const curLine = (Math.floor(slow*2))%scH;
      ctx.fillStyle = 'rgba(255,220,100,0.3)';
      ctx.fillRect((scX+Math.floor(scW*0.3))*PX, (scY+curLine)*PX, Math.floor(scW*0.7)*PX, PX);

      // cursor blink
      if (Math.floor(t/25)%2===0) {
        ctx.fillStyle = '#222';
        ctx.fillRect((scX+Math.floor(scW*0.31)+3)*PX, (scY+curLine)*PX, PX, PX);
      }

      // bottom taskbar
      ctx.fillStyle = '#0a0810';
      ctx.fillRect((scX+Math.floor(scW*0.3))*PX, (scY+scH-2)*PX, Math.floor(scW*0.7)*PX, 2*PX);
      ctx.fillStyle = '#00d4ff';
      ctx.fillRect((scX+Math.floor(scW*0.3)+1)*PX, (scY+scH-2)*PX, Math.floor(scW*0.15)*PX, PX);

      // monitor stand
      ctx.fillStyle = '#0a0810';
      ctx.fillRect((mX+mW/2-1|0)*PX, (mY+mH)*PX, 3*PX, 2*PX);
      ctx.fillRect((mX+mW/2-3|0)*PX, (mY+mH+2)*PX, 7*PX, PX);

      // ════════════════════════════════════════
      // PERSON SILHOUETTE — seated, back to viewer
      // ════════════════════════════════════════
      const pCX = Math.floor(cols * 0.50); // center x of person
      const pBotY = deskY;                 // seated, shoulders at desk level - some

      // chair back
      ctx.fillStyle = '#0c0a14';
      for (let py=-14; py<-4; py++)
        ctx.fillRect((pCX-3)*PX, (pBotY+py)*PX, 7*PX, PX);

      // body / torso
      ctx.fillStyle = '#100e1a';
      for (let py=-10; py<0; py++) {
        const bw = 6 + (py < -5 ? 0 : 1);
        ctx.fillRect((pCX-bw/2|0)*PX, (pBotY+py)*PX, bw*PX, PX);
      }

      // shoulders (wider)
      ctx.fillStyle = '#0e0c18';
      ctx.fillRect((pCX-5)*PX, (pBotY-10)*PX, 11*PX, 3*PX);

      // neck
      ctx.fillStyle = '#18121e';
      ctx.fillRect((pCX-1)*PX, (pBotY-14)*PX, 3*PX, 4*PX);

      // head
      ctx.fillStyle = '#1a1020';
      for (let py=-20; py<-14; py++) {
        const hw = 3 + (py < -18 ? 2 : py < -16 ? 3 : 2);
        ctx.fillRect((pCX-hw/2|0)*PX, (pBotY+py)*PX, hw*PX, PX);
      }

      // hair (curly/afro top)
      ctx.fillStyle = '#0a0810';
      [[-2,-22],[-1,-23],[0,-23],[1,-23],[2,-22],[-2,-21],[2,-21],[-1,-21],[1,-21],[0,-22]].forEach(([dx,dy]) =>
        ctx.fillRect((pCX+dx)*PX, (pBotY+dy)*PX, PX, PX)
      );

      // headphones
      ctx.fillStyle = '#1e1430';
      ctx.fillRect((pCX-4)*PX, (pBotY-21)*PX, 2*PX, 5*PX);
      ctx.fillRect((pCX+3)*PX, (pBotY-21)*PX, 2*PX, 5*PX);
      ctx.fillRect((pCX-4)*PX, (pBotY-22)*PX, 9*PX, 2*PX);

      // arms on desk
      ctx.fillStyle = '#0e0c18';
      ctx.fillRect((pCX-7)*PX, (pBotY-4)*PX, 4*PX, 4*PX);
      ctx.fillRect((pCX+4)*PX, (pBotY-4)*PX, 4*PX, 4*PX);

      // ════════════════════════════════════════
      // SCREEN GLOW on person & desk
      // ════════════════════════════════════════
      const glowA = 0.06 + 0.02*Math.sin(slow);
      ctx.fillStyle = `rgba(255,210,100,${glowA})`;
      ctx.fillRect((pCX-6)*PX, (pBotY-21)*PX, 13*PX, 22*PX);

      // ════════════════════════════════════════
      // PLANT — right side
      // ════════════════════════════════════════
      const plX = Math.floor(cols * 0.90);
      const plY = deskY - 1;
      // pot
      ctx.fillStyle = '#2a1a0a';
      ctx.fillRect(plX*PX, plY*PX, 4*PX, 3*PX);
      // stems & leaves — gently sway
      const sway = Math.sin(slow * 0.4) * 0.8;
      const leaves = [{dx:-2,dy:-4,lw:3,lh:3},{dx:1,dy:-5,lw:3,lh:2},{dx:-3,dy:-7,lw:4,lh:2},{dx:2,dy:-8,lw:3,lh:2},{dx:-1,dy:-9,lw:2,lh:3}];
      leaves.forEach((l, i) => {
        const ox = (sway * (i%2===0?1:-1)) | 0;
        ctx.fillStyle = i%2===0 ? '#1a3a1a' : '#2a4a2a';
        ctx.fillRect((plX+l.dx+ox)*PX, (plY+l.dy)*PX, l.lw*PX, l.lh*PX);
      });

      // ════════════════════════════════════════
      // SPEAKER / MICROPHONE right of monitor
      // ════════════════════════════════════════
      const spX = mX + mW + 2;
      ctx.fillStyle = '#0d0a12';
      ctx.fillRect(spX*PX, (deskY-6)*PX, 2*PX, 6*PX);
      ctx.fillStyle = '#1a1228';
      ctx.fillRect((spX-1)*PX, (deskY-8)*PX, 4*PX, 3*PX);
    }
  },

];

function buildWpPanel() {
  // solid swatches
  const colsEl = document.getElementById('wp-colors');
  WP_SOLIDS.forEach((c, i) => {
    const d = document.createElement('div');
    d.className = 'wp-swatch';
    d.style.background = c;
    d.dataset.wpKey = 'solid_' + i;
    if (c === '#0a0a0a') { d.style.border = '1.5px solid rgba(255,255,255,.2)'; }
    d.addEventListener('click', () => applyWallpaper({ type: 'solid', value: c, key: d.dataset.wpKey }));
    colsEl.appendChild(d);
  });
  // gradient swatches
  const gradsEl = document.getElementById('wp-gradients');
  WP_GRADS.forEach((g, i) => {
    const d = document.createElement('div');
    d.className = 'wp-grad';
    d.style.background = g;
    d.dataset.wpKey = 'grad_' + i;
    d.addEventListener('click', () => applyWallpaper({ type: 'gradient', value: g, key: d.dataset.wpKey }));
    gradsEl.appendChild(d);
  });
  // pixel art swatches
  const pixelsEl = document.getElementById('wp-pixels');
  WP_PIXEL_THEMES.forEach(theme => {
    const wrap = document.createElement('div');
    wrap.className = 'wp-pixel-swatch';
    wrap.dataset.wpKey = theme.key;
    wrap.title = theme.label;
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 44;
    const ctx = canvas.getContext('2d');
    theme.draw(ctx, 64, 44);
    wrap.appendChild(canvas);
    const lbl = document.createElement('div');
    lbl.className = 'wp-pixel-label';
    lbl.textContent = theme.label;
    wrap.appendChild(lbl);
    wrap.addEventListener('click', () => applyWallpaper({ type: 'pixel', value: theme.key, key: theme.key }));
    pixelsEl.appendChild(wrap);
  });
  // coleção de imagens prontas — e vídeos em loop, em uma seção própria
  // separada (não é uma "imagem", então não fica misturado no mesmo grid)
  const galleryEl      = document.getElementById('wp-gallery');
  const videoGalleryEl = document.getElementById('wp-video-gallery');
  WP_GALLERY.forEach(item => {
    const isVideo = item.type === 'video';
    const d = document.createElement('div');
    d.className = 'wp-gallery-swatch' + (isVideo ? ' is-video' : '');
    d.dataset.wpKey = item.key;
    d.title = item.label;
    if (isVideo) {
      // Sem preview animado no seletor (custaria banda) — só um ícone de play sobre fundo escuro
      d.innerHTML = '<span class="wp-gallery-play">&#9654;</span>';
    } else {
      d.style.backgroundImage = 'url(' + item.url + ')';
    }
    d.addEventListener('click', () => applyWallpaper({ type: item.type || 'image', value: item.url, key: item.key }));
    (isVideo ? videoGalleryEl : galleryEl).appendChild(d);
  });
}

/* ── WALLPAPER — uses IndexedDB for images (no quota limit),
      localStorage for solid/gradient (tiny strings) ── */

function _wpIdb() {
  // Open (or reuse) a dedicated IDB for wallpaper images
  return new Promise((ok, fail) => {
    const req = indexedDB.open('mydesk_wp', 1);
    req.onupgradeneeded = e => e.target.result.createObjectStore('wp', { keyPath: 'key' });
    req.onsuccess = e => ok(e.target.result);
    req.onerror   = ()  => fail();
  });
}

// ── Save raw Blob (original file, zero quality loss) ──
async function _wpIdbSave(username, blob) {
  try {
    const db = await _wpIdb();
    const tx = db.transaction('wp', 'readwrite');
    tx.objectStore('wp').put({ key: 'wp_' + username, blob });
    await new Promise((ok, fail) => { tx.oncomplete = ok; tx.onerror = fail; });
  } catch(e) { console.warn('WP IDB save error', e); }
}

// ── Load Blob and return an object URL (revoked on next load/reset) ──
let _wpCurrentObjUrl = null;
async function _wpIdbLoad(username) {
  try {
    const db = await _wpIdb();
    const result = await new Promise((ok, fail) => {
      const req = db.transaction('wp','readonly').objectStore('wp').get('wp_' + username);
      req.onsuccess = () => ok(req.result || null);
      req.onerror   = () => fail();
    });
    if (!result) return null;
    // revoke previous object URL to free memory
    if (_wpCurrentObjUrl) { URL.revokeObjectURL(_wpCurrentObjUrl); _wpCurrentObjUrl = null; }
    _wpCurrentObjUrl = URL.createObjectURL(result.blob);
    return _wpCurrentObjUrl;
  } catch(e) { return null; }
}

async function _wpIdbDelete(username) {
  try {
    const db = await _wpIdb();
    db.transaction('wp','readwrite').objectStore('wp').delete('wp_' + username);
    if (_wpCurrentObjUrl) { URL.revokeObjectURL(_wpCurrentObjUrl); _wpCurrentObjUrl = null; }
  } catch(_) {}
}

function _applyWpVisual(wp) {
  const board    = document.getElementById('board');
  const bgLayer  = document.getElementById('board-bg');
  const vidLayer = document.getElementById('board-bg-video');
  const dots     = document.getElementById('board-dots');

  document.querySelectorAll('.wp-swatch,.wp-grad,.wp-pixel-swatch,.wp-gallery-swatch').forEach(el => el.classList.remove('active'));
  if (wp.key) {
    const el = document.querySelector('[data-wp-key="'+wp.key+'"]');
    if (el) el.classList.add('active');
  }
  activeWpKey = wp.key || null;

  // Sai do fundo de vídeo sempre que o tipo escolhido não for vídeo — evita
  // continuar decodificando/tocando um <video> escondido sem necessidade.
  if (wp.type !== 'video' && vidLayer) {
    vidLayer.style.opacity = '0';
    vidLayer.pause();
  }

  if (wp.type === 'pixel') {
    const theme = WP_PIXEL_THEMES.find(t => t.key === wp.value);
    if (!theme) return;
    startPixelAnimation(theme);
    board.style.background = '#000';
    bgLayer.style.backgroundImage = 'none';
    bgLayer.style.opacity = '0';
    dots.style.opacity = '0';
    return;
  } else {
    stopPixelAnimation();
  }
  if (wp.type === 'video') {
    board.style.background = '#000';
    bgLayer.style.backgroundImage = 'none';
    bgLayer.style.opacity = '0';
    if (vidLayer) {
      if (vidLayer.dataset.src !== wp.value) { vidLayer.src = wp.value; vidLayer.dataset.src = wp.value; }
      vidLayer.style.opacity = '1';
      vidLayer.play().catch(() => {});
    }
    dots.style.opacity = '0.015';
  } else if (wp.type === 'image') {
    board.style.background = '#000';
    bgLayer.style.backgroundImage = 'url(' + wp.value + ')';
    bgLayer.style.opacity = '1';
    dots.style.opacity = '0.015';
  } else if (wp.type === 'gradient') {
    board.style.background = wp.value;
    bgLayer.style.backgroundImage = 'none';
    bgLayer.style.opacity = '0';
    dots.style.opacity = '0.035';
  } else {
    board.style.background = wp.value;
    bgLayer.style.backgroundImage = 'none';
    bgLayer.style.opacity = '0';
    dots.style.opacity = wp.value === '#0a0a0a' ? '0.035' : '0.025';
  }
}

async function applyWallpaper(wp, skipSave) {
  _applyWpVisual(wp);

  if (!skipSave && CU) {
    if (wp.type === 'image' && wp.blob) {
      // ── Custom upload — store original Blob in IndexedDB, no compression ──
      await _wpIdbSave(CU.username, wp.blob);
      // Only tiny metadata goes to localStorage
      localStorage.setItem('md_wp_' + CU.username, JSON.stringify({ type: 'image', key: null }));
    } else {
      // Solid / gradient / pixel / coleção (imagem pronta bundlada, só a URL) —
      // nada de Blob aqui, então nunca precisa do IndexedDB.
      await _wpIdbDelete(CU.username);
      localStorage.setItem('md_wp_' + CU.username, JSON.stringify({ type: wp.type, value: wp.value, key: wp.key || null }));
    }
  }
}

async function loadWallpaper() {
  if (!CU) return;
  try {
    const raw = localStorage.getItem('md_wp_' + CU.username);
    if (!raw) return;
    const meta = JSON.parse(raw);

    if (meta.type === 'image' && !meta.value) {
      // Custom upload (sem value = Blob salvo no IndexedDB) —
      // Blob → FileReader dataURL so background-image: url() always works
      // (objectURL expires when tab closes; dataURL is self-contained)
      const db = await _wpIdb();
      const record = await new Promise((ok, fail) => {
        const req = db.transaction('wp','readonly').objectStore('wp').get('wp_' + CU.username);
        req.onsuccess = () => ok(req.result || null);
        req.onerror   = () => fail();
      });
      if (!record || !record.blob) return;
      const dataUrl = await new Promise((ok, fail) => {
        const fr = new FileReader();
        fr.onload  = () => ok(fr.result);
        fr.onerror = fail;
        fr.readAsDataURL(record.blob);
      });
      _applyWpVisual({ type: 'image', value: dataUrl, key: null });
    } else {
      _applyWpVisual(meta);
      if (meta.key) {
        const el = document.querySelector('[data-wp-key="'+meta.key+'"]');
        if (el) el.classList.add('active');
        activeWpKey = meta.key;
      }
    }
  } catch(e) { console.warn('loadWallpaper error', e); }
}

function resetWallpaper() {
  applyWallpaper({ type: 'solid', value: '#0a0a0a', key: 'solid_0' });
}

function toggleWpPanel() {
  wpPanelOpen = !wpPanelOpen;
  document.getElementById('wp-panel').classList.toggle('open', wpPanelOpen);
}

// close panel when clicking outside
document.addEventListener('click', e => {
  if (!wpPanelOpen) return;
  const panel = document.getElementById('wp-panel');
  const btn   = document.getElementById('btn-wallpaper');
  if (!panel.contains(e.target) && e.target !== btn && !btn.contains(e.target)) {
    wpPanelOpen = false;
    panel.classList.remove('open');
  }
});

/* ════════════════════════════════════════════════════════════
   i18n — Auto language detection by geolocation
   Detects country via ipapi.co, picks closest language,
   then applies translations to the entire UI.
════════════════════════════════════════════════════════════ */

const LANGS = {
  /* ── Portuguese (Brazil + Portugal) ── */
  pt: {
    // auth
    appSub:          'workspace de notas corporativo',
    feat1Title:      'Notas inteligentes', feat1Desc: 'Cards modernos com prazos e anexos.',
    feat2Title:      'Desktop livre',      feat2Desc: 'Arraste e posicione onde quiser.',
    feat3Title:      'Alertas de prazo',   feat3Desc: 'Avisos automáticos antes do vencimento.',
    feat4Title:      'Contas isoladas',    feat4Desc: 'Cada usuário tem seu espaço privado.',
    welcomeEyebrow:  'MyDesk',
    welcomeHeading:  'Seu espaço',
    welcomeDesc:     'Entre com sua conta para acessar seu painel pessoal de notas.',
    statNotes:       'Notas ilimitadas', statAccounts: 'Contas isoladas', statFiles: 'Arquivos anexados',
    tabLogin:        'Entrar', tabReg: 'Criar conta',
    lblUser:         'Usuário', phUser: 'seu usuário',
    lblPass:         'Senha',  phPass: '••••••••',
    hintLocal:       'Dados salvos localmente neste navegador.',
    btnLogin:        'Entrar →',
    switchToReg:     'Sem conta?', switchToRegLink: 'Criar agora',
    lblName:         'Nome',  phName: 'Seu nome',
    lblUserReg:      'Usuário', phUserReg: 'login',
    lblRole:         'Função', phRole: 'designer · dev · gerente…',
    lblPassReg:      'Senha',  phPassReg: 'mínimo 6 caracteres',
    lblPass2:        'Confirmar senha', phPass2: 'repita a senha',
    btnRegister:     'Criar conta →',
    switchToLogin:   'Já tem conta?', switchToLoginLink: 'Entrar',
    regHeading:      'Crie sua', regHeadingHl: 'conta grátis',
    regDesc:         'Preencha os dados abaixo e comece a organizar suas notas.',
    twPhrases:       ['organizado.','produtivo.','conectado.','inteligente.'],
    // toolbar
    btnNew:          'Nova nota', btnShuffle: 'Reorganizar', btnClear: 'Limpar tudo',
    btnWallpaper:    'Fundo', btnFriends: 'Amigos', btnExit: 'Sair',
    noteCount:       (n) => n + ' nota' + (n !== 1 ? 's' : ''),
    // board
    emptyHint:       'Clique em "Nova nota" para começar',
    // modal
    modalTitle:      'Nova nota', modalSub: 'Título obrigatório · demais campos opcionais',
    lblTitle:        'Título',   phTitle: 'Do que se trata esta nota?',
    lblContent:      'Conteúdo', phContent: 'Anotações, links, tarefas…',
    secDates:        'Prazos',
    lblStart:        'Data de início', lblEnd: 'Prazo final',
    remLabel:        'Ativar lembrete de prazo',
    remUnit:         'dias antes do prazo',
    secColor:        'Cor do card',
    btnCancel:       'Cancelar', btnCreate: 'Criar nota',
    // note card
    phNoteTitle:     'Título da nota',
    phNoteBody:      'Descrição, links ou tarefas…',
    dateStart:       'Início', dateEnd: 'Prazo',
    secColorNote:    'Cor',
    dropFile:        '＋ Anexar arquivo',
    // status
    statusTodo:      'A fazer', statusProgress: 'Andamento',
    statusDone:      'Concluído', statusClosed: 'Encerrado',
    // wallpaper panel
    wpTitle:         '🎨 Fundo do painel',
    wpSolids:        'Cores sólidas', wpGrads: 'Gradientes',
    wpCustom:        'Imagem Animada',
    wpUpload:        '📂 Escolher imagem do computador',
    wpReset:         '↺ Restaurar padrão',
    // social
    socialTitle:     '👥 Social',
    tabFriends:      'Amigos', tabRequests: 'Pedidos',
    addPlaceholder:  'usuário para adicionar',
    addBtn:          'Adicionar',
    noFriends:       'Nenhum amigo ainda. Adicione alguém!',
    secFriends:      'Amigos', secSent: 'Enviados',
    noRequests:      'Nenhuma solicitação pendente.',
    secRequests:     'Pedidos recebidos',
    secLblWaiting:   'aguardando',
    wantsToAdd:      'quer ser seu amigo',
    chatPlaceholder: 'Mensagem…',
    clearChat:       'Limpar conversa',
    chatCleared:     'Conversa apagada',
    // errors / toasts
    errNoUser:       'Digite um usuário.', errSelf: 'Não pode adicionar a si mesmo.',
    errNotFound:     'Usuário não encontrado.', errAlready: 'Já são amigos.',
    errSent:         'Pedido já enviado.',
    toastSent:       'Pedido enviado para @', toastAccepted: ' aceitou sua solicitação!',
    toastRequest:    ' enviou pedido de amizade',
    errNoName:       'Informe seu nome.', errNoUsername: 'Escolha um usuário.',
    errUserFormat:   'Usuário: 2–20 chars, letras minúsculas, números ou _',
    errPassShort:    'Senha: mínimo 6 caracteres.', errPassMatch: 'Senhas não coincidem.',
    errUserExists:   'Este usuário já existe. Faça login ou escolha outro nome.',
    errNoLoginUser:  'Informe o usuário.', errNoLoginPass: 'Informe a senha.',
    errUserNotFound: 'Usuário não encontrado.', errBadPass: 'Senha incorreta.',
    errCorrupt:      'Conta com dados corrompidos foi removida. Por favor, crie a conta novamente.',
    toastCreated:    'Conta criada! Faça o login.',
    toastCleared:    'Conversa apagada.',
    online: 'online', offline: 'offline',
    fileTooBig:      ' excede 5MB', fileSent: '📎 arquivo',
  },

  /* ── English ── */
  en: {
    appSub:          'corporate notes workspace',
    feat1Title:      'Smart notes',    feat1Desc: 'Modern cards with deadlines and attachments.',
    feat2Title:      'Free desktop',   feat2Desc: 'Drag and position wherever you want.',
    feat3Title:      'Deadline alerts',feat3Desc: 'Automatic reminders before due dates.',
    feat4Title:      'Isolated accounts', feat4Desc: 'Each user has their own private space.',
    welcomeEyebrow:  'MyDesk',
    welcomeHeading:  'Your space',
    welcomeDesc:     'Sign in to access your personal notes board.',
    statNotes:       'Unlimited notes', statAccounts: 'Isolated accounts', statFiles: 'File attachments',
    tabLogin:        'Sign in', tabReg: 'Create account',
    lblUser:         'Username', phUser: 'your username',
    lblPass:         'Password', phPass: '••••••••',
    hintLocal:       'Data saved locally in this browser.',
    btnLogin:        'Sign in →',
    switchToReg:     'No account?', switchToRegLink: 'Create one',
    lblName:         'Name',     phName: 'Your name',
    lblUserReg:      'Username', phUserReg: 'login',
    lblRole:         'Role',     phRole: 'designer · dev · manager…',
    lblPassReg:      'Password', phPassReg: 'minimum 6 characters',
    lblPass2:        'Confirm password', phPass2: 'repeat your password',
    btnRegister:     'Create account →',
    switchToLogin:   'Already have an account?', switchToLoginLink: 'Sign in',
    regHeading:      'Create your', regHeadingHl: 'free account',
    regDesc:         'Fill in your details below to start organizing your notes.',
    twPhrases:       ['organized.','productive.','connected.','intelligent.'],
    btnNew:          'New note', btnShuffle: 'Rearrange', btnClear: 'Clear all',
    btnWallpaper:    'Background', btnFriends: 'Friends', btnExit: 'Sign out',
    noteCount:       (n) => n + ' note' + (n !== 1 ? 's' : ''),
    emptyHint:       'Click "New note" to get started',
    modalTitle:      'New note', modalSub: 'Title required · other fields optional',
    lblTitle:        'Title',   phTitle: 'What is this note about?',
    lblContent:      'Content', phContent: 'Notes, links, tasks…',
    secDates:        'Deadlines',
    lblStart:        'Start date', lblEnd: 'Due date',
    remLabel:        'Enable deadline reminder',
    remUnit:         'days before due date',
    secColor:        'Card color',
    btnCancel:       'Cancel', btnCreate: 'Create note',
    phNoteTitle:     'Note title',
    phNoteBody:      'Description, links or tasks…',
    dateStart:       'Start', dateEnd:  'Due',
    secColorNote:    'Color',
    dropFile:        '＋ Attach file',
    statusTodo:      'To do', statusProgress: 'In progress',
    statusDone:      'Done', statusClosed: 'Closed',
    wpTitle:         '🎨 Board background',
    wpSolids:        'Solid colors', wpGrads: 'Gradients',
    wpCustom:        'Custom image',
    wpUpload:        '📂 Choose image from computer',
    wpReset:         '↺ Restore default',
    socialTitle:     '👥 Social',
    tabFriends:      'Friends', tabRequests: 'Requests',
    addPlaceholder:  'username to add',
    addBtn:          'Add',
    noFriends:       'No friends yet. Add someone!',
    secFriends:      'Friends', secSent: 'Sent',
    noRequests:      'No pending requests.',
    secRequests:     'Incoming requests',
    secLblWaiting:   'waiting',
    wantsToAdd:      'wants to be your friend',
    chatPlaceholder: 'Message…',
    clearChat:       'Clear conversation',
    chatCleared:     'Conversation cleared',
    errNoUser:       'Enter a username.', errSelf: 'Cannot add yourself.',
    errNotFound:     'User not found.', errAlready: 'Already friends.',
    errSent:         'Request already sent.',
    toastSent:       'Request sent to @', toastAccepted: ' accepted your request!',
    toastRequest:    ' sent a friend request',
    errNoName:       'Enter your name.', errNoUsername: 'Choose a username.',
    errUserFormat:   'Username: 2–20 chars, lowercase letters, numbers or _',
    errPassShort:    'Password: minimum 6 characters.', errPassMatch: 'Passwords do not match.',
    errUserExists:   'Username already taken. Sign in or choose another.',
    errNoLoginUser:  'Enter your username.', errNoLoginPass: 'Enter your password.',
    errUserNotFound: 'User not found.', errBadPass: 'Incorrect password.',
    errCorrupt:      'Account data was corrupted and removed. Please create your account again.',
    toastCreated:    'Account created! Please sign in.',
    toastCleared:    'Conversation cleared.',
    online: 'online', offline: 'offline',
    fileTooBig:      ' exceeds 5MB', fileSent: '📎 file',
  },

  /* ── Spanish ── */
  es: {
    appSub:          'espacio de trabajo de notas',
    feat1Title:      'Notas inteligentes', feat1Desc: 'Tarjetas modernas con fechas y archivos.',
    feat2Title:      'Escritorio libre',   feat2Desc: 'Arrastra y posiciona donde quieras.',
    feat3Title:      'Alertas de plazo',   feat3Desc: 'Recordatorios automáticos antes del vencimiento.',
    feat4Title:      'Cuentas aisladas',   feat4Desc: 'Cada usuario tiene su propio espacio privado.',
    welcomeEyebrow:  'MyDesk',
    welcomeHeading:  'Tu espacio',
    welcomeDesc:     'Inicia sesión para acceder a tu tablero personal de notas.',
    statNotes:       'Notas ilimitadas', statAccounts: 'Cuentas aisladas', statFiles: 'Archivos adjuntos',
    tabLogin:        'Entrar', tabReg: 'Crear cuenta',
    lblUser:         'Usuario', phUser: 'tu usuario',
    lblPass:         'Contraseña', phPass: '••••••••',
    hintLocal:       'Datos guardados localmente en este navegador.',
    btnLogin:        'Entrar →',
    switchToReg:     '¿Sin cuenta?', switchToRegLink: 'Crear ahora',
    lblName:         'Nombre', phName: 'Tu nombre',
    lblUserReg:      'Usuario', phUserReg: 'login',
    lblRole:         'Función', phRole: 'diseñador · dev · gerente…',
    lblPassReg:      'Contraseña', phPassReg: 'mínimo 6 caracteres',
    lblPass2:        'Confirmar contraseña', phPass2: 'repite la contraseña',
    btnRegister:     'Crear cuenta →',
    switchToLogin:   '¿Ya tienes cuenta?', switchToLoginLink: 'Entrar',
    regHeading:      'Crea tu', regHeadingHl: 'cuenta gratis',
    regDesc:         'Completa los datos para comenzar a organizar tus notas.',
    twPhrases:       ['organizado.','productivo.','conectado.','inteligente.'],
    btnNew:          'Nueva nota', btnShuffle: 'Reorganizar', btnClear: 'Limpiar todo',
    btnWallpaper:    'Fondo', btnFriends: 'Amigos', btnExit: 'Salir',
    noteCount:       (n) => n + ' nota' + (n !== 1 ? 's' : ''),
    emptyHint:       'Haz clic en "Nueva nota" para comenzar',
    modalTitle:      'Nueva nota', modalSub: 'Título obligatorio · otros campos opcionales',
    lblTitle:        'Título',    phTitle: '¿De qué trata esta nota?',
    lblContent:      'Contenido', phContent: 'Notas, enlaces, tareas…',
    secDates:        'Plazos',
    lblStart:        'Fecha de inicio', lblEnd: 'Fecha límite',
    remLabel:        'Activar recordatorio de plazo',
    remUnit:         'días antes del plazo',
    secColor:        'Color de la tarjeta',
    btnCancel:       'Cancelar', btnCreate: 'Crear nota',
    phNoteTitle:     'Título de la nota',
    phNoteBody:      'Descripción, enlaces o tareas…',
    dateStart:       'Inicio', dateEnd: 'Plazo',
    secColorNote:    'Color',
    dropFile:        '＋ Adjuntar archivo',
    statusTodo:      'Por hacer', statusProgress: 'En progreso',
    statusDone:      'Completado', statusClosed:   'Cerrado',
    wpTitle:         '🎨 Fondo del panel',
    wpSolids:        'Colores sólidos', wpGrads: 'Degradados',
    wpCustom:        'Imagen personalizada',
    wpUpload:        '📂 Elegir imagen del ordenador',
    wpReset:         '↺ Restaurar predeterminado',
    socialTitle:     '👥 Social',
    tabFriends:      'Amigos', tabRequests: 'Solicitudes',
    addPlaceholder:  'usuario para agregar',
    addBtn:          'Agregar',
    noFriends:       'Sin amigos todavía. ¡Agrega a alguien!',
    secFriends:      'Amigos', secSent: 'Enviadas',
    noRequests:      'Sin solicitudes pendientes.',
    secRequests:     'Solicitudes recibidas',
    secLblWaiting:   'esperando',
    wantsToAdd:      'quiere ser tu amigo',
    chatPlaceholder: 'Mensaje…',
    clearChat:       'Limpiar conversación',
    chatCleared:     'Conversación borrada',
    errNoUser:       'Ingresa un usuario.', errSelf: 'No puedes agregarte a ti mismo.',
    errNotFound:     'Usuario no encontrado.', errAlready: 'Ya son amigos.',
    errSent:         'Solicitud ya enviada.',
    toastSent:       'Solicitud enviada a @', toastAccepted: ' aceptó tu solicitud!',
    toastRequest:    ' envió una solicitud de amistad',
    errNoName:       'Ingresa tu nombre.', errNoUsername: 'Elige un usuario.',
    errUserFormat:   'Usuario: 2–20 chars, letras minúsculas, números o _',
    errPassShort:    'Contraseña: mínimo 6 caracteres.', errPassMatch: 'Las contraseñas no coinciden.',
    errUserExists:   'Usuario ya existe. Inicia sesión o elige otro.',
    errNoLoginUser:  'Ingresa tu usuario.', errNoLoginPass: 'Ingresa tu contraseña.',
    errUserNotFound: 'Usuario no encontrado.', errBadPass:     'Contraseña incorrecta.',
    errCorrupt:      'Datos de cuenta corruptos eliminados. Crea la cuenta nuevamente.',
    toastCreated:    '¡Cuenta creada! Inicia sesión.',
    toastCleared:    'Conversación borrada.',
    online: 'en línea', offline: 'desconectado',
    fileTooBig:      ' excede 5MB', fileSent: '📎 archivo',
  },

  /* ── French ── */
  fr: {
    appSub:          'espace de travail de notes',
    feat1Title:      'Notes intelligentes', feat1Desc: 'Cartes modernes avec délais et pièces jointes.',
    feat2Title:      'Bureau libre',        feat2Desc: 'Glissez et positionnez où vous voulez.',
    feat3Title:      'Alertes de délai',    feat3Desc: 'Rappels automatiques avant échéance.',
    feat4Title:      'Comptes isolés',      feat4Desc: 'Chaque utilisateur a son espace privé.',
    welcomeEyebrow:  'MyDesk',
    welcomeHeading:  'Votre espace',
    welcomeDesc:     'Connectez-vous pour accéder à votre tableau de notes personnel.',
    statNotes:       'Notes illimitées', statAccounts: 'Comptes isolés', statFiles: 'Fichiers joints',
    tabLogin:        'Se connecter', tabReg: 'Créer un compte',
    lblUser:         'Utilisateur', phUser: 'votre identifiant',
    lblPass:         'Mot de passe', phPass: '••••••••',
    hintLocal:       'Données sauvegardées localement dans ce navigateur.',
    btnLogin:        'Se connecter →',
    switchToReg:     'Pas de compte ?', switchToRegLink: 'Créer maintenant',
    lblName:         'Nom',          phName: 'Votre nom',
    lblUserReg:      'Identifiant',  phUserReg: 'login',
    lblRole:         'Fonction',     phRole: 'designer · dev · manager…',
    lblPassReg:      'Mot de passe', phPassReg: 'minimum 4 caractères',
    lblPass2:        'Confirmer le mot de passe', phPass2: 'répétez le mot de passe',
    btnRegister:     'Créer un compte →',
    switchToLogin:   'Déjà un compte ?', switchToLoginLink: 'Se connecter',
    regHeading:      'Créez votre', regHeadingHl: 'compte gratuit',
    regDesc:         'Remplissez les informations ci-dessous pour commencer.',
    twPhrases:       ['organisé.','productif.','connecté.','intelligent.'],
    btnNew:          'Nouvelle note', btnShuffle: 'Réorganiser', btnClear: 'Tout effacer',
    btnWallpaper:    'Fond', btnFriends: 'Amis', btnExit: 'Déconnexion',
    noteCount:       (n) => n + ' note' + (n !== 1 ? 's' : ''),
    emptyHint:       'Cliquez sur "Nouvelle note" pour commencer',
    modalTitle:      'Nouvelle note', modalSub: 'Titre requis · autres champs optionnels',
    lblTitle:        'Titre',   phTitle: 'De quoi parle cette note ?',
    lblContent:      'Contenu', phContent: 'Notes, liens, tâches…',
    secDates:        'Délais',
    lblStart:        'Date de début', lblEnd: 'Date limite',
    remLabel:        'Activer le rappel de délai',
    remUnit:         'jours avant le délai',
    secColor:        'Couleur de la carte',
    btnCancel:       'Annuler', btnCreate: 'Créer la note',
    phNoteTitle:     'Titre de la note',
    phNoteBody:      'Description, liens ou tâches…',
    dateStart:       'Début', dateEnd: 'Délai',
    secColorNote:    'Couleur',
    dropFile:        '＋ Joindre un fichier',
    statusTodo:      'À faire', statusProgress: 'En cours',
    statusDone:      'Terminé', statusClosed:   'Clôturé',
    wpTitle:         '🎨 Fond du tableau',
    wpSolids:        'Couleurs unies', wpGrads: 'Dégradés',
    wpCustom:        'Image personnalisée',
    wpUpload:        '📂 Choisir une image',
    wpReset:         '↺ Restaurer par défaut',
    socialTitle:     '👥 Social',
    tabFriends:      'Amis', tabRequests: 'Demandes',
    addPlaceholder:  'identifiant à ajouter',
    addBtn:          'Ajouter',
    noFriends:       "Pas encore d'amis. Ajoutez quelqu'un !",
    secFriends:      'Amis', secSent: 'Envoyées',
    noRequests:      'Aucune demande en attente.',
    secRequests:     'Demandes reçues',
    secLblWaiting:   'en attente',
    wantsToAdd:      'veut être votre ami',
    chatPlaceholder: 'Message…',
    clearChat:       'Effacer la conversation',
    chatCleared:     'Conversation effacée',
    errNoUser:       'Entrez un identifiant.', errSelf: 'Vous ne pouvez pas vous ajouter.',
    errNotFound:     'Utilisateur introuvable.', errAlready: 'Déjà amis.',
    errSent:         'Demande déjà envoyée.',
    toastSent:       'Demande envoyée à @', toastAccepted: ' a accepté votre demande !',
    toastRequest:    " a envoyé une demande d'ami",
    errNoName:       'Entrez votre nom.', errNoUsername: 'Choisissez un identifiant.',
    errUserFormat:   'Identifiant : 2–20 chars, minuscules, chiffres ou _',
    errPassShort:    'Mot de passe : minimum 4 caractères.', errPassMatch: 'Les mots de passe ne correspondent pas.',
    errUserExists:   'Identifiant déjà pris. Connectez-vous ou choisissez un autre.',
    errNoLoginUser:  'Entrez votre identifiant.', errNoLoginPass: 'Entrez votre mot de passe.',
    errUserNotFound: 'Utilisateur introuvable.', errBadPass: 'Mot de passe incorrect.',
    errCorrupt:      'Données corrompues supprimées. Recréez votre compte.',
    toastCreated:    'Compte créé ! Connectez-vous.',
    toastCleared:    'Conversation effacée.',
    online: 'en ligne', offline: 'hors ligne',
    fileTooBig:      ' dépasse 5Mo', fileSent: '📎 fichier',
  },
};

// Country → language code mapping
const COUNTRY_LANG = {
  // Portuguese
  BR:'pt', PT:'pt', AO:'pt', MZ:'pt', CV:'pt', GW:'pt', ST:'pt', TL:'pt', GQ:'pt',
  // English
  US:'en', GB:'en', AU:'en', CA:'en', NZ:'en', IE:'en', ZA:'en', NG:'en', KE:'en',
  IN:'en', PK:'en', PH:'en', SG:'en', MY:'en', GH:'en', UG:'en', TZ:'en', ZW:'en',
  // Spanish
  MX:'es', ES:'es', AR:'es', CO:'es', PE:'es', VE:'es', CL:'es', EC:'es', GT:'es',
  CU:'es', BO:'es', DO:'es', HN:'es', PY:'es', SV:'es', NI:'es', CR:'es', PA:'es',
  UY:'es', GQ:'es',
  // French
  FR:'fr', BE:'fr', CH:'fr', CD:'fr', CI:'fr', CM:'fr', SN:'fr', MG:'fr', NE:'fr',
  ML:'fr', BF:'fr', GN:'fr', BJ:'fr', HT:'fr', TG:'fr', CF:'fr', TD:'fr', GA:'fr',
  CG:'fr', RW:'fr', BI:'fr', DJ:'fr', MR:'fr', LU:'fr', MC:'fr',
};

let T = LANGS.pt; // default language (will be overridden by geolocation)

async function detectLanguage() {
  // 1. Check saved preference — instant, no network
  const saved = localStorage.getItem('md_lang');
  if (saved && LANGS[saved]) {
    T = LANGS[saved];
    applyLang();
    return;
  }

  // 2. Apply browser language immediately so UI is never blank
  const browserLang = (navigator.language || navigator.userLanguage || 'pt').slice(0,2).toLowerCase();
  if (LANGS[browserLang]) T = LANGS[browserLang];
  applyLang(); // apply right away with browser lang

  // 3. Try geo-detection in background (2s timeout — won't block anything)
  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 2000);
    const res  = await fetch('https://ipapi.co/json/', { signal: controller.signal });
    clearTimeout(tid);
    if (res.ok) {
      const data = await res.json();
      const cc   = data.country_code;
      if (cc && COUNTRY_LANG[cc] && LANGS[COUNTRY_LANG[cc]] !== T) {
        T = LANGS[COUNTRY_LANG[cc]];
        applyLang(); // re-apply only if lang changed
      }
    }
  } catch (_) { /* geo failed — browser lang stays, no problem */ }

  localStorage.setItem('md_lang', Object.keys(LANGS).find(k => LANGS[k] === T) || 'pt');
}

function applyLang() {
  // ── Auth left panel ──
  const sub = document.querySelector('.auth-brand-sub');
  if (sub) sub.textContent = T.appSub;

  const feats = document.querySelectorAll('.auth-feat');
  const fKeys = [
    [T.feat1Title, T.feat1Desc],
    [T.feat2Title, T.feat2Desc],
    [T.feat3Title, T.feat3Desc],
    [T.feat4Title, T.feat4Desc],
  ];
  feats.forEach((f, i) => {
    if (!fKeys[i]) return;
    const title = f.querySelector('.feat-title');
    const desc  = f.querySelector('.feat-desc');
    if (title) title.textContent = fKeys[i][0];
    if (desc)  desc.textContent  = fKeys[i][1];
  });

  // ── Auth right welcome ──
  const ey = document.querySelector('.auth-welcome-eyebrow span');
  if (ey) ey.textContent = T.welcomeEyebrow;

  const stats = document.querySelectorAll('.auth-stat-txt');
  const sKeys = [T.statNotes, T.statAccounts, T.statFiles];
  stats.forEach((s, i) => { if (sKeys[i]) s.textContent = sKeys[i]; });

  // ── Auth tabs ──
  const tabLogin = document.getElementById('tab-login');
  const tabReg   = document.getElementById('tab-reg');
  if (tabLogin) tabLogin.textContent = T.tabLogin;
  if (tabReg)   tabReg.textContent   = T.tabReg;

  // ── Login form ──
  setTxt('l-user', null,  T.lblUser,  T.phUser);
  setTxt('l-pass', null,  T.lblPass,  T.phPass);
  // btn-login text updated safely without breaking the element
  const hint = document.querySelector('.a-hint');
  if (hint) hint.textContent = 'Autenticado com segurança via Firebase.';
  // Update switch text without destroying event listeners
  const sw1 = document.querySelector('#form-login .auth-switch');
  if (sw1) {
    const textNode = Array.from(sw1.childNodes).find(n => n.nodeType === 3);
    if (textNode) textNode.textContent = T.switchToReg + ' ';
    const link1 = document.getElementById('goto-reg');
    if (link1) link1.textContent = T.switchToRegLink;
  }

  // ── Register form ──
  setTxt('r-name', null, T.lblName, T.phName);
  setTxt('r-user', null, T.lblUserReg, T.phUserReg);
  setTxt('r-role', null, T.lblRole, T.phRole);
  setTxt('r-pass', null, T.lblPassReg, T.phPassReg);
  setTxt('r-pass2', null, T.lblPass2, T.phPass2);
  // btn-register text updated safely without breaking the element
  const sw2 = document.querySelector('#form-reg .auth-switch');
  if (sw2) {
    const textNode2 = Array.from(sw2.childNodes).find(n => n.nodeType === 3);
    if (textNode2) textNode2.textContent = T.switchToLogin + ' ';
    const link2 = document.getElementById('goto-login');
    if (link2) link2.textContent = T.switchToLoginLink;
  }

  // ── Toolbar ──
  setBtnTxt('btn-new',       T.btnNew);
  setBtnTxt('btn-shuffle',   T.btnShuffle);
  setBtnTxt('btn-clear',     T.btnClear);
  setBtnTxt('btn-wallpaper', T.btnWallpaper);
  setBtnTxt('btn-social',    T.btnFriends);
  setBtnTxt('btn-exit',      T.btnExit);

  // ── Board empty hint ──
  const ei = document.querySelector('.ei-txt');
  if (ei) ei.textContent = T.emptyHint;

  // ── Modal ──
  const mh1 = document.querySelector('.m-h1');
  if (mh1) mh1.textContent = T.modalTitle;
  const msub = document.querySelector('.m-sub');
  if (msub) msub.textContent = T.modalSub;
  const mlbls = document.querySelectorAll('.m-lbl');
  const mKeys = [T.lblTitle, T.lblContent];
  mlbls.forEach((l, i) => { if (mKeys[i]) l.textContent = mKeys[i]; });
  const minps = document.querySelectorAll('.m-inp');
  if (minps[0]) minps[0].placeholder = T.phTitle;
  if (minps[1]) minps[1].placeholder = T.phContent;
  const msecs = document.querySelectorAll('.m-sec');
  const msKeys = [T.secDates, T.secColor];
  msecs.forEach((s, i) => { if (msKeys[i]) s.textContent = msKeys[i]; });
  const mdlbls = document.querySelectorAll('.m-dlbl');
  if (mdlbls[0]) mdlbls[0].textContent = T.lblStart;
  if (mdlbls[1]) mdlbls[1].textContent = T.lblEnd;
  const remLbl = document.querySelector('.m-rem-lbl');
  if (remLbl) remLbl.textContent = T.remLabel;
  const remUnit = document.querySelector('.m-rem-unit');
  if (remUnit) remUnit.textContent = T.remUnit;
  const btnCancel = document.getElementById('m-cancel');
  if (btnCancel) btnCancel.textContent = T.btnCancel;
  const btnCreate = document.getElementById('m-ok');
  if (btnCreate) btnCreate.textContent = T.btnCreate;

  // ── Wallpaper panel ──
  const wpt = document.querySelector('.wp-title');
  if (wpt) wpt.textContent = T.wpTitle;
  const wpsecs = document.querySelectorAll('.wp-section');
  const wpKeys = [T.wpSolids, T.wpGrads, T.wpCustom];
  wpsecs.forEach((s, i) => { if (wpKeys[i]) s.textContent = wpKeys[i]; });
  const wpUpBtn = document.querySelector('.wp-upload-btn span');
  if (wpUpBtn) wpUpBtn.textContent = T.wpUpload;
  const wpReset = document.getElementById('wp-reset');
  if (wpReset) wpReset.textContent = T.wpReset;

  // ── Social panel ──
  const spTitle = document.querySelector('.sp-title');
  if (spTitle) spTitle.textContent = T.socialTitle;
  const spTabs = document.querySelectorAll('.sp-tab');
  if (spTabs[0]) spTabs[0].textContent = T.tabFriends;
  if (spTabs[1]) spTabs[1].textContent = T.tabRequests;

  // ── STATUS_OPTS update ──
  if (typeof STATUS_OPTS !== 'undefined') {
    const statusMap = {todo: T.statusTodo, progress: T.statusProgress, done: T.statusDone, closed: T.statusClosed};
    STATUS_OPTS.forEach(o => { if (statusMap[o.key]) o.label = statusMap[o.key]; });
  }

  // ── TW_PHRASES update ──
  if (typeof TW_PHRASES !== 'undefined' && T.twPhrases) {
    TW_PHRASES.length = 0;
    T.twPhrases.forEach(p => TW_PHRASES.push(p));
  }

  // switch links preserved — no re-wiring needed

  // Re-apply heading after lang switch (before typewriter)
  const heading = document.getElementById('auth-welcome-heading');
  if (heading) {
    heading.innerHTML = T.welcomeHeading + '<br><span class="hl" id="auth-typewriter"></span><span class="auth-cursor" id="auth-cursor"></span>';
  }
  const desc = document.getElementById('auth-welcome-desc');
  if (desc) desc.textContent = T.welcomeDesc;
}

// Helper: update input placeholder and preceding label — never touches button content
function setTxt(id, text, labelText, placeholder) {
  const el = document.getElementById(id);
  if (!el) return;
  // Only set textContent for non-interactive elements (not buttons/inputs)
  if (text !== null && text !== undefined && el.tagName !== 'BUTTON' && el.tagName !== 'INPUT') {
    el.textContent = text;
  }
  if (placeholder && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) {
    el.placeholder = placeholder;
  }
  // find preceding .a-lbl label
  if (labelText) {
    let prev = el.previousElementSibling;
    while (prev) {
      if (prev.classList && prev.classList.contains('a-lbl')) { prev.textContent = labelText; break; }
      prev = prev.previousElementSibling;
    }
    // also check parent's previous sibling (for .a-grp wrappers)
    if (!prev) {
      let parentPrev = el.parentElement && el.parentElement.previousElementSibling;
      if (parentPrev && parentPrev.classList && parentPrev.classList.contains('a-lbl')) {
        parentPrev.textContent = labelText;
      }
    }
  }
}
function setBtnTxt(id, text) {
  const el = document.getElementById(id);
  if (!el || !text) return;
  // preserve child elements (SVG icons, badges), only update text nodes
  Array.from(el.childNodes).forEach(n => {
    if (n.nodeType === 3 && n.textContent.trim()) n.textContent = text + ' ';
  });
  // if no text node found, find the text part after SVG
  const hasTextNode = Array.from(el.childNodes).some(n => n.nodeType === 3 && n.textContent.trim());
  if (!hasTextNode) {
    const svg = el.querySelector('svg');
    if (svg) {
      let after = svg.nextSibling;
      if (after && after.nodeType === 3) after.textContent = text;
      else el.appendChild(document.createTextNode(text));
    }
  }
}

/* ════════════════════════════════════════════════════════════
   SOCIAL SYSTEM — Firebase Realtime Database
   All social data lives in Firebase, accessible across devices.
   Firebase paths:
     /users/{u}/profile        → { name, role }
     /users/{u}/online         → timestamp_ms (set to null on logout)
     /friends/{u}/accepted     → { friendUser: true }
     /friends/{u}/pending_in   → { senderUser: true }
     /friends/{u}/pending_out  → { targetUser: true }
     /chats/{key}/messages     → { msgId: { id,from,text,file,ts } }
     /inbox/{u}/{msgId}        → message object
════════════════════════════════════════════════════════════ */

/* ── Firebase config — replace with your own project values ── */
/* ═══════════════════════════════════════════════════════════════
   FIREBASE REALTIME DATABASE SECURITY RULES
   Copie e cole em: Firebase Console → Realtime Database → Rules

   Estas regras garantem que:
   - Cada usuário só lê/escreve seus próprios dados
   - Workspaces compartilhados só acessíveis pelos participantes
   - Grupos: membros leem, dono escreve configurações
   - Chats: apenas os participantes acessam
   - Acesso público bloqueado por padrão

{
  "rules": {
    // ── Perfis públicos (apenas leitura autenticada) ──
    "users": {
      "$uid": {
        "profile": {
          ".read":  "auth != null",
          ".write": "auth != null && auth.uid === $uid"
        },
        "notes": {
          ".read":  "auth != null && auth.uid === $uid",
          ".write": "auth != null && auth.uid === $uid"
        },
        "online": {
          ".read":  "auth != null",
          ".write": "auth != null && auth.uid === $uid"
        }
      }
    },
    // ── Mapeamento username ↔ uid ──
    "usernames": {
      "$username": {
        ".read":  "auth != null",
        ".write": "auth != null && (!data.exists() || data.val() === auth.uid)"
      }
    },
    "uids": {
      "$uid": {
        ".read":  "auth != null",
        ".write": "auth != null && auth.uid === $uid"
      }
    },
    // ── Sistema de amigos ──
    "friends": {
      "$username": {
        ".read":  "auth != null",
        ".write": "auth != null"
      }
    },
    // ── Inbox (notificações) ──
    "inbox": {
      "$username": {
        ".read":  "auth != null && root.child('uids').child(auth.uid).val() === $username",
        ".write": "auth != null"
      }
    },
    "groupInbox": {
      "$username": {
        ".read":  "auth != null && root.child('uids').child(auth.uid).val() === $username",
        ".write": "auth != null"
      }
    },
    // ── Chats 1:1 ──
    "chats": {
      "$chatKey": {
        ".read":  "auth != null && ($chatKey.contains(root.child('uids').child(auth.uid).val()))",
        ".write": "auth != null && ($chatKey.contains(root.child('uids').child(auth.uid).val()))"
      }
    },
    // ── Grupos ──
    "groups": {
      "$groupId": {
        ".read":  "auth != null",
        ".write": "auth != null && (!data.exists() || data.child('owner').val() === root.child('uids').child(auth.uid).val() || data.child('members').child(root.child('uids').child(auth.uid).val()).exists())"
      }
    },
    // ── Chat de grupo ──
    "groupChats": {
      "$groupId": {
        ".read":  "auth != null && root.child('groups').child($groupId).child('members').child(root.child('uids').child(auth.uid).val()).exists()",
        ".write": "auth != null && root.child('groups').child($groupId).child('members').child(root.child('uids').child(auth.uid).val()).exists()"
      }
    },
    // ── Workspace compartilhado ──
    "shared_boards": {
      "$boardKey": {
        ".read":  "auth != null && $boardKey.contains(root.child('uids').child(auth.uid).val())",
        ".write": "auth != null && $boardKey.contains(root.child('uids').child(auth.uid).val())"
      }
    },
    // ── Workspace de grupo ──
    "group_boards": {
      "$groupId": {
        ".read":  "auth != null && root.child('groups').child($groupId).child('members').child(root.child('uids').child(auth.uid).val()).exists()",
        ".write": "auth != null && root.child('groups').child($groupId).child('members').child(root.child('uids').child(auth.uid).val()).exists()"
      }
    },
    // ── Bloquear todo o resto ──
    "$other": {
      ".read":  false,
      ".write": false
    }
  }
}
═══════════════════════════════════════════════════════════════ */

const FB_CONFIG = {
  apiKey:            "AIzaSyC0nlYRrsbHtXoGX69iG0h0_Y2jHqXhdfM",
  authDomain:        "mydesk-ad0da.firebaseapp.com",
  databaseURL:       "https://mydesk-ad0da-default-rtdb.firebaseio.com",
  projectId:         "mydesk-ad0da",
  storageBucket:     "mydesk-ad0da.firebasestorage.app",
  messagingSenderId: "1097411875265",
  appId:             "1:1097411875265:web:d371d0671f568aaea4df40",
  measurementId:     "G-HHEJTD16LP"
};

let _fb        = null;   // Firebase app
let _db        = null;   // Realtime Database reference
let _fbReady   = false;
let _fbListeners = [];   // { ref, type, fn } — for cleanup on logout

let socialOpen  = false;
let socialTab   = 'friends';
let openChats   = new Map();
let _onlineTimer = null;

/* ── Load Firebase SDK dynamically ── */
function loadFirebase() {
  return new Promise((ok) => {
    if (_fbReady) { ok(); return; }
    if (window._fbInitDone) {
      _fb = firebase; _db = window._fbDB; _auth = window._fbAuth; _fbReady = true;
      ok(); return;
    }
    function tryInit() {
      if (window._fbInitDone) {
        _fb = firebase; _db = window._fbDB; _auth = window._fbAuth; _fbReady = true;
        ok();
      } else { setTimeout(tryInit, 50); }
    }
    tryInit();
  });
}

function getAuth() {
  return _auth || window._fbAuth || null;
}

/* ── DB helpers ── */
function ref(path)          { return _db.ref(path); }
function fbSet(path, val)   { return ref(path).set(val); }
function fbGet(path) {
  // Force fresh read — bypass Firebase cache
  return _db.ref(path).once('value').then(s => s.val());
}
function fbUpdate(path, val){ return ref(path).update(val); }
function fbRemove(path)     { return ref(path).remove(); }
function fbPush(path, val)  { return ref(path).push(val); }

function onFb(path, event, fn) {
  const r = ref(path);
  r.on(event, fn);
  _fbListeners.push({ r, event, fn });
  return r;
}
function offAllListeners() {
  _fbListeners.forEach(({ r, event, fn }) => r.off(event, fn));
  _fbListeners = [];
}

function chatKey(a, b) { return [a,b].sort().join('__'); }

/* ── Online presence ── */
// My current presence status
let _myStatus = 'online'; // 'online' | 'working' | 'busy'

const STATUS_PRESENCE = {
  online:  { label:'Disponível',   color:'#10b981', shadow:'rgba(16,185,129,.6)'  },
  working: { label:'Trabalhando',  color:'#f59e0b', shadow:'rgba(245,158,11,.5)'  },
  busy:    { label:'Ocupado',      color:'#ef4444', shadow:'rgba(239,68,68,.5)'    },
};

async function setOnlineFb() {
  if (!CU || !_fbReady) return;
  // Ensure auth token is ready before writing
  const authUser = _auth ? _auth.currentUser : null;
  if (!authUser) return;
  const data = { ts: firebase.database.ServerValue.TIMESTAMP, status: _myStatus, username: CU.username };
  // Write to /presence/{uid} — uid must match Firebase Auth uid exactly
  if (CU.uid && CU.uid === authUser.uid) {
    try {
      const uidRef = ref('presence/' + CU.uid);
      await uidRef.set(data);
      uidRef.onDisconnect().remove();
    } catch(e) { console.warn('presence write failed:', e.message); }
  }
  // Also write to username-based path for friend online dots
  try {
    const onlineRef = ref('users/' + CU.username + '/online');
    onlineRef.set(data);
    onlineRef.onDisconnect().remove();
  } catch(e) {}
}

async function getPresence(u) {
  if (!_fbReady) return null;
  // u is a username — look up their uid first, then read /presence/{uid}
  try {
    const uid = await fbGet('usernames/' + u);
    if (uid) {
      const val = await fbGet('presence/' + uid);
      if (val) {
        if (typeof val === 'number') return { online: (Date.now() - val) < 60000, status: 'online' };
        return { online: (Date.now() - val.ts) < 60000, status: val.status || 'online' };
      }
    }
  } catch {}
  // Fallback: username-based path
  const val = await fbGet('users/' + u + '/online');
  if (!val) return null;
  if (typeof val === 'number') return { online: (Date.now() - val) < 60000, status: 'online' };
  return { online: (Date.now() - val.ts) < 60000, status: val.status || 'online' };
}

// Secure uid-based presence read — for group members
async function getPresenceByUid(uid) {
  if (!_fbReady || !uid) return null;
  const val = await fbGet('presence/' + uid);
  if (!val) return null;
  if (typeof val === 'number') return { online: (Date.now() - val) < 60000, status: 'online' };
  return { online: (Date.now() - val.ts) < 60000, status: val.status || 'online' };
}

async function isOnline(u) {
  const p = await getPresence(u);
  return p ? p.online : false;
}

async function setOfflineFb() {
  if (!_fbReady) return;
  // CU may be null by logout time — use saved values
  const username = CU?.username;
  const uid      = CU?.uid;
  if (username) await fbRemove('users/' + username + '/online').catch(() => {});
  if (uid)      await fbRemove('presence/' + uid).catch(() => {});
}

function setMyStatus(status) {
  _myStatus = status;
  const sp = STATUS_PRESENCE[status];
  // Toolbar dot
  const dot = document.getElementById('my-status-dot');
  const lbl = document.getElementById('my-status-lbl');
  if (dot) { dot.style.background = sp.color; dot.style.boxShadow = '0 0 5px ' + sp.shadow; }
  if (lbl) lbl.textContent = sp.label;
  // Social panel inline dot
  const dot2 = document.getElementById('sp-status-dot');
  const lbl2 = document.getElementById('sp-status-lbl2');
  if (dot2) { dot2.style.background = sp.color; }
  if (lbl2) lbl2.textContent = sp.label;
  setOnlineFb();
}

let _statusMenuOpen = false;
function toggleStatusMenu() {
  if (_statusMenuOpen) { document.querySelector('.status-menu-pop')?.remove(); _statusMenuOpen = false; return; }
  const btn = document.getElementById('my-status-btn');
  if (!btn) return;
  const pop = document.createElement('div');
  pop.className = 'status-menu-pop';
  Object.entries(STATUS_PRESENCE).forEach(([key, sp]) => {
    const opt = document.createElement('div');
    opt.className = 'status-menu-opt' + (key === _myStatus ? ' active' : '');
    opt.innerHTML = `<div class="status-menu-dot" style="background:${sp.color};box-shadow:0 0 5px ${sp.shadow}"></div>${sp.label}`;
    opt.addEventListener('click', () => {
      setMyStatus(key);
      pop.remove(); _statusMenuOpen = false;
    });
    pop.appendChild(opt);
  });
  const r = btn.getBoundingClientRect();
  pop.style.cssText = `top:${r.bottom + 6}px;left:${r.left}px;`;
  document.body.appendChild(pop);
  _statusMenuOpen = true;
  setTimeout(() => document.addEventListener('click', function close(e) {
    if (!pop.contains(e.target) && e.target !== btn) { pop.remove(); _statusMenuOpen = false; document.removeEventListener('click', close); }
  }), 0);
}

/* ── Heartbeat ── */
function startOnlineHeartbeat() {
  if (!CU) return;
  setOnlineFb();
  _onlineTimer = setInterval(() => {
    setOnlineFb();
    // Inbox is handled by real-time Firebase listener, no polling needed
  }, 10000);
}

function stopOnlineHeartbeat() {
  clearInterval(_onlineTimer);
  setOfflineFb();
}

/* ── Friends ── */
async function getFriendsFb(u) {
  const snap = await fbGet('friends/' + u);
  return {
    accepted:    Object.keys(snap?.accepted    || {}),
    pending_in:  Object.keys(snap?.pending_in  || {}),
    pending_out: Object.keys(snap?.pending_out || {}),
  };
}

async function sendFriendRequest(targetUser) {
  if (!CU || !_fbReady) return;
  targetUser = targetUser.trim().toLowerCase();
  if (!targetUser)                return toast('⚠', T.errNoUser);
  if (targetUser === CU.username) return toast('⚠', T.errSelf);

  const profile = await fbGet('users/' + targetUser + '/profile');
  if (!profile) return toast('⚠', T.errNotFound);

  const myData = await getFriendsFb(CU.username);
  if (myData.accepted.includes(targetUser))    return toast('ℹ', T.errAlready);
  if (myData.pending_out.includes(targetUser)) return toast('ℹ', T.errSent);
  if (myData.pending_in.includes(targetUser))  { acceptFriend(targetUser); return; }

  await fbUpdate('friends/' + CU.username + '/pending_out', { [targetUser]: true });
  await fbUpdate('friends/' + targetUser  + '/pending_in',  { [CU.username]: true });

  // notify target via inbox event
  await fbPush('inbox/' + targetUser, { type: 'friend_request', from: CU.username, ts: Date.now() });

  toast('✓', T.toastSent + targetUser + '!');
  renderSocialPanel();
}

async function acceptFriend(fromUser) {
  await fbUpdate('friends/' + CU.username, {
    ['accepted/' + fromUser]:       true,
    ['pending_in/' + fromUser]:     null,
  });
  await fbUpdate('friends/' + fromUser, {
    ['accepted/' + CU.username]:    true,
    ['pending_out/' + CU.username]: null,
  });
  await fbPush('inbox/' + fromUser, { type: 'friend_accepted', from: CU.username, ts: Date.now() });
  renderSocialPanel(); updateSocialBadge();
}

async function rejectFriend(fromUser) {
  await fbRemove('friends/' + CU.username + '/pending_in/'  + fromUser);
  await fbRemove('friends/' + fromUser    + '/pending_out/' + CU.username);
  renderSocialPanel(); updateSocialBadge();
}

async function removeFriend(friendUser) {
  await fbRemove('friends/' + CU.username + '/accepted/' + friendUser);
  await fbRemove('friends/' + friendUser  + '/accepted/' + CU.username);
  closeChatWin(friendUser);
  renderSocialPanel();
}

/* ── Badge ── */
async function updateSocialBadge() {
  if (!CU || !_fbReady) return;
  const snap = await fbGet('friends/' + CU.username + '/pending_in');
  const count = snap ? Object.keys(snap).length : 0;
  const badge = document.getElementById('social-badge');
  if (!badge) return;
  badge.textContent = count > 9 ? '9+' : count;
  badge.classList.toggle('show', count > 0);
}

/* ── Panel render ── */
function toggleSocialPanel() {
  socialOpen = !socialOpen;
  const panel = document.getElementById('social-panel');
  panel.classList.toggle('open', socialOpen);
  if (!socialOpen) { _renderingSocial = false; return; }
  renderSocialPanel(); updateSocialBadge();
}

function setSocialTab(tab) {
  socialTab = tab;
  _renderingSocial = false; // allow re-render on tab switch
  document.querySelectorAll('.sp-tab').forEach(t => t.classList.toggle('active', t.dataset.stab === tab));
  renderSocialPanel();
}

let _renderingSocial = false;
async function renderSocialPanel() {
  if (!CU || !socialOpen || !_fbReady) return;
  if (_renderingSocial) return;
  _renderingSocial = true;
  const body = document.getElementById('sp-body');
  if (!body) { _renderingSocial = false; return; }

  try {
    body.innerHTML = '';

  // Fetch friends data upfront — needed by both 'friends' and 'requests' tabs
  let data = { accepted: [], pending_in: [], pending_out: [] };
  try { data = await getFriendsFb(CU.username); } catch(_) {}

  if (socialTab === 'friends') {
    // ── Render profile header INSTANTLY with current CU data ──
    const sp = STATUS_PRESENCE[_myStatus] || STATUS_PRESENCE.online;
    const profileWrap = document.createElement('div');
    profileWrap.className = 'profile-photo-wrap';
    profileWrap.innerHTML = `
      <div class="profile-avatar-big my-avatar-display" id="sp-av-wrap">
        <div style="width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#4f46e5);display:flex;align-items:center;justify-content:center;font-size:1.2rem;font-weight:700;color:#fff;flex-shrink:0;">${(CU.name||'?')[0].toUpperCase()}</div>
        <div class="avatar-edit-overlay">📷</div>
        <input type="file" accept="image/*" id="sp-photo-input">
      </div>
      <div class="profile-info-wrap">
        <div style="display:flex;align-items:center;gap:6px;">
          <div class="profile-name-label" id="sp-name-display" style="cursor:pointer;border-bottom:1px dashed rgba(255,255,255,.15);padding-bottom:1px;" title="Clique para editar nome">${xe(CU.name)}</div>
          <span style="font-size:.6rem;color:rgba(240,240,240,.2);">✎</span>
        </div>
        <div id="sp-name-edit" style="display:none;margin-top:2px;">
          <input id="sp-name-inp" value="${xe(CU.name)}" style="background:rgba(255,255,255,.06);border:1px solid rgba(99,102,241,.4);border-radius:7px;padding:4px 8px;font-family:'Inter',sans-serif;font-size:.82rem;color:#f0f0f0;outline:none;width:100%;box-sizing:border-box;">
        </div>
        <div class="profile-role-label">@${xe(CU.username)}${CU.role ? ' · ' + xe(CU.role) : ''}</div>
        <div class="profile-status-wrap">
          <button id="sp-status-btn" style="display:inline-flex;align-items:center;gap:5px;background:none;border:1px solid rgba(255,255,255,.08);border-radius:20px;padding:3px 9px 3px 6px;font-family:Inter,sans-serif;font-size:.68rem;font-weight:500;color:rgba(240,240,240,.55);cursor:pointer;transition:all .15s;">
            <span id="sp-status-dot" style="width:7px;height:7px;border-radius:50%;background:${sp.color};flex-shrink:0;"></span>
            <span id="sp-status-lbl2">${sp.label}</span>
          </button>
        </div>
      </div>`;

    // Name edit
    const nameDisplay = profileWrap.querySelector('#sp-name-display');
    const nameEdit    = profileWrap.querySelector('#sp-name-edit');
    const nameInp     = profileWrap.querySelector('#sp-name-inp');
    const saveName = async () => {
      const newName = nameInp.value.trim();
      if (!newName || newName === CU.name) {
        nameDisplay.textContent = CU.name;
        nameEdit.style.display = 'none'; nameDisplay.style.display = '';
        return;
      }
      // Update UI immediately
      CU.name = newName;
      nameDisplay.textContent = newName;
      nameEdit.style.display = 'none'; nameDisplay.style.display = '';
      const lbl = document.getElementById('t-user-label');
      if (lbl) lbl.textContent = CU.role ? newName + ' · ' + CU.role : newName;

      if (_fbReady && CU.uid) {
        try {
          // Fetch current profile first to preserve ALL fields (photo, etc)
          const current = await fbGet('users/' + CU.uid + '/profile').catch(() => null)
                       || await fbGet('users/' + CU.username + '/profile').catch(() => null)
                       || {};
          const p = { ...current, name: newName, role: CU.role||'', email: CU.email||'', uid: CU.uid, username: CU.username };
          // Write to BOTH paths — uid = source of truth, username = for friends/chat
          await fbSet('users/' + CU.uid + '/profile', p);
          await fbSet('users/' + CU.username + '/profile', p);
          toast('✓', 'Nome atualizado!');
        } catch(e) {
          console.error('[saveName] failed:', e.message);
          toast('⚠', 'Erro ao salvar nome. Verifique sua conexão.');
        }
      } else {
        toast('✓', 'Nome atualizado!');
      }
    };
    nameDisplay.addEventListener('click', () => { nameInp.value=CU.name; nameDisplay.style.display='none'; nameEdit.style.display='block'; nameInp.focus(); nameInp.select(); });
    nameInp.addEventListener('blur', saveName);
    nameInp.addEventListener('keydown', e => { if(e.key==='Enter'){e.preventDefault();saveName();} if(e.key==='Escape'){nameEdit.style.display='none';nameDisplay.style.display='';} });
    profileWrap.querySelector('#sp-photo-input').addEventListener('change', function() { if(this.files[0]) uploadProfilePhoto(this.files[0]); this.value=''; });
    profileWrap.querySelector('#sp-status-btn').addEventListener('click', e => { e.stopPropagation(); toggleStatusMenu(); });
    body.appendChild(profileWrap);

    // Load avatar async
    (async () => {
      let p = await fbGet('users/'+CU.username+'/profile').catch(()=>null);
      if (!p?.name) p = await fbGet('users/'+CU.uid+'/profile').catch(()=>null);
      if (!p) return;
      const wrap = document.getElementById('sp-av-wrap'); if (!wrap) return;
      const first = wrap.firstElementChild; if (!first) return;
      const tmp = document.createElement('div'); tmp.innerHTML = avatarHTML(p, CU.username, 48);
      if (tmp.firstChild) {
        first.replaceWith(tmp.firstChild);
        // Click own avatar to enlarge
        if (p.photo) {
          const avImg = wrap.querySelector('img');
          if (avImg) {
            avImg.style.cursor = 'zoom-in';
            avImg.title = 'Ver foto';
            avImg.addEventListener('click', e => {
              e.stopPropagation();
              const lb = document.getElementById('chat-lightbox');
              const lbImg = document.getElementById('chat-lb-img');
              if (lb && lbImg) { lbImg.src = safePhotoUrlRaw(p.photo); lb.classList.add('open'); }
            });
          }
        }
      }
    })();

    // ── Add row INSTANTLY ──
    const addRow = document.createElement('div');
    addRow.className = 'sp-add-row';
    addRow.style.flexDirection = 'column';
    addRow.style.gap = '6px';
    addRow.innerHTML = `
      <div style="display:flex;gap:6px;">
        <input class="sp-add-inp" id="sp-add-inp" placeholder="buscar usuário..." autocomplete="off">
        <button class="sp-add-btn" id="sp-search-btn">🔍</button>
      </div>
      <div id="sp-search-result" style="display:none;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:10px 12px;display:flex;align-items:center;gap:10px;"></div>`;

    const searchResult = addRow.querySelector('#sp-search-result');

    const doSearch = async () => {
      const val = addRow.querySelector('#sp-add-inp').value.trim().toLowerCase();
      if (!val) { searchResult.style.display = 'none'; return; }
      searchResult.style.display = 'flex';
      searchResult.innerHTML = '<span style="font-size:.72rem;color:rgba(240,240,240,.3);">Buscando…</span>';
      if (val === CU.username) {
        searchResult.innerHTML = '<span style="font-size:.72rem;color:rgba(240,240,240,.4);">Este é você 😄</span>';
        return;
      }
      try {
        const profile = await fbGet('users/' + val + '/profile').catch(() => null)
                     || await fbGet('usernames/' + val).then(uid => uid ? fbGet('users/' + uid + '/profile') : null).catch(() => null);
        if (!profile) {
          searchResult.innerHTML = '<span style="font-size:.72rem;color:rgba(240,240,240,.35);">Usuário não encontrado.</span>';
          return;
        }
        const photoUrl = safePhotoUrl(profile.photo);
        const photo = photoUrl ? `<img src="${photoUrl}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;flex-shrink:0;">` : `<div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#6366f1,#4f46e5);display:flex;align-items:center;justify-content:center;font-size:.85rem;font-weight:700;color:#fff;flex-shrink:0;">${(profile.name||val)[0].toUpperCase()}</div>`;
        searchResult.innerHTML = '';
        searchResult.innerHTML = photo + `<div style="flex:1"><div style="font-size:.82rem;font-weight:600;color:#f0f0f0;">${xe(profile.name||val)}</div><div style="font-size:.68rem;color:rgba(240,240,240,.4);">@${xe(val)}</div></div>`;
        const addBtn = document.createElement('button');
        addBtn.style.cssText = 'background:rgba(99,102,241,.2);border:1px solid rgba(99,102,241,.35);border-radius:8px;padding:5px 12px;color:#a5b4fc;font-size:.72rem;font-weight:600;cursor:pointer;white-space:nowrap;';
        addBtn.textContent = '+ Adicionar';
        addBtn.addEventListener('click', async () => {
          addBtn.disabled = true; addBtn.textContent = 'Enviando…';
          await sendFriendRequest(val);
          addRow.querySelector('#sp-add-inp').value = '';
          searchResult.style.display = 'none';
        });
        searchResult.appendChild(addBtn);
      } catch(e) {
        searchResult.innerHTML = '<span style="font-size:.72rem;color:rgba(240,240,240,.35);">Erro na busca.</span>';
      }
    };

    addRow.querySelector('#sp-search-btn').addEventListener('click', doSearch);
    addRow.querySelector('#sp-add-inp').addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });
    // Hide result when input cleared
    addRow.querySelector('#sp-add-inp').addEventListener('input', e => { if (!e.target.value) searchResult.style.display = 'none'; });
    body.appendChild(addRow);

    if (data.accepted.length === 0) {
      const em = document.createElement('div'); em.className='sp-empty'; em.textContent='Nenhum amigo ainda.';
      body.appendChild(em);
    } else {
      const lbl = document.createElement('div'); lbl.className='sp-section-lbl'; lbl.textContent='Amigos';
      body.appendChild(lbl);
      // Render skeleton rows immediately, then hydrate each async
      data.accepted.forEach(friend => {
        const row = document.createElement('div'); row.className='sp-row';
        row.innerHTML = `
          <div class="sp-avatar" style="background:rgba(99,102,241,.15);border-radius:50%;width:34px;height:34px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:.85rem;font-weight:700;color:rgba(165,180,252,.4);">${friend[0].toUpperCase()}</div>
          <div class="sp-info">
            <div class="sp-name" style="opacity:.4">@${xe(friend)}</div>
            <div class="sp-meta" id="spm-${friend}" style="opacity:.3">…</div>
          </div>
          <div class="sp-actions" id="spa-${friend}" style="opacity:0"></div>`;
        body.appendChild(row);
        // Hydrate async — try username path, fallback to uid path
        const loadProfile = fbGet('usernames/' + friend)
          .then(uid => uid
            ? fbGet('users/' + uid + '/profile').then(p => p || {}).catch(() => ({}))
            : fbGet('users/' + friend + '/profile').then(r => r || {}).catch(() => ({}))
          ).catch(() => fbGet('users/' + friend + '/profile').then(r => r || {}).catch(() => ({})));

        Promise.all([
          loadProfile,
          getPresence(friend).catch(() => null)
        ]).then(([profile, presence]) => {
          if (!document.body.contains(row)) return;
          const online  = presence?.online||false;
          const pStatus = online?(presence?.status||'online'):'offline';
          const colors  = {online:'#10b981',working:'#f59e0b',busy:'#ef4444',offline:'#374151'};
          const labels  = {online:'disponível',working:'trabalhando',busy:'ocupado',offline:'offline'};
          // Avatar
          const avEl = row.querySelector('.sp-avatar');
          if (avEl) {
            const t = document.createElement('div');
            t.innerHTML = avatarHTML(profile, friend, 34) + `<div class="sp-online-dot ${pStatus}" data-user="${xe(friend)}" style="background:${colors[pStatus]}"></div>`;
            const newAv = t.firstChild || t;
            // Click to zoom avatar if user has a photo
            if (profile.photo) {
              newAv.style.cursor = 'zoom-in';
              newAv.title = 'Ver foto';
              newAv.addEventListener('click', e => {
                e.stopPropagation();
                const lb = document.getElementById('chat-lightbox');
                const img = document.getElementById('chat-lb-img');
                if (lb && img) { img.src = safePhotoUrlRaw(profile.photo); lb.classList.add('open'); }
              });
            }
            avEl.replaceWith(newAv);
          }
          // Name
          const nm = row.querySelector('.sp-name'); if(nm){nm.textContent=profile.name||friend;nm.style.opacity='';}
          // Meta
          const mt = document.getElementById('spm-'+friend);
          if(mt){mt.innerHTML=`@${xe(friend)} · <span style="color:${colors[pStatus]}">${labels[pStatus]}</span>`;mt.style.opacity='';}
          // Actions
          const ac = document.getElementById('spa-'+friend);
          if(ac){
            ac.style.opacity='';
            ac.innerHTML=`<button class="sp-btn chat" title="Chat">💬</button><button class="sp-btn ws" title="Workspace 1:1">🗂</button><button class="sp-btn invite" title="Convidar para grupo">👥</button><button class="sp-btn remove" title="Remover amigo">✕</button>`;
            ac.querySelector('.sp-btn.chat').addEventListener('click', ()=>{openChatWin(friend);toggleSocialPanel();});
            ac.querySelector('.sp-btn.ws').addEventListener('click', ()=>{openSharedWorkspace(friend);toggleSocialPanel();});
            ac.querySelector('.sp-btn.invite').addEventListener('click', e=>{openGroupInviteMenu(friend,e.currentTarget);});
            ac.querySelector('.sp-btn.remove').addEventListener('click', ()=>removeFriend(friend));
          }
          row.addEventListener('click', e=>{if(e.target.closest('.sp-btn'))return;openChatWin(friend);});
        });
      });
    }

    // pending_out - async
    if (data.pending_out.length > 0) {
      const outProfiles = await Promise.all(data.pending_out.map(f => fbGet('users/'+f+'/profile').then(r=>r||{}).catch(()=>({}))));
      const lbl2 = document.createElement('div'); lbl2.className='sp-section-lbl'; lbl2.textContent='Enviados';
      body.appendChild(lbl2);
      data.pending_out.forEach((friend, i) => {
        const profile = outProfiles[i];
        const row = document.createElement('div'); row.className='sp-row';
        row.innerHTML = `<div class="sp-avatar">${avatarHTML(profile,friend,34)}</div><div class="sp-info"><div class="sp-name">${xe(profile.name||friend)}</div><div class="sp-meta">@${xe(friend)} · aguardando</div></div>`;
        body.appendChild(row);
      });
    }

  } else if (socialTab === 'groups') {
    await renderGroupsTab(body);
  } else {
    if (data.pending_in.length === 0) {
      const em = document.createElement('div'); em.className = 'sp-empty'; em.textContent = 'Nenhuma solicitação.';
      body.appendChild(em);
    } else {
      const inProfiles = await Promise.all(data.pending_in.map(f => fbGet('users/' + f + '/profile').then(r => r || {})));
      const lbl = document.createElement('div'); lbl.className = 'sp-section-lbl'; lbl.textContent = 'Pedidos recebidos';
      body.appendChild(lbl);
      data.pending_in.forEach((fromUser, i) => {
        const profile = inProfiles[i];
        const row = document.createElement('div'); row.className = 'sp-row pending-in';
        row.innerHTML = `
          <div class="sp-avatar" style="background:linear-gradient(135deg,#92400e,#78350f)">${avatarHTML(profile, fromUser, 34)}</div>
          <div class="sp-info">
            <div class="sp-name">${xe(profile.name||fromUser)}</div>
            <div class="sp-meta">@${xe(fromUser)} quer ser seu amigo</div>
          </div>
          <div class="sp-actions">
            <button class="sp-btn accept">✓</button>
            <button class="sp-btn reject">✕</button>
          </div>`;
        row.querySelector('.sp-btn.accept').addEventListener('click', () => acceptFriend(fromUser));
        row.querySelector('.sp-btn.reject').addEventListener('click', () => rejectFriend(fromUser));
        body.appendChild(row);
      });
    }
  }
  } catch(e) {
    console.warn('renderSocialPanel error:', e.message);
  } finally {
    _renderingSocial = false;
  }
}

/* ── Firebase real-time listeners ── */
// Timestamp of when user logged in — used to ignore old messages on child_added
let _loginTs = Date.now();
const _deliveredMsgIds = new Set(); // dedup between inbox and real-time listeners

function resetSocialState() {
  _loginTs = Date.now();
  _deliveredMsgIds.clear();
  _chatListeners.clear();
  _groupListeners.clear();
  _myGroups = [];
  Object.keys(_friendOnlineState).forEach(k => delete _friendOnlineState[k]);
  _myStatus = 'online';
  if (_activeGroupWs?.listener) _activeGroupWs.listener.off();
  _activeGroupWs = null;
  offAllListeners();
  openGroupChats.forEach(gc => gc.el.remove());
  openGroupChats.clear();
}

function initSocialListeners() {
  if (!CU || !_fbReady) return;
  resetSocialState();

  // ── Inbox listener: friend requests, accepted, AND offline chat messages ──
  onFb('inbox/' + CU.username, 'child_added', async (snap) => {
    const item = snap.val();
    if (!item) return;
    // Always remove from inbox immediately to prevent re-processing
    await fbRemove('inbox/' + CU.username + '/' + snap.key);

    // SAFETY: never process items sent by ourselves
    if (item.from === CU.username) return;

    if (item.type === 'friend_request') {
      renderSocialPanel(); updateSocialBadge();
      toast('👋', '@' + item.from + (T.toastRequest || ' enviou pedido de amizade'));
    } else if (item.type === 'friend_accepted') {
      renderSocialPanel();
      toast('✓', '@' + item.from + (T.toastAccepted || ' aceitou sua solicitação!'));
    } else if (item.type === 'ws_invite') {
      showWsInviteModal(item.from, item.key);
    } else if (item.type === 'ws_accepted') {
      toast('🗂️', '@' + item.from + ' aceitou o workspace!');
      switchToWorkspace(item.key, item.from);
    } else if (item.type === 'ws_rejected') {
      toast('✕', '@' + item.from + ' recusou o convite de workspace.');
    } else if (item.type === 'ws_terminated') {
      if (_activeWs && _activeWs.key === item.key) {
        toast('⚠', '@' + item.from + ' encerrou o workspace.');
        switchToPersonal();
      }
    } else if (item.type === 'group_ws_invite') {
      showGroupWsInviteNotif(item);
    } else if (item.type === 'group_ws_ended') {
      if (_activeGroupWs?.groupId === item.groupId) {
        leaveGroupWorkspace(false);
        toast('⚠', 'O workspace do grupo "' + (item.groupName||'') + '" foi encerrado.');
      }
    } else if (item.type === 'chat_message') {
      // Message arrived while offline — deliver now
      // Extra dedup: ignore if the chat listener already delivered it live
      receiveMessage(item.from, item.payload, true);
    }
  });

  // ── Group inbox listener — no timestamp filter (offline invites must arrive) ──
  onFb('groupInbox/' + CU.username, 'child_added', async (snap) => {
    const item = snap.val();
    if (!item) return;
    await fbRemove('groupInbox/' + CU.username + '/' + snap.key);
    if (item.type === 'group_invite') {
      showGroupInviteNotif(item);
    } else if (item.type === 'group_ws_invite') {
      showGroupWsInviteNotif(item);
    } else if (item.type === 'group_kick') {
      // Kicked from group — leave workspace if active, refresh panel
      if (_activeGroupWs?.groupId === item.groupId) {
        leaveGroupWorkspace(false);
        toast('⚡', 'Você foi removido do grupo "' + (item.groupName||'') + '" por @' + item.from + '.');
      } else {
        toast('⚡', 'Você foi removido do grupo "' + (item.groupName||'') + '".');
      }
      _renderingSocial = false;
      renderSocialPanel();
    }
  });

  // ── Real-time pending_in listener — instant friend request notification ──
  onFb('friends/' + CU.username + '/pending_in', 'child_added', async (snap) => {
    if (!snap.key) return;
    const fromUser = snap.key;
    if (fromUser === CU.username) return;
    // Re-render panel to show new request
    _renderingSocial = false;
    renderSocialPanel();
    updateSocialBadge();
    toast('👋', '@' + fromUser + (T.toastRequest || ' enviou pedido de amizade'));
  });

  // ── Real-time chat listener per friend ──
  watchFriendChats();
}

async function watchFriendChats() {
  const data = await getFriendsFb(CU.username);
  data.accepted.forEach(friend => {
    listenChat(friend);
    watchFriendOnline(friend);
  });

  onFb('friends/' + CU.username + '/accepted', 'child_added', (snap) => {
    listenChat(snap.key);
    watchFriendOnline(snap.key);
    renderSocialPanel();
  });
}

// Track last known online state per friend to avoid duplicate notifications
const _friendOnlineState = {};

function watchFriendOnline(friend) {
  onFb('users/' + friend + '/online', 'value', async (snap) => {
    const val = snap.val();
    const isNowOnline = !!val;
    const pStatus = isNowOnline ? (typeof val === 'object' ? val.status || 'online' : 'online') : 'offline';
    const prev = _friendOnlineState[friend]; // { online, status } | undefined
    const wasOnline  = prev ? prev.online : undefined;
    const prevStatus = prev ? prev.status : null;

    // Notify on offline→online transition
    if (isNowOnline && !wasOnline && wasOnline !== undefined) {
      const profile = await fbGet('users/' + friend + '/profile') || {};
      showOnlineNotif(friend, profile.name || friend, profile, pStatus);
    }

    // Save full state
    _friendOnlineState[friend] = { online: isNowOnline, status: pStatus };

    // Live-update dot + label — also fires on status change (working/busy/online)
    if (socialOpen) {
      const colors = { online:'#10b981', working:'#f59e0b', busy:'#ef4444', offline:'#374151' };
      const labels = { online:'disponível', working:'trabalhando', busy:'ocupado', offline:'offline' };
      const dot = document.querySelector('.sp-online-dot[data-user="' + friend + '"]');
      if (dot) {
        dot.className = 'sp-online-dot ' + pStatus;
        dot.style.background = colors[pStatus];
        const row = dot.closest('.sp-row');
        if (row) {
          const meta = row.querySelector('.sp-meta');
          if (meta) meta.innerHTML = '@' + xe(friend) + ' · <span style="color:' + colors[pStatus] + '">' + labels[pStatus] + '</span>';
        }
      }
    }
  });
}

function showOnlineNotif(friend, name, profile, pStatus = 'online') {
  const stack = document.getElementById('chat-notif-stack');
  if (!stack) return;
  const el = document.createElement('div');
  el.className = 'chat-notif';
  el.style.borderLeftColor = '#10b981';
  el.innerHTML = `
    <div class="chat-notif-avatar" style="overflow:hidden;position:relative;">
      ${safePhotoUrl(profile?.photo) ? `<img src="${safePhotoUrl(profile.photo)}" style="width:100%;height:100%;object-fit:cover;position:absolute;inset:0;border-radius:50%;">` : name[0].toUpperCase()}
      <div class="chat-notif-online"></div>
    </div>
    <div class="chat-notif-body">
      <div class="chat-notif-name">${xe(name)}</div>
      <div class="chat-notif-text" style="color:${({online:'rgba(16,185,129,.8)',working:'rgba(245,158,11,.8)',busy:'rgba(239,68,68,.8)'})[pStatus]||'rgba(16,185,129,.8)'}">
        ${({online:'🟢 entrou online',working:'🟡 está trabalhando',busy:'🔴 está ocupado'})[pStatus]||'🟢 entrou online'}</div>
    </div>
    <button class="chat-notif-close" title="Fechar">✕</button>`;
  el.addEventListener('click', e => {
    if (e.target.closest('.chat-notif-close')) return;
    dismissNotif(el);
  });
  el.querySelector('.chat-notif-close').addEventListener('click', e => { e.stopPropagation(); dismissNotif(el); });
  stack.appendChild(el);
  el._dismissTimer = setTimeout(() => dismissNotif(el), 4000);
  playOnlineSound();
}

const _chatListeners = new Set();
function listenChat(friend) {
  // Never listen to a chat with yourself
  if (!friend || friend === CU.username) return;
  if (_chatListeners.has(friend)) return;
  _chatListeners.add(friend);
  const key = chatKey(CU.username, friend);

  // startAt(_loginTs) ensures we ONLY get messages sent after login
  // This prevents old history from triggering notifications on reconnect
  const msgsRef = _db.ref('chats/' + key + '/messages')
                     .orderByChild('ts')
                     .startAt(_loginTs);

  const fn = (snap) => {
    const msg = snap.val();
    if (!msg || msg.from === CU.username) return;
    receiveMessage(msg.from, msg, false);
  };
  msgsRef.on('child_added', fn);
  _fbListeners.push({ r: msgsRef, event: 'child_added', fn });
}

/* ── Send — saves to chat log AND recipient inbox (for offline delivery) ── */
async function sendChatMessage(friend, text, file) {
  if (!friend || friend === CU.username) return; // never send to yourself
  if (!_fbReady) { toast('⚠', 'Sem conexão com o servidor.'); return; }
  const msg = {
    id:   Date.now(),
    from: CU.username,
    text: text || null,
    file: file || null,
    ts:   Date.now()
  };
  const key = chatKey(CU.username, friend);

  // 1. Save in shared chat log (both users read history from here)
  await fbPush('chats/' + key + '/messages', msg);

  // 2. Push to recipient inbox — guarantees delivery even if they're offline
  //    The inbox listener fires immediately if online, or on next login if not
  await fbPush('inbox/' + friend, { type: 'chat_message', from: CU.username, payload: msg, ts: msg.ts });

  // 3. Show in sender's own window
  appendChatMessage(friend, msg);
}

/* ── Receive — called by both real-time listener and inbox drain ── */
function receiveMessage(from, msg, fromInbox) {
  // GUARD: never open a chat with yourself or process own messages
  if (!from || from === CU.username) return;
  if (!msg || !msg.id) return;

  // Global dedup: same message can arrive via inbox AND real-time listener
  const msgKey = String(msg.id) + '_' + from;
  if (_deliveredMsgIds.has(msgKey)) return;
  _deliveredMsgIds.add(msgKey);
  // Keep set from growing unbounded
  if (_deliveredMsgIds.size > 500) {
    const first = _deliveredMsgIds.values().next().value;
    _deliveredMsgIds.delete(first);
  }

  // Dedup: skip if already rendered in open chat window
  if (openChats.has(from)) {
    const chat  = openChats.get(from);
    const msgEl = document.getElementById('ch-msgs-' + from);
    const exists = msgEl && Array.from(msgEl.children)
                              .find(el => el.dataset && el.dataset.msgId === String(msg.id));
    if (!exists) {
      appendChatMessage(from, msg, !chat.el.classList.contains('minimized'));
    }
    if (chat.el.classList.contains('minimized')) {
      chat.unread++;
      updateChatHeader(from);
    }
  } else {
    // Auto-open minimized
    openChatWin(from);
    const chat = openChats.get(from);
    if (chat) {
      chat.el.classList.add('minimized');
      chat.unread++;
      updateChatHeader(from);
    }
  }

  // Always show notification popup
  showChatNotif(from, msg);
}

async function clearConversation(friend) {
  if (!_fbReady) return;
  const key = chatKey(CU.username, friend);
  await fbRemove('chats/' + key + '/messages');
  const msgs = document.getElementById('ch-msgs-' + friend);
  if (msgs) {
    msgs.innerHTML = '';
    const hint = document.createElement('div');
    hint.style.cssText = 'text-align:center;padding:24px 0;font-size:.74rem;color:rgba(240,240,240,.25);';
    hint.textContent = T.chatCleared || 'Conversa apagada';
    msgs.appendChild(hint);
  }
  toast('🗑', T.toastCleared);
}

async function loadChatMessages(friend) {
  if (!_fbReady) return;
  const key  = chatKey(CU.username, friend);
  const snap = await fbGet('chats/' + key + '/messages');
  if (!snap) return;
  const msgs = Object.values(snap).sort((a,b) => a.ts - b.ts);
  msgs.forEach(msg => appendChatMessage(friend, msg, false));
  scrollChatToBottom(friend);
}

/* ── Chat window ── */
function openChatWin(friend) {
  // Never open a chat window with yourself
  if (!friend || friend === CU.username) return;

  if (openChats.has(friend)) {
    const chat = openChats.get(friend);
    chat.el.classList.remove('minimized');
    chat.unread = 0; updateChatHeader(friend);
    return;
  }

  // Load friend profile — try username path, fallback to uid lookup
  const loadFriendProfile = async () => {
    let profile = await fbGet('users/' + friend + '/profile').catch(() => null);
    if (!profile?.name) {
      // Try uid lookup via usernames mapping
      const uid = await fbGet('usernames/' + friend).catch(() => null);
      if (uid) profile = await fbGet('users/' + uid + '/profile').catch(() => null);
    }
    return profile || {};
  };

  loadFriendProfile().then(profile => {
    const info   = profile || {};
    const name   = info.name || friend;

    const win = document.createElement('div');
    win.className = 'chat-win';
    win.style.pointerEvents = 'all';
    win.innerHTML = `
      <div class="chat-header" id="ch-hdr-${friend}">
        <div class="chat-header-avatar" style="overflow:hidden;position:relative;">${safePhotoUrl(profile?.photo) ? `<img src="${safePhotoUrl(profile.photo)}" style="width:100%;height:100%;object-fit:cover;position:absolute;inset:0;border-radius:50%;">` : name[0].toUpperCase()}
          <div class="chat-online-dot offline" id="ch-dot-${friend}"></div>
        </div>
        <span class="chat-title">${xe(name)}</span>
        <span class="chat-unread" id="ch-unread-${friend}" style="display:none"></span>
        <button class="chat-ws-btn" id="ch-ws-${friend}" title="Workspace compartilhado" style="background:none;border:none;cursor:pointer;color:rgba(45,212,191,.7);font-size:.85rem;padding:0 3px;transition:color .15s;flex-shrink:0;">🗂</button>
        <button class="chat-call-btn" id="ch-call-${friend}" title="Iniciar videochamada">📹</button>
        <button class="chat-clear-btn" id="ch-clear-${friend}" title="${T.clearChat||'Limpar conversa'}">🗑</button>
        <button class="chat-close-btn" id="ch-close-${friend}">✕</button>
      </div>
      <div class="chat-call-invite" id="ch-invite-${friend}" style="display:none">📹 Chamada em andamento <button class="chat-call-join">Entrar</button></div>
      <div class="chat-msgs" id="ch-msgs-${friend}"></div>
      <div class="chat-input-row">
        <label class="chat-file-btn" title="Enviar arquivo">
          <input type="file" id="ch-file-${friend}" multiple>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
        </label>
        <textarea class="chat-inp" id="ch-inp-${friend}" placeholder="${T.chatPlaceholder||'Mensagem…'}" rows="1"></textarea>
        <button class="chat-send" id="ch-send-${friend}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </div>`;

    document.body.appendChild(win);
    openChats.set(friend, { el: win, unread: 0 });
    repositionChatWindows();
    // Smooth entrance animation
    requestAnimationFrame(() => win.classList.add('visible'));

    win.querySelector('#ch-hdr-' + friend).addEventListener('click', (e) => {
      if (e.target.closest('.chat-close-btn') || e.target.closest('.chat-clear-btn')) return;
      win.classList.toggle('minimized');
      if (!win.classList.contains('minimized')) {
        openChats.get(friend).unread = 0;
        updateChatHeader(friend);
        scrollChatToBottom(friend);
      }
    });
    win.querySelector('#ch-ws-' + friend).addEventListener('click', (e) => {
      e.stopPropagation(); openSharedWorkspace(friend);
    });
    win.querySelector('#ch-call-' + friend).addEventListener('click', (e) => {
      e.stopPropagation(); startOrJoinCall('dm', chatKey(CU.username, friend), name);
    });
    win.querySelector('#ch-clear-' + friend).addEventListener('click', (e) => {
      e.stopPropagation(); clearConversation(friend);
    });
    win.querySelector('#ch-close-' + friend).addEventListener('click', (e) => {
      e.stopPropagation(); closeChatWin(friend);
    });
    win.querySelector('#ch-invite-' + friend + ' .chat-call-join').addEventListener('click', (e) => {
      e.stopPropagation(); startOrJoinCall('dm', chatKey(CU.username, friend), name);
    });
    watchIncomingCall('dm', chatKey(CU.username, friend), friend);

    const sendMsg = () => {
      const inp = win.querySelector('#ch-inp-' + friend);
      const text = inp.value.trim(); if (!text) return;
      inp.value = ''; inp.style.height = 'auto';
      sendChatMessage(friend, text, null);
    };
    win.querySelector('#ch-send-' + friend).addEventListener('click', sendMsg);
    win.querySelector('#ch-inp-'  + friend).addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); }
      else setTimeout(() => { const t=e.target; t.style.height='auto'; t.style.height=Math.min(t.scrollHeight,80)+'px'; }, 0);
    });
    win.querySelector('#ch-file-' + friend).addEventListener('change', function() {
      Array.from(this.files).forEach(f => {
        if (f.size > 5*1024*1024) { toast('⚠', f.name+' excede 5MB'); return; }
        if (!safeFileType(f)) { toast('⚠', '"' + f.name + '" — tipo não permitido'); return; }
        const r = new FileReader();
        r.onload = e => {
          const dataUrl = safeDataUrl(e.target.result);
          if (!dataUrl) return;
          sendChatMessage(friend, null, { name:f.name, sz:fSz(f.size), type:f.type, data:dataUrl });
        };
        r.readAsDataURL(f);
      });
      this.value = '';
    });

    loadChatMessages(friend);
    // update online dot
    isOnline(friend).then(online => {
      const dot = document.getElementById('ch-dot-' + friend);
      if (dot) dot.className = 'chat-online-dot ' + (online ? 'online' : 'offline');
    });
  });
}

function closeChatWin(friend) {
  if (!openChats.has(friend)) return;
  openChats.get(friend).el.remove();
  openChats.delete(friend);
  repositionChatWindows();
}

function repositionChatWindows() { repositionAllChatWindows(); }

function appendChatMessage(friend, msg, doScroll = true) {
  const container = document.getElementById('ch-msgs-' + friend);
  if (!container) return;
  const isMine = msg.from === CU.username;
  const div = document.createElement('div');
  div.className = 'chat-msg ' + (isMine ? 'mine' : 'theirs');
  div.dataset.msgId = String(msg.id);

  if (msg.file) {
    const isImg = msg.file.type && msg.file.type.startsWith('image/');
    if (isImg) {
      const img = document.createElement('img');
      img.className = 'chat-img';
      img.src = msg.file.data;
      img.alt = msg.file.name;
      img.addEventListener('click', () => {
        document.getElementById('chat-lb-img').src = msg.file.data;
        document.getElementById('chat-lightbox').classList.add('open');
      });
      div.appendChild(img);
    } else {
      const a = document.createElement('a');
      a.className = 'chat-file-bubble';
      a.href = msg.file.data; a.download = msg.file.name;
      a.innerHTML = `${fIco(msg.file.type)}<span class="chat-file-name">${xe(msg.file.name)}</span><span class="chat-file-sz">${msg.file.sz||''}</span>`;
      div.appendChild(a);
    }
  } else {
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble';
    bubble.textContent = msg.text || '';
    div.appendChild(bubble);
  }
  const time = document.createElement('div');
  time.className = 'chat-time';
  time.textContent = new Date(msg.ts).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
  div.appendChild(time);
  container.appendChild(div);
  if (doScroll) scrollChatToBottom(friend);
}

function scrollChatToBottom(friend) {
  const c = document.getElementById('ch-msgs-' + friend);
  if (c) setTimeout(() => { c.scrollTop = c.scrollHeight; }, 30);
}

function updateChatHeader(friend) {
  const chat = openChats.get(friend);
  if (!chat) return;
  const badge = chat.el.querySelector('#ch-unread-' + friend);
  if (badge) { badge.textContent = chat.unread > 9 ? '9+' : chat.unread; badge.style.display = chat.unread > 0 ? 'inline' : 'none'; }
}

function updateChatOnlineDot(friend) {
  isOnline(friend).then(online => {
    const dot = document.getElementById('ch-dot-' + friend);
    if (dot) dot.className = 'chat-online-dot ' + (online ? 'online' : 'offline');
  });
}

function showChatNotif(from, msg) {
  fbGet('users/' + from + '/profile').then(info => {
    const name   = info?.name || from;
    const text   = msg.file ? '📎 ' + msg.file.name : (msg.text || '');
    const timeStr= new Date(msg.ts||Date.now()).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
    const stack  = document.getElementById('chat-notif-stack');
    if (!stack) return;
    const el = document.createElement('div');
    el.className = 'chat-notif';
    el.innerHTML = `
      <div class="chat-notif-avatar" style="overflow:hidden;position:relative;">${safePhotoUrl(info?.photo) ? `<img src="${safePhotoUrl(info.photo)}" style="width:100%;height:100%;object-fit:cover;position:absolute;inset:0;border-radius:50%;">` : name[0].toUpperCase()}
        <div class="chat-notif-online"></div>
      </div>
      <div class="chat-notif-body">
        <div class="chat-notif-name">${xe(name)} <span style="color:rgba(240,240,240,.3);font-weight:400">@${xe(from)}</span></div>
        <div class="chat-notif-text">${xe(text.slice(0,60))}</div>
      </div>
      <div class="chat-notif-time">${timeStr}</div>
      <button class="chat-notif-close" title="Fechar">✕</button>`;
    el.addEventListener('click', e => {
      if (e.target.closest('.chat-notif-close')) return;
      openChatWin(from);
      const chat = openChats.get(from);
      if (chat) { chat.el.classList.remove('minimized'); chat.unread=0; updateChatHeader(from); scrollChatToBottom(from); }
      dismissNotif(el);
    });
    el.querySelector('.chat-notif-close').addEventListener('click', e => { e.stopPropagation(); dismissNotif(el); });
    stack.appendChild(el);
    el._dismissTimer = setTimeout(() => dismissNotif(el), 5000);
    playNotifSound(); // 🔔 sound on new message
  });
}

function dismissNotif(el) {
  clearTimeout(el._dismissTimer);
  el.classList.add('hiding');
  setTimeout(() => el.remove(), 220);
}

/* ── Avatar helper — returns img or initial ── */
function avatarHTML(profile, username, size) {
  const s = size || 34;
  const initial = ((profile && profile.name) || username || '?')[0].toUpperCase();
  const photoUrl = profile && safePhotoUrl(profile.photo);
  if (photoUrl) {
    return `<img src="${photoUrl}" alt="${initial}" loading="lazy" style="width:${s}px;height:${s}px;border-radius:50%;object-fit:cover;display:block;flex-shrink:0;">`;
  }
  return initial;
}

/* ── Upload & save profile photo ── */
async function uploadProfilePhoto(file) {
  if (!file || !file.type.startsWith('image/')) return;
  if (file.size > 6 * 1024 * 1024) { toast('⚠', 'Foto: máximo 6MB'); return; }
  const reader = new FileReader();
  reader.onload = async (e) => {
    // Resize to max 200x200 for storage efficiency
    const img = new Image();
    img.onload = async () => {
      const canvas = document.createElement('canvas');
      const size = 200;
      const scale = Math.min(size / img.width, size / img.height);
      canvas.width  = Math.round(img.width  * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      const photo = canvas.toDataURL('image/jpeg', 0.8);
      // Save photo to BOTH paths (uid = source of truth, username = social)
      await Promise.all([
        fbUpdate('users/' + CU.uid + '/profile', { photo }),
        fbUpdate('users/' + CU.username + '/profile', { photo }),
      ]).catch(async () => {
        // fallback individually
        await fbUpdate('users/' + CU.uid + '/profile', { photo }).catch(() => {});
        await fbUpdate('users/' + CU.username + '/profile', { photo }).catch(() => {});
      });
      // Update all open avatar displays
      document.querySelectorAll('.my-avatar-display').forEach(el => {
        el.innerHTML = `<img src="${photo}" alt="${CU.name[0]}" style="width:100%;height:100%;object-fit:cover;position:absolute;inset:0;">`;
      });
      toast('✓', 'Foto de perfil atualizada!');
      _renderingSocial = false;
      renderSocialPanel();
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

/* ═══════════════════════════════════════════════════════
   GRUPOS — Workspaces Coletivos
═══════════════════════════════════════════════════════ */

// Firebase path: /groups/{groupId} → { id, name, owner, members:{user:true}, createdAt }
// Firebase path: /groupInbox/{user}/{pushId} → { type:'group_invite', groupId, groupName, from, ts }

let _myGroups = []; // cache of groups user belongs to

function groupKey() {
  return CU.username + '_' + Date.now().toString(36);
}

async function createGroup(name) {
  if (!name.trim()) return;
  const id = groupKey();
  await fbSet('groups/' + id, {
    id, name: name.trim(),
    owner: CU.username,
    members: { [CU.username]: true },
    createdAt: Date.now()
  });
  // Personal index — lets user query their own groups without reading all /groups
  if (CU.uid) await fbSet('users/' + CU.uid + '/groups/' + id, true);
  toast('✓', 'Grupo "' + name.trim() + '" criado!');
  _renderingSocial = false;
  renderSocialPanel();
}

async function getMyGroups() {
  if (!_fbReady) return [];
  try {
    // Strategy 1: personal uid index (preferred — works with strict rules)
    if (CU.uid) {
      const index = await fbGet('users/' + CU.uid + '/groups');
      if (index) {
        const groupIds = Object.keys(index);
        const groups = await Promise.all(
          groupIds.map(gid => fbGet('groups/' + gid).catch(() => null))
        );
        const valid = groups.filter(g => g && g.members && g.members[CU.username]);
        if (valid.length > 0) return valid; // found via index — stop here
      }
    }
    // Strategy 2: fallback — read groups the user is known to be in
    // (from friends who share groups, or from the username-based index)
    // Reading /groups root is now blocked by rules — read only specific known group IDs.
    // If Strategy 1 returned nothing (no uid index yet), user likely has no groups.
    return [];
  } catch {
    return [];
  }
}

async function renderGroupsTab(body) {
  // ── New group input ──
  const newRow = document.createElement('div');
  newRow.className = 'sp-new-group-row';
  newRow.innerHTML = `
    <input class="sp-new-group-inp" id="sp-group-inp" placeholder="Nome do grupo…" autocomplete="off">
    <button class="sp-new-group-btn">＋ Criar</button>`;
  newRow.querySelector('.sp-new-group-btn').addEventListener('click', () => {
    const val = newRow.querySelector('#sp-group-inp').value;
    createGroup(val);
    newRow.querySelector('#sp-group-inp').value = '';
  });
  newRow.querySelector('#sp-group-inp').addEventListener('keydown', e => {
    if (e.key === 'Enter') { createGroup(e.target.value); e.target.value = ''; }
  });
  body.appendChild(newRow);

  const groups = await getMyGroups();
  _myGroups = groups;

  if (groups.length === 0) {
    const em = document.createElement('div'); em.className = 'sp-empty';
    em.textContent = 'Nenhum grupo ainda. Crie um acima!';
    body.appendChild(em);
    return;
  }

  const lbl = document.createElement('div'); lbl.className = 'sp-section-lbl'; lbl.textContent = 'Meus Grupos';
  body.appendChild(lbl);

  for (const group of groups) {
    const members = Object.keys(group.members || {});
    // Fetch presence for all members in parallel
    const presences = await Promise.all(members.map(m => getPresence(m)));
    const onlineCount = presences.filter(p => p?.online).length;

    const groupPhoto = _fbReady ? (await fbGet('groups/' + group.id + '/photo') || null) : null;
    const isOwner = group.owner === CU.username;

    const row = document.createElement('div'); row.className = 'sp-group-row';
    row.innerHTML = `
      <div class="sp-group-icon" style="position:relative;overflow:hidden;background:linear-gradient(135deg,#6366f1,#4f46e5);cursor:${isOwner?'pointer':'default'};">
        ${groupPhoto ? `<img src="${groupPhoto}" style="width:100%;height:100%;object-fit:cover;position:absolute;inset:0;">` : '👥'}
        ${isOwner ? `<div style="position:absolute;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .2s;font-size:.55rem;color:#fff;" class="group-photo-overlay">📷</div>
        <input type="file" accept="image/*" class="group-photo-inp" style="position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;">` : ''}
      </div>
      <div class="sp-group-info">
        <div class="sp-group-name">${xe(group.name)}</div>
        <div class="sp-group-meta">${members.length} membro${members.length !== 1 ? 's' : ''} · ${onlineCount} online</div>
      </div>
      <div class="sp-group-actions">
        <button class="sp-btn chat" title="Chat do grupo">💬</button>
        <button class="sp-btn ws"   title="Workspace do grupo">🗂</button>
        ${isOwner ? '<button class="sp-btn remove" title="Excluir grupo">🗑</button>' : '<button class="sp-btn remove" title="Sair do grupo">✕</button>'}
      </div>`;

    // Show photo overlay on hover (owner only)
    if (isOwner) {
      const icon = row.querySelector('.sp-group-icon');
      const overlay = row.querySelector('.group-photo-overlay');
      icon.addEventListener('mouseenter', () => { if (overlay) overlay.style.opacity = '1'; });
      icon.addEventListener('mouseleave', () => { if (overlay) overlay.style.opacity = '0'; });
      row.querySelector('.group-photo-inp').addEventListener('change', async function() {
        const file = this.files[0]; if (!file) return;
        const r = new FileReader();
        r.onload = async e => {
          // Resize to 200x200
          const img = new Image();
          img.onload = async () => {
            const canvas = document.createElement('canvas');
            canvas.width = canvas.height = 200;
            const ctx = canvas.getContext('2d');
            const s = Math.min(img.width, img.height);
            ctx.drawImage(img, (img.width-s)/2, (img.height-s)/2, s, s, 0, 0, 200, 200);
            const data = canvas.toDataURL('image/jpeg', 0.8);
            await fbSet('groups/' + group.id + '/photo', data);
            toast('📷', 'Foto do grupo atualizada!');
            _renderingSocial = false; renderSocialPanel();
          };
          img.src = e.target.result;
        };
        r.readAsDataURL(file);
        this.value = '';
      });
    }

    row.querySelector('.sp-btn.chat').addEventListener('click', e => {
      e.stopPropagation();
      openGroupChat(group);
    });
    row.querySelector('.sp-btn.ws').addEventListener('click', e => {
      e.stopPropagation();
      openGroupWorkspace(group);
    });
    row.querySelector('.sp-btn.remove').addEventListener('click', async e => {
      e.stopPropagation();
      if (group.owner === CU.username) {
        await fbRemove('groups/' + group.id);
        toast('🗑', 'Grupo excluído.');
      } else {
        await fbRemove('groups/' + group.id + '/members/' + CU.username);
        toast('✕', 'Você saiu do grupo.');
      }
      _renderingSocial = false; renderSocialPanel();
    });

    // Show members on expand
    row.addEventListener('click', e => {
      if (e.target.closest('.sp-group-actions')) return;
      const existing = row.nextSibling;
      if (existing && existing.classList?.contains('sp-group-members')) {
        existing.remove(); return;
      }
      const memberList = document.createElement('div');
      memberList.className = 'sp-group-members';
      memberList.style.cssText = 'padding:4px 12px 8px 56px;display:flex;flex-direction:column;gap:4px;';
      const isOwner = group.owner === CU.username;
      members.forEach((m, i) => {
        const p = presences[i];
        const color = p?.online ? ({ online:'#10b981', working:'#f59e0b', busy:'#ef4444' }[p.status] || '#10b981') : '#374151';
        const span = document.createElement('div');
        span.style.cssText = 'font-size:.68rem;color:rgba(240,240,240,.5);display:flex;align-items:center;gap:6px;';
        const isGroupOwner = m === group.owner;
        span.innerHTML = `
          <span class="group-member-dot" style="background:${color}"></span>
          <span style="flex:1;">${xe(m)}${isGroupOwner ? ' <span style="font-size:.58rem;color:rgba(99,102,241,.7);background:rgba(99,102,241,.12);padding:1px 5px;border-radius:4px;">dono</span>' : ''}</span>
        `;
        // Kick button — only for owner, not self, not other owners
        if (isOwner && m !== CU.username && !isGroupOwner) {
          const kickBtn = document.createElement('button');
          kickBtn.textContent = '⚡ Kickar';
          kickBtn.style.cssText = 'font-size:.6rem;padding:2px 7px;background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.25);border-radius:6px;color:#fca5a5;cursor:pointer;white-space:nowrap;';
          kickBtn.addEventListener('click', async e2 => {
            e2.stopPropagation();
            kickBtn.disabled = true; kickBtn.textContent = '…';
            await kickGroupMember(group, m);
            span.remove();
          });
          span.appendChild(kickBtn);
        }
        memberList.appendChild(span);
      });
      row.after(memberList);
    });

    body.appendChild(row);
  }
}

// ── Kick member from group ──
async function kickGroupMember(group, targetUser) {
  if (!_fbReady || !CU) return;
  if (group.owner !== CU.username) { toast('⚠', 'Apenas o dono pode kickar membros.'); return; }
  if (targetUser === CU.username)  { toast('⚠', 'Você não pode se kickar.'); return; }

  try {
    // Remove from group members
    await fbRemove('groups/' + group.id + '/members/' + targetUser);
    // Remove from user's group index (uid-based)
    const uid = await fbGet('usernames/' + targetUser).catch(() => null);
    if (uid) await fbRemove('users/' + uid + '/groups/' + group.id).catch(() => {});

    // Notify kicked user via groupInbox
    await fbPush('groupInbox/' + targetUser, {
      type: 'group_kick',
      groupId: group.id,
      groupName: group.name,
      from: CU.username,
      ts: Date.now()
    });

    toast('⚡', '@' + targetUser + ' foi removido do grupo.');
    _renderingSocial = false;
    renderSocialPanel();
  } catch(e) {
    console.error('kickGroupMember error:', e);
    toast('⚠', 'Erro ao kickar usuário.');
  }
}

// ── Invite friend to group ──
async function openGroupInviteMenu(friend, anchorEl) {
  document.querySelector('.group-invite-pop')?.remove();
  const groups = await getMyGroups();
  const myGroups = groups.filter(g => g.owner === CU.username || g.members[CU.username]);
  if (myGroups.length === 0) { toast('ℹ', 'Crie um grupo primeiro.'); return; }

  const pop = document.createElement('div');
  pop.className = 'status-menu-pop group-invite-pop';
  pop.style.minWidth = '190px';

  const lbl = document.createElement('div');
  lbl.style.cssText = 'font-size:.62rem;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:rgba(240,240,240,.3);padding:6px 12px 4px;';
  lbl.textContent = 'Convidar para grupo';
  pop.appendChild(lbl);

  myGroups.forEach(group => {
    if (group.members?.[friend]) return; // already in group
    const opt = document.createElement('div');
    opt.className = 'status-menu-opt';
    opt.innerHTML = `<span style="font-size:.85rem;">👥</span> ${xe(group.name)}`;
    opt.addEventListener('click', async () => {
      await sendGroupInvite(friend, group);
      pop.remove();
    });
    pop.appendChild(opt);
  });

  if (pop.children.length === 1) {
    const em = document.createElement('div');
    em.style.cssText = 'font-size:.74rem;color:rgba(240,240,240,.3);padding:8px 12px;';
    em.textContent = 'Já está em todos os seus grupos.';
    pop.appendChild(em);
  }

  const r = anchorEl.getBoundingClientRect();
  pop.style.cssText += `top:${r.bottom + 6}px;right:${window.innerWidth - r.right}px;left:auto;`;
  document.body.appendChild(pop);

  setTimeout(() => document.addEventListener('click', function close() {
    pop.remove(); document.removeEventListener('click', close);
  }), 0);
}

async function sendGroupInvite(targetUser, group) {
  if (!_fbReady) return;
  await fbPush('groupInbox/' + targetUser, {
    type: 'group_invite',
    groupId: group.id,
    groupName: group.name,
    from: CU.username,
    ts: Date.now()
  });
  toast('✓', 'Convite enviado para @' + targetUser + '!');
}

function showGroupInviteNotif(item) {
  const stack = document.getElementById('chat-notif-stack');
  if (!stack) return;
  const el = document.createElement('div');
  el.className = 'chat-notif';
  el.style.borderLeftColor = '#6366f1';
  el.style.cursor = 'default';
  el.innerHTML = `
    <div class="chat-notif-avatar" style="background:linear-gradient(135deg,#6366f1,#4f46e5);font-size:.9rem;">👥</div>
    <div class="chat-notif-body">
      <div class="chat-notif-name">@${xe(item.from)}</div>
      <div class="chat-notif-text" style="color:rgba(165,180,252,.7)">Grupo: ${xe(item.groupName)}</div>
    </div>
    <div class="ws-invite-acts">
      <button class="ws-invite-accept">✓</button>
      <button class="ws-invite-reject">✕</button>
    </div>`;

  const dismiss = () => { el.classList.add('hiding'); setTimeout(() => el.remove(), 220); };

  el.querySelector('.ws-invite-accept').addEventListener('click', async e => {
    e.stopPropagation();
    await fbSet('groups/' + item.groupId + '/members/' + CU.username, true);
    // Add to personal group index
    if (CU.uid) await fbSet('users/' + CU.uid + '/groups/' + item.groupId, true);
    toast('✓', 'Você entrou no grupo "' + item.groupName + '"!');
    dismiss();
    _renderingSocial = false; renderSocialPanel();
  });
  el.querySelector('.ws-invite-reject').addEventListener('click', e => {
    e.stopPropagation();
    dismiss();
  });

  stack.appendChild(el);
  playNotifSound();
}

// ── Group chat window ──
const openGroupChats = new Map();

async function openGroupChat(group) {
  if (openGroupChats.has(group.id)) {
    const gc = openGroupChats.get(group.id);
    gc.el.classList.remove('minimized');
    return;
  }

  const win = document.createElement('div');
  win.className = 'chat-win';
  win.style.pointerEvents = 'all';
  const gid = 'g_' + group.id;
  // Load group photo for header
  const gPhoto = _fbReady ? await fbGet('groups/' + group.id + '/photo') : null;
  const gAvatar = gPhoto
    ? `<img src="${gPhoto}" style="width:100%;height:100%;object-fit:cover;position:absolute;inset:0;border-radius:50%;">`
    : '👥';
  win.innerHTML = `
    <div class="chat-header" id="ch-hdr-${gid}">
      <div class="chat-header-avatar" style="background:linear-gradient(135deg,#6366f1,#4f46e5);font-size:.85rem;position:relative;overflow:hidden;">${gAvatar}</div>
      <span class="chat-title">${xe(group.name)}</span>
      <span class="chat-unread" id="ch-unread-${gid}" style="display:none"></span>
      <button class="chat-call-btn" id="ch-call-${gid}" title="Iniciar videochamada em grupo">📹</button>
      <button class="chat-close-btn" id="ch-close-${gid}">✕</button>
    </div>
    <div class="chat-call-invite" id="ch-invite-${gid}" style="display:none">📹 Chamada em andamento <button class="chat-call-join">Entrar</button></div>
    <div class="chat-msgs" id="ch-msgs-${gid}"></div>
    <div class="chat-input-row">
      <label class="chat-file-btn" title="Enviar arquivo/imagem">
        <input type="file" id="ch-gfile-${gid}" accept="image/*,*/*" multiple>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
      </label>
      <textarea class="chat-inp" id="ch-inp-${gid}" placeholder="Mensagem no grupo…" rows="1"></textarea>
      <button class="chat-send" id="ch-send-${gid}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
      </button>
    </div>`;

  document.body.appendChild(win);
  openGroupChats.set(group.id, { el: win, unread: 0, name: group.name });
  repositionAllChatWindows();
  requestAnimationFrame(() => win.classList.add('visible'));

  win.querySelector('#ch-hdr-' + gid).addEventListener('click', e => {
    if (e.target.closest('.chat-close-btn')) return;
    win.classList.toggle('minimized');
    if (!win.classList.contains('minimized')) scrollChatToBottom(gid);
  });
  win.querySelector('#ch-close-' + gid).addEventListener('click', e => {
    e.stopPropagation();
    win.remove(); openGroupChats.delete(group.id);
    repositionAllChatWindows();
  });
  win.querySelector('#ch-call-' + gid).addEventListener('click', e => {
    e.stopPropagation(); startOrJoinCall('group', group.id, group.name);
  });
  win.querySelector('#ch-invite-' + gid + ' .chat-call-join').addEventListener('click', e => {
    e.stopPropagation(); startOrJoinCall('group', group.id, group.name);
  });
  watchIncomingCall('group', group.id, gid);

  const sendMsg = () => {
    const inp = win.querySelector('#ch-inp-' + gid);
    const text = inp.value.trim(); if (!text) return;
    inp.value = ''; inp.style.height = 'auto';
    sendGroupMessage(group.id, text, null);
  };
  win.querySelector('#ch-send-' + gid).addEventListener('click', sendMsg);
  win.querySelector('#ch-inp-' + gid).addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); }
    else setTimeout(() => { const t=e.target; t.style.height='auto'; t.style.height=Math.min(t.scrollHeight,80)+'px'; }, 0);
  });
  win.querySelector('#ch-gfile-' + gid).addEventListener('change', function() {
    Array.from(this.files).forEach(f => {
      if (f.size > 5*1024*1024) { toast('⚠', f.name+' excede 5MB'); return; }
      const r = new FileReader();
      r.onload = e => sendGroupMessage(group.id, null, { name:f.name, sz:fSz(f.size), type:f.type, data:e.target.result });
      r.readAsDataURL(f);
    });
    this.value = '';
  });

  // Load history + live listener
  loadGroupMessages(group.id, gid);
  listenGroupChat(group.id, gid);
}

/* ═══════════════════════════════════════════════════════════════
   VIDEOCHAMADA — WebRTC mesh + sinalização via Firebase
   Funciona pra chat 1:1 (chats/{chatKey}/call) e chat de grupo
   (groupChats/{groupId}/call). Qualquer participante pode iniciar
   sem precisar de aprovação de ninguém — quem ainda não entrou vê
   um convite piscando na janela de chat até clicar em "Entrar"
   (e só aí o próprio navegador pede a permissão de câmera/mic dela).
   Chamadas em grupo usam topologia mesh (cada participante conecta
   direto com todos os outros) — funciona bem até uns 4-6 participantes,
   que é o razoável sem um servidor de mídia (SFU) dedicado.
═══════════════════════════════════════════════════════════════ */
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

let _call = null; // { basePath, myKey, scope, key, peers:Map, localStream, listeners:[], camOn, micOn }

function _callBasePath(scope, key) {
  return (scope === 'group' ? 'groupChats/' : 'chats/') + key + '/call';
}

function isInCall() { return !!_call; }

function _callOn(path, event, fn) {
  const r = ref(path);
  r.on(event, fn);
  _call.listeners.push({ r, event, fn });
}

function _getOrCreatePeer(otherKey) {
  if (_call.peers.has(otherKey)) return _call.peers.get(otherKey);

  const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
  _call.peers.set(otherKey, pc);

  _call.localStream.getTracks().forEach(t => pc.addTrack(t, _call.localStream));

  pc.onicecandidate = e => {
    if (!e.candidate) return;
    fbPush(_call.basePath + '/signals/' + otherKey + '/candidates/' + _call.myKey, e.candidate.toJSON());
  };
  pc.ontrack = e => {
    _addVideoTile(otherKey, e.streams[0], false, otherKey);
  };
  pc.onconnectionstatechange = () => {
    if (['failed', 'closed', 'disconnected'].includes(pc.connectionState)) _removeVideoTile(otherKey);
  };

  // Candidatos remotos endereçados a mim, vindos especificamente desse par
  _callOn(_call.basePath + '/signals/' + _call.myKey + '/candidates/' + otherKey, 'child_added', snap => {
    pc.addIceCandidate(new RTCIceCandidate(snap.val())).catch(() => {});
  });

  return pc;
}

async function _createOfferTo(otherKey) {
  const pc = _getOrCreatePeer(otherKey);
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  await fbSet(_call.basePath + '/signals/' + otherKey + '/offers/' + _call.myKey, { type: offer.type, sdp: offer.sdp });
}

function _removePeer(otherKey) {
  const pc = _call.peers.get(otherKey);
  if (pc) { pc.close(); _call.peers.delete(otherKey); }
  _removeVideoTile(otherKey);
}

async function startOrJoinCall(scope, key, title) {
  if (_call) { toast('⚠', 'Você já está em uma chamada.'); return; }
  if (!CU?.username) return;

  let localStream;
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  } catch (e) {
    toast('🚫', 'Não foi possível acessar câmera/microfone.');
    return;
  }

  const basePath = _callBasePath(scope, key);
  const myKey    = CU.username;

  _call = {
    basePath, myKey, scope, key, peers: new Map(), localStream, listeners: [],
    camOn: true, micOn: true, sharingScreen: false,
    camTrack: localStream.getVideoTracks()[0] || null, screenTrack: null,
  };

  openCallOverlay(title);
  _addVideoTile(myKey, localStream, true, (CU.name || CU.username) + ' (você)');

  const myEntry = { joinedAt: Date.now(), username: CU.username, name: CU.name || CU.username };
  await fbSet(basePath + '/participants/' + myKey, myEntry);
  await fbUpdate(basePath, { active: true, startedBy: myKey, startedAt: Date.now() });
  ref(basePath + '/participants/' + myKey).onDisconnect().remove();

  _callOn(basePath + '/participants', 'child_added', snap => {
    const otherKey = snap.key;
    if (otherKey === myKey || _call.peers.has(otherKey)) return;
    if (myKey < otherKey) _createOfferTo(otherKey);
    else _getOrCreatePeer(otherKey); // só prepara — espera a oferta do outro lado
  });

  _callOn(basePath + '/participants', 'child_removed', snap => _removePeer(snap.key));

  _callOn(basePath + '/signals/' + myKey + '/offers', 'child_added', async snap => {
    const fromKey = snap.key;
    const pc = _getOrCreatePeer(fromKey);
    await pc.setRemoteDescription(new RTCSessionDescription(snap.val()));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    await fbSet(basePath + '/signals/' + fromKey + '/answers/' + myKey, { type: answer.type, sdp: answer.sdp });
  });

  _callOn(basePath + '/signals/' + myKey + '/answers', 'child_added', async snap => {
    const pc = _call.peers.get(snap.key);
    if (pc) await pc.setRemoteDescription(new RTCSessionDescription(snap.val()));
  });

  toast('📹', 'Chamada iniciada!');
}

async function leaveCall() {
  if (!_call) return;
  const { basePath, myKey, peers, localStream, listeners, camTrack, screenTrack } = _call;

  listeners.forEach(({ r, event, fn }) => r.off(event, fn));
  peers.forEach(pc => pc.close());
  localStream.getTracks().forEach(t => t.stop());
  // Se estava compartilhando tela, a câmera original ficou fora do localStream atual — para ela também
  camTrack?.stop();
  screenTrack?.stop();

  ref(basePath + '/participants/' + myKey).onDisconnect().cancel();
  await fbRemove(basePath + '/participants/' + myKey).catch(() => {});
  await fbRemove(basePath + '/signals/' + myKey).catch(() => {});

  closeCallOverlay();
  _call = null;

  // Se ninguém mais ficou, limpa o registro da chamada por completo
  fbGet(basePath + '/participants').then(rest => { if (!rest) fbRemove(basePath).catch(() => {}); });
}

function toggleCallMic() {
  if (!_call) return;
  _call.micOn = !_call.micOn;
  _call.localStream.getAudioTracks().forEach(t => t.enabled = _call.micOn);
  const btn = document.getElementById('call-btn-mic');
  if (btn) { btn.classList.toggle('off', !_call.micOn); btn.textContent = _call.micOn ? '🎙️' : '🔇'; }
}

function toggleCallCam() {
  if (!_call) return;
  _call.camOn = !_call.camOn;
  _call.localStream.getVideoTracks().forEach(t => t.enabled = _call.camOn);
  const btn = document.getElementById('call-btn-cam');
  if (btn) btn.classList.toggle('off', !_call.camOn);
}

/* Compartilhar/espelhar a tela — troca a track de vídeo enviada a todos
   os participantes (via RTCRtpSender.replaceTrack, sem renegociar SDP)
   e volta pra câmera quando desligado ou quando o próprio navegador
   encerra o compartilhamento (botão nativo "Parar apresentação"). */
async function toggleCallScreenShare() {
  if (!_call) return;
  const btn = document.getElementById('call-btn-screen');

  if (_call.sharingScreen) {
    _call.screenTrack?.stop();
    _call.screenTrack = null;
    _call.sharingScreen = false;
    if (btn) btn.classList.remove('active');

    const camTrack = _call.camTrack;
    if (camTrack) {
      _call.peers.forEach(pc => {
        const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
        if (sender) sender.replaceTrack(camTrack).catch(() => {});
      });
      const newLocal = new MediaStream([camTrack, ..._call.localStream.getAudioTracks()]);
      _call.localStream = newLocal;
      _addVideoTile(_call.myKey, newLocal, true, (CU.name || CU.username) + ' (você)');
    }
    return;
  }

  let screenStream;
  try {
    screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
  } catch (_) {
    return; // usuário cancelou o seletor de tela/janela
  }

  const screenTrack = screenStream.getVideoTracks()[0];
  _call.screenTrack = screenTrack;
  _call.sharingScreen = true;
  if (btn) btn.classList.add('active');

  _call.peers.forEach(pc => {
    const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
    if (sender) sender.replaceTrack(screenTrack).catch(() => {});
  });

  const newLocal = new MediaStream([screenTrack, ..._call.localStream.getAudioTracks()]);
  _call.localStream = newLocal;
  _addVideoTile(_call.myKey, newLocal, true, (CU.name || CU.username) + ' (você) · tela');

  // Encerrou pelo controle nativo do navegador ("Parar apresentação") → volta pra câmera
  screenTrack.onended = () => { if (_call?.sharingScreen) toggleCallScreenShare(); };
}

/* ── UI da chamada ── */
// Lembra o tamanho/posição que a pessoa escolheu da última vez (por usuário)
function _callGeomKey() { return 'md_call_geom_' + (CU?.username || 'anon'); }
function _saveCallGeom(overlay) {
  const r = overlay.getBoundingClientRect();
  localStorage.setItem(_callGeomKey(), JSON.stringify({
    left: r.left, top: r.top, width: r.width, height: r.height
  }));
}
function _restoreCallGeom(overlay) {
  try {
    const g = JSON.parse(localStorage.getItem(_callGeomKey()) || 'null');
    if (!g) return;
    overlay.style.left   = Math.max(0, Math.min(window.innerWidth  - 100, g.left)) + 'px';
    overlay.style.top    = Math.max(0, Math.min(window.innerHeight - 60,  g.top))  + 'px';
    overlay.style.right  = 'auto';
    overlay.style.bottom = 'auto';
    overlay.style.width  = g.width  + 'px';
    overlay.style.height = g.height + 'px';
  } catch (_) {}
}

let _callDragWired = false;
function _wireCallDrag(overlay) {
  if (_callDragWired) return;
  _callDragWired = true;

  const header = overlay.querySelector('.call-header');
  header.addEventListener('mousedown', e => {
    if (e.target.closest('button')) return;
    e.preventDefault();
    const rect = overlay.getBoundingClientRect();
    overlay.style.left = rect.left + 'px';
    overlay.style.top  = rect.top + 'px';
    overlay.style.right = 'auto';
    overlay.style.bottom = 'auto';
    const offX = e.clientX - rect.left, offY = e.clientY - rect.top;
    const onMove = ev => {
      overlay.style.left = Math.max(0, Math.min(window.innerWidth  - overlay.offsetWidth,  ev.clientX - offX)) + 'px';
      overlay.style.top  = Math.max(0, Math.min(window.innerHeight - overlay.offsetHeight, ev.clientY - offY)) + 'px';
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      _saveCallGeom(overlay);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  });

  // Resize nativo do navegador (canto inferior direito, via CSS resize:both)
  new ResizeObserver(() => _saveCallGeom(overlay)).observe(overlay);
}

function openCallOverlay(title) {
  const overlay = document.getElementById('call-overlay');
  if (!overlay) return;
  document.getElementById('call-title').textContent = title || 'Videochamada';
  const grid = document.getElementById('call-grid');
  grid.innerHTML = '';
  grid.classList.remove('has-focus');
  overlay.style.display = 'flex';
  _restoreCallGeom(overlay);
  _wireCallDrag(overlay);
}

function closeCallOverlay() {
  const overlay = document.getElementById('call-overlay');
  if (!overlay) return;
  overlay.style.display = 'none';
  document.getElementById('call-grid').innerHTML = '';
}

function _addVideoTile(key, stream, isLocal, label) {
  const grid = document.getElementById('call-grid');
  if (!grid) return;
  let tile = grid.querySelector('[data-key="' + CSS.escape(key) + '"]');
  if (!tile) {
    tile = document.createElement('div');
    tile.className = 'call-tile';
    tile.dataset.key = key;
    tile.innerHTML = `<video autoplay playsinline ${isLocal ? 'muted' : ''}></video><span class="call-tile-label"></span><button type="button" class="call-tile-expand" title="Expandir/encolher" onclick="_toggleTileFocus(this.closest('.call-tile').dataset.key)">&#10530;</button>`;
    grid.appendChild(tile);
  }
  tile.querySelector('video').srcObject = stream;
  tile.querySelector('.call-tile-label').textContent = label || key;
}

/* Expandir/encolher uma tela especifica dentro da grade da chamada —
   sempre uma escolha manual de quem esta vendo, nunca automatico ao
   compartilhar tela (cada participante decide o que quer ver grande). */
function _toggleTileFocus(key) {
  const grid = document.getElementById('call-grid');
  const tile = grid?.querySelector('[data-key="' + CSS.escape(key) + '"]');
  if (!grid || !tile) return;
  const wasFocused = tile.classList.contains('focused');
  grid.querySelectorAll('.call-tile.focused').forEach(t => t.classList.remove('focused'));
  if (wasFocused) {
    grid.classList.remove('has-focus');
  } else {
    tile.classList.add('focused');
    grid.classList.add('has-focus');
  }
}

function _removeVideoTile(key) {
  const grid = document.getElementById('call-grid');
  const tile = grid?.querySelector('[data-key="' + CSS.escape(key) + '"]');
  if (!tile) return;
  const wasFocused = tile.classList.contains('focused');
  tile.remove();
  if (wasFocused) grid.classList.remove('has-focus');
}

/* ── Convite piscando pra quem ainda não entrou ── */
function watchIncomingCall(scope, key, domId) {
  const basePath = _callBasePath(scope, key);
  ref(basePath + '/participants').on('value', snap => {
    const banner = document.getElementById('ch-invite-' + domId);
    if (!banner) return; // janela já foi fechada
    const partKeys = snap.val() ? Object.keys(snap.val()) : [];
    const iAmIn    = CU?.username && partKeys.includes(CU.username);
    banner.style.display = (partKeys.length > 0 && !iAmIn) ? 'flex' : 'none';
  });
}

async function sendGroupMessage(groupId, text, file = null) {
  if (!CU) return;
  const msg = { id: Date.now() + '_' + CU.username, from: CU.username, ts: Date.now() };
  if (file) msg.file = file;
  else msg.text = text;
  // Show immediately in own window
  const gid = 'g_' + groupId;
  appendGroupMessage(gid, msg, true);
  // Push to Firebase if available
  if (_fbReady) await fbPush('groupChats/' + groupId + '/messages', msg);
}

async function loadGroupMessages(groupId, gid) {
  const snap = await fbGet('groupChats/' + groupId + '/messages');
  if (!snap) return;
  const container = document.getElementById('ch-msgs-' + gid);
  if (!container) return;
  Object.values(snap).forEach(msg => {
    if (!msg?.id) return;
    appendGroupMessage(gid, msg, false);
  });
  scrollChatToBottom(gid);
}

const _groupListeners = new Map();
function listenGroupChat(groupId, gid) {
  if (_groupListeners.has(groupId)) return;
  _groupListeners.set(groupId, true);
  onFb('groupChats/' + groupId + '/messages', 'child_added', async (snap) => {
    const msg = snap.val();
    if (!msg?.id || !msg.ts) return;
    if (msg.ts < _loginTs) return;
    if (msg.from === CU.username) return;
    appendGroupMessage(gid, msg, true);
    const gc = openGroupChats.get(groupId);
    if (gc) {
      if (gc.el.classList.contains('minimized')) {
        gc.unread = (gc.unread || 0) + 1;
        const badge = gc.el.querySelector('#ch-unread-' + gid);
        if (badge) { badge.textContent = gc.unread; badge.style.display = 'inline-flex'; }
      }
    }
    // Show group-aware notification
    showGroupChatNotif(groupId, gid, msg, gc?.name || groupId);
  });

  // Watch online/offline for group members
  watchGroupMembersOnline(groupId);
}

async function watchGroupMembersOnline(groupId) {
  const snap = await fbGet('groups/' + groupId + '/members');
  if (!snap) return;
  Object.keys(snap).forEach(member => {
    if (member === CU.username) return;
    // Reuse existing watchFriendOnline — it already handles notifs + dot updates
    // Only watch if not already watching (friends might already be tracked)
    const key = 'grp_' + groupId + '_' + member;
    if (_friendOnlineState[key] !== undefined) return;
    _friendOnlineState[key] = undefined; // init slot
    onFb('users/' + member + '/online', 'value', async (sn) => {
      const val = sn.val();
      const isNowOnline = !!val;
      const pStatus = isNowOnline ? (typeof val === 'object' ? val.status || 'online' : 'online') : 'offline';
      const prev = _friendOnlineState[key];
      const wasOnline = prev ? prev.online : undefined;
      if (isNowOnline && !wasOnline && wasOnline !== undefined) {
        const profile = await fbGet('users/' + member + '/profile') || {};
        showOnlineNotif(member, profile.name || member, profile, pStatus);
      }
      _friendOnlineState[key] = { online: isNowOnline, status: pStatus };
    });
  });
}

function showGroupChatNotif(groupId, gid, msg, groupName) {
  fbGet('users/' + msg.from + '/profile').then(info => {
    const name    = info?.name || msg.from;
    const text    = msg.text || '';
    const timeStr = new Date(msg.ts || Date.now()).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'});
    const stack   = document.getElementById('chat-notif-stack');
    if (!stack) return;
    const el = document.createElement('div');
    el.className = 'chat-notif';
    el.innerHTML = `
      <div class="chat-notif-avatar" style="overflow:hidden;position:relative;background:linear-gradient(135deg,#6366f1,#4f46e5);">
        ${safePhotoUrl(info?.photo) ? `<img src="${safePhotoUrl(info.photo)}" style="width:100%;height:100%;object-fit:cover;position:absolute;inset:0;border-radius:50%;">` : name[0].toUpperCase()}
        <div class="chat-notif-online"></div>
      </div>
      <div class="chat-notif-body">
        <div class="chat-notif-name">${xe(name)} <span style="color:rgba(240,240,240,.3);font-weight:400;font-size:.65rem;">👥 ${xe(groupName)}</span></div>
        <div class="chat-notif-text">${xe(text.slice(0, 60))}</div>
      </div>
      <div class="chat-notif-time">${timeStr}</div>
      <button class="chat-notif-close" title="Fechar">✕</button>`;
    el.addEventListener('click', e => {
      if (e.target.closest('.chat-notif-close')) return;
      // Open group chat window
      const group = _myGroups.find(g => g.id === groupId) || { id: groupId, name: groupName, members: {} };
      openGroupChat(group);
      const gc = openGroupChats.get(groupId);
      if (gc) { gc.el.classList.remove('minimized'); scrollChatToBottom(gid); }
      dismissNotif(el);
    });
    el.querySelector('.chat-notif-close').addEventListener('click', e => { e.stopPropagation(); dismissNotif(el); });
    stack.appendChild(el);
    el._dismissTimer = setTimeout(() => dismissNotif(el), 5000);
    playNotifSound();
  });
}

function appendGroupMessage(gid, msg, doScroll) {
  const container = document.getElementById('ch-msgs-' + gid);
  if (!container) return;
  if (Array.from(container.children).find(el => el.dataset?.msgId === String(msg.id))) return;
  const isMine = msg.from === CU.username;
  const div = document.createElement('div');
  div.className = 'chat-msg ' + (isMine ? 'mine' : 'theirs');
  div.dataset.msgId = String(msg.id);

  // Sender label for group (not shown for own messages)
  if (!isMine) {
    const sender = document.createElement('div');
    sender.style.cssText = 'font-size:.63rem;color:rgba(240,240,240,.3);margin-bottom:2px;padding-left:2px;';
    sender.textContent = '@' + msg.from;
    div.appendChild(sender);
  }

  if (msg.file) {
    const isImg = msg.file.type && msg.file.type.startsWith('image/');
    if (isImg) {
      const img = document.createElement('img');
      img.className = 'chat-img';
      img.src = msg.file.data;
      img.alt = msg.file.name;
      img.addEventListener('click', () => {
        document.getElementById('chat-lb-img').src = msg.file.data;
        document.getElementById('chat-lightbox').classList.add('open');
      });
      div.appendChild(img);
    } else {
      const a = document.createElement('a');
      a.className = 'chat-file-bubble';
      a.href = msg.file.data; a.download = msg.file.name;
      a.innerHTML = `${fIco(msg.file.type)}<span class="chat-file-name">${xe(msg.file.name)}</span><span class="chat-file-sz">${msg.file.sz||''}</span>`;
      div.appendChild(a);
    }
  } else {
    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble';
    bubble.textContent = msg.text || '';
    div.appendChild(bubble);
  }

  const time = document.createElement('div');
  time.className = 'chat-time';
  time.textContent = new Date(msg.ts || Date.now()).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'});
  div.appendChild(time);

  container.appendChild(div);
  if (doScroll) scrollChatToBottom(gid);
}

function repositionAllChatWindows() {
  const GAP = 8, WIN_W = 300;
  let rightEdge = 16;
  openChats.forEach(chat => {
    chat.el.style.right = rightEdge + 'px';
    chat.el.style.left  = 'auto';
    rightEdge += WIN_W + GAP;
  });
  openGroupChats.forEach(gc => {
    gc.el.style.right = rightEdge + 'px';
    gc.el.style.left  = 'auto';
    rightEdge += WIN_W + GAP;
  });
}

/* ═══════════════════════════════════════════════════════
   WORKSPACE DE GRUPO
   Firebase: /group_boards/{groupId}/status → 'idle'|'active'
             /group_boards/{groupId}/startedBy → username
             /group_boards/{groupId}/notes/{noteId} → note
═══════════════════════════════════════════════════════ */

let _activeGroupWs = null; // { groupId, groupName, listener }

function showGroupWsInviteNotif(item) {
  // Auto-join — no confirmation needed
  joinGroupWorkspace({ id: item.groupId, name: item.groupName, members: {} });
  toast('👥', '@' + item.from + ' iniciou o workspace do grupo "' + item.groupName + '"');
}

async function openGroupWorkspace(group) {
  if (!_fbReady) { toast('⚠', 'Sem conexão.'); return; }

  // Only owner can start a new group workspace
  const existing = await fbGet('group_boards/' + group.id + '/status');
  if (existing === 'active') {
    // Anyone can join an active workspace
    await joinGroupWorkspace(group);
    return;
  }

  if (group.owner !== CU.username) {
    toast('⚠', 'Apenas o dono do grupo pode iniciar o workspace.');
    return;
  }

  // Start workspace
  await fbSet('group_boards/' + group.id + '/status',    'active');
  await fbSet('group_boards/' + group.id + '/startedBy', CU.username);

  // Notify all members via groupInbox (no timestamp filter — works offline)
  const members = Object.keys(group.members || {}).filter(m => m !== CU.username);
  await Promise.all(members.map(m =>
    fbPush('groupInbox/' + m, {
      type: 'group_ws_invite',
      groupId: group.id,
      groupName: group.name,
      from: CU.username,
      ts: Date.now()
    })
  ));

  switchToGroupWorkspace(group.id, group.name, true); // isNew=true — start empty
  toast('🗂️', 'Workspace do grupo "' + group.name + '" iniciado!');
}

async function joinGroupWorkspace(group) {
  switchToGroupWorkspace(group.id, group.name, false); // isNew=false — load existing
  toast('🗂️', 'Entrou no workspace do grupo "' + group.name + '"!');
}

function switchToGroupWorkspace(groupId, groupName, isNew = false) {
  // Leave any current workspace first
  if (_activeWs) switchToPersonal();
  if (_activeGroupWs) leaveGroupWorkspace(false);

  // Save personal notes IMMEDIATELY (cancel any pending debounced save first)
  clearTimeout(_saveNotesTmr);
  if (CU && !_activeGroupWs && !_activeWs) {
    const arr = notes.map(n => _noteToRaw(n));
    saveNotesRaw(CU.username, arr);
  }

  // Clear board BEFORE setting _activeGroupWs
  notes.forEach(n => closeViewer(n.id));
  notes = []; zTop = 10;
  document.querySelectorAll('.note').forEach(e => e.remove());
  document.querySelectorAll('.stack-wrap').forEach(e => e.remove());
  syncCount();

  // NOW set active group workspace
  _activeGroupWs = { groupId, groupName };

  // Update toolbar badge
  const btn = document.getElementById('ws-toolbar-btn');
  if (btn) {
    btn.innerHTML = `
      <span class="ws-active-badge">👥 ${xe(groupName)}</span>
      <span class="ws-active-badge" onclick="leaveGroupWorkspace(true)"
        style="background:rgba(239,68,68,.1);border-color:rgba(239,68,68,.25);color:#fca5a5;margin-left:4px"
        title="Sair do workspace">🚪</span>`;
    btn.style.display = 'inline-flex';
  }

  loadGroupBoardNotes(groupId, isNew);
  listenGroupBoardNotes(groupId);
  // Recarregar clientes do workspace de grupo
  _crmReloadForWorkspace();
}

async function leaveGroupWorkspace(confirm = true) {
  if (!_activeGroupWs) return;
  const { groupId, groupName } = _activeGroupWs;

  if (confirm) {
    const isOwner = _myGroups.find(g => g.id === groupId)?.owner === CU.username;
    // Show custom dialog instead of native confirm
    const result = await showLeaveWsDialog(groupName, isOwner);
    // result: 'cancel' | 'leave' | 'terminate'
    if (result === 'cancel') return;
    if (result === 'terminate') {
      // Stop listeners FIRST to avoid re-triggering leaveGroupWorkspace via status change
      if (_activeGroupWs?.filesRef)   { _activeGroupWs.filesRef.off(); }
      if (_activeGroupWs?.notesRef)   { _activeGroupWs.notesRef.off(); }
      if (_activeGroupWs?.statusRef)  { _activeGroupWs.statusRef.off(); }
      if (_activeGroupWs?.listener)   { _activeGroupWs.listener.off(); }
      // Delete everything from Firebase
      await fbRemove('group_boards/' + groupId);
      // Notify all members
      const group = _myGroups.find(g => g.id === groupId);
      const members = Object.keys(group?.members || {}).filter(m => m !== CU.username);
      await Promise.all(members.map(m =>
        fbPush('groupInbox/' + m, { type:'group_ws_ended', groupId, groupName, from:CU.username, ts:Date.now() })
      ));
      toast('🗑', 'Workspace do grupo encerrado para todos.');
      _activeGroupWs = null;
      await _restorePersonalBoard();
      return;
    }
    // result === 'leave' — just leave, workspace continues for others
  }

  // Stop ALL listeners before nulling _activeGroupWs
  if (_activeGroupWs?.filesRef)   { _activeGroupWs.filesRef.off(); }
  if (_activeGroupWs?.notesRef)   { _activeGroupWs.notesRef.off(); }
  if (_activeGroupWs?.statusRef)  { _activeGroupWs.statusRef.off(); }
  if (_activeGroupWs?.listener)   { _activeGroupWs.listener.off(); }
  _activeGroupWs = null;

  await _restorePersonalBoard();
}

async function _restorePersonalBoard() {
  const btn = document.getElementById('ws-toolbar-btn');
  if (btn) { btn.innerHTML = ''; btn.style.display = 'none'; }

  notes.forEach(n => closeViewer(n.id));
  notes = []; zTop = 10;
  document.querySelectorAll('.note').forEach(e => e.remove());
  document.querySelectorAll('.stack-wrap').forEach(e => e.remove());
  const rawNotes = await loadNotesRaw(CU.username);
  rawNotes.forEach(r => {
    if (r.type === 'client' || String(r.id || '').startsWith('crm_')) return; // skip CRM records
    const n = { id:r.id, color:r.color, title:r.title, body:r.body,
      start:r.start, end:r.end, reminder:r.reminder, remDays:r.remDays,
      status:r.status||'todo', titleH:r.titleH||0, bodyH:r.bodyH||0,
      x:r.x, y:r.y, z:r.z, files:r.files||[],
      stackId:r.stackId||null, stackOrder:r.stackOrder||0, pinned:r.pinned||false,
      _isClientNote: r._isClientNote || false,
      _crmRecordId:  r._crmRecordId  || null };
    if (n.z > zTop) zTop = n.z;
    notes.push(n); mountNote(n);
  });
  const stackIds = [...new Set(notes.filter(n => n.stackId).map(n => n.stackId))];
  setTimeout(() => stackIds.forEach(sid => renderStack(sid)), 0);
  syncCount();
  toast('📋', 'Workspace pessoal restaurado.');
  // Recarregar clientes do board pessoal
  _crmReloadForWorkspace();
}

function showLeaveWsDialog(groupName, isOwner) {
  return new Promise(resolve => {
    document.querySelector('.leave-ws-pop')?.remove();
    const pop = document.createElement('div');
    pop.className = 'confirm-clear-pop leave-ws-pop';
    pop.innerHTML = `
      <div class="confirm-clear-card">
        <div class="confirm-clear-icon">🚪</div>
        <div class="confirm-clear-title">Sair do workspace</div>
        <div class="confirm-clear-desc">
          ${isOwner
            ? `Como dono, você pode sair temporariamente (o workspace continua para os membros) ou encerrá-lo permanentemente para todos.`
            : `Você pode sair temporariamente. O workspace continuará ativo para os outros membros.`
          }
        </div>
        <div class="confirm-clear-btns" style="flex-direction:column;gap:8px;">
          <button class="confirm-clear-ok" id="lwb-leave" style="background:rgba(99,102,241,.15);border-color:rgba(99,102,241,.35);color:#a5b4fc;">
            Sair temporariamente
          </button>
          ${isOwner ? `<button class="confirm-clear-ok" id="lwb-terminate">Encerrar para todos</button>` : ''}
          <button class="confirm-clear-cancel" id="lwb-cancel">Cancelar</button>
        </div>
      </div>`;
    document.body.appendChild(pop);
    requestAnimationFrame(() => pop.classList.add('visible'));

    const close = (result) => {
      pop.classList.remove('visible');
      setTimeout(() => pop.remove(), 200);
      resolve(result);
    };
    pop.querySelector('#lwb-leave').addEventListener('click', () => close('leave'));
    pop.querySelector('#lwb-cancel').addEventListener('click', () => close('cancel'));
    if (isOwner) pop.querySelector('#lwb-terminate').addEventListener('click', () => close('terminate'));
    pop.addEventListener('click', e => { if (e.target === pop) close('cancel'); });
  });
}

async function loadGroupBoardNotes(groupId, isNew = false) {
  if (!_fbReady) return;
  if (isNew) {
    // First creation — wipe Firebase so workspace starts empty
    await fbRemove('group_boards/' + groupId + '/notes');
    await fbRemove('group_boards/' + groupId + '/files');
    syncCount();
    return;
  }
  // Re-entry — load existing notes + files from Firebase
  const [notesSnap, filesSnap] = await Promise.all([
    fbGet('group_boards/' + groupId + '/notes'),
    fbGet('group_boards/' + groupId + '/files'),
  ]);
  if (!notesSnap) { syncCount(); return; }
  const allFiles = filesSnap || {};
  Object.values(notesSnap).forEach(r => {
    if (!r?.id || !_activeGroupWs || notes.find(n => n.id === r.id)) return;
    // Load files from /files/{noteId}
    const noteFilesData = allFiles[r.id] || allFiles[String(r.id)] || {};
    const noteFiles = Object.values(noteFilesData)
      .sort((a,b) => (a.ts||0)-(b.ts||0))
      .map(f => ({ id:f.id, name:f.name, size:f.size, type:f.type, dataUrl:f.dataUrl }));
    const n = { id:r.id, color:r.color||'indigo', title:r.title||'', body:r.body||'',
      start:r.start||'', end:r.end||'', reminder:false, remDays:3,
      status:r.status||'todo', titleH:r.titleH||0, bodyH:r.bodyH||0,
      x:r.x||100, y:r.y||120, z:r.z||++zTop, files:noteFiles,
      stackId:r.stackId||null, stackOrder:r.stackOrder||0,
      _isClientNote: r._isClientNote || false,
      _crmRecordId:  r._crmRecordId  || null };
    if (n.z > zTop) zTop = n.z;
    notes.push(n); mountNote(n);
  });
  // Render stacks
  const stackIds = [...new Set(notes.filter(n => n.stackId).map(n => n.stackId))];
  setTimeout(() => stackIds.forEach(sid => renderStack(sid)), 0);
  syncCount();
}

function listenGroupBoardNotes(groupId) {
  // Detach any previous listener for this group
  if (_activeGroupWs?.notesRef) { _activeGroupWs.notesRef.off(); }

  const r = _db.ref('group_boards/' + groupId + '/notes');
  if (_activeGroupWs) _activeGroupWs.listener = r;
  if (_activeGroupWs) _activeGroupWs.notesRef = r;

  // Use startAt(Date.now()) to only receive notes added AFTER joining
  // child_added also fires for existing notes — guard with _activeGroupWs check
  r.on('child_added', snap => {
    if (!_activeGroupWs || _activeGroupWs.groupId !== groupId) return;
    const data = snap.val();
    if (!data || notes.find(n => n.id === data.id)) return;
    const n = { id:data.id, color:data.color||'indigo', title:data.title||'', body:data.body||'',
      start:data.start||'', end:data.end||'', reminder:false, remDays:3,
      status:data.status||'todo', titleH:data.titleH||0, bodyH:data.bodyH||0,
      x:data.x||100, y:data.y||120, z:data.z||++zTop, files:[],
      stackId:data.stackId||null, stackOrder:data.stackOrder||0 };
    if (n.z > zTop) zTop = n.z;
    notes.push(n); mountNote(n);
    // Render stack if this note belongs to one
    if (n.stackId) setTimeout(() => renderStack(n.stackId), 50);
    syncCount();
  });

  r.on('child_removed', snap => {
    if (!_activeGroupWs || _activeGroupWs.groupId !== groupId) return;
    const data = snap.val();
    const id = data?.id;
    if (!id) return;
    notes = notes.filter(n => n.id !== id);
    const el = document.querySelector('.note[data-id="'+id+'"]');
    if (el) el.remove();
    // Also remove from any stack
    document.querySelectorAll('.stack-card-row[data-note-id="'+id+'"]').forEach(e => e.remove());
    syncCount();
  });

  r.on('child_changed', snap => {
    if (!_activeGroupWs || _activeGroupWs.groupId !== groupId) return;
    const data = snap.val();
    const n = notes.find(n => n.id === data.id); if (!n) return;
    const el = document.querySelector('.note[data-id="'+n.id+'"]'); if (!el) return;
    const ta1 = el.querySelector('.n-title');
    const ta2 = el.querySelector('.n-text');
    if (ta1 && document.activeElement !== ta1) { n.title = data.title||''; ta1.value = n.title; }
    if (ta2 && document.activeElement !== ta2) { n.body  = data.body ||''; ta2.value = n.body;  }
    if (data.status !== undefined) { n.status = data.status; applyNoteStatus(el, data.status); }
    // Sync position
    if (data.x !== undefined) { n.x = data.x; n.y = data.y; el.style.left = data.x+'px'; el.style.top = data.y+'px'; }
    if (data.z !== undefined && data.z > n.z) { n.z = data.z; el.style.zIndex = data.z; }
    // Sync stack membership in real-time
    const prevStack = n.stackId;
    if (data.stackId !== prevStack) {
      n.stackId    = data.stackId || null;
      n.stackOrder = data.stackOrder || 0;
      if (prevStack) {
        const rem = getStackNotes(prevStack);
        document.querySelector('.stack-wrap[data-stack="'+prevStack+'"]')?.remove();
        if (rem.length >= 2) setTimeout(() => renderStack(prevStack), 60);
        else if (rem.length === 1) { rem[0].stackId = null; const re = document.querySelector('.note[data-id="'+rem[0].id+'"]'); if (re) { re.style.display=''; } }
      }
      if (n.stackId) setTimeout(() => renderStack(n.stackId), 80);
      else { el.style.display=''; }
    }
  });

  // ── Separate /files listener — atomic per-file, no overwrite conflicts ──
  const filesRef = _db.ref('group_boards/' + groupId + '/files');
  if (_activeGroupWs) _activeGroupWs.filesRef = filesRef;

  const syncFilesForNote = (noteKey, filesData) => {
    // Note IDs can be numbers (Date.now()) — compare both ways
    const n = notes.find(n => String(n.id) === String(noteKey));
    if (!n) return;
    n.files = Object.values(filesData || {})
      .sort((a,b) => (a.ts||0)-(b.ts||0))
      .map(f => ({ id:f.id, name:f.name, size:f.size, type:f.type, dataUrl:f.dataUrl||'' }));
    renderFiles(n);
  };

  filesRef.on('child_added',   snap => { if (_activeGroupWs?.groupId === groupId) syncFilesForNote(snap.key, snap.val()); });
  filesRef.on('child_changed', snap => { if (_activeGroupWs?.groupId === groupId) syncFilesForNote(snap.key, snap.val()); });
  filesRef.on('child_removed', snap => { if (_activeGroupWs?.groupId === groupId) syncFilesForNote(snap.key, {}); });

  // ── Status listener — workspace terminated by owner ──
  const statusRef = _db.ref('group_boards/' + groupId + '/status');
  if (_activeGroupWs) _activeGroupWs.statusRef = statusRef;
  statusRef.on('value', snap => {
    // null = path deleted (fbRemove), 'idle' = explicit terminate
    const val = snap.val();
    if ((val === null || val === 'idle') && _activeGroupWs?.groupId === groupId) {
      // Stop all listeners FIRST to prevent race with child_removed
      if (_activeGroupWs?.filesRef)   { _activeGroupWs.filesRef.off(); }
      if (_activeGroupWs?.notesRef)   { _activeGroupWs.notesRef.off(); }
      if (_activeGroupWs?.statusRef)  { _activeGroupWs.statusRef.off(); }
      if (_activeGroupWs?.listener)   { _activeGroupWs.listener.off(); }
      _activeGroupWs = null;
      // Clear board immediately, restore personal
      notes.forEach(n => closeViewer(n.id));
      notes = []; zTop = 10;
      document.querySelectorAll('.note').forEach(e => e.remove());
      document.querySelectorAll('.stack-wrap').forEach(e => e.remove());
      _restorePersonalBoard();
      toast('⚠', 'O workspace do grupo foi encerrado.');
    }
  });
}

function saveGroupNote(n) {
  if (!_activeGroupWs || !_fbReady) return;
  fbSet('group_boards/' + _activeGroupWs.groupId + '/notes/' + n.id, {
    id:n.id, color:n.color, title:n.title, body:n.body,
    start:n.start||'', end:n.end||'', status:n.status||'todo', checklist:n.checklist||[],
    titleH:n.titleH||0, bodyH:n.bodyH||0, x:n.x, y:n.y, z:n.z,
    stackId:n.stackId||null, stackOrder:n.stackOrder||0,
    _isClientNote: n._isClientNote || false,
    _crmRecordId:  n._crmRecordId  || null
  });
}

// ── Compress image/file to fit Realtime DB limits ──────────────────────────
// Images: resize to max 800px, quality 55% → typically 40-120KB
// Other files: hard limit 400KB in collaborative mode
const GROUP_FILE_LIMIT = 400 * 1024; // 400KB for non-images
const GROUP_IMG_MAX_PX = 800;        // max dimension for images
const GROUP_IMG_QUALITY = 0.55;      // JPEG quality

async function compressForGroup(file) {
  // Images: compress via canvas
  if (file.type.startsWith('image/')) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w > GROUP_IMG_MAX_PX || h > GROUP_IMG_MAX_PX) {
          const scale = GROUP_IMG_MAX_PX / Math.max(w, h);
          w = Math.round(w * scale); h = Math.round(h * scale);
        }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        const compressed = canvas.toDataURL('image/jpeg', GROUP_IMG_QUALITY);
        // Estimate byte size (base64 ≈ 3/4 of chars)
        const bytes = Math.round(compressed.length * 0.75);
        resolve({ dataUrl: compressed, size: bytes });
      };
      img.onerror = reject;
      img.src = file.dataUrl;
    });
  }
  // Non-image: check size
  const bytes = Math.round((file.dataUrl || '').length * 0.75);
  if (bytes > GROUP_FILE_LIMIT) return null; // too large
  return { dataUrl: file.dataUrl, size: bytes };
}

async function saveGroupNoteFile(noteId, file) {
  if (!_activeGroupWs || !_fbReady) return;
  const groupId = _activeGroupWs.groupId;
  const fileId  = 'f_' + Date.now() + '_' + Math.random().toString(36).slice(2,6);

  try {
    // Compress/validate before saving to DB
    const compressed = await compressForGroup(file);
    if (!compressed) {
      toast('⚠', '"' + file.name + '" é grande demais para o workspace colaborativo (máx 400KB para não-imagens).');
      return;
    }

    const fileData = {
      id: fileId, name: file.name, size: compressed.size, type: file.type,
      dataUrl: compressed.dataUrl,  // compressed base64 — safe for Realtime DB
      uploadedBy: CU.username, ts: Date.now()
    };

    await fbSet('group_boards/' + groupId + '/files/' + noteId + '/' + fileId, fileData);

    // Update local file object with id so deletion works
    const n = notes.find(n => String(n.id) === String(noteId));
    if (n) {
      const lf = n.files.find(f => f.name === file.name && !f.id);
      if (lf) { lf.id = fileId; lf.dataUrl = compressed.dataUrl; lf.size = compressed.size; }
    }
  } catch(e) {
    console.error('saveGroupNoteFile error:', e);
    toast('⚠', 'Erro ao compartilhar arquivo.');
  }
}

async function removeGroupNoteFile(noteId, fileId) {
  if (!_activeGroupWs || !_fbReady) return;
  await fbRemove('group_boards/' + _activeGroupWs.groupId + '/files/' + noteId + '/' + fileId).catch(() => {});
}

function removeGroupNote(id) {
  if (!_activeGroupWs || !_fbReady) return;
  fbRemove('group_boards/' + _activeGroupWs.groupId + '/notes/' + id);
}

/* ── Init social on login ── */
async function initSocialChannel() {
  await loadFirebase();
  // Sync user profile to Firebase so others can find us
  const localPhoto = await fbGet('users/' + CU.username + '/profile/photo');
  await fbSet('users/' + CU.username + '/profile', {
    name: CU.name,
    role: CU.role || '',
    photo: localPhoto || null
  });
  initSocialListeners();
}

// getAccounts still reads local — but we also check Firebase for social lookups
// so sendFriendRequest checks Firebase profile instead of local accounts

/* ═══════════════════════════════════════════════════════
   SHARED WORKSPACE
   /shared_boards/{key}/notes/{noteId}
   key = [a,b].sort().join('__')
═══════════════════════════════════════════════════════ */
let _activeWs   = null;  // { key, friend } or null = personal
let _wsListener = null;

function sharedKey(a, b) { return [a,b].sort().join('__'); }

// Send workspace invite — waits for friend authorization
async function openSharedWorkspace(friend) {
  if (!_fbReady) { toast('⚠','Sem conexão com servidor.'); return; }
  const key = sharedKey(CU.username, friend);
  // Check if workspace already exists and is active
  const existing = await fbGet('shared_boards/'+key+'/status');
  if (existing === 'active') {
    switchToWorkspace(key, friend); return;
  }
  // Mark as pending
  await fbSet('shared_boards/'+key+'/status', 'pending');
  await fbSet('shared_boards/'+key+'/invitedBy', CU.username);
  // Send invite to friend
  await fbPush('inbox/'+friend, { type:'ws_invite', from:CU.username, key, ts:Date.now() });
  toast('🗂️', 'Convite enviado para @'+friend+'. Aguardando autorização…');
}

// Show ws invite inside the chat-notif-stack (right side, same as message notifs)
function showWsInviteModal(from, key) {
  const stack = document.getElementById('chat-notif-stack');
  if (!stack) return;

  // Remove duplicate from same user
  stack.querySelectorAll('[data-ws-from]').forEach(e => {
    if (e.dataset.wsFrom === from) e.remove();
  });

  const el = document.createElement('div');
  el.className = 'chat-notif';
  el.style.borderLeftColor = '#6366f1';
  el.style.cursor = 'default';
  el.dataset.wsFrom = from;

  el.innerHTML = `
    <div class="chat-notif-avatar">${from[0].toUpperCase()}</div>
    <div class="chat-notif-body">
      <div class="chat-notif-name">@${xe(from)}</div>
      <div class="chat-notif-text" style="color:rgba(165,180,252,.7)">🗂️ workspace</div>
    </div>
    <div class="ws-invite-acts">
      <button class="ws-invite-accept">✓</button>
      <button class="ws-invite-reject">✕</button>
    </div>`;

  const dismiss = () => { el.classList.add('hiding'); setTimeout(() => el.remove(), 220); };

  el.querySelector('.ws-invite-accept').addEventListener('click', async e => {
    e.stopPropagation();
    await fbSet('shared_boards/'+key+'/status', 'active');
    await fbSet('shared_boards/'+key+'/members/'+CU.username, true);
    await fbSet('shared_boards/'+key+'/members/'+from, true);
    await fbPush('inbox/'+from, { type:'ws_accepted', from:CU.username, key, ts:Date.now() });
    switchToWorkspace(key, from);
    dismiss();
  });

  el.querySelector('.ws-invite-reject').addEventListener('click', async e => {
    e.stopPropagation();
    await fbSet('shared_boards/'+key+'/status', 'rejected');
    await fbPush('inbox/'+from, { type:'ws_rejected', from:CU.username, key, ts:Date.now() });
    dismiss();
  });

  stack.appendChild(el);
  // No auto-dismiss — user must act
}

function switchToWorkspace(key, friend) {
  // Save personal notes IMMEDIATELY before switching (cancel pending debounce)
  clearTimeout(_saveNotesTmr);
  if (CU && !_activeWs && !_activeGroupWs) {
    const arr = notes.map(n => _noteToRaw(n));
    saveNotesRaw(CU.username, arr);
  }

  // Clear board BEFORE setting _activeWs
  notes.forEach(n => { closeViewer(n.id); });
  notes = []; zTop = 10;
  document.querySelectorAll('.note').forEach(e => e.remove());
  document.querySelectorAll('.stack-wrap').forEach(e => e.remove());
  syncCount();

  // NOW set active workspace
  _activeWs = { key, friend };

  const btn = document.getElementById('ws-toolbar-btn');
  if (btn) {
    btn.innerHTML = '';
    const wsBadge = document.createElement('span');
    wsBadge.className = 'ws-active-badge';
    wsBadge.textContent = '🗂️ Workspace com @' + friend;
    const leaveBadge = document.createElement('span');
    leaveBadge.className = 'ws-active-badge';
    leaveBadge.title = 'Sair / Encerrar workspace';
    leaveBadge.style.cssText = 'background:rgba(239,68,68,.1);border-color:rgba(239,68,68,.25);color:#fca5a5;margin-left:4px;cursor:pointer;';
    leaveBadge.textContent = '🚪';
    leaveBadge.addEventListener('click', () => showLeaveWsDialog1x1(key, friend));
    btn.appendChild(wsBadge);
    btn.appendChild(leaveBadge);
    btn.style.display = 'inline-flex';
  }
  loadSharedNotes(key);
  listenSharedNotes(key);
  toast('🗂️','Workspace com @'+friend+' ativado!');
  // Recarregar clientes do workspace compartilhado
  _crmReloadForWorkspace();
}

/* ═══════════════════════════════════════════════════════
   WORKSPACES PESSOAIS
   Múltiplos boards privados por usuário.
   Armazenados em users/{uid}/personalBoards/{wsId}/notes
   O board padrão usa users/{uid}/notes (retrocompatível)
═══════════════════════════════════════════════════════ */

// State
let _activePersonalWs = null; // null = default board, or { id, name }
let _pwPanelOpen = false;

// ── Firebase helpers for personal workspaces ──
function _pwPath(wsId) {
  return 'users/' + CU.uid + '/personalBoards/' + wsId + '/notes';
}
function _pwMetaPath() {
  return 'users/' + CU.uid + '/personalBoardsMeta';
}

// ── Load workspace list from Firebase ──
async function _pwLoadList() {
  if (!_fbReady || !CU?.uid) return [];
  try {
    const snap = await fbGet(_pwMetaPath());
    if (!snap) return [];
    return Object.values(snap).sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  } catch { return []; }
}

// ── Toggle panel ──
function togglePwPanel() {
  const panel = document.getElementById('pw-panel');
  _pwPanelOpen = !_pwPanelOpen;
  if (_pwPanelOpen) {
    renderPwPanel();
    panel.classList.add('open');
    setTimeout(() => document.addEventListener('click', _closePwOnOutside), 10);
  } else {
    panel.classList.remove('open');
    document.removeEventListener('click', _closePwOnOutside);
  }
}

function _closePwOnOutside(e) {
  const panel = document.getElementById('pw-panel');
  const pill  = document.getElementById('t-pill-ws');
  if (!panel?.contains(e.target) && !pill?.contains(e.target)) {
    panel?.classList.remove('open');
    _pwPanelOpen = false;
    document.removeEventListener('click', _closePwOnOutside);
  }
}

// ── Render panel ──
async function renderPwPanel() {
  const list    = document.getElementById('pw-list');
  const divider = document.getElementById('pw-action-divider');
  const actRow  = document.getElementById('pw-action-row');
  const curLbl  = document.getElementById('pw-current-label');
  if (!list) return;

  list.innerHTML = '<div style="font-size:.7rem;color:rgba(240,240,240,.25);padding:4px 10px;">carregando…</div>';

  const workspaces = await _pwLoadList();

  list.innerHTML = '';

  // ── Default board (always first) ──
  const defItem = document.createElement('div');
  defItem.className = 'pw-item' + (!_activePersonalWs ? ' active' : '');
  defItem.innerHTML = `
    <div class="pw-item-dot"></div>
    <div class="pw-item-name">🏠 Principal</div>`;
  defItem.addEventListener('click', () => _pwSwitchTo(null));
  list.appendChild(defItem);

  // ── Custom workspaces ──
  workspaces.forEach(ws => {
    const item = document.createElement('div');
    item.className = 'pw-item' + (_activePersonalWs?.id === ws.id ? ' active' : '');
    item.dataset.wsId = ws.id;

    const nameEl = document.createElement('div');
    nameEl.className = 'pw-item-name';
    nameEl.textContent = ws.name;

    const actions = document.createElement('div');
    actions.className = 'pw-item-actions';

    // Rename button
    const renBtn = document.createElement('button');
    renBtn.className = 'pw-item-btn';
    renBtn.title = 'Renomear';
    renBtn.innerHTML = '✏️';
    renBtn.addEventListener('click', e => {
      e.stopPropagation();
      _pwStartRename(item, ws, nameEl);
    });

    actions.appendChild(renBtn);
    item.appendChild(document.createElement('div').constructor === HTMLDivElement
      ? (() => { const d = document.createElement('div'); d.className='pw-item-dot'; return d; })()
      : document.createElement('div'));
    item.innerHTML = '';

    const dot = document.createElement('div');
    dot.className = 'pw-item-dot';
    item.appendChild(dot);
    item.appendChild(nameEl);
    item.appendChild(actions);

    item.addEventListener('click', () => _pwSwitchTo(ws));
    list.appendChild(item);
  });

  // Show/hide action row for active custom ws
  if (_activePersonalWs) {
    divider.style.display = '';
    actRow.style.display  = '';
    curLbl.textContent = _activePersonalWs.name;
  } else {
    divider.style.display = 'none';
    actRow.style.display  = 'none';
    curLbl.textContent = 'principal';
  }

  // Wire leave/delete buttons
  document.getElementById('pw-leave-btn').onclick = () => _pwLeave();
  document.getElementById('pw-delete-btn').onclick = () => _pwDelete();
}

// ── Start inline rename ──
function _pwStartRename(item, ws, nameEl) {
  const inp = document.createElement('input');
  inp.className = 'pw-item-rename';
  inp.value = ws.name;
  inp.maxLength = 30;
  nameEl.replaceWith(inp);
  inp.focus(); inp.select();

  const save = async () => {
    const newName = inp.value.trim() || ws.name;
    ws.name = newName;
    if (_activePersonalWs?.id === ws.id) {
      _activePersonalWs.name = newName;
      _pwUpdatePillLabel();
    }
    await fbSet(_pwMetaPath() + '/' + ws.id + '/name', newName).catch(() => {});
    const nameNew = document.createElement('div');
    nameNew.className = 'pw-item-name';
    nameNew.textContent = newName;
    inp.replaceWith(nameNew);
    renderPwPanel();
  };

  inp.addEventListener('blur', save);
  inp.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); save(); }
    if (e.key === 'Escape') { inp.value = ws.name; inp.blur(); }
  });
}

// ── Create new workspace ──
async function _pwCreate(name) {
  if (!name || !CU?.uid) return;
  const id = 'pw_' + Date.now();
  const meta = { id, name, createdAt: Date.now() };
  await fbSet(_pwMetaPath() + '/' + id, meta);
  toast('✓', 'Workspace "' + name + '" criado!');
  await _pwSwitchTo(meta);
}

// ── Switch to workspace ──
async function _pwSwitchTo(ws) {
  if (ws && _activePersonalWs?.id === ws.id) {
    // Already active — just close panel
    togglePwPanel();
    return;
  }
  if (!ws && !_activePersonalWs) {
    togglePwPanel();
    return;
  }

  // Save current board before switching
  clearTimeout(_saveNotesTmr);
  if (!_activeWs && !_activeGroupWs) {
    const arr = notes.map(n => _noteToRaw(n));
    if (_activePersonalWs) {
      // Save to custom ws path — inclui notas E registros CRM do workspace
      const obj = {};
      arr.forEach(n => { obj[n.id] = n; });
      // CRUCIAL: preservar registros CRM existentes no workspace
      // sem isso, se notes[] estiver vazio, fbSet(null) apaga os clientes
      if (typeof _records !== 'undefined') {
        _records.forEach(r => { obj[r.id] = r; });
      }
      // Só salva null se não há NADA (notas + clientes)
      const hasData = Object.keys(obj).length > 0;
      await fbSet(_pwPath(_activePersonalWs.id), hasData ? obj : null).catch(() => {});
    } else {
      saveNotesRaw(CU.username, arr);
    }
  }

  // Clear board
  closeAllViewers();
  notes.forEach(n => closeViewer(n.id));
  notes = []; zTop = 10;
  document.querySelectorAll('.note').forEach(e => e.remove());
  document.querySelectorAll('.stack-wrap').forEach(e => e.remove());

  _activePersonalWs = ws;
  _pwUpdatePillLabel();

  // Load new board
  let rawNotes = [];
  if (ws) {
    try {
      const snap = await fbGet(_pwPath(ws.id));
      rawNotes = snap ? Object.values(snap) : [];
    } catch { rawNotes = []; }
  } else {
    rawNotes = await loadNotesRaw(CU.username);
  }

  rawNotes.forEach(r => {
    if (r.type === 'client' || String(r.id || '').startsWith('crm_')) return; // skip CRM records
    const n = { id:r.id, color:r.color||'indigo', title:r.title||'', body:r.body||'',
      start:r.start||'', end:r.end||'', reminder:r.reminder||false, remDays:r.remDays||3,
      status:r.status||'todo', titleH:r.titleH||0, bodyH:r.bodyH||0,
      x:r.x||100, y:r.y||100, z:r.z||++zTop, files:r.files||[],
      stackId:r.stackId||null, stackOrder:r.stackOrder||0, pinned:r.pinned||false,
      _isClientNote: r._isClientNote || false,
      _crmRecordId:  r._crmRecordId  || null };
    if (n.z > zTop) zTop = n.z;
    notes.push(n); mountNote(n);
  });

  const stackIds = [...new Set(notes.filter(n => n.stackId).map(n => n.stackId))];
  setTimeout(() => stackIds.forEach(sid => renderStack(sid)), 0);
  syncCount();
  renderPwPanel();
  toast('📋', ws ? 'Workspace "' + ws.name + '"' : 'Workspace principal');
  // Recarregar clientes do workspace correto
  _crmReloadForWorkspace();
}

// ── Leave workspace (go back to default) ──
async function _pwLeave() {
  document.getElementById('pw-panel')?.classList.remove('open');
  _pwPanelOpen = false;
  document.removeEventListener('click', _closePwOnOutside);
  await _pwSwitchTo(null);
}

// ── Delete workspace ──
async function _pwDelete() {
  if (!_activePersonalWs) return;
  const ws = _activePersonalWs;

  document.querySelector('.pw-panel-confirm')?.remove();
  const confirmed = confirm(`Excluir o workspace "${ws.name}"? Todas as notas serão apagadas.`);
  if (!confirmed) return;

  // Delete notes + meta
  await fbRemove(_pwPath(ws.id)).catch(() => {});
  await fbRemove(_pwMetaPath() + '/' + ws.id).catch(() => {});

  toast('🗑', 'Workspace "' + ws.name + '" excluído.');

  document.getElementById('pw-panel')?.classList.remove('open');
  _pwPanelOpen = false;
  // Switch to default
  _activePersonalWs = null;
  _pwUpdatePillLabel();
  closeAllViewers();
  notes = []; zTop = 10;
  document.querySelectorAll('.note').forEach(e => e.remove());
  document.querySelectorAll('.stack-wrap').forEach(e => e.remove());
  const rawNotes = await loadNotesRaw(CU.username);
  rawNotes.forEach(r => {
    if (r.type === 'client' || String(r.id || '').startsWith('crm_')) return; // skip CRM records
    const n = { id:r.id, color:r.color||'indigo', title:r.title||'', body:r.body||'',
      start:r.start||'', end:r.end||'', reminder:r.reminder||false, remDays:r.remDays||3,
      status:r.status||'todo', titleH:r.titleH||0, bodyH:r.bodyH||0,
      x:r.x||100, y:r.y||100, z:r.z||++zTop, files:r.files||[],
      stackId:r.stackId||null, stackOrder:r.stackOrder||0, pinned:r.pinned||false,
      _isClientNote: r._isClientNote || false,
      _crmRecordId:  r._crmRecordId  || null };
    if (n.z > zTop) zTop = n.z;
    notes.push(n); mountNote(n);
  });
  const stackIds = [...new Set(notes.filter(n => n.stackId).map(n => n.stackId))];
  setTimeout(() => stackIds.forEach(sid => renderStack(sid)), 0);
  syncCount();
  // Recarregar clientes do board padrão
  _crmReloadForWorkspace();
}

// ── Update pill label ──
function _pwUpdatePillLabel() {
  const lbl  = document.getElementById('t-user-label');
  const dot  = document.getElementById('t-ws-dot');
  if (!lbl) return;
  if (_activePersonalWs) {
    lbl.textContent = _activePersonalWs.name;
    if (dot) dot.style.background = '#f59e0b';
  } else {
    lbl.textContent = CU ? (CU.role ? CU.name + ' · ' + CU.role : CU.name) : '';
    if (dot) dot.style.background = '';
  }
}

async function switchToPersonal() {
  if (_wsListener) { _wsListener.off(); _wsListener = null; }
  _activeWs = null;
  notes.forEach(n => closeViewer(n.id));
  notes = []; zTop = 10;
  document.querySelectorAll('.note').forEach(e => e.remove());
  document.querySelectorAll('.stack-wrap').forEach(e => e.remove());
  await _restorePersonalBoard();
}

async function loadSharedNotes(key) {
  // Individual workspace always starts empty — wipe any leftover notes
  if (_fbReady) await fbRemove('shared_boards/'+key+'/notes');
  syncCount();
}

function listenSharedNotes(key) {
  if (_wsListener) _wsListener.off();
  const r = _db.ref('shared_boards/'+key+'/notes');
  _wsListener = r;
  r.on('child_added', snap => {
    if (!_activeWs || _activeWs.key !== key) return; // guard
    const data = snap.val();
    if (!data || notes.find(n => n.id === data.id)) return;
    const n = { id:data.id, color:data.color||'indigo', title:data.title||'', body:data.body||'',
      start:data.start||'', end:data.end||'', reminder:false, remDays:3,
      status:data.status||'todo', titleH:data.titleH||0, bodyH:data.bodyH||0,
      x:data.x||100, y:data.y||120, z:data.z||++zTop, files:data.files||[],
      _isClientNote: data._isClientNote || false,
      _crmRecordId:  data._crmRecordId  || null };
    if (n.z > zTop) zTop = n.z;
    notes.push(n); mountNote(n); syncCount();
  });
  r.on('child_removed', snap => {
    const id = Number(snap.key) || snap.val()?.id;
    notes = notes.filter(n => n.id !== id);
    const el = document.querySelector('.note[data-id="'+id+'"]');
    if (el) el.remove(); syncCount();
  });
  r.on('child_changed', snap => {
    const data = snap.val();
    const n = notes.find(n => n.id === data.id); if (!n) return;
    const el = document.querySelector('.note[data-id="'+n.id+'"]'); if (!el) return;
    // Update remote changes (only non-focused textareas)
    const ta1 = el.querySelector('.n-title');
    const ta2 = el.querySelector('.n-text');
    if (ta1 && document.activeElement !== ta1 && data.title !== undefined) { n.title = data.title; ta1.value = data.title; }
    if (ta2 && document.activeElement !== ta2 && data.body  !== undefined) { n.body  = data.body;  ta2.value = data.body; }
    if (data.color) { n.color = data.color; }
    if (data.status) { n.status = data.status; applyNoteStatus(el, data.status); }
    if (data.files !== undefined) { n.files = data.files || []; renderFiles(n); }
  });
}

async function saveSharedNote(n) {
  if (!_activeWs || !_fbReady) return;
  await fbSet('shared_boards/'+_activeWs.key+'/notes/'+n.id, {
    id:n.id, color:n.color, title:n.title, body:n.body,
    start:n.start||'', end:n.end||'', status:n.status||'todo', checklist:n.checklist||[],
    titleH:n.titleH||0, bodyH:n.bodyH||0, x:n.x, y:n.y, z:n.z,
    files:(n.files||[]).map(f=>({name:f.name,size:f.size,type:f.type,dataUrl:f.dataUrl})),
    _isClientNote: n._isClientNote || false,
    _crmRecordId:  n._crmRecordId  || null
  });
}

async function removeSharedNote(id) {
  if (!_activeWs || !_fbReady) return;
  await fbRemove('shared_boards/'+_activeWs.key+'/notes/'+id);
}

// Terminate workspace permanently — deletes all notes and workspace data
function showLeaveWsDialog1x1(key, friend) {
  return new Promise(resolve => {
    document.querySelector('.leave-ws-pop')?.remove();
    const pop = document.createElement('div');
    pop.className = 'confirm-clear-pop leave-ws-pop';
    pop.innerHTML = `
      <div class="confirm-clear-card">
        <div class="confirm-clear-icon">🚪</div>
        <div class="confirm-clear-title">Sair do workspace</div>
        <div class="confirm-clear-desc">
          Você pode sair temporariamente — o workspace continua ativo para @${xe(friend)} — ou encerrá-lo permanentemente para ambos.
        </div>
        <div class="confirm-clear-btns" style="flex-direction:column;gap:8px;">
          <button class="confirm-clear-ok" id="lwb-leave" style="background:rgba(99,102,241,.15);border-color:rgba(99,102,241,.35);color:#a5b4fc;">
            Sair temporariamente
          </button>
          <button class="confirm-clear-ok" id="lwb-terminate">Encerrar para ambos</button>
          <button class="confirm-clear-cancel" id="lwb-cancel">Cancelar</button>
        </div>
      </div>`;
    document.body.appendChild(pop);
    requestAnimationFrame(() => pop.classList.add('visible'));

    const close = async (result) => {
      pop.classList.remove('visible');
      setTimeout(() => pop.remove(), 200);
      if (result === 'leave') {
        // Sair temporariamente — workspace continua no Firebase
        if (_wsListener) { _wsListener.off(); _wsListener = null; }
        _activeWs = null;
        notes.forEach(n => closeViewer(n.id));
        notes = []; zTop = 10;
        document.querySelectorAll('.note').forEach(e => e.remove());
        document.querySelectorAll('.stack-wrap').forEach(e => e.remove());
        await _restorePersonalBoard();
        toast('📋', 'Voltou ao workspace pessoal. O workspace com @' + friend + ' continua ativo.');
      } else if (result === 'terminate') {
        // Encerrar para ambos — apaga Firebase e notifica
        if (!_fbReady) return;
        await fbPush('inbox/' + friend, { type: 'ws_terminated', from: CU.username, key, ts: Date.now() });
        await fbRemove('shared_boards/' + key);
        if (_wsListener) { _wsListener.off(); _wsListener = null; }
        _activeWs = null;
        notes.forEach(n => closeViewer(n.id));
        notes = []; zTop = 10;
        document.querySelectorAll('.note').forEach(e => e.remove());
        document.querySelectorAll('.stack-wrap').forEach(e => e.remove());
        await _restorePersonalBoard();
        toast('🗑', 'Workspace encerrado definitivamente.');
      }
      resolve(result);
    };

    pop.querySelector('#lwb-leave').addEventListener('click', () => close('leave'));
    pop.querySelector('#lwb-terminate').addEventListener('click', () => close('terminate'));
    pop.querySelector('#lwb-cancel').addEventListener('click', () => close('cancel'));
    pop.addEventListener('click', e => { if (e.target === pop) close('cancel'); });
  });
}

async function terminateWorkspace(key, friend) {
  // Legacy — now handled by showLeaveWsDialog1x1
  showLeaveWsDialog1x1(key, friend);
}

/* ═══════════════════════════════════════════════════════════════
   CRM MODULE — Controle de Clientes + Financeiro
   MyDesk SaaS Extension v1.2 (bugfix)

   Firebase path usa mesmo namespace /notes já autorizado pelas Rules.
   Registros CRM: type=client, id starts with crm_

   LIMITE UNIFICADO: PLAN_FREE_LIMIT (30) compartilhado notas + clientes.
   Workspace isolation: cada workspace tem seus próprios clientes.
═══════════════════════════════════════════════════════════════ */

// ── Estado global do CRM ──
let _crmMode     = false;
let _records     = [];
let _recRef      = null;
let _recOffFn    = null;

// ── Limite único ── (mesmo que PLAN_FREE_LIMIT definido acima)
const RECORD_LIMIT_FREE = 30;

/* ─────────────────────────────────────────────
   LIMITE UNIFICADO — notas + clientes juntos
   Retorna { ok, used, limit, reason }
───────────────────────────────────────────── */
function _crmCanCreate() {
  // Premium não tem limite
  if (typeof isPremium === 'function' && isPremium()) return { ok: true };
  // Conta notas pessoais (não-CRM) + registros CRM do contexto atual
  const noteCount   = Array.isArray(notes) ? notes.filter(n => !n._isClientNote).length : 0;
  const clientCount = _records.length;
  const used  = noteCount + clientCount;
  const limit = RECORD_LIMIT_FREE; // == PLAN_FREE_LIMIT
  if (used >= limit) return { ok: false, used, limit };
  return { ok: true, used, limit };
}

/* ─────────────────────────────────────────────
   TOGGLE DE VISUALIZAÇÃO
───────────────────────────────────────────── */
function toggleCRMView() {
  // CRM is a Premium feature
  if (!isPremium()) {
    showPremiumModal();
    toast('⭐', 'CRM Financeiro é exclusivo do plano Premium.');
    return;
  }
  _crmMode = !_crmMode;
  const btn     = document.getElementById('btn-crm-view');
  const label   = document.getElementById('crm-view-label');
  const board   = document.getElementById('board');
  const crmBrd  = document.getElementById('crm-board');
  const crmDash = document.getElementById('crm-dashboard');
  const crmChts = document.getElementById('crm-charts-row');

  if (_crmMode) {
    btn.classList.add('active');
    label.textContent = 'Notas';
    board.style.display = 'none';
    crmBrd.classList.add('visible');
    crmDash.classList.add('visible');
    if (crmChts) crmChts.classList.add('visible');
    // Update toolbar title with workspace context
    _updateCRMBoardTitle();
    loadRecords();
  } else {
    btn.classList.remove('active');
    label.textContent = 'Clientes';
    board.style.display = (_activeWs || _activeGroupWs) ? 'flex' : 'block';
    crmBrd.classList.remove('visible');
    crmDash.classList.remove('visible');
    if (crmChts) crmChts.classList.remove('visible');
    _crmDetachListener();
  }
}

/* Atualiza o título da toolbar da tabela com nome do workspace atual */
function _updateCRMBoardTitle() {
  const titleEl = document.querySelector('.crm-table-toolbar > span:first-child');
  if (!titleEl) return;
  let wsName = '';
  if (typeof _activeGroupWs !== 'undefined' && _activeGroupWs) {
    wsName = ' · ' + (_activeGroupWs.groupName || 'Grupo');
  } else if (typeof _activeWs !== 'undefined' && _activeWs) {
    wsName = ' · @' + (_activeWs.friend || 'Compartilhado');
  } else if (typeof _activePersonalWs !== 'undefined' && _activePersonalWs && _activePersonalWs.name) {
    wsName = ' · ' + _activePersonalWs.name;
  }
  titleEl.textContent = 'Clientes' + wsName;
}

/* ─────────────────────────────────────────────
   FIREBASE — helpers internos
   Workspace isolation: cada workspace tem seu próprio
   namespace de clientes completamente separado.
   Usa o mesmo path /notes já autorizado pelas Rules,
   mas com prefixo crm_ nos IDs + type=client para filtrar.
───────────────────────────────────────────── */
function _crmDB() {
  return window._fbDB;
}

function _recBasePath() {
  // Workspace 1-a-1 ativo → clientes ficam em shared_boards/{key}/notes (filtrados por crm_)
  if (typeof _activeWs !== 'undefined' && _activeWs && _activeWs.key) {
    return 'shared_boards/' + _activeWs.key + '/notes';
  }
  // Workspace de grupo ativo → clientes ficam em group_boards/{groupId}/notes
  if (typeof _activeGroupWs !== 'undefined' && _activeGroupWs && _activeGroupWs.groupId) {
    return 'group_boards/' + _activeGroupWs.groupId + '/notes';
  }
  // Workspace pessoal nomeado ativo → usa o mesmo path que _pwPath()
  if (typeof _activePersonalWs !== 'undefined' && _activePersonalWs && _activePersonalWs.id) {
    if (CU && CU.uid) {
      return 'users/' + CU.uid + '/personalBoards/' + _activePersonalWs.id + '/notes';
    }
  }
  // Board pessoal padrão
  const uid = (CU && CU.uid) ? CU.uid : (CU && CU.username ? CU.username : 'anon');
  return 'users/' + uid + '/notes';
}

function _crmSet(path, val) {
  return _crmDB().ref(path).set(val);
}

function _crmRemove(path) {
  return _crmDB().ref(path).remove();
}

function _crmDetachListener() {
  if (_recRef && _recOffFn) {
    _recRef.off('value', _recOffFn);
  }
  _recRef = null;
  _recOffFn = null;
}

/* ─────────────────────────────────────────────
   LOAD RECORDS (listener em tempo real)
───────────────────────────────────────────── */
function loadRecords() {
  const db = _crmDB();
  if (!db || !CU) {
    _records = [];
    renderRecordsTable();
    updateCRMDashboard();
    return;
  }

  _crmDetachListener();

  const path = _recBasePath();
  _recRef = db.ref(path);

  _recOffFn = _recRef.on('value', snap => {
    _records = [];
    if (snap && snap.exists()) {
      snap.forEach(child => {
        const r = child.val();
        // Filtra APENAS registros CRM — identificados por type ou prefixo do id
        if (r && r.id && (r.type === 'client' || String(r.id).startsWith('crm_'))) {
          _records.push(r);
        }
      });
      _records.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    }
    renderRecordsTable();
    updateCRMDashboard();
    // Re-montar blocos de valor/status em notas de cliente no board
    // (necessário porque _records pode chegar após as notas já estarem montadas)
    _remountAllClientNoteExtras();
  }, err => {
    console.error('[CRM] loadRecords error:', err);
    toast('⚠', 'Erro ao carregar: ' + (err.message || err.code || 'permissão negada'));
    _records = [];
    renderRecordsTable();
    updateCRMDashboard();
  });
}

/* ─────────────────────────────────────────────
   CRIAR REGISTRO
───────────────────────────────────────────── */
async function createRecord(data) {
  if (!CU) { toast('⚠', 'Faça login primeiro.'); return null; }

  // Verificar limite unificado ANTES de qualquer operação
  const check = _crmCanCreate();
  if (!check.ok) {
    toast('🔒', 'Limite de ' + check.limit + ' itens atingido. Faça upgrade!');
    if (typeof showPremiumModal === 'function') showPremiumModal();
    return null;  // Retorna null = NÃO cria nada
  }

  const id  = 'crm_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
  const now = Date.now();
  const rec = {
    id,
    type:         'client',
    name:         (data.name         || 'Sem nome').trim(),
    description:  (data.description  || '').trim(),
    value:        Number(data.value)  || 0,
    status:       data.status         || 'pending',
    dueDate:      data.dueDate        || '',
    cpf:          (data.cpf           || '').trim(),
    documents:    data.documents      || [],
    createdAt:    now,
    updatedAt:    now,
    color:        data.color          || 'indigo',
    sourceNoteId: data.sourceNoteId   || null
  };

  const db = _crmDB();
  if (!db) {
    // Modo demo
    _records.unshift(rec);
    renderRecordsTable();
    updateCRMDashboard();
    toast('✅', 'Cliente adicionado! (modo demo)');
    return rec;
  }

  try {
    await _crmSet(_recBasePath() + '/' + id, rec);
    toast('✅', 'Cliente adicionado!');
    return rec;
  } catch(e) {
    console.error('[CRM] createRecord error:', e);
    const msg = e.code === 'PERMISSION_DENIED'
      ? 'Permissão negada. Verifique as regras do Firebase.'
      : (e.message || 'Erro desconhecido');
    toast('❌', 'Erro ao salvar: ' + msg);
    return null;
  }
}

/* ─────────────────────────────────────────────
   ATUALIZAR REGISTRO
───────────────────────────────────────────── */
async function updateRecord(id, changes) {
  if (!CU) return;
  const rec = _records.find(r => r.id === id);
  if (!rec) return;
  const updated = Object.assign({}, rec, changes, { updatedAt: Date.now() });

  const db = _crmDB();
  if (!db) {
    // Modo demo — atualiza em memória
    const idx = _records.findIndex(r => r.id === id);
    if (idx !== -1) _records[idx] = updated;
    renderRecordsTable();
    updateCRMDashboard();
    return;
  }

  try {
    await _crmSet(_recBasePath() + '/' + id, updated);
  } catch(e) {
    console.error('[CRM] updateRecord error:', e);
    toast('❌', 'Erro ao atualizar: ' + (e.message || e.code || ''));
  }
}

/* ─────────────────────────────────────────────
   DELETAR REGISTRO
───────────────────────────────────────────── */
async function deleteRecord(id) {
  if (!CU) return;

  const db = _crmDB();
  if (!db) {
    // Modo demo
    _records = _records.filter(r => r.id !== id);
    renderRecordsTable();
    updateCRMDashboard();
    toast('🗑', 'Registro removido.');
    return;
  }

  try {
    await _crmRemove(_recBasePath() + '/' + id);
    toast('🗑', 'Registro removido.');
  } catch(e) {
    console.error('[CRM] deleteRecord error:', e);
    toast('❌', 'Erro ao remover: ' + (e.message || e.code || ''));
  }
}

/* ─────────────────────────────────────────────
   CONVERTER NOTA → REGISTRO CRM
───────────────────────────────────────────── */
async function convertNoteToRecord(noteId) {
  const n = notes.find(n => n.id === noteId);
  if (!n) return;

  // Checar se já convertida
  if (n._crmRecordId) {
    toast('ℹ️', 'Esta nota já foi convertida.');
    return;
  }

  const rec = await createRecord({
    name:        n.title || 'Sem nome',
    description: n.body  || '',
    value:       0,
    status:      'pending',
    dueDate:     n.end   || '',
    color:       n.color || 'indigo',
    sourceNoteId: noteId
  });

  if (rec) {
    // Marcar a nota como convertida
    n._crmRecordId = rec.id;
    // Atualizar o botão na nota
    const el  = document.querySelector('.note[data-id="' + noteId + '"]');
    const btn = el?.querySelector('.n-convert-btn');
    if (btn) {
      btn.classList.add('converted');
      btn.textContent = '✓ Em Clientes';
      btn.onclick = null;
    }
    // Adicionar chip CRM na nota
    const chipRow = el?.querySelector('.n-chip-row');
    if (chipRow && !chipRow.querySelector('.n-crm-chip')) {
      const chip = document.createElement('span');
      chip.className = 'n-crm-chip';
      chip.textContent = '💼 CRM';
      chipRow.appendChild(chip);
    }
    toast('💼', 'Nota convertida em registro de cliente!');
  }
}

/* ─────────────────────────────────────────────
   TOGGLE STATUS DO REGISTRO
───────────────────────────────────────────── */
async function toggleRecordStatus(id) {
  const rec = _records.find(r => r.id === id);
  if (!rec) return;
  const newStatus = rec.status === 'paid' ? 'pending' : 'paid';
  await updateRecord(id, { status: newStatus });
}

/* ─────────────────────────────────────────────
   CÁLCULO DE STATUS (overdue detection)
───────────────────────────────────────────── */
function isOverdue(rec) {
  if (rec.status === 'paid') return false;
  if (!rec.dueDate) return false;
  const due = new Date(rec.dueDate + 'T23:59:59');
  return due < new Date();
}

function getRecordDisplayStatus(rec) {
  if (rec.status === 'paid') return 'paid';
  if (isOverdue(rec)) return 'overdue';
  return 'pending';
}

/* ─────────────────────────────────────────────
   FORMATAÇÃO DE MOEDA
───────────────────────────────────────────── */
function fmtBRL(val) {
  const n = Number(val) || 0;
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/* ─────────────────────────────────────────────
   DASHBOARD — Cálculos automáticos
───────────────────────────────────────────── */
/* ─────────────────────────────────────────────
   RE-MONTAR todos os blocos de notas de cliente
   Chamado sempre que _records é atualizado.
   Garante que mesmo notas carregadas antes dos
   registros CRM chegarem do Firebase fiquem OK.
───────────────────────────────────────────── */
/* ─────────────────────────────────────────────
   _crmReloadForWorkspace
   Chamado sempre que o workspace ativo muda.
   Reconecta o listener CRM ao path correto,
   limpa os registros do workspace anterior,
   e atualiza o label da aba Clientes.
───────────────────────────────────────────── */
function _crmReloadForWorkspace() {
  // Limpar registros do workspace anterior
  _records = [];

  // Se a aba clientes estava aberta, fechar e reabrir no novo workspace
  if (_crmMode) {
    // Mantém visível mas reconecta ao path correto
    _crmDetachListener();
    loadRecords();
  } else {
    // Recarregar silenciosamente para popular os blocos nas notas de cliente
    _crmDetachListener();
    loadRecords();
  }

  // Atualizar o label da aba clientes com contexto do workspace
  _updateCRMViewLabel();

  // Limpar blocos de notas de cliente desatualizados
  document.querySelectorAll('.n-client-block').forEach(b => b.remove());
  document.querySelectorAll('.note.is-client-note').forEach(el => {
    // Será remontado pelo _remountAllClientNoteExtras quando records chegarem
    el.classList.remove('is-client-note');
  });
  // Re-aplicar classe e remount após _records carregar (feito pelo listener)
}

/* Atualiza o label do botão Clientes com contexto do workspace atual */
function _updateCRMViewLabel() {
  const label = document.getElementById('crm-view-label');
  if (!label) return;
  if (_crmMode) {
    label.textContent = 'Notas';
    return;
  }
  // Mostra contexto do workspace ativo
  if (typeof _activeWs !== 'undefined' && _activeWs) {
    label.textContent = 'Clientes';
  } else if (typeof _activeGroupWs !== 'undefined' && _activeGroupWs) {
    label.textContent = 'Clientes';
  } else if (typeof _activePersonalWs !== 'undefined' && _activePersonalWs && _activePersonalWs.name) {
    label.textContent = 'Clientes';
  } else {
    label.textContent = 'Clientes';
  }
}

function _remountAllClientNoteExtras() {
  if (!Array.isArray(notes)) return;
  notes.forEach(n => {
    if (!n._isClientNote || !n._crmRecordId) return;
    const el = document.querySelector('.note[data-id="' + n.id + '"]');
    if (!el) return;

    // Adicionar classe de largura
    el.classList.add('is-client-note');

    // Se o bloco já existe, só atualiza o conteúdo
    const existing = el.querySelector('.n-client-block');
    if (existing) {
      updateClientNoteBlock(n._crmRecordId);
      return;
    }

    // Bloco ainda não existe — montar agora que _records já tem dados
    mountClientNoteExtras(el, n.id);
  });
}

function updateCRMDashboard() {
  let totalAll     = 0;
  let totalPaid    = 0;
  let totalPending = 0;
  let totalOverdue = 0;
  let overdueCount = 0;

  _records.forEach(r => {
    const v = Number(r.value) || 0;
    totalAll += v;
    if (r.status === 'paid') {
      totalPaid += v;
    } else if (isOverdue(r)) {
      totalOverdue += v;
      overdueCount++;
    } else {
      totalPending += v;
    }
  });

  const el = id => document.getElementById(id);
  if (el('crm-total-all'))     el('crm-total-all').textContent     = fmtBRL(totalAll);
  if (el('crm-total-paid'))    el('crm-total-paid').textContent    = fmtBRL(totalPaid);
  if (el('crm-total-pending')) el('crm-total-pending').textContent = fmtBRL(totalPending + totalOverdue);
  if (el('crm-total-overdue')) el('crm-total-overdue').textContent = overdueCount;

  renderCRMCharts({ paid: totalPaid, pending: totalPending, overdue: totalOverdue });
}

/* ─────────────────────────────────────────────
   GRÁFICOS DO CRM (SVG gerado à mão — sem libs
   externas, respeita a CSP do projeto)
───────────────────────────────────────────── */
function renderCRMCharts(totals) {
  _renderCRMDonut(totals);
  _renderCRMMonthlyBars();
}

function _renderCRMDonut(totals) {
  const host = document.getElementById('crm-chart-donut');
  if (!host) return;
  const { paid = 0, pending = 0, overdue = 0 } = totals;
  const sum = paid + pending + overdue;

  if (!sum) {
    host.innerHTML = '<div class="crm-chart-empty">Sem dados ainda</div>';
    return;
  }

  const R = 46, C = 2 * Math.PI * R;
  const segs = [
    { v: paid,    color: '#10b981' },
    { v: pending, color: '#f59e0b' },
    { v: overdue, color: '#ef4444' },
  ];
  let offset = 0;
  const arcs = segs.map(s => {
    const frac = s.v / sum;
    const len  = frac * C;
    const rot  = (offset / sum) * 360;
    offset += s.v;
    // Começa com dasharray "0 C" (invisível) — a animação de desenho vem
    // depois, quando trocamos pro valor real num próximo frame.
    return `<circle cx="60" cy="60" r="${R}" fill="none" stroke="${s.color}" stroke-width="14"
              data-target="${len} ${C - len}" stroke-dasharray="0 ${C}" stroke-dashoffset="0"
              transform="rotate(${rot - 90} 60 60)" stroke-linecap="butt"/>`;
  }).join('');

  host.innerHTML = `
    <div class="crm-donut-visual">
      <svg width="120" height="120" viewBox="0 0 120 120" class="crm-donut-svg">${arcs}</svg>
      <div class="crm-donut-center"><b>${fmtBRL(sum)}</b><span>Total</span></div>
    </div>
    <div class="crm-donut-legend">
      <div class="crm-donut-leg-item"><span class="dot" style="background:#10b981"></span>Recebido <b>${fmtBRL(paid)}</b></div>
      <div class="crm-donut-leg-item"><span class="dot" style="background:#f59e0b"></span>Pendente <b>${fmtBRL(pending)}</b></div>
      <div class="crm-donut-leg-item"><span class="dot" style="background:#ef4444"></span>Atrasado <b>${fmtBRL(overdue)}</b></div>
    </div>`;

  requestAnimationFrame(() => {
    host.querySelectorAll('circle[data-target]').forEach(c => {
      c.setAttribute('stroke-dasharray', c.dataset.target);
    });
  });
}

function _renderCRMMonthlyBars() {
  const host = document.getElementById('crm-chart-bars');
  if (!host) return;
  if (!_records.length) { host.innerHTML = '<div class="crm-chart-empty">Sem dados ainda</div>'; return; }

  // Agrupa por mês (AAAA-MM) de vencimento — últimos 6 meses até 2 meses à frente
  const now = new Date();
  const curKey = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
  const months = [];
  for (let i = 5; i >= -2; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'),
                  label: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '') });
  }
  const totalsByMonth = Object.fromEntries(months.map(m => [m.key, 0]));
  _records.forEach(r => {
    if (!r.dueDate) return;
    const key = r.dueDate.slice(0, 7);
    if (key in totalsByMonth) totalsByMonth[key] += Number(r.value) || 0;
  });

  const max = Math.max(1, ...Object.values(totalsByMonth));
  const bars = months.map(m => {
    const v       = totalsByMonth[m.key];
    const h       = Math.max(Math.round((v / max) * 64), 2);
    const isCur   = m.key === curKey;
    return `<div class="crm-bar-col">
        <div class="crm-bar-tooltip">${fmtBRL(v)}</div>
        <div class="crm-bar ${isCur ? 'crm-bar-current' : ''}" data-target-h="${h}" style="height:0px"></div>
        <span class="crm-bar-lbl ${isCur ? 'crm-bar-lbl-current' : ''}">${m.label}</span>
      </div>`;
  }).join('');

  host.innerHTML = `<div class="crm-bars-wrap">${bars}</div>`;

  requestAnimationFrame(() => {
    host.querySelectorAll('.crm-bar[data-target-h]').forEach(b => {
      b.style.height = b.dataset.targetH + 'px';
    });
  });
}

/* ─────────────────────────────────────────────
   RENDER TABLE
───────────────────────────────────────────── */
/* ── Busca + ordenação da tabela de clientes ── */
let _crmSearchQuery = '';
let _crmSortKey      = null; // 'name' | 'value' | 'status' | 'dueDate'
let _crmSortDir      = 1;    // 1 asc, -1 desc

function crmFilterInput(q) {
  _crmSearchQuery = (q || '').trim().toLowerCase();
  renderRecordsTable();
}

function crmSortBy(key) {
  if (_crmSortKey === key) { _crmSortDir *= -1; } else { _crmSortKey = key; _crmSortDir = 1; }
  renderRecordsTable();
}

function _crmSortValue(rec, key) {
  if (key === 'name')    return (rec.name || '').toLowerCase();
  if (key === 'value')   return Number(rec.value) || 0;
  if (key === 'status')  return getRecordDisplayStatus(rec);
  if (key === 'dueDate') return rec.dueDate || '';
  return '';
}

function _crmVisibleRecords() {
  let list = _records;
  if (_crmSearchQuery) {
    list = list.filter(r => (r.name || '').toLowerCase().includes(_crmSearchQuery) ||
                             (r.description || '').toLowerCase().includes(_crmSearchQuery));
  }
  if (_crmSortKey) {
    list = [...list].sort((a, b) => {
      const av = _crmSortValue(a, _crmSortKey), bv = _crmSortValue(b, _crmSortKey);
      if (av < bv) return -1 * _crmSortDir;
      if (av > bv) return  1 * _crmSortDir;
      return 0;
    });
  }
  return list;
}

// Formata enquanto digita: CPF (000.000.000-00) ou CNPJ (00.000.000/0000-00)
function _formatCpfCnpj(v) {
  const d = (v || '').replace(/\D/g, '').slice(0, 14);
  if (d.length <= 11) {
    return d.replace(/(\d{3})(\d)/, '$1.$2')
             .replace(/(\d{3})(\d)/, '$1.$2')
             .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  return d.replace(/(\d{2})(\d)/, '$1.$2')
           .replace(/(\d{3})(\d)/, '$1.$2')
           .replace(/(\d{3})(\d)/, '$1/$2')
           .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

function _crmFmtDate(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split('-');
  const months = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  return `${d} ${months[Number(m) - 1]} ${y}`;
}

/* ─────────────────────────────────────────────
   EXPORTAR CARD DO CLIENTE (Word)
   Gera um .rtf — formato de texto que o Word abre
   nativamente, sem depender de nenhuma lib externa.
───────────────────────────────────────────── */
function _rtfEscape(str) {
  return String(str || '').split('').map(ch => {
    if (ch === '\\' || ch === '{' || ch === '}') return '\\' + ch;
    if (ch === '\n') return '\\par ';
    const code = ch.charCodeAt(0);
    return code > 127 ? '\\u' + code + '?' : ch;
  }).join('');
}

function exportClientCard(id) {
  const rec = _records.find(r => r.id === id);
  if (!rec) return;

  const ds         = getRecordDisplayStatus(rec);
  const statusText = { paid: 'Pago', pending: 'Pendente', overdue: 'Atrasado' }[ds];
  const dueText    = _crmFmtDate(rec.dueDate) || 'Sem data definida';
  const esc        = _rtfEscape;

  const docCount = (rec.documents || []).length;

  const rtf = '{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 Calibri;}}\\f0\n' +
    '{\\fs40\\b\\cf0 MyDesk \\u8212? Ficha de Cliente\\b0\\fs22\\par}\\par\n' +
    `{\\b Cliente:\\b0  ${esc(rec.name)}\\par}\n` +
    (rec.description ? `{\\b Descri\\u231?\\u227?o:\\b0  ${esc(rec.description)}\\par}\n` : '') +
    (rec.cpf ? `{\\b CPF/CNPJ:\\b0  ${esc(rec.cpf)}\\par}\n` : '') +
    `{\\b Valor:\\b0  ${esc(fmtBRL(rec.value))}\\par}\n` +
    `{\\b Status:\\b0  ${esc(statusText)}\\par}\n` +
    `{\\b Vencimento:\\b0  ${esc(dueText)}\\par}\n` +
    (docCount ? `{\\b Documentos anexados:\\b0  ${docCount}\\par}\n` : '') +
    '\\par\n' +
    `{\\fs16\\i Exportado do MyDesk em ${esc(new Date().toLocaleDateString('pt-BR'))}\\i0\\par}\n` +
    '}';

  const blob = new Blob([rtf], { type: 'application/rtf' });
  const url  = URL.createObjectURL(blob);
  const safeName = (rec.name || 'cliente').replace(/[^\p{L}\p{N}\s-]/gu, '').trim() || 'cliente';
  const a = document.createElement('a');
  a.href = url;
  a.download = `Cliente - ${safeName}.rtf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  toast('📄', 'Ficha exportada! Abre com o Word.');
}

/* ─────────────────────────────────────────────
   VISUALIZAR DOCUMENTO DO CLIENTE
   Reaproveita o PDF.js self-hospedado (_ensurePdfJs)
───────────────────────────────────────────── */
function viewDocumentFile(doc) {
  if (!doc) return;
  document.querySelector('.crm-doc-viewer-bg')?.remove();

  const isPdf   = doc.type === 'application/pdf';
  const isImage = (doc.type || '').startsWith('image/');

  const bg = document.createElement('div');
  bg.className = 'crm-doc-viewer-bg';
  bg.innerHTML = `
    <div class="crm-doc-viewer">
      <div class="crm-doc-viewer-head">
        <span class="crm-doc-viewer-name" title="${xe(doc.name)}">${xe(doc.name)}</span>
        <a href="${sanitizeAttr(doc.dataUrl || '')}" download="${sanitizeAttr(doc.name || 'documento')}" class="crm-doc-viewer-dl" title="Baixar">↓</a>
        <button class="crm-doc-viewer-close" id="cdv-close">${iX}</button>
      </div>
      <div class="crm-doc-viewer-body" id="cdv-body"></div>
    </div>`;
  document.body.appendChild(bg);
  bg.querySelector('#cdv-close').addEventListener('click', () => bg.remove());
  bg.addEventListener('click', e => { if (e.target === bg) bg.remove(); });

  const body = bg.querySelector('#cdv-body');

  if (isImage) {
    const img = document.createElement('img');
    img.src = doc.dataUrl;
    img.alt = doc.name;
    img.style.cssText = 'max-width:100%;max-height:100%;object-fit:contain;border-radius:6px;';
    body.appendChild(img);

  } else if (isPdf) {
    body.innerHTML = '<div class="crm-doc-viewer-loading"><span>⏳</span> Carregando PDF…</div>';
    _ensurePdfJs().then(pdfjsLib => {
      const b64   = doc.dataUrl.split(',')[1];
      const raw   = atob(b64);
      const bytes = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
      return pdfjsLib.getDocument({ data: bytes }).promise;
    }).then(pdf => {
      body.innerHTML = '';
      body.classList.add('crm-doc-viewer-body-pdf');
      const renderPage = (pageNum) => {
        pdf.getPage(pageNum).then(page => {
          const dpr       = window.devicePixelRatio || 1;
          const bodyWidth = body.clientWidth - 28;
          const baseVP    = page.getViewport({ scale: 1 });
          const scale     = (bodyWidth / baseVP.width) * dpr;
          const viewport  = page.getViewport({ scale });
          const canvas = document.createElement('canvas');
          canvas.width  = viewport.width;
          canvas.height = viewport.height;
          canvas.style.cssText = 'display:block;width:'+Math.round(viewport.width/dpr)+'px;height:'+Math.round(viewport.height/dpr)+'px;border-radius:6px;box-shadow:0 3px 14px rgba(0,0,0,.5);background:#fff;flex-shrink:0;';
          body.appendChild(canvas);
          page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise.then(() => {
            if (pageNum < pdf.numPages) renderPage(pageNum + 1);
          });
        });
      };
      renderPage(1);
    }).catch(err => {
      console.error('Erro ao renderizar PDF:', err);
      body.innerHTML = '<div class="crm-doc-viewer-loading">Não foi possível carregar o PDF.<br><a href="'+doc.dataUrl+'" download="'+xe(doc.name)+'">↓ Baixar arquivo</a></div>';
    });

  } else {
    body.innerHTML = '<div class="crm-doc-viewer-loading">Pré-visualização não disponível para este tipo de arquivo.<br><a href="'+doc.dataUrl+'" download="'+xe(doc.name)+'">↓ Baixar arquivo</a></div>';
  }
}

function renderRecordsTable() {
  const tbody  = document.getElementById('crm-table-body');
  const empty  = document.getElementById('crm-empty-state');
  const badge  = document.getElementById('crm-count-badge');
  if (!tbody) return;

  // Marca a seta de ordenação ativa no cabeçalho
  document.querySelectorAll('.crm-th-sort').forEach(th => {
    th.classList.toggle('sorted', th.dataset.sort === _crmSortKey);
    th.classList.toggle('desc', th.dataset.sort === _crmSortKey && _crmSortDir === -1);
  });

  if (badge) badge.textContent = _records.length ? _records.length + ' registro' + (_records.length !== 1 ? 's' : '') : '';

  tbody.innerHTML = '';

  if (_records.length === 0) {
    if (empty) empty.style.display = 'flex';
    return;
  }
  if (empty) empty.style.display = 'none';

  const visible = _crmVisibleRecords();

  if (visible.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="5" style="text-align:center;padding:24px;color:rgba(240,240,240,.3);font-size:.8rem;">Nenhum cliente encontrado para "${xe(_crmSearchQuery)}"</td>`;
    tbody.appendChild(tr);
    return;
  }

  visible.forEach((rec, i) => {
    // Sync client note blocks on board (se existirem)
    updateClientNoteBlock(rec.id);

    const ds      = getRecordDisplayStatus(rec);
    const over    = ds === 'overdue';
    const initial = (rec.name || '?')[0].toUpperCase();
    const pal     = PAL[rec.color] || PAL.indigo;
    const dueFmt  = _crmFmtDate(rec.dueDate);

    const statusLabel = {
      paid:    '✓ Pago',
      pending: '⏳ Pendente',
      overdue: '⚠ Atrasado'
    }[ds];

    const tr = document.createElement('tr');
    if (over) tr.classList.add('overdue-row');
    tr.classList.add('crm-row-in');
    tr.style.animationDelay = Math.min(i, 12) * 25 + 'ms';
    tr.dataset.id = rec.id;

    tr.innerHTML = `
      <td>
        <div class="crm-name-cell">
          <div class="crm-avatar" style="background:linear-gradient(135deg,${pal.bar},${pal.dot});">${xe(initial)}</div>
          <div>
            <div class="crm-client-name">${xe(rec.name)}${(rec.documents||[]).length ? ` <span class="crm-doc-count" title="Ver documentos" onclick="event.stopPropagation();openEditRecordModal('${rec.id}')">📎${(rec.documents||[]).length}</span>` : ''}</div>
            ${rec.description ? `<div class="crm-client-desc">${xe(rec.description.slice(0,50))}${rec.description.length>50?'…':''}</div>` : ''}
          </div>
        </div>
      </td>
      <td>
        <span class="crm-value-cell" id="crm-val-${rec.id}" style="cursor:pointer;" title="Clique para editar">
          ${fmtBRL(rec.value)}
        </span>
      </td>
      <td>
        <span class="crm-status-pill ${ds}" onclick="toggleRecordStatus('${rec.id}')">
          <span class="crm-status-dot"></span>${statusLabel}
        </span>
      </td>
      <td>
        <span class="crm-date-cell ${over ? 'crm-date-overdue' : ''}" id="crm-date-${rec.id}" title="Clique para editar">
          ${dueFmt ? xe(dueFmt) : '<span class="crm-date-empty">Sem data</span>'}
        </span>
      </td>
      <td>
        <div class="crm-row-actions">
          <button class="crm-act-btn" title="Exportar para Word" onclick="exportClientCard('${rec.id}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="15" x2="15" y2="15"/><line x1="9" y1="18" x2="12" y2="18"/></svg>
          </button>
          <button class="crm-act-btn" title="Editar" onclick="openEditRecordModal('${rec.id}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="crm-act-btn del" title="Excluir" onclick="confirmDeleteRecord('${rec.id}')">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
          </button>
        </div>
      </td>
    `;

    tbody.appendChild(tr);

    const valSpan = tr.querySelector('#crm-val-' + rec.id);
    valSpan.addEventListener('click', () => openInlineValueEditor(rec.id, valSpan));

    const dateSpan = tr.querySelector('#crm-date-' + rec.id);
    dateSpan.addEventListener('click', () => openInlineDateEditor(rec.id, dateSpan));
  });
}

/* ── INLINE DATE EDITOR (mesmo padrão do editor de valor) ── */
function openInlineDateEditor(id, spanEl) {
  const rec = _records.find(r => r.id === id);
  if (!rec) return;

  const inp = document.createElement('input');
  inp.type      = 'date';
  inp.className = 'crm-date-inp-edit';
  inp.value     = rec.dueDate || '';

  spanEl.replaceWith(inp);
  inp.focus();

  let done = false;
  const commit = async () => {
    if (done) return; done = true;
    await updateRecord(id, { dueDate: inp.value });
  };
  inp.addEventListener('change', commit);
  inp.addEventListener('blur', () => { if (!done) renderRecordsTable(); });
}

/* ─────────────────────────────────────────────
   INLINE VALUE EDITOR
───────────────────────────────────────────── */
function openInlineValueEditor(id, spanEl) {
  const rec = _records.find(r => r.id === id);
  if (!rec) return;

  const inp = document.createElement('input');
  inp.type      = 'number';
  inp.className = 'crm-value-inp';
  inp.value     = rec.value || 0;
  inp.min       = '0';
  inp.step      = '0.01';

  spanEl.replaceWith(inp);
  inp.focus();
  inp.select();

  const save = async () => {
    const newVal = parseFloat(inp.value) || 0;
    await updateRecord(id, { value: newVal });
    // renderRecordsTable() será chamado pelo listener Firebase
  };

  inp.addEventListener('blur',  save);
  inp.addEventListener('keydown', e => {
    if (e.key === 'Enter')  { e.preventDefault(); inp.blur(); }
    if (e.key === 'Escape') { inp.blur(); }
  });
}

/* ─────────────────────────────────────────────
   CONFIRMAR EXCLUSÃO
───────────────────────────────────────────── */
function confirmDeleteRecord(id) {
  const rec = _records.find(r => r.id === id);
  if (!rec) return;

  const pop = document.createElement('div');
  pop.className = 'confirm-clear-pop';
  pop.innerHTML = `
    <div class="confirm-clear-card">
      <div class="confirm-clear-icon">🗑</div>
      <div class="confirm-clear-title">Excluir registro?</div>
      <div class="confirm-clear-desc">O cliente <strong>${xe(rec.name)}</strong> será removido permanentemente.</div>
      <div class="confirm-clear-btns">
        <button class="confirm-clear-cancel" id="cdr-cancel">Cancelar</button>
        <button class="confirm-clear-ok"    id="cdr-ok">Excluir</button>
      </div>
    </div>`;
  document.body.appendChild(pop);
  requestAnimationFrame(() => pop.classList.add('visible'));

  const close = (doIt) => {
    pop.classList.remove('visible');
    setTimeout(() => pop.remove(), 200);
    if (doIt) deleteRecord(id);
  };
  pop.querySelector('#cdr-cancel').onclick = () => close(false);
  pop.querySelector('#cdr-ok').onclick     = () => close(true);
  pop.addEventListener('click', e => { if (e.target === pop) close(false); });
}

/* ─────────────────────────────────────────────
   MODAL — Novo Registro / Editar Registro
───────────────────────────────────────────── */
function openNewRecordModal(prefill) {
  _openRecordModal(null, prefill);
}

function openEditRecordModal(id) {
  const rec = _records.find(r => r.id === id);
  if (!rec) return;
  _openRecordModal(rec);
}

function _openRecordModal(rec, prefill) {
  const isEdit = !!rec;
  const data   = rec || prefill || {};

  // Verificar limite se novo registro
  if (!isEdit) {
    const check = _crmCanCreate();
    if (!check.ok) {
      toast('🔒', 'Limite de ' + check.limit + ' itens atingido. Faça upgrade!');
      if (typeof showPremiumModal === 'function') showPremiumModal();
      return;
    }
  }

  const bg  = document.createElement('div');
  bg.className = 'modal-bg';

  const initStatus = data.status || 'pending';

  bg.innerHTML = `
    <div class="modal" style="max-width:460px;">
      <div class="m-h1">${isEdit ? '✏️ Editar Cliente' : '➕ Novo Cliente'}</div>
      <div class="m-sub">${isEdit ? 'Atualize os dados do registro.' : 'Adicione um novo cliente ou pagamento.'}</div>

      <div class="m-lbl">Nome do cliente</div>
      <input class="m-inp" id="crm-m-name" placeholder="Ex: João Silva" value="${xe(data.name||'')}">

      <div class="m-lbl">Descrição (opcional)</div>
      <textarea class="m-inp" id="crm-m-desc" rows="2" placeholder="Serviço prestado, projeto, etc.">${xe(data.description||'')}</textarea>

      <div class="crm-modal-row">
        <div class="crm-modal-col">
          <div class="crm-modal-lbl">Valor (R$)</div>
          <input type="number" class="crm-modal-inp" id="crm-m-value" min="0" step="0.01"
            placeholder="0,00" value="${data.value||''}">
        </div>
        <div class="crm-modal-col">
          <div class="crm-modal-lbl">Data de Vencimento</div>
          <input type="date" class="crm-modal-inp" id="crm-m-due" value="${data.dueDate||''}" style="color-scheme:dark;">
        </div>
      </div>

      <div class="crm-modal-lbl">CPF/CNPJ (opcional)</div>
      <input class="m-inp" id="crm-m-cpf" placeholder="000.000.000-00" maxlength="18" value="${xe(data.cpf||'')}">

      <div class="crm-modal-lbl">Documentos (opcional)</div>
      <div class="crm-doc-list" id="crm-m-doc-list"></div>
      <label class="crm-doc-add">
        <input type="file" id="crm-m-doc-file" multiple accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx">
        📎 Anexar documento (CPF, contrato, etc.)
      </label>

      <div class="crm-modal-lbl">Status do Pagamento</div>
      <div class="crm-status-select" id="crm-m-status-row">
        <div class="crm-status-opt ${initStatus==='pending'?'sel-pending':''}"
             data-status="pending" onclick="selectCRMStatus(this,'pending')">⏳ Pendente</div>
        <div class="crm-status-opt ${initStatus==='paid'?'sel-paid':''}"
             data-status="paid"    onclick="selectCRMStatus(this,'paid')">✅ Pago</div>
      </div>

      <div class="m-div"></div>
      <div class="m-btns">
        <button class="m-cancel" id="crm-m-cancel">Cancelar</button>
        <button class="m-confirm" id="crm-m-confirm">${isEdit ? 'Salvar' : 'Adicionar'}</button>
      </div>
    </div>`;

  document.body.appendChild(bg);

  // ── CPF/CNPJ: formata enquanto digita ──
  const cpfInp = bg.querySelector('#crm-m-cpf');
  cpfInp.addEventListener('input', () => { cpfInp.value = _formatCpfCnpj(cpfInp.value); });

  // ── Documentos anexados (em memória até salvar) ──
  let pendingDocs = (data.documents || []).slice();
  const docListEl = bg.querySelector('#crm-m-doc-list');
  const renderDocList = () => {
    docListEl.innerHTML = pendingDocs.map((d, i) => `
      <div class="crm-doc-item" data-i="${i}">
        <span class="crm-doc-name" title="Clique para visualizar">📄 ${xe(d.name)}</span>
        <span class="crm-doc-size">${((d.size||0)/1024).toFixed(0)}KB</span>
        <button type="button" class="crm-doc-del" title="Remover">${iX}</button>
      </div>`).join('');
    docListEl.querySelectorAll('.crm-doc-name').forEach(el => {
      el.addEventListener('click', () => viewDocumentFile(pendingDocs[Number(el.closest('.crm-doc-item').dataset.i)]));
    });
    docListEl.querySelectorAll('.crm-doc-del').forEach(btn => {
      btn.addEventListener('click', () => {
        pendingDocs.splice(Number(btn.closest('.crm-doc-item').dataset.i), 1);
        renderDocList();
      });
    });
  };
  renderDocList();

  bg.querySelector('#crm-m-doc-file').addEventListener('change', async function() {
    const MAX = 5 * 1024 * 1024;
    for (const f of Array.from(this.files)) {
      if (f.size > MAX) { toast('⚠', '"' + f.name + '" excede 5MB'); continue; }
      if (!safeFileType(f)) { toast('⚠', '"' + f.name + '" — tipo de arquivo não permitido.'); continue; }
      const dataUrl = await new Promise((ok, fail) => {
        const fr = new FileReader();
        fr.onload = () => ok(fr.result);
        fr.onerror = fail;
        fr.readAsDataURL(f);
      });
      pendingDocs.push({ name: f.name, size: f.size, type: f.type, dataUrl });
    }
    this.value = '';
    renderDocList();
  });

  bg.querySelector('#crm-m-cancel').onclick = () => bg.remove();
  bg.addEventListener('click', e => { if (e.target === bg) bg.remove(); });

  bg.querySelector('#crm-m-confirm').onclick = async () => {
    const name  = bg.querySelector('#crm-m-name').value.trim();
    const desc  = bg.querySelector('#crm-m-desc').value.trim();
    const value = parseFloat(bg.querySelector('#crm-m-value').value) || 0;
    const due   = bg.querySelector('#crm-m-due').value;
    const cpf   = cpfInp.value.trim();
    const statusEl = bg.querySelector('.crm-status-opt.sel-paid, .crm-status-opt.sel-pending');
    const status = statusEl ? statusEl.dataset.status : 'pending';

    if (!name) {
      bg.querySelector('#crm-m-name').style.borderColor = 'var(--clr-danger)';
      bg.querySelector('#crm-m-name').focus();
      return;
    }

    const btn = bg.querySelector('#crm-m-confirm');
    btn.textContent = 'Salvando…'; btn.disabled = true;

    if (isEdit) {
      await updateRecord(rec.id, { name, description: desc, value, dueDate: due, status, cpf, documents: pendingDocs });
      toast('✅', 'Cliente atualizado!');
    } else {
      await createRecord({ name, description: desc, value, status, dueDate: due, cpf, documents: pendingDocs });
    }
    bg.remove();
  };

  // Focus on name
  setTimeout(() => bg.querySelector('#crm-m-name')?.focus(), 80);
}

function selectCRMStatus(el, status) {
  const row = el.closest('#crm-m-status-row');
  row.querySelectorAll('.crm-status-opt').forEach(o => {
    o.classList.remove('sel-paid', 'sel-pending');
  });
  el.classList.add(status === 'paid' ? 'sel-paid' : 'sel-pending');
}

/* ─────────────────────────────────────────────
   BOTÃO "CONVERTER EM CLIENTE" nas notas
   Injetado pelo mountNote hook
───────────────────────────────────────────── */
/* ─────────────────────────────────────────────
   BOTÃO CONVERTER — aparece APENAS em notas de cliente
   Notas pessoais NÃO têm botão converter
───────────────────────────────────────────── */
function injectConvertButton(noteEl, noteId) {
  // Notas pessoais não têm opção de converter → sai imediatamente
  const n = notes.find(n => n.id === noteId);
  if (!n || n._isClientNote) return; // cliente já tem bloco próprio, não precisa de botão

  // Evita duplicação
  if (noteEl.querySelector('.n-convert-btn')) return;

  const chipRow = noteEl.querySelector('.n-chip-row');
  if (!chipRow) return;

  const btn = document.createElement('button');
  btn.className = 'n-convert-btn' + (n._crmRecordId ? ' converted' : '');
  btn.textContent = n._crmRecordId ? '✓ Em Clientes' : '💼 → Cliente';
  btn.title = 'Converter esta nota em registro de cliente';

  if (!n._crmRecordId) {
    btn.onclick = (e) => {
      e.stopPropagation();
      convertNoteToRecord(noteId);
    };
  }

  const delBtn = chipRow.querySelector('.n-del');
  if (delBtn) chipRow.insertBefore(btn, delBtn);
  else chipRow.appendChild(btn);
}

/* ─────────────────────────────────────────────
   addNote — cria nota no board sem verificação de plano
   Usado por createClientNote (que já verificou o limite)
───────────────────────────────────────────── */
function addNote(data) {
  const W = window.innerWidth, H = window.innerHeight, TB = 54;
  const x = data.x !== undefined ? data.x : 80  + Math.random() * Math.max(W - 420, 80);
  const y = data.y !== undefined ? data.y : TB + 40 + Math.random() * Math.max(H - TB - 320, 80);
  const n = Object.assign({
    id: Date.now(), color: selClr, title: '', body: '',
    start: '', end: '', reminder: false, remDays: 3,
    status: 'todo', x, y, z: ++zTop, files: [],
    _isClientNote: false, _crmRecordId: null
  }, data, { x, y, z: ++zTop });
  notes.push(n);
  mountNote(n);
  saveNotes();
  syncCount();
  return n;
}
window.addEventListener('load', function crmInit() {

  // ── Wire up client note form submit ──
  const mcOk = document.getElementById('mc-ok');
  if (mcOk) mcOk.addEventListener('click', createClientNote);

  // ── Wire up modal backdrop click ──
  const modalBg = document.getElementById('modal');
  if (modalBg) {
    modalBg.addEventListener('click', e => {
      if (e.target === modalBg) closeModal();
    });
  }

  // ── Patch mountNote ──
  const origMount = window.mountNote;
  if (typeof origMount === 'function') {
    window.mountNote = function(n) {
      // Não montar registros CRM puros como notas no board
      if (n && (n.type === 'client' || String(n.id || '').startsWith('crm_'))) return;
      origMount.call(this, n);
      requestAnimationFrame(() => {
        const el = document.querySelector('.note[data-id="' + n.id + '"]');
        if (!el) return;
        if (n._isClientNote) {
          // Nota de cliente: mostra extras (valor/status), SEM botão converter
          mountClientNoteExtras(el, n.id);
        } else {
          // Nota pessoal: pode ter botão converter (para quem quiser migrar)
          // REMOVIDO conforme solicitado — notas pessoais não têm opção CRM
          // injectConvertButton(el, n.id);
        }
      });
    };
  }

  // ── Patch launchApp ──
  const origLaunch = window.launchApp;
  if (typeof origLaunch === 'function') {
    window.launchApp = async function() {
      await origLaunch.apply(this, arguments);

      // Remover do array `notes` qualquer registro CRM puro
      if (Array.isArray(notes)) {
        for (let i = notes.length - 1; i >= 0; i--) {
          const n = notes[i];
          if (n.type === 'client' || String(n.id || '').startsWith('crm_')) {
            document.querySelector('.note[data-id="' + n.id + '"]')?.remove();
            notes.splice(i, 1);
          }
        }
      }

      // Montar extras nas notas de cliente
      setTimeout(() => {
        if (Array.isArray(notes)) {
          notes.forEach(n => {
            const el = document.querySelector('.note[data-id="' + n.id + '"]');
            if (!el) return;
            if (n._isClientNote) {
              mountClientNoteExtras(el, n.id);
            }
            // Notas pessoais não recebem mais botão converter
          });
        }
        // Carregar registros CRM sempre (para blocos de notas de cliente no board)
        loadRecords();
      }, 500);
    };
  }

  // ── Patch doLogout ──
  const origLogout = window.doLogout;
  if (typeof origLogout === 'function') {
    window.doLogout = function() {
      if (typeof isInCall === 'function' && isInCall()) leaveCall();
      _crmDetachListener();
      _records = [];
      _crmMode = false;
      const btn   = document.getElementById('btn-crm-view');
      const label = document.getElementById('crm-view-label');
      const crmBd = document.getElementById('crm-board');
      const crmDs = document.getElementById('crm-dashboard');
      const crmCh = document.getElementById('crm-charts-row');
      if (btn)   btn.classList.remove('active');
      if (label) label.textContent = 'Clientes';
      if (crmBd) crmBd.classList.remove('visible');
      if (crmDs) crmDs.classList.remove('visible');
      if (crmCh) crmCh.classList.remove('visible');
      origLogout.apply(this, arguments);
    };
  }
})();

/* ═══════════════════════════════════════════════════════════════════════════
   PAINEL ADMINISTRATIVO
   Acessível apenas quando window.authState.isAdmin === true.
   A proteção existe em três camadas:
     1. Botão oculto para não-admins no DOM
     2. Guard na função openAdminPanel()
     3. Regras do Firebase Realtime Database (token.admin === true)
═══════════════════════════════════════════════════════════════════════════ */

function openAdminPanel() {
  if (!window.authState?.isAdmin) {
    toast('🚫', 'Acesso restrito a administradores.');
    return;
  }

  // Evita abrir duplo
  if (document.getElementById('admin-panel-overlay')) return;

  const overlay = document.createElement('div');
  overlay.id = 'admin-panel-overlay';
  overlay.className = 'admin-overlay';
  overlay.innerHTML = `
    <div class="admin-panel">
      <div class="admin-header">
        <div class="admin-title">
          <span class="admin-badge-icon">🛡️</span> Painel Administrativo
        </div>
        <div style="display:flex;gap:8px;align-items:center;">
          <input id="admin-search" class="admin-search" placeholder="Buscar usuário…" autocomplete="off">
          <button class="admin-refresh-btn" onclick="adminLoadUsers()" title="Atualizar">↻</button>
          <button class="admin-close-btn" onclick="closeAdminPanel()">✕</button>
        </div>
      </div>
      <div class="admin-stats" id="admin-stats">
        <div class="admin-stat-card"><div class="admin-stat-n" id="astat-total">—</div><div class="admin-stat-l">Total de usuários</div></div>
        <div class="admin-stat-card"><div class="admin-stat-n" id="astat-premium">—</div><div class="admin-stat-l">Premium ativos</div></div>
        <div class="admin-stat-card"><div class="admin-stat-n" id="astat-online">—</div><div class="admin-stat-l">Online agora</div></div>
      </div>
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Usuário</th>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Função</th>
              <th>Plano</th>
              <th>Notas/mês</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody id="admin-tbody">
            <tr><td colspan="7" class="admin-loading">Carregando usuários…</td></tr>
          </tbody>
        </table>
      </div>
      <div class="admin-footer">
        <span id="admin-user-count"></span>
        <span style="font-size:.7rem;color:rgba(255,255,255,.3);">Dados do Firebase Realtime Database</span>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  overlay.addEventListener('click', e => { if (e.target === overlay) closeAdminPanel(); });
  document.getElementById('admin-search').addEventListener('input', adminFilter);

  adminLoadUsers();
}

function closeAdminPanel() {
  document.getElementById('admin-panel-overlay')?.remove();
}

let _adminUsers = [];

async function adminLoadUsers() {
  if (!window.authState?.isAdmin) return;
  const tbody = document.getElementById('admin-tbody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="7" class="admin-loading">Carregando…</td></tr>';

  try {
    await loadFirebase();

    // 1. Obter mapa uid → username
    const uidsSnap = await fbGet('uids');
    if (!uidsSnap) {
      tbody.innerHTML = '<tr><td colspan="7" class="admin-loading">Nenhum usuário encontrado.</td></tr>';
      return;
    }

    // 2. Carregar perfis, planos e presença em paralelo
    const [presenceSnap] = await Promise.all([fbGet('presence')]);
    const presence = presenceSnap || {};

    const uids = Object.keys(uidsSnap);
    const profiles = await Promise.all(
      uids.map(uid => fbGet('users/' + uid + '/profile').catch(() => null))
    );
    const plans = await Promise.all(
      uids.map(uid => fbGet('users/' + uid + '/plan').catch(() => null))
    );

    _adminUsers = uids.map((uid, i) => ({
      uid,
      username:  uidsSnap[uid] || '—',
      profile:   profiles[i]  || {},
      plan:      plans[i]     || { plan: 'free', notesCreatedThisMonth: 0 },
      online:    !!presence[uid]?.online,
    }));

    // Stats
    const totalPremium = _adminUsers.filter(u => u.plan?.plan === 'premium').length;
    const totalOnline  = _adminUsers.filter(u => u.online).length;
    const statsTotal   = document.getElementById('astat-total');
    const statsPrem    = document.getElementById('astat-premium');
    const statsOnline  = document.getElementById('astat-online');
    if (statsTotal)  statsTotal.textContent  = _adminUsers.length;
    if (statsPrem)   statsPrem.textContent   = totalPremium;
    if (statsOnline) statsOnline.textContent = totalOnline;

    adminRender(_adminUsers);

  } catch(e) {
    console.error('[admin] Erro ao carregar usuários:', e);
    if (tbody) tbody.innerHTML = '<tr><td colspan="7" class="admin-loading" style="color:#f87171;">Erro: ' + (e.message || 'falha ao carregar') + '</td></tr>';
  }
}

function adminRender(users) {
  const tbody = document.getElementById('admin-tbody');
  if (!tbody) return;

  const count = document.getElementById('admin-user-count');
  if (count) count.textContent = users.length + ' usuário(s)';

  if (!users.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="admin-loading">Nenhum resultado.</td></tr>';
    return;
  }

  tbody.innerHTML = users.map(u => {
    const p       = u.profile;
    const plan    = u.plan?.plan || 'free';
    const notes   = u.plan?.notesCreatedThisMonth || 0;
    const isPrem  = plan === 'premium';
    const planExp = u.plan?.planExpiresAt;
    const expired = isPrem && planExp && Date.now() > planExp;
    const planLabel = expired ? 'premium (exp.)' : plan;
    const onlineDot = u.online
      ? '<span class="admin-dot online" title="Online"></span>'
      : '<span class="admin-dot" title="Offline"></span>';

    return `<tr>
      <td><b>@${adminEsc(u.username)}</b><br><small style="opacity:.4;font-size:.65rem;">${adminEsc(u.uid.slice(0,12))}…</small></td>
      <td>${adminEsc(p.name || '—')}</td>
      <td style="font-size:.75rem;">${adminEsc(p.email || '—')}</td>
      <td>${adminEsc(p.role || '—')}</td>
      <td><span class="admin-plan-badge ${isPrem && !expired ? 'prem' : 'free'}">${planLabel}</span></td>
      <td style="text-align:center;">${notes}</td>
      <td>${onlineDot}</td>
    </tr>`;
  }).join('');
}

function adminFilter() {
  const q = (document.getElementById('admin-search')?.value || '').toLowerCase().trim();
  if (!q) { adminRender(_adminUsers); return; }
  const filtered = _adminUsers.filter(u =>
    (u.username || '').toLowerCase().includes(q) ||
    (u.profile?.name  || '').toLowerCase().includes(q) ||
    (u.profile?.email || '').toLowerCase().includes(q)
  );
  adminRender(filtered);
}

function adminEsc(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

