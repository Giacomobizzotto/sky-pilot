
import { PlaneSkin } from './types';

// Rendering Constants
export const FOCAL_LENGTH = 300;
export const HORIZON_Y = 0; // Relative to center
export const FAR_Z = 3000;
export const NEAR_Z = 180; // Collision happens further out (easier to see/time)
export const SPAWN_Z = 2500;
export const VIRTUAL_FLOOR_Y = 350; // Raised slightly for better perspective on the grid

// Core Gameplay Mechanics
export const PLAYABLE_WIDTH = 500; // The player can move this wide
export const SPAWN_RANGE_X = 380; // Objects spawn in this narrower range (always reachable)
export const INITIAL_SPEED = 15;
export const MAX_SPEED = 50; 
export const SPEED_INCREMENT = 0.005; 
export const PLAYER_SPEED_SMOOTHING = 0.2; 
export const SPAWN_RATE_INITIAL = 30; 

// Combat & Powerups
export const LASER_SPEED = 140; // Increased by 50% (was 90)
export const LASER_COOLDOWN_DEFAULT = 10; // Slightly faster for auto-fire feel
export const LASER_COOLDOWN_RAPID = 3; 
export const ASTEROID_SCORE = 100;
export const ASTEROID_HP_SMALL = 1;
export const ASTEROID_HP_LARGE = 3;

export const SHIELD_DURATION = 600; 
export const MAGNET_DURATION = 600; 
export const RAPID_FIRE_DURATION = 600;
export const TRIPLE_SHOT_DURATION = 600;

export const MAGNET_RANGE = 700;    

// Collision Tuning
export const OBSTACLE_HIT_BOX_SCALE = 0.75; // Reduced from 0.9 for forgiveness (Game Feel)
export const COIN_HIT_BOX_SCALE = 2.0; // Huge hitbox for coins/gates

// Visuals
export const GRID_SEGMENTS = 20;
export const GRID_SPACING = 200;

// Shop Data
export const SKINS: PlaneSkin[] = [
  // Starters
  { id: 'default', name: 'Neon Jet', model: 'jet', color: '#06b6d4', accent: '#ec4899', price: 0 },
  { id: 'blue_biplane', name: 'Sky Baron', model: 'biplane', color: '#3b82f6', accent: '#f59e0b', price: 250 },
  
  // Tier 1 (500 - 1500)
  { id: 'rusty', name: 'Old Reliable', model: 'biplane', color: '#78350f', accent: '#a16207', price: 500 },
  { id: 'forest_ranger', name: 'Ranger', model: 'biplane', color: '#15803d', accent: '#86efac', price: 600 },
  { id: 'bubblegum', name: 'Sweet Tooth', model: 'biplane', color: '#ec4899', accent: '#fbcfe8', price: 750 },
  { id: 'oceanic', name: 'Deep Dive', model: 'ufo', color: '#0ea5e9', accent: '#7dd3fc', price: 800 },
  { id: 'hot_rod', name: 'Hot Rod', model: 'jet', color: '#ea580c', accent: '#fca5a5', price: 900 },
  { id: 'stealth_jet', name: 'Night Fury', model: 'jet', color: '#171717', accent: '#404040', price: 1000 },
  { id: 'ice_breaker', name: 'Ice Breaker', model: 'jet', color: '#06b6d4', accent: '#cffafe', price: 1100 },
  { id: 'viper', name: 'Viper', model: 'jet', color: '#65a30d', accent: '#d9f99d', price: 1200 },
  { id: 'crimson_baron', name: 'Red Baron', model: 'biplane', color: '#991b1b', accent: '#fca5a5', price: 1300 },
  { id: 'invader_x', name: 'Invader X', model: 'ufo', color: '#22c55e', accent: '#86efac', price: 1400 },
  { id: 'pink_phantom', name: 'Phantom', model: 'jet', color: '#db2777', accent: '#fdf4ff', price: 1500 },

  // Tier 2 (2000 - 4000)
  { id: 'saucer_51', name: 'Area 51', model: 'ufo', color: '#94a3b8', accent: '#e2e8f0', price: 2000 },
  { id: 'midnight_run', name: 'Midnight', model: 'jet', color: '#1e3a8a', accent: '#60a5fa', price: 2200 },
  { id: 'toxic_avenger', name: 'Hazmat', model: 'biplane', color: '#84cc16', accent: '#166534', price: 2400 },
  { id: 'gold_ufo', name: 'Royal Disc', model: 'ufo', color: '#eab308', accent: '#fef08a', price: 2500 },
  { id: 'prototype_x', name: 'Prototype', model: 'jet', color: '#f8fafc', accent: '#94a3b8', price: 3000 },
  { id: 'nebula', name: 'Nebula', model: 'ufo', color: '#7c3aed', accent: '#d8b4fe', price: 3500 },
  { id: 'shadow_ops', name: 'Shadow Ops', model: 'ufo', color: '#000000', accent: '#dc2626', price: 4000 },

  // Tier 3 (Premium / Expensive)
  { id: 'solar_flare', name: 'Solar', model: 'ufo', color: '#f97316', accent: '#fff7ed', price: 5000 },
  { id: 'silver_bullet', name: 'Silver Bullet', model: 'jet', color: '#cbd5e1', accent: '#64748b', price: 6000 },
  { id: 'golden_eagle', name: 'Gold Eagle', model: 'biplane', color: '#ca8a04', accent: '#fde047', price: 7500 },
  { id: 'void_walker', name: 'Void Walker', model: 'ufo', color: '#4c1d95', accent: '#2dd4bf', price: 10000 },
  { id: 'cyber_punk', name: 'Cyber', model: 'jet', color: '#facc15', accent: '#06b6d4', price: 15000 },
];

export const STORAGE_KEY = 'sky_pilot_data_v3';
