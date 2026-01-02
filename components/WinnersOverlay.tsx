import React, { useState, useEffect, useRef } from 'react';
import { Winner, PrizeConfig } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { WIN_SOUND_URL } from '../constants';
import confetti from 'canvas-confetti';

// Fix for TypeScript errors regarding 'initial' property on motion components
const MotionDiv = motion.div as any;
const MotionButton = motion.button as any;

interface WinnersOverlayProps {
  winners: Winner[]; // Current batch winners (the full list for this draw)
  prize: PrizeConfig;
  isVisible: boolean;
  onClose: () => void;
  revealDelay: number;
}

type LayoutMode = 'normal' | 'compact' | 'mini';

// Helper to match the department codes
const getDeptCode = (dept?: string) => {
  if (!dept) return 'GEN';
  const d = dept.toLowerCase();
  if (d.includes('技术') || d.includes('研发') || d.includes('tech')) return 'ATP';
  if (d.includes('销售') || d.includes('sale')) return 'WTA';
  if (d.includes('人事') || d.includes('hr')) return 'HRD';
  if (d.includes('市场') || d.includes('market')) return 'MKT';
  if (d.includes('财务') || d.includes('finance')) return 'FNC';
  if (d.includes('运营') || d.includes('ops')) return 'OPS';
  return 'NBL'; 
};

// Helper to format ID
const formatId = (id: string) => {
  const num = id.replace(/\D/g, '');
  return num.padStart(6, '0');
};

