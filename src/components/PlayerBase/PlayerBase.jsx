import React, { useState } from 'react';
import './PlayerBase.css';
import Token from '../Token/Token';
import Dice from '../Dice/Dice';
import { STICKERS } from '../../utils/stickers';
import { MessageCircle } from 'lucide-react';

const PlayerBase = ({ color, position, tokens, turn, diceRolled, diceValue, onMoveToken, isValidMove, activeColors, myColor, isRolling, players, activeStickers, playSticker, rollId, onRoll, isOnline, setIsRolling, missedTurns, winners = [] }) => {
  const [showStickerMenu, setShowStickerMenu] = useState(false);
  const isActive = activeColors.includes(color);
  const finishedPosition = winners.indexOf(color); // -1 if not finished
  const hasFinished = finishedPosition !== -1;
  const player = players?.find(p => p.color === color);
  const displayName = player?.playerName || `${color} player`;
  const baseTokens = isActive && tokens ? tokens.filter(t => t.color === color && t.distance === -1) : [];
  const POSITION_MEDALS = ['🥇', '🥈', '🥉', '4️⃣'];
  
  // Determine grid area based on position
  let gridArea = '';
  const isLeft = position === 'top-left' || position === 'bottom-left';

  switch (position) {
    case 'top-left':
      gridArea = '1 / 1 / 7 / 7';
      break;
    case 'top-right':
      gridArea = '1 / 10 / 7 / 16';
      break;
    case 'bottom-left':
      gridArea = '10 / 1 / 16 / 7';
      break;
    case 'bottom-right':
      gridArea = '10 / 10 / 16 / 16';
      break;
    default:
      break;
  }

  const handlePlaySticker = (sticker) => {
    playSticker(`/Stickers/${sticker}`, color);
    setShowStickerMenu(false);
  };

  const myPlayedStickers = activeStickers?.filter(s => s.color === color) || [];
  const playerMissedTurns = missedTurns?.[color] || 0;

  return (
    <div 
      className={`player-base base-${color} ${!isActive ? 'inactive' : ''}`} 
      style={{ gridArea, position: 'relative' }}
    >
      {isActive && (
        <div className="player-label">
          {displayName.toUpperCase()} {myColor === color ? '(YOU)' : ''}
          {hasFinished ? (
            <span className="finish-badge">{POSITION_MEDALS[finishedPosition]} Finished!</span>
          ) : (
            <div className="missed-turns-container">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className={`missed-turn-dot ${i < playerMissedTurns ? 'lost' : 'active'}`}
                  title={`${3 - playerMissedTurns} chances remaining`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Chat Icon & Menu - Only for the active local player, or all players if offline */}
      {isActive && (!myColor || myColor === color) && (
        <div className={`chat-icon-container ${isLeft ? 'left-side' : 'right-side'}`}>
          <button 
            className="chat-icon-btn glass" 
            onClick={() => setShowStickerMenu(!showStickerMenu)}
            title="Send Sticker"
          >
            <MessageCircle size={24} color="#fff" />
          </button>
          
          {showStickerMenu && (
            <div className={`sticker-menu glass-dark ${isLeft ? 'menu-left' : 'menu-right'}`}>
              <div className="sticker-grid">
                {STICKERS.map(sticker => (
                  <img 
                    key={sticker} 
                    src={`/Stickers/${sticker}`} 
                    alt="sticker" 
                    className="sticker-item"
                    onClick={() => handlePlaySticker(sticker)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Display played stickers */}
      {myPlayedStickers.length > 0 && (
        <div className={`played-stickers-container ${isLeft ? 'played-left' : 'played-right'}`}>
          {myPlayedStickers.map(sticker => (
            <img key={sticker.id} src={sticker.stickerUrl} alt="played sticker" className="played-sticker-img" />
          ))}
        </div>
      )}

      {/* Dice Section: show for active turn players only (skip if player has finished) */}
      {isActive && turn === color && !hasFinished && (
        <div className={`player-dice-container ${isLeft ? 'dice-left' : 'dice-right'}`}>
          <div className="player-dice-wrapper">
            <Dice
              onRoll={onRoll}
              disabled={diceRolled || (isOnline && turn !== myColor)}
              forceValue={diceValue}
              rollId={rollId}
              onRollingStateChange={setIsRolling}
            />
          </div>
        </div>
      )}

      <div className="base-inner">
        {isActive && [0, 1, 2, 3].map((i) => {
          const token = baseTokens[i];
          const isMyTurn = turn === color;
          const isClickable = token && isMyTurn && diceRolled && !isRolling && isValidMove(token, diceValue);
          
          return (
            <div key={i} className="token-slot">
              {token && (
                <Token 
                  color={color} 
                  onClick={() => isClickable && onMoveToken(token.id)}
                  highlight={isClickable}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PlayerBase;
