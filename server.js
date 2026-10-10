const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

const PORT = process.env.PORT || 3000;

// Load questions from public/preguntas.json (fallback to root preguntas.json)
let questionsPath = path.join(__dirname, 'public', 'preguntas.json');
if (!fs.existsSync(questionsPath)) {
  questionsPath = path.join(__dirname, 'preguntas.json');
}
const questionsData = JSON.parse(fs.readFileSync(questionsPath, 'utf8'));

// Global Game State
const gameState = {
  teams: {},
  board: [],
  currentQuestion: null,
  buzzerState: 'idle', // 'idle' | 'active' | 'buzzed'
  buzzerActivatedAt: null,
  buzzedTeam: null,
  attemptedTeams: [],
  isFinalJeopardy: false
};

// Initialize Jeopardy Board (5x5 matrix initialized to false)
function initBoard() {
  gameState.board = questionsData.categorias.map(cat => cat.preguntas.map(() => false));
  gameState.currentQuestion = null;
  gameState.buzzerState = 'idle';
  gameState.buzzerActivatedAt = null;
  gameState.buzzedTeam = null;
  gameState.attemptedTeams = [];
  gameState.isFinalJeopardy = false;
}
initBoard();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

// Explicit route endpoints
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/buzzer', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'buzzer.html'));
});

app.get('/buzzer.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'buzzer.html'));
});

// API Routes
app.get('/api/questions', (req, res) => {
  res.json(questionsData);
});

app.get('/api/state', (req, res) => {
  res.json({
    teams: gameState.teams,
    board: gameState.board,
    currentQuestion: gameState.currentQuestion,
    buzzerState: gameState.buzzerState,
    buzzedTeam: gameState.buzzedTeam,
    attemptedTeams: gameState.attemptedTeams,
    isFinalJeopardy: gameState.isFinalJeopardy
  });
});

// Dynamic QR code API endpoint
app.get('/api/qr', async (req, res) => {
  try {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers['x-forwarded-host'] || req.get('host');
    const targetUrl = req.query.url || `${protocol}://${host}/buzzer.html`;
    const qrDataUrl = await QRCode.toDataURL(targetUrl, {
      margin: 2,
      width: 320,
      color: {
        dark: '#0a192f',
        light: '#ffffff'
      }
    });
    res.json({ url: targetUrl, qrCodeDataUrl: qrDataUrl });
  } catch (err) {
    res.status(500).json({ error: 'Error generating QR code', details: err.message });
  }
});

// Helper to register / reconnect team
function handleRegisterTeam(socket, teamName) {
  const cleanName = (teamName || '').trim();
  if (!cleanName) return;

  let existingId = Object.keys(gameState.teams).find(
    id => gameState.teams[id].name.toLowerCase() === cleanName.toLowerCase()
  );

  const teamId = existingId || socket.id;
  if (!gameState.teams[teamId]) {
    const colors = [
      '#e63946', '#2a9d8f', '#e76f51', '#457b9d',
      '#9b5de5', '#00bbf9', '#f15bb5', '#fee440',
      '#10b981', '#f97316'
    ];
    const colorIndex = Object.keys(gameState.teams).length % colors.length;
    gameState.teams[teamId] = {
      id: teamId,
      name: cleanName,
      score: 0,
      color: colors[colorIndex],
      connected: true
    };
  } else {
    gameState.teams[teamId].connected = true;
    gameState.teams[teamId].name = cleanName;
  }

  socket.teamId = teamId;
  socket.join('team-' + teamId);

  socket.emit('team-registered', {
    team: gameState.teams[teamId],
    gameState: {
      buzzerState: gameState.buzzerState,
      buzzedTeam: gameState.buzzedTeam,
      isAttempted: gameState.attemptedTeams.includes(teamId),
      currentQuestionPoints: gameState.currentQuestion ? gameState.currentQuestion.puntos : null
    }
  });

  io.emit('teams-updated', gameState.teams);
  console.log(`[+] Participante conectado: "${cleanName}" (${teamId})`);
}

