import React from 'react';
import './Token.css';

const Token = ({ color, onClick, highlight }) => {
  return (
    <div 
      className={`ludo-token token-${color} ${highlight ? 'highlight' : ''}`}
      onClick={onClick}
    >
      <div className="token-inner"></div>
    </div>
  );
};

export default Token;
