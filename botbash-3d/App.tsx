
import React, { useState, useCallback, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { PerspectiveCamera, Stars, Environment, ContactShadows } from '@react-three/drei';
import { Vector3, Color } from 'three';
import { Robot } from './components/Robot';
import { Arena } from './components/Arena';
import { useKeyboard } from './hooks/useKeyboard';
import { RobotData, GameState, RobotType } from './types';
import { 
  ARENA_SIZE, 
  WALL_GAP,
  ROBOT_RADIUS, 
  ENEMY_COUNT, 
  MOVE_SPEED, 
  TURN_SPEED, 
  KNOCKBACK_FORCE, 
  WEAPON_DAMAGE,
  MAX_ROBOT_HEALTH,
  FRICTION,
  ENEMY_SPEED_MULT,
  ROBOT_COLORS
} from './constants';
import { Cpu, Swords } from 'lucide-react';

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

    const updatedRobots = robots.map(r => ({
      ...r,
      velocity: r.velocity.clone(),
      position: r.position.clone(),
    }));

    const player = updatedRobots.find(r => r.isPlayer);
    if (!player || player.isDead) {
      setGameState(GameState.GAME_OVER);
      return;
    }

    const enemies = updatedRobots.filter(r => !r.isPlayer && !r.isDead);
    if (enemies.length === 0) {
      setGameState(GameState.VICTORY);
      return;
    }

    // 1. Movement & AI
    updatedRobots.forEach(bot => {
      if (bot.isDead) return;

      if (now >= bot.stunnedUntil) {
        if (bot.isPlayer) {
          if (keys['ArrowLeft'] || keys['KeyA']) bot.rotation += TURN_SPEED;
          if (keys['ArrowRight'] || keys['KeyD']) bot.rotation -= TURN_SPEED;
          
          const forward = new Vector3(Math.sin(bot.rotation), 0, Math.cos(bot.rotation));
          if (keys['ArrowUp'] || keys['KeyW']) bot.velocity.add(forward.multiplyScalar(MOVE_SPEED));
          if (keys['ArrowDown'] || keys['KeyS']) bot.velocity.add(forward.multiplyScalar(-MOVE_SPEED));

          if (keys['Space'] && !bot.weaponActive) {
            bot.weaponActive = true;
          }
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

          if (bot.type === 'spinner' && Math.random() < 0.005) {
            bot.weaponActive = true;
          }
        }
      }

      // Physics application
      bot.position.add(bot.velocity);
      bot.velocity.multiplyScalar(FRICTION);

      // Arena Boundary / Wall Logic
      const halfSize = ARENA_SIZE / 2;
      const wallRange = halfSize - WALL_GAP;
      const bRad = ROBOT_RADIUS;

      // X-axis wall check
      if (Math.abs(bot.position.z) < wallRange) {
        if (bot.position.x > halfSize - bRad) {
          bot.position.x = halfSize - bRad;
          bot.velocity.x *= -0.3; // Dampened bounce
        } else if (bot.position.x < -halfSize + bRad) {
          bot.position.x = -halfSize + bRad;
          bot.velocity.x *= -0.3; // Dampened bounce
        }
      }

      // Z-axis wall check
      if (Math.abs(bot.position.x) < wallRange) {
        if (bot.position.z > halfSize - bRad) {
          bot.position.z = halfSize - bRad;
          bot.velocity.z *= -0.3; // Dampened bounce
        } else if (bot.position.z < -halfSize + bRad) {
          bot.position.z = -halfSize + bRad;
          bot.velocity.z *= -0.3; // Dampened bounce
        }
      }

      // Final "Pit" check
      const isOutOfBoundsX = Math.abs(bot.position.x) > halfSize + 0.5;
      const isOutOfBoundsZ = Math.abs(bot.position.z) > halfSize + 0.5;
      
      if (isOutOfBoundsX || isOutOfBoundsZ) {
        bot.isDead = true;
        bot.health = 0;
      }
    });

    // 2. Heavy Collisions
    for (let i = 0; i < updatedRobots.length; i++) {
      for (let j = i + 1; j < updatedRobots.length; j++) {
        const r1 = updatedRobots[i];
        const r2 = updatedRobots[j];

        if (r1.isDead || r2.isDead) continue;

        const dist = r1.position.distanceTo(r2.position);
        const minDist = ROBOT_RADIUS * 2.1;

        if (dist < minDist) {
          const normal = r1.position.clone().sub(r2.position).normalize();
          
          // Smoother overlap resolution - pushing them apart gently
          const overlap = minDist - dist;
          r1.position.add(normal.clone().multiplyScalar(overlap * 0.4));
          r2.position.add(normal.clone().multiplyScalar(-overlap * 0.4));

          let knock = KNOCKBACK_FORCE;
          let d1 = 1;
          let d2 = 1;

          // Spinner weapons still cause more knockback, but the base is much lower
          if (r1.weaponActive && r1.type === 'spinner') { knock += 0.2; d2 += WEAPON_DAMAGE; }
          if (r2.weaponActive && r2.type === 'spinner') { knock += 0.2; d1 += WEAPON_DAMAGE; }

          r1.velocity.add(normal.clone().multiplyScalar(knock));
          r2.velocity.add(normal.clone().multiplyScalar(-knock));

          r1.health = Math.max(0, r1.health - d1);
          r2.health = Math.max(0, r2.health - d2);
          
          r1.stunnedUntil = now + 0.2;
          r2.stunnedUntil = now + 0.2;

          if (r1.health <= 0) r1.isDead = true;
          if (r2.health <= 0) r2.isDead = true;
        }
      }
    }

    // 3. Camera
    const cameraTarget = new Vector3(
      player.position.x - Math.sin(player.rotation) * 10,
      8,
      player.position.z - Math.cos(player.rotation) * 10
    );
    state.camera.position.lerp(cameraTarget, 0.08);
    state.camera.lookAt(player.position.x, 0.5, player.position.z);

    updatedRobots.forEach(bot => {
      if (bot.weaponActive && Math.random() < 0.04) bot.weaponActive = false;
    });

    setRobots(updatedRobots);
  });

  return (
    <>
      <color attach="background" args={['#e2e8f0']} />
      <Arena />
      {robots.map((robot) => (
        <Robot key={robot.id} data={robot} />
      ))}
      <Environment preset="warehouse" />
      <ContactShadows resolution={1024} scale={ARENA_SIZE * 1.5} blur={2} opacity={0.4} far={10} color="#000" />
      <ambientLight intensity={0.7} />
      <directionalLight 
        position={[10, 20, 10]} 
        intensity={1.2} 
        castShadow 
        shadow-mapSize={[1024, 1024]}
      />
      <pointLight position={[-10, 10, -10]} intensity={0.5} color="#cbd5e1" />
    </>
  );
};

