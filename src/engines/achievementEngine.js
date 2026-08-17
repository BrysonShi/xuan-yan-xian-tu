/**
 * 成就引擎 - 成就检测、解锁、奖励发放
 * @module engines/achievementEngine
 */

import achievementsData from '../data/achievements.json';

// ═══════════════════════════════════════
// 常量
// ═══════════════════════════════════════

/** 成就分类中文映射 */
export const CATEGORY_NAMES = {
  cultivation: '修炼',
  combat: '战斗',
  exploration: '探索',
  social: '社交',
  collection: '收集',
  special: '特殊',
};

/** 稀有度中文映射 */
export const RARITY_NAMES = {
  common: '普通',
  rare: '稀有',
  epic: '史诗',
  legendary: '传说',
};

/** 稀有度颜色映射 */
export const RARITY_COLORS = {
  common: '#ffffff',
  rare: '#4ade80',
  epic: '#a78bfa',
  legendary: '#fbbf24',
};

// ═══════════════════════════════════════
// 成就注册表（内存缓存）
// ═══════════════════════════════════════

/** @type {Map<string, object>} 成就ID → 成就数据 */
const achievementRegistry = new Map();

/** 初始化注册表 */
function initRegistry() {
  if (achievementRegistry.size > 0) return;
  for (const ach of achievementsData.achievements) {
    achievementRegistry.set(ach.id, ach);
  }
}

// ═══════════════════════════════════════
// 成就状态管理
// ═══════════════════════════════════════

/**
 * 成就状态结构
 * @typedef {object} AchievementState
 * @property {Object<string, boolean>} unlocked - 已解锁的成就ID集合
 * @property {Object<string, number>} progress - 成就进度追踪
 * @property {string[]} unlockedTitles - 已获得称号列表
 * @property {string[]} permanentTerms - 永久解锁词条列表
 * @property {number} totalSimulations - 累计模拟次数
 * @property {number} totalCombatWins - 累计战斗胜利次数
 * @property {number} totalBreakthroughs - 累计突破成功次数
 * @property {number} totalBreakthroughFails - 累计突破失败次数
 * @property {number} totalFatalSurvives - 累计致命事件存活次数
 * @property {number} totalDemonResists - 累计心魔抵抗次数
 * @property {Set<string>} deathMethods - 已经历死法集合
 * @property {Set<string>} discoveredLocations - 已发现地点集合
 * @property {number} consecutiveSurvivalCount - 连续存活50年+次数
 * @property {number} currentConsecutiveSurvival - 当前连续存活计数
 * @property {Object<string, number>} npcRelations - NPC好感度记录
 * @property {number} uniqueTermsCollected - 已收集不重复词条数
 * @property {number} techniquesLearned - 已学习功法数
 * @property {number} memoryFragmentsCollected - 已收集记忆碎片数
 * @property {number} worldTruthFragments - 世界真相碎片数
 * @property {number} simulatorQuestionCount - 质疑模拟器次数
 */

/**
 * 创建初始成就状态
 * @returns {AchievementState}
 */
export function createInitialAchievementState() {
  return {
    unlocked: {},
    progress: {},
    unlockedTitles: [],
    permanentTerms: [],
    totalSimulations: 0,
    totalCombatWins: 0,
    totalBreakthroughs: 0,
    totalBreakthroughFails: 0,
    totalFatalSurvives: 0,
    totalDemonResists: 0,
    deathMethods: new Set(),
    discoveredLocations: new Set(),
    consecutiveSurvivalCount: 0,
    currentConsecutiveSurvival: 0,
    npcRelations: {},
    uniqueTermsCollected: 0,
    techniquesLearned: 0,
    memoryFragmentsCollected: 0,
    worldTruthFragments: 0,
    simulatorQuestionCount: 0,
    // 本次模拟追踪
    _currentSimYears: 0,
    _currentSimRealmLevel: 1,
    _currentSimNoDamage: true,
    _currentSimDeathMethod: null,
  };
}

// ═══════════════════════════════════════
// 成就检测逻辑
// ═══════════════════════════════════════

/**
 * 检查单个成就是否满足解锁条件
 * @param {object} achievement - 成就定义
 * @param {AchievementState} state - 当前成就状态
 * @returns {boolean}
 */
