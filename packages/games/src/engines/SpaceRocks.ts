/**
 * Space Rocks -- Asteroids clone implementing GameBridge.
 *
 * Pure vanilla TypeScript. No React, no DOM dependencies beyond canvas.
 * Score = asteroids destroyed (large=20, medium=50, small=100).
 * Death = collision with asteroid.
 * Controls: Arrow keys to rotate/thrust, Space to shoot.
 */

import type { GameBridge, GameBridgeCallbacks } from '@review-arcade/shared';

// Constants
const ROTATION_SPEED = 0.07;
const THRUST_FORCE = 0.12;
const FRICTION = 0.99;
const MAX_SPEED = 5;
const BULLET_SPEED = 8;
const BULLET_LIFETIME = 50;
const SHIP_SIZE = 14;
const INITIAL_ASTEROIDS = 4;
const SHOOT_COOLDOWN = 8;

// Colors (RCNR brand)
const COLORS = {
  bg: '#0A1628',
  ship: '#99d9d9',
  ship_thrust: '#F5A623',
  bullet: '#F5A623',
  asteroid: '#5BAAAA',
  asteroid_stroke: '#99d9d9',
  text: '#99d9d9',
  star: '#99d9d9',
};

interface Asteroid {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  size: 'large' | 'medium' | 'small';
  vertices: number[]; // angle offsets for irregular shape
}

interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

export class SpaceRocksEngine implements GameBridge {
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private callbacks!: GameBridgeCallbacks;

  // Ship state
  private shipX = 0;
  private shipY = 0;
  private shipVX = 0;
  private shipVY = 0;
  private shipAngle = -Math.PI / 2; // pointing up
  private thrusting = false;

  private asteroids: Asteroid[] = [];
  private bullets: Bullet[] = [];
  private score = 0;
  private wave = 1;
  private running = false;
  private paused = false;
  private gameOver = false;
  private animFrame = 0;
  private frameCount = 0;
  private shootCooldown = 0;
  private invincibleFrames = 0;
  private stars: { x: number; y: number; s: number }[] = [];

  // Input
  private keys: Record<string, boolean> = {};

  private boundKeyDown: ((e: KeyboardEvent) => void) | null = null;
  private boundKeyUp: ((e: KeyboardEvent) => void) | null = null;