export default function App() {
  const [gameState, setGameState] = useState<GameState>(GameState.START);
  const [robots, setRobots] = useState<RobotData[]>([]);

  const initGame = useCallback(() => {
    const initialRobots: RobotData[] = [
      {
        id: 'player',
        isPlayer: true,
        position: new Vector3(0, 0, 0),
        velocity: new Vector3(0, 0, 0),
        rotation: 0,
        health: MAX_ROBOT_HEALTH,
        maxHealth: MAX_ROBOT_HEALTH,
        weaponActive: false,
        isDead: false,
        color: ROBOT_COLORS.PLAYER,
        type: 'spinner',
        stunnedUntil: 0
      }
    ];

    const types: RobotType[] = ['tank', 'wedge', 'spinner'];
    for (let i = 0; i < ENEMY_COUNT; i++) {
      const angle = (i / ENEMY_COUNT) * Math.PI * 2;
      const dist = 6;
      initialRobots.push({
        id: `enemy-${i}`,
        isPlayer: false,
        position: new Vector3(Math.cos(angle) * dist, 0, Math.sin(angle) * dist),
        velocity: new Vector3(0, 0, 0),
        rotation: Math.PI + angle,
        health: MAX_ROBOT_HEALTH,
        maxHealth: MAX_ROBOT_HEALTH,
        weaponActive: false,
        isDead: false,
        color: '#ef4444',
        type: types[i % types.length],
        stunnedUntil: 0
      });
    }

    setRobots(initialRobots);
    setGameState(GameState.PLAYING);
  }, []);

  return (
    <div className="relative w-full h-screen bg-slate-200 text-slate-900 overflow-hidden font-['VT323']">
      <div className="absolute top-0 left-0 w-full p-8 z-10 pointer-events-none select-none">
        <div className="flex justify-between items-start">
          <div className="bg-white/80 backdrop-blur-md p-6 border-b-4 border-r-4 border-slate-900 shadow-xl">
            <h1 className="text-4xl font-bold tracking-tighter text-slate-800 uppercase">Arena Combat</h1>
            <p className="text-sm text-slate-500 uppercase tracking-widest">LIVE_FEED // BRIGHT_MODE_ACTIVE</p>
          </div>
          
          {gameState === GameState.PLAYING && (
            <div className="bg-white/80 backdrop-blur-md p-6 border-b-4 border-l-4 border-red-600 shadow-xl">
              <div className="text-sm text-slate-500 mb-1 uppercase">Combatants</div>
              <div className="text-5xl font-bold text-red-600 text-right">
                {robots.filter(r => !r.isPlayer && !r.isDead).length}
              </div>
            </div>
          )}
        </div>

        {gameState === GameState.PLAYING && robots.find(r => r.isPlayer) && (
          <div className="absolute bottom-12 left-12 w-80 bg-white/80 backdrop-blur-md p-6 border-t-4 border-r-4 border-slate-900 shadow-xl">
            <div className="flex justify-between items-end mb-3">
              <span className="text-lg font-bold text-slate-800 uppercase">Hull Integrity</span>
              <span className="text-3xl text-slate-900">{Math.ceil(robots.find(r => r.isPlayer)?.health || 0)}%</span>
            </div>
            <div className="w-full h-6 bg-slate-200 border-2 border-slate-400 overflow-hidden p-1">
              <div 
                className={`h-full transition-all duration-300 ${
                  (robots.find(r => r.isPlayer)?.health || 0) > 30 ? 'bg-blue-600' : 'bg-red-600 animate-pulse'
                }`}
                style={{ width: `${robots.find(r => r.isPlayer)?.health}%` }}
              />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm text-slate-500 uppercase">
              <div className="flex items-center gap-2"><Cpu size={16}/> DRIVE: OK</div>
              <div className="flex items-center gap-2"><Swords size={16}/> SPIN: {robots.find(r => r.isPlayer)?.weaponActive ? 'ON' : 'OFF'}</div>
            </div>
          </div>
        )}
      </div>

      {gameState === GameState.START && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-100/40 backdrop-blur-sm">
          <div className="text-center border-8 border-slate-900 p-16 bg-white shadow-2xl">
            <h2 className="text-8xl font-bold mb-8 tracking-tighter text-slate-900 uppercase italic">Robot Arena</h2>
            <div className="space-y-6 mb-12 text-2xl text-slate-600 font-bold">
                <p>DRIVE: [WASD / ARROWS]</p>
                <p>WEAPON: [SPACE]</p>
                <p className="text-red-600">WATCH THE CORNERS</p>
            </div>
            <button 
              onClick={initGame}
              className="px-16 py-6 bg-slate-900 text-white text-4xl font-bold hover:bg-blue-600 transition-all transform hover:scale-105 active:scale-95 pointer-events-auto shadow-[8px_8px_0px_#94a3b8]"
            >
              ENGAGE
            </button>
          </div>
        </div>
      )}

      {(gameState === GameState.GAME_OVER || gameState === GameState.VICTORY) && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-100/90 backdrop-blur-md">
          <div className="text-center p-20 border-8 border-slate-900 bg-white shadow-2xl">
            {gameState === GameState.VICTORY ? (
              <>
                <h2 className="text-9xl font-bold mb-6 text-blue-600 animate-bounce">VICTORY</h2>
                <p className="text-3xl text-slate-500 mb-12 uppercase tracking-[1em]">Champion Data Stored</p>
              </>
            ) : (
              <>
                <h2 className="text-9xl font-bold mb-6 text-red-600">SCRAPPED</h2>
                <p className="text-3xl text-slate-500 mb-12 uppercase tracking-[1em]">Hardware Failure</p>
              </>
            )}
            <button 
              onClick={initGame}
              className="px-16 py-6 bg-slate-900 text-white text-3xl font-bold hover:bg-blue-600 transition-all pointer-events-auto shadow-[8px_8px_0px_#94a3b8]"
            >
              RE-INITIALIZE
            </button>
          </div>
        </div>
      )}

      <Canvas shadows gl={{ antialias: true }}>
        <PerspectiveCamera makeDefault position={[0, 12, 14]} fov={40} />
        <GameLoop 
          robots={robots} 
          setRobots={setRobots} 
          gameState={gameState} 
          setGameState={setGameState} 
        />
      </Canvas>
    </div>
  );
}
