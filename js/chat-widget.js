/* ==================== ASSISTANT DE CHAT ====================
   Widget de chat flottant relie a un agent IA cote serveur
   (POST /api/chat/message), avec un prompt systeme restreignant les
   reponses aux seules questions liees a PresenceRH. L'historique de la
   conversation est garde en memoire cote navigateur (non persiste) et
   renvoye a chaque appel pour donner du contexte au modele. */

const CHAT_API = (typeof API !== 'undefined' ? API : 'https://rh-presence.onrender.com');

let chatHistory = [];
let chatOpen = false;
let chatSending = false;
let chatOpenedOnce = false;

function scrollChatToBottom() {
  const box = document.getElementById('chatMsgs');
  box.scrollTop = box.scrollHeight;
}

function appendChatMessage(role, text) {
  const box = document.getElementById('chatMsgs');
  const div = document.createElement('div');
  div.className = 'chat-msg ' + (role === 'user' ? 'user' : 'bot');
  div.textContent = text;
  box.appendChild(div);
  scrollChatToBottom();
  return div;
}

function showTypingIndicator() {
  const box = document.getElementById('chatMsgs');
  const div = document.createElement('div');
  div.className = 'chat-msg bot typing';
  div.id = 'chatTyping';
  div.innerHTML = '<span></span><span></span><span></span>';
  box.appendChild(div);
  scrollChatToBottom();
}

function removeTypingIndicator() {
  const el = document.getElementById('chatTyping');
  if (el) el.remove();
}

window.toggleChat = function (forceOpen) {
  const panel = document.getElementById('chatPanel');
  const badge = document.getElementById('chatBadge');
  chatOpen = typeof forceOpen === 'boolean' ? forceOpen : !chatOpen;
  panel.classList.toggle('open', chatOpen);
  if (chatOpen) {
    badge.style.display = 'none';
    if (!chatOpenedOnce) {
      chatOpenedOnce = true;
      appendChatMessage('bot', "Bonjour ! Je suis l'assistant PresenceRH. Posez-moi vos questions sur l'application : pointage, securite, plateformes disponibles, essai gratuit...");
    }
    setTimeout(() => document.getElementById('chatInput').focus(), 150);
  }
};

window.handleChatKeydown = function (e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendChatMessage();
  }
};

window.askSuggestion = function (btn) {
  document.getElementById('chatInput').value = btn.textContent;
  sendChatMessage();
};

window.sendChatMessage = async function () {
  if (chatSending) return;
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if (!text) return;

  const suggestBar = document.getElementById('chatSuggest');
  if (suggestBar) suggestBar.style.display = 'none';

  input.value = '';
  appendChatMessage('user', text);
  chatSending = true;
  document.getElementById('chatSendBtn').disabled = true;
  showTypingIndicator();

  try {
    const res = await fetch(CHAT_API + '/api/chat/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, history: chatHistory })
    });
    const data = await res.json().catch(() => null);
    removeTypingIndicator();

    if (!res.ok) {
      appendChatMessage('bot', (data && data.error) || "Desole, une erreur est survenue. Reessayez dans un instant.");
      return;
    }

    appendChatMessage('bot', data.reply);
    chatHistory.push({ role: 'user', content: text });
    chatHistory.push({ role: 'assistant', content: data.reply });
    if (chatHistory.length > 16) chatHistory = chatHistory.slice(-16);
  } catch (e) {
    removeTypingIndicator();
    appendChatMessage('bot', 'Connexion impossible. Verifiez votre reseau et reessayez.');
  } finally {
    chatSending = false;
    document.getElementById('chatSendBtn').disabled = false;
  }
};
