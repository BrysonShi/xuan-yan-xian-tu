/**
 * 数值计算引擎 - 所有游戏数值公式的纯函数集合
 * 不依赖任何Vue/Pinia，可独立单元测试
 * @module engines/calculationEngine
 */

import { clamp } from '../utils/helpers.js';

// ═══════════════════════════════════════
// 基础常量
// ═══════════════════════════════════════

/** 基础修炼速率（每日基础修为值） */
const BASE_CULTIVATION_RATE = 10;

/** 突破概率基础值 */
const BASE_BREAKTHROUGH_RATE = 0.3;

/** 战斗基础暴击率 */
const BASE_CRIT_RATE = 0.05;

/** 战斗基础暴击伤害倍率 */
const BASE_CRIT_DAMAGE = 1.5;

// ═══════════════════════════════════════
// 修炼效率计算
// ═══════════════════════════════════════

/**
 * 计算每日修为增长量
 * 
 * 公式：基础速率 × 灵根倍率 × 功法倍率 × (1 + 词条加成之和) × 环境系数
 * 
 * @param {object} player - 玩家数据
 * @param {object} context - 游戏上下文
 * @param {object} [options] - 可选参数
 * @param {number} [options.environmentFactor=1] - 环境系数（灵气浓度）
 * @param {object} [options.termBonuses] - 词条加成汇总
 * @returns {number} 每日修为增长量（正数）
 */
export function calculateCultivation(player, context, options = {}) {
  const { environmentFactor = 1, termBonuses = {} } = options;

  // 基础速率
  let rate = BASE_CULTIVATION_RATE;

  // 灵根倍率
  const rootMultiplier = player.spiritRoot?.multiplier || 1;

  // 功法倍率
  const techniqueMultiplier = getTechniqueMultiplier(player);

  // 词条加成（修炼速度类）
  const termBonus = termBonuses.cultivationSpeed || 0;

  // 悟性影响：悟性每10点增加5%修炼效率
  const comprehensionBonus = 1 + (player.attributes.comprehension || 0) * 0.005;

  // 最终计算
  let final = rate * rootMultiplier * techniqueMultiplier * comprehensionBonus * (1 + termBonus) * environmentFactor;

  // 整数化（保留2位小数避免浮点问题）
  return Math.round(final * 100) / 100;
}

/**
 * 获取功法倍率
 * @param {object} player - 玩家数据
 * @returns {number}
 */
function getTechniqueMultiplier(player) {
  if (!player.activeTechnique) return 1;
  // 功法数据由外部数据表驱动，这里通过功法ID查询倍率
  // 简化处理：基础功法1.0，高阶功法更高
  const techniqueMultipliers = {
    'GJ-T01': 1.0,   // 长春功
    'GJ-T02': 1.3,   // 烈阳功
    'GJ-T03': 1.5,   // 小衍水决
    'GJ-T04': 1.6,   // 青木长生诀
    'GJ-T05': 1.2,   // 暗影遁术
  };
  return techniqueMultipliers[player.activeTechnique] || 1.0;
}

// ═══════════════════════════════════════
// 突破概率计算
// ═══════════════════════════════════════

/**
 * 计算突破成功率
 * 
 * 公式：基础率 + 悟性加成 + 气运加成 + 词条加成 + 功法加成
 * 受境界层级递减影响
 * 
 * @param {object} player - 玩家数据
 * @param {object} context - 游戏上下文
 * @param {object} [options] - 可选参数
 * @param {object} [options.termBonuses] - 词条加成
 * @returns {number} 突破概率 (0-1)
 */
