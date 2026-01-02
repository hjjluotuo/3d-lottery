import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Html, useProgress } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import confetti from 'canvas-confetti';

import { AppState, Participant, Winner, PrizeConfig } from './types';
import { INITIAL_PRIZES, MOCK_PARTICIPANTS, MUSIC_URL, WIN_SOUND_URL } from './constants';
import { TagCloud } from './components/TagCloud';
import { Controls } from './components/Controls';
import { SettingsModal } from './components/SettingsModal';
import { WinnersOverlay } from './components/WinnersOverlay';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      color: any;
      fog: any;
      ambientLight: any;
      pointLight: any;
      gridHelper: any;
      icosahedronGeometry: any;
      meshBasicMaterial: any;
    }
  }
}

// Simple Loader Component
function Loader() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="flex flex-col items-center justify-center gap-2">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <div className="text-emerald-400 font-display text-sm tracking-widest animate-pulse">
          SYSTEM LOADING {progress.toFixed(0)}%
        </div>
      </div>
    </Html>
  );
}

// New Component: Background Scene Decoration
const BackgroundDecoration = React.memo(() => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
        // Slow rotation for the giant wireframe
        meshRef.current.rotation.y = state.clock.elapsedTime * 0.02;
        meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.01) * 0.1;
    }
  });

  return (
    <group>
        {/* Distant Grid Floor for spatial reference */}
        <gridHelper 
          args={[200, 80, 0x1e293b, 0x0f172a]} 
          position={[0, -20, 0]} 
        />
        
        {/* Large Surrounding Wireframe Sphere/Icosahedron */}
        <mesh ref={meshRef} scale={[70, 70, 70]}>
            <icosahedronGeometry args={[1, 2]} />
            <meshBasicMaterial 
                color="#334155" 
                wireframe 
                transparent 
                opacity={0.03} 
                side={THREE.BackSide} 
            />
        </mesh>

        {/* Ambient colored glow patches (Volumetric fake) */}
        {/* Purple/Blue Glow left */}
        <mesh position={[-30, 10, -40]}>
             <sphereGeometry args={[20, 32, 32]} />
             <meshBasicMaterial color="#312e81" transparent opacity={0.15} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
        
        {/* Cyan/Teal Glow right */}
        <mesh position={[30, -10, -40]}>
             <sphereGeometry args={[25, 32, 32]} />
             <meshBasicMaterial color="#064e3b" transparent opacity={0.15} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
    </group>
  );
});

