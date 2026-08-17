/**
 * 存档管理系统 - localStorage 存档读写、压缩、校验、版本迁移
 * @module engines/saveSystem
 */

import { simpleHash, deepClone } from '../utils/helpers.js';
import { eventBus } from '../utils/eventBus.js';

/** 当前存档结构版本号 */
const SCHEMA_VERSION = 1;

/** 当前游戏版本号 */
const GAME_VERSION = '0.1.0';

/** localStorage 键前缀 */
const STORAGE_PREFIX = 'xyxztu_';

/** 默认游戏设置 */
const DEFAULT_SETTINGS = Object.freeze({
  textSpeed: 'normal',
  bgmVolume: 0.7,
  sfxVolume: 0.8,
  vibration: true,
  autoSave: true,
  theme: 'dark',
});

/**
 * 创建空的存档槽位
 * @param {number} id - 槽位编号
 * @returns {object}
 */
function createEmptySlot(id) {
  return {
    id,
    isEmpty: true,
    player: null,
    storyState: {
      currentChapter: 1,
      currentNodeId: '',
      completedNodes: [],
      choicesMade: {},
      butterflyLevel: 0,
      pendingEvents: [],
      activeQuests: [],
    },
    simulationHistory: [],
    meta: {
      saveTime: 0,
      version: GAME_VERSION,
      playTime: 0,
      playerName: '',
      realm: '',
      chapter: 0,
      autoSave: id === 0,
      checksum: '',
    },
  };
}

/**
 * 创建完整的空存档数据
 * @returns {object}
 */
export function createEmptySaveData() {
  return {
    slots: [
      createEmptySlot(0), // 自动存档
      createEmptySlot(1), // 章节存档
      createEmptySlot(2), // 预模拟存档
      createEmptySlot(3), // 手动存档
    ],
    settings: { ...DEFAULT_SETTINGS },
    globalFlags: {},
    schemaVersion: SCHEMA_VERSION,
  };
}

/**
 * 存档管理类
 */
export class SaveSystem {
  constructor() {
    this._saveData = null;
    this._isLoaded = false;
  }

  /**
   * 初始化存档系统（从localStorage加载）
   * @returns {boolean} 是否有有效存档
   */
  init() {
    try {
      const raw = localStorage.getItem(`${STORAGE_PREFIX}save`);
      if (raw) {
        const parsed = JSON.parse(raw);
        // 版本迁移检查
        if (parsed.schemaVersion < SCHEMA_VERSION) {
          this._saveData = this._migrateVersion(parsed);
        } else {
          this._saveData = parsed;
        }
        this._isLoaded = true;
        return true;
      }
    } catch (err) {
      console.error('[SaveSystem] 加载存档失败:', err);
      // 尝试恢复
      this._saveData = this._tryRecover();
      if (this._saveData) {
        this._isLoaded = true;
        return true;
      }
    }
    // 没有存档，创建空数据
    this._saveData = createEmptySaveData();
    this._isLoaded = true;
    return false;
  }

  /**
   * 保存到指定槽位
   * @param {number} slotIndex - 槽位编号 (0-3)
   * @param {object} playerData - 玩家数据
   * @param {object} [storyState] - 剧情状态
   * @param {object} [options] - 选项
   * @param {boolean} [options.autoSave=false] - 是否自动存档
   */
  save(slotIndex, playerData, storyState, options = {}) {
    if (slotIndex < 0 || slotIndex > 3) {
      throw new Error(`[SaveSystem] 无效的槽位: ${slotIndex}`);
    }
    if (!this._saveData) {
      throw new Error('[SaveSystem] 存档系统未初始化');
    }

    const slot = this._saveData.slots[slotIndex];
    const now = Date.now();
    const playerClone = deepClone(playerData);

    slot.isEmpty = false;
    slot.player = playerClone;
    if (storyState) {
      slot.storyState = deepClone(storyState);
    }
    slot.meta.saveTime = now;
    slot.meta.version = GAME_VERSION;
    slot.meta.playTime = playerData.playTime || 0;
    slot.meta.playerName = playerData.name || '';
    slot.meta.realm = playerData.realm || '';
    slot.meta.chapter = storyState?.currentChapter || playerData.flags?.chapter || 1;
    slot.meta.autoSave = options.autoSave || slotIndex === 0;

    // 计算校验码
    slot.meta.checksum = this._computeChecksum(slot);

    // 裁剪模拟历史（保留最近5条）
    if (slot.simulationHistory.length > 5) {
      slot.simulationHistory = slot.simulationHistory.slice(-5);
    }

    // 持久化
    this._persist();

    eventBus.emit('save:completed', { slot: slotIndex, autoSave: options.autoSave });
  }

  /**
   * 从指定槽位加载
   * @param {number} slotIndex - 槽位编号
   * @returns {object|null} 存档数据
   */
  load(slotIndex) {
    if (!this._saveData) return null;
    const slot = this._saveData.slots[slotIndex];
    if (slot.isEmpty) return null;

    // 校验
    const checksum = this._computeChecksum(slot);
    if (checksum !== slot.meta.checksum) {
      console.warn(`[SaveSystem] 槽位 ${slotIndex} 数据校验不一致`);
      // 仍然返回数据，但发出警告
    }

    return deepClone(slot);
  }

