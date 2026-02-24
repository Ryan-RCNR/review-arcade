/**
 * Dino Dash -- Chrome Dino Runner clone implementing GameBridge.
 *
 * Pure vanilla TypeScript. No React, no DOM dependencies beyond canvas.
 * Score = distance traveled (increments every frame).
 * Death = collision with obstacle (cactus or pterodactyl).
 * Controls: Space/Up to jump, Down to duck.
 */

import type { GameBridge, GameBridgeCallbacks } from '@review-arcade/shared';

// Physics
const GROUND_Y_OFFSET = 60; // from bottom
const GRAVITY = 0.7;
const JUMP_FORCE = -13;
const INITIAL_SPEED = 5;
const MAX_SPEED = 12;
const SPEED_INCREMENT = 0.002;
const DINO_WIDTH = 40;
const DINO_HEIGHT = 44;
const DINO_DUCK_HEIGHT = 26;

// Colors (RCNR brand)
const COLORS = {
  bg: '#0A1628',
  ground: '#1A3044',
  ground_line: '#2A4A60',
  dino: '#99d9d9',
  dino_dark: '#5BAAAA',
  obstacle: '#F5A623',
  obstacle_dark: '#D48B1A',
  cloud: '#0D1E33',
  star: '#99d9d9',
  text: '#99d9d9',
};

interface Obstacle {
  x: number;
  width: number;
  height: number;
  y: number; // bottom of obstacle relative to ground
  type: 'cactus_small' | 'cactus_large' | 'cactus_group' | 'bird';
}

export class DinoDashEngine implements GameBridge {
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private callbacks!: GameBridgeCallbacks;

  private groundY = 0;
  private dinoY = 0;
  private dinoVelocity = 0;
  private isDucking = false;
  private isJumping = false;
  private speed = INITIAL_SPEED;
  private obstacles: Obstacle[] = [];
  private score = 0;
  private distance = 0;
  private running = false;
  private paused = false;
  private gameOver = false;
  private animFrame = 0;
  private frameCount = 0;
  private nextObstacleDistance = 0;
  private stars: { x: number; y: number; size: number }[] = [];

  private boundKeyDown: ((e: KeyboardEvent) => void) | null = null;
  private boundKeyUp: ((e: KeyboardEvent) => void) | null = null;

  mount(canvas: HTMLCanvasElement, callbacks: GameBridgeCallbacks): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.callbacks = callbacks;
    this.groundY = canvas.height - GROUND_Y_OFFSET;
    this.generateStars();
    this.reset();
    this.render();

