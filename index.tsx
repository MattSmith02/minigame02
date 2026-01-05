
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import { Canvas, useFrame } from '@react-three/fiber';
import { PerspectiveCamera, Stars, Environment, ContactShadows, Html } from '@react-three/drei';
import { Vector3, Color, Mesh, Group } from 'three';
import { Cpu, Swords } from 'lucide-react';

// --- TYPES & ENUMS ---
enum GameState {
  START = 'START',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER',
  VICTORY = 'VICTORY'
}

type RobotType = 'spinner' | 'wedge' | 'tank';

interface RobotData {
  id: string;
  isPlayer: boolean;
  position: Vector3;
  velocity: Vector3;
  rotation: number;
  health: number;
  maxHealth: number;
  weaponActive: boolean;
  isDead: boolean;
  color: string;
  type: RobotType;
  stunnedUntil: number;
}

// --- CONSTANTS ---
const ARENA_SIZE = 22; 
const WALL_GAP = 5;
const ROBOT_RADIUS = 0.8;
const MAX_ROBOT_HEALTH = 100;
const MOVE_SPEED = 0.008; 
const ENEMY_SPEED_MULT = 0.4; 
const TURN_SPEED = 0.08; 
const FRICTION = 0.92; 
const KNOCKBACK_FORCE = 0.15; 
const WEAPON_DAMAGE = 15;
const ENEMY_COUNT = 3;

const ROBOT_COLORS = {
  PLAYER: '#facc15', 
  ENEMY_SPINNER: '#ef4444',
  ENEMY_WEDGE: '#fb923c',
  ENEMY_TANK: '#22c55e',
  ARENA: '#94a3b8', 
  WALL: '#475569', 
  WEAPON: '#cbd5e1'
};

// --- HOOKS ---
const useKeyboard = () => {
  const [keys, setKeys] = useState<{ [key: string]: boolean }>({});
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => setKeys((prev) => ({ ...prev, [e.code]: true }));
    const handleKeyUp = (e: KeyboardEvent) => setKeys((prev) => ({ ...prev, [e.code]: false }));
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);
  return keys;
};

// --- COMPONENTS ---

const Arena: React.FC = () => {
  const wallWidth = ARENA_SIZE - WALL_GAP * 2;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.01, 0]}>
        <planeGeometry args={[ARENA_SIZE, ARENA_SIZE]} />
        <meshStandardMaterial color={ROBOT_COLORS.ARENA} roughness={0.7} metalness={0.2} />
      </mesh>
      <gridHelper args={[ARENA_SIZE, 12, '#64748b', '#cbd5e1']} position={[0, 0.01, 0]} />
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z], i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[x * (ARENA_SIZE/2 - WALL_GAP/2), 0.02, z * (ARENA_SIZE/2 - WALL_GAP/2)]}>
          <planeGeometry args={[WALL_GAP, WALL_GAP]} />
          <meshStandardMaterial color="#1e293b" emissive="#ef4444" emissiveIntensity={0.5} />
        </mesh>
      ))}
      <mesh position={[0, 1, -ARENA_SIZE / 2]}><boxGeometry args={[wallWidth, 2, 0.5]} /><meshStandardMaterial color={ROBOT_COLORS.WALL} /></mesh>
      <mesh position={[0, 1, ARENA_SIZE / 2]}><boxGeometry args={[wallWidth, 2, 0.5]} /><meshStandardMaterial color={ROBOT_COLORS.WALL} /></mesh>
      <mesh position={[-ARENA_SIZE / 2, 1, 0]}><boxGeometry args={[0.5, 2, wallWidth]} /><meshStandardMaterial color={ROBOT_COLORS.WALL} /></mesh>
      <mesh position={[ARENA_SIZE / 2, 1, 0]}><boxGeometry args={[0.5, 2, wallWidth]} /><meshStandardMaterial color={ROBOT_COLORS.WALL} /></mesh>
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z], i) => (
        <React.Fragment key={i}>
          <mesh position={[x * (ARENA_SIZE/2 - WALL_GAP), 1.5, z * ARENA_SIZE/2]}><boxGeometry args={[0.8, 3, 0.8]} /><meshStandardMaterial color="#991b1b" /></mesh>
          <mesh position={[x * ARENA_SIZE/2, 1.5, z * (ARENA_SIZE/2 - WALL_GAP)]}><boxGeometry args={[0.8, 3, 0.8]} /><meshStandardMaterial color="#991b1b" /></mesh>
        </React.Fragment>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -5, 0]}>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#cbd5e1" />
      </mesh>
    </group>
  );
};

