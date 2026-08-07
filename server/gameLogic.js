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
  }

  isValidMove(token, roll) {
    if (token.distance === 56) return false;
    if (token.distance === -1) return roll === 6;
    if (token.distance + roll > 56) return false;
    return true;
  }

  rollDice(requestedByColor) {
    if (this.diceRolled || this.winner) return null;
    if (requestedByColor !== this.turn) return null;

    const myTokens = this.tokens.filter(t => t.color === this.turn);
    const allInBase = myTokens.every(t => t.distance === -1);
    
    let val = Math.floor(Math.random() * 6) + 1;
    if (allInBase && Math.random() < 0.5) {
      val = 6;
    }

    this.diceValue = val;
    this.diceRolled = true;

    const hasValidMove = myTokens.some(t => this.isValidMove(t, val));
    
    return { val, hasValidMove };
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
      activeColors: this.activeColors
    };
  }
}

module.exports = LudoGame;