const App: React.FC = () => {
  // State
  const [appState, setAppState] = useState<AppState>('IDLE');
  const [participants, setParticipants] = useState<Participant[]>(MOCK_PARTICIPANTS);
  const [prizes, setPrizes] = useState<PrizeConfig[]>(INITIAL_PRIZES);
  const [selectedPrizeId, setSelectedPrizeId] = useState<string>(INITIAL_PRIZES[0].id);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [currentBatchWinners, setCurrentBatchWinners] = useState<Winner[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // Settings State
  const [title, setTitle] = useState("大明嘉靖四十年御前会议");
  const [revealDelay, setRevealDelay] = useState(2000); // Default 2 seconds delay

  // Audio Refs
  const bgMusicRef = useRef<HTMLAudioElement>(new Audio(MUSIC_URL));
  const winSoundRef = useRef<HTMLAudioElement>(new Audio(WIN_SOUND_URL));

  // Initialize Audio settings
  useEffect(() => {
    bgMusicRef.current.loop = true;
    bgMusicRef.current.volume = 0.4;
  }, []);

  // Filter out people who already won
  const eligibleParticipants = participants.filter(
    p => !winners.some(w => w.participant.id === p.id)
  );

  // Ensure selected prize ID is valid (if prizes changed)
  useEffect(() => {
    if (!prizes.find(p => p.id === selectedPrizeId) && prizes.length > 0) {
      setSelectedPrizeId(prizes[0].id);
    }
  }, [prizes, selectedPrizeId]);

  // --- Logic ---

  const handleStart = useCallback(() => {
    if (eligibleParticipants.length === 0) {
      alert("没有符合条件的参与者了！");
      return;
    }
    setAppState('RUNNING');
    bgMusicRef.current.play().catch(e => console.log("Audio play failed (interaction required)", e));
  }, [eligibleParticipants.length]);

  const handleStop = useCallback(() => {
    const currentPrize = prizes.find(p => p.id === selectedPrizeId);
    if (!currentPrize) return;

    // Determine how many to pick
    const winnersForThisPrize = winners.filter(w => w.prizeId === selectedPrizeId);
    const spotsLeft = Math.max(0, currentPrize.count - winnersForThisPrize.length);
    
    // Draw all remaining spots. 
    const batchSize = spotsLeft; 

    if (batchSize === 0) {
      setAppState('IDLE');
      bgMusicRef.current.pause();
      alert("该奖项名额已满！");
      return;
    }

    // Random Selection
    const shuffled = [...eligibleParticipants].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, batchSize);

    const newWinners: Winner[] = selected.map(p => ({
      participant: p,
      prizeId: selectedPrizeId,
      timestamp: Date.now()
    }));

    setWinners(prev => [...prev, ...newWinners]);
    setCurrentBatchWinners(newWinners);
    setAppState('SHOWING_WINNERS');
    
    // Effects
    bgMusicRef.current.pause();
    bgMusicRef.current.currentTime = 0;
    // Note: Win sound will now be handled by the overlay one-by-one
    
    // Initial Confetti
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: [currentPrize.color, '#ffffff']
    });

  }, [eligibleParticipants, prizes, selectedPrizeId, winners]);

  const toggleRun = useCallback(() => {
    if (appState === 'IDLE') {
      handleStart();
    } else if (appState === 'RUNNING') {
      handleStop();
    }
  }, [appState, handleStart, handleStop]);

  const handleCloseOverlay = () => {
    setAppState('IDLE');
    setCurrentBatchWinners([]);
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isSettingsOpen) {
        e.preventDefault(); // Prevent scrolling
        // If showing winners, close overlay. Else toggle run.
        if (appState === 'SHOWING_WINNERS') {
           // Only close if all revealed? Or force close? 
           // Let's keep it simple: space closes overlay if open
           handleCloseOverlay();
        } else {
           toggleRun();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [appState, toggleRun, isSettingsOpen]);

  return (
    <div className="relative w-full h-screen bg-[#020617] overflow-hidden">
      
      {/* 3D Scene */}
      <div className="absolute inset-0 z-0">
        <Canvas 
          camera={{ position: [0, 0, 28], fov: 50 }} 
          dpr={[1, 1.25]}
          gl={{ antialias: false, toneMappingExposure: 1.1 }}
        >
          {/* Environment - Deep Blue/Slate Theme */}
          <color attach="background" args={['#020617']} />
          <fog attach="fog" args={['#020617', 20, 60]} />
          
          <Suspense fallback={<Loader />}>
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} intensity={2} color="#38bdf8" />
            <pointLight position={[-10, -10, -10]} intensity={2} color="#e879f9" />
            
            <BackgroundDecoration />
            
            {/* Reduced stars as we have other elements now */}
            <Stars radius={120} depth={50} count={1000} factor={4} saturation={0} fade speed={0.5} />
            
            <TagCloud 
              participants={eligibleParticipants.concat(winners.map(w => w.participant))} 
              isRunning={appState === 'RUNNING'} 
              highlightedIds={[]} 
            />
            
            <OrbitControls 
              enableZoom={false} 
              autoRotate={false} 
              enableDamping={true}
              dampingFactor={0.05}
              rotateSpeed={0.5}
            />

            <EffectComposer enableNormalPass={false} multisampling={0}>
              <Bloom 
                luminanceThreshold={0.2} 
                mipmapBlur 
                intensity={1.0} 
                radius={0.4}
              />
            </EffectComposer>
          </Suspense>
        </Canvas>
      </div>

      {/* Vignette Overlay */}
      <div className="absolute inset-0 z-10 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(2,6,23,0.8)_100%)]"></div>
      
      {/* Subtle Blue/Purple Top Gradient for depth */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-blue-950/30 to-transparent z-10 pointer-events-none"></div>

      {/* Scanlines Effect (CSS) */}
      <div className="absolute inset-0 z-10 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] pointer-events-none"></div>

      {/* Header Info */}
      <div className="absolute top-0 left-0 right-0 p-8 z-20 flex justify-between items-start pointer-events-none">
        <div>
           {/* Custom Title Display */}
           <h1 className="text-4xl md:text-5xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-100 via-white to-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.5)] tracking-widest uppercase">
             {title}
           </h1>
           <div className="mt-2 flex gap-6 text-sm text-cyan-500/80 font-mono tracking-wider">
              <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span> 总人数: {participants.length}</span>
              <span>待抽奖: {eligibleParticipants.length}</span>
              <span>已中奖: {winners.length}</span>
           </div>
        </div>
      </div>

      <Controls 
        appState={appState}
        prizes={prizes}
        selectedPrizeId={selectedPrizeId}
        onSelectPrize={setSelectedPrizeId}
        onToggleRun={toggleRun}
        onOpenSettings={() => setIsSettingsOpen(true)}
        participantCount={eligibleParticipants.length}
      />

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)}
        participants={participants}
        setParticipants={setParticipants}
        resetWinners={() => setWinners([])}
        prizes={prizes}
        setPrizes={setPrizes}
        winners={winners}
        title={title}
        setTitle={setTitle}
        revealDelay={revealDelay}
        setRevealDelay={setRevealDelay}
      />

      <WinnersOverlay 
        isVisible={appState === 'SHOWING_WINNERS'} 
        winners={currentBatchWinners}
        prize={prizes.find(p => p.id === selectedPrizeId)!}
        onClose={handleCloseOverlay}
        revealDelay={revealDelay}
      />
    </div>
  );
};

export default App;