const { COLORS, START_INDICES, SAFE_POSITIONS, BOARD_PATH, HOME_STRETCHES } = require('./constants');

class LudoGame {
  constructor(playerCount) {
    this.playerCount = playerCount;
    this.activeColors = this.getActiveColors(playerCount);
    this.tokens = this.getInitialTokens();
    this.turn = this.activeColors[0];
    this.diceValue = null;
    this.diceRolled = false;
    this.winner = null;
    this.consecutiveSixes = 0;
    this.missedTurns = {};
  }

  getActiveColors(count) {
    if (count === 2) return [COLORS.RED, COLORS.YELLOW];
    if (count === 3) return [COLORS.RED, COLORS.GREEN, COLORS.YELLOW];
    return [COLORS.RED, COLORS.GREEN, COLORS.YELLOW, COLORS.BLUE];
  }

  getInitialTokens() {
    const allTokens = Object.values(COLORS).flatMap(color => 
      [0, 1, 2, 3].map(id => ({
        id: `${color}-${id}`,
        color,
        distance: -1
      }))
    );
    return allTokens.filter(t => this.activeColors.includes(t.color));
  }

  getTokenCoordinates(token) {
    if (token.distance === -1) return null;
    if (token.distance === 56) return { row: 8, col: 8 };
    
    if (token.distance >= 51) {
      const stretchIndex = token.distance - 51;
      return HOME_STRETCHES[token.color][stretchIndex];
    }
    
    const start = START_INDICES[token.color];
    const pathIndex = (start + token.distance) % 52;
    return BOARD_PATH[pathIndex];
  }

  nextTurn() {
    const nextIndex = (this.activeColors.indexOf(this.turn) + 1) % this.activeColors.length;
    this.turn = this.activeColors[nextIndex];
    this.diceValue = null;
    this.diceRolled = false;
    this.consecutiveSixes = 0;
  }

  removePlayer(color) {
    this.tokens = this.tokens.filter(t => t.color !== color);
    
    const index = this.activeColors.indexOf(color);
    if (index !== -1) {
      this.activeColors.splice(index, 1);
      
      if (this.activeColors.length <= 0) {
        this.winner = null;
      } else if (this.activeColors.length === 1) {
        this.winner = this.activeColors[0];
      } else if (this.turn === color) {
        this.turn = this.activeColors[index % this.activeColors.length];
        this.diceValue = null;
        this.diceRolled = false;
        this.consecutiveSixes = 0;
      }
    }
  }

  // Check if there's an opponent block (2+ same-color tokens) at a board position
  isBlockedAt(row, col, movingColor) {
    const tokensHere = this.tokens.filter(t => {
      if (t.color === movingColor) return false;
      if (t.distance < 0 || t.distance > 50) return false;
      const coords = this.getTokenCoordinates(t);
      return coords && coords.row === row && coords.col === col;
    });
    
    const byColor = {};
    tokensHere.forEach(t => {
      byColor[t.color] = (byColor[t.color] || 0) + 1;
    });
    
    return Object.values(byColor).some(c => c >= 2);
  }

  isValidMove(token, roll) {
    if (token.distance === 56) return false;
    if (token.distance === -1) {
      if (roll !== 6) return false;
      // Check if starting position is blocked by opponent double tokens
      const startCoords = this.getTokenCoordinates({ ...token, distance: 0 });
      if (startCoords && this.isBlockedAt(startCoords.row, startCoords.col, token.color)) {
        return false;
      }
      return true;
    }
    if (token.distance + roll > 56) return false;

    // Check each square along the path for opponent blocks (can't land on or pass through)
    for (let d = token.distance + 1; d <= token.distance + roll; d++) {
      if (d > 50) break; // Home stretch - no opponent blocks possible
      const tempCoords = this.getTokenCoordinates({ ...token, distance: d });
      if (tempCoords && this.isBlockedAt(tempCoords.row, tempCoords.col, token.color)) {
        return false;
      }
    }

    return true;
  }

  rollDice(requestedByColor, isAuto = false) {
    if (this.diceRolled || this.winner) return null;
    if (requestedByColor !== this.turn) return null;

    if (isAuto) {
      this.missedTurns[requestedByColor] = (this.missedTurns[requestedByColor] || 0) + 1;
      if (this.missedTurns[requestedByColor] >= 3) {
         this.removePlayer(requestedByColor);
         return { kicked: true, color: requestedByColor };
      }
    } else {
      this.missedTurns[requestedByColor] = 0;
    }

    const val = Math.floor(Math.random() * 6) + 1;

    this.diceValue = val;
    this.diceRolled = true;

    if (val === 6) {
      this.consecutiveSixes++;
      if (this.consecutiveSixes >= 3) {
        // Three consecutive sixes penalty - forfeit turn
        return { val, hasValidMove: false, threeSixesPenalty: true };
      }
    } else {
      this.consecutiveSixes = 0;
    }

    const myTokens = this.tokens.filter(t => t.color === this.turn);
    const hasValidMove = myTokens.some(t => this.isValidMove(t, val));
    
    return { val, hasValidMove, threeSixesPenalty: false };
  }

  moveToken(tokenId, requestedByColor) {
    if (!this.diceRolled || !this.diceValue) return false;
    
    const token = this.tokens.find(t => t.id === tokenId);
    if (!token || token.color !== this.turn || requestedByColor !== this.turn) return false;
    if (!this.isValidMove(token, this.diceValue)) return false;

    let extraTurn = this.diceValue === 6;
    
    // Update token distance directly
    token.distance = token.distance === -1 ? 0 : token.distance + this.diceValue;

    if (token.distance >= 0 && token.distance <= 50) {
      const newCoords = this.getTokenCoordinates(token);
      const isSafe = SAFE_POSITIONS.some(sp => sp.row === newCoords.row && sp.col === newCoords.col);
      
      if (!isSafe) {
        const captured = this.tokens.filter(t => 
          t.color !== this.turn && 
          t.distance >= 0 && t.distance <= 50 &&
          this.getTokenCoordinates(t).row === newCoords.row && 
          this.getTokenCoordinates(t).col === newCoords.col
        );

        if (captured.length > 0) {
          captured.forEach(capToken => {
            capToken.distance = -1;
          });
          extraTurn = true;
        }
      }
    }

    if (token.distance === 56) {
      extraTurn = true;
    }

    const myTokens = this.tokens.filter(t => t.color === this.turn);
    const hasWon = myTokens.every(t => t.distance === 56);
    
    if (hasWon) {
      this.winner = this.turn;
    }

    return { extraTurn, hasWon };
  }

  getState() {
    return {
      tokens: this.tokens,
      turn: this.turn,
      diceValue: this.diceValue,
      diceRolled: this.diceRolled,
      winner: this.winner,
      activeColors: this.activeColors,
      consecutiveSixes: this.consecutiveSixes,
      missedTurns: this.missedTurns
    };
  }
}

module.exports = LudoGame;
