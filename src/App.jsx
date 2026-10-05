
import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import Board from './components/Board/Board';
import HomePage from './components/HomePage/HomePage';
import { useGameLogic, getTokenCoordinates } from './hooks/useGameLogic';
import { STICKER_DURATIONS } from './utils/stickers';
import './App.css';

function App() {
  const [gameState, setGameState] = useState('home'); // 'home' | 'game'
  const [playerCount, setPlayerCount] = useState(4);
  const [isOnline, setIsOnline] = useState(false);
  const [roomId, setRoomId] = useState(null);
  const [socket, setSocket] = useState(null);
  const [myColor, setMyColor] = useState(null);
  const [notification, setNotification] = useState('');
  const [isRolling, setIsRolling] = useState(false);
  const [players, setPlayers] = useState([]);
  const [activeStickers, setActiveStickers] = useState([]);
  
  useEffect(() => {
    let sessionId = localStorage.getItem('ludo_session');
    let playerName = localStorage.getItem('playerName');
    if (!sessionId) {
      sessionId = Math.random().toString(36).substring(2, 15);
      localStorage.setItem('ludo_session', sessionId);
    }

    const newSocket = io('https://gaming-6kav.onrender.com');
    setSocket(newSocket);
    
    newSocket.on('connect', () => {
      newSocket.emit('register_session', { sessionId, playerName }, (response) => {
        if (response.restored) {
          const me = response.roomData.players.find(p => p.socketId === newSocket.id);
          setMyColor(me ? me.color : null);
          setPlayerCount(response.roomData.playerCount);
          setPlayers(response.roomData.players);
          setIsOnline(true);
          setRoomId(response.roomId);
          setGameState('game');
        }
      });
    });

    return () => newSocket.close();
  }, []);

  useEffect(() => {
    if (socket) {
      const handlePlayerLeft = ({ color }) => {
        setNotification(`Player ${color.toUpperCase()} has left the game!`);
        setTimeout(() => setNotification(''), 3000);
      };
      const handleStickerPlayed = (data) => {
        const id = Math.random().toString();
        setActiveStickers(prev => {
          const filtered = prev.filter(s => s.color !== data.color);
          return [...filtered, { ...data, id }];
        });
        
        // Extract filename and get duration
        const filename = data.stickerUrl.split('/').pop();
        const duration = STICKER_DURATIONS[filename] || 5000;
        // Play at least 5s, but cap at 15s to prevent stuck memes due to malformed files
        const playTime = Math.min(Math.max(5000, duration), 15000);
        
        setTimeout(() => {
          setActiveStickers(prev => prev.filter(s => s.id !== id));
        }, playTime);
      };

      socket.on('player_left', handlePlayerLeft);
      socket.on('sticker_played', handleStickerPlayed);
      return () => {
        socket.off('player_left', handlePlayerLeft);
        socket.off('sticker_played', handleStickerPlayed);
      };
    }
  }, [socket]);

  const handleStartGame = (count, online = false, roomCode = null, color = null, currentPlayers = []) => {
    setPlayerCount(count);
    setIsOnline(online);
    setRoomId(roomCode);
    setMyColor(color);
    setPlayers(currentPlayers);
    setGameState('game');
  };

  const playSticker = (stickerUrl, playerColor) => {
    if (isOnline && socket) {
      socket.emit('play_sticker', { roomId, stickerUrl });
    } else {
      const id = Math.random().toString();
      const color = playerColor || myColor || turn;
      setActiveStickers(prev => {
        const filtered = prev.filter(s => s.color !== color);
        return [...filtered, { color, stickerUrl, id, timestamp: Date.now() }];
      });
      
      const filename = stickerUrl.split('/').pop();
      const duration = STICKER_DURATIONS[filename] || 5000;
      const playTime = Math.min(Math.max(5000, duration), 15000);
      
      setTimeout(() => {
        setActiveStickers(prev => prev.filter(s => s.id !== id));
      }, playTime);
    }
  };

  const {
    tokens,
    turn,
    diceValue,
    diceRolled,
    rollId,
    winner,
    rollDice,
    moveToken,
    isValidMove,
    activeColors,
    missedTurns
  } = useGameLogic(playerCount, isOnline, socket, roomId, myColor);

  // Determine if all tokens for the current player are in the base
  const myTokens = tokens.filter(t => t.color === turn);
  const allInBase = myTokens.every(t => t.distance === -1);

  if (gameState === 'home') {
    return (
      <div className="app-container">
        <HomePage onStartGame={handleStartGame} socket={socket} />
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="app-header glass-dark" style={{ position: 'relative' }}>
        <h1>Ludo</h1>
        <button 
          onClick={() => { 
            if (isOnline && socket) {
              socket.emit('leave_game', { roomId });
            }
            localStorage.removeItem('ludo_session');
            setGameState('home'); 
            window.location.reload(); 
          }} 
          className="back-btn glass"
        >
          Quit Game
        </button>
      </header>
      
      <main className="game-area">
        {notification && (
          <div className="notification glass-dark" style={{ position: 'absolute', top: '10px', left: '50%', transform: 'translateX(-50%)', padding: '10px 20px', borderRadius: '8px', zIndex: 1000, color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }}>
            {notification}
          </div>
        )}
        {winner ? (
          <div className="winner-banner glass">
            <h2>Player {winner.toUpperCase()} Wins!</h2>
            <button onClick={() => window.location.reload()} className="restart-btn">Play Again</button>
          </div>
        ) : (
          <div className="game-content">
            <Board 
              tokens={tokens} 
              turn={turn} 
              onMoveToken={moveToken} 
              isValidMove={isValidMove}
              diceValue={diceValue}
              diceRolled={diceRolled}
              activeColors={activeColors}
              myColor={myColor}
              isRolling={isRolling}
              players={players}
              activeStickers={activeStickers}
              playSticker={playSticker}
              rollId={rollId}
              onRoll={rollDice}
              isOnline={isOnline}
              setIsRolling={setIsRolling}
              missedTurns={missedTurns}
            />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
