/**
 * 模拟系统引擎 - 管理模拟的启动、推进、死亡判定和结算
 * @module engines/simulationEngine
 */

import { SeededRandom } from './seededRng.js';
import { EventDispatcher } from './eventDispatcher.js';
import { calculateCultivation, calculateBreakthrough, calculateTermEffects } from './calculationEngine.js';
import { evaluateCondition, isOptionVisible, isOptionEnabled } from '../models/event.js';
import { createNewPlayer, REALM_TABLE, getMaxLifespan } from '../models/player.js';
import { deepClone, generateId } from '../utils/helpers.js';
import { eventBus } from '../utils/eventBus.js';

/**
 * 模拟引擎类
 */
export class SimulationEngine {
  /**
   * @param {object} deps - 依赖注入
   * @param {EventDispatcher} deps.dispatcher - 事件调度器
   * @param {Map} deps.termRegistry - 词条注册表
   * @param {Map} deps.eventRegistry - 事件注册表（原始数据Map）
   */
  constructor(deps = {}) {
    this._dispatcher = deps.dispatcher || new EventDispatcher();
    this._termRegistry = deps.termRegistry || new Map();
    this._eventRegistry = deps.eventRegistry || new Map();

    /** @type {object|null} 模拟运行时状态 */
    this._simState = null;
  }

  /**
   * 获取当前模拟状态
   * @returns {object|null}
   */
  getSimState() {
    return this._simState;
  }

  /**
   * 启动一次模拟
   * @param {object} config - 模拟配置
   * @param {object} config.player - 现实中的玩家数据
   * @param {string[]} config.terms - 选中的词条ID列表（最多3个）
   * @param {string} [config.speed='normal'] - 模拟速度
   * @param {number} [config.simCost=10] - 模拟消耗灵石
   * @returns {object} 初始化后的模拟状态
   */
  startSimulation(config) {
    const { player, terms, speed = 'normal', simCost = 10 } = config;

    // 扣除灵石
    if (player.resources.spiritStones < simCost) {
      throw new Error('灵石不足，无法启动模拟');
    }
    player.resources.spiritStones -= simCost;

    // 创建模拟角色（基于现实角色+模拟词条）
    const simCharacter = this._createSimCharacter(player, terms);

    // 生成种子
    const seed = `${player.id}_${Date.now()}_${Math.random()}`;
    const rng = new SeededRandom(seed);

    // 初始化模拟状态
    this._simState = {
      simId: generateId('sim'),
      startYear: player.age,
      currentYear: player.age,
      maxYear: getMaxLifespan(player),
      character: simCharacter,
      simTerms: terms || [],
      eventLog: [],
      savePoints: [],
      status: 'running',
      speed,
      butterflyOffset: 0,
      seed,
      rng: rng,
      eventCount: 0,
      startTime: Date.now(),
    };

    eventBus.emit('sim:started', { simId: this._simState.simId });
    return this._simState;
  }

  /**
   * 创建模拟角色
   * @param {object} realPlayer - 现实玩家数据
   * @param {string[]} termIds - 模拟词条ID列表
   * @returns {object} 模拟角色数据
   * @private
   */
  _createSimCharacter(realPlayer, termIds) {
    const character = deepClone(realPlayer);

    // 应用模拟词条效果
    for (const termId of (termIds || [])) {
      const term = this._termRegistry.get(termId);
      if (!term) continue;

      for (const effect of term.effects) {
        this._applyTermEffectToCharacter(effect, character);
      }

      // 加入装备槽
      const emptySlot = character.slots.find(s => !s.termId && !s.locked);
      if (emptySlot) {
        emptySlot.termId = termId;
      }
    }

    return character;
  }

