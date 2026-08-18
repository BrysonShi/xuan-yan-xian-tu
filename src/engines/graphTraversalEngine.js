/**
 * 图遍历引擎 - 用于命运模拟中的场景随机遍历
 * 从起始场景出发，深度优先随机遍历 storyGraph
 * @module engines/graphTraversalEngine
 */

import { storyGraph } from '../data/storyGraph.js';

/**
 * 从起始场景出发，随机深度遍历 storyGraph，返回可达场景
 * @param {string} startSceneId - 起始场景 ID
 * @param {number} maxDepth - 最大遍历深度（默认 4）
 * @param {number} stopChance - 每层提前停止的概率（默认 0.25）
 * @returns {string} 到达的场景 ID
 */
export function getRandomReachableScene(startSceneId, maxDepth = 4, stopChance = 0.25) {
  let currentLayer = [startSceneId];
  const visited = new Set([startSceneId]);

  for (let d = 0; d < maxDepth; d++) {
    // 每层有 stopChance 概率停止（模拟"命运分支的不确定性"）
    if (d > 0 && Math.random() < stopChance) break;

    const nextSet = new Set();
    for (const id of currentLayer) {
      const scene = storyGraph[id];
      if (!scene || !scene.choices) continue;
      for (const choice of scene.choices) {
        if (choice.next && storyGraph[choice.next] && !visited.has(choice.next)) {
          nextSet.add(choice.next);
        }
      }
    }

    if (nextSet.size === 0) break;
    // 标记为已访问
    nextSet.forEach(id => visited.add(id));
    currentLayer = [...nextSet];
  }

  // 从当前层随机选一个
  return currentLayer[Math.floor(Math.random() * currentLayer.length)];
}

/**
 * 收集从起始场景出发指定深度内的所有可达场景（不实际遍历）
 * @param {string} startSceneId - 起始场景 ID
 * @param {number} maxDepth - 最大深度
 * @returns {string[]} 所有可达场景 ID 列表
 */
export function collectReachableScenes(startSceneId, maxDepth = 3) {
  const visited = new Set([startSceneId]);
  let currentLayer = [startSceneId];

  for (let d = 0; d < maxDepth; d++) {
    const nextSet = new Set();
    for (const id of currentLayer) {
      const scene = storyGraph[id];
      if (!scene || !scene.choices) continue;
      for (const choice of scene.choices) {
        if (choice.next && storyGraph[choice.next] && !visited.has(choice.next)) {
          nextSet.add(choice.next);
        }
      }
    }
    nextSet.forEach(id => visited.add(id));
    currentLayer = [...nextSet];
  }

  return [...visited];
}

/**
 * 带标签偏好的场景遍历：优先访问带有指定标签的场景
 * @param {string} startSceneId - 起始场景 ID
 * @param {string[]} preferredTags - 偏好标签列表
 * @param {number} maxDepth - 最大深度
 * @returns {string} 到达的场景 ID
 */
export function getTagPreferedScene(startSceneId, preferredTags = [], maxDepth = 4) {
  const reachable = collectReachableScenes(startSceneId, maxDepth);
  if (reachable.length === 0) return startSceneId;

  // 过滤掉起始场景本身（避免原地踏步）
  const candidates = reachable.filter(id => id !== startSceneId);
  if (candidates.length === 0) return startSceneId;

  // 如果有偏好标签，优先选择带这些标签的场景
  if (preferredTags.length > 0) {
    const tagged = candidates.filter(id => {
      const scene = storyGraph[id];
      return scene?.tags?.some(tag => preferredTags.includes(tag));
    });
    if (tagged.length > 0) {
      return tagged[Math.floor(Math.random() * tagged.length)];
    }
  }

  // 否则随机选一个
  return candidates[Math.floor(Math.random() * candidates.length)];
}

export default {
  getRandomReachableScene,
  collectReachableScenes,
  getTagPreferedScene,
};
