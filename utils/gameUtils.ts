import { FOCAL_LENGTH, SKINS } from '../constants';
import { PlaneSkin } from '../types';

export const project = (x: number, y: number, z: number, width: number, height: number) => {
  // Avoid division by zero
  const safeZ = Math.max(z + FOCAL_LENGTH, 1);
  const scale = FOCAL_LENGTH / safeZ;
  const screenX = width / 2 + x * scale;
  const screenY = height / 2 + y * scale;
  return { x: screenX, y: screenY, scale };
};

export const getSkinById = (id: string): PlaneSkin => {
  return SKINS.find((s) => s.id === id) || SKINS[0];
};

export const randomRange = (min: number, max: number) => {
  return Math.random() * (max - min) + min;
};