  /**
   * 将词条效果应用到模拟角色
   * @param {object} effect - 词条效果
   * @param {object} character - 模拟角色
   * @private
   */
  _applyTermEffectToCharacter(effect, character) {
    const { type, target, value } = effect;

    if (type === 'flat_add') {
      // 固定属性加成
      if (character.attributes[target] !== undefined) {
        character.attributes[target] += value;
      } else if (target === 'maxHp') {
        character.maxHp += value;
        character.hp += value;
      } else if (target === 'maxMp') {
        character.maxMp += value;
        character.mp += value;
      } else if (target === 'spiritStones') {
        character.resources.spiritStones += value;
      }
    } else if (type === 'percent_add') {
      if (target === 'maxHp') {
        const bonus = Math.round(character.maxHp * value / 100);
        character.maxHp += bonus;
        character.hp += bonus;
      } else if (target === 'maxMp') {
        const bonus = Math.round(character.maxMp * value / 100);
        character.maxMp += bonus;
        character.mp += bonus;
      }
    }
    // 其他效果类型在模拟运行时动态处理
  }

  /**
   * 推进一年（模拟主循环的一步）
   * @returns {object} 年度结果 { year, cultivationGain, events, pendingEvent }
   */
  advanceYear() {
    if (!this._simState || this._simState.status !== 'running') {
      throw new Error('[SimEngine] 模拟未在运行中');
    }

    const year = this._simState.currentYear;
    const character = this._simState.character;
    const context = this._buildSimContext();

    // 1. 计算年度修为增长
    const termBonuses = calculateTermEffects(character, this._termRegistry);
    const dailyRate = calculateCultivation(character, context, { termBonuses });
    const yearlyGain = Math.round(dailyRate * 365);
    character.cultivation += yearlyGain;

    // 2. 检查境界突破
    let breakthroughResult = null;
    if (character.cultivation >= character.maxCultivation) {
      breakthroughResult = this._attemptBreakthrough(character, context, termBonuses);
    }

    // 3. 年龄增长
    this._simState.currentYear++;

    // 4. 寿元检查
    if (this._simState.currentYear > this._simState.maxYear) {
      return this._endSimulation('寿元耗尽');
    }

    // 5. 气血自然恢复（每年恢复5%）
    const hpRegen = Math.round(character.maxHp * 0.05);
    character.hp = Math.min(character.maxHp, character.hp + hpRegen);

    // 6. 选取事件
    const event = this._dispatcher.selectNextEvent(context, undefined);

    const result = {
      year,
      cultivationGain: yearlyGain,
      breakthrough: breakthroughResult,
      pendingEvent: event,
      ended: this._simState.status !== 'running',
    };

    eventBus.emit('sim:year_advanced', result);
    return result;
  }

  /**
   * 尝试境界突破
   * @param {object} character - 角色数据
   * @param {object} context - 上下文
   * @param {object} termBonuses - 词条加成
   * @returns {object} 突破结果
   * @private
   */
  _attemptBreakthrough(character, context, termBonuses) {
    const rate = calculateBreakthrough(character, context, { termBonuses });
    const roll = context.rng.random();
    const success = roll < rate;

    if (success && character.realmLevel < REALM_TABLE.length - 1) {
      const nextLevel = character.realmLevel + 1;
      const nextRealm = REALM_TABLE[nextLevel];
      character.realmLevel = nextLevel;
      character.realm = nextRealm.name;
      character.maxCultivation = nextRealm.maxCultivation;
      character.cultivation = 0;
      // 突破后属性提升
      character.maxHp += 20;
      character.hp = character.maxHp;
      character.maxMp += 10;
      character.mp = character.maxMp;

      // 更新最大寿命
      this._simState.maxYear = nextRealm.lifespan;

      return { success: true, newRealm: nextRealm.name, rate };
    }

    if (!success) {
      // 失败惩罚：损失部分修为
      character.cultivation = Math.round(character.cultivation * 0.8);
      character.hp = Math.max(1, character.hp - Math.round(character.maxHp * 0.1));
    }

    return { success: false, rate };
  }

