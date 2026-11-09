import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, FastForward } from 'lucide-react';
import { sounds } from '../utils/audio';

interface IntroSplashAnimationProps {
  onComplete: () => void;
}

export const IntroSplashAnimation: React.FC<IntroSplashAnimationProps> = ({ onComplete }) => {
  // Phases: 'appear' | 'jump' | 'strike' | 'return' | 'ready' | 'exit'
  const [phase, setPhase] = useState<'appear' | 'jump' | 'strike' | 'return' | 'ready' | 'exit'>('appear');
  const [showSparks, setShowSparks] = useState(false);
  const [isScreenShaking, setIsScreenShaking] = useState(false);
  const isCompletedRef = useRef(false);

  const handleSkip = () => {
    if (isCompletedRef.current) return;
    isCompletedRef.current = true;
    sounds.playClick();
    setPhase('exit');
    setTimeout(() => {
      onComplete();
    }, 250);
  };

  useEffect(() => {
    // Stage 1: Appear (0s - 0.7s)
    const tJump = setTimeout(() => {
      if (isCompletedRef.current) return;
      setPhase('jump');
    }, 700);

    // Stage 2: Hammer strikes nail (at 1.35s)
    const tStrike = setTimeout(() => {
      if (isCompletedRef.current) return;
      setPhase('strike');
      setShowSparks(true);
      setIsScreenShaking(true);
      sounds.playHammerToc();

      // Stop shake quickly
      setTimeout(() => setIsScreenShaking(false), 120);
    }, 1350);

    // Stage 3: Hammer returns into E (at 1.75s)
    const tReturn = setTimeout(() => {
      if (isCompletedRef.current) return;
      setPhase('return');
    }, 1750);

    // Stage 4: Settled and final glint (at 2.15s)
    const tReady = setTimeout(() => {
      if (isCompletedRef.current) return;
      setPhase('ready');
    }, 2150);

    // Stage 5: Fade out and open app (at 2.65s)
    const tExit = setTimeout(() => {
      if (isCompletedRef.current) return;
      setPhase('exit');
      setTimeout(() => {
        if (!isCompletedRef.current) {
          isCompletedRef.current = true;
          onComplete();
        }
      }, 350);
    }, 2650);

    return () => {
      clearTimeout(tJump);
      clearTimeout(tStrike);
      clearTimeout(tReturn);
      clearTimeout(tReady);
      clearTimeout(tExit);
    };
  }, [onComplete]);

  // Sparks definition for strike effect
  const sparks = [
    { dx: -35, dy: -30, delay: '0ms', scale: 1.2 },
    { dx: -20, dy: -45, delay: '20ms', scale: 1 },
    { dx: 15, dy: -40, delay: '10ms', scale: 1.3 },
    { dx: 35, dy: -25, delay: '0ms', scale: 1.1 },
    { dx: 40, dy: 5, delay: '30ms', scale: 0.9 },
    { dx: 25, dy: 25, delay: '15ms', scale: 1.2 },
    { dx: -15, dy: 30, delay: '25ms', scale: 1 },
    { dx: -35, dy: 10, delay: '5ms', scale: 1.1 },
  ];

  return (
    <div
      className={`fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center select-none transition-opacity duration-350 ease-out ${
        phase === 'exit' ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Skip button in top corner */}
      <button
        onClick={handleSkip}
        className="absolute top-4 right-4 sm:top-6 sm:right-6 px-3.5 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer shadow-xs z-20"
        title="Passer l'animation"
      >
        <span>Passer</span>
        <FastForward className="w-3.5 h-3.5 text-slate-500" />
      </button>

      {/* Main Container with subtle screen shake on strike */}
      <div
        className={`relative flex flex-col items-center justify-center p-6 transition-transform duration-100 ${
          isScreenShaking ? 'translate-y-1 scale-[0.995]' : 'translate-y-0 scale-100'
        }`}
      >
        {/* Base Logo Container */}
        <div className="relative w-64 sm:w-72 max-w-[80vw] flex flex-col items-center justify-center">
          {/* Main 4K crisp Logo */}
          <div
            className={`transition-all duration-700 ease-out transform ${
              phase === 'appear'
                ? 'scale-90 opacity-90'
                : 'scale-100 opacity-100'
            }`}
          >
            <img
              src="/logo.png"
              alt="EFA EDO"
              className="w-full h-auto object-contain drop-shadow-sm select-none"
              style={{ imageRendering: '-webkit-optimize-contrast' }}
            />
          </div>

          {/* ANIMATED HAMMER OVERLAY FOR THE 'E' IN EDO
              The claw hammer forms the E of EDO:
              It lifts out, jumps to strike a nail, then docks back seamlessly.
          */}
          {(phase === 'jump' || phase === 'strike' || phase === 'return') && (
            <div
              className="absolute pointer-events-none transition-all ease-out z-10"
              style={{
                // Anchor roughly where the E's hammer sits in the logo (left-middle)
                left: '21%',
                top: '38%',
                width: '60px',
                height: '90px',
                transformOrigin: 'bottom center',
                transitionDuration: phase === 'strike' ? '120ms' : '380ms',
                transform:
                  phase === 'jump'
                    ? 'translate(20px, -70px) rotate(-45deg) scale(1.15)'
                    : phase === 'strike'
                    ? 'translate(38px, -20px) rotate(18deg) scale(1.1)'
                    : 'translate(0px, 0px) rotate(0deg) scale(1)',
              }}
            >
              {/* Dynamic SVG Hammer rendered with vibrant Togo Orange (#ff6b00) */}
              <svg viewBox="0 0 70 100" className="w-full h-full drop-shadow-md">
                {/* Claw Hammer Head */}
                <path
                  d="M 12 12 C 12 4, 32 4, 48 10 L 62 12 C 65 13, 67 17, 66 22 L 64 24 C 63 26, 60 26, 56 25 L 48 24 L 46 29 L 26 29 L 26 20 C 18 20, 10 24, 6 32 C 8 22, 10 16, 12 12 Z"
                  fill="#ff6b00"
                />
                {/* Hammer Metal Rim */}
                <rect x="62" y="11" width="5" height="15" rx="2" fill="#e05900" />
                {/* Hammer Handle */}
                <rect x="30" y="26" width="13" height="70" rx="3" fill="#ff7300" />
                <rect x="32" y="55" width="9" height="36" rx="2" fill="#e05900" />
              </svg>
            </div>
          )}

          {/* THE NAIL (Appears right during strike position) */}
          {(phase === 'jump' || phase === 'strike') && (
            <div
              className={`absolute pointer-events-none transition-all duration-100 z-0 ${
                phase === 'strike' ? 'translate-y-2.5 scale-95 opacity-80' : 'translate-y-0 opacity-100'
              }`}
              style={{
                left: '52%',
                top: '33%',
                width: '16px',
                height: '32px',
              }}
            >
              {/* Metallic Nail SVG */}
              <svg viewBox="0 0 20 40" className="w-full h-full drop-shadow-sm">
                {/* Nail head */}
                <rect x="2" y="2" width="16" height="4" rx="1.5" fill="#475569" />
                {/* Nail stem */}
                <rect x="8" y="6" width="4" height="26" fill="#64748b" />
                {/* Nail tip */}
                <polygon points="8,32 12,32 10,38" fill="#475569" />
              </svg>
            </div>
          )}

          {/* SPARKS BURST ON STRIKE */}
          {showSparks && (
            <div
              className="absolute pointer-events-none z-20"
              style={{
                left: '54%',
                top: '34%',
                width: '1px',
                height: '1px',
              }}
            >
              {/* Central Flash */}
              <div className="absolute -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-amber-400/90 blur-xs animate-ping" />
              <div className="absolute -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white shadow-lg shadow-amber-500" />

              {/* Radiating Spark Particles */}
              {sparks.map((s, idx) => (
                <div
                  key={idx}
                  className="absolute transition-all duration-300 ease-out"
                  style={{
                    transform:
                      phase === 'return' || phase === 'ready'
                        ? `translate(${s.dx * 1.5}px, ${s.dy * 1.5}px) scale(0)`
                        : `translate(${s.dx}px, ${s.dy}px) scale(${s.scale})`,
                    opacity: phase === 'return' || phase === 'ready' ? 0 : 1,
                    transitionDelay: s.delay,
                  }}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                </div>
              ))}
            </div>
          )}

          {/* Subtitle & Brand Statement */}
          <div
            className={`mt-6 text-center transition-all duration-500 ${
              phase === 'ready' || phase === 'exit'
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-2'
            }`}
          >
            <p className="text-sm sm:text-base font-black tracking-tight text-slate-900">
              Marketplace des Artisans Africains
            </p>
            <p className="text-xs font-semibold text-amber-600 mt-0.5">
              Par EFA TECHNOLOGIE
            </p>
          </div>
        </div>

        {/* Small Progress Dots indicator */}
        <div className="flex items-center gap-1.5 mt-8">
          <span
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              phase === 'appear' || phase === 'jump'
                ? 'bg-amber-500 w-4'
                : 'bg-slate-300'
            }`}
          />
          <span
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              phase === 'strike' ? 'bg-amber-500 w-4' : 'bg-slate-300'
            }`}
          />
          <span
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              phase === 'return' || phase === 'ready'
                ? 'bg-amber-500 w-4'
                : 'bg-slate-300'
            }`}
          />
        </div>
      </div>
    </div>
  );
};
