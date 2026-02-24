/**
 * Alien Invasion -- Space Invaders clone implementing GameBridge.
 *
 * Pure vanilla TypeScript. No React, no DOM dependencies beyond canvas.
 * Score = aliens destroyed (points vary by row: 30/20/10).
 * Death = alien bullet hits player or aliens reach bottom.
 * Controls: Arrow keys to move, Space to shoot.
 */

import type { GameBridge, GameBridgeCallbacks } from '@review-arcade/shared';

// Constants
const PLAYER_WIDTH = 36;
const PLAYER_HEIGHT = 24;
const PLAYER_SPEED = 5;
const BULLET_SPEED = 7;
const ALIEN_BULLET_SPEED = 3;
const ALIEN_ROWS = 5;
const ALIEN_COLS = 8;
const ALIEN_SIZE = 28;
const ALIEN_PADDING = 8;
const ALIEN_MOVE_INTERVAL = 800; // ms
const ALIEN_DROP = 16;
const ALIEN_SHOOT_CHANCE = 0.008;

// Colors (RCNR brand)
const COLORS = {
  bg: '#0A1628',
  player: '#99d9d9',
  player_glow: 'rgba(153, 217, 217, 0.2)',
  bullet: '#F5A623',
  alien_bullet: '#EF4444',
  alien_top: '#EF4444',
  alien_mid: '#F5A623',
  alien_bot: '#22C55E',
  barrier: '#3B82F6',
  text: '#99d9d9',
  star: '#99d9d9',
};

const ROW_COLORS = [COLORS.alien_top, COLORS.alien_top, COLORS.alien_mid, COLORS.alien_bot, COLORS.alien_bot];
const ROW_POINTS = [30, 30, 20, 10, 10];

interface Alien {
  x: number;
  y: number;
  row: number;
  alive: boolean;
}

interface Bullet {
  x: number;
  y: number;
  dy: number;
  isPlayer: boolean;
}

interface Barrier {
  x: number;
  y: number;
  health: number;
}

export class AlienInvasionEngine implements GameBridge {
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private callbacks!: GameBridgeCallbacks;

  private playerX = 0;
  private aliens: Alien[] = [];
  private bullets: Bullet[] = [];
  private barriers: Barrier[] = [];
  private alienDirection = 1; // 1 = right, -1 = left
  private alienMoveTimer = 0;
  private alienSpeed = ALIEN_MOVE_INTERVAL;
  private score = 0;
  private wave = 1;
  private running = false;
  private paused = false;
  private gameOver = false;
  private animFrame = 0;
  private lastTime = 0;
  private frameCount = 0;
  private stars: { x: number; y: number; s: number }[] = [];

