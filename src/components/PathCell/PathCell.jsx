import React from 'react';
import { Star, ArrowRight, ArrowUp, ArrowDown, ArrowLeft } from 'lucide-react';
import './PathCell.css';
import { SAFE_POSITIONS, HOME_STRETCHES, COLORS } from '../../utils/constants';

const PathCell = ({ row, col }) => {
  let cellClass = 'path-cell';
  let backgroundColor = 'transparent';
  let icon = null;

  // Check if it's a safe spot or start
  const safeSpot = SAFE_POSITIONS.find(pos => pos.row === row && pos.col === col);
  if (safeSpot) {
    cellClass += ' safe-spot';
    if (safeSpot.isStart) {
      backgroundColor = safeSpot.color;
      // You could add an arrow icon for starts
      if (safeSpot.color === COLORS.RED) icon = <ArrowRight size={20} color="white" />;
      if (safeSpot.color === COLORS.GREEN) icon = <ArrowDown size={20} color="white" />;
      if (safeSpot.color === COLORS.YELLOW) icon = <ArrowLeft size={20} color="white" />;
      if (safeSpot.color === COLORS.BLUE) icon = <ArrowUp size={20} color="white" />;
    } else {
      // It's a star
      icon = <Star size={20} fill="#94a3b8" color="#94a3b8" />;
    }
  }

  // Check if it's a home stretch
  for (const [color, positions] of Object.entries(HOME_STRETCHES)) {
    if (positions.find(pos => pos.row === row && pos.col === col)) {
      backgroundColor = color;
      cellClass += ' home-stretch';
    }
  }

  const style = {
    gridRow: row,
    gridColumn: col,
    backgroundColor: backgroundColor !== 'transparent' ? `var(--color-${backgroundColor})` : 'white',
  };

  return (
    <div className={cellClass} style={style}>
      {icon}
    </div>
  );
};

export default PathCell;
