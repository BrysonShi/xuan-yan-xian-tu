/**
 * Pinia 玩家状态管理
 * @module stores/playerStore
 */

import { defineStore } from 'pinia';
import { shallowRef, triggerRef, computed } from 'vue';
import { createNewPlayer, REALM_TABLE } from '../models/player.js';
import { deepClone } from '../utils/helpers.js';

export const usePlayerStore = defineStore('player', () => {
  // ─── 响应式状态 ───

  /** 玩家数据（使用shallowRef避免深层响应式风暴） */
  const playerData = shallowRef(null);

  /** 是否已加载存档 */
  const isLoaded = shallowRef(false);

  // ─── 计算属性 ───

  /** 当前境界名称 */
  const realmName = computed(() => playerData.value?.realm || '炼气一层');

  /** 修为百分比 */
  const cultivationPercent = computed(() => {
    if (!playerData.value) return 0;
    const { cultivation, maxCultivation } = playerData.value;
    return maxCultivation > 0 ? Math.min(100, Math.round((cultivation / maxCultivation) * 100)) : 0;
  });

  /** 气血百分比 */
  const hpPercent = computed(() => {
    if (!playerData.value) return 0;
    const { hp, maxHp } = playerData.value;
    return maxHp > 0 ? Math.round((hp / maxHp) * 100) : 0;
  });

  /** 灵力百分比 */
  const mpPercent = computed(() => {
    if (!playerData.value) return 0;
    const { mp, maxMp } = playerData.value;
    return maxMp > 0 ? Math.round((mp / maxMp) * 100) : 0;
  });

  /** 已装备词条列表 */
  const equippedTerms = computed(() => {
    if (!playerData.value) return [];
    return playerData.value.slots
      .filter(s => s.termId && !s.locked)
      .map(s => s.termId);
  });

  // ─── 操作方法 ───

  /**
   * 创建新角色并设置到store
   * @param {string} name - 角色名
   * @param {object} [options] - 自定义选项
   */
  function createPlayer(name, options) {
    const newPlayer = createNewPlayer(name, options);
    playerData.value = newPlayer;
    isLoaded.value = true;
    return newPlayer;
  }

  /**
   * 从存档加载角色数据
   * @param {object} data - 存档中的玩家数据
   */
  // 存档迁移函数
  function migrateSaveData(data) {
    if (!data.flags) data.flags = {};
    // 0.1.0 → 0.2.0: 添加 sim_daily, memory_fragment_slots
    if (!data.flags.sim_daily) {
      data.flags.sim_daily = { date: '', count: 0 };
    }
    if (data.flags.memory_fragment_slots === undefined) {
      data.flags.memory_fragment_slots = 5;
    }
    // 迁移 simInsights → memoryFragments
    if (data.simInsights && data.simInsights.length && !data.memoryFragments) {
      data.memoryFragments = data.simInsights.map(id => ({
        id, name: id, description: '', matchTags: [], used: false
      }));
    }
    if (data.simInsights) delete data.simInsights;
    data.version = '0.2.0';
    return data;
  }

  function loadFromSave(data) {
    const migrated = migrateSaveData(data);
    playerData.value = deepClone(migrated);
    isLoaded.value = true;
  }

  /**
   * 更新整个玩家数据对象
   * @param {object} newPlayer - 新玩家数据
   */
  function updatePlayer(newPlayer) {
    playerData.value = deepClone(newPlayer);
  }

  /**
   * 批量更新玩家数据（避免响应式风暴）
   * @param {Function} updater - 更新函数，接收原始数据对象
   */
  function batchUpdate(updater) {
    if (!playerData.value) return;
    const raw = deepClone(playerData.value);
    updater(raw);
    raw.updatedAt = Date.now();
    playerData.value = raw;
  }

  /**
   * 更新单个属性
   * @param {string} path - 属性路径
   * @param {any} value - 新值
   */
  function updateField(path, value) {
    batchUpdate(player => {
      const keys = path.split('.');
      let current = player;
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]];
        if (!current) return;
      }
      current[keys[keys.length - 1]] = value;
    });
  }

  /**
   * 装备词条到指定槽位
   * @param {number} slotIndex - 槽位索引
   * @param {string} termId - 词条ID
   * @returns {boolean} 是否成功
   */
  function equipTerm(slotIndex, termId) {
    let success = false;
    batchUpdate(player => {
      const slot = player.slots[slotIndex];
      if (!slot || slot.locked) return;
      // 卸下旧词条
      if (slot.termId) {
        // 旧词条回到待装备状态（仍在collectedTerms中）
      }
      slot.termId = termId;
      success = true;
    });
    return success;
  }

  /**
   * 卸下槽位词条
   * @param {number} slotIndex - 槽位索引
   */
  function unequipTerm(slotIndex) {
    batchUpdate(player => {
      const slot = player.slots[slotIndex];
      if (slot && !slot.locked) {
        slot.termId = null;
      }
    });
  }

  /**
   * 增加/减少资源
   * @param {string} resourceKey - 资源key
   * @param {number} amount - 变化量（正数增加，负数减少）
   */
  function modifyResource(resourceKey, amount) {
    batchUpdate(player => {
      if (player.resources[resourceKey] !== undefined) {
        player.resources[resourceKey] = Math.max(0, player.resources[resourceKey] + amount);
      }
    });
  }

  /**
   * 添加记忆碎片（来自命运模拟）
   * @param {string} insightId - 记忆碎片ID
   */
  function addInsight(insightId) {
    batchUpdate(player => {
      player.simInsights = player.simInsights || [];
      if (!player.simInsights.includes(insightId)) {
        player.simInsights.push(insightId);
      }
    });
  }

  /**
   * 获取玩家数据原始引用（只读用途）
   * @returns {object|null}
   */
  function getRawPlayer() {
    return playerData.value;
  }

  /**
   * 清除store
   */
  function clear() {
    playerData.value = null;
    isLoaded.value = false;
  }

  return {
    // 状态
    playerData,
    isLoaded,
    // 计算属性
    realmName,
    cultivationPercent,
    hpPercent,
    mpPercent,
    equippedTerms,
    // 方法
    createPlayer,
    updatePlayer,
    loadFromSave,
    batchUpdate,
    updateField,
    equipTerm,
    unequipTerm,
    modifyResource,
    addInsight,
    getRawPlayer,
    clear,
  };
});

export default usePlayerStore;
