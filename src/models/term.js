/**
 * 词条数据模型 - 词条工厂与效果计算工具
 * @module models/term
 */

/** 词条品质枚举 */
export const TermRarity = Object.freeze({
  COMMON: 'common',       // 普通（白）
  RARE: 'rare',           // 稀有（蓝）
  EPIC: 'epic',           // 史诗（紫）
  LEGENDARY: 'legendary', // 传说（金）
  CURSED: 'cursed',       // 凶品（灰）
});

/** 品质颜色映射 */
export const RARITY_COLORS = Object.freeze({
  common: '#ffffff',
  rare: '#4a9eff',
  epic: '#b366ff',
  legendary: '#ffcc00',
  cursed: '#888888',
});

/** 品质中文名 */
export const RARITY_NAMES = Object.freeze({
  common: '普通',
  rare: '稀有',
  epic: '史诗',
  legendary: '传说',
  cursed: '凶',
});

/** 词条类型枚举 */
export const TermCategory = Object.freeze({
  ATTRIBUTE: 'attribute',     // 属性型
  PHYSIQUE: 'physique',       // 体质型
  SKILL: 'skill',             // 技艺型
  FORTUNE: 'fortune',         // 运道型
  BACKGROUND: 'background',   // 背景型
  SPECIAL: 'special',         // 特殊型
});

/** 效果类型枚举 */
export const EffectType = Object.freeze({
  FLAT_ADD: 'flat_add',           // 固定值加法
  PERCENT_ADD: 'percent_add',     // 百分比加成
  TRIGGER: 'trigger',             // 条件触发
  PASSIVE: 'passive',             // 被动光环
  CONDITION_MOD: 'condition_mod', // 条件修正
  EVENT_UNLOCK: 'event_unlock',   // 解锁事件选项
});

/**
 * 创建一个词条定义对象
 * @param {object} def - 词条定义数据
 * @returns {object} 标准化的词条定义
 */
export function createTermDefinition(def) {
  return {
    id: def.id,
    name: def.name,
    rarity: def.rarity || TermRarity.COMMON,
    category: def.category || TermCategory.ATTRIBUTE,
    description: def.description || '',
    effects: (def.effects || []).map(createTermEffect),
    conflicts: def.conflicts || [],
    upgradeTo: def.upgradeTo || null,
    upgradeCondition: def.upgradeCondition || null,
    source: def.source || '',
    tags: def.tags || [],
  };
}

/**
 * 创建一个词条效果对象
 * @param {object} effect - 效果定义
 * @returns {object} 标准化的效果对象
 */
export function createTermEffect(effect) {
  return {
    type: effect.type,
    target: effect.target,
    value: effect.value,
    condition: effect.condition || null,
    triggerChance: effect.triggerChance !== undefined ? effect.triggerChance : 1,
    duration: effect.duration || 'permanent',
  };
}

/**
 * 检测当前装备的词条是否激活了组合效果
 * @param {string[]} equippedTermIds - 当前装备的词条ID列表
 * @param {Array} allSynergies - 所有组合定义
 * @returns {string[]} 激活的组合ID列表
 */
export function detectSynergies(equippedTermIds, allSynergies) {
  const active = [];
  for (const synergy of allSynergies) {
    const allPresent = synergy.requiredTerms.every(
      termId => equippedTermIds.includes(termId)
    );
    if (allPresent) {
      active.push(synergy.id);
    }
  }
  return active;
}

/**
 * 检查词条冲突
 * @param {string} newTermId - 要装备的词条ID
 * @param {string[]} equippedTermIds - 当前已装备的词条ID列表
 * @param {Map<string,object>} termRegistry - 词条注册表
 * @returns {string[]} 冲突的词条ID列表（空数组表示无冲突）
 */
export function checkConflicts(newTermId, equippedTermIds, termRegistry) {
  const newTerm = termRegistry.get(newTermId);
  if (!newTerm) return [];

  const conflicts = [];
  // 检查新词条的冲突列表
  for (const conflictId of newTerm.conflicts) {
    if (equippedTermIds.includes(conflictId)) {
      conflicts.push(conflictId);
    }
  }
  // 反向检查：已装备词条是否与新词条冲突
  for (const equippedId of equippedTermIds) {
    const equippedTerm = termRegistry.get(equippedId);
    if (equippedTerm && equippedTerm.conflicts.includes(newTermId)) {
      if (!conflicts.includes(equippedId)) {
        conflicts.push(equippedId);
      }
    }
  }
  return conflicts;
}

/**
 * 获取装备中的词条ID列表
 * @param {object} player - 角色数据
 * @returns {string[]} 已装备的词条ID列表
 */
export function getEquippedTermIds(player) {
  return player.slots
    .filter(slot => slot.termId && !slot.locked)
    .map(slot => slot.termId);
}

export default {
  TermRarity,
  TermCategory,
  EffectType,
  RARITY_COLORS,
  RARITY_NAMES,
  createTermDefinition,
  createTermEffect,
  detectSynergies,
  checkConflicts,
  getEquippedTermIds,
};
