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
  
  useEffect(() => {
    let sessionId = localStorage.getItem('ludo_session');
    if (!sessionId) {
      sessionId = Math.random().toString(36).substring(2, 15);
      localStorage.setItem('ludo_session', sessionId);
    }

    const newSocket = io('https://gaming-6kav.onrender.com');
    setSocket(newSocket);
    
    newSocket.on('connect', () => {
      newSocket.emit('register_session', { sessionId }, (response) => {
        if (response.restored) {
          setPlayerCount(response.roomData.playerCount);
          setIsOnline(true);
          setRoomId(response.roomId);
          setGameState('game');
        }
      });
    });

    return () => newSocket.close();
  }, []);

  const handleStartGame = (count, online = false, roomCode = null) => {
    setPlayerCount(count);
    setIsOnline(online);
    setRoomId(roomCode);
    setGameState('game');
  };
  const {
    tokens,
    turn,
    diceValue,
    diceRolled,
    winner,
    rollDice,
    moveToken,
    isValidMove,
    activeColors
  } = useGameLogic(playerCount, isOnline, socket, roomId);

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
          onClick={() => { setGameState('home'); window.location.reload(); }} 
          className="back-btn glass"
        >
          Quit Game
        </button>
      </header>
      
      <main className="game-area">
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
            />
            <Controls 
              turn={turn} 
              diceValue={diceValue} 
              diceRolled={diceRolled} 
              onRoll={rollDice}
              boostSix={allInBase}
            />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
