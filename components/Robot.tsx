
import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh, Group } from 'three';
import { Html } from '@react-three/drei';
import { RobotData } from '../types';
import { ROBOT_RADIUS, ROBOT_COLORS } from '../constants';

interface RobotProps {
  data: RobotData;
}

export const Robot: React.FC<RobotProps> = ({ data }) => {
  const weaponRef = useRef<Mesh>(null);
  const sparkRef = useRef<Group>(null);
  const turretRef = useRef<Group>(null);

  useFrame((state, delta) => {
    if (weaponRef.current) {
      if (data.type === 'spinner') {
        // High-speed rotation for the spinner disc
        weaponRef.current.rotation.y += delta * (data.weaponActive ? 50 : 10);
      } else if (data.type === 'wedge') {
        // Subtle lifting animation for the wedge plate
        const targetRot = data.weaponActive ? -Math.PI / 8 : -Math.PI / 4;
        weaponRef.current.rotation.x += (targetRot - weaponRef.current.rotation.x) * 0.1;
      }
    }

    if (turretRef.current && data.type === 'tank') {
        // Turret slowly scans or locks forward
        turretRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.2;
    }
    
    // Impact visual feedback
    if (sparkRef.current && Date.now() / 1000 < data.stunnedUntil) {
      sparkRef.current.visible = true;
      sparkRef.current.scale.setScalar(1.2 + Math.sin(state.clock.elapsedTime * 30) * 0.3);
      sparkRef.current.rotation.y += 0.5;
    } else if (sparkRef.current) {
      sparkRef.current.visible = false;
    }
  });

  if (data.isDead) return null;

  const getRobotColor = () => {
    if (data.isPlayer) return ROBOT_COLORS.PLAYER;
    if (data.type === 'spinner') return ROBOT_COLORS.ENEMY_SPINNER;
    if (data.type === 'wedge') return ROBOT_COLORS.ENEMY_WEDGE;
    return ROBOT_COLORS.ENEMY_TANK;
  };

  const color = getRobotColor();

  return (
    <group position={[data.position.x, 0, data.position.z]} rotation={[0, data.rotation, 0]}>
      {/* Spark / Hit Effect */}
      <group ref={sparkRef} visible={false} position={[0, 0.5, 0]}>
        <mesh>
          <icosahedronGeometry args={[ROBOT_RADIUS * 1.5, 0]} />
          <meshBasicMaterial color="#ffcc00" wireframe />
        </mesh>
      </group>

      {/* CHASSIS DESIGNS BY TYPE */}
      
      {/* 1. THE SPINNER (Agile, Lethal Disc) */}
      {data.type === 'spinner' && (
        <group>
          {/* Circular Core */}
          <mesh castShadow receiveShadow position={[0, 0.3, 0]}>
            <cylinderGeometry args={[ROBOT_RADIUS * 0.8, ROBOT_RADIUS, 0.5, 6]} />
            <meshStandardMaterial color={color} flatShading />
          </mesh>
          {/* Protective Roll Bar */}
          {/* FIX: Moved rotation from torusGeometry to parent mesh */}
          <mesh position={[0, 0.6, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[ROBOT_RADIUS * 0.7, 0.05, 4, 8]} />
            <meshStandardMaterial color="#222" flatShading />
          </mesh>
          {/* The Spinner Disc */}
          <mesh ref={weaponRef} position={[0, 0.35, 0]}>
            <group>
                {/* Main Plate */}
                <mesh>
                    <cylinderGeometry args={[ROBOT_RADIUS * 1.5, ROBOT_RADIUS * 1.5, 0.1, 8]} />
                    <meshStandardMaterial color={ROBOT_COLORS.WEAPON} metalness={0.9} roughness={0.1} flatShading />
                </mesh>
                {/* Teeth */}
                {[0, 1, 2, 3].map(i => (
                    <mesh key={i} position={[Math.cos(i * Math.PI / 2) * ROBOT_RADIUS * 1.5, 0, Math.sin(i * Math.PI / 2) * ROBOT_RADIUS * 1.5]} rotation={[0, -i * Math.PI / 2, 0]}>
                        <boxGeometry args={[0.3, 0.1, 0.4]} />
                        <meshStandardMaterial color="#555" flatShading />
                    </mesh>
                ))}
            </group>
          </mesh>
        </group>
      )}

      {/* 2. THE WEDGE (Low Profile, Deflector) */}
      {data.type === 'wedge' && (
        <group>
          {/* Triangular Main Body */}
          <mesh castShadow receiveShadow position={[0, 0.3, -0.1]}>
            <boxGeometry args={[ROBOT_RADIUS * 1.6, 0.5, ROBOT_RADIUS * 1.4]} />
            <meshStandardMaterial color={color} flatShading />
          </mesh>
          {/* Sloped Side Armor */}
          {[-1, 1].map(side => (
            <mesh key={side} position={[side * ROBOT_RADIUS * 0.9, 0.25, -0.1]} rotation={[0, 0, side * Math.PI / 6]}>
                <boxGeometry args={[0.2, 0.6, ROBOT_RADIUS * 1.6]} />
                <meshStandardMaterial color="#333" flatShading />
            </mesh>
          ))}
          {/* The Wedge Plate (Weapon) */}
          <mesh ref={weaponRef} position={[0, 0.1, ROBOT_RADIUS * 0.7]} rotation={[-Math.PI / 4, 0, 0]}>
            <boxGeometry args={[ROBOT_RADIUS * 2, 0.1, ROBOT_RADIUS * 1.6]} />
            <meshStandardMaterial color="#666" metalness={0.7} flatShading />
          </mesh>
        </group>
      )}

      {/* 3. THE TANK (Heavy, Armored Box) */}
      {data.type === 'tank' && (
        <group>
          {/* Main Heavy Chassis */}
          <mesh castShadow receiveShadow position={[0, 0.4, 0]}>
            <boxGeometry args={[ROBOT_RADIUS * 2.2, 0.7, ROBOT_RADIUS * 2]} />
            <meshStandardMaterial color={color} flatShading />
          </mesh>
          {/* Rivets / Details */}
          {[[-1, 1], [1, 1], [-1, -1], [1, -1]].map(([x, z], i) => (
             <mesh key={i} position={[x * ROBOT_RADIUS * 0.9, 0.75, z * ROBOT_RADIUS * 0.8]}>
                <boxGeometry args={[0.15, 0.1, 0.15]} />
                <meshStandardMaterial color="#222" />
             </mesh>
          ))}
          {/* Turret Section */}
          <group ref={turretRef} position={[0, 0.75, 0]}>
            <mesh castShadow>
              <boxGeometry args={[ROBOT_RADIUS * 1.4, 0.4, ROBOT_RADIUS * 1.4]} />
              <meshStandardMaterial color="#444" flatShading />
            </mesh>
            {/* Dual Barrels */}
            {[-0.3, 0.3].map((off, i) => (
                <mesh key={i} position={[off, 0, 0.8]} rotation={[Math.PI / 2, 0, 0]}>
                    <cylinderGeometry args={[0.12, 0.12, 1.2, 6]} />
                    <meshStandardMaterial color="#111" />
                </mesh>
            ))}
          </group>
        </group>
      )}

      {/* COMMON DETAILS */}
      
      {/* Antenna with LED */}
      <mesh position={[ROBOT_RADIUS * 0.6, 0.8, -ROBOT_RADIUS * 0.6]}>
        <cylinderGeometry args={[0.02, 0.02, 1.2, 4]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      <mesh position={[ROBOT_RADIUS * 0.6, 1.4, -ROBOT_RADIUS * 0.6]}>
        <sphereGeometry args={[0.08, 4, 4]} />
        <meshStandardMaterial 
            color={data.isPlayer ? "cyan" : "red"} 
            emissive={data.isPlayer ? "cyan" : "red"} 
            emissiveIntensity={1} 
        />
      </mesh>

      {/* Chunky PS1 Wheels */}
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z], i) => (
        <mesh key={i} position={[x * (ROBOT_RADIUS + 0.15), 0.3, z * 0.6]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.35, 0.35, 0.3, 8]} />
          <meshStandardMaterial color="#111" roughness={1} flatShading />
          {/* Wheel Bolt */}
          <mesh position={[0, 0.16, 0]}>
            <cylinderGeometry args={[0.08, 0.08, 0.05, 6]} />
            <meshStandardMaterial color="#444" />
          </mesh>
        </mesh>
      ))}

      {/* Floating Health HUD */}
      <Html position={[0, 2.4, 0]} center distanceFactor={8}>
        <div className="flex flex-col items-center gap-1 opacity-80 scale-75">
          <div className="w-20 h-2 bg-black/80 border border-white/40 p-[1px] shadow-lg">
            <div 
              className={`h-full transition-all duration-300 ${
                (data.health / data.maxHealth) > 0.5 ? 'bg-green-500' : (data.health / data.maxHealth) > 0.2 ? 'bg-yellow-500' : 'bg-red-600'
              }`} 
              style={{ width: `${(data.health / data.maxHealth) * 100}%` }}
            />
          </div>
          <span className="text-[10px] text-white/60 font-mono tracking-tighter uppercase">{data.id}</span>
        </div>
      </Html>
    </group>
  );
};