export function calculateBreakthrough(player, context, options = {}) {
  const { termBonuses = {} } = options;

  // 基础概率
  let rate = BASE_BREAKTHROUGH_RATE;

  // 悟性加成：每点悟性+0.5%
  rate += (player.attributes.comprehension || 0) * 0.005;

  // 气运加成：每点气运+0.3%
  rate += (player.attributes.luck || 0) * 0.003;

  // 词条加成
  rate += termBonuses.breakthroughRate || 0;

  // 境界递减：越高层突破越难
  const realmPenalty = (player.realmLevel || 0) * 0.03;
  rate -= realmPenalty;

  // 修为充足度：修为达到上限的比例越高，概率越高
  const cultivationRatio = player.cultivation / (player.maxCultivation || 1);
  if (cultivationRatio >= 1) {
    rate += 0.1; // 修为溢出额外加成
  }

  return clamp(rate, 0.01, 0.99);
}

// ═══════════════════════════════════════
// 战斗伤害计算
// ═══════════════════════════════════════

/**
 * 计算战斗伤害
 * 
 * 公式：(攻击力 - 防御力×0.6) × 属性克制 × 暴击倍率 × 随机波动
 * 
 * @param {object} attacker - 攻击方战斗属性
 * @param {object} defender - 防守方战斗属性
 * @param {object} [options] - 可选参数
 * @param {object} [options.rng] - 随机数生成器
 * @returns {object} { damage, isCrit, elementMultiplier, isKill }
 */
export function calculateCombat(attacker, defender, options = {}) {
  const { rng = null } = options;
  const rand = rng ? rng.random() : Math.random();

  // 基础攻击力
  const attack = (attacker.attack || 0) * (1 + (attacker.buffAttack || 0));
  // 基础防御力
  const defense = (defender.defense || 0) * (1 + (defender.buffDefense || 0));

  // 属性克制
  const elementMult = getElementMultiplier(attacker.element, defender.element);

  // 暴击判定
  const critRate = attacker.critRate || BASE_CRIT_RATE;
  const isCrit = rand < critRate;
  const critMult = isCrit ? (attacker.critDamage || BASE_CRIT_DAMAGE) : 1;

  // 伤害计算：攻击 - 防御×0.6（防御有递减效果）
  let damage = Math.max(1, attack - defense * 0.6);
  damage *= elementMult * critMult;

  // 随机波动 ±10%
  const fluctuation = 0.9 + rand * 0.2; // [0.9, 1.1]
  damage *= fluctuation;

  // 取整
  damage = Math.round(damage);

  // 判断击杀
  const remainHp = (defender.hp || 0) - damage;
  const isKill = remainHp <= 0;

  return {
    damage: Math.max(1, damage),
    isCrit,
    elementMultiplier: elementMult,
    isKill,
  };
}

/**
 * 获取属性克制倍率
 * @param {string} attackElement - 攻击方属性
 * @param {string} defendElement - 防守方属性
 * @returns {number} 克制倍率
 */
function getElementMultiplier(attackElement, defendElement) {
  if (!attackElement || !defendElement) return 1;

  // 五行相克：金克木，木克土，土克水，水克火，火克金
  const counterMap = {
    '金': '木', '木': '土', '土': '水', '水': '火', '火': '金',
  };

  if (counterMap[attackElement] === defendElement) return 1.3;  // 克制 +30%
  // 被克制
  const keys = Object.keys(counterMap);
  for (const key of keys) {
    if (counterMap[key] === attackElement && key === defendElement) return 0.7;
  }
  return 1;
}

// ═══════════════════════════════════════
// 词条效果叠加计算
// ═══════════════════════════════════════

/**
 * 计算所有装备词条的综合效果加成
 * @param {object} player - 玩家数据
 * @param {Map<string,object>} termRegistry - 词条注册表
 * @returns {object} 各维度的加成汇总
 */
