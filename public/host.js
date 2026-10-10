// Sound Effects Synthesizer with Web Audio API (Zero dependencies)
class SoundFx {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
    }
  }

  playBuzzer() {
    if (this.muted) return;
    this.init();
    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc2.type = 'square';
    osc1.frequency.setValueAtTime(440, now);
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.15);
    osc2.frequency.setValueAtTime(445, now);
    osc2.frequency.exponentialRampToValueAtTime(890, now + 0.15);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.45);
    osc2.stop(now + 0.45);
  }

  playCorrect() {
    if (this.muted) return;
    this.init();
    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, index) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + index * 0.08);
      gain.gain.setValueAtTime(0, now + index * 0.08);
      gain.gain.linearRampToValueAtTime(0.3, now + index * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.08 + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + index * 0.08);
      osc.stop(now + index * 0.08 + 0.4);
    });
  }

  playWrong() {
    if (this.muted) return;
    this.init();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.linearRampToValueAtTime(130, now + 0.4);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.45);
  }

  playActivate() {
    if (this.muted) return;
    this.init();
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(1320, now + 0.12);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.2);
  }

  playChampionFanfare() {
    if (this.muted) return;
    this.init();
    const now = this.ctx.currentTime;
    const notes = [
      { f: 392.00, t: 0, d: 0.16 },
      { f: 523.25, t: 0.16, d: 0.16 },
      { f: 659.25, t: 0.32, d: 0.16 },
      { f: 783.99, t: 0.48, d: 0.35 },
      { f: 659.25, t: 0.83, d: 0.14 },
      { f: 1046.50, t: 0.97, d: 1.2 }
    ];

    notes.forEach(n => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(n.f, now + n.t);
      gain.gain.setValueAtTime(0, now + n.t);
      gain.gain.linearRampToValueAtTime(0.35, now + n.t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + n.t + n.d);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + n.t);
      osc.stop(now + n.t + n.d);
    });
  }
}

const sound = new SoundFx();

// Web Speech API Voice Synthesizer (Latin American Spanish: es-MX / es-419)
function speakIA(text, onStart, onEnd) {
  if (!('speechSynthesis' in window)) {
    alert('Tu navegador no soporta síntesis de voz Web Speech API.');
    return;
  }

  window.speechSynthesis.cancel();
  if (!text) return;

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.98;
  utterance.pitch = 1.0;

  // Select Latin American Spanish voice (es-MX or es-419)
  const voices = window.speechSynthesis.getVoices();
  const latinVoice = voices.find(v => v.lang === 'es-MX' || v.lang === 'es-419' || v.lang.startsWith('es-MX') || v.lang.startsWith('es-419'))
                  || voices.find(v => v.lang.startsWith('es'));
  if (latinVoice) {
    utterance.voice = latinVoice;
  }

  utterance.onstart = () => {
    if (typeof onStart === 'function') onStart();
  };

  utterance.onend = () => {
    if (typeof onEnd === 'function') onEnd();
  };

  utterance.onerror = () => {
    if (typeof onEnd === 'function') onEnd();
  };

  window.speechSynthesis.speak(utterance);
}

// Preload voices
if ('speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.getVoices();
  };
}

// Socket and State
const socket = io();
let questions = null;
let currentGameState = null;
const buzzerUrl = `${window.location.protocol}//${window.location.host}/buzzer.html`;

// DOM Elements
const introModal = document.getElementById('intro-modal');
const btnStartGame = document.getElementById('btn-start-game');
const boardGrid = document.getElementById('board-grid');
const teamsContainer = document.getElementById('teams-container');
const teamCount = document.getElementById('team-count');
const connStatusText = document.getElementById('conn-status-text');
const activeUrlText = document.getElementById('active-url-text');
const toastEl = document.getElementById('toast');

