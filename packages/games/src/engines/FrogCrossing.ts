/**
 * Frog Crossing -- Frogger clone implementing GameBridge.
 *
 * Pure vanilla TypeScript. No React, no DOM dependencies beyond canvas.
 * Score = rows crossed (10 pts each) + frog home (50 pts).
 * Death = hit by vehicle, fall in water (not on log/turtle), or time out.
 * Controls: Arrow keys to hop.
 */

import type { GameBridge, GameBridgeCallbacks } from '@review-arcade/shared';

// Constants
const CELL = 32;
const LANE_COUNT = 12; // safe-zone(1), road(5), safe(1), river(4), home(1)
const HOP_COOLDOWN = 120; // ms

// Colors (RCNR brand)
const COLORS = {
  bg: '#0A1628',
  safe: '#0D2818',
  road: '#1A1A2E',
  road_line: '#2A2A3E',
  water: '#0A2040',
  water_wave: '#0D2850',
  home: '#0D3020',
  home_pad: '#22C55E',
  frog: '#22C55E',
  frog_eye: '#fff',
  car1: '#EF4444',
  car2: '#3B82F6',
  car3: '#F5A623',
  car4: '#A855F7',
  truck: '#F97316',
  log: '#8B6914',
  log_dark: '#6B4F10',
  turtle: '#228888',
  text: '#99d9d9',
};

interface Lane {
  type: 'safe' | 'road' | 'river' | 'home';
  objects: LaneObject[];
  speed: number;
  direction: 1 | -1;
}

interface LaneObject {
  x: number;
  width: number;
  color: string;
  variant: string;
}

export class FrogCrossingEngine implements GameBridge {
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private callbacks!: GameBridgeCallbacks;

  private cols = 0;
  private frogX = 0;
  private frogY = 0;
  private lanes: Lane[] = [];
  private homeSlots: boolean[] = [];
  private score = 0;
  private frogsHome = 0;
  private maxRowReached = 0;
  private running = false;
  private paused = false;
  private gameOver = false;
  private animFrame = 0;
  private lastHop = 0;
  private frameCount = 0;

  private boundKeyHandler: ((e: KeyboardEvent) => void) | null = null;

  mount(canvas: HTMLCanvasElement, callbacks: GameBridgeCallbacks): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.callbacks = callbacks;
    this.cols = Math.floor(canvas.width / CELL);
    this.reset();
    this.render();

