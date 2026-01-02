import React, { useMemo, useRef, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Participant } from '../types';

// Declare types for TS
declare global {
  namespace JSX {
    interface IntrinsicElements {
      lineSegments: any;
      lineBasicMaterial: any;
      group: any;
      mesh: any;
      torusGeometry: any;
      meshBasicMaterial: any;
      instancedMesh: any;
      sphereGeometry: any;
      boxGeometry: any;
      meshStandardMaterial: any; 
      planeGeometry: any;
    }
  }
}

interface TagCloudProps {
  participants: Participant[];
  isRunning: boolean;
  highlightedIds: string[];
}

// Sphere Radius
const SPHERE_RADIUS = 9.0;

// Colors
const COLOR_NEON_BLUE = new THREE.Color('#22d3ee'); // Cyan-400
const COLOR_NEON_AMBER = new THREE.Color('#fbbf24'); // Amber-400

// --- Performance Optimization: Shared Geometries & Materials ---
const sharedBoxGeometry = new THREE.BoxGeometry(1.4, 2.0, 0.05);
const sharedPlaneGeometry = new THREE.PlaneGeometry(1.4, 2.0);

// Materials - Holographic Glass Style
// Base (Blueish)
const baseBodyMaterial = new THREE.MeshStandardMaterial({
  color: '#083344', // Cyan 950 base
  emissive: '#06b6d4', // Cyan 500 glow
  emissiveIntensity: 0.2, // Subtle self-illumination
  transparent: true,
  opacity: 0.4, // Semi-transparent glass
  roughness: 0.2,
  metalness: 0.8,
});

// Highlight (Amber/Gold)
const highlightBodyMaterial = new THREE.MeshStandardMaterial({
  color: '#451a03', // Amber 950 base
  emissive: '#f59e0b', // Amber 500 glow
  emissiveIntensity: 0.6, // Stronger glow for winner
  transparent: true,
  opacity: 0.8,
  roughness: 0.1,
  metalness: 1.0,
});

// Helper to format ID
const formatId = (id: string) => {
  const num = id.replace(/\D/g, '');
  return num.padStart(6, '0');
};

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

