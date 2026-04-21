import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere, Box, Line, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { WebGLErrorBoundary } from './WebGLErrorBoundary';

const RADIUS = 1.0;
const SPACING = 3.5;

function randomSurfacePos(center, radius) {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(Math.random() * 2 - 1);
  const x = center.x + radius * Math.sin(phi) * Math.cos(theta);
  const y = center.y + radius * Math.cos(phi);
  const z = center.z + radius * Math.sin(phi) * Math.sin(theta);
  return new THREE.Vector3(x, y, z);
}

function InterWorldRoute({ curve }) {
  const points = useMemo(() => curve.getPoints(40), [curve]);
  return <Line points={points} color="#60a5fa" opacity={0.15} transparent lineWidth={1.5} />;
}

function MovingVehicle({ curve, speed, offset, type }) {
  const ref = useRef(null);

  useFrame((state) => {
    if (!ref.current) return;
    const t = ((state.clock.elapsedTime * speed) + offset) % 1;
    const pos = curve.getPointAt(t);
    ref.current.position.copy(pos);
    
    // Look ahead logic for rotation
    const lookT = Math.min(t + 0.005, 1);
    const target = curve.getPointAt(lookT);
    ref.current.lookAt(target);
  });

  return (
    <group ref={ref}>
      {type === 'truck' && (
        <group scale={[2, 2, 2]}>
          <Box args={[0.02, 0.025, 0.05]} position={[0, 0, -0.015]}>
            <meshStandardMaterial color="#f4f4f5" roughness={0.3} />
          </Box>
          <Box args={[0.02, 0.02, 0.02]} position={[0, -0.0025, 0.02]}>
            <meshStandardMaterial color="#f97316" emissive="#f97316" emissiveIntensity={0.8} />
          </Box>
        </group>
      )}
      
      {type === 'airplane' && (
        <group scale={[2, 2, 2]}>
          {/* Fuselage */}
          <Box args={[0.015, 0.015, 0.06]}>
            <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.6} />
          </Box>
          {/* Wings */}
          <Box args={[0.08, 0.005, 0.02]} position={[0, 0, 0]}>
            <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={0.5} />
          </Box>
          {/* Tail */}
          <Box args={[0.005, 0.02, 0.015]} position={[0, 0.01, -0.025]}>
            <meshStandardMaterial color="#3b82f6" />
          </Box>
        </group>
      )}

      {type === 'car' && (
        <group scale={[2, 2, 2]}>
          <Box args={[0.015, 0.01, 0.03]} position={[0, 0, 0]}>
            <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.5} />
          </Box>
          <Box args={[0.01, 0.01, 0.015]} position={[0, 0.01, 0]}>
            <meshStandardMaterial color="#ef4444" />
          </Box>
        </group>
      )}
    </group>
  );
}

function MiniWorld({ position, color }) {
  const ref = useRef();
  
  useFrame((state, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.15; // Slow rotation of individual planets
    }
  });

  return (
    <group position={position} ref={ref}>
      {/* Base Dark Sphere */}
      <Sphere args={[RADIUS * 0.98, 32, 32]}>
        <meshStandardMaterial color="#0f172a" roughness={0.9} />
      </Sphere>
      {/* Ocean/Grid Wireframe */}
      <Sphere args={[RADIUS, 24, 24]}>
        <meshStandardMaterial color={color} transparent opacity={0.3} wireframe={true} />
      </Sphere>
    </group>
  );
}