  /**
   * 自动存档（存入Slot 0）
   * @param {object} playerData - 玩家数据
   * @param {object} [storyState] - 剧情状态
   */
  autoSave(playerData, storyState) {
    this.save(0, playerData, storyState, { autoSave: true });
  }

  /**
   * 预模拟存档（存入Slot 2）
   * @param {object} playerData
   * @param {object} storyState
   */
  preSimulationSave(playerData, storyState) {
    this.save(2, playerData, storyState, { autoSave: true });
  }

  /**
   * 获取所有槽位的元信息（用于存档选择界面）
   * @returns {Array}
   */
  getSlotMeta() {
    if (!this._saveData) return [];
    return this._saveData.slots.map(slot => ({
      id: slot.id,
      isEmpty: slot.isEmpty,
      playerName: slot.meta.playerName,
      realm: slot.meta.realm,
      chapter: slot.meta.chapter,
      saveTime: slot.meta.saveTime,
      playTime: slot.meta.playTime,
      autoSave: slot.meta.autoSave,
    }));
  }

  /**
   * 获取/设置全局设置
   * @returns {object}
   */
  getSettings() {
    return this._saveData?.settings || { ...DEFAULT_SETTINGS };
  }

  /**
   * 更新设置
   * @param {object} newSettings - 新设置
   */
  updateSettings(newSettings) {
    if (!this._saveData) return;
    Object.assign(this._saveData.settings, newSettings);
    this._persist();
  }

  /**
   * 获取全局标记
   * @returns {object}
   */
  getGlobalFlags() {
    return this._saveData?.globalFlags || {};
  }

  /**
   * 设置全局标记
   * @param {string} key
   * @param {any} value
   */
  setGlobalFlag(key, value) {
    if (!this._saveData) return;
    this._saveData.globalFlags[key] = value;
    this._persist();
  }

  /**
   * 版本迁移
   * @param {object} oldData - 旧版存档数据
   * @returns {object} 迁移后的数据
   * @private
   */
  _migrateVersion(oldData) {
    console.log(`[SaveSystem] 存档版本迁移: v${oldData.schemaVersion} -> v${SCHEMA_VERSION}`);
    // 逐步迁移
    let data = deepClone(oldData);

    // v0 -> v1: 确保所有槽位结构完整
    if (!data.schemaVersion || data.schemaVersion < 1) {
      for (let i = 0; i < 4; i++) {
        if (!data.slots[i]) {
          data.slots[i] = createEmptySlot(i);
        }
        if (!data.slots[i].meta) {
          data.slots[i].meta = createEmptySlot(i).meta;
        }
      }
      data.schemaVersion = 1;
    }

    // 确保设置完整
    data.settings = { ...DEFAULT_SETTINGS, ...data.settings };

    return data;
  }

  /**
   * 尝试从备份恢复
   * @returns {object|null}
   * @private
   */
  _tryRecover() {
    try {
      // 尝试读取未压缩备份
      const backup = localStorage.getItem(`${STORAGE_PREFIX}backup`);
      if (backup) {
        const parsed = JSON.parse(backup);
        console.log('[SaveSystem] 从备份恢复成功');
        return parsed;
      }
    } catch (e) {
      console.error('[SaveSystem] 备份恢复也失败:', e);
    }
    return null;
  }

  /**
   * 计算槽位校验码
   * @param {object} slot - 存档槽位
   * @returns {string} 校验码
   * @private
   */
  _computeChecksum(slot) {
    const data = JSON.stringify({
      player: slot.player,
      storyState: slot.storyState,
      simHistory: slot.simulationHistory,
    });
    return simpleHash(data);
  }

  /**
   * 持久化到 localStorage
   * @private
   */
  _persist() {
    try {
      const json = JSON.stringify(this._saveData);
      localStorage.setItem(`${STORAGE_PREFIX}save`, json);
      // 同时保存一份未压缩备份
      localStorage.setItem(`${STORAGE_PREFIX}backup`, json);
    } catch (err) {
      console.error('[SaveSystem] 持久化失败:', err);
      eventBus.emit('save:error', { error: err.message });
    }
  }

  /**
   * 紧急存档（页面关闭前调用）
   */
  emergencySave() {
    if (this._saveData) {
      this._persist();
    }
  }

  /**
   * 清除所有存档（不可逆！）
   */
  clearAll() {
    localStorage.removeItem(`${STORAGE_PREFIX}save`);
    localStorage.removeItem(`${STORAGE_PREFIX}backup`);
    this._saveData = createEmptySaveData();
    this._persist();
    eventBus.emit('save:cleared');
  }
}

/** 全局存档系统单例 */
export const saveSystem = new SaveSystem();
export default saveSystem;