// --- Texture Generation (Sci-Fi Hologram Style) ---
const createCardTexture = (participant: Participant, isHighlighted: boolean) => {
  const canvas = document.createElement('canvas');
  const width = 256; 
  const height = 366; 
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) return null;

  ctx.clearRect(0, 0, width, height);
  const virtualWidth = 512;
  const virtualHeight = 732;
  
  const scale = width / virtualWidth; 
  ctx.scale(scale, scale);

  const primaryColor = isHighlighted ? '#fbbf24' : '#22d3ee'; 
  const secondaryColor = isHighlighted ? '#fffbeb' : '#cffafe';
  
  // 1. Background Gradient (Glass Effect)
  // Create a gradient that is lighter at top-left and darker at bottom-right
  const gradient = ctx.createLinearGradient(0, 0, virtualWidth, virtualHeight);
  if (isHighlighted) {
      gradient.addColorStop(0, 'rgba(245, 158, 11, 0.3)'); // Amber transparent
      gradient.addColorStop(1, 'rgba(120, 53, 15, 0.1)');
  } else {
      gradient.addColorStop(0, 'rgba(6, 182, 212, 0.25)'); // Cyan transparent
      gradient.addColorStop(1, 'rgba(8, 51, 68, 0.1)'); // Darker at bottom
  }

  // Draw background shape with cut corners
  ctx.fillStyle = gradient;
  const cornerSize = 40;
  ctx.beginPath();
  ctx.moveTo(0, cornerSize);
  ctx.lineTo(cornerSize, 0);
  ctx.lineTo(virtualWidth - cornerSize, 0);
  ctx.lineTo(virtualWidth, cornerSize);
  ctx.lineTo(virtualWidth, virtualHeight - cornerSize);
  ctx.lineTo(virtualWidth - cornerSize, virtualHeight);
  ctx.lineTo(cornerSize, virtualHeight);
  ctx.lineTo(0, virtualHeight - cornerSize);
  ctx.closePath();
  ctx.fill();

  // 2. Inner Frame / Stroke (To make it pop against black bg)
  ctx.lineWidth = 4;
  ctx.strokeStyle = isHighlighted ? 'rgba(251, 191, 36, 0.5)' : 'rgba(34, 211, 238, 0.3)';
  ctx.stroke();

  // 3. Tech Grid Overlay
  ctx.strokeStyle = isHighlighted ? 'rgba(251, 191, 36, 0.1)' : 'rgba(34, 211, 238, 0.08)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  // Draw a simple grid
  for(let x=0; x<=virtualWidth; x+=80) {
      ctx.moveTo(x, 0); ctx.lineTo(x, virtualHeight);
  }
  for(let y=0; y<=virtualHeight; y+=80) {
      ctx.moveTo(0, y); ctx.lineTo(virtualWidth, y);
  }
  ctx.stroke();

  // 4. HUD Elements
  ctx.lineWidth = 8;
  ctx.strokeStyle = primaryColor;
  ctx.lineCap = 'butt'; 

  // Top Left Bracket
  ctx.beginPath();
  ctx.moveTo(0, 120); ctx.lineTo(0, cornerSize); ctx.lineTo(cornerSize, 0); ctx.lineTo(160, 0);
  ctx.stroke();

  // Bottom Right Bracket
  ctx.beginPath();
  ctx.moveTo(virtualWidth, virtualHeight - 120); ctx.lineTo(virtualWidth, virtualHeight - cornerSize); ctx.lineTo(virtualWidth - cornerSize, virtualHeight); ctx.lineTo(virtualWidth - 160, virtualHeight);
  ctx.stroke();

  // 5. Content
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Decorative header bits
  ctx.fillStyle = secondaryColor;
  ctx.fillRect(30, 40, 20, 20);
  ctx.fillRect(55, 40, 6, 20);
  ctx.fillRect(65, 40, 6, 20);
  
  ctx.font = '600 32px "Orbitron"';
  ctx.fillStyle = secondaryColor;
  ctx.textAlign = 'right';
  ctx.fillText('ID: ' + formatId(participant.id), virtualWidth - 30, 50);
  
  ctx.textAlign = 'center';

  // Name
  // Add a subtle text shadow/glow
  ctx.shadowColor = primaryColor;
  ctx.shadowBlur = 10;
  ctx.font = '900 100px "Microsoft YaHei", "PingFang SC", sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(participant.name, virtualWidth / 2, virtualHeight / 2 - 20);
  ctx.shadowBlur = 0;

  // Department Box Background
  const deptY = virtualHeight - 100;
  // Gradient for dept box
  const deptGrad = ctx.createLinearGradient(80, 0, virtualWidth-80, 0);
  deptGrad.addColorStop(0, 'rgba(0,0,0,0)');
  deptGrad.addColorStop(0.2, isHighlighted ? 'rgba(245, 158, 11, 0.3)' : 'rgba(6, 182, 212, 0.2)');
  deptGrad.addColorStop(0.8, isHighlighted ? 'rgba(245, 158, 11, 0.3)' : 'rgba(6, 182, 212, 0.2)');
  deptGrad.addColorStop(1, 'rgba(0,0,0,0)');

  ctx.fillStyle = deptGrad;
  ctx.fillRect(80, deptY - 30, virtualWidth - 160, 60);
  
  // Department Text
  ctx.font = '700 40px "Orbitron", sans-serif';
  ctx.fillStyle = secondaryColor;
  ctx.fillText(getDeptCode(participant.department) + " DIVISION", virtualWidth / 2, deptY);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 2;
  return texture;
};

// --- Math & Geometry ---

const getFibonacciSpherePoints = (samples: number, radius: number) => {
  const points = [];
  if (samples <= 0) return points;
  const phi = Math.PI * (3 - Math.sqrt(5)); 
  for (let i = 0; i < samples; i++) {
    const y = 1 - (i / Math.max(1, samples - 1)) * 2; 
    const radiusAtY = Math.sqrt(1 - y * y); 
    const theta = phi * i; 
    const x = Math.cos(theta) * radiusAtY;
    const z = Math.sin(theta) * radiusAtY;
    points.push(new THREE.Vector3(x * radius, y * radius, z * radius));
  }
  return points;
};

// --- Components ---

const Connections: React.FC<{ points: THREE.Vector3[] }> = React.memo(({ points }) => {
  const lines = useMemo(() => {
    const linePoints: THREE.Vector3[] = [];
    const threshold = 3.5; 
    const maxConnections = 2; 

    for (let i = 0; i < points.length; i++) {
      let connections = 0;
      for (let j = i + 1; j < points.length; j++) {
        if (points[i].distanceTo(points[j]) < threshold) {
          linePoints.push(points[i]);
          linePoints.push(points[j]);
          connections++;
          if (connections >= maxConnections) break;
        }
      }
    }
    return linePoints;
  }, [points]);

  if (lines.length === 0) return null;

  const geometry = useMemo(() => {
    return new THREE.BufferGeometry().setFromPoints(lines);
  }, [lines]);

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color="#0e7490" transparent opacity={0.15} depthWrite={false} />
    </lineSegments>
  );
});

const TechRings = React.memo(() => {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.05;
      groupRef.current.rotation.z = state.clock.elapsedTime * 0.02;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[SPHERE_RADIUS * 1.4, 0.05, 16, 50]} />
        <meshBasicMaterial color="#22d3ee" transparent opacity={0.3} />
      </mesh>
      
      <mesh rotation={[Math.PI / 3, Math.PI / 4, 0]}>
         <torusGeometry args={[SPHERE_RADIUS * 1.6, 0.02, 16, 40]} />
         <meshBasicMaterial color="#c084fc" transparent opacity={0.2} />
      </mesh>
    </group>
  );
});

