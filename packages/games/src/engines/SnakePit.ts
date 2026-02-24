/**
 * Snake Pit -- Classic snake game engine implementing GameBridge.
 *
 * Pure vanilla TypeScript. No React, no DOM dependencies beyond canvas.
 * Score = number of food items eaten (1 point each).
 * Death = wall collision or self collision.
 * Special events: milestone lengths (10, 20, 30...).
 */

import type { GameBridge, GameBridgeCallbacks } from '@review-arcade/shared';

// Grid constants
const CELL_SIZE = 20;
const INITIAL_SPEED = 120; // ms per tick
const MIN_SPEED = 60;
const SPEED_DECREASE = 2; // ms faster per food eaten

// Colors (RCNR brand compatible)
const COLORS = {
  bg: '#0A1628',
  grid: '#0D1E33',
  snake_head: '#99d9d9',
  snake_body: '#5BAAAA',
  snake_tail: '#3A8888',
  food: '#F5A623',
  food_glow: 'rgba(245, 166, 35, 0.3)',
  wall: '#1A3044',
  text: '#99d9d9',
  score_bg: 'rgba(0, 12, 23, 0.7)',
};

interface Point {
  x: number;
  y: number;
}

type Direction = 'up' | 'down' | 'left' | 'right';

export class SnakePitEngine implements GameBridge {
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private callbacks!: GameBridgeCallbacks;

  private cols = 0;
  private rows = 0;
  private snake: Point[] = [];
  private direction: Direction = 'right';
  private nextDirection: Direction = 'right';
  private food: Point = { x: 0, y: 0 };
  private score = 0;
  private speed = INITIAL_SPEED;
  private running = false;
  private paused = false;
  private gameOver = false;
  private tickTimer: ReturnType<typeof setTimeout> | null = null;
  private lastFrameTime = 0;
  private animFrame = 0;

  // Input buffer -- queue direction changes to prevent 180-degree turns
  private inputQueue: Direction[] = [];

  // Bound event handler reference
  private boundKeyHandler: ((e: KeyboardEvent) => void) | null = null;

  mount(canvas: HTMLCanvasElement, callbacks: GameBridgeCallbacks): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.callbacks = callbacks;
    this.recalculateGrid();
    this.reset();
    this.render();

