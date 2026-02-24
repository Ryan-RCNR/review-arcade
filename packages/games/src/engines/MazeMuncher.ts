/**
 * Maze Muncher -- Pac-Man clone implementing GameBridge.
 *
 * Pure vanilla TypeScript. No React, no DOM dependencies beyond canvas.
 * Score = dots eaten (10 pts each) + power pellets (50 pts) + ghosts (200 pts).
 * Death = ghost collision (without power-up).
 * Controls: Arrow keys to change direction.
 */

import type { GameBridge, GameBridgeCallbacks } from '@review-arcade/shared';

// Constants
const CELL = 20;
const PLAYER_SPEED = 2;
const GHOST_SPEED = 1.6;
const GHOST_SCARED_SPEED = 1;
const POWER_DURATION = 300; // frames
const GHOST_COUNT = 4;

// Colors (RCNR brand)
const COLORS = {
  bg: '#0A1628',
  wall: '#1A3A6A',
  wall_stroke: '#3B6BCA',
  dot: '#99d9d9',
  power: '#F5A623',
  player: '#FBBF24',
  player_mouth: '#0A1628',
  ghost_scared: '#3B82F6',
  ghost_eyes: '#fff',
  ghost_pupils: '#0A1628',
  text: '#99d9d9',
};

const GHOST_COLORS = ['#EF4444', '#F472B6', '#22D3EE', '#F97316'];

// Simple maze layout (1=wall, 0=path, 2=dot, 3=power pellet, 4=empty)
// 21 cols x 21 rows
const MAZE_TEMPLATE = [
  '111111111111111111111',
  '120000000010000000021',
  '101110111010111011101',
  '100000000000000000001',
  '101110101111101011101',
  '100000100010001000001',
  '111110111010111011111',
  '000010100000001010000',
  '111110101111101011111',
  '000000000000000000000',
  '111110101111101011111',
  '000010100000001010000',
  '111110101111101011111',
  '100000000010000000001',
  '101110111010111011101',
  '130010000000000010031',
  '110110101111101011011',
  '100000100010001000001',
  '101111111010111111101',
  '120000000000000000021',
  '111111111111111111111',
];

const MAZE_ROWS = MAZE_TEMPLATE.length;
const MAZE_COLS = MAZE_TEMPLATE[0].length;

type Direction = 'up' | 'down' | 'left' | 'right' | null;

interface Ghost {
  x: number;
  y: number;
  dir: Direction;
  color: string;
  scared: boolean;
  eaten: boolean;
}

export class MazeMuncherEngine implements GameBridge {
  private canvas!: HTMLCanvasElement;
  private ctx!: CanvasRenderingContext2D;
  private callbacks!: GameBridgeCallbacks;

  private offsetX = 0;
  private offsetY = 0;
  private maze: number[][] = [];
  private playerX = 0;
  private playerY = 0;
  private playerDir: Direction = 'right';
  private nextDir: Direction = null;
  private mouthAngle = 0;
  private mouthDir = 1;
  private ghosts: Ghost[] = [];
  private powerTimer = 0;
  private score = 0;
  private dotsTotal = 0;
  private dotsEaten = 0;
  private running = false;
  private paused = false;
  private gameOver = false;
  private animFrame = 0;
  private frameCount = 0;

  private boundKeyHandler: ((e: KeyboardEvent) => void) | null = null;

