"use client";

import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

type NetworkPath = {
  points: THREE.Vector3[];
};

const BASE_RADIUS = 2.4;
const WIRE_COLOR = '#8f8f8f';
const NETWORK_COLOR = '#b5b5b5';

function createRandomPointOnSphere(radius: number) {
  const u = Math.random();
  const v = Math.random();
  const theta = 2 * Math.PI * u;
  const phi = Math.acos(2 * v - 1);
  const x = radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.sin(phi) * Math.sin(theta);
  const z = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

function createNetworkPaths(pathCount: number, segmentsPerPath: number) {
  const paths: NetworkPath[] = [];

  for (let i = 0; i < pathCount; i += 1) {
    const start = createRandomPointOnSphere(BASE_RADIUS).normalize();
    const end = createRandomPointOnSphere(BASE_RADIUS).normalize();
    const points: THREE.Vector3[] = [];

    for (let s = 0; s <= segmentsPerPath; s += 1) {
      const t = s / segmentsPerPath;
      const point = start
        .clone()
        .lerp(end, t)
        .normalize()
        .multiplyScalar(BASE_RADIUS);
      points.push(point);
    }

    paths.push({ points });
  }

  return paths;
}

function WireframeGlobe() {
  const groupRef = useRef<THREE.Group>(null);
  const networkPaths = useMemo(() => createNetworkPaths(24, 40), []);
  const particleRef = useRef<THREE.Points>(null);
  const particleData = useMemo(() => {
    const count = 120;
    const positions = new Float32Array(count * 3);
    const particles = new Array(count).fill(null).map(() => {
      const pathIndex = Math.floor(Math.random() * networkPaths.length);
      return {
        pathIndex,
        t: Math.random(),
        speed: 0.05 + Math.random() * 0.08,
      };
    });

    return { positions, particles };
  }, [networkPaths.length]);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.08;
      groupRef.current.rotation.x += delta * 0.02;
    }

    if (particleRef.current) {
      const { positions, particles } = particleData;
      particles.forEach((particle, index) => {
        const path = networkPaths[particle.pathIndex];
        particle.t = (particle.t + particle.speed * delta) % 1;

        const scaled = particle.t * (path.points.length - 1);
        const pointIndex = Math.floor(scaled);
        const nextIndex = Math.min(pointIndex + 1, path.points.length - 1);
        const lerpAmount = scaled - pointIndex;

        const position = path.points[pointIndex]
          .clone()
          .lerp(path.points[nextIndex], lerpAmount);

        positions[index * 3] = position.x;
        positions[index * 3 + 1] = position.y;
        positions[index * 3 + 2] = position.z;
      });

      particleRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh>
        <sphereGeometry args={[BASE_RADIUS, 48, 48]} />
        <meshBasicMaterial
          color={WIRE_COLOR}
          wireframe
          transparent
          opacity={0.75}
        />
      </mesh>
      <mesh scale={1.01}>
        <sphereGeometry args={[BASE_RADIUS, 48, 48]} />
        <meshBasicMaterial
          color="#c2c2c2"
          wireframe
          transparent
          opacity={0.2}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      {networkPaths.map((path, index) => (
        <line key={`network-line-${index}`}>
          <bufferGeometry
            attach="geometry"
            setFromPoints={path.points}
          />
          <lineBasicMaterial
            color={NETWORK_COLOR}
            transparent
            opacity={0.5}
          />
        </line>
      ))}
      <points ref={particleRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            array={particleData.positions}
            count={particleData.positions.length / 3}
            itemSize={3}
            args={[particleData.positions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          color="#d6d6d6"
          size={0.035}
          transparent
          opacity={0.8}
          sizeAttenuation
        />
      </points>
    </group>
  );
}

export function NeuralGlobeBackground() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      <Canvas
        camera={{ position: [0, 0, 6.5], fov: 42 }}
        dpr={[1, 1.5]}
        gl={{
          powerPreference: 'high-performance',
          antialias: true,
          alpha: true,
          preserveDrawingBuffer: false,
          stencil: false,
          depth: true,
          failIfMajorPerformanceCaveat: false,
        }}
        onCreated={({ gl }) => {
          gl.setClearColor('#000000', 1);
          gl.domElement.addEventListener('webglcontextlost', (event) => {
            event.preventDefault();
          });
          gl.domElement.addEventListener('webglcontextrestored', () => {
            // No-op
          });
          gl.debug.checkShaderErrors = false;
        }}
      >
        <ambientLight intensity={0.6} />
        <pointLight position={[6, 4, 6]} intensity={0.6} color="#e0e0e0" />
        <pointLight position={[-6, -4, -6]} intensity={0.4} color="#a0a0a0" />
        <WireframeGlobe />
      </Canvas>
    </div>
  );
}
