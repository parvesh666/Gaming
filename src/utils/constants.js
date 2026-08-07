export const COLORS = {
  RED: 'red',
  GREEN: 'green',
  YELLOW: 'yellow',
  BLUE: 'blue',
};

// Safe positions on the 15x15 grid (row, col) - 1 indexed for CSS Grid
export const SAFE_POSITIONS = [
  { row: 7, col: 2, color: COLORS.RED, isStart: true },
  { row: 9, col: 3, color: 'safe', isStart: false },
  
  { row: 2, col: 9, color: COLORS.GREEN, isStart: true },
  { row: 3, col: 7, color: 'safe', isStart: false },
  
  { row: 9, col: 14, color: COLORS.YELLOW, isStart: true },
  { row: 7, col: 13, color: 'safe', isStart: false },
  
  { row: 14, col: 7, color: COLORS.BLUE, isStart: true },
  { row: 13, col: 9, color: 'safe', isStart: false },
];

export const HOME_STRETCHES = {
  [COLORS.RED]: [ {row: 8, col: 2}, {row: 8, col: 3}, {row: 8, col: 4}, {row: 8, col: 5}, {row: 8, col: 6} ],
  [COLORS.GREEN]: [ {row: 2, col: 8}, {row: 3, col: 8}, {row: 4, col: 8}, {row: 5, col: 8}, {row: 6, col: 8} ],
  [COLORS.YELLOW]: [ {row: 8, col: 14}, {row: 8, col: 13}, {row: 8, col: 12}, {row: 8, col: 11}, {row: 8, col: 10} ],
  [COLORS.BLUE]: [ {row: 14, col: 8}, {row: 13, col: 8}, {row: 12, col: 8}, {row: 11, col: 8}, {row: 10, col: 8} ],
};

export const BOARD_PATH = [
  { row: 7, col: 1 }, { row: 7, col: 2 }, { row: 7, col: 3 }, { row: 7, col: 4 }, { row: 7, col: 5 }, { row: 7, col: 6 },
  { row: 6, col: 7 }, { row: 5, col: 7 }, { row: 4, col: 7 }, { row: 3, col: 7 }, { row: 2, col: 7 }, { row: 1, col: 7 },
  { row: 1, col: 8 }, { row: 1, col: 9 },
  { row: 2, col: 9 }, { row: 3, col: 9 }, { row: 4, col: 9 }, { row: 5, col: 9 }, { row: 6, col: 9 },
  { row: 7, col: 10 }, { row: 7, col: 11 }, { row: 7, col: 12 }, { row: 7, col: 13 }, { row: 7, col: 14 }, { row: 7, col: 15 },
  { row: 8, col: 15 }, { row: 9, col: 15 },
  { row: 9, col: 14 }, { row: 9, col: 13 }, { row: 9, col: 12 }, { row: 9, col: 11 }, { row: 9, col: 10 },
  { row: 10, col: 9 }, { row: 11, col: 9 }, { row: 12, col: 9 }, { row: 13, col: 9 }, { row: 14, col: 9 }, { row: 15, col: 9 },
  { row: 15, col: 8 }, { row: 15, col: 7 },
  { row: 14, col: 7 }, { row: 13, col: 7 }, { row: 12, col: 7 }, { row: 11, col: 7 }, { row: 10, col: 7 },
  { row: 9, col: 6 }, { row: 9, col: 5 }, { row: 9, col: 4 }, { row: 9, col: 3 }, { row: 9, col: 2 }, { row: 9, col: 1 },
  { row: 8, col: 1 }
];

export const START_INDICES = {
  [COLORS.RED]: 1,
  [COLORS.GREEN]: 14,
  [COLORS.YELLOW]: 27,
  [COLORS.BLUE]: 40
};

// Function to check if a cell is part of the path
export const isPathCell = (row, col) => {
  // Top/Bottom paths (cols 7, 8, 9)
  if ((col >= 7 && col <= 9) && (row <= 6 || row >= 10)) return true;
  // Left/Right paths (rows 7, 8, 9)
  if ((row >= 7 && row <= 9) && (col <= 6 || col >= 10)) return true;
  return false;
};