function checkCondition(achievement, state) {
  const { type, params } = achievement.condition;

  switch (type) {
    // === 修炼类 ===
    case 'realm_reach':
      return (state.currentSimRealmLevel || 0) >= params.realmLevel;

    case 'breakthrough_success':
      return state.totalBreakthroughs >= params.count;

    case 'breakthrough_fail_then_success':
      return state.totalBreakthroughFails >= params.failCount && state.totalBreakthroughs > 0;

    case 'sim_realm_within_years':
      return (state.currentSimRealmLevel || 0) >= params.realmLevel &&
             (state._currentSimYears || 999) <= params.maxYears;

    case 'resist_demon':
      return state.totalDemonResists >= params.count;

    // === 战斗类 ===
    case 'combat_win':
      return state.totalCombatWins >= params.count;

    case 'combat_win_level_gap':
      return (state._lastCombatLevelGap || 0) >= params.minGap;

    case 'single_hit_kill':
      return (state._lastHitDamageRatio || 0) >= params.damageRatio;

    case 'tournament_win':
      return (state._lastTournamentRank || 99) <= params.rank;

    case 'tournament_no_damage':
      return state._currentSimNoDamage === true && state._lastTournamentRank === 1;

    case 'kill_high_realm':
      return (state._lastKilledEnemyRealm || 0) >= params.minRealmLevel;

    // === 探索类 ===
    case 'enter_secret_realm':
      return (state._secretRealmCount || 0) >= params.count;

    case 'discover_hidden_location':
      return state.discoveredLocations.size >= params.count;

    case 'clear_secret_realm':
      return (state._secretRealmClearCount || 0) >= params.count;

    case 'collect_items':
      return (state._totalItemsCollected || 0) >= params.count;

    case 'find_ancestor_treasure':
      return state._foundAncestorTreasure === true;

    case 'survive_fatal':
      return state.totalFatalSurvives >= params.count;

    case 'discover_all_locations':
      return params.locations.every(loc => state.discoveredLocations.has(loc));

    case 'death_methods':
      return state.deathMethods.size >= params.count;

    // === 社交类 ===
    case 'npc_friendship': {
      const levelOrder = ['hostile', 'cold', 'normal', 'friendly', 'trust', 'life_death'];
      const targetIdx = levelOrder.indexOf(params.level);
      const qualifiedCount = Object.values(state.npcRelations).filter(
        level => levelOrder.indexOf(level) >= targetIdx
      ).length;
      return qualifiedCount >= params.count;
    }

    case 'npc_quest_complete':
      return state._npcQuestsCompleted?.includes(params.npcId) === true;

    case 'npc_relation_improve':
      return state._npcRelationImproved?.some(
        r => r.from === params.from && r.to === params.to
      ) === true;

    case 'all_npc_friendship': {
      const relations = Object.values(state.npcRelations);
      return relations.length > 0 && relations.every(val => Number(val) >= params.minValue);
    }

    // === 收集类 ===
    case 'collect_terms':
      return params.uniqueCount
        ? state.uniqueTermsCollected >= params.uniqueCount
        : state.uniqueTermsCollected >= params.count;

    case 'learn_technique':
      return state.techniquesLearned >= params.count;

    case 'spirit_stones_reach':
      return (state._currentSpiritStones || 0) >= params.amount;

    case 'collect_memory_fragments':
      return state.memoryFragmentsCollected >= params.count;

    case 'collect_all_terms':
      return state.uniqueTermsCollected >= params.totalTerms;

    // === 特殊类 ===
    case 'first_simulation':
      return state.totalSimulations >= 1;

    case 'total_simulations':
      return state.totalSimulations >= params.count;

    case 'consecutive_survival':
      return state.consecutiveSurvivalCount >= params.count;

    case 'butterfly_effect':
      return state._butterflyEffectTriggered === true;

    case 'question_simulator':
      return state.simulatorQuestionCount >= params.count;

    case 'collect_world_truth':
      return state.worldTruthFragments >= params.count;

    default:
      console.warn(`[AchievementEngine] 未知的成就条件类型: ${type}`);
      return false;
  }
}

/**
 * 根据事件类型检测所有相关成就
 * @param {string} eventName - 事件名称（对应 checkEvent 字段）
 * @param {AchievementState} state - 当前成就状态
 * @returns {object[]} 新解锁的成就列表
 */
export function checkAchievements(eventName, state) {
  initRegistry();

  const newlyUnlocked = [];

  for (const [id, achievement] of achievementRegistry) {
    // 已解锁的跳过
    if (state.unlocked[id]) continue;

    // 只检测与当前事件相关的成就
    if (achievement.checkEvent !== eventName) continue;

    // 检查条件
    if (checkCondition(achievement, state)) {
      newlyUnlocked.push(achievement);
    }
  }

  return newlyUnlocked;
}

