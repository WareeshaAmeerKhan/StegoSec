import React from 'react';

const Logo = ({ size = 32, color = '#00FF41' }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer circle */}
      <circle cx="16" cy="16" r="15" stroke={color} strokeWidth="1.5" />
      
      {/* Lock shape */}
      <rect x="10" y="14" width="12" height="10" rx="2" fill={color} opacity="0.3" stroke={color} strokeWidth="1.5" />
      
      {/* Lock shackle */}
      <path
        d="M11 14C11 10.5 13.5 8 16 8C18.5 8 21 10.5 21 14"
        stroke={color}
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />
      
      {/* Key hole */}
      <circle cx="16" cy="19" r="2" fill={color} />
      
      {/* Hidden data indicator dots */}
      <circle cx="13" cy="22" r="1" fill={color} opacity="0.6" />
      <circle cx="19" cy="22" r="1" fill={color} opacity="0.6" />
      
      {/* Shine effect */}
      <circle cx="14" cy="13" r="1.5" fill={color} opacity="0.4" />
    </svg>
  );
};

export default Logo;