  // Input
  private leftPressed = false;
  private rightPressed = false;
  private shootCooldown = 0;

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
    this.lastTime = performance.now();
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
    this.lastTime = performance.now();
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
    for (let i = 0; i < 40; i++) {
      this.stars.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        s: Math.random() * 1.5 + 0.5,
      });
    }
  }

  private reset(): void {
    this.gameOver = false;
    this.score = 0;
    this.wave = 1;
    this.alienDirection = 1;
    this.alienSpeed = ALIEN_MOVE_INTERVAL;
    this.alienMoveTimer = 0;
    this.bullets = [];
    this.leftPressed = false;
    this.rightPressed = false;
    this.shootCooldown = 0;
    this.frameCount = 0;

    this.playerX = this.canvas.width / 2 - PLAYER_WIDTH / 2;
    this.spawnAliens();
    this.spawnBarriers();
    this.render();
  }

  private spawnAliens(): void {
    this.aliens = [];
    const startX = (this.canvas.width - ALIEN_COLS * (ALIEN_SIZE + ALIEN_PADDING)) / 2;
    for (let row = 0; row < ALIEN_ROWS; row++) {
      for (let col = 0; col < ALIEN_COLS; col++) {
        this.aliens.push({
          x: startX + col * (ALIEN_SIZE + ALIEN_PADDING),
          y: 50 + row * (ALIEN_SIZE + ALIEN_PADDING),
          row,
          alive: true,
        });
      }
    }
  }

  private spawnBarriers(): void {
    this.barriers = [];
    const barrierCount = 4;
    const spacing = this.canvas.width / (barrierCount + 1);
    for (let i = 0; i < barrierCount; i++) {
      const bx = spacing * (i + 1) - 20;
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 4; c++) {
          this.barriers.push({
            x: bx + c * 10,
            y: this.canvas.height - 120 + r * 10,
            health: 3,
          });
        }
      }
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      this.leftPressed = true;
      e.preventDefault();
    }
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      this.rightPressed = true;
      e.preventDefault();
    }
    if (e.key === ' ') {
      e.preventDefault();
      if (this.running && !this.paused && this.shootCooldown <= 0) {
        this.shoot();
      }
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this.leftPressed = false;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.rightPressed = false;
  }

  private shoot(): void {
    this.bullets.push({
      x: this.playerX + PLAYER_WIDTH / 2,
      y: this.canvas.height - 60,
      dy: -BULLET_SPEED,
      isPlayer: true,
    });
    this.shootCooldown = 15;
  }

  private gameLoop(): void {
    if (!this.running || this.paused || this.gameOver) return;

    const now = performance.now();
    const dt = now - this.lastTime;
    this.lastTime = now;

    this.update(dt);
    this.render();

    this.animFrame = requestAnimationFrame(() => this.gameLoop());
  }

  private update(dt: number): void {
    this.frameCount++;
    if (this.shootCooldown > 0) this.shootCooldown--;

    // Move player
    if (this.leftPressed) this.playerX -= PLAYER_SPEED;
    if (this.rightPressed) this.playerX += PLAYER_SPEED;
    this.playerX = Math.max(0, Math.min(this.canvas.width - PLAYER_WIDTH, this.playerX));

    // Move aliens
    this.alienMoveTimer += dt;
    if (this.alienMoveTimer >= this.alienSpeed) {
      this.alienMoveTimer = 0;
      this.moveAliens();
    }

    // Alien shooting
    const aliveAliens = this.aliens.filter((a) => a.alive);
    for (const alien of aliveAliens) {
      if (Math.random() < ALIEN_SHOOT_CHANCE) {
        this.bullets.push({
          x: alien.x + ALIEN_SIZE / 2,
          y: alien.y + ALIEN_SIZE,
          dy: ALIEN_BULLET_SPEED,
          isPlayer: false,
        });
      }
    }

    // Move bullets and check collisions
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i];
      bullet.y += bullet.dy;

      // Off screen
      if (bullet.y < -10 || bullet.y > this.canvas.height + 10) {
        this.bullets.splice(i, 1);
        continue;
      }

      if (bullet.isPlayer) {
        // Check alien hits
        let hit = false;
        for (const alien of this.aliens) {
          if (!alien.alive) continue;
          if (
            bullet.x > alien.x &&
            bullet.x < alien.x + ALIEN_SIZE &&
            bullet.y > alien.y &&
            bullet.y < alien.y + ALIEN_SIZE
          ) {
            alien.alive = false;
            this.score += ROW_POINTS[alien.row];
            this.callbacks.onScoreUpdate(this.score);
            this.bullets.splice(i, 1);
            hit = true;
            break;
          }
        }
        if (hit) {
          // Check wave clear
          if (this.aliens.every((a) => !a.alive)) {
            this.wave++;
            this.alienSpeed = Math.max(200, ALIEN_MOVE_INTERVAL - this.wave * 50);
            this.callbacks.onSpecialEvent({
              type: 'wave_clear',
              wave: this.wave - 1,
              score: this.score,
            });
            this.spawnAliens();
          }
          continue;
        }

        // Check barrier hits
        for (let j = this.barriers.length - 1; j >= 0; j--) {
          const b = this.barriers[j];
          if (b.health <= 0) continue;
          if (bullet.x > b.x && bullet.x < b.x + 10 && bullet.y > b.y && bullet.y < b.y + 10) {
            b.health--;
            this.bullets.splice(i, 1);
            break;
          }
        }
      } else {
        // Enemy bullet: check player hit
        if (
          bullet.x > this.playerX &&
          bullet.x < this.playerX + PLAYER_WIDTH &&
          bullet.y > this.canvas.height - 60 &&
          bullet.y < this.canvas.height - 60 + PLAYER_HEIGHT
        ) {
          this.die();
          return;
        }

        // Check barrier hits
        for (let j = this.barriers.length - 1; j >= 0; j--) {
          const b = this.barriers[j];
          if (b.health <= 0) continue;
          if (bullet.x > b.x && bullet.x < b.x + 10 && bullet.y > b.y && bullet.y < b.y + 10) {
            b.health--;
            this.bullets.splice(i, 1);
            break;
          }
        }
      }
    }

    // Check if aliens reached bottom
    for (const alien of aliveAliens) {
      if (alien.y + ALIEN_SIZE >= this.canvas.height - 80) {
        this.die();
        return;
      }
    }
  }

  private moveAliens(): void {
    const aliveAliens = this.aliens.filter((a) => a.alive);
    if (aliveAliens.length === 0) return;

    // Check if any alien touches edge
    let shouldDrop = false;
    for (const alien of aliveAliens) {
      if (
        (this.alienDirection > 0 && alien.x + ALIEN_SIZE >= this.canvas.width - 10) ||
        (this.alienDirection < 0 && alien.x <= 10)
      ) {
        shouldDrop = true;
        break;
      }
    }

    if (shouldDrop) {
      for (const alien of this.aliens) {
        alien.y += ALIEN_DROP;
      }
      this.alienDirection *= -1;
    } else {
      const moveX = 12 * this.alienDirection;
      for (const alien of this.aliens) {
        alien.x += moveX;
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
      wave: this.wave,
      aliens_destroyed: this.aliens.filter((a) => !a.alive).length,
      game: 'alien-invasion',
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
      ctx.globalAlpha = 0.2 + Math.sin(this.frameCount * 0.02 + star.x) * 0.1;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.s, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Barriers
    for (const b of this.barriers) {
      if (b.health <= 0) continue;
      ctx.fillStyle = COLORS.barrier;
      ctx.globalAlpha = b.health / 3;
      ctx.fillRect(b.x, b.y, 10, 10);
    }
    ctx.globalAlpha = 1;

    // Aliens
    for (const alien of this.aliens) {
      if (!alien.alive) continue;
      this.renderAlien(alien);
    }

    // Bullets
    for (const bullet of this.bullets) {
      ctx.fillStyle = bullet.isPlayer ? COLORS.bullet : COLORS.alien_bullet;
      ctx.fillRect(bullet.x - 2, bullet.y - 4, 4, 8);
    }

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

  private renderAlien(alien: Alien): void {
    const { ctx } = this;
    const color = ROW_COLORS[alien.row];
    const wobble = Math.floor(this.frameCount / 30) % 2;

    ctx.fillStyle = color;

    if (alien.row < 2) {
      // Top rows: small squid shape
      ctx.fillRect(alien.x + 8, alien.y + 4, 12, 16);
      ctx.fillRect(alien.x + 4, alien.y + 8, 20, 8);
      ctx.fillRect(alien.x + (wobble ? 2 : 6), alien.y + 18, 6, 6);
      ctx.fillRect(alien.x + (wobble ? 20 : 16), alien.y + 18, 6, 6);
    } else if (alien.row === 2) {
      // Mid row: crab shape
      ctx.fillRect(alien.x + 6, alien.y + 4, 16, 14);
      ctx.fillRect(alien.x + 2, alien.y + 8, 24, 6);
      ctx.fillRect(alien.x + (wobble ? 0 : 4), alien.y + 16, 8, 6);
      ctx.fillRect(alien.x + (wobble ? 20 : 16), alien.y + 16, 8, 6);
    } else {
      // Bottom rows: octopus shape
      ctx.fillRect(alien.x + 4, alien.y + 2, 20, 16);
      ctx.fillRect(alien.x + 2, alien.y + 6, 24, 8);
      ctx.fillRect(alien.x + (wobble ? 2 : 6), alien.y + 18, 4, 6);
      ctx.fillRect(alien.x + 12, alien.y + 18, 4, 6);
      ctx.fillRect(alien.x + (wobble ? 22 : 18), alien.y + 18, 4, 6);
    }

    // Eyes
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(alien.x + 8, alien.y + 8, 4, 4);
    ctx.fillRect(alien.x + 16, alien.y + 8, 4, 4);
  }

  private renderPlayer(): void {
    const { ctx } = this;
    const x = this.playerX;
    const y = this.canvas.height - 60;

    // Glow
    const glow = ctx.createRadialGradient(x + PLAYER_WIDTH / 2, y + PLAYER_HEIGHT / 2, 5, x + PLAYER_WIDTH / 2, y + PLAYER_HEIGHT / 2, 40);
    glow.addColorStop(0, COLORS.player_glow);
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.fillRect(x - 20, y - 20, PLAYER_WIDTH + 40, PLAYER_HEIGHT + 40);

    // Ship body
    ctx.fillStyle = COLORS.player;
    ctx.fillRect(x + 4, y + 8, PLAYER_WIDTH - 8, PLAYER_HEIGHT - 8);
    ctx.fillRect(x + 14, y, 8, 10);
    ctx.fillRect(x, y + 14, PLAYER_WIDTH, 8);
  }

  private renderDeathFlash(): void {
    const { ctx } = this;
    ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    setTimeout(() => this.render(), 200);
  }
}
