/**
 * 角色数据模型 - 工厂函数与默认值
 * @module models/player
 */

import { generateId } from '../utils/helpers.js';

/** 境界配置表 — 每层阈值严格递增，避免一次 gain 跳多层 */
export const REALM_TABLE = [
  { level: 0, name: '炼气一层', maxCultivation: 1000, lifespan: 100 },
  { level: 1, name: '炼气二层', maxCultivation: 2500, lifespan: 105 },
  { level: 2, name: '炼气三层', maxCultivation: 5000, lifespan: 110 },
  { level: 3, name: '炼气四层', maxCultivation: 8000, lifespan: 115 },
  { level: 4, name: '炼气五层', maxCultivation: 12000, lifespan: 120 },
  { level: 5, name: '炼气六层', maxCultivation: 17000, lifespan: 125 },
  { level: 6, name: '炼气七层', maxCultivation: 23000, lifespan: 130 },
  { level: 7, name: '炼气八层', maxCultivation: 30000, lifespan: 140 },
  { level: 8, name: '炼气九层', maxCultivation: 40000, lifespan: 150 },
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
    visitedScenes: [],
    
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

/**
 * 获取角色当前境界的最大记忆碎片槽位（P2 模拟器成长系统）
 * @param {object} player - 角色数据
 * @returns {number} 碎片槽位上限
 */
export function getMaxMemoryFragmentSlots(player) {
  const rl = player?.realmLevel || 0;
  if (rl <= 2) return 5;   // 炼气1-3层
  if (rl <= 5) return 8;   // 炼气4-6层
  if (rl <= 8) return 12;  // 炼气7-9层
  return 16;               // 筑基+
}

/**
 * 灵根数据定义 — 每种灵根对属性和玩法有实质影响（闭环设计）
 */
export const SPIRIT_ROOT_DATA = {
  '天灵根': {
    emoji: '🌟', rarity: 'legendary', mult: 3.0,
    attrBonus: { comprehension: 5, spirit: 5 },
    passive: '灵气亲和极高，修炼速度是常人三倍',
    storyHint: '山门前的测灵石碑爆发出耀眼金光，整座山都在震颤——万中无一的天灵根！',
  },
  '地灵根': {
    emoji: '💎', rarity: 'epic', mult: 2.0,
    attrBonus: { strength: 4, spirit: 3 },
    passive: '灵根品质上乘，根基深厚',
    storyHint: '石碑亮起三色光芒，灵气凝为实质——罕见的上等灵根。',
  },
  '变异灵根': {
    emoji: '⚡', rarity: 'epic', mult: 2.5,
    attrBonus: { luck: 8, comprehension: 2 },
    passive: '变异灵根，天机难测，气运逆天',
    storyHint: '石碑上的光芒忽明忽暗，最终化为一道紫色雷纹——变异灵根！',
  },
  '真灵根': {
    emoji: '🔥', rarity: 'rare', mult: 1.2,
    attrBonus: { comprehension: 2, strength: 2 },
    passive: '标准灵根，资质尚可',
    storyHint: '石碑亮起两道光芒——中规中矩的真灵根。',
  },
  '伪灵根': {
    emoji: '🌫', rarity: 'common', mult: 0.7,
    attrBonus: { luck: 5 },
    passive: '灵根驳杂，但暗藏一线机缘',
    storyHint: '石碑勉强亮起四道暗淡光芒——四灵根，伪灵根。身后有人窃笑。',
  },
  '废品灵根': {
    emoji: '💀', rarity: 'cursed', mult: 0.3,
    attrBonus: { luck: 10 },
    passive: '废材灵根，众人皆叹可惜，殊不知命运另有安排',
    storyHint: '石碑毫无反应。测灵弟子连看都不看你一眼："下一个。"你攥紧了拳头。',
  },
};

export default {
  createNewPlayer,
  getFinalAttribute,
  isRealmInRange,
  getMaxLifespan,
  getMaxMemoryFragmentSlots,
  REALM_TABLE,
  SPIRIT_ROOT_DATA,
};