    this.boundKeyHandler = this.handleKeyDown.bind(this);
    window.addEventListener('keydown', this.boundKeyHandler);
  }

  start(): void {
    if (this.gameOver) this.reset();
    this.running = true;
    this.paused = false;
    this.gameLoop();
  }

  pause(): void {
    this.paused = true;
    this.running = false;
    if (this.animFrame) {
      cancelAnimationFrame(this.animFrame);
      this.animFrame = 0;
    }
  }

  resume(comebackStartScore: number): void {
    this.reset();
    this.score = comebackStartScore;
    this.running = true;
    this.paused = false;
    this.gameLoop();
  }

  destroy(): void {
    this.running = false;
    if (this.animFrame) {
      cancelAnimationFrame(this.animFrame);
      this.animFrame = 0;
    }
    if (this.boundKeyHandler) {
      window.removeEventListener('keydown', this.boundKeyHandler);
      this.boundKeyHandler = null;
    }
  }

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.cols = Math.floor(width / CELL);
    this.render();
  }

  // --- Private ---

  private reset(): void {
    this.gameOver = false;
    this.score = 0;
    this.frogsHome = 0;
    this.maxRowReached = 0;
    this.frameCount = 0;
    this.homeSlots = [false, false, false, false, false];

    // Place frog at bottom center
    this.frogX = Math.floor(this.cols / 2) * CELL;
    this.frogY = (LANE_COUNT - 1) * CELL;

    this.buildLanes();
    this.render();
  }

  private buildLanes(): void {
    const w = this.canvas.width;
    this.lanes = [];

    // Row 0 = home (top)
    this.lanes.push({ type: 'home', objects: [], speed: 0, direction: 1 });

    // Rows 1-4 = river
    const riverSpeeds = [1.2, -0.9, 1.5, -1.1];
    const riverTypes = ['log', 'turtle', 'log', 'turtle'];
    for (let i = 0; i < 4; i++) {
      const objects: LaneObject[] = [];
      const speed = Math.abs(riverSpeeds[i]);
      const dir = riverSpeeds[i] > 0 ? 1 : -1;
      const objWidth = riverTypes[i] === 'log' ? CELL * 3 : CELL * 2;
      const spacing = CELL * 4 + Math.random() * CELL * 2;

      for (let x = 0; x < w + spacing; x += objWidth + spacing) {
        objects.push({
          x,
          width: objWidth,
          color: riverTypes[i] === 'log' ? COLORS.log : COLORS.turtle,
          variant: riverTypes[i],
        });
      }
      this.lanes.push({ type: 'river', objects, speed, direction: dir as 1 | -1 });
    }

    // Row 5 = safe zone (median)
    this.lanes.push({ type: 'safe', objects: [], speed: 0, direction: 1 });

    // Rows 6-10 = road
    const carSpeeds = [1.5, -1.2, 2.0, -1.8, 1.0];
    const carColors = [COLORS.car1, COLORS.car2, COLORS.car3, COLORS.truck, COLORS.car4];
    const carWidths = [CELL * 1.5, CELL * 1.5, CELL * 1.5, CELL * 2.5, CELL * 1.5];

    for (let i = 0; i < 5; i++) {
      const objects: LaneObject[] = [];
      const speed = Math.abs(carSpeeds[i]);
      const dir = carSpeeds[i] > 0 ? 1 : -1;
      const spacing = CELL * 3 + Math.random() * CELL * 3;

      for (let x = 0; x < w + spacing; x += carWidths[i] + spacing) {
        objects.push({
          x: x + Math.random() * CELL,
          width: carWidths[i],
          color: carColors[i],
          variant: 'car',
        });
      }
      this.lanes.push({ type: 'road', objects, speed, direction: dir as 1 | -1 });
    }

    // Row 11 = start safe zone (bottom)
    this.lanes.push({ type: 'safe', objects: [], speed: 0, direction: 1 });
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.running || this.paused || this.gameOver) return;

    const now = performance.now();
    if (now - this.lastHop < HOP_COOLDOWN) return;

    let dx = 0, dy = 0;
    switch (e.key) {
      case 'ArrowUp': case 'w': case 'W': dy = -CELL; break;
      case 'ArrowDown': case 's': case 'S': dy = CELL; break;
      case 'ArrowLeft': case 'a': case 'A': dx = -CELL; break;
      case 'ArrowRight': case 'd': case 'D': dx = CELL; break;
      default: return;
    }

    e.preventDefault();
    const newX = this.frogX + dx;
    const newY = this.frogY + dy;

    // Bounds check
    if (newX < 0 || newX >= this.cols * CELL || newY < 0 || newY >= LANE_COUNT * CELL) return;

    this.frogX = newX;
    this.frogY = newY;
    this.lastHop = now;

    // Score for moving forward
    const row = Math.floor(this.frogY / CELL);
    const rowsFromStart = LANE_COUNT - 1 - row;
    if (rowsFromStart > this.maxRowReached) {
      this.score += 10;
      this.maxRowReached = rowsFromStart;
      this.callbacks.onScoreUpdate(this.score);
    }

    // Check if reached home
    if (row === 0) {
      this.reachHome();
    }
  }

  private reachHome(): void {
    // Find nearest home slot
    const slotSpacing = this.cols * CELL / 5;
    let nearestSlot = 0;
    let minDist = Infinity;
    for (let i = 0; i < 5; i++) {
      const slotX = slotSpacing * (i + 0.5) - CELL / 2;
      const dist = Math.abs(this.frogX - slotX);
      if (dist < minDist) {
        minDist = dist;
        nearestSlot = i;
      }
    }

    if (minDist < CELL * 1.5 && !this.homeSlots[nearestSlot]) {
      this.homeSlots[nearestSlot] = true;
      this.frogsHome++;
      this.score += 50;
      this.callbacks.onScoreUpdate(this.score);

      if (this.frogsHome >= 5) {
        this.callbacks.onSpecialEvent({
          type: 'all_home',
          score: this.score,
        });
        // Reset home slots for next round
        this.homeSlots = [false, false, false, false, false];
        this.frogsHome = 0;
      }
    } else if (this.homeSlots[nearestSlot] || minDist >= CELL * 1.5) {
      // Missed or already filled -- die
      this.die();
      return;
    }

    // Reset frog to start
    this.frogX = Math.floor(this.cols / 2) * CELL;
    this.frogY = (LANE_COUNT - 1) * CELL;
    this.maxRowReached = 0;
  }

  private gameLoop(): void {
    if (!this.running || this.paused || this.gameOver) return;
    this.frameCount++;
    this.update();
    this.render();
    this.animFrame = requestAnimationFrame(() => this.gameLoop());
  }

  private update(): void {
    const w = this.canvas.width;

    // Move lane objects
    for (const lane of this.lanes) {
      for (const obj of lane.objects) {
        obj.x += lane.speed * lane.direction;

        // Wrap around
        if (lane.direction > 0 && obj.x > w + 20) {
          obj.x = -obj.width - 20;
        } else if (lane.direction < 0 && obj.x + obj.width < -20) {
          obj.x = w + 20;
        }
      }
    }

    // Collision detection
    const row = Math.floor(this.frogY / CELL);
    if (row < 0 || row >= this.lanes.length) return;
    const lane = this.lanes[row];
    const frogLeft = this.frogX + 4;
    const frogRight = this.frogX + CELL - 4;

    if (lane.type === 'road') {
      // Hit by car?
      for (const obj of lane.objects) {
        if (frogRight > obj.x && frogLeft < obj.x + obj.width) {
          this.die();
          return;
        }
      }
    } else if (lane.type === 'river') {
      // Must be on a log/turtle
      let onPlatform = false;
      for (const obj of lane.objects) {
        if (frogRight > obj.x + 4 && frogLeft < obj.x + obj.width - 4) {
          onPlatform = true;
          // Ride with the platform
          this.frogX += lane.speed * lane.direction;
          break;
        }
      }
      if (!onPlatform) {
        this.die();
        return;
      }

      // Swept off screen?
      if (this.frogX < -CELL || this.frogX > w + CELL) {
        this.die();
        return;
      }
    }
  }

  private die(): void {
    this.gameOver = true;
    this.running = false;
    if (this.animFrame) {
      cancelAnimationFrame(this.animFrame);
      this.animFrame = 0;
    }

    this.renderDeathFlash();
    this.callbacks.onDeath(this.score, {
      frogs_home: this.frogsHome,
      max_row: this.maxRowReached,
      game: 'frog-crossing',
    });
  }

  // --- Rendering ---

  private render(): void {
    const { ctx } = this;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Background
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, w, h);

    // Draw each lane
    for (let i = 0; i < this.lanes.length; i++) {
      const lane = this.lanes[i];
      const y = i * CELL;

      // Lane background
      switch (lane.type) {
        case 'safe':
          ctx.fillStyle = COLORS.safe;
          ctx.fillRect(0, y, w, CELL);
          break;
        case 'road':
          ctx.fillStyle = COLORS.road;
          ctx.fillRect(0, y, w, CELL);
          // Road lines
          ctx.strokeStyle = COLORS.road_line;
          ctx.lineWidth = 1;
          ctx.setLineDash([8, 8]);
          ctx.beginPath();
          ctx.moveTo(0, y + CELL / 2);
          ctx.lineTo(w, y + CELL / 2);
          ctx.stroke();
          ctx.setLineDash([]);
          break;
        case 'river':
          ctx.fillStyle = COLORS.water;
          ctx.fillRect(0, y, w, CELL);
          // Wave lines
          ctx.strokeStyle = COLORS.water_wave;
          ctx.lineWidth = 1;
          for (let wx = 0; wx < w; wx += 20) {
            const waveOffset = Math.sin((wx + this.frameCount * 0.5) * 0.1) * 2;
            ctx.beginPath();
            ctx.moveTo(wx, y + CELL / 2 + waveOffset);
            ctx.lineTo(wx + 10, y + CELL / 2 - waveOffset);
            ctx.stroke();
          }
          break;
        case 'home':
          ctx.fillStyle = COLORS.home;
          ctx.fillRect(0, y, w, CELL);
          // Home pads
          const slotSpacing = w / 5;
          for (let s = 0; s < 5; s++) {
            const sx = slotSpacing * (s + 0.5) - CELL / 2;
            ctx.fillStyle = this.homeSlots[s] ? COLORS.home_pad : 'rgba(34, 197, 94, 0.2)';
            ctx.fillRect(sx, y + 4, CELL, CELL - 8);
          }
          break;
      }

      // Lane objects
      for (const obj of lane.objects) {
        if (obj.variant === 'log') {
          ctx.fillStyle = COLORS.log;
          ctx.fillRect(obj.x, y + 3, obj.width, CELL - 6);
          ctx.fillStyle = COLORS.log_dark;
          ctx.fillRect(obj.x + 3, y + 5, 4, CELL - 10);
          ctx.fillRect(obj.x + obj.width - 7, y + 5, 4, CELL - 10);
        } else if (obj.variant === 'turtle') {
          ctx.fillStyle = COLORS.turtle;
          const turtleCount = Math.floor(obj.width / (CELL * 0.8));
          for (let t = 0; t < turtleCount; t++) {
            const tx = obj.x + t * CELL * 0.8;
            ctx.beginPath();
            ctx.ellipse(tx + CELL * 0.4, y + CELL / 2, CELL * 0.35, CELL * 0.35, 0, 0, Math.PI * 2);
            ctx.fill();
          }
        } else {
          // Cars/trucks
          ctx.fillStyle = obj.color;
          const radius = 4;
          ctx.beginPath();
          ctx.moveTo(obj.x + radius, y + 5);
          ctx.lineTo(obj.x + obj.width - radius, y + 5);
          ctx.quadraticCurveTo(obj.x + obj.width, y + 5, obj.x + obj.width, y + 5 + radius);
          ctx.lineTo(obj.x + obj.width, y + CELL - 5 - radius);
          ctx.quadraticCurveTo(obj.x + obj.width, y + CELL - 5, obj.x + obj.width - radius, y + CELL - 5);
          ctx.lineTo(obj.x + radius, y + CELL - 5);
          ctx.quadraticCurveTo(obj.x, y + CELL - 5, obj.x, y + CELL - 5 - radius);
          ctx.lineTo(obj.x, y + 5 + radius);
          ctx.quadraticCurveTo(obj.x, y + 5, obj.x + radius, y + 5);
          ctx.fill();
          // Windshield
          ctx.fillStyle = 'rgba(150, 220, 255, 0.4)';
          ctx.fillRect(obj.x + obj.width - 12, y + 8, 8, CELL - 16);
        }
      }
    }

    // Frog
    this.renderFrog();

    // Game over overlay
    if (this.gameOver) {
      ctx.fillStyle = 'rgba(0, 12, 23, 0.6)';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = COLORS.text;
      ctx.font = 'bold 24px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Answering question...', w / 2, h / 2);
    }
  }

  private renderFrog(): void {
    const { ctx } = this;
    const x = this.frogX + CELL / 2;
    const y = this.frogY + CELL / 2;

    // Body
    ctx.fillStyle = COLORS.frog;
    ctx.beginPath();
    ctx.ellipse(x, y, CELL * 0.35, CELL * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = COLORS.frog_eye;
    ctx.beginPath();
    ctx.arc(x - 6, y - 8, 4, 0, Math.PI * 2);
    ctx.arc(x + 6, y - 8, 4, 0, Math.PI * 2);
    ctx.fill();

    // Pupils
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(x - 6, y - 8, 2, 0, Math.PI * 2);
    ctx.arc(x + 6, y - 8, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  private renderDeathFlash(): void {
    const { ctx } = this;
    ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    setTimeout(() => this.render(), 200);
  }
}
