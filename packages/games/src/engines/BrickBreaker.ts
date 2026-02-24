/**
 * Brick Breaker -- Breakout clone implementing GameBridge.
 *
 * Pure vanilla TypeScript. No React, no DOM dependencies beyond canvas.
 * Score = bricks destroyed (10 points each, bonus for color tiers).
 * Death = ball falls below paddle.
 * Controls: Arrow keys or mouse to move paddle.
 */

import type { GameBridge, GameBridgeCallbacks } from '@review-arcade/shared';

// Constants
const PADDLE_WIDTH = 80;
const PADDLE_HEIGHT = 12;
const PADDLE_SPEED = 8;
const BALL_RADIUS = 6;
const BALL_SPEED = 4.5;
const BRICK_ROWS = 6;
const BRICK_COLS = 10;
const BRICK_HEIGHT = 18;
const BRICK_PADDING = 4;
const BRICK_TOP_OFFSET = 60;

// Colors (RCNR brand)
const COLORS = {
  bg: '#0A1628',
  paddle: '#99d9d9',
  paddle_glow: 'rgba(153, 217, 217, 0.2)',
  ball: '#F5A623',
  ball_glow: 'rgba(245, 166, 35, 0.3)',
  wall: '#0D1E33',
  text: '#99d9d9',
};

const BRICK_COLORS = [
  '#EF4444', // red (top, hardest to reach)
  '#F97316', // orange
  '#F5A623', // amber
  '#22C55E', // green
  '#3B82F6', // blue
  '#8B5CF6', // purple (bottom, easiest)
];

const BRICK_POINTS = [15, 13, 11, 9, 7, 5];

interface Brick {
  x: number;
  y: number;
  width: number;
  color: string;
  points: number;
  alive: boolean;
}

export class BrickBreakerEngine implements GameBridge {
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private callbacks!: GameBridgeCallbacks;

  private paddleX = 0;
  private ballX = 0;
  private ballY = 0;
  private ballDX = 0;
  private ballDY = 0;
  private bricks: Brick[] = [];
  private score = 0;
  private running = false;
  private paused = false;
  private gameOver = false;
  private animFrame = 0;

  // Input state
  private leftPressed = false;
  private rightPressed = false;
  private mouseX: number | null = null;

  private boundKeyDown: ((e: KeyboardEvent) => void) | null = null;
  private boundKeyUp: ((e: KeyboardEvent) => void) | null = null;
  private boundMouseMove: ((e: MouseEvent) => void) | null = null;

  mount(canvas: HTMLCanvasElement, callbacks: GameBridgeCallbacks): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.callbacks = callbacks;
    this.reset();
    this.render();

