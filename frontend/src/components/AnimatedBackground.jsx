import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';

function PollBars() {
  const group = useRef(null);
  const bars = useMemo(
    () => [
      { x: -1.8, h: 1.5, c: '#4f8cff' },
      { x: -0.8, h: 2.2, c: '#22d3ee' },
      { x: 0.2, h: 1.2, c: '#8b5cf6' },
      { x: 1.2, h: 2.8, c: '#3b82f6' },
      { x: 2.2, h: 1.9, c: '#14b8a6' }
    ],
    []
  );

  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.getElapsedTime();
    group.current.rotation.y = Math.sin(t * 0.2) * 0.08;
    group.current.position.y = Math.sin(t * 0.35) * 0.06;
  });

  return (
    <group ref={group} position={[0, -0.1, 0]}>
      {bars.map((bar, idx) => (
        <mesh key={bar.x} position={[bar.x, (bar.h - 1.2) / 2, -2.2 - idx * 0.1]}>
          <boxGeometry args={[0.58, bar.h, 0.55]} />
          <meshStandardMaterial color={bar.c} emissive={bar.c} emissiveIntensity={0.16} metalness={0.35} roughness={0.38} />
        </mesh>
      ))}
      <mesh position={[0.2, -1.14, -2.6]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[6.2, 2.2]} />
        <meshStandardMaterial color="#0d1530" roughness={1} metalness={0} />
      </mesh>
    </group>
  );
}

export default function AnimatedBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10">
      <Canvas camera={{ position: [0, 0.15, 6], fov: 42 }}>
        <color attach="background" args={['#070b17']} />
        <fog attach="fog" args={['#070b17', 4, 12]} />
        <ambientLight intensity={0.52} />
        <directionalLight position={[2, 4, 5]} intensity={1.4} color="#8fb4ff" />
        <pointLight position={[-3, 2, 2]} intensity={18} color="#3b82f6" />
        <PollBars />
      </Canvas>

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(79,140,255,0.12),transparent_45%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(15,23,42,0.35),rgba(2,6,23,0.9))]" />
      <div className="absolute inset-0 opacity-[0.04] [background-image:linear-gradient(rgba(148,163,184,1)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,1)_1px,transparent_1px)] [background-size:48px_48px]" />
    </div>
  );
}
