"use client";

import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';

// Individual floating shape component
function FloatingShape({ position, scale, color, speed }: {
  position: [number, number, number];
  scale: number;
  color: string;
  speed: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (meshRef.current) {
      // Gentle rotation animation
      meshRef.current.rotation.x += speed * 0.01;
      meshRef.current.rotation.y += speed * 0.015;
    }
  });

  return (
    <Float
      speed={speed}
      rotationIntensity={0.5}
      floatIntensity={0.5}
      floatingRange={[-0.5, 0.5]}
    >
      <mesh ref={meshRef} position={position} scale={scale}>
        <icosahedronGeometry args={[1, 0]} />
        <MeshDistortMaterial
          color={color}
          transparent
          opacity={0.15}
          distort={0.3}
          speed={2}
          roughness={0.4}
        />
      </mesh>
    </Float>
  );
}

// Particle system for background ambience
function Particles() {
  const particlesRef = useRef<THREE.Points>(null);
  
  const particles = useMemo(() => {
    const count = 150;
    const positions = new Float32Array(count * 3);
    
    for (let i = 0; i < count * 3; i += 3) {
      // Spread particles in a wide area
      positions[i] = (Math.random() - 0.5) * 20; // x
      positions[i + 1] = (Math.random() - 0.5) * 20; // y
      positions[i + 2] = (Math.random() - 0.5) * 10; // z
    }
    
    return positions;
  }, []);

  useFrame(() => {
    if (particlesRef.current) {
      particlesRef.current.rotation.y += 0.0005;
    }
  });

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particles.length / 3}
          array={particles}
          itemSize={3}
          args={[particles, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.02}
        color="#683aff"
        transparent
        opacity={0.3}
        sizeAttenuation
      />
    </points>
  );
}

// Main scene component
function Scene() {
  return (
    <>
      {/* Ambient light */}
      <ambientLight intensity={0.5} />
      
      {/* Point lights for dramatic effect */}
      <pointLight position={[10, 10, 10]} intensity={0.8} color="#683aff" />
      <pointLight position={[-10, -10, -10]} intensity={0.6} color="#0effff" />

      {/* Floating geometric shapes */}
      <FloatingShape
        position={[-4, 2, -5]}
        scale={1.2}
        color="#683aff"
        speed={1.5}
      />
      <FloatingShape
        position={[5, -2, -6]}
        scale={0.8}
        color="#0effff"
        speed={1.2}
      />
      <FloatingShape
        position={[3, 3, -4]}
        scale={0.6}
        color="#db2777"
        speed={1.8}
      />
      <FloatingShape
        position={[-3, -3, -7]}
        scale={1}
        color="#7c3aed"
        speed={1}
      />

      {/* Background particles */}
      <Particles />
    </>
  );
}

// Canvas wrapper component with error handling
export function FloatingObjects() {
  const canvasRef = useRef<HTMLDivElement>(null);

  return (
    <div 
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0 opacity-60"
    >
      <Canvas
        camera={{ position: [0, 0, 8], fov: 45 }}
        dpr={[1, 1.5]} // Limit pixel ratio for performance
        gl={{
          // Prevent context loss
          powerPreference: 'low-power', // Changed from high-performance to reduce GPU usage
          antialias: false, // Disable for better performance
          alpha: true,
          preserveDrawingBuffer: true, // Changed to true to help with context recovery
          // Handle context loss gracefully
          failIfMajorPerformanceCaveat: true, // Changed to true for better fallback
        }}
        onCreated={({ gl }) => {
          // Handle context loss events
          gl.domElement.addEventListener('webglcontextlost', (event) => {
            event.preventDefault();
            console.warn('WebGL context lost. Attempting recovery...');
          });
          
          gl.domElement.addEventListener('webglcontextrestored', () => {
            console.log('WebGL context restored successfully');
          });
        }}
      >
        <Scene />
      </Canvas>
    </div>
  );
}
