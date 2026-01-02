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

  // Audio Control Effect
  useEffect(() => {
    if (appState === 'RUNNING') {
      bgMusicRef.current.play().catch(e => console.log("Audio play blocked", e));
      bgMusicRef.current.volume = 0.6;
    } else {
      bgMusicRef.current.volume = 0.2;
      // Don't pause, keep ambience
    }
  }, [appState]);

  // Logic: Pick Winners
  const handleDraw = useCallback(() => {
    const prize = prizes.find(p => p.id === selectedPrizeId);
    if (!prize) return;

    // How many to draw?
    const drawCount = Math.min(prize.count, eligibleParticipants.length);
    if (drawCount === 0) {
      alert("该奖项已无可抽人员！");
      setAppState('IDLE');
      return;
    }

    // Shuffle and pick
    const shuffled = [...eligibleParticipants].sort(() => 0.5 - Math.random());
    const newWinners = shuffled.slice(0, drawCount).map(p => ({
      participant: p,
      prizeId: prize.id,
      timestamp: Date.now()
    }));

    // Update global winners and current batch
    setWinners(prev => [...prev, ...newWinners]);
    setCurrentBatchWinners(newWinners);

    // Transition state
    setAppState('SHOWING_WINNERS');
  }, [eligibleParticipants, prizes, selectedPrizeId]);

  // Handle Spacebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        
        // If settings open, ignore
        if (isSettingsOpen) return;

        if (appState === 'IDLE') {
          setAppState('RUNNING');
        } else if (appState === 'RUNNING') {
          handleDraw();
        } else if (appState === 'SHOWING_WINNERS') {
          setAppState('IDLE');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [appState, handleDraw, isSettingsOpen]);


  const toggleRun = () => {
    if (appState === 'IDLE') {
      setAppState('RUNNING');
    } else if (appState === 'RUNNING') {
      handleDraw();
    }
  };

  const closeWinnersOverlay = () => {
    setAppState('IDLE');
  };

  const resetWinners = () => {
    setWinners([]);
    setCurrentBatchWinners([]);
  };

  return (
    <div className="w-full h-screen bg-black overflow-hidden relative select-none">
      
      {/* Title Bar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex flex-col items-center pt-8 pointer-events-none">
         <h1 className="text-3xl md:text-5xl font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-200 via-teal-400 to-emerald-200 drop-shadow-[0_0_15px_rgba(52,211,153,0.5)] tracking-wider">
           {title}
         </h1>
         <div className="h-px w-64 bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent mt-4"></div>
      </div>

      {/* 3D Scene */}
      <Canvas
        dpr={[1, 2]} // CRITICAL: Enable High DPR for sharp text on Retina screens
        gl={{ 
          antialias: true, // CRITICAL: Enable AA
          toneMapping: THREE.ACESFilmicToneMapping,
          outputColorSpace: THREE.SRGBColorSpace
        }}
        camera={{ position: [0, 0, 22], fov: 50 }}
      >
        <color attach="background" args={['#050b14']} />
        <fog attach="fog" args={['#050b14', 20, 50]} />

        <Suspense fallback={<Loader />}>
          <OrbitControls 
            autoRotate={appState === 'RUNNING'}
            autoRotateSpeed={appState === 'RUNNING' ? 5 : 0.5}
            enablePan={false}
            enableZoom={true}
            minDistance={10}
            maxDistance={40}
          />
          
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={1} color="#22d3ee" />
          <pointLight position={[-10, -10, -10]} intensity={0.5} color="#fbbf24" />
          
          {/* Reduced star count for performance */}
          <Stars radius={100} depth={50} count={2000} factor={4} saturation={0} fade speed={1} />
          
          <BackgroundDecoration />

          <TagCloud 
            participants={eligibleParticipants} 
            isRunning={appState === 'RUNNING'}
            highlightedIds={[]}
          />

          <EffectComposer enableNormalPass={false}>
            <Bloom 
              luminanceThreshold={0.4} // Lower threshold so texts glow
              mipmapBlur 
              intensity={1.2} 
              radius={0.6}
            />
          </EffectComposer>
        </Suspense>
      </Canvas>

      {/* UI Controls */}
      <Controls 
        appState={appState}
        prizes={prizes}
        selectedPrizeId={selectedPrizeId}
        onSelectPrize={setSelectedPrizeId}
        onToggleRun={toggleRun}
        onOpenSettings={() => setIsSettingsOpen(true)}
        participantCount={eligibleParticipants.length}
      />

      {/* Winners Reveal Overlay */}
      <WinnersOverlay 
        winners={currentBatchWinners}
        prize={prizes.find(p => p.id === selectedPrizeId) || prizes[0]}
        isVisible={appState === 'SHOWING_WINNERS'}
        onClose={closeWinnersOverlay}
        revealDelay={revealDelay}
      />

      {/* Settings Modal */}
      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        participants={participants}
        setParticipants={setParticipants}
        resetWinners={resetWinners}
        prizes={prizes}
        setPrizes={setPrizes}
        winners={winners}
        title={title}
        setTitle={setTitle}
        revealDelay={revealDelay}
        setRevealDelay={setRevealDelay}
      />
    </div>
  );
};

export default App;
