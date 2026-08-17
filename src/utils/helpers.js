/**
 * 通用工具函数集合
 * @module utils/helpers
 */

/**
 * 深拷贝对象（支持常见类型）
 * @param {any} obj - 要拷贝的对象
 * @returns {any} 拷贝后的新对象
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  if (obj instanceof Map) return new Map([...obj].map(([k, v]) => [deepClone(k), deepClone(v)]));
  if (obj instanceof Set) return new Set([...obj].map(v => deepClone(v)));
  const cloned = {};
  for (const key of Object.keys(obj)) {
    cloned[key] = deepClone(obj[key]);
  }
  return cloned;
}

/**
 * 格式化数字显示（超过万用"万"单位）
 * @param {number} num - 要格式化的数字
 * @param {number} [decimals=0] - 小数位数
 * @returns {string} 格式化后的字符串
 */
export function formatNumber(num, decimals = 0) {
  if (num === null || num === undefined) return '0';
  const absNum = Math.abs(num);
  if (absNum >= 100000000) {
    return (num / 100000000).toFixed(Math.max(decimals, 1)) + '亿';
  }
  if (absNum >= 10000) {
    return (num / 10000).toFixed(Math.max(decimals, 1)) + '万';
  }
  return num.toFixed(decimals);
}

/**
 * 生成唯一ID
 * @param {string} [prefix=''] - ID前缀
 * @returns {string} 唯一ID字符串
 */
export function generateId(prefix = '') {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`;
}

/**
 * 获取嵌套对象属性值
 * @param {object} obj - 目标对象
 * @param {string} path - 属性路径（如 "attributes.comprehension"）
 * @param {any} [defaultValue=undefined] - 默认值
 * @returns {any} 属性值
 */
export function getNestedValue(obj, path, defaultValue = undefined) {
  if (!obj || !path) return defaultValue;
  const keys = path.split('.');
  let current = obj;
  for (const key of keys) {
    if (current === null || current === undefined) return defaultValue;
    current = current[key];
  }
  return current !== undefined ? current : defaultValue;
}

/**
 * 设置嵌套对象属性值
 * @param {object} obj - 目标对象
 * @param {string} path - 属性路径
 * @param {any} value - 要设置的值
 */
export function setNestedValue(obj, path, value) {
  if (!obj || !path) return;
  const keys = path.split('.');
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (current[key] === undefined || current[key] === null) {
      current[key] = {};
    }
    current = current[key];
  }
  current[keys[keys.length - 1]] = value;
}

/**
 * 比较两个值
 * @param {any} left - 左值
 * @param {string} operator - 比较操作符
 * @param {any} right - 右值
 * @returns {boolean} 比较结果
 */
export function compare(left, operator, right) {
  switch (operator) {
    case '>=': return left >= right;
    case '<=': return left <= right;
    case '==': return left == right;
    case '===': return left === right;
    case '!=': return left != right;
    case '>': return left > right;
    case '<': return left < right;
    case 'contains':
      if (Array.isArray(left)) return left.includes(right);
      if (typeof left === 'string') return left.includes(right);
      return false;
    case 'not_contains':
      if (Array.isArray(left)) return !left.includes(right);
      if (typeof left === 'string') return !left.includes(right);
      return true;
    default:
      console.warn(`[helpers] 未知比较操作符: ${operator}`);
      return false;
  }
}

/**
 * 加权随机选择
 * @param {Array} items - 候选项列表
 * @param {number[]} weights - 权重列表（与items一一对应）
 * @param {object} [rng] - 随机数生成器（需有 random() 方法）
 * @returns {any} 选中的候选项
 */
export function weightedRandom(items, weights, rng = null) {
  if (!items.length || !weights.length || items.length !== weights.length) {
    throw new Error('[helpers] weightedRandom: items和weights必须长度一致且非空');
  }
  const rand = rng ? rng.random() : Math.random();
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  let cumulative = 0;

  for (let i = 0; i < items.length; i++) {
    cumulative += weights[i];
    if (rand * totalWeight <= cumulative) {
      return items[i];
    }
  }
  return items[items.length - 1];
}

/**
 * 钳制数值到指定范围
 * @param {number} value - 输入值
 * @param {number} min - 最小值
 * @param {number} max - 最大值
 * @returns {number} 钳制后的值
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * 安全的整数运算（避免浮点精度问题）
 * 将浮点数乘以 10^precision 转为整数运算
 * @param {number} a - 操作数A
 * @param {string} op - 运算符 (+, -, *, /)
 * @param {number} b - 操作数B
 * @param {number} [precision=2] - 小数精度位
 * @returns {number} 运算结果
 */
export function safeMath(a, op, b, precision = 2) {
  const factor = Math.pow(10, precision);
  const intA = Math.round(a * factor);
  const intB = Math.round(b * factor);
  switch (op) {
    case '+': return (intA + intB) / factor;
    case '-': return (intA - intB) / factor;
    case '*': return (intA * intB) / (factor * factor);
    case '/': return intB === 0 ? 0 : intA / intB;
    default: throw new Error(`[helpers] 不支持的运算: ${op}`);
  }
}

/**
 * 简单的简易哈希校验（用于存档校验）
 * @param {string} str - 要计算hash的字符串
 * @returns {string} 32位hash值
 */
export function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

/**
 * 模板字符串引擎（替换事件文本中的变量）
 * @param {string} template - 模板字符串（如 "{playerName}在洞府中修炼"）
 * @param {object} vars - 变量映射
 * @returns {string} 替换后的字符串
 */
export function renderTemplate(template, vars) {
  if (!template) return '';
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return vars[key] !== undefined ? String(vars[key]) : match;
  });
}
