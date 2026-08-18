/**
 * 命运模拟状态管理
 * @module stores/simStore
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { deepClone } from '../utils/helpers.js';
import { REALM_TABLE } from '../models/player.js';

// ─── 天机反噬概率计算（v2.1 修正公式）───
/**
 * 计算天机反噬死亡概率
 * @param {number} yearsElapsed - 模拟中经过的年数
 * @param {number} realmLevel - 当前境界等级
 * @returns {number} 当年死亡概率 (0~0.15)
 */
export function getDeathProbability(yearsElapsed, realmLevel) {
  // 前 5 年免疫天机反噬
  if (yearsElapsed < 5) return 0;
  const baseChance = 0.01;
  // 高境界减免：炼气九层减免 40%
  const realmResist = 1 - (realmLevel || 0) * 0.05;
  // 超线性增长，30 年后急剧增加
  const timeFactor = Math.pow((yearsElapsed - 5) / 30, 1.5);
  const p = baseChance * realmResist * timeFactor;
  return Math.min(0.15, p);
}

// ─── 碎片标签匹配 ───
/**
 * 从碎片列表中找出与当前场景匹配的记忆碎片
 * @param {object} scene - 场景对象（需含 tags 字段）
 * @param {Array} fragments - 记忆碎片列表
 * @returns {Array} 匹配的碎片列表
 */
export function findMatchingInsights(scene, fragments) {
  const sceneTags = scene?.tags || [];
  if (!sceneTags.length || !fragments?.length) return [];
  return fragments.filter(f =>
    !f.used && f.matchTags?.some(tag => sceneTags.includes(tag))
  );
}

// ─── 碎片模板库（根据死因/场景标签产出碎片）───
const FRAGMENT_TEMPLATES = [
  { tags: ['npc:chenmo', 'conflict:背叛'], name: '陈墨的背叛征兆', description: '他眼中一闪而过的算计，在你转身时终于露出獠牙。', matchTags: ['npc:chenmo', 'conflict:背叛'] },
  { tags: ['npc:wanghao', 'combat:切磋'], name: '王浩的剑法破绽', description: '他的剑法刚猛有余，收招时右肋有半息空隙。', matchTags: ['npc:wanghao', 'combat:切磋'] },
  { tags: ['npc:liufei', 'combat:暗器', 'conflict:对决'], name: '柳飞的暗器习惯', description: '先风刃远程，再近身绞杀——这是他的惯用套路。', matchTags: ['npc:liufei', 'combat:暗器', 'conflict:对决'] },
  { tags: ['danger:妖兽', 'explore:后山'], name: '后山妖兽出没规律', description: '子时前后，后山深处常有二阶妖兽徘徊。', matchTags: ['danger:妖兽', 'explore:后山'] },
  { tags: ['explore:洞府', '机遇:功法'], name: '崖壁裂缝中的秘密', description: '后山崖壁上有一处隐蔽裂缝，里面有前人遗留。', matchTags: ['explore:洞府', '机遇:功法'] },
  { tags: ['机遇:灵泉'], name: '灵泉位置记忆', description: '银灵狐带你找到的那处灵泉，灵气浓度极高。', matchTags: ['机遇:灵泉'] },
  { tags: ['danger:天机反噬'], name: '天道法则残影', description: '模拟中隐约触碰到的天道法则碎片，令人警醒。', matchTags: ['danger:天机反噬'] },
  { tags: ['修炼:突破', '机遇:瓶颈'], name: '突破瓶颈的心得', description: '模拟中冲击瓶颈时的感悟，或可复用。', matchTags: ['修炼:突破', '机遇:瓶颈'] },
];

/**
 * 根据死亡上下文生成记忆碎片
 * @param {string} deathCause - 死因
 * @param {Array} deathSceneTags - 死亡场景的标签
 * @param {number} simYears - 模拟存活年数
 * @param {string} grade - 评价等级
 * @returns {Array} 新生成的碎片列表
 */
