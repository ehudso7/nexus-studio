import React from 'react';

interface GridProps {
  size: number;
  zoom: number;
}

export function Grid({ size, zoom }: GridProps) {
  const scaledSize = size * zoom;
  
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ transform: `scale(${1 / zoom})`, transformOrigin: '0 0' }}
    >
      <defs>
        <pattern
          id="grid"
          width={size}
          height={size}
          patternUnits="userSpaceOnUse"
        >
          <circle cx={1} cy={1} r={0.5} fill="#e5e7eb" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />
    </svg>
  );
}