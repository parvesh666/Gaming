import React, { useState, useEffect, useRef } from 'react';
import { Star, ArrowRight, ArrowUp, ArrowDown, ArrowLeft } from 'lucide-react';
import './PathCell.css';
import { SAFE_POSITIONS, HOME_STRETCHES, COLORS } from '../../utils/constants';

const PathCell = ({ row, col, hasToken }) => {
  const [isPressed, setIsPressed] = useState(false);
  const prevHasToken = useRef(hasToken);

  useEffect(() => {
    if (hasToken && !prevHasToken.current) {
      setIsPressed(true);
      setTimeout(() => setIsPressed(false), 400);
    }
    prevHasToken.current = hasToken;
  }, [hasToken]);

  let cellClass = 'path-cell';
  if (isPressed) cellClass += ' pressed';
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

  const colorMap = {
    'transparent': { main: '#f1f5f9', light: '#ffffff', dark: '#cbd5e1', edge: '#94a3b8' },
    'red': { main: 'var(--color-red)', light: 'var(--color-red-light)', dark: 'var(--color-red-dark)', edge: '#991b1b' },
    'green': { main: 'var(--color-green)', light: 'var(--color-green-light)', dark: 'var(--color-green-dark)', edge: '#166534' },
    'yellow': { main: 'var(--color-yellow)', light: 'var(--color-yellow-light)', dark: 'var(--color-yellow-dark)', edge: '#854d0e' },
    'blue': { main: 'var(--color-blue)', light: 'var(--color-blue-light)', dark: 'var(--color-blue-dark)', edge: '#1e3a8a' },
  };

  const colors = colorMap[backgroundColor] || colorMap['transparent'];

  const style = {
    gridRow: row,
    gridColumn: col,
    '--main-color': colors.main,
    '--light-color': colors.light,
    '--dark-color': colors.dark,
    '--edge-color': colors.edge,
  };

  return (
    <div className={cellClass} style={style}>
      {icon}
    </div>
  );
};

export default PathCell;
