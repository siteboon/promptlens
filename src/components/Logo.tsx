import React from 'react';

const Logo: React.FC = () => {
  return (
    <div className="flex items-center gap-2">
      <img src="/lens.svg" alt="PromptLens logo" className="w-8 h-8" />
      <span className="text-2xl font-bold" style={{ 
        background: 'linear-gradient(135deg, #ef9fbc, #65c3c8)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text'
      }}>
        PromptLens
      </span>
    </div>
  );
};

export default Logo;