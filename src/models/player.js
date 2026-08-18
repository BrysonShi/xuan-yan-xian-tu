/**
 * 角色数据模型 - 工厂函数与默认值
 * @module models/player
 */

import { generateId } from '../utils/helpers.js';

/** 境界配置表（阈值已匹配剧情修为增量） */
export const REALM_TABLE = [
  { level: 0, name: '炼气一层', maxCultivation: 800, lifespan: 100 },
  { level: 1, name: '炼气二层', maxCultivation: 800, lifespan: 105 },
  { level: 2, name: '炼气三层', maxCultivation: 1500, lifespan: 110 },
  { level: 3, name: '炼气四层', maxCultivation: 1500, lifespan: 115 },
  { level: 4, name: '炼气五层', maxCultivation: 5000, lifespan: 120 },
  { level: 5, name: '炼气六层', maxCultivation: 8000, lifespan: 125 },
  { level: 6, name: '炼气七层', maxCultivation: 12000, lifespan: 130 },
  { level: 7, name: '炼气八层', maxCultivation: 18000, lifespan: 140 },
  { level: 8, name: '炼气九层', maxCultivation: 25000, lifespan: 150 },
];

/** 默认六维属性 */
const DEFAULT_ATTRIBUTES = Object.freeze({
  comprehension: 10,  // 悟性
  luck: 10,           // 气运
  charisma: 10,       // 魅力
  strength: 10,       // 根骨
  agility: 10,        // 敏捷
  spirit: 10,         // 神识
});

/** 默认资源 */
const DEFAULT_RESOURCES = Object.freeze({
  spiritStones: 50,      // 下品灵石
  spiritStonesMid: 0,    // 中品灵石
  merit: 0,              // 功德点
  reputation: 0,         // 声望值
  contribution: 10,      // 宗门贡献点
});

/**
 * 创建默认词条槽位
 * @param {number} count - 槽位数量
 * @returns {Array} 槽位数组
 */
function createDefaultSlots(count = 9) {
  const slots = [];
  for (let i = 0; i < count; i++) {
    slots.push({
      id: `slot_${i}`,
      termId: null,
      locked: i >= 3, // 初始解锁3个槽位
      unlockCondition: i < 3 ? '' : getSlotUnlockCondition(i),
    });
  }
  return slots;
}

/**
 * 获取槽位解锁条件描述
 * @param {number} index - 槽位索引
 * @returns {string}
 */
function getSlotUnlockCondition(index) {
  const conditions = {
    3: '炼气3层',
    4: '炼气5层',
    5: '完成首次模拟',
    6: '炼气7层',
    7: '收集5个词条',
    8: '炼气9层',
  };
  return conditions[index] || '未知';
}

/**
 * 创建新角色
 * @param {string} name - 角色名
 * @param {object} [options] - 可选配置
 * @param {object} [options.customAttributes] - 自定义六维属性
 * @param {object} [options.spiritRoot] - 灵根配置
 * @returns {object} 完整的角色数据对象
 */
export function createNewPlayer(name, options = {}) {
  const now = Date.now();
  const spiritRoot = options.spiritRoot || {
    type: ['木'],
    quality: 3,        // 3=真灵根
    multiplier: 1.0,
  };

  return {
    id: generateId('player'),
    name: name || '无名散修',
    age: 16,
    realm: '炼气一层',
    realmLevel: 0,
    cultivation: 0,
    maxCultivation: REALM_TABLE[0].maxCultivation,
    hp: 100,
    maxHp: 100,
    mp: 50,
    maxMp: 50,
    attributes: {
      ...DEFAULT_ATTRIBUTES,
      ...(options.customAttributes || {}),
    },
    spiritRoot,
    resources: { ...DEFAULT_RESOURCES },
    slots: createDefaultSlots(9),
    unlockedSlots: 3,
    collectedTerms: [],
    activeSynergies: [],
    techniques: [
      { id: 'GJ-T01', level: 0, mastery: 'unfamiliar' } // 默认会长春功
    ],
    activeTechnique: 'GJ-T01',
    inventory: [],
    relationships: {},
    memoryFragments: [],
    
    flags: {
      personality: 'calm',
      chapter: 1,
      sim_unlocked: false,
      sim_daily: { date: '', count: 0 },
      memory_fragment_slots: 5,
      first_sim_done: false,
    },
    achievements: [],
    stats: {
      totalSimulations: 0,
      totalDeaths: 0,
      deathCauses: {},
      longestLife: 0,
      totalChoicesMade: 0,
    },
    createdAt: now,
    updatedAt: now,
    playTime: 0,
    version: '0.2.0',
  };
}

/**
 * 获取角色某个属性的最终值（含词条加成）
 * @param {object} player - 角色数据
 * @param {string} attrKey - 属性key
 * @param {number} [baseOverride] - 覆盖基础值
 * @returns {number} 最终属性值
 */
export function getFinalAttribute(player, attrKey, baseOverride) {
  const base = baseOverride !== undefined ? baseOverride : (player.attributes[attrKey] || 0);
  // 词条加成由 CalculationEngine 统一计算，这里只返回基础值
  return base;
}

/**
 * 检查角色是否满足境界条件
 * @param {object} player - 角色数据
 * @param {number} minLevel - 最低境界层级
 * @param {number} [maxLevel=8] - 最高境界层级
 * @returns {boolean}
 */
export function isRealmInRange(player, minLevel, maxLevel = 8) {
  return player.realmLevel >= minLevel && player.realmLevel <= maxLevel;
}

/**
 * 获取角色当前境界的最大寿命
 * @param {object} player - 角色数据
 * @returns {number} 最大寿命
 */
export function getMaxLifespan(player) {
  const realmData = REALM_TABLE[player.realmLevel];
  return realmData ? realmData.lifespan : 100;
}

export default {
  createNewPlayer,
  getFinalAttribute,
  isRealmInRange,
  getMaxLifespan,
  REALM_TABLE,
};