export default function Earth3DTrucks() {
  const WORLDS = useMemo(() => [
    { id: 0, pos: new THREE.Vector3(-SPACING, 0, 0), color: '#3b82f6' }, // Blue world
    { id: 1, pos: new THREE.Vector3(0, 0, 0), color: '#10b981' },        // Green world
    { id: 2, pos: new THREE.Vector3(SPACING, 0, 0), color: '#8b5cf6' },  // Purple world
  ], []);

  const { routes, vehicles } = useMemo(() => {
    const generatedRoutes = [];
    const generatedVehicles = [];
    const vehicleTypes = ['truck', 'car', 'airplane'];

    // Links: World 1 -> 2, World 2 -> 3, World 3 -> 1
    const connections = [ [0, 1], [1, 2], [2, 0] ];

    connections.forEach(([w1Idx, w2Idx]) => {
      // Create a web of paths bridging the planets
      for (let i = 0; i < 6; i++) {
        // --- Forward Routes (Arcing Up) ---
        const p1 = randomSurfacePos(WORLDS[w1Idx].pos, RADIUS);
        const p2 = randomSurfacePos(WORLDS[w2Idx].pos, RADIUS);

        const mid = p1.clone().lerp(p2, 0.5);
        const dist = p1.distanceTo(p2);
        mid.y += dist * 0.3 + Math.random() * 0.5; // Arch up
        mid.z += (Math.random() - 0.5) * 1.5;

        const curve = new THREE.QuadraticBezierCurve3(p1, mid, p2);
        generatedRoutes.push(curve);

        const type = vehicleTypes[Math.floor(Math.random() * vehicleTypes.length)];
        generatedVehicles.push({
          id: `fw-${w1Idx}-${w2Idx}-${i}`,
          curve,
          type,
          speed: (type === 'airplane' ? 0.06 : 0.035) + Math.random() * 0.02,
          offset: Math.random()
        });

        // --- Return Routes (Arcing Down) ---
        const p1b = randomSurfacePos(WORLDS[w1Idx].pos, RADIUS);
        const p2b = randomSurfacePos(WORLDS[w2Idx].pos, RADIUS);
        
        const midRet = p2b.clone().lerp(p1b, 0.5);
        midRet.y -= (dist * 0.3 + Math.random() * 0.5); // Arch under
        midRet.z += (Math.random() - 0.5) * 1.5;
        
        const curveRet = new THREE.QuadraticBezierCurve3(p2b, midRet, p1b);
        generatedRoutes.push(curveRet);

        const typeRet = vehicleTypes[Math.floor(Math.random() * vehicleTypes.length)];
        generatedVehicles.push({
          id: `rt-${w2Idx}-${w1Idx}-${i}`,
          curve: curveRet,
          type: typeRet,
          speed: (typeRet === 'airplane' ? 0.06 : 0.035) + Math.random() * 0.02,
          offset: Math.random()
        });
      }
    });

    return { routes: generatedRoutes, vehicles: generatedVehicles };
  }, [WORLDS]);

  return (
    <div className="w-full relative rounded-2xl overflow-hidden mb-8 border-2 border-zinc-200 shadow-[0_6px_0_rgb(228,228,231)] bg-[#030712]" style={{ height: '450px' }}>
      {/* Modern High-Tech CSS glowing background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_800px_400px_at_50%_0%,rgba(59,130,246,0.15),transparent)] pointer-events-none"></div>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>
      
      <WebGLErrorBoundary>
        <Canvas 
          camera={{ position: [0, 2, 9], fov: 40 }}
          gl={{ powerPreference: "high-performance", antialias: true, alpha: true, preserveDrawingBuffer: false }}
          dpr={[1, 1.5]}
        >
          <ambientLight intensity={0.8} />
          <directionalLight position={[10, 10, 5]} intensity={1.5} />
          <pointLight position={[-10, -10, -5]} intensity={1} color="#3b82f6" />
          
          <Sparkles count={400} scale={20} size={2} speed={0.4} opacity={0.2} color="#60a5fa" />
          
          <group>
            {/* The 3 Mini Worlds */}
            {WORLDS.map(w => (
              <MiniWorld key={w.id} position={w.pos.toArray()} color={w.color} />
            ))}
            
            {/* The routes bridging them together */}
            {routes.map((curve, idx) => (
              <InterWorldRoute key={`route-${idx}`} curve={curve} />
            ))}

            {/* Vehicules moving across bounds */}
            {vehicles.map((vehicle) => (
              <MovingVehicle 
                key={vehicle.id} 
                curve={vehicle.curve}
                speed={vehicle.speed} 
                offset={vehicle.offset} 
                type={vehicle.type}
              />
            ))}
          </group>
          
          <OrbitControls 
            enableZoom={true} 
            minDistance={4} 
            maxDistance={15} 
            enablePan={true}
            // Removed autoRotate so the worlds stay perfectly fixed on one line.
          />
        </Canvas>
      </WebGLErrorBoundary>
      
      <div className="absolute top-6 left-6 text-white p-4 bg-zinc-950/60 rounded-xl backdrop-blur-md border border-white/10 shadow-xl pointer-events-none">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
          <h3 className="text-sm font-black tracking-widest text-[#e2e8f0] uppercase">Inter-Planetary Logistics</h3>
        </div>
        <p className="text-xs text-zinc-400 font-medium tracking-wide">Multi-World Supply Synchronization</p>
        
        <div className="mt-4 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded bg-[#f97316]"></div>
            <span className="text-[10px] text-zinc-300 font-bold uppercase">Logistics Trucks</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded bg-[#ffffff]"></div>
            <span className="text-[10px] text-zinc-300 font-bold uppercase">Cargo Flights</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded bg-[#ef4444]"></div>
            <span className="text-[10px] text-zinc-300 font-bold uppercase">Courier Cars</span>
          </div>
        </div>
      </div>
    </div>
  );
}
