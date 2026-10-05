import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three-stdlib';
import './Dice.css';
import { playRollSound } from '../../utils/audio';

function createDiceFace(number) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  
  // Background with subtle off-white for realism
  ctx.fillStyle = '#f8f9fa';
  ctx.fillRect(0, 0, 256, 256);
  
  // Subtle border/bevel shadow effect
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 12;
  ctx.strokeRect(6, 6, 244, 244);

  ctx.fillStyle = '#1e293b'; // dark pips
  const drawDot = (x, y) => {
    ctx.beginPath();
    ctx.arc(x, y, 22, 0, Math.PI * 2);
    ctx.fill();
  };

  const c = 128;
  const l = 64;
  const r = 192;
  
  if (number === 1) {
    ctx.fillStyle = '#ef4444'; // Red center for 1 is common
    ctx.beginPath();
    ctx.arc(c, c, 34, 0, Math.PI * 2);
    ctx.fill();
  } else if (number === 2) {
    drawDot(l, l); drawDot(r, r);
  } else if (number === 3) {
    drawDot(l, l); drawDot(c, c); drawDot(r, r);
  } else if (number === 4) {
    drawDot(l, l); drawDot(r, r); drawDot(l, r); drawDot(r, l);
  } else if (number === 5) {
    drawDot(l, l); drawDot(r, r); drawDot(l, r); drawDot(r, l); drawDot(c, c);
  } else if (number === 6) {
    drawDot(l, 48); drawDot(r, 48);
    drawDot(l, c); drawDot(r, c);
    drawDot(l, 208); drawDot(r, 208);
  }
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 16;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const getRotationForNumber = (num) => {
  // RoundedBoxGeometry from three-stdlib preserves standard BoxGeometry groups: 
  // [Right, Left, Top, Bottom, Front, Back]
  // Target: Face +Z (Front) to camera.
  // 0: Right (1): +X -> +Z (rotate Y by -90)
  // 1: Left (6): -X -> +Z (rotate Y by +90)
  // 2: Top (2): +Y -> +Z (rotate X by +90)
  // 3: Bottom (5): -Y -> +Z (rotate X by -90)
  // 4: Front (3): +Z -> +Z (no rotation)
  // 5: Back (4): -Z -> +Z (rotate Y by +180)
  switch (num) {
    case 1: return [0, -Math.PI / 2, 0];
    case 6: return [0, Math.PI / 2, 0];
    case 2: return [Math.PI / 2, 0, 0];
    case 5: return [-Math.PI / 2, 0, 0];
    case 3: return [0, 0, 0];
    case 4: return [0, Math.PI, 0];
    default: return [0, 0, 0];
  }
};

