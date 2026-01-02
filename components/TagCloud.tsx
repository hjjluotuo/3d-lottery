import React, { useMemo, useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
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

// Texture Resolution (Optimized High Definition)
// 1024 was overkill and heavy on memory. 768px width is very sharp on 4K with DPR=2
const TEX_WIDTH = 768;
const TEX_HEIGHT = 1098;

// --- Shared Geometries & Materials ---
const sharedBoxGeometry = new THREE.BoxGeometry(1.4, 2.0, 0.05);
const sharedPlaneGeometry = new THREE.PlaneGeometry(1.4, 2.0);

// Materials
const baseBodyMaterial = new THREE.MeshStandardMaterial({
  color: '#0f172a', 
  emissive: '#06b6d4', 
  emissiveIntensity: 0.15,
  transparent: true,
  opacity: 0.3,
  roughness: 0.1,
  metalness: 0.8,
});

const highlightBodyMaterial = new THREE.MeshStandardMaterial({
  color: '#451a03', 
  emissive: '#f59e0b', 
  emissiveIntensity: 1.5, 
  transparent: true,
  opacity: 0.9, 
  roughness: 0.2,
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

// --- Texture Generation ---
const createCardTexture = (participant: Participant, isHighlighted: boolean, renderer: THREE.WebGLRenderer) => {
  const canvas = document.createElement('canvas');
  canvas.width = TEX_WIDTH;
  canvas.height = TEX_HEIGHT;
  const ctx = canvas.getContext('2d');

  if (!ctx) return null;

  // Clear
  ctx.clearRect(0, 0, TEX_WIDTH, TEX_HEIGHT);

  // Theme Config
  const theme = isHighlighted ? {
      bgGradientStart: 'rgba(255, 85, 0, 0.9)', 
      bgGradientEnd: 'rgba(200, 40, 0, 0.95)',
      border: '#ffffff',
      textPrimary: '#ffffff',
      textSecondary: 'rgba(255, 255, 255, 0.9)',
      glowColor: '#ffaa00',
      textShadowBlur: 30
  } : {
      bgGradientStart: 'rgba(6, 182, 212, 0.2)',
      bgGradientEnd: 'rgba(8, 51, 68, 0.4)', 
      border: 'rgba(34, 211, 238, 0.5)', 
      textPrimary: '#ccfbf1',
      textSecondary: 'rgba(34, 211, 238, 0.8)',
      glowColor: '#22d3ee',
      textShadowBlur: 0
  };

  // 1. Background (Cut Corners Shape)
  const gradient = ctx.createLinearGradient(0, 0, 0, TEX_HEIGHT);
  gradient.addColorStop(0, theme.bgGradientStart);
  gradient.addColorStop(1, theme.bgGradientEnd);
  
  ctx.fillStyle = gradient;
  
  // Adjusted corner size for new resolution
  const corner = 90; 
  ctx.beginPath();
  ctx.moveTo(0, corner);
  ctx.lineTo(corner, 0);
  ctx.lineTo(TEX_WIDTH - corner, 0);
  ctx.lineTo(TEX_WIDTH, corner);
  ctx.lineTo(TEX_WIDTH, TEX_HEIGHT - corner);
  ctx.lineTo(TEX_WIDTH - corner, TEX_HEIGHT);
  ctx.lineTo(corner, TEX_HEIGHT);
  ctx.lineTo(0, TEX_HEIGHT - corner);
  ctx.closePath();
  ctx.fill();

  // 2. Border
  ctx.lineWidth = 10; 
  ctx.strokeStyle = theme.border;
  ctx.stroke();

  // 3. Tech Lines
  ctx.lineWidth = 4;
  ctx.strokeStyle = isHighlighted ? 'rgba(255,255,255,0.5)' : 'rgba(34,211,238,0.3)';
  ctx.beginPath();
  ctx.moveTo(corner + 30, 80); ctx.lineTo(TEX_WIDTH - corner - 30, 80);
  ctx.moveTo(corner + 30, TEX_HEIGHT - 80); ctx.lineTo(TEX_WIDTH - corner - 30, TEX_HEIGHT - 80);
  ctx.stroke();

  // 4. Text Content
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // "MoShang"
  ctx.font = '600 64px "Orbitron"'; 
  ctx.fillStyle = theme.textSecondary;
  ctx.fillText('MoShang', TEX_WIDTH / 2, 160); 

  // Name
  ctx.font = '900 190px "Microsoft YaHei", "PingFang SC", sans-serif'; 
  ctx.fillStyle = theme.textPrimary;
  
  if (isHighlighted) {
    ctx.shadowColor = theme.glowColor;
    ctx.shadowBlur = theme.textShadowBlur;
  }
  ctx.fillText(participant.name, TEX_WIDTH / 2, TEX_HEIGHT / 2 - 60);
  ctx.shadowBlur = 0; 

  // ID
  ctx.font = '500 72px "Orbitron"'; 
  ctx.fillStyle = theme.textSecondary;
  ctx.letterSpacing = "6px";
  ctx.fillText(formatId(participant.id), TEX_WIDTH / 2, TEX_HEIGHT / 2 + 100);

  // Department
  const deptCode = getDeptCode(participant.department);
  ctx.font = '700 130px "Orbitron"'; 
  ctx.fillStyle = theme.textPrimary;
  if (isHighlighted) {
      const textGrad = ctx.createLinearGradient(0, TEX_HEIGHT - 240, 0, TEX_HEIGHT - 120);
      textGrad.addColorStop(0, '#ffffff');
      textGrad.addColorStop(1, '#fbbf24');
      ctx.fillStyle = textGrad;
  }
  ctx.fillText(deptCode, TEX_WIDTH / 2, TEX_HEIGHT - 180);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  // Performance: Limit anisotropy to 4. 16 is overkill and slow.
  texture.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 4);
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;

  return texture;
};

// --- Geometry Helper ---
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

const BackgroundInstances: React.FC<{ 
    points: THREE.Vector3[], 
    participants: Participant[], 
    highlightedIds: string[] 
}> = React.memo(({ points, participants, highlightedIds }) => {
    
    // We render two InstancedMeshes: one for normal, one for highlighted
    // This is more performant than updating materials per instance or using complex shaders
    const normalRef = useRef<THREE.InstancedMesh>(null);
    const highlightRef = useRef<THREE.InstancedMesh>(null);
    
    // Calculate matrices once
    const matrices = useMemo(() => {
        const dummy = new THREE.Object3D();
        return points.map(pos => {
            dummy.position.copy(pos);
            // Replicate the lookAt logic from TagCloudItem
            // Look at center, then rotate 180 deg to face outwards correctly
            dummy.lookAt(0, 0, 0);
            dummy.rotateY(Math.PI);
            dummy.updateMatrix();
            return dummy.matrix.clone();
        });
    }, [points]);

    // Update instances layout
    useEffect(() => {
        if (!normalRef.current || !highlightRef.current) return;

        let normalIdx = 0;
        let highlightIdx = 0;

        participants.forEach((p, i) => {
            const isHighlighted = highlightedIds.includes(p.id);
            const matrix = matrices[i];

            if (isHighlighted) {
                highlightRef.current!.setMatrixAt(highlightIdx++, matrix);
            } else {
                normalRef.current!.setMatrixAt(normalIdx++, matrix);
            }
        });

        normalRef.current.count = normalIdx;
        highlightRef.current.count = highlightIdx;
        
        normalRef.current.instanceMatrix.needsUpdate = true;
        highlightRef.current.instanceMatrix.needsUpdate = true;

    }, [participants, highlightedIds, matrices]);

    return (
        <group>
            <instancedMesh ref={normalRef} args={[sharedBoxGeometry, baseBodyMaterial, participants.length]} />
            <instancedMesh ref={highlightRef} args={[sharedBoxGeometry, highlightBodyMaterial, participants.length]} />
        </group>
    );
});

// Optimized TagCloudItem: Only handles the Text Plane (unique texture)
// The background box is now handled by BackgroundInstances
const TagCloudTextPlane: React.FC<{ participant: Participant; position: THREE.Vector3; isHighlighted: boolean }> = React.memo(({ participant, position, isHighlighted }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const { gl } = useThree();
  
  const texture = useMemo(() => {
    return createCardTexture(participant, isHighlighted, gl);
  }, [participant, isHighlighted, gl]);

  // Update position/rotation to match the instanced background
  useEffect(() => {
    if (meshRef.current) {
      if (Math.abs(position.x) < 0.1 && Math.abs(position.z) < 0.1) {
        meshRef.current.up.set(0, 0, 1);
      } else {
        meshRef.current.up.set(0, 1, 0);
      }
      meshRef.current.lookAt(0, 0, 0); 
      meshRef.current.rotateY(Math.PI); 
    }
  }, [position]);

  useEffect(() => {
    return () => {
        texture?.dispose();
    };
  }, [texture]);

  if (!texture) return null;

  return (
    <mesh 
        ref={meshRef} 
        position={position} 
        geometry={sharedPlaneGeometry}
        // Offset slightly to be in front of the box (0.05 thick / 2 = 0.025)
        // Box front is at +0.025 local Z. We put plane at +0.06 to be safe.
    >
      <meshBasicMaterial 
        map={texture} 
        transparent={true} 
        side={THREE.DoubleSide}
        depthTest={true} 
        blending={THREE.NormalBlending} 
        toneMapped={false} 
      />
    </mesh>
  );
}, (prev, next) => {
    return prev.isHighlighted === next.isHighlighted && prev.participant.id === next.participant.id;
});


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
  // Reduced particle count for performance
  const count = 50;
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
        
        {/* Render consolidated backgrounds via InstancedMesh (Fast!) */}
        <BackgroundInstances 
            points={points} 
            participants={participants} 
            highlightedIds={highlightedIds} 
        />

        {/* Render text planes individually (Texture heavy but necessary for unique names) */}
        {participants.map((p, i) => {
          const position = points[i] || new THREE.Vector3(0, 0, 0);
          return (
            <TagCloudTextPlane 
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
