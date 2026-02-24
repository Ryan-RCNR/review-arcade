/**
 * Game Engine Registry
 *
 * Maps GameType to engine factory functions.
 * All 10 games implemented.
 */

import type { GameBridge, GameType } from '@review-arcade/shared';
import { SnakePitEngine } from './SnakePit';
import { FlappyStudyEngine } from './FlappyStudy';
import { DinoDashEngine } from './DinoDash';
import { BrickBreakerEngine } from './BrickBreaker';
import { AlienInvasionEngine } from './AlienInvasion';
import { SpaceRocksEngine } from './SpaceRocks';
import { BlockDropEngine } from './BlockDrop';
import { FrogCrossingEngine } from './FrogCrossing';
import { MazeMuncherEngine } from './MazeMuncher';
import { RhythmRushEngine } from './RhythmRush';

type GameFactory = () => GameBridge;

const GAME_ENGINES: Record<GameType, GameFactory> = {
  'snake-pit': () => new SnakePitEngine(),
  'flappy-study': () => new FlappyStudyEngine(),
  'dino-dash': () => new DinoDashEngine(),
  'brick-breaker': () => new BrickBreakerEngine(),
  'alien-invasion': () => new AlienInvasionEngine(),
  'space-rocks': () => new SpaceRocksEngine(),
  'block-drop': () => new BlockDropEngine(),
  'frog-crossing': () => new FrogCrossingEngine(),
  'maze-muncher': () => new MazeMuncherEngine(),
  'rhythm-rush': () => new RhythmRushEngine(),
};

export function getGameFactory(gameType: GameType): GameFactory {
  return GAME_ENGINES[gameType];
}

export function isGameImplemented(gameType: GameType): boolean {
  return gameType in GAME_ENGINES;
}

export {
  SnakePitEngine,
  FlappyStudyEngine,
  DinoDashEngine,
  BrickBreakerEngine,
  AlienInvasionEngine,
  SpaceRocksEngine,
  BlockDropEngine,
  FrogCrossingEngine,
  MazeMuncherEngine,
  RhythmRushEngine,
};