    this.boundKeyDown = this.handleKeyDown.bind(this);
    this.boundKeyUp = this.handleKeyUp.bind(this);
    this.boundMouseMove = this.handleMouseMove.bind(this);
    window.addEventListener('keydown', this.boundKeyDown);
    window.addEventListener('keyup', this.boundKeyUp);
    canvas.addEventListener('mousemove', this.boundMouseMove);
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
    if (this.boundMouseMove) {
      this.canvas.removeEventListener('mousemove', this.boundMouseMove);
      this.boundMouseMove = null;
    }
  }

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.render();
  }

  // --- Private ---

  private reset(): void {
    this.gameOver = false;
    this.score = 0;
    this.leftPressed = false;
    this.rightPressed = false;
    this.mouseX = null;

    const w = this.canvas.width;
    const h = this.canvas.height;

    // Center paddle
    this.paddleX = (w - PADDLE_WIDTH) / 2;

    // Ball starts on paddle
    this.ballX = w / 2;
    this.ballY = h - 40 - BALL_RADIUS;
    const angle = -Math.PI / 4 + Math.random() * (-Math.PI / 2);
    this.ballDX = Math.cos(angle) * BALL_SPEED;
    this.ballDY = Math.sin(angle) * BALL_SPEED;
    if (this.ballDY > 0) this.ballDY = -this.ballDY;

    // Create brick layout
    this.bricks = [];
    const brickWidth = (w - BRICK_PADDING * (BRICK_COLS + 1)) / BRICK_COLS;
    for (let row = 0; row < BRICK_ROWS; row++) {
      for (let col = 0; col < BRICK_COLS; col++) {
        this.bricks.push({
          x: BRICK_PADDING + col * (brickWidth + BRICK_PADDING),
          y: BRICK_TOP_OFFSET + row * (BRICK_HEIGHT + BRICK_PADDING),
          width: brickWidth,
          color: BRICK_COLORS[row],
          points: BRICK_POINTS[row],
          alive: true,
        });
      }
    }

    this.render();
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
  }

  private handleKeyUp(e: KeyboardEvent): void {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      this.leftPressed = false;
    }
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      this.rightPressed = false;
    }
  }

  private handleMouseMove(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    this.mouseX = e.clientX - rect.left;
  }

  private gameLoop(): void {
    if (!this.running || this.paused || this.gameOver) return;
    this.update();
    this.render();
    this.animFrame = requestAnimationFrame(() => this.gameLoop());
  }

  private update(): void {
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Move paddle
    if (this.mouseX !== null) {
      this.paddleX = this.mouseX - PADDLE_WIDTH / 2;
    } else {
      if (this.leftPressed) this.paddleX -= PADDLE_SPEED;
      if (this.rightPressed) this.paddleX += PADDLE_SPEED;
    }
    this.paddleX = Math.max(0, Math.min(w - PADDLE_WIDTH, this.paddleX));

    // Move ball
    this.ballX += this.ballDX;
    this.ballY += this.ballDY;

    // Wall collisions
    if (this.ballX - BALL_RADIUS <= 0 || this.ballX + BALL_RADIUS >= w) {
      this.ballDX = -this.ballDX;
      this.ballX = Math.max(BALL_RADIUS, Math.min(w - BALL_RADIUS, this.ballX));
    }
    if (this.ballY - BALL_RADIUS <= 0) {
      this.ballDY = -this.ballDY;
      this.ballY = BALL_RADIUS;
    }

    // Ball fell below paddle
    if (this.ballY + BALL_RADIUS >= h) {
      this.die();
      return;
    }

    // Paddle collision
    const paddleTop = h - 30;
    if (
      this.ballDY > 0 &&
      this.ballY + BALL_RADIUS >= paddleTop &&
      this.ballY + BALL_RADIUS <= paddleTop + PADDLE_HEIGHT &&
      this.ballX >= this.paddleX &&
      this.ballX <= this.paddleX + PADDLE_WIDTH
    ) {
      // Angle based on where ball hits paddle
      const hitPos = (this.ballX - this.paddleX) / PADDLE_WIDTH; // 0..1
      const angle = -Math.PI * 0.15 - hitPos * Math.PI * 0.7; // spread angle
      const speed = Math.sqrt(this.ballDX ** 2 + this.ballDY ** 2);
      this.ballDX = Math.cos(angle) * speed;
      this.ballDY = Math.sin(angle) * speed;
      this.ballY = paddleTop - BALL_RADIUS;
    }

    // Brick collisions
    for (const brick of this.bricks) {
      if (!brick.alive) continue;

      if (
        this.ballX + BALL_RADIUS > brick.x &&
        this.ballX - BALL_RADIUS < brick.x + brick.width &&
        this.ballY + BALL_RADIUS > brick.y &&
        this.ballY - BALL_RADIUS < brick.y + BRICK_HEIGHT
      ) {
        brick.alive = false;
        this.score += brick.points;
        this.callbacks.onScoreUpdate(this.score);

        // Determine bounce direction
        const overlapLeft = this.ballX + BALL_RADIUS - brick.x;
        const overlapRight = brick.x + brick.width - (this.ballX - BALL_RADIUS);
        const overlapTop = this.ballY + BALL_RADIUS - brick.y;
        const overlapBottom = brick.y + BRICK_HEIGHT - (this.ballY - BALL_RADIUS);
        const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

        if (minOverlap === overlapTop || minOverlap === overlapBottom) {
          this.ballDY = -this.ballDY;
        } else {
          this.ballDX = -this.ballDX;
        }

        // Check for level clear
        const remaining = this.bricks.filter((b) => b.alive).length;
        if (remaining === 0) {
          this.callbacks.onSpecialEvent({
            type: 'level_clear',
            score: this.score,
          });
          // Regenerate bricks for next level
          this.regenerateBricks();
        }

        break; // Only one brick per frame
      }
    }
  }

  private regenerateBricks(): void {
    const w = this.canvas.width;
    const brickWidth = (w - BRICK_PADDING * (BRICK_COLS + 1)) / BRICK_COLS;
    this.bricks = [];
    for (let row = 0; row < BRICK_ROWS; row++) {
      for (let col = 0; col < BRICK_COLS; col++) {
        this.bricks.push({
          x: BRICK_PADDING + col * (brickWidth + BRICK_PADDING),
          y: BRICK_TOP_OFFSET + row * (BRICK_HEIGHT + BRICK_PADDING),
          width: brickWidth,
          color: BRICK_COLORS[row],
          points: BRICK_POINTS[row],
          alive: true,
        });
      }
    }
    // Speed up ball slightly
    const speed = Math.sqrt(this.ballDX ** 2 + this.ballDY ** 2);
    const newSpeed = speed * 1.1;
    this.ballDX = (this.ballDX / speed) * newSpeed;
    this.ballDY = (this.ballDY / speed) * newSpeed;
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
      bricks_destroyed: this.bricks.filter((b) => !b.alive).length,
      game: 'brick-breaker',
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

    // Bricks
    for (const brick of this.bricks) {
      if (!brick.alive) continue;
      ctx.fillStyle = brick.color;
      this.roundRect(ctx, brick.x, brick.y, brick.width, BRICK_HEIGHT, 3);
      ctx.fill();
      // Highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.fillRect(brick.x + 2, brick.y + 2, brick.width - 4, 4);
    }

    // Ball glow
    const glow = ctx.createRadialGradient(this.ballX, this.ballY, 1, this.ballX, this.ballY, BALL_RADIUS * 3);
    glow.addColorStop(0, COLORS.ball_glow);
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.fillRect(this.ballX - BALL_RADIUS * 3, this.ballY - BALL_RADIUS * 3, BALL_RADIUS * 6, BALL_RADIUS * 6);

    // Ball
    ctx.fillStyle = COLORS.ball;
    ctx.beginPath();
    ctx.arc(this.ballX, this.ballY, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    // Paddle glow
    const paddleTop = h - 30;
    const pglow = ctx.createRadialGradient(
      this.paddleX + PADDLE_WIDTH / 2, paddleTop,
      10,
      this.paddleX + PADDLE_WIDTH / 2, paddleTop,
      PADDLE_WIDTH,
    );
    pglow.addColorStop(0, COLORS.paddle_glow);
    pglow.addColorStop(1, 'transparent');
    ctx.fillStyle = pglow;
    ctx.fillRect(this.paddleX - 20, paddleTop - 20, PADDLE_WIDTH + 40, 40);

    // Paddle
    ctx.fillStyle = COLORS.paddle;
    this.roundRect(ctx, this.paddleX, paddleTop, PADDLE_WIDTH, PADDLE_HEIGHT, 4);
    ctx.fill();

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

  private renderDeathFlash(): void {
    const { ctx } = this;
    ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    setTimeout(() => this.render(), 200);
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number, r: number,
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
