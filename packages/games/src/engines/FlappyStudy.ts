/**
 * Flappy Study -- Flappy Bird clone implementing GameBridge.
 *
 * Pure vanilla TypeScript. No React, no DOM dependencies beyond canvas.
 * Score = number of pipe pairs passed (1 point each).
 * Death = hit pipe, ceiling, or floor.
 * Extreme death rate -- keeps question flow constant.
 */

import type { GameBridge, GameBridgeCallbacks } from '@review-arcade/shared';

// Physics
const GRAVITY = 0.5;
const FLAP_FORCE = -7;
const PIPE_SPEED = 2.5;
const PIPE_WIDTH = 52;
const PIPE_GAP = 140;
const PIPE_SPACING = 220;
const BIRD_SIZE = 24;
const BIRD_X = 80;

// Colors (RCNR brand)
const COLORS = {
  bg: '#0A1628',
  pipe: '#1A4040',
  pipe_cap: '#228888',
  pipe_highlight: '#2AADAD',
  bird: '#99d9d9',
  bird_wing: '#5BAAAA',
  bird_eye: '#0A1628',
  bird_beak: '#F5A623',
  floor: '#0D1E33',
  floor_line: '#1A3044',
  score_glow: 'rgba(153, 217, 217, 0.3)',
};

interface Pipe {
  x: number;
  gapY: number; // center of gap
  scored: boolean;
}

export class FlappyStudyEngine implements GameBridge {
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private callbacks!: GameBridgeCallbacks;

  private birdY = 0;
  private birdVelocity = 0;
  private birdRotation = 0;
  private pipes: Pipe[] = [];
  private score = 0;
  private running = false;
  private paused = false;
  private gameOver = false;
  private animFrame = 0;
  private frameCount = 0;

  private boundKeyHandler: ((e: KeyboardEvent) => void) | null = null;
  private boundClickHandler: ((e: MouseEvent) => void) | null = null;

  mount(canvas: HTMLCanvasElement, callbacks: GameBridgeCallbacks): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.callbacks = callbacks;
    this.reset();
    this.render();

    this.boundKeyHandler = this.handleKeyDown.bind(this);
    this.boundClickHandler = this.handleClick.bind(this);
    window.addEventListener('keydown', this.boundKeyHandler);
    canvas.addEventListener('click', this.boundClickHandler);
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
    if (this.boundClickHandler) {
      this.canvas.removeEventListener('click', this.boundClickHandler);
      this.boundClickHandler = null;
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
    this.birdY = this.canvas.height / 2;
    this.birdVelocity = 0;
    this.birdRotation = 0;
    this.pipes = [];
    this.frameCount = 0;

    // Spawn initial pipes
    for (let i = 0; i < 4; i++) {
      this.pipes.push(this.createPipe(this.canvas.width + 200 + i * PIPE_SPACING));
    }

    this.render();
  }

  private createPipe(x: number): Pipe {
    const minGapY = PIPE_GAP / 2 + 40;
    const maxGapY = this.canvas.height - PIPE_GAP / 2 - 60;
    const gapY = minGapY + Math.random() * (maxGapY - minGapY);
    return { x, gapY, scored: false };
  }

