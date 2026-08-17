/**
 * 命运模拟状态管理
 * @module stores/simStore
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { deepClone } from '../utils/helpers.js';
import { REALM_TABLE } from '../models/player.js';

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

    return msgs;
  }

  /**
   * 结束模拟
   * @param {string} cause - 死亡原因
   */
  function endSimulation(cause) {
    deathCause.value = cause || '寿元耗尽，元神消散于天地之间';
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
            restored.simInsights = restored.simInsights || [];
            restored.simInsights.push(selectedReward.insightId);
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
