import React, { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import { EffectComposer, N8AO } from '@react-three/postprocessing';
import * as THREE from 'three';

/**
 * ------------------------------------------------------------------
 * MOVING CUBES BACKGROUND
 * ------------------------------------------------------------------
 * 
 * Un componente de fondo 3D interactivo y autoconclusivo.
 * Muestra una cuadrícula de cubos (3x3x3) estilo "puzzle deslizante"
 * con una estética blanca, limpia y brillante.
 *
 * DEPENDENCIAS (npm install ...):
 * - react
 * - three
 * - @react-three/fiber
 * - @react-three/drei
 * - @react-three/postprocessing
 * - n8ao (para la oclusión ambiental de alta calidad)
 *
 * USO:
 * <div style={{ width: '100vw', height: '100vh' }}>
 *   <MovingCubesBackground 
 *      cameraDistance={7} 
 *      brightness={1.5} 
 *      speed={4} 
 *   />
 * </div>
 */

interface MovingCubesProps {
  /** Distancia de la cámara al centro del cubo. Menor número = más zoom. Default: 7.5 */
  cameraDistance?: number;
  /** Intensidad de la luz direccional principal. Default: 1.5 */
  brightness?: number;
  /** Velocidad de animación de los cubos. Mayor número = más rápido. Default: 4.0 */
  speed?: number;
}

// Configuración interna de la cuadrícula (No cambiar para mantener la lógica del puzzle)
const GRID_SIZE = 3; 
const CUBE_SIZE = 0.8;
const GAP = 0.1;
const UNIT = CUBE_SIZE + GAP;
const OFFSET = ((GRID_SIZE - 1) * UNIT) / 2;

// Tipos internos
type Vector3Arr = [number, number, number];
interface CubeData {
  id: number;
  currentGridPos: Vector3Arr; // Posición lógica [x,y,z]
  displayPos: THREE.Vector3;  // Posición visual en el mundo 3D
  targetPos: THREE.Vector3;   // Hacia dónde se está moviendo
}

/**
 * Componente interno que maneja la lógica de los cubos y la cámara
 */
const CubesLogic: React.FC<{ speed: number; cameraDistance: number }> = ({ speed, cameraDistance }) => {
  // 1. Inicialización de los cubos
  const [cubos] = useState<CubeData[]>(() => {
    const temp: CubeData[] = [];
    let idCounter = 0;
    
    for (let x = 0; x < GRID_SIZE; x++) {
      for (let y = 0; y < GRID_SIZE; y++) {
        for (let z = 0; z < GRID_SIZE; z++) {
          // Excluir el centro (para que sea hueco/superficial)
          if (x === 1 && y === 1 && z === 1) continue;
          
          // Excluir la esquina final para crear el hueco inicial
          if (x === GRID_SIZE - 1 && y === GRID_SIZE - 1 && z === GRID_SIZE - 1) continue;

          const xPos = x * UNIT - OFFSET;
          const yPos = y * UNIT - OFFSET;
          const zPos = z * UNIT - OFFSET;
          const pos = new THREE.Vector3(xPos, yPos, zPos);

          temp.push({
            id: idCounter++,
            currentGridPos: [x, y, z],
            displayPos: pos.clone(),
            targetPos: pos.clone(),
          });
        }
      }
    }
    return temp;
  });

  // 2. Referencias de Estado (evitamos re-renders innecesarios)
  const holeGridPos = useRef<Vector3Arr>([GRID_SIZE - 1, GRID_SIZE - 1, GRID_SIZE - 1]);
  
  const stateRef = useRef({
    isAnimating: false,
    movingCubeId: -1,
    progress: 0,
    lastMovedCubeId: -1,
    prevHoleGridPos: [GRID_SIZE - 1, GRID_SIZE - 1, GRID_SIZE - 1] as Vector3Arr,
    currentAxis: new THREE.Vector3(0, 0, 1), // Eje inicial de la cámara
  });

  // Helper: Convertir coordenada de rejilla a posición real 3D
  const getPos = (gx: number, gy: number, gz: number) => new THREE.Vector3(
    gx * UNIT - OFFSET,
    gy * UNIT - OFFSET,
    gz * UNIT - OFFSET
  );

  useFrame((state, delta) => {
    const s = stateRef.current;
    
    // --- A. Lógica de Animación del Cubo ---
    if (s.isAnimating && s.movingCubeId !== -1) {
      s.progress += delta * speed; // Usamos la prop de velocidad
      
      const cube = cubos.find(c => c.id === s.movingCubeId);
      if (cube) {
        if (s.progress >= 1) {
          // Movimiento terminado
          cube.displayPos.copy(cube.targetPos);
          s.isAnimating = false;
          s.progress = 0;
          s.lastMovedCubeId = s.movingCubeId;
          s.movingCubeId = -1;
        } else {
          // Interpolación lineal visual
          cube.displayPos.lerpVectors(cube.displayPos, cube.targetPos, 0.25);
          if (cube.displayPos.distanceTo(cube.targetPos) < 0.01) s.progress = 1; 
        }
      }
    } 
    
    // --- B. Lógica del Puzzle (Elegir siguiente movimiento) ---
    if (!s.isAnimating) {
      const [hx, hy, hz] = holeGridPos.current;
      
      // Buscar vecinos válidos
      const neighbors = [
        { dx: 1, dy: 0, dz: 0 }, { dx: -1, dy: 0, dz: 0 },
        { dx: 0, dy: 1, dz: 0 }, { dx: 0, dy: -1, dz: 0 },
        { dx: 0, dy: 0, dz: 1 }, { dx: 0, dy: 0, dz: -1 },
      ].map(dir => ({ x: hx + dir.dx, y: hy + dir.dy, z: hz + dir.dz }))
       .filter(pos => 
          pos.x >= 0 && pos.x < GRID_SIZE &&
          pos.y >= 0 && pos.y < GRID_SIZE &&
          pos.z >= 0 && pos.z < GRID_SIZE &&
          !(pos.x === 1 && pos.y === 1 && pos.z === 1) // Prohibir entrar al centro
       );

      // Encontrar cubos en esas posiciones
      let candidates = neighbors.map(n => {
        return cubos.find(c => 
          c.currentGridPos[0] === n.x && 
          c.currentGridPos[1] === n.y && 
          c.currentGridPos[2] === n.z
        );
      }).filter(c => c !== undefined && c.id !== s.lastMovedCubeId) as CubeData[];

      // Fallback si nos quedamos bloqueados
      if (candidates.length === 0) {
         candidates = neighbors.map(n => cubos.find(c => 
            c.currentGridPos[0] === n.x && c.currentGridPos[1] === n.y && c.currentGridPos[2] === n.z
         )).filter(c => c !== undefined) as CubeData[];
      }

      // Iniciar movimiento aleatorio
      if (candidates.length > 0) {
        const winner = candidates[Math.floor(Math.random() * candidates.length)];
        s.isAnimating = true;
        s.movingCubeId = winner.id;
        s.progress = 0;
        s.prevHoleGridPos = [...holeGridPos.current] as Vector3Arr;

        const targetWorldPos = getPos(hx, hy, hz);
        winner.targetPos.copy(targetWorldPos);
        
        const oldCubePos = [...winner.currentGridPos] as Vector3Arr;
        winner.currentGridPos = [hx, hy, hz];
        holeGridPos.current = oldCubePos;
      }
    }

    // --- C. Lógica de Cámara (Snap a ejes cardinales) ---
    const currentHolePos = getPos(holeGridPos.current[0], holeGridPos.current[1], holeGridPos.current[2]);
    const prevHolePos = getPos(s.prevHoleGridPos[0], s.prevHoleGridPos[1], s.prevHoleGridPos[2]);
    
    // Interpolamos la posición "visual" del hueco para que la cámara rote suavemente
    const lerpedHolePos = new THREE.Vector3().lerpVectors(prevHolePos, currentHolePos, s.isAnimating ? s.progress : 1);
    const dirToHole = lerpedHolePos.clone().normalize();

    // Determinar eje dominante
    const absX = Math.abs(dirToHole.x);
    const absY = Math.abs(dirToHole.y);
    const absZ = Math.abs(dirToHole.z);

    const targetAxis = s.currentAxis.clone();

    // Histéresis para evitar saltos bruscos en las esquinas
    if (absX > absY && absX > absZ && absX > 0.8) targetAxis.set(Math.sign(dirToHole.x), 0, 0);
    else if (absY > absX && absY > absZ && absY > 0.8) targetAxis.set(0, Math.sign(dirToHole.y), 0);
    else if (absZ > absX && absZ > absY && absZ > 0.8) targetAxis.set(0, 0, Math.sign(dirToHole.z));

    s.currentAxis = targetAxis;

    // Calcular posición final de la cámara basada en la prop 'cameraDistance'
    const targetCamPos = targetAxis.clone().multiplyScalar(cameraDistance);

    // Mover cámara
    state.camera.position.lerp(targetCamPos, 0.05);
    state.camera.position.setLength(cameraDistance); // Mantener radio constante
    state.camera.lookAt(0, 0, 0);
  });

  return (
    <group>
      {cubos.map((cube) => (
        <CubeItem key={cube.id} cube={cube} />
      ))}
    </group>
  );
};

// Sub-componente para renderizar un cubo individual
const CubeItem: React.FC<{ cube: CubeData }> = ({ cube }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.copy(cube.displayPos);
    }
  });

  return (
    <RoundedBox
      ref={meshRef}
      args={[CUBE_SIZE, CUBE_SIZE, CUBE_SIZE]}
      radius={0.02} 
      smoothness={4}
      position={cube.displayPos}
    >
      <meshPhysicalMaterial
        color="#ffffff"
        roughness={0.15}
        metalness={0.1}
        clearcoat={1}
        clearcoatRoughness={0.1}
      />
    </RoundedBox>
  );
};