const Robot: React.FC<{ data: RobotData }> = ({ data }) => {
  const weaponRef = useRef<Mesh>(null);
  const sparkRef = useRef<Group>(null);
  const turretRef = useRef<Group>(null);

  useFrame((state, delta) => {
    if (weaponRef.current) {
      if (data.type === 'spinner') {
        weaponRef.current.rotation.y += delta * (data.weaponActive ? 50 : 10);
      } else if (data.type === 'wedge') {
        const targetRot = data.weaponActive ? -Math.PI / 8 : -Math.PI / 4;
        weaponRef.current.rotation.x += (targetRot - weaponRef.current.rotation.x) * 0.1;
      }
    }
    if (turretRef.current && data.type === 'tank') {
        turretRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.2;
    }
    if (sparkRef.current && Date.now() / 1000 < data.stunnedUntil) {
      sparkRef.current.visible = true;
      sparkRef.current.scale.setScalar(1.2 + Math.sin(state.clock.elapsedTime * 30) * 0.3);
      sparkRef.current.rotation.y += 0.5;
    } else if (sparkRef.current) {
      sparkRef.current.visible = false;
    }
  });

  if (data.isDead) return null;

  const color = data.isPlayer ? ROBOT_COLORS.PLAYER : 
                data.type === 'spinner' ? ROBOT_COLORS.ENEMY_SPINNER : 
                data.type === 'wedge' ? ROBOT_COLORS.ENEMY_WEDGE : ROBOT_COLORS.ENEMY_TANK;

  return (
    <group position={[data.position.x, 0, data.position.z]} rotation={[0, data.rotation, 0]}>
      <group ref={sparkRef} visible={false} position={[0, 0.5, 0]}>
        <mesh><icosahedronGeometry args={[ROBOT_RADIUS * 1.5, 0]} /><meshBasicMaterial color="#ffcc00" wireframe /></mesh>
      </group>
      {data.type === 'spinner' && (
        <group>
          <mesh castShadow receiveShadow position={[0, 0.3, 0]}><cylinderGeometry args={[ROBOT_RADIUS * 0.8, ROBOT_RADIUS, 0.5, 6]} /><meshStandardMaterial color={color} flatShading /></mesh>
          <mesh position={[0, 0.6, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[ROBOT_RADIUS * 0.7, 0.05, 4, 8]} /><meshStandardMaterial color="#222" flatShading /></mesh>
          <mesh ref={weaponRef} position={[0, 0.35, 0]}>
            <group>
                <mesh><cylinderGeometry args={[ROBOT_RADIUS * 1.5, ROBOT_RADIUS * 1.5, 0.1, 8]} /><meshStandardMaterial color={ROBOT_COLORS.WEAPON} metalness={0.9} roughness={0.1} flatShading /></mesh>
                {[0, 1, 2, 3].map(i => (
                    <mesh key={i} position={[Math.cos(i * Math.PI / 2) * ROBOT_RADIUS * 1.5, 0, Math.sin(i * Math.PI / 2) * ROBOT_RADIUS * 1.5]} rotation={[0, -i * Math.PI / 2, 0]}>
                        <boxGeometry args={[0.3, 0.1, 0.4]} /><meshStandardMaterial color="#555" flatShading />
                    </mesh>
                ))}
            </group>
          </mesh>
        </group>
      )}
      {data.type === 'wedge' && (
        <group>
          <mesh castShadow receiveShadow position={[0, 0.3, -0.1]}><boxGeometry args={[ROBOT_RADIUS * 1.6, 0.5, ROBOT_RADIUS * 1.4]} /><meshStandardMaterial color={color} flatShading /></mesh>
          {[-1, 1].map(side => (
            <mesh key={side} position={[side * ROBOT_RADIUS * 0.9, 0.25, -0.1]} rotation={[0, 0, side * Math.PI / 6]}><boxGeometry args={[0.2, 0.6, ROBOT_RADIUS * 1.6]} /><meshStandardMaterial color="#333" flatShading /></mesh>
          ))}
          <mesh ref={weaponRef} position={[0, 0.1, ROBOT_RADIUS * 0.7]} rotation={[-Math.PI / 4, 0, 0]}><boxGeometry args={[ROBOT_RADIUS * 2, 0.1, ROBOT_RADIUS * 1.6]} /><meshStandardMaterial color="#666" metalness={0.7} flatShading /></mesh>
        </group>
      )}
      {data.type === 'tank' && (
        <group>
          <mesh castShadow receiveShadow position={[0, 0.4, 0]}><boxGeometry args={[ROBOT_RADIUS * 2.2, 0.7, ROBOT_RADIUS * 2]} /><meshStandardMaterial color={color} flatShading /></mesh>
          <group ref={turretRef} position={[0, 0.75, 0]}>
            <mesh castShadow><boxGeometry args={[ROBOT_RADIUS * 1.4, 0.4, ROBOT_RADIUS * 1.4]} /><meshStandardMaterial color="#444" flatShading /></mesh>
            {[-0.3, 0.3].map((off, i) => (
                <mesh key={i} position={[off, 0, 0.8]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.12, 0.12, 1.2, 6]} /><meshStandardMaterial color="#111" /></mesh>
            ))}
          </group>
        </group>
      )}
      <mesh position={[ROBOT_RADIUS * 0.6, 0.8, -ROBOT_RADIUS * 0.6]}><cylinderGeometry args={[0.02, 0.02, 1.2, 4]} /><meshStandardMaterial color="#111" /></mesh>
      <mesh position={[ROBOT_RADIUS * 0.6, 1.4, -ROBOT_RADIUS * 0.6]}><sphereGeometry args={[0.08, 4, 4]} /><meshStandardMaterial color={data.isPlayer ? "cyan" : "red"} emissive={data.isPlayer ? "cyan" : "red"} emissiveIntensity={1} /></mesh>
      {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z], i) => (
        <mesh key={i} position={[x * (ROBOT_RADIUS + 0.15), 0.3, z * 0.6]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.35, 0.35, 0.3, 8]} /><meshStandardMaterial color="#111" roughness={1} flatShading /></mesh>
      ))}
      <Html position={[0, 2.4, 0]} center distanceFactor={8}>
        <div className="flex flex-col items-center gap-1 opacity-80 scale-75">
          <div className="w-20 h-2 bg-black/80 border border-white/40 p-[1px] shadow-lg">
            <div className={`h-full transition-all duration-300 ${ (data.health / data.maxHealth) > 0.5 ? 'bg-green-500' : (data.health / data.maxHealth) > 0.2 ? 'bg-yellow-500' : 'bg-red-600' }`} style={{ width: `${(data.health / data.maxHealth) * 100}%` }} />
          </div>
        </div>
      </Html>
    </group>
  );
};

