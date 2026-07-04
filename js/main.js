/* ==================== CONFIG ====================
   Le site communique directement avec l'API de production de
   l'application PresenceRH : une inscription ou une connexion faite ici
   est immediatement valable dans l'application (web, Android, iOS,
   Windows, macOS). Si ce site est heberge sur un nouveau domaine, il faut
   ajouter ce domaine a la variable d'environnement ALLOWED_ORIGINS du
   backend (CORS), sans quoi le navigateur bloquera ces appels. */
const API = 'https://rh-presence.onrender.com';

async function api(path, opts = {}) {
  const headers = Object.assign({ 'Content-Type': 'application/json' }, opts.headers || {});
  const res = await fetch(API + path, Object.assign({}, opts, { headers }));
  let data = null;
  try { data = await res.json(); } catch (e) { data = null; }
  if (!res.ok) {
    const err = new Error((data && data.error) || 'Erreur serveur. Reessayez dans un instant.');
    err.status = res.status;
    throw err;
  }
  return data;
}
function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

/* ==================== NAVIGATION ==================== */
document.getElementById('navToggle').addEventListener('click', () => {
  document.getElementById('navLinks').classList.toggle('open');
});
document.querySelectorAll('.nav-links a').forEach((a) => {
  a.addEventListener('click', () => document.getElementById('navLinks').classList.remove('open'));
});

window.scrollToAuth = function (tab) {
  switchAuthTab(tab);
  document.getElementById('acces').scrollIntoView({ behavior: 'smooth' });
};

/* ==================== ANIMATIONS D'APPARITION ==================== */
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => { if (entry.isIntersecting) entry.target.classList.add('in'); });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach((el) => revealObserver.observe(el));

/* ==================== HORLOGE DE LA MAQUETTE ==================== */
function tickHeroClock() {
  const el = document.getElementById('heroClock');
  if (el) el.textContent = new Date().toLocaleTimeString('fr-FR');
}
tickHeroClock();
setInterval(tickHeroClock, 1000);

/* ==================== VIDEO DE DEMO ====================
   Si le fichier assets/demo-presencerh.mp4 est present, on l'affiche ;
   sinon on garde le message d'attente visible (voir index.html). */
(function checkDemoVideo() {
  const video = document.getElementById('demoVideo');
  const placeholder = document.getElementById('videoPlaceholder');
  fetch('assets/demo-presencerh.mp4', { method: 'HEAD' })
    .then((res) => {
      if (res.ok) {
        video.style.display = 'block';
        placeholder.style.display = 'none';
      }
    })
    .catch(() => { /* fichier absent : on garde le placeholder */ });
})();

/* ==================== FAQ ==================== */
window.toggleFaq = function (headerEl) {
  const item = headerEl.parentElement;
  const wasOpen = item.classList.contains('open');
  document.querySelectorAll('.faq-item.open').forEach((i) => i.classList.remove('open'));
  if (!wasOpen) item.classList.add('open');
};

/* ==================== AUTHENTIFICATION (reliee a l'API reelle) ==================== */
window.togglePass = function (id, btn) {
  const input = document.getElementById(id);
  input.type = input.type === 'password' ? 'text' : 'password';
  btn.textContent = input.type === 'password' ? '\u{1F441}' : '\u{1F648}';
};

window.switchAuthTab = function (tab) {
  document.getElementById('tabLogin').classList.toggle('active', tab === 'login');
  document.getElementById('tabRegister').classList.toggle('active', tab === 'register');
  document.getElementById('loginForm').style.display = tab === 'login' ? 'block' : 'none';
  document.getElementById('registerForm').style.display = tab === 'register' ? 'block' : 'none';
  document.getElementById('authAlert').innerHTML = '';
  if (tab === 'login') loadCaptcha();
};

function showAuthAlert(html, cls) {
  document.getElementById('authAlert').innerHTML = `<div class="alert ${cls}">${html}</div>`;
}

let currentCaptchaId = null;
window.loadCaptcha = async function () {
  const q = document.getElementById('loginCaptchaQuestion');
  const answerEl = document.getElementById('loginCaptchaAnswer');
  if (answerEl) answerEl.value = '';
  try {
    const { captchaId, question } = await api('/api/auth/captcha');
    currentCaptchaId = captchaId;
    q.textContent = `Combien font ${question} ?`;
  } catch (e) {
    q.textContent = 'Vérification anti-robot indisponible pour le moment.';
  }
};

window.doLogin = async function () {
  const btn = document.getElementById('loginBtn');
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPass').value;
  const captchaReponse = document.getElementById('loginCaptchaAnswer').value.trim();
  if (!email || !password) return showAuthAlert('Renseignez votre e-mail et votre mot de passe.', 'err');
  if (!captchaReponse) return showAuthAlert('Répondez à la vérification anti-robot.', 'err');
  btn.disabled = true; btn.textContent = 'Connexion en cours...';
  try {
    const data = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, captchaId: currentCaptchaId, captchaReponse })
    });
    showAuthAlert(
      `Bon retour, <b>${escapeHtml(data.user.prenom)}</b> ! Votre compte est actif.
       <br><a href="${API}" style="color:inherit;text-decoration:underline;" target="_blank" rel="noopener">Ouvrir l'application PresenceRH &#8594;</a>`,
      'ok'
    );
  } catch (e) {
    showAuthAlert(escapeHtml(e.message), 'err');
    loadCaptcha();
  } finally {
    btn.disabled = false; btn.textContent = 'Se connecter';
  }
};

window.doRegister = async function () {
  const btn = document.getElementById('registerBtn');
  const body = {
    matricule: document.getElementById('regMatricule').value.trim(),
    service: document.getElementById('regService').value.trim(),
    nom: document.getElementById('regNom').value.trim(),
    prenom: document.getElementById('regPrenom').value.trim(),
    email: document.getElementById('regEmail').value.trim(),
    password: document.getElementById('regPass').value,
    role: document.getElementById('regRole').value
  };
  if (!body.matricule || !body.nom || !body.prenom || !body.email || !body.password) {
    return showAuthAlert('Tous les champs sont obligatoires (sauf le service).', 'err');
  }
  btn.disabled = true; btn.textContent = 'Création en cours...';
  try {
    const data = await api('/api/auth/register', { method: 'POST', body: JSON.stringify(body) });
    switchAuthTab('login');
    showAuthAlert(escapeHtml(data.message), 'ok');
  } catch (e) {
    showAuthAlert(escapeHtml(e.message), 'err');
  } finally {
    btn.disabled = false; btn.textContent = 'Créer mon compte';
  }
};

loadCaptcha();
