/**
 * 游戏引擎统一导出
 * @module engines/index
 */

export { GameStateMachine, GameState, gameStateMachine } from './gameStateMachine.js';
export { EventDispatcher, eventDispatcher } from './eventDispatcher.js';
export { SimulationEngine } from './simulationEngine.js';
export {
  calculateCultivation,
  calculateBreakthrough,
  calculateCombat,
  calculateTermEffects,
  calculateTradePrice,
  calculateMaxLifespan,
} from './calculationEngine.js';
export { SeededRandom } from './seededRng.js';
export { SaveSystem, saveSystem, createEmptySaveData } from './saveSystem.js';