    this.boundKeyDown = this.handleKeyDown.bind(this);
    this.boundKeyUp = this.handleKeyUp.bind(this);
    window.addEventListener('keydown', this.boundKeyDown);
    window.addEventListener('keyup', this.boundKeyUp);
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
  }

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.groundY = height - GROUND_Y_OFFSET;
    this.render();
  }

  // --- Private ---

  private generateStars(): void {
    this.stars = [];
    for (let i = 0; i < 30; i++) {
      this.stars.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * (this.canvas.height - GROUND_Y_OFFSET - 80),
        size: Math.random() * 2 + 0.5,
      });
    }
  }

  private reset(): void {
    this.gameOver = false;
    this.score = 0;
    this.distance = 0;
    this.speed = INITIAL_SPEED;
    this.dinoY = 0;
    this.dinoVelocity = 0;
    this.isDucking = false;
    this.isJumping = false;
    this.obstacles = [];
    this.frameCount = 0;
    this.nextObstacleDistance = 300;
    this.render();
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.running || this.paused || this.gameOver) return;

    if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
      e.preventDefault();
      this.jump();
    }
    if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
      e.preventDefault();
      this.isDucking = true;
      // Fast-fall if in air
      if (this.isJumping) {
        this.dinoVelocity = Math.max(this.dinoVelocity, 8);
      }
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
      this.isDucking = false;
    }
  }

  private jump(): void {
    if (!this.isJumping) {
      this.dinoVelocity = JUMP_FORCE;
      this.isJumping = true;
      this.isDucking = false;
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

    // Speed increases over time
    this.speed = Math.min(MAX_SPEED, INITIAL_SPEED + this.distance * SPEED_INCREMENT);
    this.distance += this.speed / 10;

    // Score = distance
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

    // Dino physics
    if (this.isJumping) {
      this.dinoVelocity += GRAVITY;
      this.dinoY += this.dinoVelocity;
      if (this.dinoY >= 0) {
        this.dinoY = 0;
        this.dinoVelocity = 0;
        this.isJumping = false;
      }
    }

    // Spawn obstacles
    this.nextObstacleDistance -= this.speed;
    if (this.nextObstacleDistance <= 0) {
      this.spawnObstacle();
      this.nextObstacleDistance = 200 + Math.random() * 300;
    }

    // Move obstacles + collision
    const dinoX = 60;
    const dinoH = this.isDucking ? DINO_DUCK_HEIGHT : DINO_HEIGHT;
    const dinoTop = this.groundY - dinoH + this.dinoY;
    const dinoRight = dinoX + DINO_WIDTH - 8; // slight hitbox forgiveness
    const dinoLeft = dinoX + 8;
    const dinoBottom = this.groundY + this.dinoY;

    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.x -= this.speed;

      // Remove off-screen
      if (obs.x + obs.width < -20) {
        this.obstacles.splice(i, 1);
        continue;
      }

      // Collision (AABB)
      const obsTop = this.groundY - obs.y - obs.height;
      const obsBottom = this.groundY - obs.y;
      const obsLeft = obs.x;
      const obsRight = obs.x + obs.width;

      if (
        dinoRight > obsLeft &&
        dinoLeft < obsRight &&
        dinoBottom > obsTop &&
        dinoTop < obsBottom
      ) {
        this.die();
        return;
      }
    }

    // Scroll stars
    for (const star of this.stars) {
      star.x -= this.speed * 0.1;
      if (star.x < 0) star.x = this.canvas.width;
    }
  }

  private spawnObstacle(): void {
    const rand = Math.random();

    if (rand < 0.3) {
      // Small cactus
      this.obstacles.push({
        x: this.canvas.width + 20,
        width: 18,
        height: 36,
        y: 0,
        type: 'cactus_small',
      });
    } else if (rand < 0.6) {
      // Large cactus
      this.obstacles.push({
        x: this.canvas.width + 20,
        width: 24,
        height: 50,
        y: 0,
        type: 'cactus_large',
      });
    } else if (rand < 0.8) {
      // Cactus group
      this.obstacles.push({
        x: this.canvas.width + 20,
        width: 50,
        height: 36,
        y: 0,
        type: 'cactus_group',
      });
    } else {
      // Bird (flying obstacle)
      const flyHeight = Math.random() < 0.5 ? 20 : 50;
      this.obstacles.push({
        x: this.canvas.width + 20,
        width: 36,
        height: 24,
        y: flyHeight,
        type: 'bird',
      });
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
      game: 'dino-dash',
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

    // Stars
    ctx.fillStyle = COLORS.star;
    for (const star of this.stars) {
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Ground
    ctx.fillStyle = COLORS.ground;
    ctx.fillRect(0, this.groundY, w, h - this.groundY);
    ctx.strokeStyle = COLORS.ground_line;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, this.groundY);
    ctx.lineTo(w, this.groundY);
    ctx.stroke();

    // Ground details (scrolling dashes)
    ctx.strokeStyle = COLORS.ground_line;
    ctx.lineWidth = 1;
    const scrollOffset = (this.frameCount * this.speed) % 40;
    for (let x = -scrollOffset; x < w; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, this.groundY + 15);
      ctx.lineTo(x + 15, this.groundY + 15);
      ctx.stroke();
    }

    // Obstacles
    for (const obs of this.obstacles) {
      this.renderObstacle(obs);
    }

    // Dino
    this.renderDino();

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

  private renderDino(): void {
    const { ctx } = this;
    const x = 60;
    const dinoH = this.isDucking ? DINO_DUCK_HEIGHT : DINO_HEIGHT;
    const y = this.groundY - dinoH + this.dinoY;

    // Body
    ctx.fillStyle = COLORS.dino;
    if (this.isDucking) {
      // Ducking: wider, shorter
      ctx.fillRect(x, y, DINO_WIDTH + 8, DINO_DUCK_HEIGHT);
    } else {
      // Standing: head + body
      ctx.fillRect(x + 8, y, DINO_WIDTH - 8, 14); // head
      ctx.fillRect(x, y + 10, DINO_WIDTH, dinoH - 10); // body
    }

    // Eye
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(x + DINO_WIDTH - 10, y + 4, 4, 4);

    // Legs (animated running)
    ctx.fillStyle = COLORS.dino_dark;
    if (this.isJumping) {
      // Legs tucked
      ctx.fillRect(x + 6, y + dinoH - 4, 8, 4);
      ctx.fillRect(x + 20, y + dinoH - 4, 8, 4);
    } else {
      // Running animation
      const legPhase = Math.floor(this.frameCount / 6) % 2;
      if (legPhase === 0) {
        ctx.fillRect(x + 6, y + dinoH, 8, 8);
        ctx.fillRect(x + 20, y + dinoH - 4, 8, 4);
      } else {
        ctx.fillRect(x + 6, y + dinoH - 4, 8, 4);
        ctx.fillRect(x + 20, y + dinoH, 8, 8);
      }
    }
  }

  private renderObstacle(obs: Obstacle): void {
    const { ctx } = this;
    const y = this.groundY - obs.y - obs.height;

    if (obs.type === 'bird') {
      // Bird: body + wings
      ctx.fillStyle = COLORS.obstacle;
      ctx.fillRect(obs.x, y + 8, obs.width, 10);
      // Wings (animated)
      const wingUp = Math.floor(this.frameCount / 8) % 2 === 0;
      ctx.fillRect(obs.x + 8, wingUp ? y : y + 16, 16, 8);
      // Eye
      ctx.fillStyle = COLORS.bg;
      ctx.fillRect(obs.x + obs.width - 6, y + 10, 3, 3);
    } else {
      // Cactus variants
      ctx.fillStyle = COLORS.obstacle;

      if (obs.type === 'cactus_small') {
        ctx.fillRect(obs.x + 4, y, 10, obs.height);
        ctx.fillRect(obs.x, y + 10, 6, 10);
        ctx.fillRect(obs.x + 12, y + 14, 6, 8);
      } else if (obs.type === 'cactus_large') {
        ctx.fillRect(obs.x + 6, y, 12, obs.height);
        ctx.fillRect(obs.x, y + 12, 8, 14);
        ctx.fillRect(obs.x + 16, y + 8, 8, 12);
      } else {
        // Group: 3 small cacti
        for (let i = 0; i < 3; i++) {
          const cx = obs.x + i * 16;
          ctx.fillRect(cx + 4, y + (i === 1 ? 0 : 6), 10, obs.height - (i === 1 ? 0 : 6));
          ctx.fillRect(cx, y + 14, 5, 8);
        }
      }

      // Highlights
      ctx.fillStyle = COLORS.obstacle_dark;
      ctx.fillRect(obs.x + 2, y, 2, Math.min(obs.height, 20));
    }
  }

  private renderDeathFlash(): void {
    const { ctx } = this;
    ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    setTimeout(() => this.render(), 200);
  }
}
