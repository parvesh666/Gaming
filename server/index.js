const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const LudoGame = require('./gameLogic');

const app = express();
app.use(cors());

// Health check route so the browser doesn't show a 404
app.get('/', (req, res) => {
  res.send('Ludo Multiplayer Server is running and listening for socket connections!');
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*', // For development, allow all origins
    methods: ['GET', 'POST']
  }
});

const rooms = {};
const sessions = {};

const generateRoomCode = () => {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
};

io.on('connection', (socket) => {
  let currentSessionId = null;

  socket.on('register_session', ({ sessionId }, callback) => {
    currentSessionId = sessionId;
    
    if (sessions[sessionId] && sessions[sessionId].roomId) {
      const roomId = sessions[sessionId].roomId;
      const room = rooms[roomId];
      
      if (room && room.state === 'playing') {
        const player = room.players.find(p => p.sessionId === sessionId);
        if (player) {
          player.socketId = socket.id;
          player.connected = true;
          socket.join(roomId);
          
          io.to(roomId).emit('room_updated', room);
          
          // Slight delay to let frontend mount board before sending state
          setTimeout(() => {
             socket.emit('game_state_update', room.game.getState());
          }, 500);

          return callback({ restored: true, roomId, roomData: room });
        }
      }
    }
    
    sessions[sessionId] = { socketId: socket.id, roomId: null };
    callback({ restored: false });
  });

  socket.on('create_room', ({ playerCount }, callback) => {
    const roomId = generateRoomCode();
    rooms[roomId] = {
      playerCount,
      players: [{ socketId: socket.id, sessionId: currentSessionId, host: true, connected: true }],
      state: 'lobby'
    };
    if (currentSessionId) sessions[currentSessionId].roomId = roomId;
    
    socket.join(roomId);
    callback({ success: true, roomId, roomData: rooms[roomId] });
  });

  socket.on('join_room', ({ roomId }, callback) => {
    roomId = roomId.toUpperCase();
    const room = rooms[roomId];
    
    if (!room) {
      return callback({ success: false, message: 'Room not found' });
    }
    if (room.players.length >= room.playerCount) {
      return callback({ success: false, message: 'Room is full' });
    }
    if (room.state !== 'lobby') {
      return callback({ success: false, message: 'Game already started' });
    }
    if (room.players.some(p => p.sessionId === currentSessionId)) {
      return callback({ success: false, message: 'Already in room' });
    }

    room.players.push({ socketId: socket.id, sessionId: currentSessionId, host: false, connected: true });
    if (currentSessionId) sessions[currentSessionId].roomId = roomId;
    
    socket.join(roomId);
    io.to(roomId).emit('room_updated', room);
    
    callback({ success: true, roomId, roomData: room });
  });

  socket.on('start_online_game', ({ roomId }) => {
    const room = rooms[roomId];
    if (room && room.players[0].socketId === socket.id) {
      room.state = 'playing';
      room.game = new LudoGame(room.playerCount);
      
      room.players.forEach((p, index) => {
        p.color = room.game.activeColors[index];
      });

      io.to(roomId).emit('game_started', {
        gameState: room.game.getState(),
        players: room.players
      });
    }
  });

  socket.on('request_roll', ({ roomId }) => {
    const room = rooms[roomId];
    if (!room || room.state !== 'playing') return;

    const player = room.players.find(p => p.socketId === socket.id);
    if (!player) return;

    const result = room.game.rollDice(player.color);
    if (result) {
      io.to(roomId).emit('dice_rolled', { val: result.val, threeSixesPenalty: result.threeSixesPenalty });
      io.to(roomId).emit('game_state_update', room.game.getState());

      if (result.threeSixesPenalty || !result.hasValidMove) {
        setTimeout(() => {
          room.game.nextTurn();
          io.to(roomId).emit('game_state_update', room.game.getState());
        }, 1500);
      }
    }
  });

  socket.on('request_move', ({ roomId, tokenId }) => {
    const room = rooms[roomId];
    if (!room || room.state !== 'playing') return;

    const player = room.players.find(p => p.socketId === socket.id);
    if (!player) return;

    const tokenBefore = room.game.tokens.find(t => t.id === tokenId);
    const from = tokenBefore ? tokenBefore.distance : -1;

    const result = room.game.moveToken(tokenId, player.color);
    if (result !== false) {
      const to = room.game.tokens.find(t => t.id === tokenId).distance;
      
      // Consume dice immediately to prevent double-move exploits
      room.game.diceValue = null;

      // Emit token_moved so clients can animate before applying state
      io.to(roomId).emit('token_moved', { tokenId, from, to, gameState: room.game.getState() });

      if (result.hasWon) return;

      const animSteps = to - from > 0 ? (to - from) : 1;
      const animTime = (animSteps * 250) + 200;

      setTimeout(() => {
        if (!result.extraTurn) {
          room.game.nextTurn();
        } else {
          room.game.diceRolled = false;
        }
        io.to(roomId).emit('game_state_update', room.game.getState());
      }, animTime);
    }
  });

  socket.on('leave_game', ({ roomId }) => {
    const room = rooms[roomId];
    if (!room) return;

    const playerIndex = room.players.findIndex(p => p.socketId === socket.id);
    if (playerIndex !== -1) {
      const player = room.players[playerIndex];
      
      if (room.state === 'playing') {
        room.game.removePlayer(player.color);
        room.players.splice(playerIndex, 1);
        
        io.to(roomId).emit('player_left', { color: player.color });
        io.to(roomId).emit('game_state_update', room.game.getState());
        
        if (room.players.length === 0) {
          delete rooms[roomId];
        } else {
          io.to(roomId).emit('room_updated', room);
        }
      } else if (room.state === 'lobby') {
        room.players.splice(playerIndex, 1);
        if (room.players.length === 0) {
          delete rooms[roomId];
        } else {
          if (!room.players.some(p => p.host)) {
            room.players[0].host = true;
          }
          io.to(roomId).emit('room_updated', room);
        }
      }
      
      socket.leave(roomId);

      if (currentSessionId && sessions[currentSessionId]) {
        sessions[currentSessionId].roomId = null;
      }
    }
  });

  socket.on('disconnect', () => {
    if (currentSessionId && sessions[currentSessionId]) {
      const roomId = sessions[currentSessionId].roomId;
      const room = rooms[roomId];
      
      if (room) {
        const player = room.players.find(p => p.sessionId === currentSessionId);
        if (player) {
          player.connected = false;
          io.to(roomId).emit('room_updated', room);
          
          if (room.state === 'lobby') {
            const playerIndex = room.players.indexOf(player);
            room.players.splice(playerIndex, 1);
            sessions[currentSessionId].roomId = null;
            
            if (room.players.length === 0) {
              delete rooms[roomId];
            } else {
              if (!room.players.some(p => p.host)) {
                room.players[0].host = true;
              }
              io.to(roomId).emit('room_updated', room);
            }
          }
        }
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
