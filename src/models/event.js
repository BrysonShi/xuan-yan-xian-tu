/**
 * 事件数据模型 - 事件定义与条件判断工具
 * @module models/event
 */

import { compare, getNestedValue } from '../utils/helpers.js';

/** 事件场景枚举 */
export const EventScene = Object.freeze({
  SIMULATION: 'simulation',
  REALITY: 'reality',
  BOTH: 'both',
});

/** 事件分类枚举 */
export const EventCategory = Object.freeze({
  CULTIVATION: 'cultivation',   // 修炼类
  ADVENTURE: 'adventure',       // 奇遇类
  COMBAT: 'combat',             // 战斗类
  SOCIAL: 'social',             // 社交类
  DISASTER: 'disaster',         // 灾难类
});

/**
 * 创建一个事件定义对象
 * @param {object} def - 事件定义数据
 * @returns {object} 标准化的事件定义
 */
export function createEventDefinition(def) {
  return {
    id: def.id,
    name: def.name,
    category: def.category || EventCategory.CULTIVATION,
    scene: def.scene || EventScene.SIMULATION,
    triggerConditions: def.triggerConditions || [],
    weight: def.weight || 10,
    weightModifiers: def.weightModifiers || [],
    description: def.description || '',
    options: (def.options || []).map(createEventOption),
    prerequisiteEvents: def.prerequisiteEvents || [],
    followUpEvents: def.followUpEvents || [],
    cooldown: def.cooldown || 0,
    maxTriggerCount: def.maxTriggerCount !== undefined ? def.maxTriggerCount : null,
    isUnique: def.isUnique || false,
    isHidden: def.isHidden || false,
    isMainStory: def.isMainStory || false,
    chapter: def.chapter || null,
    relatedMemoryFragment: def.relatedMemoryFragment || null,
  };
}

/**
 * 创建事件选项对象
 * @param {object} option - 选项数据
 * @returns {object} 标准化的选项对象
 */
export function createEventOption(option) {
  return {
    id: option.id,
    text: option.text,
    description: option.description || '',
    visibleCondition: option.visibleCondition || null,
    enabledCondition: option.enabledCondition || null,
    disabledReason: option.disabledReason || '',
    successRate: option.successRate !== undefined ? option.successRate : 1,
    successResult: createOptionResult(option.successResult || {}),
    failureResult: option.failureResult ? createOptionResult(option.failureResult) : null,
    isMemoryHint: option.isMemoryHint || false,
    requiresItem: option.requiresItem || null,
  };
}

/**
 * 创建选项结果对象
 * @param {object} result - 结果数据
 * @returns {object} 标准化的结果对象
 */
export function createOptionResult(result) {
  return {
    attributeChanges: result.attributeChanges || null,
    hpChange: result.hpChange || 0,
    mpChange: result.mpChange || 0,
    cultivationChange: result.cultivationChange || 0,
    resourceChanges: result.resourceChanges || null,
    itemsGained: result.itemsGained || [],
    itemsLost: result.itemsLost || [],
    techniquesGained: result.techniquesGained || [],
    termsGained: result.termsGained || [],
    relationshipChanges: result.relationshipChanges || [],
    setFlags: result.setFlags || {},
    memoryFragmentGained: result.memoryFragmentGained || null,
    nextEvent: result.nextEvent || null,
    triggerDeath: result.triggerDeath || false,
    deathCause: result.deathCause || '',
    triggerAchievement: result.triggerAchievement || null,
    resultText: result.resultText || '',
    successNext: result.successNext || null,
    failureNext: result.failureNext || null,
  };
}

/**
 * 评估条件是否满足
 * @param {object} condition - 条件定义
 * @param {object} player - 玩家数据
 * @param {object} context - 游戏上下文
 * @returns {boolean}
 */
export function evaluateCondition(condition, player, context) {
  if (!condition || !condition.type) return true;

  switch (condition.type) {
    case 'attribute_check': {
      const value = getNestedValue(player, condition.field);
      return compare(value, condition.operator, condition.value);
    }
    case 'item_check': {
      return player.inventory.some(
        item => item.itemId === condition.value && item.quantity > 0
      );
    }
    case 'flag_check': {
      const flagValue = player.flags?.[condition.field] ?? context.flags?.[condition.field];
      return compare(flagValue, condition.operator, condition.value);
    }
    case 'relationship_check': {
      const rel = player.relationships?.[condition.field];
      if (!rel) return condition.operator === '==' ? false : true;
      return compare(rel.affinity, condition.operator, condition.value);
    }
    case 'random_check': {
      const rng = context.rng;
      const roll = rng ? rng.random() : Math.random();
      return roll < condition.value;
    }
    case 'term_check': {
      return player.slots.some(
        s => s.termId === condition.value && !s.locked
      );
    }
    case 'memory_check': {
      return player.memoryFragments.some(
        m => m.id === condition.value
      );
    }
    case 'compound': {
      if (!condition.children || condition.children.length === 0) return true;
      if (condition.logic === 'AND') {
        return condition.children.every(c => evaluateCondition(c, player, context));
      } else {
        return condition.children.some(c => evaluateCondition(c, player, context));
      }
    }
    default:
      console.warn(`[Event] 未知条件类型: ${condition.type}`);
      return false;
  }
}

/**
 * 批量评估条件列表（AND逻辑）
 * @param {Array} conditions - 条件列表
 * @param {object} player - 玩家数据
 * @param {object} context - 游戏上下文
 * @returns {boolean}
 */
export function evaluateConditions(conditions, player, context) {
  if (!conditions || conditions.length === 0) return true;
  return conditions.every(c => evaluateCondition(c, player, context));
}

/**
 * 检查选项是否可见
 * @param {object} option - 选项对象
 * @param {object} player - 玩家数据
 * @param {object} context - 游戏上下文
 * @returns {boolean}
 */
export function isOptionVisible(option, player, context) {
  if (!option.visibleCondition) return true;
  return evaluateCondition(option.visibleCondition, player, context);
}

/**
 * 检查选项是否可用
 * @param {object} option - 选项对象
 * @param {object} player - 玩家数据
 * @param {object} context - 游戏上下文
 * @returns {{ enabled: boolean, reason: string }}
 */
export function isOptionEnabled(option, player, context) {
  // 检查物品消耗
  if (option.requiresItem) {
    const hasItem = player.inventory.some(
      item => item.itemId === option.requiresItem && item.quantity > 0
    );
    if (!hasItem) {
      return { enabled: false, reason: `需要持有物品: ${option.requiresItem}` };
    }
  }
  // 检查启用条件
  if (option.enabledCondition) {
    const met = evaluateCondition(option.enabledCondition, player, context);
    if (!met) {
      return { enabled: false, reason: option.disabledReason || '条件不满足' };
    }
  }
  return { enabled: true, reason: '' };
}

export default {
  EventScene,
  EventCategory,
  createEventDefinition,
  createEventOption,
  createOptionResult,
  evaluateCondition,
  evaluateConditions,
  isOptionVisible,
  isOptionEnabled,
};
