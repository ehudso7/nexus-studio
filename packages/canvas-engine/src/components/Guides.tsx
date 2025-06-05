import React from 'react';
import type { Guide } from '../types';

interface GuidesProps {
  guides: Guide[];
  zoom: number;
}

export function Guides({ guides, zoom }: GuidesProps) {
  return (
    <>
      {guides
        .filter((guide) => guide.visible)
        .map((guide) => (
          <div
            key={guide.id}
            className="absolute bg-blue-500 opacity-50"
            style={{
              ...(guide.orientation === 'horizontal'
                ? {
                    left: 0,
                    right: 0,
                    top: guide.position,
                    height: 1,
                  }
                : {
                    top: 0,
                    bottom: 0,
                    left: guide.position,
                    width: 1,
                  }),
            }}
          />
        ))}
    </>
  );
}