/**
 * COMPONENTE PRINCIPAL EXPORTABLE
 */
const MovingCubesBackground: React.FC<MovingCubesProps> = ({ 
  cameraDistance = 7.5, 
  brightness = 1.5, 
  speed = 4.0 
}) => {
  return (
    <Canvas
      dpr={[1, 2]} // Soporte para pantallas retina
      gl={{ 
        antialias: true,
        alpha: false, // Fondo no transparente
        toneMappingExposure: 1.2
      }}
      style={{ width: '100%', height: '100%' }}
    >
      {/* Fondo Negro Absoluto */}
      <color attach="background" args={['#000000']} />
      
      {/* --- Iluminación --- */}
      <ambientLight intensity={0.2} />
      <directionalLight position={[10, 20, 10]} intensity={brightness} castShadow />
      <directionalLight position={[-10, -10, -5]} intensity={brightness * 0.3} color="#ccddff" />
      
      {/* Nota: evitamos HDRI remoto (drei-assets) para no romper en redes bloqueadas */}

      {/* --- Lógica y Objetos --- */}
      <CubesLogic speed={speed} cameraDistance={cameraDistance} />

      {/* --- Post-Procesado (Ambient Occlusion) --- */}
      <EffectComposer enableNormalPass={false}>
        <N8AO 
          aoRadius={0.4} 
          intensity={2.5} 
          distanceFalloff={2} 
          screenSpaceRadius={true} 
        />
      </EffectComposer>
    </Canvas>
  );
};

export default MovingCubesBackground;