// Socket.IO Events
io.on('connection', (socket) => {
  // Join Host
  socket.on('join-host', () => {
    socket.join('host');
    socket.emit('init-host', {
      questions: questionsData,
      gameState
    });
  });

  // Mobile client joins game (supports both 'join-game' and 'register-team')
  socket.on('join-game', (data) => {
    handleRegisterTeam(socket, data?.name || data?.teamName);
  });

  socket.on('register-team', (data) => {
    handleRegisterTeam(socket, data?.name || data?.teamName);
  });

  // Host opens a question
  socket.on('open-question', ({ catIndex, qIndex }) => {
    const cat = questionsData.categorias[catIndex];
    if (!cat || !cat.preguntas[qIndex]) return;

    const q = cat.preguntas[qIndex];
    gameState.currentQuestion = {
      catIndex,
      qIndex,
      categoria: cat.nombre,
      puntos: q.puntos,
      pregunta: q.pregunta,
      opcion_branch_b: q.opcion_branch_b,
      opcion_branch_a: q.opcion_branch_a,
      respuesta: q.respuesta,
      reflexion_ia: q.reflexion_ia,
      guia_docente: q.guia_docente
    };
    gameState.buzzerState = 'idle';
    gameState.buzzedTeam = null;
    gameState.attemptedTeams = [];
    gameState.buzzerActivatedAt = null;

    io.emit('question-opened', gameState.currentQuestion);
  });

  // Host activates the buzzer
  socket.on('activate-buzzer', () => {
    if (!gameState.currentQuestion && !gameState.isFinalJeopardy) return;

    gameState.buzzerState = 'active';
    gameState.buzzerActivatedAt = Date.now();
    gameState.buzzedTeam = null;

    io.emit('buzzer-activated', {
      attemptedTeams: gameState.attemptedTeams,
      timestamp: gameState.buzzerActivatedAt
    });
  });

  // Mobile student presses buzzer
  socket.on('press-buzzer', () => {
    const teamId = socket.teamId;
    if (!teamId || !gameState.teams[teamId]) return;

    if (gameState.buzzerState === 'active' && !gameState.attemptedTeams.includes(teamId)) {
      gameState.buzzerState = 'buzzed';
      const reactionMs = Date.now() - (gameState.buzzerActivatedAt || Date.now());

      gameState.buzzedTeam = {
        teamId: teamId,
        teamName: gameState.teams[teamId].name,
        color: gameState.teams[teamId].color,
        reactionMs: reactionMs
      };

      io.emit('team-buzzed', gameState.buzzedTeam);
      console.log(`[!] Buzzer presionado por: ${gameState.teams[teamId].name} (${reactionMs} ms)`);
    }
  });

  // Teacher judges answer (Correct / Incorrect)
  socket.on('judge-answer', ({ correct, teamId: customTeamId }) => {
    if (!gameState.currentQuestion) return;

    const targetTeamId = customTeamId || (gameState.buzzedTeam ? gameState.buzzedTeam.teamId : null);
    const points = gameState.currentQuestion.puntos === 'FINAL' ? 500 : (Number(gameState.currentQuestion.puntos) || 100);

    if (correct) {
      if (targetTeamId && gameState.teams[targetTeamId]) {
        gameState.teams[targetTeamId].score += points;
      }
      if (gameState.currentQuestion.catIndex !== undefined && gameState.currentQuestion.qIndex !== undefined) {
        gameState.board[gameState.currentQuestion.catIndex][gameState.currentQuestion.qIndex] = true;
      }
      gameState.buzzerState = 'idle';

      io.emit('answer-judged', {
        correct: true,
        teamId: targetTeamId,
        points: points,
        teams: gameState.teams,
        board: gameState.board,
        respuesta: gameState.currentQuestion.respuesta
      });
    } else {
      if (targetTeamId) {
        gameState.attemptedTeams.push(targetTeamId);
      }
      gameState.buzzedTeam = null;
      gameState.buzzerState = 'idle';

      io.emit('answer-judged', {
        correct: false,
        teamId: targetTeamId,
        points: 0,
        teams: gameState.teams,
        board: gameState.board,
        attemptedTeams: gameState.attemptedTeams
      });
    }
  });

  // Teacher manually updates score
  socket.on('update-score', ({ teamId, delta, score }) => {
    if (gameState.teams[teamId]) {
      if (typeof score === 'number') {
        gameState.teams[teamId].score = score;
      } else if (typeof delta === 'number') {
        gameState.teams[teamId].score += delta;
      }
      io.emit('teams-updated', gameState.teams);
    }
  });

  // Alias adjust-score
  socket.on('adjust-score', ({ teamId, delta }) => {
    if (gameState.teams[teamId] && typeof delta === 'number') {
      gameState.teams[teamId].score += delta;
      io.emit('teams-updated', gameState.teams);
    }
  });

  // Close question modal
  socket.on('close-question', () => {
    gameState.currentQuestion = null;
    gameState.buzzerState = 'idle';
    gameState.buzzedTeam = null;
    gameState.attemptedTeams = [];
    io.emit('question-closed', { board: gameState.board });
  });

  // Reset entire game
  socket.on('reset-game', () => {
    initBoard();
    Object.keys(gameState.teams).forEach(id => {
      gameState.teams[id].score = 0;
    });
    io.emit('game-reset', {
      teams: gameState.teams,
      board: gameState.board
    });
    console.log('[*] Tablero y puntajes reiniciados.');
  });

  // Final Jeopardy
  socket.on('start-final-jeopardy', () => {
    gameState.isFinalJeopardy = true;
    gameState.currentQuestion = {
      categoria: questionsData.final_jeopardy.categoria,
      puntos: 'FINAL',
      pregunta: questionsData.final_jeopardy.pregunta,
      opcion_branch_b: questionsData.final_jeopardy.opcion_branch_b,
      opcion_branch_a: questionsData.final_jeopardy.opcion_branch_a,
      respuesta: questionsData.final_jeopardy.respuesta_esperada,
      reflexion_ia: questionsData.final_jeopardy.reflexion_ia,
      guia_docente: questionsData.final_jeopardy.guia_docente
    };
    gameState.buzzerState = 'idle';
    gameState.buzzedTeam = null;
    gameState.attemptedTeams = [];
    io.emit('final-jeopardy-started', gameState.currentQuestion);
  });

  // End Game & Champion Podium
  socket.on('end-game', () => {
    const sorted = Object.values(gameState.teams).sort((a, b) => b.score - a.score);
    const ranking = sorted.map((t, idx) => ({
      ...t,
      rank: idx + 1
    }));
    io.emit('game-ended', { ranking });
  });

  // Disconnect
  socket.on('disconnect', () => {
    if (socket.teamId && gameState.teams[socket.teamId]) {
      gameState.teams[socket.teamId].connected = false;
      io.emit('teams-updated', gameState.teams);
    }
  });
});

// Start Server
server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🎬 JEOPARDY: EDUCACIÓN FINANCIERA - ESTUDIO A`);
  console.log(`   (Branch A vs Branch B - El Set de Cine)`);
  console.log(`======================================================`);
  console.log(`🖥️  Host / Proyector: http://localhost:${PORT}`);
  console.log(`📱 Pulsador Celulares: http://localhost:${PORT}/buzzer.html`);
  console.log(`======================================================\n`);
});
