/**
 * Block Drop -- Tetris clone implementing GameBridge.
 *
 * Pure vanilla TypeScript. No React, no DOM dependencies beyond canvas.
 * Score = lines cleared (1=100, 2=300, 3=500, 4=800 "Tetris").
 * Death = piece spawns overlapping existing blocks.
 * Controls: Arrow keys to move/rotate, Space to hard drop.
 */

import type { GameBridge, GameBridgeCallbacks } from '@review-arcade/shared';

// Constants
const COLS = 10;
const ROWS = 20;
const INITIAL_DROP_INTERVAL = 800;
const MIN_DROP_INTERVAL = 100;
const SPEED_DECREASE = 20;

// Colors (RCNR brand)
const COLORS = {
  bg: '#0A1628',
  grid: '#0D1E33',
  ghost: 'rgba(153, 217, 217, 0.15)',
  text: '#99d9d9',
};

// Tetromino definitions: [rotation states][row][col]
const PIECES: Record<string, number[][][]> = {
  I: [
    [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
    [[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]],
    [[0,0,0,0],[0,0,0,0],[1,1,1,1],[0,0,0,0]],
    [[0,1,0,0],[0,1,0,0],[0,1,0,0],[0,1,0,0]],
  ],
  O: [
    [[1,1],[1,1]],
    [[1,1],[1,1]],
    [[1,1],[1,1]],
    [[1,1],[1,1]],
  ],
  T: [
    [[0,1,0],[1,1,1],[0,0,0]],
    [[0,1,0],[0,1,1],[0,1,0]],
    [[0,0,0],[1,1,1],[0,1,0]],
    [[0,1,0],[1,1,0],[0,1,0]],
  ],
  S: [
    [[0,1,1],[1,1,0],[0,0,0]],
    [[0,1,0],[0,1,1],[0,0,1]],
    [[0,0,0],[0,1,1],[1,1,0]],
    [[1,0,0],[1,1,0],[0,1,0]],
  ],
  Z: [
    [[1,1,0],[0,1,1],[0,0,0]],
    [[0,0,1],[0,1,1],[0,1,0]],
    [[0,0,0],[1,1,0],[0,1,1]],
    [[0,1,0],[1,1,0],[1,0,0]],
  ],
  J: [
    [[1,0,0],[1,1,1],[0,0,0]],
    [[0,1,1],[0,1,0],[0,1,0]],
    [[0,0,0],[1,1,1],[0,0,1]],
    [[0,1,0],[0,1,0],[1,1,0]],
  ],
  L: [
    [[0,0,1],[1,1,1],[0,0,0]],
    [[0,1,0],[0,1,0],[0,1,1]],
    [[0,0,0],[1,1,1],[1,0,0]],
    [[1,1,0],[0,1,0],[0,1,0]],
  ],
};

const PIECE_COLORS: Record<string, string> = {
  I: '#22D3EE', // cyan
  O: '#FBBF24', // yellow
  T: '#A855F7', // purple
  S: '#22C55E', // green
  Z: '#EF4444', // red
  J: '#3B82F6', // blue
  L: '#F97316', // orange
};

const PIECE_TYPES = Object.keys(PIECES);

interface ActivePiece {
  type: string;
  rotation: number;
  x: number;
  y: number;
}

export class BlockDropEngine implements GameBridge {
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private callbacks!: GameBridgeCallbacks;

  private cellSize = 0;
  private offsetX = 0;
  private offsetY = 0;
  private board: (string | null)[][] = [];
  private piece: ActivePiece | null = null;
  private nextType = '';
  private score = 0;
  private linesCleared = 0;
  private level = 1;
  private dropInterval = INITIAL_DROP_INTERVAL;
  private dropTimer = 0;
  private running = false;
  private paused = false;
  private gameOver = false;
  private animFrame = 0;
  private lastTime = 0;
  private bag: string[] = [];

  private boundKeyHandler: ((e: KeyboardEvent) => void) | null = null;

  mount(canvas: HTMLCanvasElement, callbacks: GameBridgeCallbacks): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.callbacks = callbacks;
    this.calculateLayout();
    this.reset();
    this.render();

    this.boundKeyHandler = this.handleKeyDown.bind(this);
    window.addEventListener('keydown', this.boundKeyHandler);
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
    if (this.boundKeyHandler) {
      window.removeEventListener('keydown', this.boundKeyHandler);
      this.boundKeyHandler = null;
    }
  }

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.calculateLayout();
    this.render();
  }

  // --- Private ---

  private calculateLayout(): void {
    const maxCellH = (this.canvas.height - 20) / ROWS;
    const maxCellW = (this.canvas.width * 0.6) / COLS;
    this.cellSize = Math.floor(Math.min(maxCellH, maxCellW));
    this.offsetX = Math.floor((this.canvas.width - COLS * this.cellSize) / 2);
    this.offsetY = Math.floor((this.canvas.height - ROWS * this.cellSize) / 2);
  }

  private reset(): void {
    this.gameOver = false;
    this.score = 0;
    this.linesCleared = 0;
    this.level = 1;
    this.dropInterval = INITIAL_DROP_INTERVAL;
    this.dropTimer = 0;
    this.bag = [];

    // Empty board
    this.board = [];
    for (let r = 0; r < ROWS; r++) {
      this.board.push(new Array(COLS).fill(null));
    }

    this.nextType = this.nextFromBag();
    this.spawnPiece();
    this.render();
  }

  private nextFromBag(): string {
    if (this.bag.length === 0) {
      // 7-bag randomizer
      this.bag = [...PIECE_TYPES];
      for (let i = this.bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
      }
    }
    return this.bag.pop()!;
  }

  private spawnPiece(): void {
    const type = this.nextType;
    this.nextType = this.nextFromBag();
    const shape = PIECES[type][0];
    const x = Math.floor((COLS - shape[0].length) / 2);

    this.piece = { type, rotation: 0, x, y: 0 };

    // Check if spawn position is blocked
    if (this.collides(this.piece)) {
      this.piece = null;
      this.die();
    }
  }

  private getShape(piece: ActivePiece): number[][] {
    return PIECES[piece.type][piece.rotation];
  }

  private collides(piece: ActivePiece): boolean {
    const shape = this.getShape(piece);
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const bx = piece.x + c;
        const by = piece.y + r;
        if (bx < 0 || bx >= COLS || by >= ROWS) return true;
        if (by >= 0 && this.board[by][bx] !== null) return true;
      }
    }
    return false;
  }

  private lockPiece(): void {
    if (!this.piece) return;
    const shape = this.getShape(this.piece);
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const by = this.piece.y + r;
        const bx = this.piece.x + c;
        if (by >= 0 && by < ROWS && bx >= 0 && bx < COLS) {
          this.board[by][bx] = this.piece.type;
        }
      }
    }

    // Clear lines
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (this.board[r].every((cell) => cell !== null)) {
        this.board.splice(r, 1);
        this.board.unshift(new Array(COLS).fill(null));
        cleared++;
        r++; // recheck same row
      }
    }

    if (cleared > 0) {
      const points = [0, 100, 300, 500, 800][cleared] || 800;
      this.score += points * this.level;
      this.linesCleared += cleared;
      this.level = Math.floor(this.linesCleared / 10) + 1;
      this.dropInterval = Math.max(MIN_DROP_INTERVAL, INITIAL_DROP_INTERVAL - (this.level - 1) * SPEED_DECREASE);
      this.callbacks.onScoreUpdate(this.score);

      if (cleared === 4) {
        this.callbacks.onSpecialEvent({
          type: 'tetris',
          score: this.score,
        });
      }
    }

    this.spawnPiece();
  }

  private getGhostY(): number {
    if (!this.piece) return 0;
    const test = { ...this.piece };
    while (!this.collides(test)) {
      test.y++;
    }
    return test.y - 1;
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.running || this.paused || this.gameOver || !this.piece) return;

    switch (e.key) {
      case 'ArrowLeft':
      case 'a':
      case 'A': {
        e.preventDefault();
        const test = { ...this.piece, x: this.piece.x - 1 };
        if (!this.collides(test)) this.piece.x--;
        break;
      }
      case 'ArrowRight':
      case 'd':
      case 'D': {
        e.preventDefault();
        const test = { ...this.piece, x: this.piece.x + 1 };
        if (!this.collides(test)) this.piece.x++;
        break;
      }
      case 'ArrowDown':
      case 's':
      case 'S': {
        e.preventDefault();
        const test = { ...this.piece, y: this.piece.y + 1 };
        if (!this.collides(test)) {
          this.piece.y++;
          this.score++;
          this.callbacks.onScoreUpdate(this.score);
        }
        break;
      }
      case 'ArrowUp':
      case 'w':
      case 'W': {
        e.preventDefault();
        this.rotatePiece();
        break;
      }
      case ' ': {
        e.preventDefault();
        // Hard drop
        let dropped = 0;
        while (!this.collides({ ...this.piece, y: this.piece.y + 1 })) {
          this.piece.y++;
          dropped++;
        }
        this.score += dropped * 2;
        this.callbacks.onScoreUpdate(this.score);
        this.lockPiece();
        break;
      }
    }

    this.render();
  }

  private rotatePiece(): void {
    if (!this.piece) return;
    const newRotation = (this.piece.rotation + 1) % 4;
    const test = { ...this.piece, rotation: newRotation };

    // Try basic rotation
    if (!this.collides(test)) {
      this.piece.rotation = newRotation;
      return;
    }

    // Wall kicks: try shifting left/right
    for (const offset of [-1, 1, -2, 2]) {
      test.x = this.piece.x + offset;
      if (!this.collides(test)) {
        this.piece.rotation = newRotation;
        this.piece.x = test.x;
        return;
      }
    }
  }

  private gameLoop(): void {
    if (!this.running || this.paused || this.gameOver) return;

    const now = performance.now();
    const dt = now - this.lastTime;
    this.lastTime = now;

    this.dropTimer += dt;
    if (this.dropTimer >= this.dropInterval) {
      this.dropTimer = 0;
      if (this.piece) {
        const test = { ...this.piece, y: this.piece.y + 1 };
        if (!this.collides(test)) {
          this.piece.y++;
        } else {
          this.lockPiece();
        }
      }
    }

    this.render();
    this.animFrame = requestAnimationFrame(() => this.gameLoop());
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
      lines_cleared: this.linesCleared,
      level: this.level,
      game: 'block-drop',
    });
  }

  // --- Rendering ---

  private render(): void {
    const { ctx, cellSize, offsetX, offsetY } = this;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Background
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, w, h);

    // Board border
    ctx.strokeStyle = '#1A3044';
    ctx.lineWidth = 2;
    ctx.strokeRect(offsetX - 1, offsetY - 1, COLS * cellSize + 2, ROWS * cellSize + 2);

    // Grid
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 0.5;
    for (let c = 0; c <= COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(offsetX + c * cellSize, offsetY);
      ctx.lineTo(offsetX + c * cellSize, offsetY + ROWS * cellSize);
      ctx.stroke();
    }
    for (let r = 0; r <= ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(offsetX, offsetY + r * cellSize);
      ctx.lineTo(offsetX + COLS * cellSize, offsetY + r * cellSize);
      ctx.stroke();
    }

    // Locked blocks
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const type = this.board[r][c];
        if (type) {
          this.renderCell(c, r, PIECE_COLORS[type]);
        }
      }
    }

    // Ghost piece
    if (this.piece) {
      const ghostY = this.getGhostY();
      const shape = this.getShape(this.piece);
      for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
          if (!shape[r][c]) continue;
          const bx = this.piece.x + c;
          const by = ghostY + r;
          if (by >= 0) {
            ctx.fillStyle = COLORS.ghost;
            ctx.fillRect(
              offsetX + bx * cellSize + 1,
              offsetY + by * cellSize + 1,
              cellSize - 2,
              cellSize - 2,
            );
          }
        }
      }

      // Active piece
      for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
          if (!shape[r][c]) continue;
          const bx = this.piece.x + c;
          const by = this.piece.y + r;
          if (by >= 0) {
            this.renderCell(bx, by, PIECE_COLORS[this.piece.type]);
          }
        }
      }
    }

    // Next piece preview
    this.renderNextPreview();

    // Level/lines display
    const infoX = offsetX + COLS * cellSize + 20;
    ctx.fillStyle = '#99d9d9';
    ctx.font = '12px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(153, 217, 217, 0.5)';
    ctx.fillText('LEVEL', infoX, offsetY + 120);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillText(String(this.level), infoX, offsetY + 135);

    ctx.fillStyle = 'rgba(153, 217, 217, 0.5)';
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText('LINES', infoX, offsetY + 170);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillText(String(this.linesCleared), infoX, offsetY + 185);

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

  private renderCell(col: number, row: number, color: string): void {
    const { ctx, cellSize, offsetX, offsetY } = this;
    const x = offsetX + col * cellSize;
    const y = offsetY + row * cellSize;
    const pad = 1;

    ctx.fillStyle = color;
    ctx.fillRect(x + pad, y + pad, cellSize - pad * 2, cellSize - pad * 2);

    // Highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(x + pad, y + pad, cellSize - pad * 2, 3);
    ctx.fillRect(x + pad, y + pad, 3, cellSize - pad * 2);

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(x + pad, y + cellSize - pad - 3, cellSize - pad * 2, 3);
    ctx.fillRect(x + cellSize - pad - 3, y + pad, 3, cellSize - pad * 2);
  }

  private renderNextPreview(): void {
    const { ctx, cellSize, offsetX, offsetY } = this;
    const infoX = offsetX + COLS * cellSize + 20;
    const previewY = offsetY + 10;

    ctx.fillStyle = 'rgba(153, 217, 217, 0.5)';
    ctx.font = '12px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('NEXT', infoX, previewY);

    const shape = PIECES[this.nextType][0];
    const previewSize = cellSize * 0.7;
    const color = PIECE_COLORS[this.nextType];

    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        ctx.fillStyle = color;
        ctx.fillRect(
          infoX + c * previewSize,
          previewY + 20 + r * previewSize,
          previewSize - 1,
          previewSize - 1,
        );
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
