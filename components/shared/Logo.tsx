'use client';

/**
 * AINews Hexagon Logo Component
 * Inline SVG for better performance and reliability
 */

type LogoProps = {
  size?: number;
  className?: string;
};

export function Logo({ size = 40, className = '' }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Hexagon background with gradient */}
      <defs>
        <linearGradient id="hexGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="50%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      {/* Hexagon shape */}
      <path
        d="M50 5 L90 28 L90 72 L50 95 L10 72 L10 28 Z"
        fill="url(#hexGradient)"
        stroke="#60a5fa"
        strokeWidth="2"
        filter="url(#glow)"
      />
      
      {/* AI text */}
      <text
        x="50"
        y="55"
        fontSize="32"
        fontWeight="bold"
        fill="white"
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        AI
      </text>
      
      {/* Neural network accent lines */}
      <g opacity="0.6" stroke="white" strokeWidth="1.5" fill="none">
        <line x1="30" y1="35" x2="40" y2="45" />
        <line x1="40" y1="45" x2="50" y2="40" />
        <line x1="50" y1="40" x2="60" y2="45" />
        <line x1="60" y1="45" x2="70" y2="35" />
        <circle cx="30" cy="35" r="2" fill="white" />
        <circle cx="40" cy="45" r="2" fill="white" />
        <circle cx="50" cy="40" r="2" fill="white" />
        <circle cx="60" cy="45" r="2" fill="white" />
        <circle cx="70" cy="35" r="2" fill="white" />
      </g>
    </svg>
  );
}
