/**
 * 游戏状态机 - 管理游戏全局状态流转
 * @module engines/gameStateMachine
 */

import { eventBus } from '../utils/eventBus.js';

/**
 * 游戏状态枚举
 */
export const GameState = Object.freeze({
  LOADING: 'loading',
  MAIN_MENU: 'main_menu',
  NEW_GAME: 'new_game',
  REALITY: 'reality',
  SIMULATION_SELECT: 'sim_select',
  SIMULATION: 'simulation',
  SIMULATION_SETTLE: 'sim_settle',
  CHARACTER_PANEL: 'character',
  INVENTORY: 'inventory',
  MEMORY_SEA: 'memory_sea',
  NPC_DIALOGUE: 'npc_dialogue',
  SETTINGS: 'settings',
  ACHIEVEMENT: 'achievement',
});

/**
 * @typedef {object} StateTransition
 * @property {string} from - 源状态（'*' 表示任意状态）
 * @property {string} to - 目标状态
 * @property {Function} [guard] - 转换守卫
 * @property {Function} [onEnter] - 进入钩子
 * @property {Function} [onExit] - 离开钩子
 */

/**
 * 游戏状态机类
 */
export class GameStateMachine {
  constructor() {
    /** @type {string} 当前状态 */
    this._currentState = GameState.LOADING;
    /** @type {string|null} 前驱状态（用于从设置返回） */
    this._previousState = null;
    /** @type {StateTransition[]} 状态转换规则列表 */
    this._transitions = [];
    /** @type {Set<string>} 有效状态集合 */
    this._validStates = new Set(Object.values(GameState));

    // 初始化默认转换规则
    this._initDefaultTransitions();
  }

  /**
   * 初始化默认的状态转换规则
   * @private
   */
  _initDefaultTransitions() {
    const T = [
      { from: GameState.LOADING, to: GameState.MAIN_MENU },
      { from: GameState.MAIN_MENU, to: GameState.NEW_GAME },
      { from: GameState.MAIN_MENU, to: GameState.REALITY },
      { from: GameState.NEW_GAME, to: GameState.REALITY },
      { from: GameState.REALITY, to: GameState.SIMULATION_SELECT },
      { from: GameState.SIMULATION_SELECT, to: GameState.SIMULATION },
      { from: GameState.SIMULATION, to: GameState.SIMULATION_SETTLE },
      { from: GameState.SIMULATION_SETTLE, to: GameState.REALITY },
      { from: GameState.REALITY, to: GameState.CHARACTER_PANEL },
      { from: GameState.CHARACTER_PANEL, to: GameState.REALITY },
      { from: GameState.REALITY, to: GameState.INVENTORY },
      { from: GameState.INVENTORY, to: GameState.REALITY },
      { from: GameState.REALITY, to: GameState.MEMORY_SEA },
      { from: GameState.MEMORY_SEA, to: GameState.REALITY },
      { from: GameState.REALITY, to: GameState.NPC_DIALOGUE },
      { from: GameState.NPC_DIALOGUE, to: GameState.REALITY },
      { from: GameState.REALITY, to: GameState.ACHIEVEMENT },
      { from: GameState.ACHIEVEMENT, to: GameState.REALITY },
      // 设置可从任意状态进入
      { from: '*', to: GameState.SETTINGS },
      // 返回主菜单（任意状态）
      { from: '*', to: GameState.MAIN_MENU },
    ];
    this._transitions = T;
  }

  /**
   * 获取当前状态
   * @returns {string}
   */
  getCurrentState() {
    return this._currentState;
  }

  /**
   * 获取前驱状态
   * @returns {string|null}
   */
  getPreviousState() {
    return this._previousState;
  }

  /**
   * 检查是否可以转换到目标状态
   * @param {string} targetState - 目标状态
   * @returns {boolean}
   */
  canTransition(targetState) {
    if (!this._validStates.has(targetState)) return false;

    return this._transitions.some(t => {
      const fromMatch = t.from === '*' || t.from === this._currentState;
      const toMatch = t.to === targetState;
      if (!fromMatch || !toMatch) return false;
      // 检查守卫
      if (t.guard && typeof t.guard === 'function') {
        return t.guard();
      }
      return true;
    });
  }

  /**
   * 执行状态转换
   * @param {string} targetState - 目标状态
   * @returns {boolean} 转换是否成功
   */
  transition(targetState) {
    const transitionRule = this._findTransitionRule(this._currentState, targetState);
    if (!transitionRule) {
      console.warn(`[StateMachine] 不允许从 "${this._currentState}" 转换到 "${targetState}"`);
      return false;
    }

    // 执行守卫检查
    if (transitionRule.guard && !transitionRule.guard()) {
      console.warn(`[StateMachine] 转换守卫阻止: "${this._currentState}" -> "${targetState}"`);
      return false;
    }

    const fromState = this._currentState;

    // 执行离开钩子
    if (transitionRule.onExit) {
      try {
        transitionRule.onExit();
      } catch (err) {
        console.error('[StateMachine] onExit 执行错误:', err);
      }
    }

    // 状态切换
    this._currentState = targetState;

    // 执行进入钩子
    if (transitionRule.onEnter) {
      try {
        transitionRule.onEnter();
      } catch (err) {
        console.error('[StateMachine] onEnter 执行错误:', err);
      }
    }

    // 广播状态变更事件
    eventBus.emit('state:changed', { from: fromState, to: targetState });
    eventBus.emit(`state:enter:${targetState}`, { from: fromState });
    eventBus.emit(`state:exit:${fromState}`, { to: targetState });

    return true;
  }

  /**
   * 进入设置界面（自动记录前驱状态）
   */
  openSettings() {
    if (this._currentState !== GameState.SETTINGS) {
      this._previousState = this._currentState;
      this.transition(GameState.SETTINGS);
    }
  }

  /**
   * 关闭设置，返回之前的状态
   */
  closeSettings() {
    if (this._currentState === GameState.SETTINGS) {
      const target = this._previousState || GameState.MAIN_MENU;
      this._previousState = null;
      this.transition(target);
    }
  }

  /**
   * 强制设置状态（绕过转换规则，用于恢复存档等场景）
   * @param {string} state - 目标状态
   */
  forceState(state) {
    if (!this._validStates.has(state)) {
      throw new Error(`[StateMachine] 无效的状态: ${state}`);
    }
    const fromState = this._currentState;
    this._currentState = state;
    eventBus.emit('state:changed', { from: fromState, to: state, forced: true });
  }

  /**
   * 添加自定义状态转换规则
   * @param {StateTransition} rule - 转换规则
   */
  addTransition(rule) {
    if (!rule.from || !rule.to) {
      throw new Error('[StateMachine] 转换规则必须包含 from 和 to');
    }
    this._transitions.push(rule);
  }

  /**
   * 查找匹配的状态转换规则
   * @param {string} from - 源状态
   * @param {string} to - 目标状态
   * @returns {StateTransition|null}
   * @private
   */
  _findTransitionRule(from, to) {
    // 优先匹配精确规则
    const exact = this._transitions.find(t => t.from === from && t.to === to);
    if (exact) return exact;
    // 然后匹配通配规则
    const wildcard = this._transitions.find(t => t.from === '*' && t.to === to);
    return wildcard || null;
  }
}

/** 全局状态机单例 */
export const gameStateMachine = new GameStateMachine();
export default gameStateMachine;
