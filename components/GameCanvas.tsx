
import React, { useRef, useEffect, useCallback, useState } from 'react';
import { 
  GameState, 
  Entity, 
  EntityType, 
  Particle,
  PlaneSkin,
  FloatingText,
  FloatingTextType
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
  PLAYABLE_WIDTH,
  SPAWN_RANGE_X,
  LASER_SPEED,
  LASER_COOLDOWN_DEFAULT,
  LASER_COOLDOWN_RAPID,
  ASTEROID_SCORE,
  ASTEROID_HP_SMALL,
  ASTEROID_HP_LARGE
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
  const isCrashingRef = useRef(false);
  const isFiringRef = useRef(false); // Track if user is holding input
  
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
  const shakeRef = useRef(0); 
  
  // Player Position
  const playerPosRef = useRef({ x: 0, y: 0, z: NEAR_Z - 50, tilt: 0 }); // Player sits behind collision plane
  const targetPosRef = useRef({ x: 0, y: 0 });

  // Input Handling
  const handlePointerDown = useCallback(() => {
    isFiringRef.current = true;
  }, []);

  const handlePointerUp = useCallback(() => {
    isFiringRef.current = false;
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (gameState !== GameState.PLAYING) return;
    if (isCrashingRef.current) return;
    
    // Auto-fire is active while moving mouse or touching
    if (e.buttons > 0 || e.pointerType === 'touch') {
        isFiringRef.current = true;
    } else {
        isFiringRef.current = false;
    }
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const scale = FOCAL_LENGTH / (FOCAL_LENGTH + NEAR_Z);
    
    // CORRIDOR LOGIC: Clamp the input to the playable width
    let worldX = (x - centerX) / scale;
    if (worldX > PLAYABLE_WIDTH) worldX = PLAYABLE_WIDTH;
    if (worldX < -PLAYABLE_WIDTH) worldX = -PLAYABLE_WIDTH;

    const worldY = (y - centerY) / scale;

    targetPosRef.current = { x: worldX, y: worldY };
  }, [gameState]);

  const fireLaser = useCallback(() => {
    if (gameState !== GameState.PLAYING || isCrashingRef.current) return;

    const cooldown = hasRapidFireRef.current ? LASER_COOLDOWN_RAPID : LASER_COOLDOWN_DEFAULT;
    if (frameCountRef.current - lastShotFrameRef.current < cooldown) return;

    lastShotFrameRef.current = frameCountRef.current;
    const p = playerPosRef.current;

    const spawnLaser = (offsetX: number, vx: number) => {
      lasersRef.current.push({
        id: Math.random(),
        x: p.x + offsetX,
        y: p.y,
        z: p.z + 50,
        type: EntityType.LASER,
        width: 30, // Thicker lasers
        height: 30,
        color: hasRapidFireRef.current ? '#f43f5e' : '#22d3ee', // Neon Red or Neon Cyan
        active: true,
        vx: vx
      });
    };

    // Center Shot
    spawnLaser(0, 0);

    // Triple Shot - Fixed mechanics to have lateral velocity
    if (hasTripleShotRef.current) {
        // Left shot (moves left as it goes forward)
        spawnLaser(-40, -10);
        // Right shot (moves right as it goes forward)
        spawnLaser(40, 10);
    }
  }, [gameState]);

  // Spawning Logic
  const spawnEntity = () => {
    const typeRoll = Math.random();
    let type = EntityType.OBSTACLE_CUBE;
    let color = '#ef4444'; 
    let width = 120; // Increased base width for visibility
    let height = 120;
    let hp = 1;
    
    // Use random height but keep it somewhat centered vertically
    let yPos = randomRange(-350, 350);

    if (typeRoll > 0.98) {
        type = EntityType.SHIELD;
        color = '#38bdf8'; 
        width = 100;
        height = 100;
    } else if (typeRoll > 0.96) {
        type = EntityType.MAGNET;
        color = '#c084fc'; 
        width = 100;
        height = 100;
    } else if (typeRoll > 0.94) {
        type = EntityType.POWERUP_RAPID;
        color = '#f43f5e'; 
        width = 100;
        height = 100;
    } else if (typeRoll > 0.92) {
        type = EntityType.POWERUP_TRIPLE;
        color = '#4ade80'; 
        width = 100;
        height = 100;
    } else if (typeRoll > 0.75) {
        type = EntityType.COIN;
        color = '#facc15'; 
        width = 120; // HUGE coin gates
        height = 120;
    } else if (typeRoll > 0.60) {
        type = EntityType.OBSTACLE_ASTEROID; 
        color = '#57534e'; 
        width = 250; 
        height = 200;
        hp = ASTEROID_HP_LARGE; // Large asteroids take more hits
    } else if (typeRoll > 0.50) {
        type = EntityType.OBSTACLE_ASTEROID; // More asteroids, less rings for farming
        color = '#57534e';
        width = 160;
        height = 140;
        hp = ASTEROID_HP_SMALL;
    }

    // CORRIDOR LOGIC: Spawn strictly inside the SPAWN RANGE (narrower than Playable)
    // ensuring objects are always reachable and don't clip walls.
    const safeSpawnWidth = SPAWN_RANGE_X - (width / 2);
    const xPos = randomRange(-safeSpawnWidth, safeSpawnWidth);
    
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
      speedZ: type === EntityType.OBSTACLE_CUBE ? 1 : 1,
      hp: hp,
      maxHp: hp
    });
  };

  const createExplosion = (x: number, y: number, z: number, color: string, count: number, size: number = 20) => {
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        x, y, z,
        vx: randomRange(-50, 50),
        vy: randomRange(-50, 50),
        vz: randomRange(-20, 80),
        life: 1.0,
        maxLife: 1.0,
        color: color,
        size: randomRange(5, size)
      });
    }
  };

  const spawnLootCoin = (x: number, y: number, z: number) => {
      entitiesRef.current.push({
          id: Math.random(),
          x, y, z,
          type: EntityType.COIN,
          width: 80,
          height: 80,
          color: '#facc15',
          active: true,
          autoCollect: true // Loot coins automatically fly to player
      });
  };

  const addFloatingText = (text: string, color: string, x: number, y: number, z: number, type: FloatingTextType = FloatingTextType.SCORE) => {
    floatingTextsRef.current.push({
      id: Math.random(),
      x, y, z,
      text,
      color,
      life: 1.0,
      velocity: type === FloatingTextType.SCORE ? -5 : -1, // Score floats up faster
      type
    });
  };

  const addShake = (amount: number) => {
    shakeRef.current = amount;
  };

  // Main Loop
  const update = useCallback((canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
    // 1. Logic Update
    if (gameState === GameState.PLAYING) {
      if (!isCrashingRef.current) {
        frameCountRef.current++;
        
        // AUTO FIRE CHECK
        if (isFiringRef.current) {
            fireLaser();
        }

        if (speedRef.current < MAX_SPEED) {
          speedRef.current += SPEED_INCREMENT;
        }
        
        scoreRef.current += Math.floor(speedRef.current / 5);
      } else {
        // Slow motion effect during crash
        speedRef.current *= 0.90;
      }

      // Player Movement
      const p = playerPosRef.current;
      const t = targetPosRef.current;
      
      if (!isCrashingRef.current) {
        const dx = t.x - p.x;
        const dy = t.y - p.y;
        p.x += dx * PLAYER_SPEED_SMOOTHING;
        p.y += dy * PLAYER_SPEED_SMOOTHING;
        
        if (p.y > VIRTUAL_FLOOR_Y - 50) p.y = VIRTUAL_FLOOR_Y - 50;
        if (p.y < -VIRTUAL_FLOOR_Y + 50) p.y = -VIRTUAL_FLOOR_Y + 50;
        
        // Ensure player stays in bounds
        if (p.x > PLAYABLE_WIDTH) p.x = PLAYABLE_WIDTH;
        if (p.x < -PLAYABLE_WIDTH) p.x = -PLAYABLE_WIDTH;

        p.tilt += (dx * -0.003 - p.tilt) * 0.15;
      }

      // Powerup Timers
      if (!isCrashingRef.current) {
        if (hasShieldRef.current) {
          shieldTimeRef.current--;
          if (shieldTimeRef.current <= 0) {
            hasShieldRef.current = false;
            addFloatingText("SHIELD DOWN", "#ffffff", 0, 0, 0, FloatingTextType.NOTIFICATION);
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

        const spawnRate = Math.max(10, Math.floor(500 / speedRef.current));
        if (frameCountRef.current % spawnRate === 0) {
          spawnEntity();
        }
      }

      // Update Lasers
      for (let i = lasersRef.current.length - 1; i >= 0; i--) {
        const laser = lasersRef.current[i];
        laser.z += LASER_SPEED;
        if (laser.vx) laser.x += laser.vx; // Handle lateral bullet movement (Triple Shot)
        
        if (laser.z > SPAWN_Z) {
            laser.active = false;
        }

        if (laser.active && !isCrashingRef.current) {
            for (const ent of entitiesRef.current) {
                if (!ent.active || ent.type !== EntityType.OBSTACLE_ASTEROID) continue;
                
                if (Math.abs(laser.z - ent.z) < 150 && 
                    Math.abs(laser.x - ent.x) < ent.width && 
                    Math.abs(laser.y - ent.y) < ent.height) {
                    
                    laser.active = false;
                    
                    // Hit logic
                    ent.hp = (ent.hp || 1) - 1;
                    
                    // Spark Effect
                    createExplosion(ent.x, ent.y, ent.z, '#22d3ee', 5, 10);
                    
                    if (ent.hp <= 0) {
                        // Destroyed
                        ent.active = false;
                        createExplosion(ent.x, ent.y, ent.z, '#fcd34d', 20, 30);
                        createExplosion(ent.x, ent.y, ent.z, '#ef4444', 10, 20);
                        
                        scoreRef.current += ASTEROID_SCORE;
                        addFloatingText(`+${ASTEROID_SCORE}`, '#fcd34d', ent.x, ent.y, ent.z, FloatingTextType.SCORE);
                        addShake(5);
                        
                        // SPAWN LOOT
                        spawnLootCoin(ent.x, ent.y, ent.z);
                    } else {
                        // Flash white on hit logic would go here in rendering
                        addShake(2);
                    }
                    
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
        if (ent.rotation !== undefined) ent.rotation += 0.03;

        // Magnet Logic (Normal Magnet OR AutoCollect Loot)
        const isAutoLoot = ent.type === EntityType.COIN && ent.autoCollect;
        if ((hasMagnetRef.current || isAutoLoot) && ent.type === EntityType.COIN && ent.z < 2000 && !isCrashingRef.current) {
            const dx = p.x - ent.x;
            const dy = p.y - ent.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            // AutoLoot has infinite range, normal magnet has fixed range
            if (isAutoLoot || dist < MAGNET_RANGE) {
                const pullStrength = isAutoLoot ? 0.25 : 0.15; // Auto loot is faster
                ent.x += dx * pullStrength;
                ent.y += dy * pullStrength;
                ent.z -= 25; // Pull closer in Z too
            }
        }

        // Collision Check
        if (ent.z < NEAR_Z + 100 && ent.z > NEAR_Z - 50 && ent.active && !isCrashingRef.current) {
            const xDist = Math.abs(ent.x - p.x);
            const yDist = Math.abs(ent.y - p.y);
            
            let hitScale = OBSTACLE_HIT_BOX_SCALE;
            if (ent.type === EntityType.COIN || ent.type.includes('POWERUP') || ent.type === EntityType.SHIELD || ent.type === EntityType.MAGNET) {
                hitScale = COIN_HIT_BOX_SCALE;
            }

            if (xDist < (ent.width/2 + 20) * hitScale && yDist < (ent.height/2 + 20) * hitScale) {
                if (ent.type === EntityType.COIN) {
                    onCoinCollected();
                    coinsSessionRef.current++;
                    ent.active = false;
                    addFloatingText("+1", "#fcd34d", ent.x, ent.y, ent.z, FloatingTextType.SCORE);
                } else if (ent.type === EntityType.SHIELD) {
                    hasShieldRef.current = true;
                    shieldTimeRef.current = SHIELD_DURATION;
                    ent.active = false;
                    addFloatingText("SHIELD ACTIVE", "#0ea5e9", 0, 0, 0, FloatingTextType.NOTIFICATION);
                } else if (ent.type === EntityType.MAGNET) {
                    hasMagnetRef.current = true;
                    magnetTimeRef.current = MAGNET_DURATION;
                    ent.active = false;
                    addFloatingText("MAGNET ACTIVE", "#c084fc", 0, 0, 0, FloatingTextType.NOTIFICATION);
                } else if (ent.type === EntityType.POWERUP_RAPID) {
                    hasRapidFireRef.current = true;
                    rapidFireTimeRef.current = RAPID_FIRE_DURATION;
                    ent.active = false;
                    addFloatingText("RAPID FIRE", "#f43f5e", 0, 0, 0, FloatingTextType.NOTIFICATION);
                } else if (ent.type === EntityType.POWERUP_TRIPLE) {
                    hasTripleShotRef.current = true;
                    tripleShotTimeRef.current = TRIPLE_SHOT_DURATION;
                    ent.active = false;
                    addFloatingText("TRIPLE SHOT", "#4ade80", 0, 0, 0, FloatingTextType.NOTIFICATION);
                } else {
                    // Impact
                    if (hasShieldRef.current) {
                        hasShieldRef.current = false;
                        createExplosion(ent.x, ent.y, ent.z, ent.color, 15);
                        ent.active = false;
                        addShake(15);
                        addFloatingText("BLOCKED", "#38bdf8", ent.x, ent.y, ent.z, FloatingTextType.SCORE);
                        addFloatingText("SHIELD BROKEN", "#ef4444", 0, 0, 0, FloatingTextType.NOTIFICATION);
                    } else {
                        // CRASH SEQUENCE START
                        isCrashingRef.current = true;
                        createExplosion(p.x, p.y, p.z, skin.color, 60);
                        addShake(40);
                        // Trigger slow mo then game over
                        setTimeout(() => {
                           onGameOver(scoreRef.current, coinsSessionRef.current);
                        }, 800); 
                    }
                }
            }
        }

        // Cleanup
        if (ent.z < -FOCAL_LENGTH) {
            ent.active = false;
        }
      }
      entitiesRef.current = entitiesRef.current.filter(e => e.active);
    }

    if (shakeRef.current > 0) {
        shakeRef.current *= 0.9;
        if (shakeRef.current < 0.5) shakeRef.current = 0;
    }

    // --- 2. RENDERING ---
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    if (shakeRef.current > 0) {
        const dx = (Math.random() - 0.5) * shakeRef.current;
        const dy = (Math.random() - 0.5) * shakeRef.current;
        ctx.translate(dx, dy);
    }

    // BG
    const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bgGrad.addColorStop(0, '#020617'); 
    bgGrad.addColorStop(1, '#2e1065'); 
    ctx.fillStyle = bgGrad;
    ctx.fillRect(-20, -20, canvas.width + 40, canvas.height + 40);

    // Sun
    ctx.save();
    const sunY = canvas.height / 2 - 50;
    const sunGrad = ctx.createLinearGradient(0, sunY - 100, 0, sunY + 100);
    sunGrad.addColorStop(0, '#f59e0b');
    sunGrad.addColorStop(1, '#db2777');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(canvas.width / 2, sunY, 150, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2e1065';
    for(let i=0; i<10; i++) {
        ctx.fillRect(canvas.width/2 - 160, sunY + 20 + (i*12), 320, 4 + (i*0.5));
    }
    ctx.restore();

    // GRID
    const gridOffset = (frameCountRef.current * speedRef.current) % 400;
    
    const drawLine = (xWorld: number, color: string, width: number, glow: boolean) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        if (glow) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = color;
        } else {
            ctx.shadowBlur = 0;
        }
        
        ctx.beginPath();
        const pStart = project(xWorld, VIRTUAL_FLOOR_Y, 1, canvas.width, canvas.height);
        const pEnd = project(xWorld, VIRTUAL_FLOOR_Y, SPAWN_Z, canvas.width, canvas.height);
        ctx.moveTo(pStart.x, pStart.y);
        ctx.lineTo(pEnd.x, pEnd.y);
        ctx.stroke();
        ctx.shadowBlur = 0; 
    };

    // Playable Area Borders
    drawLine(-PLAYABLE_WIDTH, '#d946ef', 4, true); 
    drawLine(PLAYABLE_WIDTH, '#d946ef', 4, true);

    // Spawn Area Markers (Subtle) to show where items might be
    drawLine(-SPAWN_RANGE_X, 'rgba(217, 70, 239, 0.2)', 1, false);
    drawLine(SPAWN_RANGE_X, 'rgba(217, 70, 239, 0.2)', 1, false);

    ctx.setLineDash([20, 20]);
    drawLine(0, 'rgba(6, 182, 212, 0.3)', 2, false); 
    ctx.setLineDash([]);

    ctx.strokeStyle = 'rgba(217, 70, 239, 0.4)'; 
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let z = 0; z < SPAWN_Z; z += 400) {
       const renderZ = z - gridOffset;
       if (renderZ < 10) continue;
       const p1 = project(-PLAYABLE_WIDTH * 1.5, VIRTUAL_FLOOR_Y, renderZ, canvas.width, canvas.height);
       const p2 = project(PLAYABLE_WIDTH * 1.5, VIRTUAL_FLOOR_Y, renderZ, canvas.width, canvas.height);
       ctx.moveTo(p1.x, p1.y);
       ctx.lineTo(p2.x, p2.y);
    }
    ctx.stroke();

    // ENTITIES
    const allEntities = [...entitiesRef.current, ...lasersRef.current];
    allEntities.sort((a, b) => b.z - a.z);

    // Draw Shadows & ANCHOR LINES first
    allEntities.forEach(ent => {
        if (!ent.active) return;
        
        // Fading logic for things getting too close or behind
        let alpha = 1.0;
        if (ent.z < NEAR_Z + 100) {
             alpha = (ent.z - (NEAR_Z - 50)) / 150; // Fade out as it passes collision point
             if (alpha < 0) alpha = 0;
        }
        
        ctx.globalAlpha = alpha;

        const { x, y, scale } = project(ent.x, ent.y, ent.z, canvas.width, canvas.height);
        
        // GROUND ANCHOR LINE (Crucial for aiming)
        // Project the point on the floor directly below the object
        const floorP = project(ent.x, VIRTUAL_FLOOR_Y, ent.z, canvas.width, canvas.height);

        // Only draw anchor for gameplay objects
        if (ent.type !== EntityType.LASER) {
            ctx.beginPath();
            ctx.strokeStyle = ent.color;
            ctx.lineWidth = 1;
            ctx.globalAlpha = alpha * 0.5; // Faint line
            ctx.moveTo(x, y);
            ctx.lineTo(floorP.x, floorP.y);
            ctx.stroke();
            
            // Floor Spot
            ctx.beginPath();
            ctx.fillStyle = ent.color;
            ctx.arc(floorP.x, floorP.y, 5 * scale, 0, Math.PI*2);
            ctx.fill();
        }

        ctx.globalAlpha = 1.0;
    });

    // Draw Objects
    allEntities.forEach(ent => {
        if (!ent.active) return;
        
        let alpha = 1.0;
        if (ent.z < NEAR_Z + 100) {
             alpha = (ent.z - (NEAR_Z - 50)) / 150;
             if (alpha < 0) alpha = 0;
        }
        ctx.globalAlpha = alpha;

        const { x, y, scale } = project(ent.x, ent.y, ent.z, canvas.width, canvas.height);
        const w = ent.width * scale;
        const h = ent.height * scale;

        ctx.save();
        ctx.translate(x, y);
        if (ent.rotation && ent.type !== EntityType.LASER) ctx.rotate(ent.rotation);
        
        ctx.shadowBlur = 10;
        ctx.shadowColor = ent.color;

        if (ent.type === EntityType.LASER) {
             ctx.fillStyle = ent.color;
             ctx.shadowBlur = 20;
             ctx.fillRect(-w/2, -h*2, w, h*4);
             ctx.fillStyle = '#ffffff';
             ctx.fillRect(-w/4, -h*1.5, w/2, h*3);

        } else if (ent.type === EntityType.OBSTACLE_ASTEROID) {
            // "Cracked Neon" Asteroid Style
            const isHit = (ent.maxHp && ent.hp && ent.hp < ent.maxHp);
            
            // Core
            ctx.fillStyle = '#1e1b4b'; // Dark blue/black core
            ctx.strokeStyle = isHit ? '#f87171' : '#f472b6'; // Red if damaged, Pink default
            ctx.lineWidth = 3 * scale;
            ctx.shadowBlur = 15;
            ctx.shadowColor = ctx.strokeStyle;
            
            ctx.beginPath();
            const jaggedness = 7;
            for(let i=0; i<jaggedness*2; i++){
                const angle = (Math.PI * 2 * i) / (jaggedness*2);
                const r = (i % 2 === 0 ? w/2 : w/2.2);
                ctx.lineTo(Math.cos(angle)*r, Math.sin(angle)*r);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Internal Cracks/Neon Pulse
            ctx.beginPath();
            ctx.strokeStyle = isHit ? '#ef4444' : '#c084fc';
            ctx.lineWidth = 1 * scale;
            ctx.moveTo(-w/4, -h/4); ctx.lineTo(0, 0); ctx.lineTo(w/4, -h/6);
            ctx.moveTo(w/4, h/4); ctx.lineTo(0, h/6);
            ctx.stroke();
            
            // HP Bar for big ones
            if (ent.maxHp && ent.maxHp > 1) {
                const barW = w * 0.8;
                ctx.fillStyle = 'black';
                ctx.fillRect(-barW/2, -h/1.2, barW, 6*scale);
                ctx.fillStyle = '#ef4444';
                const hpPct = (ent.hp || 0) / ent.maxHp;
                ctx.fillRect(-barW/2, -h/1.2, barW * hpPct, 6*scale);
            }

        } else if (ent.type === EntityType.OBSTACLE_CUBE) {
            // Tech Obstacles
            ctx.strokeStyle = ent.color;
            ctx.lineWidth = 4 * scale;
            ctx.fillStyle = 'rgba(239, 68, 68, 0.3)'; // Red tint inside
            ctx.fillRect(-w/2, -h/2, w, h);
            ctx.strokeRect(-w/2, -h/2, w, h);
            // Cross
            ctx.beginPath();
            ctx.moveTo(-w/2, -h/2); ctx.lineTo(w/2, h/2);
            ctx.moveTo(w/2, -h/2); ctx.lineTo(-w/2, h/2);
            ctx.stroke();

        } else if (ent.type === EntityType.OBSTACLE_RING) {
             ctx.beginPath();
             ctx.arc(0, 0, w/2, 0, Math.PI * 2);
             ctx.strokeStyle = ent.color;
             ctx.lineWidth = 8 * scale;
             ctx.stroke();
             // Danger Spikes
             const spikes = 6;
             ctx.beginPath();
             for(let i=0; i<spikes; i++){
                const a = (Math.PI*2 * i) / spikes;
                const ox = Math.cos(a) * w/1.5;
                const oy = Math.sin(a) * w/1.5;
                const ix = Math.cos(a) * w/2;
                const iy = Math.sin(a) * w/2;
                ctx.moveTo(ix, iy);
                ctx.lineTo(ox, oy);
             }
             ctx.stroke();

        } else if (ent.type === EntityType.COIN) {
            // GIANT HOLOGRAPHIC GATE
            ctx.shadowBlur = 20;
            ctx.strokeStyle = ent.color;
            ctx.lineWidth = 6 * scale;
            ctx.beginPath();
            ctx.arc(0, 0, w/2, 0, Math.PI * 2);
            ctx.stroke();

            // Inner fill (inviting)
            ctx.fillStyle = 'rgba(250, 204, 21, 0.2)'; 
            ctx.fill();
            
            ctx.fillStyle = '#fffbeb';
            ctx.font = `bold ${Math.floor(40*scale)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.shadowBlur = 0;
            ctx.fillText('$', 0, 0);
        
        } else if (ent.type.includes('POWERUP') || ent.type === EntityType.SHIELD || ent.type === EntityType.MAGNET) {
            ctx.shadowBlur = 25;
            ctx.fillStyle = ent.color;
            ctx.globalAlpha = alpha * 0.9;
            ctx.beginPath();
            ctx.arc(0, 0, w/2, 0, Math.PI * 2);
            ctx.fill();
            
            // Outer Ring
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 3 * scale;
            ctx.stroke();
            
            ctx.shadowBlur = 0;
            ctx.fillStyle = 'white';
            ctx.font = `bold ${Math.floor(30*scale)}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            let label = '?';
            if (ent.type === EntityType.SHIELD) label = 'S';
            if (ent.type === EntityType.MAGNET) label = 'M';
            if (ent.type === EntityType.POWERUP_RAPID) label = 'RF';
            if (ent.type === EntityType.POWERUP_TRIPLE) label = '3X';
            
            ctx.fillText(label, 0, 0);
        }
        
        ctx.restore();
        ctx.globalAlpha = 1.0;
    });

    // Player Rendering
    if (gameState === GameState.PLAYING) {
        const p = playerPosRef.current;
        const { x: px, y: py, scale: pScale } = project(p.x, p.y, p.z, canvas.width, canvas.height);
        
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(p.tilt);
        
        // GLITCH EFFECT
        if (isCrashingRef.current && shakeRef.current > 5) {
             const jx = (Math.random() - 0.5) * 20;
             const jy = (Math.random() - 0.5) * 20;
             ctx.translate(jx, jy);
             
             ctx.globalCompositeOperation = 'screen';
             ctx.fillStyle = 'rgba(255, 0, 255, 0.5)';
             ctx.fillRect(-50*pScale, -20*pScale, 100*pScale, 40*pScale);
             ctx.fillStyle = 'rgba(0, 255, 255, 0.5)';
             ctx.fillRect(-45*pScale, -15*pScale, 100*pScale, 40*pScale);
             ctx.globalCompositeOperation = 'source-over';
        }

        const size = 100 * pScale;
        
        // Shadow on Floor
        const pFloor = project(p.x, VIRTUAL_FLOOR_Y, p.z, canvas.width, canvas.height);
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0); 
        ctx.fillStyle = skin.accent;
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.ellipse(pFloor.x, pFloor.y, 40 * pScale, 10 * pScale, 0, 0, Math.PI*2);
        ctx.fill();
        ctx.beginPath();
        ctx.strokeStyle = skin.accent;
        ctx.lineWidth = 1;
        ctx.moveTo(px, py);
        ctx.lineTo(pFloor.x, pFloor.y);
        ctx.stroke();
        ctx.restore();

        // Engine Trail
        ctx.shadowBlur = 20;
        ctx.shadowColor = skin.accent;
        ctx.fillStyle = skin.accent;
        ctx.beginPath();
        ctx.moveTo(-size/4, size/3);
        ctx.lineTo(0, size + (Math.random() * size)); 
        ctx.lineTo(size/4, size/3);
        ctx.fill();

        // Skin Render
        ctx.shadowBlur = 15;
        ctx.shadowColor = skin.color;
        
        if (skin.model === 'biplane') {
            ctx.fillStyle = skin.color;
            ctx.fillRect(-size/1.5, -size/3, size*1.33, size/6);
            ctx.fillRect(-size/1.5, size/10, size*1.33, size/6);
            ctx.fillStyle = '#cbd5e1'; 
            ctx.fillRect(-size/2, -size/3, size/10, size/2);
            ctx.fillRect(size/2 - size/10, -size/3, size/10, size/2);
            ctx.fillStyle = 'white';
            ctx.globalAlpha = 0.6;
            ctx.beginPath();
            ctx.arc(0, -size/2.5, size/2.5, 0, Math.PI*2);
            ctx.fill();
        } else if (skin.model === 'ufo') {
            ctx.fillStyle = skin.color;
            ctx.beginPath();
            ctx.ellipse(0, 0, size/1.2, size/4, 0, 0, Math.PI*2);
            ctx.fill();
            ctx.fillStyle = skin.accent; 
            ctx.beginPath();
            ctx.arc(0, -size/8, size/3, Math.PI, 0);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            for(let i=0; i<3; i++) {
                ctx.beginPath();
                ctx.arc((i-1)*size/2, size/8, size/12, 0, Math.PI*2);
                ctx.fill();
            }
        } else {
            ctx.fillStyle = skin.color;
            ctx.beginPath();
            ctx.moveTo(0, -size/2);
            ctx.lineTo(size, size/2);
            ctx.lineTo(-size, size/2);
            ctx.fill();
            ctx.fillStyle = '#e2e8f0';
            ctx.beginPath();
            ctx.moveTo(0, -size/1.5);
            ctx.lineTo(size/6, size/2);
            ctx.lineTo(-size/6, size/2);
            ctx.fill();
            ctx.fillStyle = skin.accent;
            ctx.beginPath();
            ctx.moveTo(0, -size/4);
            ctx.lineTo(size/8, size/8);
            ctx.lineTo(-size/8, size/8);
            ctx.fill();
        }
        
        // Shield
        if (hasShieldRef.current) {
             ctx.beginPath();
             ctx.arc(0, 0, size * 1.1, 0, Math.PI * 2);
             ctx.strokeStyle = '#38bdf8';
             ctx.lineWidth = 3;
             ctx.shadowBlur = 10;
             ctx.shadowColor = '#0ea5e9';
             ctx.stroke();
             ctx.fillStyle = 'rgba(56, 189, 248, 0.05)';
             ctx.fill();
        }
        
        ctx.restore();

        // SMART RETICLE
        // Check if there is an enemy roughly in front of the player
        const aimZ = p.z + 1500;
        let hasTarget = false;
        
        // Simple raycast approximation
        for(const ent of entitiesRef.current) {
            if(ent.active && ent.type === EntityType.OBSTACLE_ASTEROID && ent.z > p.z + 200 && ent.z < aimZ) {
                if(Math.abs(ent.x - p.x) < ent.width) {
                    hasTarget = true;
                    break;
                }
            }
        }

        const { x: rx, y: ry } = project(p.x, p.y, p.z + 800, canvas.width, canvas.height);
        
        ctx.save();
        ctx.strokeStyle = hasTarget ? '#ef4444' : 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = hasTarget ? 4 : 2;
        if(hasTarget) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#ef4444';
        }

        ctx.beginPath();
        // Crosshair shape
        const rSize = hasTarget ? 15 : 10;
        ctx.moveTo(rx - rSize, ry); ctx.lineTo(rx + rSize, ry);
        ctx.moveTo(rx, ry - rSize); ctx.lineTo(rx, ry + rSize);
        ctx.stroke();

        // Circle around if target
        if(hasTarget) {
             ctx.beginPath();
             ctx.arc(rx, ry, rSize * 1.5, 0, Math.PI*2);
             ctx.stroke();
        }

        ctx.restore();
    }

    // PARTICLES
    particlesRef.current.forEach(pt => {
        const { x, y, scale } = project(pt.x, pt.y, pt.z, canvas.width, canvas.height);
        if (pt.z > -FOCAL_LENGTH && pt.life > 0) {
            ctx.globalAlpha = pt.life;
            ctx.fillStyle = pt.color;
            ctx.shadowBlur = 10;
            ctx.shadowColor = pt.color;
            ctx.beginPath();
            ctx.arc(x, y, pt.size * scale, 0, Math.PI*2);
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1.0;
        }
    });

    // FLOATING TEXT
    floatingTextsRef.current.forEach((ft, index) => {
        if (ft.type === FloatingTextType.SCORE) {
            const { x, y, scale } = project(ft.x, ft.y, ft.z, canvas.width, canvas.height);
            ctx.font = `900 ${Math.floor(24 * scale)}px sans-serif`; 
            ctx.fillStyle = ft.color;
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 4;
            ctx.globalAlpha = Math.max(0, ft.life);
            
            ctx.strokeText(ft.text, x, y);
            ctx.fillText(ft.text, x, y);
            ctx.globalAlpha = 1.0;
            
            ft.life -= 0.02;
            ft.y += ft.velocity;
            
            if (ft.life <= 0) floatingTextsRef.current.splice(index, 1);
        }
    });
    
    // NOTIFICATIONS
    const notifications = floatingTextsRef.current.filter(ft => ft.type === FloatingTextType.NOTIFICATION);
    notifications.forEach((notif, i) => {
        const yPos = 120 + (i * 30);
        const xPos = canvas.width / 2;
        
        ctx.textAlign = 'center';
        ctx.font = 'bold 20px sans-serif';
        ctx.globalAlpha = Math.max(0, notif.life);
        
        ctx.shadowBlur = 4;
        ctx.shadowColor = 'black';
        ctx.fillStyle = notif.color;
        ctx.fillText(notif.text, xPos, yPos);
        
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1.0;

        notif.life -= 0.015;
        if (notif.life <= 0) {
            const idx = floatingTextsRef.current.indexOf(notif);
            if (idx > -1) floatingTextsRef.current.splice(idx, 1);
        }
    });

    ctx.restore();

    // HUD
    if (gameState === GameState.PLAYING) {
        ctx.font = 'bold 24px monospace';
        ctx.textAlign = 'left';
        ctx.shadowColor = 'black';
        ctx.shadowBlur = 4;

        ctx.fillStyle = '#ffffff';
        ctx.fillText(`SCORE: ${scoreRef.current}`, 20, 40);
        
        ctx.fillStyle = '#fcd34d';
        ctx.fillText(`COINS: ${coinsSessionRef.current}`, 20, 70);
        
        const speedKmh = (speedRef.current * 10).toFixed(0);
        const speedScale = 1 + (speedRef.current / MAX_SPEED) * 0.2;
        ctx.save();
        ctx.translate(20, 100);
        ctx.scale(speedScale, speedScale);
        ctx.fillStyle = '#22d3ee';
        ctx.fillText(`SPEED: ${speedKmh} KM/H`, 0, 0);
        ctx.restore();

        ctx.shadowBlur = 0;

        let statusY = 140;
        const drawBar = (label: string, time: number, max: number, color: string) => {
            if (time <= 0) return;
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(20, statusY, 150, 16);
            ctx.fillStyle = color;
            const w = (time / max) * 150;
            ctx.fillRect(20, statusY, w, 16);
            ctx.fillStyle = 'white';
            ctx.font = 'bold 12px sans-serif';
            ctx.fillText(label, 25, statusY + 12);
            statusY += 25;
        };

        drawBar('SHIELD', shieldTimeRef.current, SHIELD_DURATION, '#0ea5e9');
        drawBar('MAGNET', magnetTimeRef.current, MAGNET_DURATION, '#a855f7');
        drawBar('RAPID FIRE', rapidFireTimeRef.current, RAPID_FIRE_DURATION, '#f43f5e');
        drawBar('TRIPLE SHOT', tripleShotTimeRef.current, TRIPLE_SHOT_DURATION, '#4ade80');
    }

  }, [gameState, skin, onCoinCollected, onGameOver, fireLaser]);

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
        isCrashingRef.current = false;
        isFiringRef.current = false;
        playerPosRef.current = { x: 0, y: 0, z: NEAR_Z - 50, tilt: 0 };
        targetPosRef.current = { x: 0, y: 0 };
    }
  }, [gameState]);

  return (
    <>
      <canvas 
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onPointerMove={handlePointerMove}
        className="absolute top-0 left-0 w-full h-full cursor-none touch-none bg-black"
      />
      {/* 
        REMOVED: Old Fire Button 
        REASON: We now use "Hold to Fire" on the entire screen, rendering the button obsolete and confusing.
      */}
    </>
  );
};

export default GameCanvas;
