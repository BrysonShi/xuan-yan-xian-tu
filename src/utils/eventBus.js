/**
 * 事件总线 - 全局发布/订阅系统
 * @module utils/eventBus
 */

class EventBus {
  constructor() {
    /** @type {Map<string, Set<Function>>} 事件监听器映射表 */
    this._listeners = new Map();
    /** @type {Map<string, Set<Function>>} 一次性监听器 */
    this._onceListeners = new Map();
  }

  /**
   * 注册事件监听器
   * @param {string} event - 事件名称
   * @param {Function} callback - 回调函数
   * @returns {Function} 取消监听的函数
   */
  on(event, callback) {
    if (typeof callback !== 'function') {
      throw new Error('[EventBus] callback must be a function');
    }
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(callback);

    // 返回取消监听的函数
    return () => this.off(event, callback);
  }

  /**
   * 注册一次性事件监听器（触发后自动移除）
   * @param {string} event - 事件名称
   * @param {Function} callback - 回调函数
   * @returns {Function} 取消监听的函数
   */
  once(event, callback) {
    if (typeof callback !== 'function') {
      throw new Error('[EventBus] callback must be a function');
    }
    if (!this._onceListeners.has(event)) {
      this._onceListeners.set(event, new Set());
    }
    this._onceListeners.get(event).add(callback);

    return () => {
      const onceSet = this._onceListeners.get(event);
      if (onceSet) onceSet.delete(callback);
    };
  }

  /**
   * 移除事件监听器
   * @param {string} event - 事件名称
   * @param {Function} [callback] - 要移除的回调函数，不传则移除该事件所有监听
   */
  off(event, callback) {
    if (callback) {
      const listeners = this._listeners.get(event);
      if (listeners) listeners.delete(callback);
      const onceListeners = this._onceListeners.get(event);
      if (onceListeners) onceListeners.delete(callback);
    } else {
      this._listeners.delete(event);
      this._onceListeners.delete(event);
    }
  }

  /**
   * 触发事件
   * @param {string} event - 事件名称
   * @param {...any} args - 传递给回调的参数
   * @returns {boolean} 是否有监听器被触发
   */
  emit(event, ...args) {
    let triggered = false;

    // 触发常规监听器
    const listeners = this._listeners.get(event);
    if (listeners && listeners.size > 0) {
      for (const cb of listeners) {
        try {
          cb(...args);
          triggered = true;
        } catch (err) {
          console.error(`[EventBus] Error in listener for "${event}":`, err);
        }
      }
    }

    // 触发一次性监听器并移除
    const onceListeners = this._onceListeners.get(event);
    if (onceListeners && onceListeners.size > 0) {
      for (const cb of onceListeners) {
        try {
          cb(...args);
          triggered = true;
        } catch (err) {
          console.error(`[EventBus] Error in once-listener for "${event}":`, err);
        }
      }
      this._onceListeners.delete(event);
    }

    return triggered;
  }

  /**
   * 检查是否有监听器
   * @param {string} event - 事件名称
   * @returns {boolean}
   */
  has(event) {
    const listeners = this._listeners.get(event);
    const onceListeners = this._onceListeners.get(event);
    return (listeners && listeners.size > 0) || (onceListeners && onceListeners.size > 0);
  }

  /**
   * 获取某事件的监听器数量
   * @param {string} event - 事件名称
   * @returns {number}
   */
  listenerCount(event) {
    const l = this._listeners.get(event)?.size || 0;
    const o = this._onceListeners.get(event)?.size || 0;
    return l + o;
  }

  /**
   * 清除所有事件监听器
   */
  clear() {
    this._listeners.clear();
    this._onceListeners.clear();
  }

  /**
   * 获取所有已注册的事件名称
   * @returns {string[]}
   */
  eventNames() {
    const names = new Set([
      ...this._listeners.keys(),
      ...this._onceListeners.keys()
    ]);
    return [...names];
  }
}

/** 全局事件总线单例 */
export const eventBus = new EventBus();

/** 导出类用于创建独立实例 */
export { EventBus };
export default eventBus;