  /**
   * 处理玩家对事件的选择
   * @param {string} eventId - 事件ID
   * @param {string} optionId - 选项ID
   * @returns {object} 选择结果
   */
  handleChoice(eventId, optionId) {
    if (!this._simState || this._simState.status !== 'running') {
      throw new Error('[SimEngine] 模拟未在运行中');
    }

    const event = this._eventRegistry.get(eventId);
    if (!event) {
      throw new Error(`[SimEngine] 未找到事件: ${eventId}`);
    }

    const option = event.options.find(o => o.id === optionId);
    if (!option) {
      throw new Error(`[SimEngine] 未找到选项: ${optionId}`);
    }

    const context = this._buildSimContext();
    const character = this._simState.character;

    // 成功率判定
    const successRate = option.successRate !== undefined ? option.successRate : 1;
    const roll = context.rng.random();
    const isSuccess = roll < successRate;

    // 获取结果
    const result = isSuccess ? option.successResult : (option.failureResult || option.successResult);

    // 应用结果
    this._applyResult(result, character, context);

    // 记录事件日志
    const logEntry = {
      year: this._simState.currentYear,
      eventId,
      optionId,
      success: isSuccess,
      resultText: result.resultText || '',
    };
    this._simState.eventLog.push(logEntry);
    this._simState.eventCount++;

    // 记录事件触发
    this._dispatcher.dispatchEvent(eventId, this._simState.currentYear);

    // 检查死亡
    if (result.triggerDeath || character.hp <= 0) {
      const deathCause = result.deathCause || '伤重不治';
      return this._endSimulation(deathCause);
    }

    // 检查后续事件
    let nextEvent = null;
    if (result.nextEvent) {
      nextEvent = this._eventRegistry.get(result.nextEvent);
    } else if (isSuccess && result.successNext) {
      nextEvent = this._eventRegistry.get(result.successNext);
    } else if (!isSuccess && result.failureNext) {
      nextEvent = this._eventRegistry.get(result.failureNext);
    }

    const choiceResult = {
      eventId,
      optionId,
      isSuccess,
      resultText: result.resultText,
      changes: this._summarizeChanges(result),
      nextEvent,
      ended: this._simState.status !== 'running',
    };

    eventBus.emit('sim:choice_made', choiceResult);
    return choiceResult;
  }

  /**
   * 将结果应用到角色数据
   * @param {object} result - 选项结果
   * @param {object} character - 角色数据
   * @param {object} context - 上下文
   * @private
   */
  _applyResult(result, character, context) {
    // 属性变化
    if (result.attributeChanges) {
      for (const [key, value] of Object.entries(result.attributeChanges)) {
        if (character.attributes[key] !== undefined) {
          character.attributes[key] = Math.max(0, character.attributes[key] + value);
        }
      }
    }

    // 气血/灵力变化
    if (result.hpChange) {
      character.hp = Math.max(0, Math.min(character.maxHp, character.hp + result.hpChange));
    }
    if (result.mpChange) {
      character.mp = Math.max(0, Math.min(character.maxMp, character.mp + result.mpChange));
    }

    // 修为变化
    if (result.cultivationChange) {
      const change = result.cultivationChange;
      if (typeof change === 'string' && change.endsWith('%')) {
        const percent = parseInt(change) / 100;
        character.cultivation += Math.round(character.maxCultivation * percent);
      } else {
        character.cultivation += change;
      }
      character.cultivation = Math.max(0, character.cultivation);
    }

    // 资源变化
    if (result.resourceChanges) {
      for (const [key, value] of Object.entries(result.resourceChanges)) {
        if (character.resources[key] !== undefined) {
          character.resources[key] = Math.max(0, character.resources[key] + value);
        }
      }
    }

    // 获得物品
    if (result.itemsGained && result.itemsGained.length > 0) {
      for (const item of result.itemsGained) {
        const existing = character.inventory.find(i => i.itemId === item.itemId);
        if (existing) {
          existing.quantity += item.quantity;
        } else {
          character.inventory.push({ ...item });
        }
      }
    }

    // 失去物品
    if (result.itemsLost && result.itemsLost.length > 0) {
      for (const item of result.itemsLost) {
        const existing = character.inventory.find(i => i.itemId === item.itemId);
        if (existing) {
          existing.quantity -= item.quantity;
          if (existing.quantity <= 0) {
            character.inventory = character.inventory.filter(i => i.itemId !== item.itemId);
          }
        }
      }
    }

    // 获得功法
    if (result.techniquesGained && result.techniquesGained.length > 0) {
      for (const techId of result.techniquesGained) {
        if (!character.techniques.find(t => t.id === techId)) {
          character.techniques.push({ id: techId, level: 0, mastery: 'unfamiliar' });
        }
      }
    }

    // 获得词条
    if (result.termsGained && result.termsGained.length > 0) {
      for (const termId of result.termsGained) {
        if (!character.collectedTerms.includes(termId)) {
          character.collectedTerms.push(termId);
        }
      }
    }

    // 关系变化
    if (result.relationshipChanges && result.relationshipChanges.length > 0) {
      for (const rel of result.relationshipChanges) {
        if (!character.relationships[rel.npcId]) {
          character.relationships[rel.npcId] = {
            npcId: rel.npcId, affinity: 0, trust: 0,
            level: 'neutral', secrets: [], interactionCount: 0,
          };
        }
        character.relationships[rel.npcId].affinity += rel.affinity;
        if (rel.trust !== undefined) {
          character.relationships[rel.npcId].trust += rel.trust;
        }
      }
    }

    // 设置标记
    if (result.setFlags) {
      for (const [key, value] of Object.entries(result.setFlags)) {
        character.flags[key] = value;
      }
    }
  }