const FloatingParticles = React.memo(() => {
  const count = 100;
  const mesh = useRef<THREE.InstancedMesh>(null);
  
  const particles = useMemo(() => {
    const temp = [];
    for(let i=0; i<count; i++) {
      const r = SPHERE_RADIUS * (1.2 + Math.random() * 0.8);
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);
      temp.push({ pos: new THREE.Vector3(x, y, z), speed: Math.random() * 0.02 + 0.005 });
    }
    return temp;
  }, []);

  const dummy = new THREE.Object3D();

  useFrame((state) => {
    if(!mesh.current) return;
    particles.forEach((p, i) => {
      const time = state.clock.elapsedTime;
      const x = p.pos.x * Math.cos(p.speed * time) - p.pos.z * Math.sin(p.speed * time);
      const z = p.pos.x * Math.sin(p.speed * time) + p.pos.z * Math.cos(p.speed * time);
      
      dummy.position.set(x, p.pos.y + Math.sin(time * p.speed * 2) * 0.5, z);
      dummy.scale.setScalar(Math.sin(time * 2 + i) * 0.5 + 0.5); 
      dummy.updateMatrix();
      mesh.current!.setMatrixAt(i, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
      <sphereGeometry args={[0.08, 6, 6]} />
      <meshBasicMaterial color="#22d3ee" transparent opacity={0.6} />
    </instancedMesh>
  );
});

const TagCloudItem: React.FC<{ participant: Participant; position: THREE.Vector3; isHighlighted: boolean }> = React.memo(({ participant, position, isHighlighted }) => {
  const groupRef = useRef<THREE.Group>(null);
  
  const texture = useMemo(() => {
    return createCardTexture(participant, isHighlighted);
  }, [participant, isHighlighted]);

  useLayoutEffect(() => {
    if (groupRef.current) {
      if (Math.abs(position.x) < 0.1 && Math.abs(position.z) < 0.1) {
        groupRef.current.up.set(0, 0, 1);
      } else {
        groupRef.current.up.set(0, 1, 0);
      }
      groupRef.current.lookAt(0, 0, 0); 
      groupRef.current.rotateY(Math.PI); 
      
      return () => {
        texture?.dispose();
      };
    }
  }, [position, texture]);

  return (
    <group ref={groupRef} position={position}>
      {/* Back Plate */}
      <mesh 
        geometry={sharedBoxGeometry} 
        material={isHighlighted ? highlightBodyMaterial : baseBodyMaterial} 
      />

      {/* Text Plane */}
      {texture && (
        <mesh position={[0, 0, 0.06]} geometry={sharedPlaneGeometry}>
          <meshBasicMaterial 
            map={texture} 
            transparent={true} 
            side={THREE.DoubleSide}
            depthTest={false} 
            blending={THREE.AdditiveBlending} // Make texture self-illuminated
          />
        </mesh>
      )}
    </group>
  );
}, (prev, next) => {
    return prev.isHighlighted === next.isHighlighted && prev.participant.id === next.participant.id;
});

export const TagCloud: React.FC<TagCloudProps> = ({ participants, isRunning, highlightedIds }) => {
  const groupRef = useRef<THREE.Group>(null);
  const currentSpeed = useRef(0.1); 
  const startTimeRef = useRef(0);

  const points = useMemo(() => {
    return getFibonacciSpherePoints(participants.length, SPHERE_RADIUS);
  }, [participants.length]);

  useFrame((state, delta) => {
    if (startTimeRef.current === 0) startTimeRef.current = state.clock.elapsedTime;

    if (groupRef.current) {
      const targetSpeed = isRunning ? 4.0 : 0.15; 
      currentSpeed.current = THREE.MathUtils.lerp(currentSpeed.current, targetSpeed, delta * 1.5);
      groupRef.current.rotation.y -= currentSpeed.current * delta;
      
      if (!isRunning) {
        groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.2) * 0.05;
        groupRef.current.rotation.z = Math.cos(state.clock.elapsedTime * 0.15) * 0.05;
      }
    }
  });

  if (participants.length === 0) return null;

  return (
    <group>
      <group ref={groupRef}>
        <Connections points={points} />
        {participants.map((p, i) => {
          const position = points[i] || new THREE.Vector3(0, 0, 0);
          return (
            <TagCloudItem 
              key={p.id}
              participant={p}
              position={position}
              isHighlighted={highlightedIds.includes(p.id)}
            />
          );
        })}
      </group>
      
      <TechRings />
      <FloatingParticles />
    </group>
  );
};