import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Box, Cylinder, Sphere, RoundedBox, Float, Sparkles, Html } from '@react-three/drei';
import * as THREE from 'three';
import { WebGLErrorBoundary } from './WebGLErrorBoundary';
import { Package, User, Building2 } from 'lucide-react';

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function easeOutQuint(t) {
  return 1 - Math.pow(1 - t, 5);
}

function easeInQuint(t) {
  return t * t * t * t * t;
}

function Truck() {
  return (
    <group>
      {/* Trailer */}
      <Box args={[1.6, 1.2, 0.8]} position={[-0.5, 0.8, 0]}>
        <meshStandardMaterial color="#f4f4f5" roughness={0.3} />
      </Box>
      {/* Cabin */}
      <Box args={[0.7, 0.9, 0.8]} position={[0.7, 0.65, 0]}>
        <meshStandardMaterial color="#3b82f6" emissive="#2563eb" emissiveIntensity={0.2} roughness={0.5} />
      </Box>
      {/* Wheels */}
      <Cylinder args={[0.2, 0.2, 0.9]} rotation={[Math.PI/2, 0, 0]} position={[-1.0, 0.2, 0]}>
         <meshStandardMaterial color="#18181b" />
      </Cylinder>
      <Cylinder args={[0.2, 0.2, 0.9]} rotation={[Math.PI/2, 0, 0]} position={[0.6, 0.2, 0]}>
         <meshStandardMaterial color="#18181b" />
      </Cylinder>
    </group>
  );
}

function Man() {
  return (
    <group position={[-5.0, 0, -1]}>
      {/* Body */}
      <Cylinder args={[0.25, 0.25, 1.0]} position={[0, 0.5, 0]}>
        <meshStandardMaterial color="#10b981" />
      </Cylinder>
      {/* Head */}
      <Sphere args={[0.25]} position={[0, 1.2, 0]}>
        <meshStandardMaterial color="#fca5a5" />
      </Sphere>
      <Html distanceFactor={15} position={[0, 1.8, 0]} center transform>
        <div className="flex flex-col items-center">
            <User className="w-5 h-5 text-emerald-400" />
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest whitespace-nowrap bg-zinc-900/80 px-1 py-0.5 rounded border border-emerald-500/30">Customer</span>
        </div>
      </Html>
    </group>
  );
}

function Station({ position, title, isTarget }) {
  return (
    <group position={position}>
      {/* Base Foundation */}
      <Box args={[3, 0.3, 3]} position={[0, 0.15, 0]}>
        <meshStandardMaterial color="#3f3f46" roughness={0.9} />
      </Box>
      {/* Main Building Hub */}
      <Box args={[1.5, 2.0, 1.5]} position={[0, 1.3, -0.5]}>
        <meshStandardMaterial color="#18181b" />
      </Box>
      {/* Roof trim */}
      <Box args={[1.6, 0.2, 1.6]} position={[0, 2.4, -0.5]}>
        <meshStandardMaterial color={isTarget ? "#a855f7" : "#3b82f6"} emissive={isTarget ? "#a855f7" : "#3b82f6"} emissiveIntensity={0.5} />
      </Box>
      
      <Html distanceFactor={15} position={[0, 3.2, -0.5]} center transform>
         <div className="flex flex-col items-center">
            <Building2 className={`w-6 h-6 mb-1 ${isTarget ? 'text-purple-400' : 'text-blue-400'}`} />
            <span className={`text-[10px] font-bold ${isTarget ? 'text-purple-400' : 'text-blue-400'} uppercase tracking-widest whitespace-nowrap bg-zinc-900/80 px-2 py-1 rounded-md border ${isTarget ? 'border-purple-500/30' : 'border-blue-500/30'}`}>{title}</span>
        </div>
      </Html>
    </group>
  );
}

const RelaxableParcel = React.forwardRef((props, ref) => {
  return (
    <group ref={ref} {...props}>
      <Float speed={2.5} rotationIntensity={0.8} floatIntensity={1.5}>
        <RoundedBox args={[0.6, 0.6, 0.6]} radius={0.1} smoothness={4}>
          <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.6} />
        </RoundedBox>
        <Html center position={[0, 0.8, 0]}>
          <div className="p-2 bg-yellow-500/20 rounded-full border border-yellow-500/50 shadow-[0_0_20px_rgba(245,158,11,0.5)] backdrop-blur-md">
             <Package className="w-6 h-6 text-yellow-400 animate-pulse" />
          </div>
        </Html>
      </Float>
    </group>
  );
});

