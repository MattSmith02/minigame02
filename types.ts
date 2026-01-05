
import { Vector3 } from 'three';

export enum GameState {
  START = 'START',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER',
  VICTORY = 'VICTORY'
}

export type RobotType = 'spinner' | 'wedge' | 'tank';

export interface RobotData {
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