// Question Modal Elements
const questionModal = document.getElementById('question-modal');
const modalCategory = document.getElementById('modal-category');
const modalPoints = document.getElementById('modal-points');
const modalQuestionText = document.getElementById('modal-question-text');
const modalBranchBText = document.getElementById('modal-branch-b-text');
const modalBranchAText = document.getElementById('modal-branch-a-text');
const buzzerBanner = document.getElementById('buzzer-status-banner');
const buzzerHeadline = document.getElementById('buzzer-headline');
const buzzerSubtext = document.getElementById('buzzer-subtext');
const buzzerReactionTime = document.getElementById('buzzer-reaction-time');
const teacherGuideBox = document.getElementById('teacher-guide-box');
const modalAnswerText = document.getElementById('modal-answer-text');
const modalGuideText = document.getElementById('modal-guide-text');
const aiReflectionBox = document.getElementById('ai-reflection-box');
const modalReflectionText = document.getElementById('modal-reflection-text');
const speakingIndicator = document.getElementById('speaking-indicator');

// Question Modal Buttons
const btnActivateBuzzer = document.getElementById('btn-activate-buzzer');
const btnCorrect = document.getElementById('btn-correct');
const btnIncorrect = document.getElementById('btn-incorrect');
const btnToggleAnswer = document.getElementById('btn-toggle-answer');
const btnIaReflection = document.getElementById('btn-ia-reflection');
const btnCloseModal = document.getElementById('btn-close-modal');

// Header Buttons
const btnShowQr = document.getElementById('btn-show-qr');
const btnCopyLink = document.getElementById('btn-copy-link');
const btnFinalJeopardy = document.getElementById('btn-final-jeopardy');
const btnEndGame = document.getElementById('btn-end-game');
const btnSoundToggle = document.getElementById('btn-sound-toggle');
const btnFullscreen = document.getElementById('btn-fullscreen');
const btnReset = document.getElementById('btn-reset');

// QR Modal Elements
const qrModal = document.getElementById('qr-modal');
const qrCodeImg = document.getElementById('qr-code-img');
const qrUrlInput = document.getElementById('qr-url-input');
const btnCopyQrUrl = document.getElementById('btn-copy-qr-url');
const btnCloseQr = document.getElementById('btn-close-qr');

// Final Jeopardy Modal Elements
const finalModal = document.getElementById('final-modal');
const finalQuestionText = document.getElementById('final-question-text');
const finalBranchBText = document.getElementById('final-branch-b-text');
const finalBranchAText = document.getElementById('final-branch-a-text');
const finalGuideBox = document.getElementById('final-guide-box');
const finalAnswerText = document.getElementById('final-answer-text');
const finalGuideText = document.getElementById('final-guide-text');
const finalReflectionBox = document.getElementById('final-reflection-box');
const finalReflectionText = document.getElementById('final-reflection-text');
const finalSpeakingIndicator = document.getElementById('final-speaking-indicator');
const btnFinalActivate = document.getElementById('btn-final-activate');
const btnFinalCorrect = document.getElementById('btn-final-correct');
const btnFinalIncorrect = document.getElementById('btn-final-incorrect');
const btnFinalReveal = document.getElementById('btn-final-reveal');
const btnFinalIa = document.getElementById('btn-final-ia');
const btnCloseFinal = document.getElementById('btn-close-final');

// Podium Modal Elements
const podiumModal = document.getElementById('podium-modal');
const podiumStage = document.getElementById('podium-stage');
const otherTeamsList = document.getElementById('other-teams-list');
const btnClosePodium = document.getElementById('btn-close-podium');
const btnNewGame = document.getElementById('btn-new-game');

// TOAST HELPER
function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.remove('hidden');
  setTimeout(() => {
    toastEl.classList.add('hidden');
  }, 2600);
}

// Copy Buzzer Link
function copyBuzzerLink() {
  navigator.clipboard.writeText(buzzerUrl).then(() => {
    showToast('¡Enlace móvil copiado al portapapeles!');
  }).catch(() => {
    prompt('Copia este enlace para los celulares de los alumnos:', buzzerUrl);
  });
}

btnCopyLink.addEventListener('click', copyBuzzerLink);
btnCopyQrUrl.addEventListener('click', copyBuzzerLink);
activeUrlText.addEventListener('click', copyBuzzerLink);

// MODAL INICIAL DE INSTRUCCIONES
// Al cargar la página abre automáticamente el modal "🎬 Reglas de Educación Financiera"
// Botón "¡Entendido, Iniciar Juego!" oculta el modal e inicializa el tablero.
btnStartGame.addEventListener('click', () => {
  sound.init();
  introModal.classList.add('hidden');
  showToast('¡Producción iniciada! Selecciona una pregunta del tablero.');
});