/**
 * 确认解锁成就（发放奖励并更新状态）
 * @param {string} achievementId - 成就ID
 * @param {AchievementState} state - 当前成就状态
 * @returns {object|null} 奖励信息，若已解锁或不存在返回null
 */
export function unlockAchievement(achievementId, state) {
  initRegistry();

  // 已解锁
  if (state.unlocked[achievementId]) return null;

  const achievement = achievementRegistry.get(achievementId);
  if (!achievement) return null;

  // 标记解锁
  state.unlocked[achievementId] = true;

  // 发放奖励
  const rewards = { ...achievement.rewards };

  // 称号
  if (rewards.title && !state.unlockedTitles.includes(rewards.title)) {
    state.unlockedTitles.push(rewards.title);
  }

  // 永久词条
  if (rewards.permanentTerm && !state.permanentTerms.includes(rewards.permanentTerm)) {
    state.permanentTerms.push(rewards.permanentTerm);
  }

  return rewards;
}

// ═══════════════════════════════════════
// 成就事件分发器
// ═══════════════════════════════════════

/**
 * 处理境界变化事件
 * @param {AchievementState} state
 * @param {number} newRealmLevel - 新境界层级
 * @returns {object[]} 新解锁的成就
 */
export function onRealmChange(state, newRealmLevel) {
  state.currentSimRealmLevel = newRealmLevel;
  return checkAchievements('onRealmChange', state);
}

/**
 * 处理突破事件
 * @param {AchievementState} state
 * @param {boolean} success - 是否成功
 * @returns {object[]} 新解锁的成就
 */
export function onBreakthrough(state, success) {
  if (success) {
    state.totalBreakthroughs++;
  } else {
    state.totalBreakthroughFails++;
  }
  return checkAchievements('onBreakthrough', state);
}

/**
 * 处理战斗结束事件
 * @param {AchievementState} state
 * @param {boolean} win - 是否胜利
 * @param {object} [details] - 战斗详情
 * @returns {object[]} 新解锁的成就
 */
export function onCombatEnd(state, win, details = {}) {
  if (win) {
    state.totalCombatWins++;
    state._lastCombatLevelGap = details.levelGap || 0;
    state._lastKilledEnemyRealm = details.enemyRealmLevel || 0;
  }
  const results = checkAchievements('onCombatEnd', state);
  return results;
}

/**
 * 处理单次攻击事件
 * @param {AchievementState} state
 * @param {number} damageRatio - 伤害占敌方总气血的比例
 * @returns {object[]} 新解锁的成就
 */
export function onCombatHit(state, damageRatio) {
  state._lastHitDamageRatio = damageRatio;
  return checkAchievements('onCombatHit', state);
}

/**
 * 处理模拟开始事件
 * @param {AchievementState} state
 * @returns {object[]} 新解锁的成就
 */
export function onSimStart(state) {
  state.totalSimulations++;
  state._currentSimNoDamage = true;
  state._currentSimYears = 0;
  return checkAchievements('onSimStart', state);
}

/**
 * 处理模拟结束事件
 * @param {AchievementState} state
 * @param {object} simResult - 模拟结果
 * @returns {object[]} 新解锁的成就
 */
export function onSimEnd(state, simResult = {}) {
  // 更新存活年数
  state._currentSimYears = simResult.yearsLived || 0;

  // 连续存活统计
  if ((simResult.yearsLived || 0) >= 50) {
    state.currentConsecutiveSurvival++;
    state.consecutiveSurvivalCount = Math.max(
      state.consecutiveSurvivalCount,
      state.currentConsecutiveSurvival
    );
  } else {
    state.currentConsecutiveSurvival = 0;
  }

  // 死法统计
  if (simResult.deathMethod) {
    state.deathMethods.add(simResult.deathMethod);
  }

  const results = checkAchievements('onSimEnd', state);
  return results;
}

/**
 * 处理心魔抵抗事件
 * @param {AchievementState} state
 * @returns {object[]} 新解锁的成就
 */
export function onDemonResist(state) {
  state.totalDemonResists++;
  return checkAchievements('onDemonResist', state);
}

/**
 * 处理致命事件存活
 * @param {AchievementState} state
 * @returns {object[]} 新解锁的成就
 */
export function onFatalSurvive(state) {
  state.totalFatalSurvives++;
  return checkAchievements('onFatalSurvive', state);
}

/**
 * 处理NPC关系变化事件
 * @param {AchievementState} state
 * @param {string} npcId - NPC ID
 * @param {string} newLevel - 新的关系等级
 * @param {string} [oldLevel] - 旧的关系等级
 * @returns {object[]} 新解锁的成就
 */