const GameLoop: React.FC<{
  robots: RobotData[];
  setRobots: React.Dispatch<React.SetStateAction<RobotData[]>>;
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
}> = ({ robots, setRobots, gameState, setGameState }) => {
  const keys = useKeyboard();

  useFrame((state) => {
    if (gameState !== GameState.PLAYING) return;
    const now = state.clock.getElapsedTime();
    const updatedRobots = robots.map(r => ({ ...r, velocity: r.velocity.clone(), position: r.position.clone() }));
    const player = updatedRobots.find(r => r.isPlayer);
    if (!player || player.isDead) { setGameState(GameState.GAME_OVER); return; }
    if (updatedRobots.filter(r => !r.isPlayer && !r.isDead).length === 0) { setGameState(GameState.VICTORY); return; }

    updatedRobots.forEach(bot => {
      if (bot.isDead) return;
      if (now >= bot.stunnedUntil) {
        if (bot.isPlayer) {
          if (keys['ArrowLeft'] || keys['KeyA']) bot.rotation += TURN_SPEED;
          if (keys['ArrowRight'] || keys['KeyD']) bot.rotation -= TURN_SPEED;
          const forward = new Vector3(Math.sin(bot.rotation), 0, Math.cos(bot.rotation));
          if (keys['ArrowUp'] || keys['KeyW']) bot.velocity.add(forward.multiplyScalar(MOVE_SPEED));
          if (keys['ArrowDown'] || keys['KeyS']) bot.velocity.add(forward.multiplyScalar(-MOVE_SPEED));
          if (keys['Space'] && !bot.weaponActive) bot.weaponActive = true;
        } else {
          const dirToPlayer = player.position.clone().sub(bot.position).normalize();
          const angleToPlayer = Math.atan2(dirToPlayer.x, dirToPlayer.z);
          let diff = angleToPlayer - bot.rotation;
          while (diff < -Math.PI) diff += Math.PI * 2;
          while (diff > Math.PI) diff -= Math.PI * 2;
          bot.rotation += Math.sign(diff) * Math.min(Math.abs(diff), TURN_SPEED * 0.3);
          if (Math.abs(diff) < 0.5) {
            const forward = new Vector3(Math.sin(bot.rotation), 0, Math.cos(bot.rotation));
            bot.velocity.add(forward.multiplyScalar(MOVE_SPEED * ENEMY_SPEED_MULT));
          }
          if (bot.type === 'spinner' && Math.random() < 0.005) bot.weaponActive = true;
        }
      }
      bot.position.add(bot.velocity);
      bot.velocity.multiplyScalar(FRICTION);
      const halfSize = ARENA_SIZE / 2;
      const wallRange = halfSize - WALL_GAP;
      if (Math.abs(bot.position.z) < wallRange) {
        if (bot.position.x > halfSize - ROBOT_RADIUS) { bot.position.x = halfSize - ROBOT_RADIUS; bot.velocity.x *= -0.3; }
        else if (bot.position.x < -halfSize + ROBOT_RADIUS) { bot.position.x = -halfSize + ROBOT_RADIUS; bot.velocity.x *= -0.3; }
      }
      if (Math.abs(bot.position.x) < wallRange) {
        if (bot.position.z > halfSize - ROBOT_RADIUS) { bot.position.z = halfSize - ROBOT_RADIUS; bot.velocity.z *= -0.3; }
        else if (bot.position.z < -halfSize + ROBOT_RADIUS) { bot.position.z = -halfSize + ROBOT_RADIUS; bot.velocity.z *= -0.3; }
      }
      if (Math.abs(bot.position.x) > halfSize + 0.5 || Math.abs(bot.position.z) > halfSize + 0.5) { bot.isDead = true; bot.health = 0; }
    });

    for (let i = 0; i < updatedRobots.length; i++) {
      for (let j = i + 1; j < updatedRobots.length; j++) {
        const r1 = updatedRobots[i], r2 = updatedRobots[j];
        if (r1.isDead || r2.isDead) continue;
        const dist = r1.position.distanceTo(r2.position);
        if (dist < ROBOT_RADIUS * 2.1) {
          const normal = r1.position.clone().sub(r2.position).normalize();
          const overlap = ROBOT_RADIUS * 2.1 - dist;
          r1.position.add(normal.clone().multiplyScalar(overlap * 0.4));
          r2.position.add(normal.clone().multiplyScalar(-overlap * 0.4));
          let knock = KNOCKBACK_FORCE, d1 = 1, d2 = 1;
          if (r1.weaponActive && r1.type === 'spinner') { knock += 0.2; d2 += WEAPON_DAMAGE; }
          if (r2.weaponActive && r2.type === 'spinner') { knock += 0.2; d1 += WEAPON_DAMAGE; }
          r1.velocity.add(normal.clone().multiplyScalar(knock));
          r2.velocity.add(normal.clone().multiplyScalar(-knock));
          r1.health = Math.max(0, r1.health - d1);
          r2.health = Math.max(0, r2.health - d2);
          r1.stunnedUntil = now + 0.2; r2.stunnedUntil = now + 0.2;
          if (r1.health <= 0) r1.isDead = true;
          if (r2.health <= 0) r2.isDead = true;
        }
      }
    }

    const cameraTarget = new Vector3(player.position.x - Math.sin(player.rotation) * 10, 8, player.position.z - Math.cos(player.rotation) * 10);
    state.camera.position.lerp(cameraTarget, 0.08);
    state.camera.lookAt(player.position.x, 0.5, player.position.z);
    updatedRobots.forEach(bot => { if (bot.weaponActive && Math.random() < 0.04) bot.weaponActive = false; });
    setRobots(updatedRobots);
  });

  return (
    <>
      <color attach="background" args={['#e2e8f0']} />
      <Arena />
      {robots.map((robot) => <Robot key={robot.id} data={robot} />)}
      <Environment preset="warehouse" />
      <ContactShadows resolution={1024} scale={ARENA_SIZE * 1.5} blur={2} opacity={0.4} far={10} color="#000" />
      <ambientLight intensity={0.7} />
      <directionalLight position={[10, 20, 10]} intensity={1.2} castShadow />
    </>
  );
};

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.START);
  const [robots, setRobots] = useState<RobotData[]>([]);

  const initGame = useCallback(() => {
    const initialRobots: RobotData[] = [{
        id: 'player', isPlayer: true, position: new Vector3(0, 0, 0), velocity: new Vector3(0, 0, 0),
        rotation: 0, health: MAX_ROBOT_HEALTH, maxHealth: MAX_ROBOT_HEALTH, weaponActive: false,
        isDead: false, color: ROBOT_COLORS.PLAYER, type: 'spinner', stunnedUntil: 0
    }];
    const types: RobotType[] = ['tank', 'wedge', 'spinner'];
    for (let i = 0; i < ENEMY_COUNT; i++) {
      const angle = (i / ENEMY_COUNT) * Math.PI * 2, dist = 6;
      initialRobots.push({
        id: `enemy-${i}`, isPlayer: false, position: new Vector3(Math.cos(angle) * dist, 0, Math.sin(angle) * dist),
        velocity: new Vector3(0, 0, 0), rotation: Math.PI + angle, health: MAX_ROBOT_HEALTH, maxHealth: MAX_ROBOT_HEALTH,
        weaponActive: false, isDead: false, color: '#ef4444', type: types[i % types.length], stunnedUntil: 0
      });
    }
    setRobots(initialRobots);
    setGameState(GameState.PLAYING);
  }, []);

  const playerBot = robots.find(r => r.isPlayer);

  return (
    <div className="relative w-full h-screen bg-slate-200 text-slate-900 overflow-hidden font-['VT323']">
      <div className="absolute top-0 left-0 w-full p-8 z-10 pointer-events-none select-none">
        <div className="flex justify-between items-start">
          <div className="bg-white/80 backdrop-blur-md p-6 border-b-4 border-r-4 border-slate-900 shadow-xl">
            <h1 className="text-4xl font-bold tracking-tighter text-slate-800 uppercase">Arena Combat</h1>
            <p className="text-sm text-slate-500 uppercase tracking-widest">LIVE_FEED // ACTIVE</p>
          </div>
          {gameState === GameState.PLAYING && (
            <div className="bg-white/80 backdrop-blur-md p-6 border-b-4 border-l-4 border-red-600 shadow-xl">
              <div className="text-sm text-slate-500 mb-1 uppercase text-right">Combatants</div>
              <div className="text-5xl font-bold text-red-600 text-right">{robots.filter(r => !r.isPlayer && !r.isDead).length}</div>
            </div>
          )}
        </div>
        {gameState === GameState.PLAYING && playerBot && (
          <div className="absolute bottom-12 left-12 w-80 bg-white/80 backdrop-blur-md p-6 border-t-4 border-r-4 border-slate-900 shadow-xl">
            <div className="flex justify-between items-end mb-3">
              <span className="text-lg font-bold text-slate-800 uppercase">Hull Integrity</span>
              <span className="text-3xl text-slate-900">{Math.ceil(playerBot.health)}%</span>
            </div>
            <div className="w-full h-6 bg-slate-200 border-2 border-slate-400 overflow-hidden p-1">
              <div className={`h-full transition-all duration-300 ${playerBot.health > 30 ? 'bg-blue-600' : 'bg-red-600 animate-pulse'}`} style={{ width: `${playerBot.health}%` }} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm text-slate-500 uppercase">
              <div className="flex items-center gap-2"><Cpu size={16}/> DRIVE: OK</div>
              <div className="flex items-center gap-2"><Swords size={16}/> SPIN: {playerBot.weaponActive ? 'ON' : 'OFF'}</div>
            </div>
          </div>
        )}
      </div>

      {gameState === GameState.START && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-100/40 backdrop-blur-sm">
          <div className="text-center border-8 border-slate-900 p-16 bg-white shadow-2xl">
            <h2 className="text-8xl font-bold mb-8 tracking-tighter text-slate-900 uppercase italic">Robot Arena</h2>
            <div className="space-y-6 mb-12 text-2xl text-slate-600 font-bold uppercase">
                <p>DRIVE: [WASD / ARROWS]</p>
                <p>WEAPON: [SPACE]</p>
                <p className="text-red-600">OUTLAST THEM ALL</p>
            </div>
            <button onClick={initGame} className="px-16 py-6 bg-slate-900 text-white text-4xl font-bold hover:bg-blue-600 transition-all transform hover:scale-105 active:scale-95 pointer-events-auto shadow-[8px_8px_0px_#94a3b8] uppercase">ENGAGE</button>
          </div>
        </div>
      )}

      {(gameState === GameState.GAME_OVER || gameState === GameState.VICTORY) && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-100/90 backdrop-blur-md">
          <div className="text-center p-20 border-8 border-slate-900 bg-white shadow-2xl">
            <h2 className={`text-9xl font-bold mb-6 ${gameState === GameState.VICTORY ? 'text-blue-600' : 'text-red-600'}`}>{gameState === GameState.VICTORY ? 'VICTORY' : 'SCRAPPED'}</h2>
            <p className="text-3xl text-slate-500 mb-12 uppercase tracking-[1em]">{gameState === GameState.VICTORY ? 'Champion Data Stored' : 'Hardware Failure'}</p>
            <button onClick={initGame} className="px-16 py-6 bg-slate-900 text-white text-3xl font-bold hover:bg-blue-600 transition-all pointer-events-auto shadow-[8px_8px_0px_#94a3b8] uppercase">RE-INITIALIZE</button>
          </div>
        </div>
      )}

      <Canvas shadows gl={{ antialias: true }}>
        <PerspectiveCamera makeDefault position={[0, 12, 14]} fov={40} />
        <GameLoop robots={robots} setRobots={setRobots} gameState={gameState} setGameState={setGameState} />
      </Canvas>
    </div>
  );
}

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(<React.StrictMode><App /></React.StrictMode>);
}
