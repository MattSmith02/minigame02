
import React from 'react';
import { ARENA_SIZE, WALL_GAP, ROBOT_COLORS } from '../constants';

export const Arena: React.FC = () => {
  const wallWidth = ARENA_SIZE - WALL_GAP * 2;

  return (
    <group>
      {/* Concrete Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.01, 0]}>
        <planeGeometry args={[ARENA_SIZE, ARENA_SIZE]} />
        <meshStandardMaterial color={ROBOT_COLORS.ARENA} roughness={0.7} metalness={0.2} />
      </mesh>

      {/* Grid Lines */}
      <gridHelper args={[ARENA_SIZE, 12, '#64748b', '#cbd5e1']} position={[0, 0.01, 0]} />

      {/* Corner "Pit" Indicators */}
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z], i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[x * (ARENA_SIZE/2 - WALL_GAP/2), 0.02, z * (ARENA_SIZE/2 - WALL_GAP/2)]}>
          <planeGeometry args={[WALL_GAP, WALL_GAP]} />
          <meshStandardMaterial color="#1e293b" emissive="#ef4444" emissiveIntensity={0.5} />
        </mesh>
      ))}

      {/* Side Walls */}
      {/* North */}
      <mesh position={[0, 1, -ARENA_SIZE / 2]}>
        <boxGeometry args={[wallWidth, 2, 0.5]} />
        <meshStandardMaterial color={ROBOT_COLORS.WALL} />
      </mesh>
      {/* South */}
      <mesh position={[0, 1, ARENA_SIZE / 2]}>
        <boxGeometry args={[wallWidth, 2, 0.5]} />
        <meshStandardMaterial color={ROBOT_COLORS.WALL} />
      </mesh>
      {/* West */}
      <mesh position={[-ARENA_SIZE / 2, 1, 0]}>
        <boxGeometry args={[0.5, 2, wallWidth]} />
        <meshStandardMaterial color={ROBOT_COLORS.WALL} />
      </mesh>
      {/* East */}
      <mesh position={[ARENA_SIZE / 2, 1, 0]}>
        <boxGeometry args={[0.5, 2, wallWidth]} />
        <meshStandardMaterial color={ROBOT_COLORS.WALL} />
      </mesh>

      {/* Hazard Stripes along walls */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, -ARENA_SIZE / 2 + 0.4]}>
        <planeGeometry args={[wallWidth, 0.4]} />
        <meshStandardMaterial color="#fbbf24" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, ARENA_SIZE / 2 - 0.4]}>
        <planeGeometry args={[wallWidth, 0.4]} />
        <meshStandardMaterial color="#fbbf24" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, Math.PI/2]} position={[-ARENA_SIZE / 2 + 0.4, 0.03, 0]}>
        <planeGeometry args={[wallWidth, 0.4]} />
        <meshStandardMaterial color="#fbbf24" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, Math.PI/2]} position={[ARENA_SIZE / 2 - 0.4, 0.03, 0]}>
        <planeGeometry args={[wallWidth, 0.4]} />
        <meshStandardMaterial color="#fbbf24" />
      </mesh>

      {/* Industrial Support Structures */}
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z], i) => (
        <mesh key={i} position={[x * (ARENA_SIZE/2 - WALL_GAP), 1.5, z * ARENA_SIZE/2]}>
          <boxGeometry args={[0.8, 3, 0.8]} />
          <meshStandardMaterial color="#991b1b" />
        </mesh>
      ))}
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z], i) => (
        <mesh key={i} position={[x * ARENA_SIZE/2, 1.5, z * (ARENA_SIZE/2 - WALL_GAP)]}>
          <boxGeometry args={[0.8, 3, 0.8]} />
          <meshStandardMaterial color="#991b1b" />
        </mesh>
      ))}

      {/* Outer Void (Now a lighter grey room look) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -5, 0]}>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#cbd5e1" />
      </mesh>
    </group>
  );
};
