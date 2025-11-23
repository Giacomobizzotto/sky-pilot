import React, { useRef, useEffect, useCallback, useState } from 'react';
import { 
  GameState, 
  Entity, 
  EntityType, 
  Particle,
  PlaneSkin,
  FloatingText
} from '../types';
import { 
  FOCAL_LENGTH, 
  SPAWN_Z, 
  INITIAL_SPEED, 
  MAX_SPEED, 
  SPEED_INCREMENT, 
  PLAYER_SPEED_SMOOTHING,
  NEAR_Z,
  OBSTACLE_HIT_BOX_SCALE,
  COIN_HIT_BOX_SCALE,
  SHIELD_DURATION,
  MAGNET_DURATION,
  RAPID_FIRE_DURATION,
  TRIPLE_SHOT_DURATION,
  MAGNET_RANGE,
  VIRTUAL_FLOOR_Y,
  SPAWN_X_RANGE,
  LASER_SPEED,
  LASER_COOLDOWN_DEFAULT,
  LASER_COOLDOWN_RAPID,
  ASTEROID_SCORE
} from '../constants';
import { project, randomRange } from '../utils/gameUtils';

interface GameCanvasProps {
  gameState: GameState;
  skin: PlaneSkin;
  onGameOver: (score: number, coins: number) => void;
  onCoinCollected: () => void;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ 
  gameState, 
  skin, 
  onGameOver,
  onCoinCollected
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  
  // Game State Refs
  const scoreRef = useRef(0);
  const coinsSessionRef = useRef(0);
  const speedRef = useRef(INITIAL_SPEED);
  const frameCountRef = useRef(0);
  
  // Powerups & Combat
  const hasShieldRef = useRef(false);
  const shieldTimeRef = useRef(0);
  const hasMagnetRef = useRef(false);
  const magnetTimeRef = useRef(0);
  const hasRapidFireRef = useRef(false);
  const rapidFireTimeRef = useRef(0);
  const hasTripleShotRef = useRef(false);
  const tripleShotTimeRef = useRef(0);
  
  const lastShotFrameRef = useRef(0);
  
