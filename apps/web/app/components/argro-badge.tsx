import React from 'react';

export const ArgroBadge: React.FC = () => {
  return (
    <div className="relative w-24 h-24 flex items-center justify-center animate-spin-slow">
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <defs>
          <path id="circlePath" d="M 50, 50 m -37, 0 a 37,37 0 1,1 74,0 a 37,37 0 1,1 -74,0" />
        </defs>
        <circle cx="50" cy="50" r="42" fill="black" />
        <text className="text-[10px] font-medium fill-white uppercase tracking-widest">
          <textPath href="#circlePath" startOffset="0%">
            Argro Studio • Digital Systems • Digital Systems •
          </textPath>
        </text>
        {/* Simplified Gemini/Argro Icon in center */}
        <path d="M 50 35 L 60 55 L 50 75 L 40 55 Z" fill="#d5ea51" />
      </svg>
    </div>
  );
};