  mount(canvas: HTMLCanvasElement, callbacks: GameBridgeCallbacks): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.callbacks = callbacks;
    this.calculateOffset();
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
    this.calculateOffset();
    this.render();
  }

  // --- Private ---

  private calculateOffset(): void {
    this.offsetX = Math.floor((this.canvas.width - MAZE_COLS * CELL) / 2);
    this.offsetY = Math.floor((this.canvas.height - MAZE_ROWS * CELL) / 2);
  }

  private reset(): void {
    this.gameOver = false;
    this.score = 0;
    this.dotsEaten = 0;
    this.dotsTotal = 0;
    this.powerTimer = 0;
    this.frameCount = 0;
    this.mouthAngle = 0;
    this.mouthDir = 1;

    // Parse maze
    this.maze = [];
    for (let r = 0; r < MAZE_ROWS; r++) {
      this.maze[r] = [];
      for (let c = 0; c < MAZE_COLS; c++) {
        const ch = MAZE_TEMPLATE[r][c];
        const val = parseInt(ch, 10);
        this.maze[r][c] = val;
        if (val === 2 || val === 3) this.dotsTotal++;
      }
    }

    // Player start (center bottom area)
    this.playerX = 10 * CELL + CELL / 2;
    this.playerY = 15 * CELL + CELL / 2;
    this.playerDir = 'right';
    this.nextDir = null;

    // Ghosts start in center
    this.ghosts = [];
    for (let i = 0; i < GHOST_COUNT; i++) {
      this.ghosts.push({
        x: (9 + i) * CELL + CELL / 2,
        y: 9 * CELL + CELL / 2,
        dir: ['up', 'down', 'left', 'right'][i] as Direction,
        color: GHOST_COLORS[i],
        scared: false,
        eaten: false,
      });
    }

    this.render();
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.running || this.paused || this.gameOver) return;

    switch (e.key) {
      case 'ArrowUp': case 'w': case 'W':
        e.preventDefault(); this.nextDir = 'up'; break;
      case 'ArrowDown': case 's': case 'S':
        e.preventDefault(); this.nextDir = 'down'; break;
      case 'ArrowLeft': case 'a': case 'A':
        e.preventDefault(); this.nextDir = 'left'; break;
      case 'ArrowRight': case 'd': case 'D':
        e.preventDefault(); this.nextDir = 'right'; break;
    }
  }

  private canMove(px: number, py: number, dir: Direction): boolean {
    if (!dir) return false;
    let nx = px, ny = py;
    const step = 2;
    switch (dir) {
      case 'up': ny -= step; break;
      case 'down': ny += step; break;
      case 'left': nx -= step; break;
      case 'right': nx += step; break;
    }

    // Check corners of hitbox
    const half = CELL / 2 - 2;
    const points = [
      { x: nx - half, y: ny - half },
      { x: nx + half, y: ny - half },
      { x: nx - half, y: ny + half },
      { x: nx + half, y: ny + half },
    ];

    for (const p of points) {
      const col = Math.floor(p.x / CELL);
      const row = Math.floor(p.y / CELL);
      if (row < 0 || row >= MAZE_ROWS || col < 0 || col >= MAZE_COLS) {
        // Allow wrapping through tunnel
        continue;
      }
      if (this.maze[row][col] === 1) return false;
    }
    return true;
  }

  private gameLoop(): void {
    if (!this.running || this.paused || this.gameOver) return;
    this.frameCount++;
    this.update();
    this.render();
    this.animFrame = requestAnimationFrame(() => this.gameLoop());
  }

  private update(): void {
    // Animate mouth
    this.mouthAngle += 0.08 * this.mouthDir;
    if (this.mouthAngle > 0.4 || this.mouthAngle < 0) this.mouthDir *= -1;

    // Power timer
    if (this.powerTimer > 0) {
      this.powerTimer--;
      if (this.powerTimer === 0) {
        for (const ghost of this.ghosts) {
          ghost.scared = false;
        }
      }
    }

    // Try direction change
    if (this.nextDir && this.canMove(this.playerX, this.playerY, this.nextDir)) {
      this.playerDir = this.nextDir;
      this.nextDir = null;
    }

    // Move player
    if (this.playerDir && this.canMove(this.playerX, this.playerY, this.playerDir)) {
      switch (this.playerDir) {
        case 'up': this.playerY -= PLAYER_SPEED; break;
        case 'down': this.playerY += PLAYER_SPEED; break;
        case 'left': this.playerX -= PLAYER_SPEED; break;
        case 'right': this.playerX += PLAYER_SPEED; break;
      }
    }

    // Wrap tunnel
    if (this.playerX < -CELL / 2) this.playerX = MAZE_COLS * CELL - CELL / 2;
    if (this.playerX > MAZE_COLS * CELL - CELL / 2) this.playerX = -CELL / 2;

    // Eat dots
    const col = Math.floor(this.playerX / CELL);
    const row = Math.floor(this.playerY / CELL);
    if (row >= 0 && row < MAZE_ROWS && col >= 0 && col < MAZE_COLS) {
      const tile = this.maze[row][col];
      if (tile === 2) {
        this.maze[row][col] = 4;
        this.score += 10;
        this.dotsEaten++;
        this.callbacks.onScoreUpdate(this.score);
      } else if (tile === 3) {
        this.maze[row][col] = 4;
        this.score += 50;
        this.dotsEaten++;
        this.callbacks.onScoreUpdate(this.score);
        // Power up!
        this.powerTimer = POWER_DURATION;
        for (const ghost of this.ghosts) {
          if (!ghost.eaten) ghost.scared = true;
        }
      }

      // All dots eaten
      if (this.dotsEaten >= this.dotsTotal) {
        this.callbacks.onSpecialEvent({
          type: 'level_clear',
          score: this.score,
        });
        this.resetDots();
      }
    }

    // Move ghosts
    for (const ghost of this.ghosts) {
      if (ghost.eaten) continue;
      this.moveGhost(ghost);
    }

    // Ghost collision
    for (const ghost of this.ghosts) {
      if (ghost.eaten) continue;
      const dist = Math.hypot(ghost.x - this.playerX, ghost.y - this.playerY);
      if (dist < CELL * 0.8) {
        if (ghost.scared) {
          ghost.eaten = true;
          this.score += 200;
          this.callbacks.onScoreUpdate(this.score);
        } else {
          this.die();
          return;
        }
      }
    }
  }

  private resetDots(): void {
    this.dotsEaten = 0;
    this.dotsTotal = 0;
    for (let r = 0; r < MAZE_ROWS; r++) {
      for (let c = 0; c < MAZE_COLS; c++) {
        if (this.maze[r][c] === 4) {
          const ch = MAZE_TEMPLATE[r][c];
          const orig = parseInt(ch, 10);
          if (orig === 2 || orig === 3) {
            this.maze[r][c] = orig;
            this.dotsTotal++;
          }
        }
        if (this.maze[r][c] === 2 || this.maze[r][c] === 3) this.dotsTotal++;
      }
    }
    // Reset ghosts
    for (let i = 0; i < this.ghosts.length; i++) {
      this.ghosts[i].x = (9 + i) * CELL + CELL / 2;
      this.ghosts[i].y = 9 * CELL + CELL / 2;
      this.ghosts[i].eaten = false;
      this.ghosts[i].scared = false;
    }
  }

  private moveGhost(ghost: Ghost): void {
    const speed = ghost.scared ? GHOST_SCARED_SPEED : GHOST_SPEED;
    const dirs: Direction[] = ['up', 'down', 'left', 'right'];
    const opposite: Record<string, Direction> = { up: 'down', down: 'up', left: 'right', right: 'left' };

    // At grid intersection, choose new direction
    const atIntersection =
      Math.abs(ghost.x % CELL - CELL / 2) < speed &&
      Math.abs(ghost.y % CELL - CELL / 2) < speed;

    if (atIntersection || !ghost.dir || !this.canMoveGhost(ghost.x, ghost.y, ghost.dir)) {
      // Snap to grid
      ghost.x = Math.round(ghost.x / CELL) * CELL + CELL / 2;
      ghost.y = Math.round(ghost.y / CELL) * CELL + CELL / 2;

      // Find valid directions (exclude reverse)
      const valid = dirs.filter((d) => {
        if (d === opposite[ghost.dir!]) return false;
        return this.canMoveGhost(ghost.x, ghost.y, d);
      });

      if (valid.length === 0) {
        // Dead end: reverse
        ghost.dir = opposite[ghost.dir!] || 'up';
      } else if (ghost.scared) {
        // Random when scared
        ghost.dir = valid[Math.floor(Math.random() * valid.length)];
      } else {
        // Chase: pick direction that moves toward player
        let bestDir = valid[0];
        let bestDist = Infinity;
        for (const d of valid) {
          let nx = ghost.x, ny = ghost.y;
          switch (d) {
            case 'up': ny -= CELL; break;
            case 'down': ny += CELL; break;
            case 'left': nx -= CELL; break;
            case 'right': nx += CELL; break;
          }
          const dist = Math.hypot(nx - this.playerX, ny - this.playerY);
          if (dist < bestDist) {
            bestDist = dist;
            bestDir = d;
          }
        }
        // Some randomness to avoid deadlocks
        ghost.dir = Math.random() < 0.3
          ? valid[Math.floor(Math.random() * valid.length)]
          : bestDir;
      }
    }

    // Move
    switch (ghost.dir) {
      case 'up': ghost.y -= speed; break;
      case 'down': ghost.y += speed; break;
      case 'left': ghost.x -= speed; break;
      case 'right': ghost.x += speed; break;
    }

    // Wrap
    if (ghost.x < -CELL / 2) ghost.x = MAZE_COLS * CELL - CELL / 2;
    if (ghost.x > MAZE_COLS * CELL - CELL / 2) ghost.x = -CELL / 2;
  }

  private canMoveGhost(gx: number, gy: number, dir: Direction): boolean {
    if (!dir) return false;
    let nx = gx, ny = gy;
    const step = CELL / 2;
    switch (dir) {
      case 'up': ny -= step; break;
      case 'down': ny += step; break;
      case 'left': nx -= step; break;
      case 'right': nx += step; break;
    }
    const col = Math.floor(nx / CELL);
    const row = Math.floor(ny / CELL);
    if (row < 0 || row >= MAZE_ROWS || col < 0 || col >= MAZE_COLS) return true; // tunnel
    return this.maze[row][col] !== 1;
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
      dots_eaten: this.dotsEaten,
      game: 'maze-muncher',
    });
  }

  // --- Rendering ---

  private render(): void {
    const { ctx, offsetX, offsetY } = this;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Background
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(offsetX, offsetY);

    // Maze walls and dots
    for (let r = 0; r < MAZE_ROWS; r++) {
      for (let c = 0; c < MAZE_COLS; c++) {
        const tile = this.maze[r][c];
        const x = c * CELL;
        const y = r * CELL;

        if (tile === 1) {
          ctx.fillStyle = COLORS.wall;
          ctx.fillRect(x, y, CELL, CELL);
          // Wall edge glow
          ctx.strokeStyle = COLORS.wall_stroke;
          ctx.lineWidth = 1;
          // Only draw edges adjacent to non-wall
          if (r > 0 && this.maze[r - 1][c] !== 1) {
            ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + CELL, y); ctx.stroke();
          }
          if (r < MAZE_ROWS - 1 && this.maze[r + 1][c] !== 1) {
            ctx.beginPath(); ctx.moveTo(x, y + CELL); ctx.lineTo(x + CELL, y + CELL); ctx.stroke();
          }
          if (c > 0 && this.maze[r][c - 1] !== 1) {
            ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + CELL); ctx.stroke();
          }
          if (c < MAZE_COLS - 1 && this.maze[r][c + 1] !== 1) {
            ctx.beginPath(); ctx.moveTo(x + CELL, y); ctx.lineTo(x + CELL, y + CELL); ctx.stroke();
          }
        } else if (tile === 2) {
          // Dot
          ctx.fillStyle = COLORS.dot;
          ctx.beginPath();
          ctx.arc(x + CELL / 2, y + CELL / 2, 2, 0, Math.PI * 2);
          ctx.fill();
        } else if (tile === 3) {
          // Power pellet (pulsing)
          const pulse = 3 + Math.sin(this.frameCount * 0.1) * 1.5;
          ctx.fillStyle = COLORS.power;
          ctx.beginPath();
          ctx.arc(x + CELL / 2, y + CELL / 2, pulse, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Ghosts
    for (const ghost of this.ghosts) {
      if (ghost.eaten) continue;
      this.renderGhost(ghost);
    }

    // Player
    this.renderPlayer();

    ctx.restore();

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
    const x = this.playerX;
    const y = this.playerY;
    const r = CELL / 2 - 2;

    let startAngle = 0;
    switch (this.playerDir) {
      case 'right': startAngle = 0; break;
      case 'down': startAngle = Math.PI / 2; break;
      case 'left': startAngle = Math.PI; break;
      case 'up': startAngle = -Math.PI / 2; break;
    }

    ctx.fillStyle = COLORS.player;
    ctx.beginPath();
    ctx.arc(x, y, r, startAngle + this.mouthAngle, startAngle + Math.PI * 2 - this.mouthAngle);
    ctx.lineTo(x, y);
    ctx.fill();
  }

  private renderGhost(ghost: Ghost): void {
    const { ctx } = this;
    const x = ghost.x;
    const y = ghost.y;
    const r = CELL / 2 - 2;

    // Body
    ctx.fillStyle = ghost.scared
      ? (this.powerTimer < 60 && this.frameCount % 10 < 5 ? '#fff' : COLORS.ghost_scared)
      : ghost.color;
    ctx.beginPath();
    ctx.arc(x, y - 2, r, Math.PI, 0);
    ctx.lineTo(x + r, y + r - 2);
    // Wavy bottom
    const wave = r * 2 / 3;
    ctx.lineTo(x + r - wave / 2, y + r / 2);
    ctx.lineTo(x + r - wave, y + r - 2);
    ctx.lineTo(x, y + r / 2);
    ctx.lineTo(x - r + wave, y + r - 2);
    ctx.lineTo(x - r + wave / 2, y + r / 2);
    ctx.lineTo(x - r, y + r - 2);
    ctx.fill();

    // Eyes
    if (!ghost.scared) {
      ctx.fillStyle = COLORS.ghost_eyes;
      ctx.beginPath();
      ctx.ellipse(x - 4, y - 3, 4, 5, 0, 0, Math.PI * 2);
      ctx.ellipse(x + 4, y - 3, 4, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      // Pupils (look toward player)
      const angle = Math.atan2(this.playerY - ghost.y, this.playerX - ghost.x);
      ctx.fillStyle = COLORS.ghost_pupils;
      ctx.beginPath();
      ctx.arc(x - 4 + Math.cos(angle) * 2, y - 3 + Math.sin(angle) * 2, 2, 0, Math.PI * 2);
      ctx.arc(x + 4 + Math.cos(angle) * 2, y - 3 + Math.sin(angle) * 2, 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Scared face
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(x - 4, y - 3, 2, 0, Math.PI * 2);
      ctx.arc(x + 4, y - 3, 2, 0, Math.PI * 2);
      ctx.fill();
      // Wavy mouth
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x - 5, y + 3);
      ctx.lineTo(x - 3, y + 1);
      ctx.lineTo(x, y + 3);
      ctx.lineTo(x + 3, y + 1);
      ctx.lineTo(x + 5, y + 3);
      ctx.stroke();
    }
  }

  private renderDeathFlash(): void {
    const { ctx } = this;
    ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    setTimeout(() => this.render(), 200);
  }
}
