/**
 * Game Engine Registry
 *
 * Maps GameType to engine factory functions.
 * Add new games here as they're implemented.
 */

import type { GameBridge, GameType } from '@review-arcade/shared';
import { SnakePitEngine } from './SnakePit';

type GameFactory = () => GameBridge;

const GAME_ENGINES: Partial<Record<GameType, GameFactory>> = {
  'snake-pit': () => new SnakePitEngine(),
  // TODO: Add more game engines as implemented
  // 'brick-breaker': () => new BrickBreakerEngine(),
  // 'dino-dash': () => new DinoDashEngine(),
  // 'space-rocks': () => new SpaceRocksEngine(),
  // 'maze-muncher': () => new MazeMuncherEngine(),
  // 'frog-crossing': () => new FrogCrossingEngine(),
  // 'alien-invasion': () => new AlienInvasionEngine(),
  // 'block-drop': () => new BlockDropEngine(),
  // 'flappy-study': () => new FlappyStudyEngine(),
  // 'rhythm-rush': () => new RhythmRushEngine(),
};

export function getGameFactory(gameType: GameType): GameFactory | null {
  return GAME_ENGINES[gameType] ?? null;
}

export function isGameImplemented(gameType: GameType): boolean {
  return gameType in GAME_ENGINES;
}

export { SnakePitEngine };
