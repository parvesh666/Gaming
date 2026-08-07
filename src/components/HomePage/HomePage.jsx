import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Users2, Globe, Monitor, Play, Copy, Check } from 'lucide-react';
import './HomePage.css';

const HomePage = ({ onStartGame, socket }) => {
  const [mode, setMode] = useState('select'); // 'select', 'local_setup', 'online_setup', 'lobby'
  const [roomData, setRoomData] = useState(null);
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!socket) return;

    socket.on('room_updated', (updatedRoom) => {
      setRoomData(updatedRoom);
    });

    socket.on('game_started', () => {
      // In a full implementation, we'd transition to an online game state here
      // For now, this bridges to the local game state for UI testing
      onStartGame(roomData.playerCount, true); 
    });

    return () => {
      socket.off('room_updated');
      socket.off('game_started');
    };
  }, [socket, roomData, onStartGame]);

  const handleCreateRoom = (count) => {
    if (!socket) return;
    socket.emit('create_room', { playerCount: count }, (response) => {
      if (response.success) {
        setRoomData(response.roomData);
        setMode('lobby');
        setError('');
      }
    });
  };

  const handleJoinRoom = (e) => {
    e.preventDefault();
    if (!socket || !joinCode.trim()) return;
    
    socket.emit('join_room', { roomId: joinCode }, (response) => {
      if (response.success) {
        setRoomData(response.roomData);
        setMode('lobby');
        setError('');
      } else {
        setError(response.message);
      }
    });
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomData?.roomId || joinCode); // roomId comes from response, wait, roomId is not in roomData. I need to get it.
    // Actually, in the server response, roomId is returned alongside roomData.
  };

  // Wait, I need to make sure I store the roomId. Let's add roomId to state.
  const [roomId, setRoomId] = useState('');

  const createRoomCallback = (response) => {
    if (response.success) {
      setRoomData(response.roomData);
      setRoomId(response.roomId);
      setMode('lobby');
      setError('');
    }
  };

  const joinRoomCallback = (response) => {
    if (response.success) {
      setRoomData(response.roomData);
      setRoomId(response.roomId);
      setMode('lobby');
      setError('');
    } else {
      setError(response.message);
    }
  };

  const handleCreate = (count) => {
    socket.emit('create_room', { playerCount: count }, createRoomCallback);
  };

  const handleJoin = (e) => {
    e.preventDefault();
    socket.emit('join_room', { roomId: joinCode }, joinRoomCallback);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const startGame = () => {
    socket.emit('start_online_game', { roomId }); 
    onStartGame(roomData.playerCount, true, roomId); 
  };

  return (
    <div className="home-page glass-dark">
      <div className="hero-section">
        <h1 className="title">Ludo</h1>
        <p className="subtitle">Real-time Multiplayer Edition</p>
      </div>

      {mode === 'select' && (
        <div className="mode-selection">
          <button className="mode-btn glass" onClick={() => setMode('local_setup')}>
            <Monitor size={48} />
            <span>Local Game</span>
            <small>Play on this device</small>
          </button>
          
          <button className="mode-btn glass" onClick={() => setMode('online_setup')}>
            <Globe size={48} />
            <span>Play Online</span>
            <small>Play with friends</small>
          </button>
        </div>
      )}

      {mode === 'local_setup' && (
        <div className="setup-section">
          <h2>Select Players</h2>
          <div className="mode-selection">
            <button className="mode-btn glass" onClick={() => onStartGame(2, false)}>
              <Users2 size={32} />
              <span>2 Players</span>
            </button>
            <button className="mode-btn glass" onClick={() => onStartGame(3, false)}>
              <UserPlus size={32} />
              <span>3 Players</span>
            </button>
            <button className="mode-btn glass" onClick={() => onStartGame(4, false)}>
              <Users size={32} />
              <span>4 Players</span>
            </button>
          </div>
          <button className="back-btn-home glass" onClick={() => setMode('select')}>Back to Menu</button>
        </div>
      )}

      {mode === 'online_setup' && (
        <div className="setup-section">
          <h2>Create or Join Room</h2>
          
          <div className="online-forms">
            <div className="create-room-box glass">
              <h3>Create Room</h3>
              <div className="player-counts">
                <button onClick={() => handleCreate(2)}>2P</button>
                <button onClick={() => handleCreate(3)}>3P</button>
                <button onClick={() => handleCreate(4)}>4P</button>
              </div>
            </div>

            <div className="divider">OR</div>

            <form className="join-room-box glass" onSubmit={handleJoin}>
              <h3>Join Room</h3>
              <input 
                type="text" 
                placeholder="4-LETTER CODE" 
                value={joinCode} 
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={4}
              />
              <button type="submit">Join Match</button>
              {error && <p className="error-text">{error}</p>}
            </form>
          </div>
          <button className="back-btn-home glass" onClick={() => setMode('select')}>Back to Menu</button>
        </div>
      )}

      {mode === 'lobby' && roomData && (
        <div className="lobby-section glass">
          <h2>Game Lobby</h2>
          
          <div className="room-code-display">
            <strong className="room-id">{roomId}</strong>
            <button onClick={handleCopy} className="copy-btn" title="Copy Code">
              {copied ? <Check size={28} color="#4ade80" /> : <Copy size={28} />}
            </button>
          </div>

          <div className="players-list">
            <h3 style={{textAlign: 'center', marginBottom: '16px'}}>
              Players ({roomData.players.length}/{roomData.playerCount})
            </h3>
            
            <div className="players-grid">
              {Array.from({ length: roomData.playerCount }).map((_, i) => {
                const player = roomData.players[i];
                if (player) {
                  return (
                    <div key={i} className={`player-slot filled ${player.socketId === socket?.id ? 'is-me' : ''}`}>
                      <Users size={24} />
                      <span>Player {i + 1} {player.socketId === socket?.id && '(You)'}</span>
                      {player.host && <span className="host-badge">HOST</span>}
                    </div>
                  );
                } else {
                  return (
                    <div key={i} className="player-slot">
                      <UserPlus size={24} opacity={0.5} />
                      <span>Waiting...</span>
                    </div>
                  );
                }
              })}
            </div>
          </div>

          <div style={{marginTop: '16px'}}>
            {roomData.players.length === roomData.playerCount ? (
              roomData.players.find(p => p.socketId === socket?.id)?.host ? (
                <button className="start-game-btn" onClick={startGame}>
                  <Play size={24} /> Launch Game
                </button>
              ) : (
                <p className="waiting-pulse">Waiting for host to start...</p>
              )
            ) : (
              <p className="waiting-pulse">Waiting for more players to join...</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;
