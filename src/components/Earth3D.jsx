import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere, MeshDistortMaterial, Stars } from '@react-three/drei';
import { WebGLErrorBoundary } from './WebGLErrorBoundary';

function AnimatedEarth() {
  const meshRef = useRef(null);

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.1;
    }
  });

  return (
    <Sphere ref={meshRef} args={[2, 64, 64]}>
      <MeshDistortMaterial
        color="#3b82f6"
        attach="material"
        distort={0.3}
        speed={1.5}
        roughness={0.5}
      />
    </Sphere>
  );
}

export default function Earth3D() {
  return (
    <div style={{ height: '300px', width: '100%', position: 'relative', borderRadius: '12px', overflow: 'hidden', background: '#0f172a' }}>
      <WebGLErrorBoundary>
        <Canvas 
          camera={{ position: [0, 0, 5], fov: 45 }}
          gl={{ powerPreference: "high-performance", antialias: false, preserveDrawingBuffer: false }}
          dpr={[1, 1.5]}
        >
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
          <AnimatedEarth />
          <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.5} />
        </Canvas>
      </WebGLErrorBoundary>
      <div className="absolute top-4 left-4 text-white p-2 bg-black/50 rounded backdrop-blur border border-white/10">
        <h3 className="text-sm font-bold tracking-widest text-[#60a5fa] uppercase">Global Logistics</h3>
        <p className="text-xs text-zinc-300">Live visualization of soft supply chain</p>
      </div>
    </div>
  );
}
