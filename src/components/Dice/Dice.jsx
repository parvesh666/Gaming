import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Canvas, useFrame, extend } from '@react-three/fiber';
import { Environment, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three-stdlib';
import { playRollSound } from '../../utils/audio';
import './Dice.css';

extend({ RoundedBoxGeometry });

const ROLL_DURATION_MS = 800;

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
    ctx.fillStyle = '#ef4444'; // Red center for 1
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

// Material/group order of BoxGeometry: [+X, -X, +Y, -Y, +Z, -Z]
// Layout: +X=1, -X=6, +Y=2, -Y=5, +Z=3, -Z=4 (opposite faces sum to 7).
// Each rotation brings the requested face to +Z (toward the camera).
const getRotationForNumber = (num) => {
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

/**
 * `animKey` increments every time a roll should start. `value` is the face to land on.
 * Driving the animation from a counter (not from `value`) means repeated values
 * (4, then 4 again) still animate.
 */
const DiceMesh = ({ value, animKey, onAnimComplete }) => {
  const diceRef = useRef();

  const materials = useMemo(
    () =>
      [1, 6, 2, 5, 3, 4].map(
        (n) =>
          new THREE.MeshStandardMaterial({
            map: createDiceFace(n),
            roughness: 0.4,
            metalness: 0.1,
          })
      ),
    []
  );

  useEffect(() => {
    return () => {
      materials.forEach((mat) => {
        if (mat.map) mat.map.dispose();
        mat.dispose();
      });
    };
  }, [materials]);

  const animating = useRef(false);
  const startTime = useRef(0);
  const startRot = useRef([0, 0, 0]);
  const spinRot = useRef([0, 0, 0]);
  const targetRot = useRef([0, 0, 0]);
  const onCompleteRef = useRef(onAnimComplete);
  onCompleteRef.current = onAnimComplete;

  // Initial orientation (mount only)
  useEffect(() => {
    if (diceRef.current) {
      diceRef.current.rotation.set(...getRotationForNumber(value || 6));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Start (or retarget) a roll whenever animKey changes
  useEffect(() => {
    if (!animKey || !value || !diceRef.current) return;

    const base = getRotationForNumber(value);
    targetRot.current = base;
    // Whole turns added to the target orientation look chaotic but land exactly on `base`
    spinRot.current = base.map(
      (angle) => angle + Math.PI * 2 * (Math.floor(Math.random() * 3) + 2)
    );

    const { x, y, z } = diceRef.current.rotation;
    startRot.current = [x % (Math.PI * 2), y % (Math.PI * 2), z % (Math.PI * 2)];
    startTime.current = performance.now();
    animating.current = true;
    playRollSound();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animKey]);

  useFrame(() => {
    if (!animating.current || !diceRef.current) return;

    const t = (performance.now() - startTime.current) / ROLL_DURATION_MS;

    if (t >= 1) {
      animating.current = false;
      // Snap exactly to the target face
      diceRef.current.rotation.set(...targetRot.current);
      diceRef.current.position.z = 0;
      if (onCompleteRef.current) onCompleteRef.current();
      return;
    }

    const ease = 1 - Math.pow(1 - t, 3); // easeOutCubic
    diceRef.current.rotation.set(
      THREE.MathUtils.lerp(startRot.current[0], spinRot.current[0], ease),
      THREE.MathUtils.lerp(startRot.current[1], spinRot.current[1], ease),
      THREE.MathUtils.lerp(startRot.current[2], spinRot.current[2], ease)
    );
    diceRef.current.position.z = Math.abs(Math.sin(t * Math.PI * 3)) * (1 - ease) * 1.5;
  });

  return (
    <mesh ref={diceRef} castShadow material={materials}>
      <roundedBoxGeometry args={[2, 2, 2, 4, 0.3]} />
    </mesh>
  );
};

const Dice = ({ onRoll, disabled, forceValue, rollId, onRollingStateChange }) => {
  const [rolling, setRolling] = useState(false);
  const [anim, setAnim] = useState({ key: 0, value: null });

  useEffect(() => {
    if (onRollingStateChange) {
      onRollingStateChange(rolling);
    }
  }, [rolling, onRollingStateChange]);

  // A roll starts when `rollId` changes (if the parent provides it) OR when
  // `forceValue` changes. `rollId` is optional, so existing parents keep working.
  const prev = useRef({ rollId, forceValue });
  useEffect(() => {
    const changed =
      prev.current.rollId !== rollId || prev.current.forceValue !== forceValue;
    prev.current = { rollId, forceValue };

    if (changed && forceValue) {
      setAnim((a) => ({ key: a.key + 1, value: forceValue }));
      setRolling(true);
    }
  }, [rollId, forceValue]);

  const handleRollClick = () => {
    if (rolling || disabled) return;

    if (onRoll) {
      let finalValue = Math.floor(Math.random() * 6) + 1;
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
        position: 'relative',
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
          value={anim.value ?? forceValue}
          animKey={anim.key}
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
