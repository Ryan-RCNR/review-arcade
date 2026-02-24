/**
 * Rhythm Rush -- Geometry Dash-inspired auto-scrolling platformer implementing GameBridge.
 *
 * Pure vanilla TypeScript. No React, no DOM dependencies beyond canvas.
 * Score = distance traveled (increments every frame).
 * Death = collision with obstacle (spike, block, saw).
 * Controls: Space/Click to jump (hold for higher jump). Extreme death rate.
 */

import type { GameBridge, GameBridgeCallbacks } from '@review-arcade/shared';

// Physics
const GRAVITY = 0.6;
const JUMP_FORCE = -10;
const GROUND_Y_OFFSET = 80;
const PLAYER_SIZE = 24;
const INITIAL_SPEED = 4;
const MAX_SPEED = 9;
const SPEED_INCREMENT = 0.001;

// Colors (RCNR brand)
const COLORS = {
  bg: '#0A1628',
  ground: '#0D1E33',
  ground_top: '#1A3044',
  player: '#99d9d9',
  player_trail: 'rgba(153, 217, 217, 0.2)',
  spike: '#EF4444',
  block: '#F97316',
  saw: '#A855F7',
  portal: '#22D3EE',
  coin: '#FBBF24',
  text: '#99d9d9',
  bg_line: '#0D1E33',
};

type ObstacleType = 'spike' | 'block' | 'spike_double' | 'saw' | 'gap';

interface Obstacle {
  x: number;
  type: ObstacleType;
  width: number;
  height: number;
}

export class RhythmRushEngine implements GameBridge {
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private callbacks!: GameBridgeCallbacks;

  private groundY = 0;
  private playerX = 0;
  private playerY = 0;
  private playerVelocity = 0;
  private playerRotation = 0;
  private isGrounded = false;
  private speed = INITIAL_SPEED;
  private obstacles: Obstacle[] = [];
  private score = 0;
  private distance = 0;
  private running = false;
  private paused = false;
  private gameOver = false;
  private animFrame = 0;
  private frameCount = 0;
  private nextSpawnDist = 0;
  private trail: { x: number; y: number; alpha: number }[] = [];
  private bgLines: { x: number; y: number }[] = [];

  private jumpPressed = false;
  private boundKeyDown: ((e: KeyboardEvent) => void) | null = null;
  private boundKeyUp: ((e: KeyboardEvent) => void) | null = null;
  private boundClick: ((e: MouseEvent) => void) | null = null;
  private boundClickUp: ((e: MouseEvent) => void) | null = null;

  mount(canvas: HTMLCanvasElement, callbacks: GameBridgeCallbacks): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.callbacks = callbacks;
    this.groundY = canvas.height - GROUND_Y_OFFSET;
    this.generateBgLines();
    this.reset();
    this.render();

