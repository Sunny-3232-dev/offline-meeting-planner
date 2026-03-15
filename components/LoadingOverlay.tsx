
import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';

interface LoadingOverlayProps {
  message: string;
  title?: string;
  sourceWords?: string[];
}

const FloatingWord: React.FC<{ word: string }> = ({ word }) => {
  const style = useMemo(() => {
    const top = Math.random() * 80 + 10; // 10% to 90%
    const left = Math.random() * 80 + 10;
    const size = Math.random() * 1.2 + 0.9; // 0.9rem to 2.1rem
    const delay = Math.random() * 5;
    const duration = 8 + Math.random() * 12;
    const rotation = Math.random() * 30 - 15; // -15deg to 15deg
    const fontWeight = [400, 500, 600, 700, 800][Math.floor(Math.random() * 5)];
    
    // Vibrant but soft colors that match the theme
    const colors = [
      'text-stone-400', 
      'text-rose-400', 
      'text-orange-400', 
      'text-purple-400',
      'text-blue-400',
      'text-amber-400'
    ];
    const color = colors[Math.floor(Math.random() * colors.length)];

    return {
      top: `${top}%`,
      left: `${left}%`,
      fontSize: `${size}rem`,
      fontWeight: fontWeight,
      animationDelay: `${delay}s`,
      animationDuration: `${duration}s`,
      transform: `rotate(${rotation}deg)`,
      colorClass: color,
      textShadow: '0 2px 10px rgba(255,255,255,0.8)'
    };
  }, []);

  return (
    <div 
      className={`absolute pointer-events-none select-none opacity-0 animate-float-fade ${style.colorClass}`}
      style={{
        top: style.top,
        left: style.left,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        animationDelay: style.animationDelay,
        animationDuration: style.animationDuration,
        transform: style.transform,
        textShadow: style.textShadow,
      }}
    >
      {word}
    </div>
  );
};

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ message, title = "思考中...", sourceWords = [] }) => {
  // Select up to 30 random unique words to display for better density
  const displayWords = useMemo(() => {
    if (!sourceWords.length) return [];
    const unique = Array.from(new Set(sourceWords));
    // Mix and slice
    return unique.sort(() => 0.5 - Math.random()).slice(0, 30);
  }, [sourceWords]);

  return createPortal(
    <div className="fixed inset-0 bg-stone-100/60 backdrop-blur-2xl z-[100] flex items-center justify-center p-4 transition-all duration-500 overflow-hidden">
      {/* Floating Words Background */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {displayWords.map((word, idx) => (
          <FloatingWord key={`${word}-${idx}`} word={word} />
        ))}
      </div>

      {/* Main Glassmorphism Loading Card */}
      <div className="relative z-10 bg-white/90 backdrop-blur-md rounded-[3.5rem] p-12 max-w-sm w-full shadow-[0_20px_50px_rgba(0,0,0,0.1)] text-center space-y-10 transform animate-in fade-in zoom-in duration-500 border border-white/50">
        <div className="relative w-28 h-28 mx-auto">
          {/* Decorative Rings */}
          <div className="absolute -inset-4 border border-rose-100 rounded-full animate-ping opacity-20"></div>
          <div className="absolute inset-0 border-[8px] border-stone-100 rounded-full"></div>
          <div className="absolute inset-0 border-[8px] border-gradient-to-tr from-orange-400 to-rose-500 rounded-full border-t-transparent animate-spin" style={{ borderColor: 'transparent', borderTopColor: '#f43f5e', borderRightColor: '#fb923c' }}></div>
          <div className="absolute inset-0 flex items-center justify-center text-4xl animate-bounce">
            ✨
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-stone-800 to-stone-500 leading-tight">
            {title}
          </h3>
          <div className="h-1 w-12 bg-gradient-to-r from-orange-400 to-rose-500 mx-auto rounded-full"></div>
          <p className="text-stone-500 text-sm leading-relaxed font-semibold px-4">
            {message}
          </p>
        </div>

        {/* Thinking Indicator */}
        <div className="flex justify-center gap-1.5">
          <div className="w-2 h-2 bg-rose-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
          <div className="w-2 h-2 bg-rose-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
          <div className="w-2 h-2 bg-rose-400 rounded-full animate-bounce"></div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes floatFade {
          0% {
            transform: translate(0, 40px) rotate(-10deg);
            opacity: 0;
          }
          20% {
            opacity: 0.7;
          }
          80% {
            opacity: 0.7;
          }
          100% {
            transform: translate(20px, -120px) rotate(10deg);
            opacity: 0;
          }
        }
        .animate-float-fade {
          animation-name: floatFade;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
        }
      `}} />
    </div>,
    document.body
  );
};

export default LoadingOverlay;