function AnimationController({ statusRef }) {
  const truckRef = useRef();
  const parcelRef = useRef();

  useFrame((state) => {
    const cycleTime = state.clock.elapsedTime % 12; // 12 second total cycle
    
    // Key positions
    const truckStart = new THREE.Vector3(-15, 0, 1.2);
    const stationA = new THREE.Vector3(-3.5, 0, 1.2);
    const stationB = new THREE.Vector3(3.5, 0, 1.2);
    const truckEnd = new THREE.Vector3(15, 0, 1.2);

    const parcelMan = new THREE.Vector3(-5.0, 1.6, -1);
    const parcelStationA = new THREE.Vector3(-3.5, 1.5, 1.2);
    const parcelStationB = new THREE.Vector3(3.5, 1.5, -0.5);

    let tPos = truckStart.clone();
    let pPos = parcelMan.clone();
    let pScale = 1;
    let sText = "";

    // -- TIMELINE --
    // 0 - 2s: Man drops parcel -> Parcel flies smoothly from Man to Station A, Truck approaches
    if (cycleTime < 2) {
      const t = cycleTime / 2;
      const tEase = easeOutQuint(t);
      tPos.copy(truckStart).lerp(stationA, tEase);
      
      const pEase = easeInOutCubic(t);
      pPos.copy(parcelMan).lerp(parcelStationA, pEase);
      sText = "1. Customer Dropping Off Parcel";
    }
    // 2 - 3.5s: Loading parcel into truck
    else if (cycleTime < 3.5) {
      const t = Math.min((cycleTime - 2) * (1 / 1.5), 1); 
      const tEase = easeInOutCubic(t);
      tPos.copy(stationA);
      
      pPos.copy(parcelStationA).lerp(new THREE.Vector3(stationA.x, 2.0, stationA.z), tEase);
      sText = "2. Loading Shipment at Hub";
    }
    // 3.5 - 7.5s: Transit
    else if (cycleTime < 7.5) {
      const t = (cycleTime - 3.5) / 4;
      const tEase = easeInOutCubic(t);
      tPos.copy(stationA).lerp(stationB, tEase);
      
      pPos.copy(tPos).add(new THREE.Vector3(0, 1.8, 0)); // Ride along the truck
      sText = "3. Truck In Transit securely";
    }
    // 7.5 - 9s: Unloading
    else if (cycleTime < 9) {
      const t = Math.min((cycleTime - 7.5) * (1 / 1.5), 1);
      const tEase = easeInOutCubic(t);
      tPos.copy(stationB);
      
      pPos.copy(new THREE.Vector3(stationB.x, 2.0, stationB.z)).lerp(parcelStationB, tEase);
      sText = "4. Arrived at Destination Hub";
    }
    // 9 - 11s: Delivery End / Truck leaves
    else if (cycleTime < 11) {
      const t = (cycleTime - 9) / 2;
      const tEase = easeInQuint(t);
      tPos.copy(stationB).lerp(truckEnd, tEase);
      
      pPos.copy(parcelStationB);
      sText = "5. Shipment Delivered Successfully ✅";
    }
    // 11 - 12s: Fade out
    else {
      const t = (cycleTime - 11) / 1;
      tPos.copy(truckEnd);
      pPos.copy(parcelStationB);
      pScale = Math.max(1 - t, 0); // scale out the parcel
      sText = "Syncing next route...";
    }

    if (truckRef.current) truckRef.current.position.copy(tPos);
    if (parcelRef.current) {
        parcelRef.current.position.copy(pPos);
        parcelRef.current.scale.setScalar(pScale);
    }
    if (statusRef.current && statusRef.current.innerText !== sText) {
        statusRef.current.innerText = sText;
    }
  });

  return (
    <group>
      <group ref={truckRef}>
        <Truck />
      </group>
      <group ref={parcelRef}>
         <RelaxableParcel />
      </group>
    </group>
  );
}

export default function SupplyChainJourney() {
  const statusRef = useRef(null);

  return (
    <div className="w-full relative rounded-3xl overflow-hidden bg-[#030712] mb-8 border border-zinc-800 shadow-2xl" style={{ height: '520px' }}>
      
      {/* Grid overlay for modern cinematic look */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_700px_400px_at_50%_40%,rgba(16,185,129,0.1),transparent)] pointer-events-none"></div>
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080801a_1px,transparent_1px),linear-gradient(to_bottom,#8080801a_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>

      <WebGLErrorBoundary>
        <Canvas 
          camera={{ position: [0, 8, 16], fov: 35 }}
          gl={{ powerPreference: "high-performance", antialias: true, alpha: true, preserveDrawingBuffer: false }}
          dpr={[1, 1.5]}
        >
          <ambientLight intensity={0.7} />
          <directionalLight position={[10, 20, 10]} intensity={1.5} color="#ffffff" />
          <pointLight position={[-10, 10, -5]} intensity={1} color="#3b82f6" />
          
          <Sparkles count={150} scale={30} size={2} speed={0.2} opacity={0.3} color="#fcd34d" />

          {/* Infinite Road */}
          <Box args={[60, 0.2, 5]} position={[0, -0.1, 1.2]} receiveShadow>
             <meshStandardMaterial color="#09090b" roughness={0.7} />
          </Box>
          <Box args={[60, 0.21, 0.1]} position={[0, -0.1, 1.2]}>
             <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.3} />
          </Box>

          <Man />
          <Station position={[-3.5, 0, -0.5]} title="Origin Hub" isTarget={false} />
          <Station position={[3.5, 0, -0.5]} title="Destination Hub" isTarget={true} />

          <AnimationController statusRef={statusRef} />
          
          <OrbitControls 
            enableZoom={true} 
            minDistance={8} 
            maxDistance={30} 
            enablePan={false}
            maxPolarAngle={Math.PI / 2.1} // Prevent camera from going under ground
          />
        </Canvas>
      </WebGLErrorBoundary>

      {/* Modern HUD overlay */}
      <div className="absolute top-6 left-6 text-white p-5 bg-zinc-950/80 rounded-2xl backdrop-blur-xl border border-white/5 shadow-2xl pointer-events-none">
        <div className="flex items-center gap-3 mb-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.8)]"></span>
          <h3 className="text-base font-black tracking-widest text-[#f8fafc] uppercase">Global Logistics</h3>
        </div>
        <p className="text-sm text-zinc-400 font-medium tracking-wide mb-5">Analytics Manager: Supply Chain Flow</p>
        
        <div className="px-5 py-3.5 bg-[#0a0a0a] rounded-xl border border-emerald-500/20 shadow-inner">
           <p className="text-emerald-400 font-mono font-bold text-sm tracking-wide" ref={statusRef}>1. Customer Dropping Off Parcel</p>
        </div>
      </div>
    </div>
  );
}