    this.boundKeyDown = this.handleKeyDown.bind(this);
    this.boundKeyUp = this.handleKeyUp.bind(this);
    this.boundClick = () => { this.jumpPressed = true; };
    this.boundClickUp = () => { this.jumpPressed = false; };
    window.addEventListener('keydown', this.boundKeyDown);
    window.addEventListener('keyup', this.boundKeyUp);
    canvas.addEventListener('mousedown', this.boundClick);
    canvas.addEventListener('mouseup', this.boundClickUp);
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
    this.distance = comebackStartScore;
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
    if (this.boundKeyDown) {
      window.removeEventListener('keydown', this.boundKeyDown);
      this.boundKeyDown = null;
    }
    if (this.boundKeyUp) {
      window.removeEventListener('keyup', this.boundKeyUp);
      this.boundKeyUp = null;
    }
    if (this.boundClick) {
      this.canvas.removeEventListener('mousedown', this.boundClick);
      this.boundClick = null;
    }
    if (this.boundClickUp) {
      this.canvas.removeEventListener('mouseup', this.boundClickUp);
      this.boundClickUp = null;
    }
  }

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.groundY = height - GROUND_Y_OFFSET;
    this.render();
  }

  // --- Private ---

  private generateBgLines(): void {
    this.bgLines = [];
    for (let i = 0; i < 15; i++) {
      this.bgLines.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
      });
    }
  }

  private reset(): void {
    this.gameOver = false;
    this.score = 0;
    this.distance = 0;
    this.speed = INITIAL_SPEED;
    this.playerX = 100;
    this.playerY = this.groundY - PLAYER_SIZE;
    this.playerVelocity = 0;
    this.playerRotation = 0;
    this.isGrounded = true;
    this.jumpPressed = false;
    this.obstacles = [];
    this.trail = [];
    this.frameCount = 0;
    this.nextSpawnDist = 300;
    this.render();
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
      e.preventDefault();
      this.jumpPressed = true;
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
      this.jumpPressed = false;
    }
  }

  private gameLoop(): void {
    if (!this.running || this.paused || this.gameOver) return;
    this.update();
    this.render();
    this.animFrame = requestAnimationFrame(() => this.gameLoop());
  }

  private update(): void {
    this.frameCount++;

    // Increase speed
    this.speed = Math.min(MAX_SPEED, INITIAL_SPEED + this.distance * SPEED_INCREMENT);
    this.distance += this.speed / 8;

    // Score
    const newScore = Math.floor(this.distance);
    if (newScore > this.score) {
      this.score = newScore;
      this.callbacks.onScoreUpdate(this.score);

      if (this.score > 0 && this.score % 100 === 0) {
        this.callbacks.onSpecialEvent({
          type: 'milestone',
          distance: this.score,
          score: this.score,
        });
      }
    }

    // Jump
    if (this.jumpPressed && this.isGrounded) {
      this.playerVelocity = JUMP_FORCE;
      this.isGrounded = false;
    }

    // Physics
    if (!this.isGrounded) {
      this.playerVelocity += GRAVITY;
      this.playerY += this.playerVelocity;
      this.playerRotation += this.speed * 0.04;

      // Land on ground
      if (this.playerY >= this.groundY - PLAYER_SIZE) {
        this.playerY = this.groundY - PLAYER_SIZE;
        this.playerVelocity = 0;
        this.isGrounded = true;
        this.playerRotation = Math.round(this.playerRotation / (Math.PI / 2)) * (Math.PI / 2);
      }
    }

    // Trail
    this.trail.push({ x: this.playerX, y: this.playerY + PLAYER_SIZE / 2, alpha: 0.5 });
    if (this.trail.length > 12) this.trail.shift();
    for (const t of this.trail) t.alpha *= 0.85;

    // Spawn obstacles
    this.nextSpawnDist -= this.speed;
    if (this.nextSpawnDist <= 0) {
      this.spawnObstacle();
      this.nextSpawnDist = 150 + Math.random() * 200;
    }

    // Move obstacles + collision
    const playerLeft = this.playerX + 4;
    const playerRight = this.playerX + PLAYER_SIZE - 4;
    const playerTop = this.playerY + 4;
    const playerBottom = this.playerY + PLAYER_SIZE - 4;

    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.x -= this.speed;

      if (obs.x + obs.width < -20) {
        this.obstacles.splice(i, 1);
        continue;
      }

      // Collision (different hitboxes per type)
      let hit = false;
      if (obs.type === 'gap') {
        // Gap: die if player is at ground level in the gap
        if (
          playerRight > obs.x + 4 &&
          playerLeft < obs.x + obs.width - 4 &&
          this.isGrounded
        ) {
          hit = true;
        }
      } else if (obs.type === 'spike' || obs.type === 'spike_double') {
        // Triangle hitbox approximation
        const spikeTop = this.groundY - obs.height;
        if (
          playerRight > obs.x + obs.width * 0.2 &&
          playerLeft < obs.x + obs.width * 0.8 &&
          playerBottom > spikeTop + obs.height * 0.3
        ) {
          hit = true;
        }
      } else {
        // Block/saw: AABB
        const obsTop = this.groundY - obs.height;
        if (
          playerRight > obs.x + 2 &&
          playerLeft < obs.x + obs.width - 2 &&
          playerBottom > obsTop + 2 &&
          playerTop < this.groundY - 2
        ) {
          hit = true;
        }
      }

      if (hit) {
        this.die();
        return;
      }
    }

    // Scroll bg lines
    for (const line of this.bgLines) {
      line.x -= this.speed * 0.3;
      if (line.x < -20) line.x = this.canvas.width + 20;
    }
  }

  private spawnObstacle(): void {
    const rand = Math.random();
    const x = this.canvas.width + 20;

    if (rand < 0.3) {
      this.obstacles.push({ x, type: 'spike', width: 24, height: 28 });
    } else if (rand < 0.5) {
      this.obstacles.push({ x, type: 'spike_double', width: 48, height: 28 });
    } else if (rand < 0.7) {
      this.obstacles.push({ x, type: 'block', width: 28, height: 28 });
    } else if (rand < 0.85) {
      this.obstacles.push({ x, type: 'saw', width: 32, height: 32 });
    } else {
      this.obstacles.push({ x, type: 'gap', width: 40, height: 0 });
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
      distance: this.score,
      speed: this.speed,
      game: 'rhythm-rush',
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

    // Background lines (parallax)
    ctx.strokeStyle = COLORS.bg_line;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.3;
    for (const line of this.bgLines) {
      ctx.beginPath();
      ctx.moveTo(line.x, 0);
      ctx.lineTo(line.x - 30, h);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Ground
    ctx.fillStyle = COLORS.ground;
    ctx.fillRect(0, this.groundY, w, h - this.groundY);
    ctx.fillStyle = COLORS.ground_top;
    ctx.fillRect(0, this.groundY, w, 3);

    // Ground pattern
    ctx.strokeStyle = COLORS.ground_top;
    ctx.lineWidth = 0.5;
    const scrollOffset = (this.frameCount * this.speed) % 30;
    for (let gx = -scrollOffset; gx < w; gx += 30) {
      ctx.beginPath();
      ctx.moveTo(gx, this.groundY + 20);
      ctx.lineTo(gx + 15, this.groundY + 40);
      ctx.stroke();
    }

    // Obstacles
    for (const obs of this.obstacles) {
      this.renderObstacle(obs);
    }

    // Trail
    for (const t of this.trail) {
      if (t.alpha < 0.05) continue;
      ctx.fillStyle = COLORS.player_trail;
      ctx.globalAlpha = t.alpha;
      ctx.fillRect(t.x, t.y - PLAYER_SIZE / 4, PLAYER_SIZE / 2, PLAYER_SIZE / 2);
    }
    ctx.globalAlpha = 1;

    // Player
    this.renderPlayer();

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

  private renderPlayer(): void {
    const { ctx } = this;
    const cx = this.playerX + PLAYER_SIZE / 2;
    const cy = this.playerY + PLAYER_SIZE / 2;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.playerRotation);

    // Glow
    const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, PLAYER_SIZE);
    glow.addColorStop(0, 'rgba(153, 217, 217, 0.3)');
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.fillRect(-PLAYER_SIZE, -PLAYER_SIZE, PLAYER_SIZE * 2, PLAYER_SIZE * 2);

    // Square player
    ctx.fillStyle = COLORS.player;
    ctx.fillRect(-PLAYER_SIZE / 2, -PLAYER_SIZE / 2, PLAYER_SIZE, PLAYER_SIZE);

    // Inner highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(-PLAYER_SIZE / 2 + 3, -PLAYER_SIZE / 2 + 3, PLAYER_SIZE - 6, 4);

    // Eye
    ctx.fillStyle = '#fff';
    ctx.fillRect(2, -4, 6, 6);
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(4, -2, 3, 3);

    ctx.restore();
  }

  private renderObstacle(obs: Obstacle): void {
    const { ctx } = this;
    const y = this.groundY;

    switch (obs.type) {
      case 'spike': {
        ctx.fillStyle = COLORS.spike;
        ctx.beginPath();
        ctx.moveTo(obs.x, y);
        ctx.lineTo(obs.x + obs.width / 2, y - obs.height);
        ctx.lineTo(obs.x + obs.width, y);
        ctx.fill();
        // Highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.beginPath();
        ctx.moveTo(obs.x + obs.width * 0.3, y);
        ctx.lineTo(obs.x + obs.width / 2, y - obs.height);
        ctx.lineTo(obs.x + obs.width * 0.45, y);
        ctx.fill();
        break;
      }
      case 'spike_double': {
        ctx.fillStyle = COLORS.spike;
        // Two spikes
        for (let i = 0; i < 2; i++) {
          const sx = obs.x + i * 24;
          ctx.beginPath();
          ctx.moveTo(sx, y);
          ctx.lineTo(sx + 12, y - obs.height);
          ctx.lineTo(sx + 24, y);
          ctx.fill();
        }
        break;
      }
      case 'block': {
        ctx.fillStyle = COLORS.block;
        ctx.fillRect(obs.x, y - obs.height, obs.width, obs.height);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.fillRect(obs.x + 2, y - obs.height + 2, obs.width - 4, 4);
        break;
      }
      case 'saw': {
        const cx = obs.x + obs.width / 2;
        const cy = y - obs.height / 2;
        const r = obs.width / 2;
        const teeth = 8;
        const rotation = this.frameCount * 0.1;

        ctx.fillStyle = COLORS.saw;
        ctx.beginPath();
        for (let i = 0; i < teeth * 2; i++) {
          const angle = rotation + (i / (teeth * 2)) * Math.PI * 2;
          const dist = i % 2 === 0 ? r : r * 0.65;
          const px = cx + Math.cos(angle) * dist;
          const py = cy + Math.sin(angle) * dist;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();

        // Center
        ctx.fillStyle = COLORS.bg;
        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.2, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'gap': {
        // Visual gap in ground
        ctx.fillStyle = COLORS.bg;
        ctx.fillRect(obs.x, y, obs.width, 80);
        break;
      }
    }
  }

  private renderDeathFlash(): void {
    const { ctx } = this;
    ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    setTimeout(() => this.render(), 200);
  }
}