    // Keyboard input
    this.boundKeyHandler = this.handleKeyDown.bind(this);
    window.addEventListener('keydown', this.boundKeyHandler);
  }

  start(): void {
    if (this.gameOver) {
      this.reset();
    }
    this.running = true;
    this.paused = false;
    this.scheduleNextTick();
  }

  pause(): void {
    this.paused = true;
    this.running = false;
    if (this.tickTimer) {
      clearTimeout(this.tickTimer);
      this.tickTimer = null;
    }
  }

  resume(comebackStartScore: number): void {
    // Reset game state but keep accumulated server score
    this.reset();
    this.score = comebackStartScore;
    this.running = true;
    this.paused = false;
    this.scheduleNextTick();
  }

  destroy(): void {
    this.running = false;
    if (this.tickTimer) {
      clearTimeout(this.tickTimer);
      this.tickTimer = null;
    }
    if (this.animFrame) {
      cancelAnimationFrame(this.animFrame);
    }
    if (this.boundKeyHandler) {
      window.removeEventListener('keydown', this.boundKeyHandler);
      this.boundKeyHandler = null;
    }
  }

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.recalculateGrid();
    this.render();
  }

  // --- Private ---

  private recalculateGrid(): void {
    this.cols = Math.floor(this.canvas.width / CELL_SIZE);
    this.rows = Math.floor(this.canvas.height / CELL_SIZE);
    // Minimum playable area
    if (this.cols < 10) this.cols = 10;
    if (this.rows < 10) this.rows = 10;
  }

  private reset(): void {
    this.gameOver = false;
    this.score = 0;
    this.speed = INITIAL_SPEED;
    this.direction = 'right';
    this.nextDirection = 'right';
    this.inputQueue = [];

    // Start snake in center
    const cx = Math.floor(this.cols / 2);
    const cy = Math.floor(this.rows / 2);
    this.snake = [
      { x: cx, y: cy },
      { x: cx - 1, y: cy },
      { x: cx - 2, y: cy },
    ];

    this.spawnFood();
    this.render();
  }

  private spawnFood(): void {
    const occupied = new Set(this.snake.map((p) => `${p.x},${p.y}`));
    let attempts = 0;
    do {
      this.food = {
        x: Math.floor(Math.random() * this.cols),
        y: Math.floor(Math.random() * this.rows),
      };
      attempts++;
    } while (occupied.has(`${this.food.x},${this.food.y}`) && attempts < 1000);
  }

  private scheduleNextTick(): void {
    if (!this.running || this.paused) return;
    this.tickTimer = setTimeout(() => {
      this.tick();
      this.scheduleNextTick();
    }, this.speed);
  }

  private tick(): void {
    if (!this.running || this.paused || this.gameOver) return;

    // Process queued input
    if (this.inputQueue.length > 0) {
      const next = this.inputQueue.shift()!;
      if (this.isValidDirection(next)) {
        this.direction = next;
      }
    }

    // Move head
    const head = this.snake[0];
    let newHead: Point;

    switch (this.direction) {
      case 'up':
        newHead = { x: head.x, y: head.y - 1 };
        break;
      case 'down':
        newHead = { x: head.x, y: head.y + 1 };
        break;
      case 'left':
        newHead = { x: head.x - 1, y: head.y };
        break;
      case 'right':
        newHead = { x: head.x + 1, y: head.y };
        break;
    }

    // Check wall collision
    if (newHead.x < 0 || newHead.x >= this.cols || newHead.y < 0 || newHead.y >= this.rows) {
      this.die();
      return;
    }

    // Check self collision (skip tail which will move away)
    for (let i = 0; i < this.snake.length - 1; i++) {
      if (this.snake[i].x === newHead.x && this.snake[i].y === newHead.y) {
        this.die();
        return;
      }
    }

    this.snake.unshift(newHead);

    // Check food
    if (newHead.x === this.food.x && newHead.y === this.food.y) {
      this.score++;
      this.speed = Math.max(MIN_SPEED, this.speed - SPEED_DECREASE);
      this.callbacks.onScoreUpdate(this.score);

      // Check milestones
      if (this.score % 10 === 0) {
        this.callbacks.onSpecialEvent({
          type: 'milestone',
          length: this.snake.length,
          score: this.score,
        });
      }

      this.spawnFood();
      // Don't remove tail (snake grows)
    } else {
      this.snake.pop();
    }

    this.render();
  }

  private die(): void {
    this.gameOver = true;
    this.running = false;
    if (this.tickTimer) {
      clearTimeout(this.tickTimer);
      this.tickTimer = null;
    }

    // Flash death animation
    this.renderDeathFlash();

    this.callbacks.onDeath(this.score, {
      snake_length: this.snake.length,
      game: 'snake-pit',
    });
  }

  private isValidDirection(dir: Direction): boolean {
    const opposites: Record<Direction, Direction> = {
      up: 'down',
      down: 'up',
      left: 'right',
      right: 'left',
    };
    return dir !== opposites[this.direction];
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.running && !this.paused) return;

    let dir: Direction | null = null;

    switch (e.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        dir = 'up';
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        dir = 'down';
        break;
      case 'ArrowLeft':
      case 'a':
      case 'A':
        dir = 'left';
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        dir = 'right';
        break;
    }

    if (dir) {
      e.preventDefault();
      // Buffer up to 2 inputs for smooth turning
      if (this.inputQueue.length < 2) {
        this.inputQueue.push(dir);
      }
    }
  }

  // --- Rendering ---

  private render(): void {
    const { ctx, cols, rows } = this;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Background
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, w, h);

    // Grid lines (subtle)
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= cols; x++) {
      ctx.beginPath();
      ctx.moveTo(x * CELL_SIZE, 0);
      ctx.lineTo(x * CELL_SIZE, rows * CELL_SIZE);
      ctx.stroke();
    }
    for (let y = 0; y <= rows; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * CELL_SIZE);
      ctx.lineTo(cols * CELL_SIZE, y * CELL_SIZE);
      ctx.stroke();
    }

    // Food glow
    const fx = this.food.x * CELL_SIZE + CELL_SIZE / 2;
    const fy = this.food.y * CELL_SIZE + CELL_SIZE / 2;
    const glow = ctx.createRadialGradient(fx, fy, 2, fx, fy, CELL_SIZE * 1.5);
    glow.addColorStop(0, COLORS.food_glow);
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.fillRect(
      this.food.x * CELL_SIZE - CELL_SIZE,
      this.food.y * CELL_SIZE - CELL_SIZE,
      CELL_SIZE * 3,
      CELL_SIZE * 3,
    );

    // Food
    ctx.fillStyle = COLORS.food;
    ctx.beginPath();
    ctx.arc(fx, fy, CELL_SIZE / 2 - 2, 0, Math.PI * 2);
    ctx.fill();

    // Snake
    for (let i = this.snake.length - 1; i >= 0; i--) {
      const seg = this.snake[i];
      const t = i / Math.max(this.snake.length - 1, 1);

      if (i === 0) {
        ctx.fillStyle = COLORS.snake_head;
      } else {
        // Gradient from body to tail
        const r1 = parseInt(COLORS.snake_body.slice(1, 3), 16);
        const g1 = parseInt(COLORS.snake_body.slice(3, 5), 16);
        const b1 = parseInt(COLORS.snake_body.slice(5, 7), 16);
        const r2 = parseInt(COLORS.snake_tail.slice(1, 3), 16);
        const g2 = parseInt(COLORS.snake_tail.slice(3, 5), 16);
        const b2 = parseInt(COLORS.snake_tail.slice(5, 7), 16);
        const r = Math.round(r1 + (r2 - r1) * t);
        const g = Math.round(g1 + (g2 - g1) * t);
        const b = Math.round(b1 + (b2 - b1) * t);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
      }

      const padding = i === 0 ? 1 : 2;
      const radius = i === 0 ? 4 : 3;

      this.roundRect(
        ctx,
        seg.x * CELL_SIZE + padding,
        seg.y * CELL_SIZE + padding,
        CELL_SIZE - padding * 2,
        CELL_SIZE - padding * 2,
        radius,
      );
      ctx.fill();
    }

    // Head eyes (direction-aware)
    if (this.snake.length > 0) {
      const head = this.snake[0];
      const hx = head.x * CELL_SIZE;
      const hy = head.y * CELL_SIZE;
      ctx.fillStyle = COLORS.bg;

      let eye1x: number, eye1y: number, eye2x: number, eye2y: number;
      const eyeSize = 3;
      const offset = 5;

      switch (this.direction) {
        case 'right':
          eye1x = hx + CELL_SIZE - offset;
          eye1y = hy + offset;
          eye2x = hx + CELL_SIZE - offset;
          eye2y = hy + CELL_SIZE - offset;
          break;
        case 'left':
          eye1x = hx + offset;
          eye1y = hy + offset;
          eye2x = hx + offset;
          eye2y = hy + CELL_SIZE - offset;
          break;
        case 'up':
          eye1x = hx + offset;
          eye1y = hy + offset;
          eye2x = hx + CELL_SIZE - offset;
          eye2y = hy + offset;
          break;
        case 'down':
          eye1x = hx + offset;
          eye1y = hy + CELL_SIZE - offset;
          eye2x = hx + CELL_SIZE - offset;
          eye2y = hy + CELL_SIZE - offset;
          break;
      }

      ctx.beginPath();
      ctx.arc(eye1x, eye1y, eyeSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(eye2x, eye2y, eyeSize, 0, Math.PI * 2);
      ctx.fill();
    }

    // Game over text
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

  private renderDeathFlash(): void {
    const { ctx } = this;
    // Brief red flash on snake
    for (const seg of this.snake) {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.6)';
      ctx.fillRect(
        seg.x * CELL_SIZE,
        seg.y * CELL_SIZE,
        CELL_SIZE,
        CELL_SIZE,
      );
    }

    // Re-render after flash
    setTimeout(() => this.render(), 200);
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}