export function onNpcRelationChange(state, npcId, newLevel, oldLevel) {
  state.npcRelations[npcId] = newLevel;

  // 追踪关系提升
  if (oldLevel && oldLevel !== newLevel) {
    if (!state._npcRelationImproved) state._npcRelationImproved = [];
    state._npcRelationImproved.push({ from: oldLevel, to: newLevel, npcId });
  }

  return checkAchievements('onNpcRelationChange', state);
}

/**
 * 处理词条收集事件
 * @param {AchievementState} state
 * @param {number} uniqueCount - 当前不重复词条总数
 * @returns {object[]} 新解锁的成就
 */
export function onTermCollect(state, uniqueCount) {
  state.uniqueTermsCollected = uniqueCount;
  return checkAchievements('onTermCollect', state);
}

/**
 * 处理功法学习事件
 * @param {AchievementState} state
 * @param {number} totalCount - 已学功法总数
 * @returns {object[]} 新解锁的成就
 */
export function onTechniqueLearn(state, totalCount) {
  state.techniquesLearned = totalCount;
  return checkAchievements('onTechniqueLearn', state);
}

/**
 * 处理记忆碎片收集事件
 * @param {AchievementState} state
 * @param {number} totalCount - 碎片总数
 * @param {boolean} [isWorldTruth] - 是否为世界真相碎片
 * @returns {object[]} 新解锁的成就
 */
export function onMemoryCollect(state, totalCount, isWorldTruth = false) {
  state.memoryFragmentsCollected = totalCount;
  if (isWorldTruth) {
    state.worldTruthFragments++;
  }
  return checkAchievements('onMemoryCollect', state);
}

/**
 * 处理资源变化事件
 * @param {AchievementState} state
 * @param {number} currentStones - 当前灵石数
 * @returns {object[]} 新解锁的成就
 */
export function onResourceChange(state, currentStones) {
  state._currentSpiritStones = currentStones;
  return checkAchievements('onResourceChange', state);
}

/**
 * 处理蝴蝶效应事件
 * @param {AchievementState} state
 * @returns {object[]} 新解锁的成就
 */
export function onButterflyEffect(state) {
  state._butterflyEffectTriggered = true;
  return checkAchievements('onButterflyEffect', state);
}

/**
 * 处理选择事件（用于隐藏对话检测）
 * @param {AchievementState} state
 * @param {boolean} isSimulatorQuestion - 是否为质疑模拟器选项
 * @returns {object[]} 新解锁的成就
 */
export function onChoiceMade(state, isSimulatorQuestion) {
  if (isSimulatorQuestion) {
    state.simulatorQuestionCount++;
  }
  return checkAchievements('onChoiceMade', state);
}

/**
 * 处理秘境进入事件
 * @param {AchievementState} state
 * @returns {object[]} 新解锁的成就
 */
export function onEnterSecretRealm(state) {
  state._secretRealmCount = (state._secretRealmCount || 0) + 1;
  return checkAchievements('onEnterSecretRealm', state);
}

/**
 * 处理秘境通关事件
 * @param {AchievementState} state
 * @returns {object[]} 新解锁的成就
 */
export function onSecretRealmClear(state) {
  state._secretRealmClearCount = (state._secretRealmClearCount || 0) + 1;
  return checkAchievements('onSecretRealmClear', state);
}

/**
 * 处理地点发现事件
 * @param {AchievementState} state
 * @param {string} locationId - 地点ID
 * @returns {object[]} 新解锁的成就
 */
export function onDiscoverLocation(state, locationId) {
  state.discoveredLocations.add(locationId);
  return checkAchievements('onDiscoverLocation', state);
}

/**
 * 处理物品收集事件
 * @param {AchievementState} state
 * @param {number} totalCount - 累计收集物品数
 * @returns {object[]} 新解锁的成就
 */
export function onItemCollect(state, totalCount) {
  state._totalItemsCollected = totalCount;
  return checkAchievements('onItemCollect', state);
}

/**
 * 处理大比结束事件
 * @param {AchievementState} state
 * @param {number} rank - 排名
 * @param {boolean} noDamage - 是否无伤
 * @returns {object[]} 新解锁的成就
 */
export function onTournamentEnd(state, rank, noDamage = false) {
  state._lastTournamentRank = rank;
  state._currentSimNoDamage = state._currentSimNoDamage && noDamage;
  return checkAchievements('onTournamentEnd', state);
}

/**
 * 处理事件完成事件（通用）
 * @param {AchievementState} state
 * @param {string} eventType - 事件类型标识
 * @returns {object[]} 新解锁的成就
 */
