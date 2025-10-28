"use client";

import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';

// Animated wireframe sphere
function WireframeSphere() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = clock.getElapsedTime() * 0.1;
      meshRef.current.rotation.y = clock.getElapsedTime() * 0.15;
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0, -8]}>
      <sphereGeometry args={[4, 32, 32]} />
      <meshBasicMaterial
        color="#683aff"
        wireframe
        transparent
        opacity={0.08}
      />
    </mesh>
  );
}

// Animated gradient plane
function GradientPlane() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.rotation.z = Math.sin(clock.getElapsedTime() * 0.2) * 0.1;
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0, -10]} rotation={[0, 0, 0]}>
      <planeGeometry args={[20, 20, 20, 20]} />
      <MeshDistortMaterial
        color="#0effff"
        transparent
        opacity={0.05}
        distort={0.5}
        speed={1.5}
        wireframe
      />
    </mesh>
  );
}

// Torus knot for visual interest
function TorusKnot() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = clock.getElapsedTime() * 0.05;
      meshRef.current.rotation.y = clock.getElapsedTime() * 0.08;
    }
  });

  return (
    <mesh ref={meshRef} position={[8, 3, -12]}>
      <torusKnotGeometry args={[2, 0.5, 100, 16]} />
      <meshBasicMaterial
        color="#db2777"
        wireframe
        transparent
        opacity={0.06}
      />
    </mesh>
  );
}

// Scene composition
function Scene() {
  return (
    <>
      <WireframeSphere />
      <GradientPlane />
      <TorusKnot />
    </>
  );
}

// Canvas wrapper component
export function BackgroundGeometry() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 opacity-40">
      <Canvas
        camera={{ position: [0, 0, 10], fov: 50 }}
        dpr={[1, 1.5]} // Performance optimization
        gl={{ 
          preserveDrawingBuffer: true,
          powerPreference: 'low-power',
          antialias: false,
          failIfMajorPerformanceCaveat: true
        }}
        onCreated={({ gl }) => {
          // Handle context loss
          gl.domElement.addEventListener('webglcontextlost', (e) => {
            e.preventDefault();
            console.warn('WebGL context lost, attempting to restore...');
          });
          gl.domElement.addEventListener('webglcontextrestored', () => {
            console.log('WebGL context restored');
          });
        }}
      >
        <Scene />
      </Canvas>
    </div>
  );
}
