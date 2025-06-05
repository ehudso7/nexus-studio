import React from 'react';

interface Cursor {
  userId: string;
  userName: string;
  color: string;
  position: { x: number; y: number };
}

interface CursorsProps {
  cursors: Cursor[];
  zoom: number;
  pan: { x: number; y: number };
}

export function Cursors({ cursors, zoom, pan }: CursorsProps) {
  return (
    <>
      {cursors.map((cursor) => (
        <div
          key={cursor.userId}
          className="absolute pointer-events-none z-50"
          style={{
            left: cursor.position.x * zoom + pan.x,
            top: cursor.position.y * zoom + pan.y,
            transform: `scale(${1 / zoom})`,
            transformOrigin: 'top left',
          }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 2L2 12L7 12L7 22L12 17L12 12L22 12L12 2Z"
              fill={cursor.color}
              stroke="white"
              strokeWidth="1.5"
            />
          </svg>
          <div
            className="absolute top-5 left-2 px-2 py-1 rounded text-xs text-white whitespace-nowrap"
            style={{ backgroundColor: cursor.color }}
          >
            {cursor.userName}
          </div>
        </div>
      ))}
    </>
  );
}