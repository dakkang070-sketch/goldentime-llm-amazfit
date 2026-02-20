import React from 'react';

interface HealthScoreRingProps {
  score: number;
}

export const HealthScoreRing: React.FC<HealthScoreRingProps> = ({ score }) => {
  const radius = 50;
  const stroke = 8;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const getColor = (s: number) => {
    if (s > 80) return '#10b981'; // Emerald
    if (s > 60) return '#f59e0b'; // Amber
    return '#ef4444'; // Red
  };

  return (
    <div className="relative flex items-center justify-center">
      <svg
        height={radius * 2.8}
        width={radius * 2.8}
        className="transform -rotate-90 transition-all duration-500"
      >
        {/* Background Circle */}
        <circle
          stroke="#e2e8f0"
          strokeWidth={stroke}
          fill="transparent"
          r={normalizedRadius}
          cx={radius * 1.4}
          cy={radius * 1.4}
        />
        {/* Progress Circle */}
        <circle
          stroke={getColor(score)}
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={circumference + ' ' + circumference}
          style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.5s ease-in-out' }}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={radius * 1.4}
          cy={radius * 1.4}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-4xl font-medium text-slate-800">{Math.round(score)}</span>
        <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">Health Score</span>
      </div>
    </div>
  );
};