// Dynamic QR code generation pointing to `${window.location.protocol}//${window.location.host}/buzzer.html`
function generateDynamicQr() {
  activeUrlText.textContent = buzzerUrl;
  qrUrlInput.value = buzzerUrl;

  // Try fetching from server endpoint
  fetch(`/api/qr?url=${encodeURIComponent(buzzerUrl)}`)
    .then(res => res.json())
    .then(data => {
      if (data.qrCodeDataUrl) {
        qrCodeImg.src = data.qrCodeDataUrl;
      }
    })
    .catch(() => {
      // Fallback
      qrCodeImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(buzzerUrl)}`;
    });
}

// Socket Connection
socket.on('connect', () => {
  connStatusText.textContent = 'En línea (Servidor activo)';
  socket.emit('join-host');
  generateDynamicQr();
});

socket.on('init-host', (data) => {
  questions = data.questions;
  currentGameState = data.gameState;
  renderBoard();
  renderTeams(currentGameState.teams);
  generateDynamicQr();
});

socket.on('teams-updated', (teams) => {
  if (currentGameState) currentGameState.teams = teams;
  renderTeams(teams);
});

// Render the 5x5 Jeopardy Board
function renderBoard() {
  if (!questions) return;
  boardGrid.innerHTML = '';

  questions.categorias.forEach((cat, catIdx) => {
    const col = document.createElement('div');
    col.className = 'category-column';

    const header = document.createElement('div');
    header.className = 'category-header';
    header.innerHTML = `<h2>${cat.nombre}</h2>`;
    col.appendChild(header);

    cat.preguntas.forEach((q, qIdx) => {
      const card = document.createElement('div');
      card.className = 'question-card';
      const isAnswered = currentGameState?.board?.[catIdx]?.[qIdx];
      if (isAnswered) {
        card.classList.add('answered');
      }

      card.innerHTML = `<span class="points">$${q.puntos}</span>`;

      card.addEventListener('click', () => {
        if (!card.classList.contains('answered')) {
          openQuestion(catIdx, qIdx);
        }
      });

      col.appendChild(card);
    });

    boardGrid.appendChild(col);
  });
}

// Open Question
function openQuestion(catIdx, qIdx) {
  sound.init();
  window.speechSynthesis.cancel();
  socket.emit('open-question', { catIndex: catIdx, qIndex: qIdx });
}

socket.on('question-opened', (data) => {
  modalCategory.textContent = data.categoria;
  modalPoints.textContent = `$${data.puntos}`;
  modalQuestionText.textContent = data.pregunta;

  // Display strategic branch options
  modalBranchBText.textContent = data.opcion_branch_b || 'Invertir en necesidades operativas básicas (Branch B).';
  modalBranchAText.textContent = data.opcion_branch_a || 'Gastar en lujos y deseos superficiales (Branch A).';

  modalAnswerText.textContent = data.respuesta;
  modalGuideText.textContent = data.guia_docente;
  modalReflectionText.textContent = data.reflexion_ia;

  teacherGuideBox.classList.add('hidden');
  aiReflectionBox.classList.add('hidden');
  speakingIndicator.classList.add('hidden');
  btnToggleAnswer.textContent = '👁️ Ver Respuesta [R]';

  setBuzzerBannerIdle();

  // Control buttons: Correct and Incorrect ALWAYS enabled for teacher
  btnActivateBuzzer.disabled = false;
  btnCorrect.disabled = false;
  btnIncorrect.disabled = false;

  questionModal.classList.remove('hidden');
});

// Activate Buzzer
btnActivateBuzzer.addEventListener('click', () => {
  socket.emit('activate-buzzer');
});

socket.on('buzzer-activated', () => {
  sound.playActivate();
  setBuzzerBannerActive();
  btnActivateBuzzer.disabled = true;
});

// Team Buzzed
socket.on('team-buzzed', (buzzedData) => {
  sound.playBuzzer();
  setBuzzerBannerBuzzed(buzzedData);
  highlightTeamCard(buzzedData.teamId);
});

// BOTÓN "👁️ Ver Respuesta": Muestra la respuesta en SILENCIO (sin voz)
btnToggleAnswer.addEventListener('click', () => {
  // Silent display (no voice)
  teacherGuideBox.classList.toggle('hidden');
  const isHidden = teacherGuideBox.classList.contains('hidden');
  btnToggleAnswer.textContent = isHidden ? '👁️ Ver Respuesta [R]' : '🙈 Ocultar Respuesta [R]';
});

// BOTÓN "🤖 Reflexión IA": Reproduce en voz alta con Web Speech API (voz en español latino 'es-MX' / 'es-419')
btnIaReflection.addEventListener('click', () => {
  const text = modalReflectionText.textContent;
  if (!text) return;

  aiReflectionBox.classList.remove('hidden');
  speakingIndicator.classList.remove('hidden');

  speakIA(text, () => {
    speakingIndicator.classList.remove('hidden');
  }, () => {
    speakingIndicator.classList.add('hidden');
  });
});

// Teacher Judges Answer: Correct / Incorrect (Always enabled)
btnCorrect.addEventListener('click', () => {
  socket.emit('judge-answer', { correct: true });
});

btnIncorrect.addEventListener('click', () => {
  socket.emit('judge-answer', { correct: false });
});

socket.on('answer-judged', (data) => {
  if (currentGameState) {
    currentGameState.board = data.board;
    currentGameState.teams = data.teams;
  }
  renderTeams(data.teams);
  renderBoard();

  if (data.correct) {
    sound.playCorrect();
    buzzerBanner.className = 'buzzer-banner state-active';
    buzzerHeadline.textContent = `¡RESPUESTA CORRECTA! (+${data.points} pts)`;
    buzzerSubtext.textContent = 'Presiona "Volver al Tablero" para continuar la partida.';
    teacherGuideBox.classList.remove('hidden');
  } else {
    sound.playWrong();
    buzzerBanner.className = 'buzzer-banner state-idle';
    buzzerHeadline.textContent = 'Respuesta Incorrecta';
    buzzerSubtext.textContent = 'Presiona "Activar Buzzer" para abrir el REBOTE a los demás equipos.';
    btnActivateBuzzer.disabled = false;
    removeTeamHighlight();
  }
});

// BOTÓN "Volver al Tablero": Cierra el modal y ejecuta window.speechSynthesis.cancel()
btnCloseModal.addEventListener('click', () => {
  window.speechSynthesis.cancel();
  socket.emit('close-question');
});

socket.on('question-closed', (data) => {
  if (currentGameState) currentGameState.board = data.board;
  window.speechSynthesis.cancel();
  questionModal.classList.add('hidden');
  removeTeamHighlight();
  renderBoard();
});

// Buzzer Banner States
function setBuzzerBannerIdle() {
  buzzerBanner.className = 'buzzer-banner state-idle';
  buzzerBanner.querySelector('.buzzer-status-icon').textContent = '⏸️';
  buzzerHeadline.textContent = 'Buzzer en Espera';
  buzzerSubtext.textContent = 'Lee la pregunta y presiona "Activar Buzzer".';
  buzzerReactionTime.classList.add('hidden');
}

function setBuzzerBannerActive() {
  buzzerBanner.className = 'buzzer-banner state-active';
  buzzerBanner.querySelector('.buzzer-status-icon').textContent = '⚡';
  buzzerHeadline.textContent = '¡BUZZER HABILITADO!';
  buzzerSubtext.textContent = 'Esperando a que los participantes pulsen en sus celulares...';
  buzzerReactionTime.classList.add('hidden');
}

function setBuzzerBannerBuzzed(teamData) {
  buzzerBanner.className = 'buzzer-banner state-buzzed';
  buzzerBanner.querySelector('.buzzer-status-icon').textContent = '🚨';
  buzzerHeadline.textContent = `¡${teamData.teamName.toUpperCase()} PULSÓ PRIMERO!`;
  buzzerSubtext.textContent = 'Escucha la justificación del participante.';
  const seconds = (teamData.reactionMs / 1000).toFixed(2);
  buzzerReactionTime.textContent = `${seconds}s`;
  buzzerReactionTime.classList.remove('hidden');
}

// Render Teams on Scoreboard
function renderTeams(teams) {
  const teamIds = Object.keys(teams || {});
  teamCount.textContent = teamIds.length;

  if (teamIds.length === 0) {
    teamsContainer.innerHTML = '<div class="empty-teams-msg">Esperando a que los participantes escaneen el código QR...</div>';
    return;
  }

  teamsContainer.innerHTML = '';
  teamIds.forEach(id => {
    const t = teams[id];
    const card = document.createElement('div');
    card.className = 'team-card';
    card.id = `team-card-${id}`;

    card.innerHTML = `
      <div class="team-avatar" style="background: ${t.color}">
        ${t.name.substring(0, 2).toUpperCase()}
      </div>
      <div class="team-info">
        <div class="team-name" title="${t.name}">${t.name}</div>
        <div class="team-score">${t.score}</div>
      </div>
      <div class="team-score-controls">
        <button class="btn-score-adjust" onclick="adjustScore('${id}', 100)" title="+100">+</button>
        <button class="btn-score-adjust" onclick="adjustScore('${id}', -100)" title="-100">-</button>
      </div>
    `;
    teamsContainer.appendChild(card);
  });
}

window.adjustScore = function(teamId, delta) {
  socket.emit('adjust-score', { teamId, delta });
};

function highlightTeamCard(teamId) {
  removeTeamHighlight();
  const el = document.getElementById(`team-card-${teamId}`);
  if (el) el.classList.add('buzzed');
}

function removeTeamHighlight() {
  document.querySelectorAll('.team-card').forEach(c => c.classList.remove('buzzed'));
}

// QR Modal
btnShowQr.addEventListener('click', () => {
  generateDynamicQr();
  qrModal.classList.remove('hidden');
});
btnCloseQr.addEventListener('click', () => {
  qrModal.classList.add('hidden');
});

// Final Jeopardy
btnFinalJeopardy.addEventListener('click', () => {
  if (confirm('¿Deseas iniciar la ronda de FINAL JEOPARDY: El Corte Final?')) {
    window.speechSynthesis.cancel();
    socket.emit('start-final-jeopardy');
  }
});

socket.on('final-jeopardy-started', (data) => {
  finalQuestionText.textContent = data.pregunta;
  finalBranchBText.textContent = data.opcion_branch_b;
  finalBranchAText.textContent = data.opcion_branch_a;
  finalAnswerText.textContent = data.respuesta;
  finalGuideText.textContent = data.guia_docente;
  finalReflectionText.textContent = data.reflexion_ia;

  finalGuideBox.classList.add('hidden');
  finalReflectionBox.classList.add('hidden');
  finalSpeakingIndicator.classList.add('hidden');

  finalModal.classList.remove('hidden');
});

btnFinalActivate.addEventListener('click', () => {
  socket.emit('activate-buzzer');
});
btnFinalCorrect.addEventListener('click', () => {
  socket.emit('judge-answer', { correct: true });
});
btnFinalIncorrect.addEventListener('click', () => {
  socket.emit('judge-answer', { correct: false });
});
btnFinalReveal.addEventListener('click', () => {
  finalGuideBox.classList.toggle('hidden');
});
btnFinalIa.addEventListener('click', () => {
  const text = finalReflectionText.textContent;
  if (!text) return;
  finalReflectionBox.classList.remove('hidden');
  finalSpeakingIndicator.classList.remove('hidden');

  speakIA(text, () => {
    finalSpeakingIndicator.classList.remove('hidden');
  }, () => {
    finalSpeakingIndicator.classList.add('hidden');
  });
});
btnCloseFinal.addEventListener('click', () => {
  window.speechSynthesis.cancel();
  finalModal.classList.add('hidden');
});

// Reset Game
btnReset.addEventListener('click', () => {
  if (confirm('¿Estás seguro de reiniciar los puntajes y el tablero?')) {
    window.speechSynthesis.cancel();
    socket.emit('reset-game');
  }
});

socket.on('game-reset', (data) => {
  if (currentGameState) {
    currentGameState.board = data.board;
    currentGameState.teams = data.teams;
  }
  renderTeams(data.teams);
  renderBoard();
  showToast('Partida reiniciada.');
});

// Sound Toggle & Fullscreen
btnSoundToggle.addEventListener('click', () => {
  sound.muted = !sound.muted;
  btnSoundToggle.textContent = sound.muted ? '🔇' : '🔊';
  showToast(sound.muted ? 'Sonido silenciado' : 'Sonido activado');
});

btnFullscreen.addEventListener('click', () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen().catch(() => {});
  }
});

// Keyboard Shortcuts
document.addEventListener('keydown', (e) => {
  if (!questionModal.classList.contains('hidden')) {
    if (e.code === 'Space') {
      e.preventDefault();
      socket.emit('activate-buzzer');
    } else if (e.code === 'KeyC') {
      socket.emit('judge-answer', { correct: true });
    } else if (e.code === 'KeyX') {
      socket.emit('judge-answer', { correct: false });
    } else if (e.code === 'KeyR') {
      btnToggleAnswer.click();
    } else if (e.code === 'Escape') {
      btnCloseModal.click();
    }
  }
});

// Confetti Particle System for Podium
let confettiAnimationId = null;
function startConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const pieces = [];
  const colors = ['#ffd700', '#ff4d4d', '#00e676', '#00b0ff', '#e040fb', '#ffffff', '#ff9100'];

  for (let i = 0; i < 170; i++) {
    pieces.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      size: Math.random() * 11 + 6,
      color: colors[Math.floor(Math.random() * colors.length)],
      speedY: Math.random() * 3.5 + 2.5,
      speedX: Math.random() * 2.5 - 1.25,
      rotation: Math.random() * 360,
      rotSpeed: Math.random() * 8 - 4
    });
  }

  function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach(p => {
      p.y += p.speedY;
      p.x += p.speedX;
      p.rotation += p.rotSpeed;

      if (p.y > canvas.height) {
        p.y = -20;
        p.x = Math.random() * canvas.width;
      }

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx.restore();
    });
    confettiAnimationId = requestAnimationFrame(loop);
  }
  loop();
}

function stopConfetti() {
  if (confettiAnimationId) {
    cancelAnimationFrame(confettiAnimationId);
    confettiAnimationId = null;
  }
  const canvas = document.getElementById('confetti-canvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}

// Podium Modal
btnEndGame.addEventListener('click', () => {
  if (confirm('¿Deseas finalizar la partida y coronar al ganador en el podio olímpico?')) {
    window.speechSynthesis.cancel();
    socket.emit('end-game');
  }
});

socket.on('game-ended', ({ ranking }) => {
  if (!ranking || ranking.length === 0) {
    alert('No hay participantes registrados para mostrar el podio.');
    return;
  }

  sound.playChampionFanfare();
  startConfetti();

  podiumStage.innerHTML = '';
  const top3 = ranking.slice(0, 3);

  top3.forEach(t => {
    const pillar = document.createElement('div');
    pillar.className = `podium-pillar pillar-${t.rank}`;
    const medal = t.rank === 1 ? '🥇' : (t.rank === 2 ? '🥈' : '🥉');

    pillar.innerHTML = `
      <div class="podium-team-badge">
        <div class="podium-avatar" style="background: ${t.color}">${t.name.substring(0, 2).toUpperCase()}</div>
        <div class="podium-name" title="${t.name}">${medal} ${t.name}</div>
        <div class="podium-score">${t.score} pts</div>
      </div>
      <div class="pillar-block">
        <span class="rank-number">#${t.rank}</span>
      </div>
    `;
    podiumStage.appendChild(pillar);
  });

  otherTeamsList.innerHTML = '';
  const others = ranking.slice(3);
  if (others.length > 0) {
    others.forEach(t => {
      const chip = document.createElement('div');
      chip.className = 'other-team-chip';
      chip.innerHTML = `<span>#${t.rank}</span> <span>${t.name}:</span> <strong>${t.score} pts</strong>`;
      otherTeamsList.appendChild(chip);
    });
  }

  podiumModal.classList.remove('hidden');
});

btnClosePodium.addEventListener('click', () => {
  stopConfetti();
  podiumModal.classList.add('hidden');
});

btnNewGame.addEventListener('click', () => {
  stopConfetti();
  podiumModal.classList.add('hidden');
  socket.emit('reset-game');
});