const WinnerCard: React.FC<{ winner: Winner; mode: LayoutMode; isNew: boolean }> = ({ winner, mode, isNew }) => {
  
  // Dynamic styles based on mode
  const styles = {
    normal: {
      card: 'w-[300px] h-[440px] py-12',
      label: 'text-3xl',
      name: 'text-6xl',
      id: 'text-3xl',
      dept: 'text-2xl',
      gap: 'gap-3'
    },
    compact: {
      card: 'w-[220px] h-[320px] py-6',
      label: 'text-xl',
      name: 'text-4xl',
      id: 'text-xl',
      dept: 'text-lg',
      gap: 'gap-1'
    },
    mini: {
      card: 'w-[160px] h-[240px] py-4',
      label: 'text-sm',
      name: 'text-2xl',
      id: 'text-sm',
      dept: 'text-xs',
      gap: 'gap-0'
    }
  };

  const s = styles[mode];

  return (
    <div className={`
      relative ${s.card} 
      bg-black/60 backdrop-blur-xl 
      border-[2px] ${isNew ? 'border-amber-400 scale-105 shadow-[0_0_80px_rgba(251,191,36,0.6)]' : 'border-amber-500/40 shadow-[0_0_50px_rgba(245,158,11,0.2)]'} 
      rounded-lg flex flex-col items-center justify-between 
      overflow-hidden transition-all duration-500
    `}>
      
      {/* Decorative Inner Frame */}
      <div className="absolute inset-2 border border-amber-500/30 rounded-sm pointer-events-none"></div>
      
      {/* Top Label: MoShang */}
      <div className={`font-display font-bold ${s.label} text-amber-400 drop-shadow-[0_0_10px_rgba(245,158,11,0.8)] z-10`}>
        MoShang
      </div>

      {/* Name: Huge & Glowing */}
      <div className={`font-sans font-black ${s.name} text-white drop-shadow-[0_0_20px_rgba(245,158,11,0.8)] z-10 text-center px-2 leading-tight whitespace-nowrap`}>
        {winner.participant.name}
      </div>

      <div className={`flex flex-col items-center ${s.gap} z-10`}>
        {/* ID Number */}
        <div className={`font-display font-medium ${s.id} text-amber-400 tracking-[0.1em]`}>
          {formatId(winner.participant.id)}
        </div>

        {/* Department Code */}
        <div className={`font-display font-bold ${s.dept} text-amber-500/80 uppercase`}>
          {getDeptCode(winner.participant.department)}
        </div>
      </div>

      {/* Background Glow Effect */}
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-[radial-gradient(circle,rgba(245,158,11,0.1)_0%,transparent_70%)] pointer-events-none ${isNew ? 'opacity-100' : 'opacity-50'}`}></div>
    </div>
  );
};

export const WinnersOverlay: React.FC<WinnersOverlayProps> = ({ winners, prize, isVisible, onClose, revealDelay }) => {
  const [displayedCount, setDisplayedCount] = useState(0);
  const winSoundRef = useRef<HTMLAudioElement>(new Audio(WIN_SOUND_URL));
  
  // Reset when visibility changes to true
  useEffect(() => {
    if (isVisible) {
      setDisplayedCount(0);
      winSoundRef.current.volume = 1.0;
    }
  }, [isVisible, winners]); // Winners added as dependency so it resets on new batch

  // Suspense Interval Logic
  useEffect(() => {
    if (!isVisible || displayedCount >= winners.length) return;

    const timer = setTimeout(() => {
      setDisplayedCount(prev => prev + 1);
      
      // Play sound on each reveal
      winSoundRef.current.currentTime = 0;
      winSoundRef.current.play().catch(() => {});

      // Mini confetti on each card
      confetti({
         particleCount: 50,
         spread: 60,
         origin: { y: 0.7 },
         colors: ['#FFD700', '#ffffff'],
         zIndex: 9999
      });

    }, revealDelay);

    return () => clearTimeout(timer);
  }, [isVisible, displayedCount, winners.length, revealDelay]);

  // Determine layout mode based on *total* count (not just displayed) to keep grid stable
  let layoutMode: LayoutMode = 'normal';
  if (winners.length > 10) {
    layoutMode = 'mini';
  } else if (winners.length > 5) {
    layoutMode = 'compact';
  }

  // Adjust container gap based on mode
  const gridGap = layoutMode === 'normal' ? 'gap-10' : layoutMode === 'compact' ? 'gap-6' : 'gap-4';
  const containerPadding = layoutMode === 'mini' ? 'py-10' : 'py-20';

  // The slice of winners to actually render
  const visibleWinners = winners.slice(0, displayedCount);
  
  // Are we done?
  const isFinished = displayedCount === winners.length;

  return (
    <AnimatePresence>
      {isVisible && (
        <MotionDiv 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md overflow-y-auto"
        >
          {/* Main container */}
          <div className={`min-h-screen w-full flex flex-col items-center ${containerPadding} relative`}>
            
            {/* Background Ambience */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none fixed">
              <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-600/10 rounded-full blur-[120px]"></div>
              <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-yellow-600/5 rounded-full blur-[120px]"></div>
            </div>

            {/* Content Wrapper */}
            <div className="flex flex-col items-center w-full my-auto z-10 gap-8 md:gap-12">
              
              {/* Header Section */}
              <MotionDiv 
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="text-center relative z-10 px-4"
              >
                <h2 className="text-xl md:text-3xl font-display text-amber-200/80 uppercase tracking-[0.3em] md:tracking-[0.5em] mb-2 md:mb-4 drop-shadow-md">
                  恭喜以下获奖者
                </h2>
                <h1 className="text-4xl md:text-7xl font-black font-display text-transparent bg-clip-text bg-gradient-to-b from-yellow-100 via-yellow-300 to-yellow-600 drop-shadow-[0_0_30px_rgba(234,179,8,0.6)]">
                  {prize.name}
                </h1>
                
                {/* Progress Indicator */}
                <div className="mt-4 text-amber-500/50 font-mono text-sm tracking-widest">
                   {displayedCount} / {winners.length}
                </div>
              </MotionDiv>

              {/* Winners Grid */}
              <div className={`flex flex-wrap justify-center w-full max-w-[1800px] perspective-1000 z-20 px-4 ${gridGap}`}>
                {visibleWinners.map((w, i) => (
                  <MotionDiv
                    key={w.participant.id}
                    initial={{ opacity: 0, scale: 0.2, rotateX: -45 }}
                    animate={{ opacity: 1, scale: 1, rotateX: 0 }}
                    transition={{ 
                      type: "spring",
                      stiffness: 200,
                      damping: 15
                    }}
                    className="relative"
                  >
                    {/* Only the very last revealed card gets the 'isNew' highlight if the sequence isn't finished */}
                    <WinnerCard 
                        winner={w} 
                        mode={layoutMode} 
                        isNew={i === displayedCount - 1 && !isFinished} 
                    />
                  </MotionDiv>
                ))}
              </div>

              {/* Footer / Continue Button - Only show when finished */}
              <AnimatePresence>
                {isFinished && (
                    <MotionButton
                        initial={{ opacity: 0, y: 50, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ delay: 0.5, type: 'spring' }}
                        onClick={onClose}
                        className="px-12 py-4 md:px-16 md:py-5 bg-gradient-to-r from-amber-600/90 to-yellow-600/90 rounded-full text-white font-bold text-lg md:text-xl tracking-widest uppercase shadow-[0_0_40px_rgba(217,119,6,0.6)] hover:shadow-[0_0_60px_rgba(217,119,6,0.8)] hover:scale-105 transition-all z-20 backdrop-blur-md"
                    >
                        继续抽奖
                    </MotionButton>
                )}
              </AnimatePresence>

            </div>
          </div>
        </MotionDiv>
      )}
    </AnimatePresence>
  );
};