const DiceMesh = ({ forceValue, rollId, onAnimComplete }) => {
  const diceRef = useRef();
  const geometryRef = useRef();
  
  const materials = useMemo(() => {
    return [
      new THREE.MeshStandardMaterial({ map: createDiceFace(1), roughness: 0.4, metalness: 0.1 }),
      new THREE.MeshStandardMaterial({ map: createDiceFace(6), roughness: 0.4, metalness: 0.1 }),
      new THREE.MeshStandardMaterial({ map: createDiceFace(2), roughness: 0.4, metalness: 0.1 }),
      new THREE.MeshStandardMaterial({ map: createDiceFace(5), roughness: 0.4, metalness: 0.1 }),
      new THREE.MeshStandardMaterial({ map: createDiceFace(3), roughness: 0.4, metalness: 0.1 }),
      new THREE.MeshStandardMaterial({ map: createDiceFace(4), roughness: 0.4, metalness: 0.1 }),
    ];
  }, []);

  useEffect(() => {
    return () => {
      materials.forEach(mat => {
        if (mat.map) mat.map.dispose();
        mat.dispose();
      });
      if (geometryRef.current) geometryRef.current.dispose();
    };
  }, [materials]);

  const animating = useRef(false);
  const startTime = useRef(0);
  const startRot = useRef([0, 0, 0]);
  const randomSpins = useRef([0, 0, 0]);
  const targetRot = useRef([0, 0, 0]);

  useEffect(() => {
    if (rollId > 0 && forceValue) {
      animating.current = true;
      playRollSound();
      
      const baseRot = getRotationForNumber(forceValue);
      targetRot.current = baseRot;
      
      randomSpins.current = [
        baseRot[0] + Math.PI * 2 * (Math.floor(Math.random() * 3) + 2),
        baseRot[1] + Math.PI * 2 * (Math.floor(Math.random() * 3) + 2),
        baseRot[2] + Math.PI * 2 * (Math.floor(Math.random() * 3) + 2),
      ];
      
      startRot.current = [
        diceRef.current.rotation.x % (Math.PI * 2),
        diceRef.current.rotation.y % (Math.PI * 2),
        diceRef.current.rotation.z % (Math.PI * 2),
      ];
      
      startTime.current = performance.now();
    }
  }, [rollId, forceValue]);

  useFrame(() => {
    if (animating.current && diceRef.current) {
      const now = performance.now();
      let t = (now - startTime.current) / 800;
      if (t >= 1) {
        t = 1;
        animating.current = false;
        diceRef.current.rotation.set(...targetRot.current);
        diceRef.current.position.z = 0;
        if (onAnimComplete) onAnimComplete();
      } else {
        const ease = 1 - Math.pow(1 - t, 3);
        
        diceRef.current.rotation.x = THREE.MathUtils.lerp(startRot.current[0], randomSpins.current[0], ease);
        diceRef.current.rotation.y = THREE.MathUtils.lerp(startRot.current[1], randomSpins.current[1], ease);
        diceRef.current.rotation.z = THREE.MathUtils.lerp(startRot.current[2], randomSpins.current[2], ease);
        
        const bounce = Math.abs(Math.sin(t * Math.PI * 3)) * (1 - ease) * 1.5;
        diceRef.current.position.z = bounce;
      }
    }
  });

  useEffect(() => {
    if (!animating.current && diceRef.current) {
       diceRef.current.rotation.set(...getRotationForNumber(forceValue || 6));
    }
  }, []); // Only on mount

  // Build Geometry once
  useEffect(() => {
    if (!geometryRef.current) {
      geometryRef.current = new RoundedBoxGeometry(2, 2, 2, 4, 0.3);
      if (diceRef.current) {
        diceRef.current.geometry = geometryRef.current;
      }
    }
  }, []);

  return (
    <mesh ref={diceRef} castShadow material={materials}>
      <roundedBoxGeometry args={[2, 2, 2, 4, 0.3]} />
    </mesh>
  );
};

const Dice = ({ onRoll, disabled, forceValue, rollId, boostSix }) => {
  const [rolling, setRolling] = useState(false);
  const prevRollId = useRef(rollId);

  useEffect(() => {
    if (rollId > 0 && rollId !== prevRollId.current) {
      setRolling(true);
      prevRollId.current = rollId;
    }
  }, [rollId]);

  const handleRollClick = () => {
    if (rolling || disabled) return;
    
    if (onRoll) {
       let finalValue = Math.floor(Math.random() * 6) + 1;
       if (boostSix && Math.random() < 0.5) {
         finalValue = 6;
       }
       onRoll(finalValue);
    }
  };

  return (
    <div 
      className={`dice-container-3d ${disabled && !rolling ? 'disabled' : ''}`} 
      onClick={handleRollClick} 
      style={{ 
        width: '120px', 
        height: '120px', 
        cursor: disabled && !rolling ? 'not-allowed' : 'pointer', 
        margin: '0 auto',
        position: 'relative'
      }}
    >
      <Canvas shadows camera={{ position: [0, 0, 6], fov: 35 }}>
        <ambientLight intensity={0.8} />
        <directionalLight 
          position={[2, 2, 5]} 
          intensity={1.2} 
          castShadow 
          shadow-mapSize={[1024, 1024]}
        />
        <DiceMesh 
          forceValue={forceValue} 
          rollId={rollId}
          onAnimComplete={() => setRolling(false)} 
        />
        <ContactShadows 
          position={[0, 0, -1.2]} 
          rotation={[Math.PI / 2, 0, 0]}
          opacity={0.5} 
          scale={5} 
          blur={1.5} 
          far={2} 
        />
        <Environment preset="city" />
      </Canvas>
    </div>
  );
};

export default Dice;