export function onEventComplete(state, eventType) {
  if (eventType === 'ancestor_treasure') {
    state._foundAncestorTreasure = true;
  } else if (eventType === 'master_disciple') {
    state._masterDiscipleDone = true;
  } else if (eventType?.startsWith('npc_quest:')) {
    const npcId = eventType.split(':')[1];
    if (!state._npcQuestsCompleted) state._npcQuestsCompleted = [];
    state._npcQuestsCompleted.push(npcId);
  }
  return checkAchievements('onEventComplete', state);
}

// ═══════════════════════════════════════
// 查询接口
// ═══════════════════════════════════════

/**
 * 获取所有成就定义
 * @returns {object[]}
 */
export function getAllAchievements() {
  initRegistry();
  return [...achievementRegistry.values()];
}

/**
 * 按分类获取成就
 * @param {string} category - 分类名称
 * @returns {object[]}
 */
export function getAchievementsByCategory(category) {
  initRegistry();
  return [...achievementRegistry.values()].filter(a => a.category === category);
}

/**
 * 获取成就完成统计
 * @param {AchievementState} state - 成就状态
 * @returns {object} 各分类完成数/总数
 */
export function getAchievementStats(state) {
  initRegistry();
  const stats = {
    total: achievementRegistry.size,
    unlocked: Object.keys(state.unlocked).length,
    byCategory: {},
    byRarity: {},
  };

  for (const ach of achievementRegistry.values()) {
    // 按分类统计
    if (!stats.byCategory[ach.category]) {
      stats.byCategory[ach.category] = { total: 0, unlocked: 0 };
    }
    stats.byCategory[ach.category].total++;
    if (state.unlocked[ach.id]) {
      stats.byCategory[ach.category].unlocked++;
    }

    // 按稀有度统计
    if (!stats.byRarity[ach.rarity]) {
      stats.byRarity[ach.rarity] = { total: 0, unlocked: 0 };
    }
    stats.byRarity[ach.rarity].total++;
    if (state.unlocked[ach.id]) {
      stats.byRarity[ach.rarity].unlocked++;
    }
  }

  return stats;
}

/**
 * 获取单个成就详情（含解锁状态）
 * @param {string} achievementId
 * @param {AchievementState} state
 * @returns {object|null}
 */
export function getAchievementDetail(achievementId, state) {
  initRegistry();
  const ach = achievementRegistry.get(achievementId);
  if (!ach) return null;

  return {
    ...ach,
    isUnlocked: !!state.unlocked[achievementId],
    // 隐藏成就不显示描述（未解锁时）
    displayName: (ach.isHidden && !state.unlocked[achievementId]) ? '???' : ach.name,
    displayDescription: (ach.isHidden && !state.unlocked[achievementId])
      ? '隐藏成就 - ' + (ach.hint || '探索更多以发现线索')
      : ach.description,
  };
}

/**
 * 序列化成就状态（用于存档）
 * @param {AchievementState} state
 * @returns {object}
 */
export function serializeAchievementState(state) {
  return {
    ...state,
    deathMethods: [...(state.deathMethods || [])],
    discoveredLocations: [...(state.discoveredLocations || new Set())],
  };
}

/**
 * 反序列化成就状态（用于读档）
 * @param {object} data
 * @returns {AchievementState}
 */
export function deserializeAchievementState(data) {
  const base = createInitialAchievementState();
  return {
    ...base,
    ...data,
    deathMethods: new Set(data.deathMethods || []),
    discoveredLocations: new Set(data.discoveredLocations || []),
  };
}

// ═══════════════════════════════════════
// 导出
// ═══════════════════════════════════════

export default {
  // 常量
  CATEGORY_NAMES,
  RARITY_NAMES,
  RARITY_COLORS,
  // 状态管理
  createInitialAchievementState,
  serializeAchievementState,
  deserializeAchievementState,
  // 核心检测
  checkAchievements,
  unlockAchievement,
  // 事件处理器
  onRealmChange,
  onBreakthrough,
  onCombatEnd,
  onCombatHit,
  onSimStart,
  onSimEnd,
  onDemonResist,
  onFatalSurvive,
  onNpcRelationChange,
  onTermCollect,
  onTechniqueLearn,
  onMemoryCollect,
  onResourceChange,
  onButterflyEffect,
  onChoiceMade,
  onEnterSecretRealm,
  onSecretRealmClear,
  onDiscoverLocation,
  onItemCollect,
  onTournamentEnd,
  onEventComplete,
  // 查询
  getAllAchievements,
  getAchievementsByCategory,
  getAchievementStats,
  getAchievementDetail,
};