  /**
   * 汇总变更内容（用于展示）
   * @param {object} result - 选项结果
   * @returns {string[]} 变更描述列表
   * @private
   */
  _summarizeChanges(result) {
    const changes = [];
    if (result.hpChange) changes.push(`气血 ${result.hpChange > 0 ? '+' : ''}${result.hpChange}`);
    if (result.mpChange) changes.push(`灵力 ${result.mpChange > 0 ? '+' : ''}${result.mpChange}`);
    if (result.attributeChanges) {
      for (const [key, val] of Object.entries(result.attributeChanges)) {
        const names = { comprehension: '悟性', luck: '气运', charisma: '魅力', strength: '根骨', agility: '敏捷', spirit: '神识' };
        changes.push(`${names[key] || key} ${val > 0 ? '+' : ''}${val}`);
      }
    }
    if (result.itemsGained?.length) changes.push(`获得物品 ×${result.itemsGained.length}`);
    if (result.termsGained?.length) changes.push(`获得词条 ×${result.termsGained.length}`);
    return changes;
  }

  /**
   * 结束模拟
   * @param {string} deathCause - 死因/结束原因
   * @returns {object} 模拟结算数据
   * @private
   */
  _endSimulation(deathCause) {
    if (!this._simState) return null;

    this._simState.status = 'ended';

    const duration = Math.round((Date.now() - this._simState.startTime) / 1000);
    const lived = this._simState.currentYear - this._simState.startYear;

    // 生成评价
    const rating = this._calculateRating(this._simState);

    // 生成奖励候选
    const rewards = this._generateRewards(this._simState);

    const settlement = {
      simId: this._simState.simId,
      deathCause,
      startYear: this._simState.startYear,
      endYear: this._simState.currentYear,
      livedYears: lived,
      rating,
      rewards,
      eventCount: this._simState.eventCount,
      duration,
      seed: this._simState.seed,
      finalCharacter: deepClone(this._simState.character),
    };

    eventBus.emit('sim:ended', settlement);
    return settlement;
  }

  /**
   * 计算模拟评价
   * @param {object} simState - 模拟状态
   * @returns {string} 评价等级 D/C/B/A/S
   * @private
   */
  _calculateRating(simState) {
    let score = 0;
    const char = simState.character;

    // 存活年数评分
    score += (simState.currentYear - simState.startYear) * 2;

    // 境界评分
    score += char.realmLevel * 30;

    // 收集词条评分
    score += char.collectedTerms.length * 10;

    // 事件参与评分
    score += simState.eventCount * 5;

    // 评价阈值
    if (score >= 300) return 'S';
    if (score >= 200) return 'A';
    if (score >= 120) return 'B';
    if (score >= 60) return 'C';
    return 'D';
  }

