export enum GameState {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  SHOP = 'SHOP',
  GAME_OVER = 'GAME_OVER'
}

export enum EntityType {
  OBSTACLE_CUBE = 'OBSTACLE_CUBE',
  OBSTACLE_RING = 'OBSTACLE_RING',
  OBSTACLE_ASTEROID = 'OBSTACLE_ASTEROID',
  COIN = 'COIN',
  SHIELD = 'SHIELD',
  MAGNET = 'MAGNET',
  POWERUP_RAPID = 'POWERUP_RAPID',
  POWERUP_TRIPLE = 'POWERUP_TRIPLE',
  LASER = 'LASER',
  PARTICLE = 'PARTICLE'
}

export type PlaneModel = 'jet' | 'biplane' | 'ufo';

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface Entity extends Point3D {
  id: number;
  type: EntityType;
  width: number;
  height: number;
  color: string;
  active: boolean;
  rotation?: number; 
  speedZ?: number;
}

export interface Particle extends Point3D {
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface FloatingText extends Point3D {
  id: number;
  text: string;
  color: string;
  life: number; // 1.0 to 0
  velocity: number;
}

export interface PlaneSkin {
  id: string;
  name: string;
  model: PlaneModel;
  color: string; // Main body color
  accent: string; // Wing detail color
  price: number;
}

export interface UserData {
  coins: number;
  highScore: number;
  ownedSkins: string[];
  selectedSkinId: string;
}