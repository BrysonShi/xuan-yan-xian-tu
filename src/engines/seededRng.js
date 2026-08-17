/**
 * 可复现随机数生成器（基于种子）
 * 使用 xoshiro128** 算法，确保相同种子产生相同序列
 * @module engines/seededRng
 */

/**
 * 种子随机数生成器
 * 用于模拟系统中，保证可复现性（便于Bug复现和回放）
 */
export class SeededRandom {
  /**
   * @param {string|number} seed - 随机种子
   */
  constructor(seed) {
    this._originalSeed = seed;
    this._state = this._initState(seed);
  }

  /**
   * 从种子初始化4个32位状态
   * @param {string|number} seed
   * @returns {Uint32Array} 4个32位无符号整数状态
   * @private
   */
  _initState(seed) {
    const state = new Uint32Array(4);
    let s = typeof seed === 'string' ? this._hashString(seed) : seed;
    // 使用简单的分裂哈希扩展种子到4个状态
    for (let i = 0; i < 4; i++) {
      s = (s + 0x9E3779B9) | 0;
      let z = s;
      z = Math.imul(z ^ (z >>> 16), 0x85EBCA6B);
      z = Math.imul(z ^ (z >>> 13), 0xC2B2AE35);
      state[i] = (z ^ (z >>> 16)) >>> 0;
    }
    // 确保状态不全为0
    if (state.every(v => v === 0)) {
      state[0] = 1;
    }
    return state;
  }

  /**
   * 字符串哈希函数
   * @param {string} str
   * @returns {number} 32位整数哈希值
   * @private
   */
  _hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
    }
    return hash >>> 0;
  }

  /**
   * xoshiro128** 核心算法
   * @returns {number} 32位无符号整数
   * @private
   */
  _next() {
    const s = this._state;
    const result = (Math.imul(s[1] * 5, 1) << 7 | (Math.imul(s[1] * 5, 1) << 7) >>> 25) * 9;
    const t = (s[1] << 9) >>> 0;

    s[2] ^= s[0];
    s[3] ^= s[1];
    s[1] ^= s[2];
    s[0] ^= s[3];
    s[2] ^= t;
    s[3] = (s[3] << 11 | s[3] >>> 21) >>> 0;

    return result >>> 0;
  }

  /**
   * 生成 [0, 1) 范围的浮点随机数
   * @returns {number} [0, 1) 区间的浮点数
   */
  random() {
    return this._next() / 4294967296; // 除以 2^32
  }

  /**
   * 生成 [min, max] 范围的整数
   * @param {number} min - 最小值（含）
   * @param {number} max - 最大值（含）
   * @returns {number} [min, max] 范围内的整数
   */
  randInt(min, max) {
    const range = max - min + 1;
    return min + (this._next() % range);
  }

  /**
   * 生成 [min, max) 范围的浮点数
   * @param {number} min - 最小值（含）
   * @param {number} max - 最大值（不含）
   * @returns {number}
   */
  randFloat(min, max) {
    return min + this.random() * (max - min);
  }

  /**
   * 概率判定
   * @param {number} probability - 概率值 (0-1)
   * @returns {boolean} 是否触发
   */
  chance(probability) {
    return this.random() < probability;
  }

  /**
   * 从数组中随机选择一项
   * @param {Array} array - 候选数组
   * @returns {any} 选中的元素
   */
  pick(array) {
    if (!array || array.length === 0) {
      throw new Error('[SeededRandom] pick: 数组不能为空');
    }
    return array[this._next() % array.length];
  }

  /**
   * 加权随机选择
   * @param {Array} items - 候选项列表
   * @param {number[]} weights - 权重数组
   * @returns {any} 选中的项
   */
  weightedPick(items, weights) {
    if (items.length !== weights.length) {
      throw new Error('[SeededRandom] weightedPick: items和weights长度不一致');
    }
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let roll = this.random() * totalWeight;
    for (let i = 0; i < items.length; i++) {
      roll -= weights[i];
      if (roll <= 0) return items[i];
    }
    return items[items.length - 1];
  }

  /**
   * 打乱数组（Fisher-Yates算法）
   * @param {Array} array - 要打乱的数组（原地打乱）
   * @returns {Array} 打乱后的数组（同一引用）
   */
  shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = this._next() % (i + 1);
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  /**
   * 重置到初始种子状态
   */
  reset() {
    this._state = this._initState(this._originalSeed);
  }

  /**
   * 获取原始种子
   * @returns {string|number}
   */
  get seed() {
    return this._originalSeed;
  }

  /**
   * 导出当前状态（用于存档）
   * @returns {object}
   */
  exportState() {
    return {
      seed: this._originalSeed,
      state: Array.from(this._state)
    };
  }

  /**
   * 从存档状态恢复
   * @param {object} stateObj - exportState() 的输出
   * @returns {SeededRandom}
   */
  static importState(stateObj) {
    const rng = new SeededRandom(stateObj.seed);
    rng._state = new Uint32Array(stateObj.state);
    return rng;
  }
}

export default SeededRandom;
