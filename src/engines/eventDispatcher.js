/**
 * 事件调度器 - 从事件库中筛选、加权、选取下一个要触发的事件
 * @module engines/eventDispatcher
 */

import { evaluateCondition, evaluateConditions } from '../models/event.js';
import { weightedRandom } from '../utils/helpers.js';

/**
 * 事件调度器类
 */
export class EventDispatcher {
  constructor() {
    /** @type {Map<string, object>} 事件注册表 */
    this._eventRegistry = new Map();
    /** @type {Map<string, number>} 事件冷却表 { eventId: cooldownEndYear } */
    this._cooldowns = new Map();
    /** @type {Map<string, number>} 事件触发计数 { eventId: count } */
    this._triggerCounts = new Map();
  }

  /**
   * 注册事件到事件池
   * @param {object} eventDef - 事件定义
   */
  registerEvent(eventDef) {
    this._eventRegistry.set(eventDef.id, eventDef);
  }

  /**
   * 批量注册事件
   * @param {Array} eventDefs - 事件定义数组
   */
  registerEvents(eventDefs) {
    for (const def of eventDefs) {
      this.registerEvent(def);
    }
  }

  /**
   * 从事件库中选取下一个事件
   * @param {object} context - 当前游戏上下文
   * @param {string} [category] - 期望的事件分类（可选）
   * @returns {object|null} 选中的事件定义，无候选时返回null
   */
  selectNextEvent(context, category) {
    // Step 1: 筛选所有满足触发条件的事件
    const candidates = this._filterCandidates(context, category);

    if (candidates.length === 0) return null;

    // Step 2: 计算加权概率
    const weights = candidates.map(event => this.calculateWeight(event, context));

    // Step 3: 加权随机选取
    return weightedRandom(candidates, weights, context.rng);
  }

  /**
   * 筛选候选事件
   * @param {object} context - 游戏上下文
   * @param {string} [category] - 分类过滤
   * @returns {Array} 候选事件列表
   * @private
   */
  _filterCandidates(context, category) {
    const candidates = [];

    for (const event of this._eventRegistry.values()) {
      // 场景匹配
      if (event.scene !== 'both' && event.scene !== context.currentScene) continue;

      // 分类过滤
      if (category && event.category !== category) continue;

      // 冷却检查
      if (this.isInCooldown(event.id, context.currentYear)) continue;

      // 触发次数检查
      if (event.maxTriggerCount !== null && event.maxTriggerCount !== undefined) {
        const count = this.getTriggerCount(event.id);
        if (count >= event.maxTriggerCount) continue;
      }

      // 前置事件检查
      if (event.prerequisiteEvents && event.prerequisiteEvents.length > 0) {
        const allDone = event.prerequisiteEvents.every(
          eid => context.completedEvents.includes(eid)
        );
        if (!allDone) continue;
      }

      // 条件判定
      if (event.triggerConditions && event.triggerConditions.length > 0) {
        if (!evaluateConditions(event.triggerConditions, context.player, context)) continue;
      }

      candidates.push(event);
    }

    return candidates;
  }

  /**
   * 计算事件最终权重
   * @param {object} event - 事件定义
   * @param {object} context - 游戏上下文
   * @returns {number} 最终权重值
   */
  calculateWeight(event, context) {
    let weight = event.weight || 10;

    // 应用权重修正
    if (event.weightModifiers && event.weightModifiers.length > 0) {
      for (const mod of event.weightModifiers) {
        if (evaluateCondition(mod.condition, context.player, context)) {
          weight *= mod.multiplier;
        }
      }
    }

    // 气运影响：气运越高，奇遇类事件权重越高
    if (event.category === 'adventure') {
      weight *= 1 + (context.player.attributes?.luck || 0) * 0.005;
    }

    // 词条影响
    const player = context.player;
    if (player?.slots) {
      for (const slot of player.slots) {
        if (slot.termId && !slot.locked) {
          // 词条中可能有事件权重修正（由外部词条系统处理）
          // 此处简化：检查词条效果
        }
      }
    }

    return Math.max(weight, 0.1); // 最低权重保底
  }

  /**
   * 触发事件（记录触发次数）
   * @param {string} eventId - 事件ID
   * @param {number} currentYear - 当前年份
   */
  dispatchEvent(eventId, currentYear) {
    const count = this.getTriggerCount(eventId) + 1;
    this._triggerCounts.set(eventId, count);

    // 设置冷却
    const event = this._eventRegistry.get(eventId);
    if (event && event.cooldown > 0) {
      this._cooldowns.set(eventId, currentYear + event.cooldown);
    }
  }

  /**
   * 检查事件是否在冷却中
   * @param {string} eventId - 事件ID
   * @param {number} currentYear - 当前年份
   * @returns {boolean}
   */
  isInCooldown(eventId, currentYear) {
    const cooldownEnd = this._cooldowns.get(eventId);
    if (cooldownEnd === undefined) return false;
    return currentYear < cooldownEnd;
  }

  /**
   * 获取事件触发次数
   * @param {string} eventId - 事件ID
   * @returns {number}
   */
  getTriggerCount(eventId) {
    return this._triggerCounts.get(eventId) || 0;
  }

  /**
   * 根据事件ID获取事件定义
   * @param {string} eventId - 事件ID
   * @returns {object|null}
   */
  getEventById(eventId) {
    return this._eventRegistry.get(eventId) || null;
  }

  /**
   * 重置所有冷却和计数（新一轮模拟时调用）
   */
  reset() {
    this._cooldowns.clear();
    this._triggerCounts.clear();
  }

  /**
   * 导出状态（用于存档）
   * @returns {object}
   */
  exportState() {
    return {
      cooldowns: Object.fromEntries(this._cooldowns),
      triggerCounts: Object.fromEntries(this._triggerCounts),
    };
  }

  /**
   * 从存档恢复状态
   * @param {object} state - exportState() 的输出
   */
  importState(state) {
    if (state.cooldowns) {
      this._cooldowns = new Map(Object.entries(state.cooldowns));
    }
    if (state.triggerCounts) {
      this._triggerCounts = new Map(Object.entries(state.triggerCounts));
    }
  }
}

/** 全局事件调度器单例 */
export const eventDispatcher = new EventDispatcher();
export default eventDispatcher;