  private flap(): void {
    if (!this.running || this.paused || this.gameOver) return;
    this.birdVelocity = FLAP_FORCE;
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
      e.preventDefault();
      this.flap();
    }
  }

  private handleClick(): void {
    this.flap();
  }

  private gameLoop(): void {
    if (!this.running || this.paused || this.gameOver) return;

    this.update();
    this.render();

    this.animFrame = requestAnimationFrame(() => this.gameLoop());
  }

  private update(): void {
    this.frameCount++;

    // Bird physics
    this.birdVelocity += GRAVITY;
    this.birdY += this.birdVelocity;
    this.birdRotation = Math.min(Math.max(this.birdVelocity * 3, -30), 70);

    // Floor/ceiling collision
    if (this.birdY + BIRD_SIZE / 2 >= this.canvas.height - 30) {
      this.die();
      return;
    }
    if (this.birdY - BIRD_SIZE / 2 <= 0) {
      this.die();
      return;
    }

    // Move and check pipes
    for (const pipe of this.pipes) {
      pipe.x -= PIPE_SPEED;

      // Scoring
      if (!pipe.scored && pipe.x + PIPE_WIDTH < BIRD_X) {
        pipe.scored = true;
        this.score++;
        this.callbacks.onScoreUpdate(this.score);

        if (this.score % 25 === 0) {
          this.callbacks.onSpecialEvent({
            type: 'milestone',
            pipes: this.score,
            score: this.score,
          });
        }
      }

      // Collision detection
      if (
        BIRD_X + BIRD_SIZE / 2 > pipe.x &&
        BIRD_X - BIRD_SIZE / 2 < pipe.x + PIPE_WIDTH
      ) {
        const inGap =
          this.birdY - BIRD_SIZE / 2 > pipe.gapY - PIPE_GAP / 2 &&
          this.birdY + BIRD_SIZE / 2 < pipe.gapY + PIPE_GAP / 2;
        if (!inGap) {
          this.die();
          return;
        }
      }
    }

    // Recycle pipes
    if (this.pipes.length > 0 && this.pipes[0].x + PIPE_WIDTH < -10) {
      this.pipes.shift();
      const lastPipe = this.pipes[this.pipes.length - 1];
      this.pipes.push(this.createPipe(lastPipe.x + PIPE_SPACING));
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
      pipes_passed: this.score,
      game: 'flappy-study',
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

    // Pipes
    for (const pipe of this.pipes) {
      this.renderPipe(pipe);
    }

    // Floor
    ctx.fillStyle = COLORS.floor;
    ctx.fillRect(0, h - 30, w, 30);
    ctx.strokeStyle = COLORS.floor_line;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, h - 30);
    ctx.lineTo(w, h - 30);
    ctx.stroke();

    // Bird
    this.renderBird();

    // Game over overlay
    if (this.gameOver) {
      ctx.fillStyle = 'rgba(0, 12, 23, 0.6)';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#99d9d9';
      ctx.font = 'bold 24px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Answering question...', w / 2, h / 2);
    }
  }

  private renderPipe(pipe: Pipe): void {
    const { ctx } = this;
    const h = this.canvas.height;
    const capHeight = 20;
    const capOverhang = 4;

    // Top pipe body
    const topBottom = pipe.gapY - PIPE_GAP / 2;
    ctx.fillStyle = COLORS.pipe;
    ctx.fillRect(pipe.x, 0, PIPE_WIDTH, topBottom);
    // Top pipe cap
    ctx.fillStyle = COLORS.pipe_cap;
    ctx.fillRect(pipe.x - capOverhang, topBottom - capHeight, PIPE_WIDTH + capOverhang * 2, capHeight);
    // Highlight
    ctx.fillStyle = COLORS.pipe_highlight;
    ctx.fillRect(pipe.x + 4, 0, 4, topBottom - capHeight);

    // Bottom pipe body
    const botTop = pipe.gapY + PIPE_GAP / 2;
    ctx.fillStyle = COLORS.pipe;
    ctx.fillRect(pipe.x, botTop, PIPE_WIDTH, h - 30 - botTop);
    // Bottom pipe cap
    ctx.fillStyle = COLORS.pipe_cap;
    ctx.fillRect(pipe.x - capOverhang, botTop, PIPE_WIDTH + capOverhang * 2, capHeight);
    // Highlight
    ctx.fillStyle = COLORS.pipe_highlight;
    ctx.fillRect(pipe.x + 4, botTop + capHeight, 4, h - 30 - botTop - capHeight);
  }

  private renderBird(): void {
    const { ctx } = this;

    ctx.save();
    ctx.translate(BIRD_X, this.birdY);
    ctx.rotate((this.birdRotation * Math.PI) / 180);

    // Body
    ctx.fillStyle = COLORS.bird;
    ctx.beginPath();
    ctx.ellipse(0, 0, BIRD_SIZE / 2, BIRD_SIZE / 2.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Wing (animated)
    const wingOffset = Math.sin(this.frameCount * 0.3) * 3;
    ctx.fillStyle = COLORS.bird_wing;
    ctx.beginPath();
    ctx.ellipse(-2, wingOffset, 8, 5, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // Eye
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(6, -4, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.bird_eye;
    ctx.beginPath();
    ctx.arc(7, -4, 2, 0, Math.PI * 2);
    ctx.fill();

    // Beak
    ctx.fillStyle = COLORS.bird_beak;
    ctx.beginPath();
    ctx.moveTo(BIRD_SIZE / 2, -2);
    ctx.lineTo(BIRD_SIZE / 2 + 8, 1);
    ctx.lineTo(BIRD_SIZE / 2, 4);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  private renderDeathFlash(): void {
    const { ctx } = this;
    ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    setTimeout(() => this.render(), 200);
  }
}