  mount(canvas: HTMLCanvasElement, callbacks: GameBridgeCallbacks): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.callbacks = callbacks;
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
    this.render();
  }

  // --- Private ---

  private generateStars(): void {
    this.stars = [];
    for (let i = 0; i < 50; i++) {
      this.stars.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        s: Math.random() * 1.5 + 0.3,
      });
    }
  }

  private reset(): void {
    this.gameOver = false;
    this.score = 0;
    this.wave = 1;
    this.shipX = this.canvas.width / 2;
    this.shipY = this.canvas.height / 2;
    this.shipVX = 0;
    this.shipVY = 0;
    this.shipAngle = -Math.PI / 2;
    this.thrusting = false;
    this.bullets = [];
    this.keys = {};
    this.shootCooldown = 0;
    this.invincibleFrames = 60;
    this.frameCount = 0;

    this.spawnAsteroids(INITIAL_ASTEROIDS);
    this.render();
  }

  private spawnAsteroids(count: number): void {
    this.asteroids = [];
    for (let i = 0; i < count; i++) {
      let x: number, y: number;
      // Spawn away from ship
      do {
        x = Math.random() * this.canvas.width;
        y = Math.random() * this.canvas.height;
      } while (
        Math.hypot(x - this.shipX, y - this.shipY) < 120
      );

      this.asteroids.push(this.createAsteroid(x, y, 'large'));
    }
  }

  private createAsteroid(x: number, y: number, size: 'large' | 'medium' | 'small'): Asteroid {
    const radius = size === 'large' ? 40 : size === 'medium' ? 22 : 12;
    const speed = size === 'large' ? 1 : size === 'medium' ? 1.8 : 2.5;
    const angle = Math.random() * Math.PI * 2;
    const vertices: number[] = [];
    const vertCount = 8 + Math.floor(Math.random() * 4);
    for (let i = 0; i < vertCount; i++) {
      vertices.push(0.7 + Math.random() * 0.6); // 0.7..1.3 radius multiplier
    }
    return {
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius,
      size,
      vertices,
    };
  }

  private handleKeyDown(e: KeyboardEvent): void {
    this.keys[e.key] = true;
    if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    this.keys[e.key] = false;
  }

  private gameLoop(): void {
    if (!this.running || this.paused || this.gameOver) return;
    this.update();
    this.render();
    this.animFrame = requestAnimationFrame(() => this.gameLoop());
  }

  private update(): void {
    this.frameCount++;
    if (this.invincibleFrames > 0) this.invincibleFrames--;
    if (this.shootCooldown > 0) this.shootCooldown--;

    // Rotation
    if (this.keys['ArrowLeft'] || this.keys['a'] || this.keys['A']) {
      this.shipAngle -= ROTATION_SPEED;
    }
    if (this.keys['ArrowRight'] || this.keys['d'] || this.keys['D']) {
      this.shipAngle += ROTATION_SPEED;
    }

    // Thrust
    this.thrusting = !!(this.keys['ArrowUp'] || this.keys['w'] || this.keys['W']);
    if (this.thrusting) {
      this.shipVX += Math.cos(this.shipAngle) * THRUST_FORCE;
      this.shipVY += Math.sin(this.shipAngle) * THRUST_FORCE;
    }

    // Friction + speed cap
    this.shipVX *= FRICTION;
    this.shipVY *= FRICTION;
    const speed = Math.hypot(this.shipVX, this.shipVY);
    if (speed > MAX_SPEED) {
      this.shipVX = (this.shipVX / speed) * MAX_SPEED;
      this.shipVY = (this.shipVY / speed) * MAX_SPEED;
    }

    // Move ship + wrap
    this.shipX += this.shipVX;
    this.shipY += this.shipVY;
    const shipPos = { x: this.shipX, y: this.shipY };
    this.wrap(shipPos);
    this.shipX = shipPos.x;
    this.shipY = shipPos.y;

    // Shoot
    if ((this.keys[' ']) && this.shootCooldown <= 0) {
      this.bullets.push({
        x: this.shipX + Math.cos(this.shipAngle) * SHIP_SIZE,
        y: this.shipY + Math.sin(this.shipAngle) * SHIP_SIZE,
        vx: Math.cos(this.shipAngle) * BULLET_SPEED + this.shipVX,
        vy: Math.sin(this.shipAngle) * BULLET_SPEED + this.shipVY,
        life: BULLET_LIFETIME,
      });
      this.shootCooldown = SHOOT_COOLDOWN;
    }

    // Move bullets
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.x += b.vx;
      b.y += b.vy;
      b.life--;
      this.wrap(b);
      if (b.life <= 0) {
        this.bullets.splice(i, 1);
      }
    }

    // Move asteroids
    for (const ast of this.asteroids) {
      ast.x += ast.vx;
      ast.y += ast.vy;
      this.wrap(ast);
    }

    // Bullet-asteroid collisions
    for (let bi = this.bullets.length - 1; bi >= 0; bi--) {
      const bullet = this.bullets[bi];
      for (let ai = this.asteroids.length - 1; ai >= 0; ai--) {
        const ast = this.asteroids[ai];
        if (Math.hypot(bullet.x - ast.x, bullet.y - ast.y) < ast.radius) {
          // Hit!
          this.bullets.splice(bi, 1);
          this.asteroids.splice(ai, 1);

          const points = ast.size === 'large' ? 20 : ast.size === 'medium' ? 50 : 100;
          this.score += points;
          this.callbacks.onScoreUpdate(this.score);

          // Split asteroid
          if (ast.size === 'large') {
            this.asteroids.push(this.createAsteroid(ast.x, ast.y, 'medium'));
            this.asteroids.push(this.createAsteroid(ast.x, ast.y, 'medium'));
          } else if (ast.size === 'medium') {
            this.asteroids.push(this.createAsteroid(ast.x, ast.y, 'small'));
            this.asteroids.push(this.createAsteroid(ast.x, ast.y, 'small'));
          }

          // Wave clear
          if (this.asteroids.length === 0) {
            this.wave++;
            this.callbacks.onSpecialEvent({
              type: 'wave_clear',
              wave: this.wave - 1,
              score: this.score,
            });
            this.spawnAsteroids(INITIAL_ASTEROIDS + this.wave);
          }

          break;
        }
      }
    }

    // Ship-asteroid collisions
    if (this.invincibleFrames <= 0) {
      for (const ast of this.asteroids) {
        if (Math.hypot(this.shipX - ast.x, this.shipY - ast.y) < ast.radius + SHIP_SIZE * 0.6) {
          this.die();
          return;
        }
      }
    }
  }

  private wrap(obj: { x: number; y: number }): void {
    const w = this.canvas.width;
    const h = this.canvas.height;
    if (obj.x < -40) obj.x = w + 40;
    if (obj.x > w + 40) obj.x = -40;
    if (obj.y < -40) obj.y = h + 40;
    if (obj.y > h + 40) obj.y = -40;
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
      wave: this.wave,
      asteroids_destroyed: this.score,
      game: 'space-rocks',
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
    for (const star of this.stars) {
      ctx.fillStyle = COLORS.star;
      ctx.globalAlpha = 0.15 + Math.sin(this.frameCount * 0.01 + star.x * 0.1) * 0.1;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Asteroids
    for (const ast of this.asteroids) {
      this.renderAsteroid(ast);
    }

    // Bullets
    ctx.fillStyle = COLORS.bullet;
    for (const bullet of this.bullets) {
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Ship
    if (this.invincibleFrames <= 0 || this.frameCount % 6 < 3) {
      this.renderShip();
    }

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

  private renderShip(): void {
    const { ctx } = this;
    const x = this.shipX;
    const y = this.shipY;
    const a = this.shipAngle;

    // Thrust flame
    if (this.thrusting && this.frameCount % 4 < 2) {
      ctx.fillStyle = COLORS.ship_thrust;
      ctx.beginPath();
      ctx.moveTo(
        x - Math.cos(a) * SHIP_SIZE * 0.8 + Math.sin(a) * 5,
        y - Math.sin(a) * SHIP_SIZE * 0.8 - Math.cos(a) * 5,
      );
      ctx.lineTo(
        x - Math.cos(a) * SHIP_SIZE * 1.5,
        y - Math.sin(a) * SHIP_SIZE * 1.5,
      );
      ctx.lineTo(
        x - Math.cos(a) * SHIP_SIZE * 0.8 - Math.sin(a) * 5,
        y - Math.sin(a) * SHIP_SIZE * 0.8 + Math.cos(a) * 5,
      );
      ctx.fill();
    }

    // Ship triangle
    ctx.strokeStyle = COLORS.ship;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(
      x + Math.cos(a) * SHIP_SIZE,
      y + Math.sin(a) * SHIP_SIZE,
    );
    ctx.lineTo(
      x - Math.cos(a) * SHIP_SIZE * 0.7 + Math.sin(a) * SHIP_SIZE * 0.7,
      y - Math.sin(a) * SHIP_SIZE * 0.7 - Math.cos(a) * SHIP_SIZE * 0.7,
    );
    ctx.lineTo(
      x - Math.cos(a) * SHIP_SIZE * 0.4,
      y - Math.sin(a) * SHIP_SIZE * 0.4,
    );
    ctx.lineTo(
      x - Math.cos(a) * SHIP_SIZE * 0.7 - Math.sin(a) * SHIP_SIZE * 0.7,
      y - Math.sin(a) * SHIP_SIZE * 0.7 + Math.cos(a) * SHIP_SIZE * 0.7,
    );
    ctx.closePath();
    ctx.stroke();
  }

  private renderAsteroid(ast: Asteroid): void {
    const { ctx } = this;
    const verts = ast.vertices;
    const count = verts.length;

    ctx.strokeStyle = COLORS.asteroid_stroke;
    ctx.lineWidth = 1.5;
    ctx.fillStyle = COLORS.asteroid;
    ctx.globalAlpha = 0.3;

    ctx.beginPath();
    for (let i = 0; i <= count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const r = ast.radius * verts[i % count];
      const px = ast.x + Math.cos(angle) * r;
      const py = ast.y + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.stroke();
  }

  private renderDeathFlash(): void {
    const { ctx } = this;
    ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    setTimeout(() => this.render(), 200);
  }
}
