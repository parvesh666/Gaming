import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { RoundedBox, Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
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
  return texture;
}

const getRotationForNumber = (num) => {
  // BoxGeometry materials mapping: [Right, Left, Top, Bottom, Front, Back]
  // We want the resulting number to be on the Front face (+Z) facing the camera.
  // Face 0 (Right, 1): +X -> +Z (Y = -PI/2)
  // Face 1 (Left, 6): -X -> +Z (Y = PI/2)
  // Face 2 (Top, 2): +Y -> +Z (X = PI/2)
  // Face 3 (Bottom, 5): -Y -> +Z (X = -PI/2)
  // Face 4 (Front, 3): +Z -> +Z (No rotation)
  // Face 5 (Back, 4): -Z -> +Z (Y = PI)
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

const DiceMesh = ({ forceValue, onAnimComplete }) => {
  const diceRef = useRef();
  
  const materials = useMemo(() => {
    return [
      new THREE.MeshStandardMaterial({ map: createDiceFace(1), roughness: 0.2, metalness: 0.1 }),
      new THREE.MeshStandardMaterial({ map: createDiceFace(6), roughness: 0.2, metalness: 0.1 }),
      new THREE.MeshStandardMaterial({ map: createDiceFace(2), roughness: 0.2, metalness: 0.1 }),
      new THREE.MeshStandardMaterial({ map: createDiceFace(5), roughness: 0.2, metalness: 0.1 }),
      new THREE.MeshStandardMaterial({ map: createDiceFace(3), roughness: 0.2, metalness: 0.1 }),
      new THREE.MeshStandardMaterial({ map: createDiceFace(4), roughness: 0.2, metalness: 0.1 }),
    ];
  }, []);

  const animating = useRef(false);
  const startTime = useRef(0);
  const startRot = useRef([0, 0, 0]);
  const randomSpins = useRef([0, 0, 0]);

  const prevForceValue = useRef(forceValue);
  
  useEffect(() => {
    if (forceValue && forceValue !== prevForceValue.current) {
      animating.current = true;
      playRollSound();
      
      const baseRot = getRotationForNumber(forceValue);
      // Random spins for a chaotic physical roll
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
      
      setTimeout(() => {
        animating.current = false;
        // Snap precisely to avoid floating point errors
        diceRef.current.rotation.set(...baseRot);
        diceRef.current.position.z = 0;
        if (onAnimComplete) onAnimComplete();
      }, 800);
    }
    prevForceValue.current = forceValue;
  }, [forceValue, onAnimComplete]);

  useFrame(() => {
    if (animating.current && diceRef.current) {
      const now = performance.now();
      let t = (now - startTime.current) / 800;
      if (t > 1) t = 1;
      
      // Easing (easeOutCubic)
      const ease = 1 - Math.pow(1 - t, 3);
      
      diceRef.current.rotation.x = THREE.MathUtils.lerp(startRot.current[0], randomSpins.current[0], ease);
      diceRef.current.rotation.y = THREE.MathUtils.lerp(startRot.current[1], randomSpins.current[1], ease);
      diceRef.current.rotation.z = THREE.MathUtils.lerp(startRot.current[2], randomSpins.current[2], ease);
      
      // Bounce effect on Z axis since it's facing camera directly
      const bounce = Math.abs(Math.sin(t * Math.PI * 3)) * (1 - ease) * 1.5;
      diceRef.current.position.z = bounce;
    }
  });

  // Initial rotation based on initial value
  useEffect(() => {
    if (diceRef.current) {
       diceRef.current.rotation.set(...getRotationForNumber(forceValue || 6));
    }
  }, []);

  return (
    <group>
      <RoundedBox 
        ref={diceRef} 
        args={[2, 2, 2]} 
        radius={0.3} 
        smoothness={4} 
        material={materials}
        castShadow
      />
    </group>
  );
};

const Dice = ({ onRoll, disabled, forceValue, boostSix }) => {
  const [rolling, setRolling] = useState(false);

  const handleRollClick = () => {
    if (rolling || disabled) return;
    
    // Instead of local animation, just notify parent immediately.
    // Parent will update forceValue (either locally or via server), 
    // which will trigger the useEffect animation in DiceMesh.
    if (onRoll) {
       let finalValue = Math.floor(Math.random() * 6) + 1;
       if (boostSix && Math.random() < 0.5) {
         finalValue = 6;
       }
       onRoll(finalValue);
    }
  };

  useEffect(() => {
    if (forceValue && !rolling) {
      setRolling(true);
    }
  }, [forceValue]);

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
        <ambientLight intensity={0.6} />
        <directionalLight 
          position={[2, 2, 5]} 
          intensity={1.2} 
          castShadow 
          shadow-mapSize={[1024, 1024]}
        />
        <DiceMesh 
          forceValue={forceValue} 
          onAnimComplete={() => setRolling(false)} 
        />
        {/* Shadow behind the dice to act like a 2D drop shadow */}
        <ContactShadows 
          position={[0, 0, -1.2]} 
          rotation={[Math.PI / 2, 0, 0]}
          opacity={0.7} 
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