  /**
   * 生成模拟奖励候选（四选一）
   * @param {object} simState - 模拟状态
   * @returns {Array} 奖励候选列表
   * @private
   */
  _generateRewards(simState) {
    const rewards = [];
    const rating = this._calculateRating(simState);
    const rng = simState.rng;

    // 1. 词条奖励（从模拟中获得的词条选一个）
    const collectedTerms = simState.character.collectedTerms.filter(
      tid => this._termRegistry.has(tid)
    );
    if (collectedTerms.length > 0) {
      const termId = rng.pick(collectedTerms);
      const term = this._termRegistry.get(termId);
      rewards.push({
        type: 'term',
        data: term,
        quality: term?.rarity || 'common',
        description: `词条: ${term?.name || termId}`,
      });
    }

    // 2. 修为奖励（转化为现实修为值的一部分）
    const cultivationReward = Math.round(simState.character.cultivation * 0.1);
    if (cultivationReward > 0) {
      rewards.push({
        type: 'cultivation',
        data: cultivationReward,
        description: `修为 +${cultivationReward}`,
      });
    }

    // 3. 功法奖励（模拟中获得的功法）
    const techReward = simState.character.techniques.find(
      t => !['GJ-T01'].includes(t.id) // 排除默认功法
    );
    if (techReward) {
      rewards.push({
        type: 'technique',
        data: techReward,
        description: `功法: ${techReward.id}`,
      });
    }

    // 4. 灵石奖励
    const stoneReward = Math.round((simState.currentYear - simState.startYear) * 3);
    rewards.push({
      type: 'spiritStones',
      data: stoneReward,
      description: `灵石 +${stoneReward}`,
    });

    return rewards;
  }

  /**
   * 结算模拟 - 将奖励合并到现实角色
   * @param {object} realPlayer - 现实角色数据
   * @param {object} reward - 选择的奖励
   * @returns {object} 更新后的现实角色
   */
  settleSimulation(realPlayer, reward) {
    if (!reward) return realPlayer;

    switch (reward.type) {
      case 'term':
        if (reward.data?.id && !realPlayer.collectedTerms.includes(reward.data.id)) {
          realPlayer.collectedTerms.push(reward.data.id);
        }
        break;
      case 'cultivation':
        realPlayer.cultivation += (reward.data || 0);
        break;
      case 'technique':
        if (reward.data?.id) {
          const exists = realPlayer.techniques.find(t => t.id === reward.data.id);
          if (!exists) {
            realPlayer.techniques.push({ id: reward.data.id, level: 0, mastery: 'unfamiliar' });
          }
        }
        break;
      case 'spiritStones':
        realPlayer.resources.spiritStones += (reward.data || 0);
        break;
    }

    // 更新统计
    realPlayer.stats.totalSimulations++;
    if (this._simState) {
      realPlayer.stats.totalDeaths++;
      const deathCause = 'unknown';
      realPlayer.stats.deathCauses[deathCause] = (realPlayer.stats.deathCauses[deathCause] || 0) + 1;
      const lived = this._simState.currentYear - this._simState.startYear;
      if (lived > realPlayer.stats.longestLife) {
        realPlayer.stats.longestLife = lived;
      }
    }

    // 清理模拟状态
    this._simState = null;

    return realPlayer;
  }

  /**
   * 构建模拟上下文
   * @returns {object} 游戏上下文
   * @private
   */
  _buildSimContext() {
    return {
      player: this._simState.character,
      currentScene: 'simulation',
      currentYear: this._simState.currentYear,
      currentDay: 0,
      completedEvents: this._simState.eventLog.map(e => e.eventId),
      flags: this._simState.character.flags || {},
      rng: this._simState.rng,
      butterflyLevel: this._simState.butterflyOffset,
    };
  }

  /**
   * 检查死亡
   * @returns {boolean}
   */
  checkDeath() {
    if (!this._simState) return false;
    return this._simState.character.hp <= 0;
  }

  /**
   * 获取事件调度器实例
   * @returns {EventDispatcher}
   */
  getDispatcher() {
    return this._dispatcher;
  }
}

export default SimulationEngine;
