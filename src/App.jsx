import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import Board from './components/Board/Board';
import Controls from './components/Controls/Controls';
import HomePage from './components/HomePage/HomePage';
import { useGameLogic, getTokenCoordinates } from './hooks/useGameLogic';
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
      socket.on('player_left', handlePlayerLeft);
      return () => socket.off('player_left', handlePlayerLeft);
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
    activeColors
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
            />
            <Controls 
              turn={turn} 
              diceValue={diceValue} 
              diceRolled={diceRolled} 
              rollId={rollId}
              onRoll={rollDice}
              isMyTurn={!isOnline || turn === myColor}
              setIsRolling={setIsRolling}
              players={players}
            />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
