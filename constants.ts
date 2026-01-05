
export const ARENA_SIZE = 22; 
export const WALL_GAP = 5; // The size of the corner openings
export const ROBOT_RADIUS = 0.8;
export const MAX_ROBOT_HEALTH = 100;
export const MOVE_SPEED = 0.008; // Slightly slower acceleration for better control
export const ENEMY_SPEED_MULT = 0.4; 
export const TURN_SPEED = 0.08; // Slightly slower turn for a more deliberate feel
export const FRICTION = 0.92; // More drag/weight so they stop sooner after being pushed
export const KNOCKBACK_FORCE = 0.15; // Drastically reduced for a "slow push" feel
export const WEAPON_DAMAGE = 15;
export const ENEMY_COUNT = 3;

export const ROBOT_COLORS = {
  PLAYER: '#facc15', 
  ENEMY_SPINNER: '#ef4444',
  ENEMY_WEDGE: '#fb923c',
  ENEMY_TANK: '#22c55e',
  ARENA: '#94a3b8', 
  WALL: '#475569', 
  WEAPON: '#cbd5e1'
};