  // Entities & Visuals
  const entitiesRef = useRef<Entity[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const lasersRef = useRef<Entity[]>([]);
  const shakeRef = useRef(0); // Screen shake intensity
  
  // Player Position
  const playerPosRef = useRef({ x: 0, y: 0, z: NEAR_Z, tilt: 0 });
  const targetPosRef = useRef({ x: 0, y: 0 });

  // Input Handling
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (gameState !== GameState.PLAYING) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const scale = FOCAL_LENGTH / (FOCAL_LENGTH + NEAR_Z);
    // Allow moving slightly beyond visual edge to ensuring corner reachability
    const worldX = (x - centerX) / scale;
    const worldY = (y - centerY) / scale;

    targetPosRef.current = { x: worldX, y: worldY };
  }, [gameState]);

  const fireLaser = useCallback(() => {
    if (gameState !== GameState.PLAYING) return;

    const cooldown = hasRapidFireRef.current ? LASER_COOLDOWN_RAPID : LASER_COOLDOWN_DEFAULT;
    if (frameCountRef.current - lastShotFrameRef.current < cooldown) return;

    lastShotFrameRef.current = frameCountRef.current;
    const p = playerPosRef.current;

    const spawnLaser = (offsetX: number) => {
      lasersRef.current.push({
        id: Math.random(),
        x: p.x + offsetX,
        y: p.y,
        z: p.z + 50,
        type: EntityType.LASER,
        width: 20,
        height: 20,
        color: hasRapidFireRef.current ? '#ef4444' : '#06b6d4', // Red for rapid, Cyan default
        active: true
      });
    };

    spawnLaser(0);

    if (hasTripleShotRef.current) {
        spawnLaser(-60);
        spawnLaser(60);
    }
  }, [gameState]);

  // Keyboard controls for PC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.code === 'Space') {
            fireLaser();
        }
    };
    // Also attach click to canvas for PC mouse shooting
    const handleMouseDown = (e: MouseEvent) => {
        if (e.button === 0) fireLaser(); // Left click
    };

    window.addEventListener('keydown', handleKeyDown);
    if (canvasRef.current) {
        canvasRef.current.addEventListener('mousedown', handleMouseDown);
    }
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
        if (canvasRef.current) {
            canvasRef.current.removeEventListener('mousedown', handleMouseDown);
        }
    };
  }, [fireLaser]);

  // Spawning Logic
  const spawnEntity = () => {
    const typeRoll = Math.random();
    let type = EntityType.OBSTACLE_CUBE;
    let color = '#ef4444'; // Red
    let width = 100;
    let height = 100;
    
    // Default Y position range
    let yPos = randomRange(-400, 400);

    if (typeRoll > 0.98) {
        type = EntityType.SHIELD;
        color = '#0ea5e9'; // Cyan
        width = 60;
        height = 60;
    } else if (typeRoll > 0.96) {
        type = EntityType.MAGNET;
        color = '#a855f7'; // Purple
        width = 60;
        height = 60;
    } else if (typeRoll > 0.94) {
        type = EntityType.POWERUP_RAPID;
        color = '#ef4444'; // Red Powerup
        width = 60;
        height = 60;
    } else if (typeRoll > 0.92) {
        type = EntityType.POWERUP_TRIPLE;
        color = '#22c55e'; // Green Powerup
        width = 60;
        height = 60;
    } else if (typeRoll > 0.75) {
        type = EntityType.COIN;
        color = '#eab308'; // Gold
        width = 50;
        height = 50;
    } else if (typeRoll > 0.60) {
        type = EntityType.OBSTACLE_ASTEROID; // New destructible
        color = '#78716c'; // Stone Grey
        width = 180;
        height = 150;
        // Asteroids can spawn more centrally to block paths
    } else if (typeRoll > 0.50) {
        type = EntityType.OBSTACLE_RING;
        color = '#f97316'; // Orange
        width = 160;
        height = 160;
    }

    // Ensure obstacles are reachable: reduced X range
    const xPos = randomRange(-SPAWN_X_RANGE, SPAWN_X_RANGE);
    
    entitiesRef.current.push({
      id: Date.now() + Math.random(),
      x: xPos,
      y: yPos,
      z: SPAWN_Z,
      type,
      color,
      width,
      height,
      active: true,
      rotation: Math.random() * Math.PI * 2,
      speedZ: type === EntityType.OBSTACLE_CUBE ? 1 : 1
    });
  };

  const createExplosion = (x: number, y: number, z: number, color: string, count: number) => {
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        x, y, z,
        vx: randomRange(-20, 20),
        vy: randomRange(-20, 20),
        vz: randomRange(-10, 30),
        life: 1.0,
        maxLife: 1.0,
        color: color,
        size: randomRange(5, 25)
      });
    }
  };

  const addFloatingText = (text: string, color: string, x: number, y: number, z: number) => {
    floatingTextsRef.current.push({
      id: Math.random(),
      x, y, z,
      text,
      color,
      life: 1.0,
      velocity: -2 // floats up
    });
  };

  const addShake = (amount: number) => {
    shakeRef.current = amount;
  };

  // Main Loop
  const update = useCallback((canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
    // 1. Logic Update
    if (gameState === GameState.PLAYING) {
      frameCountRef.current++;
      
      // Speed Increase
      if (speedRef.current < MAX_SPEED) {
        speedRef.current += SPEED_INCREMENT;
      }
      
      // Score
      scoreRef.current += Math.floor(speedRef.current / 5);

      // Player Movement
      const p = playerPosRef.current;
      const t = targetPosRef.current;
      const dx = t.x - p.x;
      const dy = t.y - p.y;
      p.x += dx * PLAYER_SPEED_SMOOTHING;
      p.y += dy * PLAYER_SPEED_SMOOTHING;
      p.tilt += (dx * -0.002 - p.tilt) * 0.1;

      // Clamp Player Y to avoid going under virtual floor
      if (p.y > VIRTUAL_FLOOR_Y - 50) p.y = VIRTUAL_FLOOR_Y - 50;
      if (p.y < -VIRTUAL_FLOOR_Y + 50) p.y = -VIRTUAL_FLOOR_Y + 50;

      // Powerup Timers
      if (hasShieldRef.current) {
        shieldTimeRef.current--;
        if (shieldTimeRef.current <= 0) {
          hasShieldRef.current = false;
          addFloatingText("SHIELD DOWN", "#ffffff", p.x, p.y - 100, p.z);
        }
      }
      if (hasMagnetRef.current) {
        magnetTimeRef.current--;
        if (magnetTimeRef.current <= 0) hasMagnetRef.current = false;
      }
      if (hasRapidFireRef.current) {
        rapidFireTimeRef.current--;
        if (rapidFireTimeRef.current <= 0) hasRapidFireRef.current = false;
      }
      if (hasTripleShotRef.current) {
        tripleShotTimeRef.current--;
        if (tripleShotTimeRef.current <= 0) hasTripleShotRef.current = false;
      }

      // Spawn
      if (frameCountRef.current % Math.floor(600 / speedRef.current) === 0) {
        spawnEntity();
      }

      // Update Lasers
      for (let i = lasersRef.current.length - 1; i >= 0; i--) {
        const laser = lasersRef.current[i];
        laser.z += LASER_SPEED;
        
        // Remove if too far
        if (laser.z > SPAWN_Z) {
            laser.active = false;
        }

        // Laser Collisions with Asteroids
        if (laser.active) {
            for (const ent of entitiesRef.current) {
                if (!ent.active || ent.type !== EntityType.OBSTACLE_ASTEROID) continue;
                
                // Simple 3D box check
                if (Math.abs(laser.z - ent.z) < 100 && 
                    Math.abs(laser.x - ent.x) < ent.width && 
                    Math.abs(laser.y - ent.y) < ent.height) {
                    
                    // Hit!
                    ent.active = false;
                    laser.active = false;
                    createExplosion(ent.x, ent.y, ent.z, '#a8a29e', 15);
                    scoreRef.current += ASTEROID_SCORE;
                    addFloatingText(`+${ASTEROID_SCORE}`, '#ffffff', ent.x, ent.y, ent.z);
                    break;
                }
            }
        }
      }
      lasersRef.current = lasersRef.current.filter(l => l.active);

      // Update Entities
      for (let i = entitiesRef.current.length - 1; i >= 0; i--) {
        const ent = entitiesRef.current[i];
        ent.z -= speedRef.current;
        if (ent.rotation !== undefined) ent.rotation += 0.05;

        // Magnet Logic
        if (hasMagnetRef.current && ent.type === EntityType.COIN && ent.z < 1500) {
            const dx = p.x - ent.x;
            const dy = p.y - ent.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < MAGNET_RANGE) {
                ent.x += dx * 0.1;
                ent.y += dy * 0.1;
                ent.z -= 10; // Pull closer faster
            }
        }

        // Collision Check
        if (ent.z < NEAR_Z + 50 && ent.z > NEAR_Z - 50 && ent.active) {
            const xDist = Math.abs(ent.x - p.x);
            const yDist = Math.abs(ent.y - p.y);
            
            // Hitbox tuning
            let hitScale = OBSTACLE_HIT_BOX_SCALE;
            if (ent.type === EntityType.COIN || ent.type.includes('POWERUP') || ent.type === EntityType.SHIELD || ent.type === EntityType.MAGNET) {
                hitScale = COIN_HIT_BOX_SCALE;
            }

            const hitDist = (ent.width / 2 + 30) * hitScale; 

            if (xDist < hitDist && yDist < hitDist) {
                if (ent.type === EntityType.COIN) {
                    onCoinCollected();
                    coinsSessionRef.current++;
                    ent.active = false;
                    addFloatingText("+1 COIN", "#fcd34d", ent.x, ent.y, ent.z);
                } else if (ent.type === EntityType.SHIELD) {
                    hasShieldRef.current = true;
                    shieldTimeRef.current = SHIELD_DURATION;
                    ent.active = false;
                    addFloatingText("SHIELD ACTIVE", "#0ea5e9", p.x, p.y - 50, p.z);
                } else if (ent.type === EntityType.MAGNET) {
                    hasMagnetRef.current = true;
                    magnetTimeRef.current = MAGNET_DURATION;
                    ent.active = false;
                    addFloatingText("MAGNET ON", "#a855f7", p.x, p.y - 50, p.z);
                } else if (ent.type === EntityType.POWERUP_RAPID) {
                    hasRapidFireRef.current = true;
                    rapidFireTimeRef.current = RAPID_FIRE_DURATION;
                    ent.active = false;
                    addFloatingText("RAPID FIRE", "#ef4444", p.x, p.y - 50, p.z);
                } else if (ent.type === EntityType.POWERUP_TRIPLE) {
                    hasTripleShotRef.current = true;
                    tripleShotTimeRef.current = TRIPLE_SHOT_DURATION;
                    ent.active = false;
                    addFloatingText("TRIPLE SHOT", "#22c55e", p.x, p.y - 50, p.z);
                } else {
                    // Obstacle (Cube, Ring, Asteroid)
                    if (hasShieldRef.current) {
                        hasShieldRef.current = false;
                        createExplosion(ent.x, ent.y, ent.z, ent.color, 10);
                        ent.active = false;
                        addShake(10);
                        addFloatingText("SHIELD BROKEN", "#ef4444", p.x, p.y - 50, p.z);
                    } else {
                        // Game Over
                        createExplosion(p.x, p.y, p.z, skin.color, 50);
                        addShake(30);
                        onGameOver(scoreRef.current, coinsSessionRef.current);
                        return; // Stop logic loop
                    }
                }
            }
        }

        if (ent.z < -FOCAL_LENGTH) {
            ent.active = false;
        }
      }
      entitiesRef.current = entitiesRef.current.filter(e => e.active);
    }

    // Screen Shake Decay
    if (shakeRef.current > 0) {
        shakeRef.current *= 0.9;
        if (shakeRef.current < 0.5) shakeRef.current = 0;
    }

    // 2. Rendering
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Camera Shake
    ctx.save();
    if (shakeRef.current > 0) {
        const dx = (Math.random() - 0.5) * shakeRef.current;
        const dy = (Math.random() - 0.5) * shakeRef.current;
        ctx.translate(dx, dy);
    }

    // Gradient Sky
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#0f172a'); 
    gradient.addColorStop(1, '#334155'); 
    ctx.fillStyle = gradient;
    ctx.fillRect(-20, -20, canvas.width + 40, canvas.height + 40); // Overdraw for shake

    // Grid (Pseudo-3D Floor)
    const gridOffset = (frameCountRef.current * speedRef.current) % 500;
    
    // Floor Plane
    ctx.save();
    ctx.beginPath();
    const floorGradient = ctx.createLinearGradient(0, canvas.height/2, 0, canvas.height);
    floorGradient.addColorStop(0, 'rgba(15, 23, 42, 0)');
    floorGradient.addColorStop(1, 'rgba(30, 41, 59, 0.5)');
    ctx.fillStyle = floorGradient;
    ctx.fillRect(0, canvas.height/2, canvas.width, canvas.height/2);

    // Grid Lines (Horizontal)
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let z = 0; z < SPAWN_Z; z += 500) {
       const renderZ = z - gridOffset;
       if (renderZ < 10) continue;
       const p1 = project(-3000, VIRTUAL_FLOOR_Y, renderZ, canvas.width, canvas.height);
       const p2 = project(3000, VIRTUAL_FLOOR_Y, renderZ, canvas.width, canvas.height);
       ctx.moveTo(p1.x, p1.y);
       ctx.lineTo(p2.x, p2.y);
    }
    // Grid Lines (Vertical/Perspective)
    for (let x = -2000; x <= 2000; x += 500) {
        const pStart = project(x, VIRTUAL_FLOOR_Y, 1, canvas.width, canvas.height);
        const pEnd = project(x, VIRTUAL_FLOOR_Y, SPAWN_Z, canvas.width, canvas.height);
        ctx.moveTo(pStart.x, pStart.y);
        ctx.lineTo(pEnd.x, pEnd.y);
    }
    ctx.stroke();
    ctx.restore();

    // SORTING: Render Shadows first, then objects back-to-front
    const allEntities = [...entitiesRef.current, ...lasersRef.current];
    allEntities.sort((a, b) => b.z - a.z);

    // --- DRAW SHADOWS ---
    ctx.save();
    entitiesRef.current.forEach(ent => {
        if (ent.z < SPAWN_Z) {
            const { x, y, scale } = project(ent.x, VIRTUAL_FLOOR_Y, ent.z, canvas.width, canvas.height);
            const w = ent.width * scale * 1.2;
            const h = ent.width * scale * 0.3;

            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.beginPath();
            ctx.ellipse(x, y, w/2, h/2, 0, 0, Math.PI * 2);
            ctx.fill();

            // Guideline
            if (ent.z < 1500) {
                const objPos = project(ent.x, ent.y, ent.z, canvas.width, canvas.height);
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(objPos.x, objPos.y);
                ctx.stroke();
            }
        }
    });

    // Player Shadow
    if (gameState === GameState.PLAYING) {
        const p = playerPosRef.current;
        const { x, y, scale } = project(p.x, VIRTUAL_FLOOR_Y, p.z, canvas.width, canvas.height);
        const w = 120 * scale;
        const h = 40 * scale;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.beginPath();
        ctx.ellipse(x, y, w/2, h/2, 0, 0, Math.PI * 2);
        ctx.fill();
        
        const pObj = project(p.x, p.y, p.z, canvas.width, canvas.height);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(pObj.x, pObj.y);
        ctx.stroke();
    }
    ctx.restore();

    // --- DRAW ENTITIES ---
    allEntities.forEach(ent => {
        const { x, y, scale } = project(ent.x, ent.y, ent.z, canvas.width, canvas.height);
        const w = ent.width * scale;
        const h = ent.height * scale;

        ctx.save();
        ctx.translate(x, y);
        if (ent.rotation && ent.type !== EntityType.LASER) ctx.rotate(ent.rotation);
        
        if (ent.type === EntityType.LASER) {
             ctx.fillStyle = ent.color;
             ctx.shadowBlur = 10;
             ctx.shadowColor = ent.color;
             // Draw Laser as a glowing line/beam
             ctx.fillRect(-w/4, -h*2, w/2, h*4);
             ctx.shadowBlur = 0;
        } else if (ent.type === EntityType.OBSTACLE_ASTEROID) {
            ctx.fillStyle = ent.color;
            ctx.beginPath();
            const jaggedness = 5;
            for(let i=0; i<jaggedness*2; i++){
                const angle = (Math.PI * 2 * i) / (jaggedness*2);
                const r = (i % 2 === 0 ? w/2 : w/2.5);
                ctx.lineTo(Math.cos(angle)*r, Math.sin(angle)*r);
            }
            ctx.closePath();
            ctx.fill();
            // Cracks detail
            ctx.strokeStyle = '#57534e';
            ctx.lineWidth = 2 * scale;
            ctx.stroke();

        } else if (ent.type === EntityType.OBSTACLE_CUBE) {
            ctx.fillStyle = ent.color;
            ctx.strokeStyle = '#7f1d1d';
            ctx.lineWidth = 4 * scale;
            ctx.fillRect(-w/2, -h/2, w, h);
            ctx.strokeRect(-w/2, -h/2, w, h);
            
            ctx.beginPath();
            ctx.moveTo(-w/2, -h/2); ctx.lineTo(w/2, h/2);
            ctx.moveTo(w/2, -h/2); ctx.lineTo(-w/2, h/2);
            ctx.stroke();

        } else if (ent.type === EntityType.OBSTACLE_RING) {
             ctx.beginPath();
             const spikes = 8;
             for(let i=0; i<spikes*2; i++){
                const r = i%2===0 ? w/2 : w/2 + 20*scale;
                const a = (Math.PI*2 * i) / (spikes*2);
                ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r);
             }
             ctx.closePath();
             ctx.fillStyle = '#c2410c';
             ctx.fill();
             
             ctx.globalCompositeOperation = 'destination-out';
             ctx.beginPath();
             ctx.arc(0, 0, w/3, 0, Math.PI * 2);
             ctx.fill();
             ctx.globalCompositeOperation = 'source-over';
             
             ctx.strokeStyle = ent.color;
             ctx.lineWidth = 5 * scale;
             ctx.stroke();

        } else if (ent.type === EntityType.COIN) {
            ctx.shadowColor = ent.color;
            ctx.shadowBlur = 20;
            ctx.beginPath();
            ctx.arc(0, 0, w/2, 0, Math.PI * 2);
            ctx.fillStyle = ent.color;
            ctx.fill();
            ctx.strokeStyle = '#fffbeb';
            ctx.lineWidth = 3 * scale;
            ctx.stroke();
            ctx.shadowBlur = 0;
            
            ctx.fillStyle = '#fffbeb';
            ctx.font = `bold ${Math.floor(25*scale)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('$', 0, 0);

        } else if (ent.type === EntityType.SHIELD) {
            ctx.shadowColor = '#38bdf8';
            ctx.shadowBlur = 15;
            ctx.beginPath();
            ctx.arc(0, 0, w/2, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(56, 189, 248, 0.8)';
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3 * scale;
            ctx.stroke();
            ctx.shadowBlur = 0;
            
            ctx.fillStyle = 'white';
            ctx.font = `bold ${Math.floor(20*scale)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('S', 0, 0);
        } else if (ent.type === EntityType.MAGNET) {
            ctx.shadowColor = '#a855f7';
            ctx.shadowBlur = 15;
            ctx.beginPath();
            ctx.arc(0, 0, w/2, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(168, 85, 247, 0.8)';
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3 * scale;
            ctx.stroke();
            ctx.shadowBlur = 0;

            ctx.fillStyle = 'white';
            ctx.font = `bold ${Math.floor(20*scale)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('M', 0, 0);
        } else if (ent.type === EntityType.POWERUP_RAPID) {
            ctx.shadowColor = '#ef4444';
            ctx.shadowBlur = 15;
            ctx.beginPath();
            ctx.arc(0, 0, w/2, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(239, 68, 68, 0.8)';
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3 * scale;
            ctx.stroke();
            
            ctx.fillStyle = 'white';
            ctx.font = `bold ${Math.floor(18*scale)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('RF', 0, 0);
        } else if (ent.type === EntityType.POWERUP_TRIPLE) {
            ctx.shadowColor = '#22c55e';
            ctx.shadowBlur = 15;
            ctx.beginPath();
            ctx.arc(0, 0, w/2, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(34, 197, 94, 0.8)';
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3 * scale;
            ctx.stroke();
            
            ctx.fillStyle = 'white';
            ctx.font = `bold ${Math.floor(18*scale)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('3X', 0, 0);
        }
        
        ctx.restore();
    });

    // 5. Draw Player
    if (gameState === GameState.PLAYING) {
        const p = playerPosRef.current;
        const { x: px, y: py, scale: pScale } = project(p.x, p.y, p.z, canvas.width, canvas.height);
        
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(p.tilt);
        
        const size = 100 * pScale;

        // Shield Effect
        if (hasShieldRef.current) {
             ctx.beginPath();
             ctx.arc(0, 0, size * 0.9, 0, Math.PI * 2);
             ctx.fillStyle = `rgba(14, 165, 233, ${0.2 + Math.sin(frameCountRef.current * 0.2) * 0.1})`;
             ctx.fill();
             ctx.strokeStyle = '#38bdf8';
             ctx.lineWidth = 3;
             ctx.stroke();
        }
        
        // Magnet Effect
        if (hasMagnetRef.current) {
            const magScale = (frameCountRef.current % 20) / 20;
            ctx.beginPath();
            ctx.arc(0, 0, size * (0.5 + magScale), 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(168, 85, 247, ${1 - magScale})`;
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Draw Specific Models
        if (skin.model === 'biplane') {
            // Biplane
            ctx.fillStyle = skin.color;
            ctx.fillRect(-size/1.5, -size/3, size*1.33, size/6);
            ctx.fillRect(-size/1.5, size/10, size*1.33, size/6);
            ctx.fillStyle = '#525252';
            ctx.fillRect(-size/2, -size/3, size/10, size/2);
            ctx.fillRect(size/2 - size/10, -size/3, size/10, size/2);
            ctx.fillStyle = skin.accent;
            ctx.beginPath();
            ctx.ellipse(0, 0, size/6, size/3, 0, 0, Math.PI*2);
            ctx.fill();
            ctx.fillStyle = skin.color;
            ctx.beginPath();
            ctx.moveTo(0, -size/3);
            ctx.lineTo(0, -size/1.8);
            ctx.lineTo(size/10, -size/3);
            ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.beginPath();
            ctx.arc(0, 0, size/2.5, 0, Math.PI*2);
            ctx.fill();

        } else if (skin.model === 'ufo') {
            // UFO
            ctx.fillStyle = '#60a5fa'; 
            ctx.beginPath();
            ctx.arc(0, -size/6, size/4, Math.PI, 0);
            ctx.fill();
            ctx.fillStyle = skin.color;
            ctx.beginPath();
            ctx.ellipse(0, 0, size/1.2, size/4, 0, 0, Math.PI*2);
            ctx.fill();
            ctx.fillStyle = skin.accent;
            for(let i=0; i<5; i++) {
                const lx = (i - 2) * (size/3);
                ctx.beginPath();
                ctx.arc(lx, size/8, size/12, 0, Math.PI*2);
                ctx.fill();
            }
             ctx.shadowBlur = 15;
             ctx.shadowColor = skin.accent;
             ctx.fillStyle = skin.accent;
             ctx.beginPath();
             ctx.ellipse(0, size/8, size/2, size/8, 0, 0, Math.PI*2);
             ctx.fill();
             ctx.shadowBlur = 0;

        } else {
            // Jet (Default)
            ctx.fillStyle = skin.color;
            ctx.beginPath();
            ctx.moveTo(0, -size/3);
            ctx.lineTo(size/5, size/3);
            ctx.lineTo(-size/5, size/3);
            ctx.fill();
            ctx.fillStyle = skin.accent;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(size/1.1, size/4);
            ctx.lineTo(size/1.1, size/2.5);
            ctx.lineTo(0, size/3);
            ctx.fill(); 
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(-size/1.1, size/4);
            ctx.lineTo(-size/1.1, size/2.5);
            ctx.lineTo(0, size/3);
            ctx.fill();
            ctx.fillStyle = skin.color;
            ctx.beginPath();
            ctx.moveTo(0, -size/3);
            ctx.lineTo(0, -size/1.5);
            ctx.lineTo(size/8, -size/3);
            ctx.fill();
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#f59e0b';
            ctx.fillStyle = '#f59e0b';
            ctx.beginPath();
            ctx.arc(0, size/3, size/8, 0, Math.PI*2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }

        ctx.restore();
    }

    // 6. Draw Particles
    particlesRef.current.forEach(pt => {
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.z += pt.vz;
        pt.life -= 0.02;
    });
    particlesRef.current = particlesRef.current.filter(pt => pt.life > 0);
    
    particlesRef.current.forEach(pt => {
        const { x, y, scale } = project(pt.x, pt.y, pt.z, canvas.width, canvas.height);
        if (pt.z > -FOCAL_LENGTH) {
            ctx.globalAlpha = pt.life;
            ctx.fillStyle = pt.color;
            ctx.beginPath();
            ctx.arc(x, y, pt.size * scale, 0, Math.PI*2);
            ctx.fill();
            ctx.globalAlpha = 1.0;
        }
    });

    // 7. Draw Floating Texts
    floatingTextsRef.current.forEach(ft => {
        ft.y += ft.velocity;
        ft.life -= 0.015;
    });
    floatingTextsRef.current = floatingTextsRef.current.filter(ft => ft.life > 0);

    ctx.restore(); // Restore shake context
    
    floatingTextsRef.current.forEach(ft => {
        const { x, y, scale } = project(ft.x, ft.y, ft.z, canvas.width, canvas.height);
        ctx.font = `bold ${Math.floor(20 * scale)}px monospace`;
        ctx.fillStyle = ft.color;
        ctx.globalAlpha = Math.max(0, ft.life);
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 3;
        ctx.strokeText(ft.text, x, y);
        ctx.fillText(ft.text, x, y);
        ctx.globalAlpha = 1.0;
    });

    // 8. HUD
    if (gameState === GameState.PLAYING) {
        ctx.font = 'bold 24px monospace';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.fillText(`SCORE: ${scoreRef.current}`, 20, 40);
        
        ctx.fillStyle = '#fcd34d';
        ctx.fillText(`COINS: ${coinsSessionRef.current}`, 20, 70);
        
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`SPEED: ${(speedRef.current * 10).toFixed(0)} km/h`, 20, 100);

        // Powerup Status
        let statusY = 140;
        if (hasShieldRef.current) {
            ctx.fillStyle = '#0ea5e9';
            const w = (shieldTimeRef.current / SHIELD_DURATION) * 100;
            ctx.fillRect(20, statusY, w, 10);
            ctx.fillText('SHIELD', 20, statusY - 5);
            statusY += 40;
        }
        if (hasMagnetRef.current) {
            ctx.fillStyle = '#a855f7';
            const w = (magnetTimeRef.current / MAGNET_DURATION) * 100;
            ctx.fillRect(20, statusY, w, 10);
            ctx.fillText('MAGNET', 20, statusY - 5);
            statusY += 40;
        }
        if (hasRapidFireRef.current) {
            ctx.fillStyle = '#ef4444';
            const w = (rapidFireTimeRef.current / RAPID_FIRE_DURATION) * 100;
            ctx.fillRect(20, statusY, w, 10);
            ctx.fillText('RAPID FIRE', 20, statusY - 5);
            statusY += 40;
        }
        if (hasTripleShotRef.current) {
            ctx.fillStyle = '#22c55e';
            const w = (tripleShotTimeRef.current / TRIPLE_SHOT_DURATION) * 100;
            ctx.fillRect(20, statusY, w, 10);
            ctx.fillText('TRIPLE SHOT', 20, statusY - 5);
            statusY += 40;
        }
    }

  }, [gameState, skin, onCoinCollected, onGameOver, fireLaser]);

  // Main Loop Trigger
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false }); 
    if (!ctx) return;

    const loop = () => {
      update(canvas, ctx);
      if (gameState === GameState.PLAYING || gameState === GameState.MENU || gameState === GameState.GAME_OVER) {
         requestRef.current = requestAnimationFrame(loop);
      }
    };
    
    requestRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(requestRef.current);
  }, [update, gameState]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
        if (canvasRef.current) {
            canvasRef.current.width = window.innerWidth;
            canvasRef.current.height = window.innerHeight;
        }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Reset Game Logic
  useEffect(() => {
    if (gameState === GameState.PLAYING) {
        entitiesRef.current = [];
        particlesRef.current = [];
        floatingTextsRef.current = [];
        lasersRef.current = [];
        scoreRef.current = 0;
        coinsSessionRef.current = 0;
        speedRef.current = INITIAL_SPEED;
        frameCountRef.current = 0;
        hasShieldRef.current = false;
        hasMagnetRef.current = false;
        hasRapidFireRef.current = false;
        hasTripleShotRef.current = false;
        shakeRef.current = 0;
        playerPosRef.current = { x: 0, y: 0, z: NEAR_Z, tilt: 0 };
        targetPosRef.current = { x: 0, y: 0 };
    }
  }, [gameState]);

  return (
    <>
      <canvas 
        ref={canvasRef}
        onPointerMove={handlePointerMove}
        className="absolute top-0 left-0 w-full h-full cursor-none touch-none"
      />
      {gameState === GameState.PLAYING && (
        <button
          className="absolute bottom-8 right-8 w-24 h-24 bg-red-600/80 rounded-full border-4 border-red-400 text-white font-black text-xl shadow-[0_0_20px_rgba(239,68,68,0.6)] active:scale-95 active:bg-red-500 transition-transform z-30 flex items-center justify-center md:hidden"
          onClick={(e) => { e.stopPropagation(); fireLaser(); }}
        >
          FIRE
        </button>
      )}
    </>
  );
};

export default GameCanvas;