export function generateDeathFragments(deathCause, deathSceneTags = [], simYears = 0, grade = 'D') {
  const fragments = [];
  // 保底产出 1 个碎片
  // 优先匹配死亡场景标签
  const matched = FRAGMENT_TEMPLATES.filter(t =>
    t.matchTags.some(tag => deathSceneTags.includes(tag))
  );
  if (matched.length > 0) {
    const template = matched[Math.floor(Math.random() * matched.length)];
    fragments.push({
      id: `frag_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: template.name,
      description: template.description,
      matchTags: [...template.matchTags],
      acquiredAt: Date.now(),
      used: false,
      source: 'death',
    });
  } else {
    // 通用碎片
    fragments.push({
      id: `frag_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: '命运残影',
      description: `死于${deathCause}，这段经历化为记忆碎片。`,
      matchTags: ['general'],
      acquiredAt: Date.now(),
      used: false,
      source: 'death',
    });
  }

  // S/A 评价额外产出 1 个碎片
  if ((grade === 'S' || grade === 'A') && Math.random() < 0.7) {
    const allTemplates = FRAGMENT_TEMPLATES.filter(t =>
      !fragments.some(f => f.name === t.name)
    );
    if (allTemplates.length > 0) {
      const template = allTemplates[Math.floor(Math.random() * allTemplates.length)];
      fragments.push({
        id: `frag_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: template.name,
        description: template.description,
        matchTags: [...template.matchTags],
        acquiredAt: Date.now(),
        used: false,
        source: 'bonus',
      });
    }
  }

  return fragments;
}

/**
 * 根据死因生成教训文本
 * @param {string} deathCause - 死因原文
 * @returns {string} 教训文本
 */
export function getDeathLesson(deathCause) {
  const cause = deathCause || '';
  if (cause.includes('寿元耗尽') || cause.includes('坐化')) return '修行须惜时，莫待白头空叹息。';
  if (cause.includes('陈墨') || cause.includes('背叛')) return '人心叵测，最亲近之人亦须提防。';
  if (cause.includes('王浩') || cause.includes('剑')) return '剑修之威不可小觑，当先避其锋芒。';
  if (cause.includes('柳飞') || cause.includes('暗器')) return '暗器难防，须留意对方起手式。';
  if (cause.includes('妖兽') || cause.includes('兽')) return '妖兽凶猛，实力不足时莫要深入。';
  if (cause.includes('天机') || cause.includes('反噬')) return '窥探天机，终有代价。';
  if (cause.includes('坠落') || cause.includes('悬崖')) return '高处不胜寒，行走悬崖须谨慎。';
  if (cause.includes('伤重') || cause.includes('重伤')) return '当断则断，不可恋战。';
  return '命运轨迹已现，下次或可避开此劫。';
}

export const useSimStore = defineStore('sim', () => {
  // ─── 状态 ───

  /** 存档快照：{ sceneId, playerState } */
  const saveSnapshot = ref(null);

  /** 是否处于模拟中 */
  const isSimulating = ref(false);

  /** 模拟中的事件日志 [{ year, text, isDeath? }] */
  const simHistory = ref([]);

  /** 模拟收益 */
  const simRewards = ref({
    cultivation: 0,
    spiritStones: 0,
    terms: [],
    insights: [],
    kills: 0,
    highestRealm: '',
    highestRealmLevel: 0,
  });

  /** 模拟经过年数 */
  const simYears = ref(0);

  /** 死亡原因 */
  const deathCause = ref('');

  /** 死亡教训（P1 新增） */
  const deathLesson = ref('');

  /** 死亡场景标签（P1 新增） */
  const deathSceneTags = ref([]);

  /** 本次模拟产出的记忆碎片（P1 新增） */
  const generatedFragments = ref([]);

  /** 模拟中的临时玩家状态（深拷贝副本） */
  const simPlayerState = ref(null);

  /** 模拟中的起始境界等级 */
  const startRealmLevel = ref(0);

  /** 模拟中的起始年龄 */
  const startAge = ref(16);

  // ─── 计算属性 ───

  /** 模拟中经历的事件数 */
  const eventCount = computed(() => simHistory.value.length);

  /** 模拟中的最高境界名称 */
  const highestRealm = computed(() => simRewards.value.highestRealm || '未突破');

  // ─── Actions ───

  /**
   * 开始模拟：深拷贝当前玩家状态作为存档快照
   * @param {string} sceneId - 当前场景ID
   * @param {object} playerStore - 玩家store实例
   */
  function startSimulation(sceneId, playerStore) {
    const rawPlayer = deepClone(playerStore.playerData);
    saveSnapshot.value = {
      sceneId,
      playerState: rawPlayer,
    };
    // 初始化模拟状态
    simPlayerState.value = deepClone(rawPlayer);
    isSimulating.value = true;
    simHistory.value = [];
    simYears.value = 0;
    deathCause.value = '';
    simRewards.value = {
      cultivation: 0,
      spiritStones: 0,
      terms: [],
      insights: [],
      kills: 0,
      highestRealm: rawPlayer.realm || '炼气一层',
      highestRealmLevel: rawPlayer.realmLevel || 0,
    };
    startRealmLevel.value = rawPlayer.realmLevel || 0;
    startAge.value = rawPlayer.age || 16;
  }

  /**
   * 记录模拟事件
   * @param {number} year - 当前模拟年份
   * @param {string} text - 事件文本
   * @param {boolean} isDeath - 是否为死亡事件
   */
  function recordEvent(year, text, isDeath = false) {
    simHistory.value.push({ year, text, isDeath });
  }

  /**
   * 累积模拟收益
   * @param {string} type - 收益类型 (cultivation/spiritStones/kills/...)
   * @param {any} amount - 数值或内容
   */
  function applySimReward(type, amount) {
    if (type === 'cultivation' || type === 'spiritStones' || type === 'kills') {
      simRewards.value[type] = (simRewards.value[type] || 0) + amount;
    } else if (type === 'terms' || type === 'insights') {
      simRewards.value[type].push(amount);
    }
  }

  /**
   * 更新最高境界记录
   * @param {string} realmName - 境界名称
   * @param {number} realmLevel - 境界等级
   */
  function updateHighestRealm(realmName, realmLevel) {
    if (realmLevel > simRewards.value.highestRealmLevel) {
      simRewards.value.highestRealm = realmName;
      simRewards.value.highestRealmLevel = realmLevel;
    }
  }

  /**
   * 模拟中的 applyEffect：操作 simPlayerState 副本
   * @param {object} effects - 效果对象
   * @returns {string[]} 产生的消息列表
   */
  function applySimEffect(effects) {
    if (!effects || !simPlayerState.value) return [];
    const msgs = [];
    const p = simPlayerState.value;

    if (effects.cultivation) {
      p.cultivation += effects.cultivation;
      msgs.push(`修为 +${effects.cultivation}`);
      simRewards.value.cultivation += effects.cultivation;
    }
    if (effects.spiritStones) {
      p.resources.spiritStones += effects.spiritStones;
      msgs.push(`灵石 +${effects.spiritStones}`);
      simRewards.value.spiritStones += effects.spiritStones;
    }
    if (effects.destinyPoints) {
      p.resources.destinyPoints += effects.destinyPoints;
      msgs.push(`天机点 +${effects.destinyPoints}`);
    }
    if (effects.merit) {
      p.resources.merit += effects.merit;
      msgs.push(`功德 +${effects.merit}`);
    }
    if (effects.reputation) {
      p.resources.reputation += effects.reputation;
      msgs.push(`声望 +${effects.reputation}`);
    }

    // 检查突破
    while (p.cultivation >= p.maxCultivation) {
      p.cultivation -= p.maxCultivation;
      p.realmLevel++;
      const nextRealm = REALM_TABLE[p.realmLevel];
      if (nextRealm) {
        p.realm = nextRealm.name;
        p.maxCultivation = nextRealm.maxCultivation;
        msgs.push(`突破至${nextRealm.name}！`);
        updateHighestRealm(nextRealm.name, nextRealm.level);
      } else {
        p.cultivation = p.maxCultivation;
        break;
      }
    }

    // 强制触发 Vue 响应式更新（重新赋值整个对象引用）
    simPlayerState.value = { ...p, resources: { ...p.resources } };

    return msgs;
  }

  /**
   * 结束模拟（P1：含死亡复盘 + 碎片生成）
   * @param {string} cause - 死亡原因
   * @param {string[]} sceneTags - 死亡场景标签
   * @param {string} grade - 评价等级
   */
  function endSimulation(cause, sceneTags = [], grade = 'D') {
    deathCause.value = cause || '寿元耗尽，元神消散于天地之间';
    deathLesson.value = getDeathLesson(deathCause.value);
    deathSceneTags.value = sceneTags;
    // 生成记忆碎片（保底 1 个）
    generatedFragments.value = generateDeathFragments(
      deathCause.value, sceneTags, simYears.value, grade
    );
    isSimulating.value = false;
  }

  /**
   * 获取当前模拟收益
   * @returns {object} simRewards
   */
  function getReward() {
    return deepClone(simRewards.value);
  }

  /**
   * 恢复存档并合并选中的奖励
   * @param {object} selectedReward - 选中的奖励对象
   * @param {object} playerStore - 玩家store实例
   */
  function restoreAndMerge(selectedReward, playerStore) {
    if (!saveSnapshot.value) return;

    // 恢复到存档点的玩家状态
    const restored = deepClone(saveSnapshot.value.playerState);

    // 合并奖励
    if (selectedReward) {
      switch (selectedReward.type) {
        case 'cultivation':
          restored.cultivation += (selectedReward.amount || 0);
          // 检查突破
          while (restored.cultivation >= restored.maxCultivation) {
            restored.cultivation -= restored.maxCultivation;
            restored.realmLevel++;
            const nextRealm = REALM_TABLE[restored.realmLevel];
            if (nextRealm) {
              restored.realm = nextRealm.name;
              restored.maxCultivation = nextRealm.maxCultivation;
            } else {
              restored.cultivation = restored.maxCultivation;
              break;
            }
          }
          break;
        case 'spiritStones':
          restored.resources.spiritStones += (selectedReward.amount || 0);
          break;
        case 'term':
          if (selectedReward.termId) {
            restored.collectedTerms = restored.collectedTerms || [];
            restored.collectedTerms.push(selectedReward.termId);
          }
          break;
        case 'insight':
          if (selectedReward.insightId) {
            // P1: 改为写入 memoryFragments（新结构）
            restored.memoryFragments = restored.memoryFragments || [];
            // 从 generatedFragments 中找对应碎片
            const frag = generatedFragments.value.find(f => f.id === selectedReward.insightId);
            if (frag) {
              restored.memoryFragments.push({ ...frag });
            } else {
              // fallback：生成通用碎片
              restored.memoryFragments.push({
                id: selectedReward.insightId,
                name: '记忆碎片',
                description: '',
                matchTags: ['general'],
                acquiredAt: Date.now(),
                used: false,
              });
            }
          }
          break;
      }
    }

    restored.updatedAt = Date.now();
    playerStore.updatePlayer(restored);

    // 更新统计
    playerStore.batchUpdate(p => {
      p.stats.totalSimulations = (p.stats.totalSimulations || 0) + 1;
      if (deathCause.value) {
        p.stats.totalDeaths = (p.stats.totalDeaths || 0) + 1;
        p.stats.deathCauses = p.stats.deathCauses || {};
        p.stats.deathCauses[deathCause.value] = (p.stats.deathCauses[deathCause.value] || 0) + 1;
      }
      if (simYears.value > p.stats.longestLife) {
        p.stats.longestLife = simYears.value;
      }
    });
  }

  /**
   * 重置模拟状态
   */
  function reset() {
    saveSnapshot.value = null;
    isSimulating.value = false;
    simHistory.value = [];
    simRewards.value = {
      cultivation: 0,
      spiritStones: 0,
      terms: [],
      insights: [],
      kills: 0,
      highestRealm: '',
      highestRealmLevel: 0,
    };
    simYears.value = 0;
    deathCause.value = '';
    deathLesson.value = '';
    deathSceneTags.value = [];
    generatedFragments.value = [];
    simPlayerState.value = null;
    startRealmLevel.value = 0;
    startAge.value = 16;
  }

  return {
    // 状态
    saveSnapshot,
    isSimulating,
    simHistory,
    simRewards,
    simYears,
    deathCause,
    deathLesson,
    deathSceneTags,
    generatedFragments,
    simPlayerState,
    startRealmLevel,
    startAge,
    // 计算属性
    eventCount,
    highestRealm,
    // Actions
    startSimulation,
    recordEvent,
    applySimReward,
    updateHighestRealm,
    applySimEffect,
    endSimulation,
    getReward,
    restoreAndMerge,
    reset,
  };
});

export default useSimStore;