export function calculateTermEffects(player, termRegistry) {
  const bonuses = {
    cultivationSpeed: 0,    // 修炼速度加成（比例）
    breakthroughRate: 0,    // 突破率加成（绝对值）
    maxHpPercent: 0,        // 气血上限百分比加成
    maxMpPercent: 0,        // 灵力上限百分比加成
    defensePercent: 0,      // 防御百分比加成
    attackPercent: 0,       // 攻击百分比加成
    deathDodge: 0,          // 致命闪避概率
    adventureRate: 0,       // 奇遇触发概率加成
    alchemySuccess: 0,      // 炼丹成功率加成
    combatBonus: 0,         // 综合战斗加成
  };

  const equippedSlots = player.slots.filter(s => s.termId && !s.locked);

  for (const slot of equippedSlots) {
    const term = termRegistry.get(slot.termId);
    if (!term || !term.effects) continue;

    for (const effect of term.effects) {
      applyEffectToBonuses(effect, bonuses);
    }
  }

  // 组合效果加成
  if (player.activeSynergies && player.activeSynergies.length > 0) {
    // 组合效果在此处叠加（需要从synergy注册表获取）
    // 由外部传入处理
  }

  return bonuses;
}

/**
 * 将单个词条效果应用到加成汇总
 * @param {object} effect - 词条效果
 * @param {object} bonuses - 加成汇总对象
 * @private
 */
function applyEffectToBonuses(effect, bonuses) {
  const { type, target, value } = effect;

  switch (type) {
    case 'flat_add':
      // 固定值加成（直接加到属性上）
      if (bonuses[target] !== undefined) {
        bonuses[target] += value;
      }
      break;
    case 'percent_add':
      // 百分比加成
      if (bonuses[target] !== undefined) {
        bonuses[target] += value / 100;
      }
      break;
    case 'passive':
      // 被动光环
      if (target.startsWith('event_weight:')) {
        // 事件权重修正，单独处理
        const category = target.replace('event_weight:', '');
        bonuses[`eventWeight_${category}`] = (bonuses[`eventWeight_${category}`] || 0) + value;
      } else if (bonuses[target] !== undefined) {
        bonuses[target] += value;
      }
      break;
    case 'trigger':
      // 触发型效果（如致命保命）
      if (target === 'death_dodge') {
        bonuses.deathDodge += value;
      }
      break;
    case 'condition_mod':
      // 条件修正（需要配合条件判断）
      // 此处简化处理，实际应在满足条件时才生效
      if (bonuses[target] !== undefined) {
        bonuses[target] += value;
      }
      break;
    default:
      break;
  }
}

// ═══════════════════════════════════════
// 经济系统计算
// ═══════════════════════════════════════

/**
 * 计算交易价格（考虑魅力加成）
 * @param {number} basePrice - 基础价格
 * @param {number} charisma - 魅力值
 * @param {boolean} isSelling - 是否出售
 * @returns {number} 最终价格
 */
export function calculateTradePrice(basePrice, charisma, isSelling = false) {
  const charismaBonus = 1 + (charisma || 0) * 0.002;
  if (isSelling) {
    // 出售：魅力越高，卖价越高
    return Math.round(basePrice * charismaBonus);
  } else {
    // 购买：魅力越高，买价越低
    return Math.round(basePrice / charismaBonus);
  }
}

// ═══════════════════════════════════════
// 寿命计算
// ═══════════════════════════════════════

/**
 * 计算角色最大寿命
 * @param {object} player - 玩家数据
 * @param {Array} realmTable - 境界表（从 player.js 的 REALM_TABLE 传入）
 * @param {object} [termBonuses] - 词条加成
 * @returns {number} 最大寿命（年）
 */
export function calculateMaxLifespan(player, realmTable = [], termBonuses = {}) {
  const realmData = realmTable[player.realmLevel] || realmTable[0] || { lifespan: 100 };
  let maxLife = realmData.lifespan;

  // 词条加成
  maxLife += termBonuses.lifespanBonus || 0;

  return maxLife;
}

// ═══════════════════════════════════════
// 导出
// ═══════════════════════════════════════

export default {
  calculateCultivation,
  calculateBreakthrough,
  calculateCombat,
  calculateTermEffects,
  calculateTradePrice,
  calculateMaxLifespan,
};
