<template>
  <div class="achievement-view">
    <!-- 顶部标题栏 -->
    <div class="achievement-view__header">
      <button class="back-btn" @click="$router.back()">
        <span>←</span>
      </button>
      <h1 class="achievement-view__title">成就</h1>
      <div class="achievement-view__stats">
        <span class="stat-badge">
          {{ unlockedCount }}/{{ totalCount }}
        </span>
      </div>
    </div>

    <!-- 分类筛选栏 -->
    <div class="achievement-view__filter">
      <button
        v-for="cat in categories"
        :key="cat.key"
        class="filter-btn"
        :class="{ 'filter-btn--active': activeCategory === cat.key }"
        @click="activeCategory = cat.key"
      >
        <span class="filter-btn__icon">{{ cat.icon }}</span>
        <span class="filter-btn__label">{{ cat.label }}</span>
        <span class="filter-btn__count">{{ getCategoryCount(cat.key) }}</span>
      </button>
    </div>

    <!-- 进度条 -->
    <div class="achievement-view__progress">
      <div class="progress-bar">
        <div
          class="progress-bar__fill"
          :style="{ width: progressPercent + '%' }"
        />
      </div>
      <span class="progress-text">{{ progressPercent }}% 完成</span>
    </div>

    <!-- 成就列表 -->
    <div class="achievement-view__list game-scroll">
      <div
        v-for="achievement in filteredAchievements"
        :key="achievement.id"
        class="achievement-card"
        :class="[
          `achievement-card--${achievement.rarity}`,
          { 'achievement-card--locked': !achievement.isUnlocked && achievement.isHidden }
        ]"
        @click="showDetail(achievement)"
      >
        <!-- 图标 -->
        <div class="achievement-card__icon">
          <span>{{ achievement.isUnlocked ? getCategoryIcon(achievement.category) : (achievement.isHidden ? '?' : getCategoryIcon(achievement.category)) }}</span>
        </div>

        <!-- 信息 -->
        <div class="achievement-card__info">
          <div class="achievement-card__name-row">
            <span class="achievement-card__name">{{ achievement.displayName }}</span>
            <span
              class="achievement-card__rarity"
              :style="{ color: getRarityColor(achievement.rarity) }"
            >
              {{ getRarityLabel(achievement.rarity) }}
            </span>
            <span v-if="achievement.isHidden && !achievement.isUnlocked" class="achievement-card__hidden-tag">
              隐藏
            </span>
          </div>
          <div class="achievement-card__desc">
            {{ achievement.displayDescription }}
          </div>
          <div v-if="achievement.isUnlocked" class="achievement-card__rewards">
            <span v-if="achievement.rewards.spiritStones" class="reward-tag">
              💎 {{ achievement.rewards.spiritStones }}
            </span>
            <span v-if="achievement.rewards.destinyPoints" class="reward-tag">
              ✨ {{ achievement.rewards.destinyPoints }}
            </span>
            <span v-if="achievement.rewards.title" class="reward-tag reward-tag--title">
              🏷️ {{ achievement.rewards.title }}
            </span>
          </div>
        </div>

        <!-- 状态 -->
        <div class="achievement-card__status">
          <span v-if="achievement.isUnlocked" class="status-icon status-icon--unlocked">✓</span>
          <span v-else class="status-icon status-icon--locked">○</span>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="filteredAchievements.length === 0" class="empty-state">
        <span class="empty-state__icon">🔒</span>
        <span class="empty-state__text">暂无成就</span>
      </div>
    </div>

    <!-- 成就详情弹窗 -->
    <div v-if="detailVisible" class="detail-overlay" @click.self="detailVisible = false">
      <div class="detail-panel" :class="`detail-panel--${selectedAchievement?.rarity}`">
        <button class="detail-panel__close" @click="detailVisible = false">×</button>

        <div class="detail-panel__header">
          <div class="detail-panel__icon">
            {{ selectedAchievement?.isUnlocked ? getCategoryIcon(selectedAchievement?.category) : '?' }}
          </div>
          <div>
            <h2 class="detail-panel__name">{{ selectedAchievement?.displayName }}</h2>
            <span
              class="detail-panel__rarity"
              :style="{ color: getRarityColor(selectedAchievement?.rarity) }"
            >
              {{ getRarityLabel(selectedAchievement?.rarity) }}
            </span>
          </div>
        </div>

        <p class="detail-panel__desc">
          {{ selectedAchievement?.displayDescription }}
        </p>

        <!-- 奖励详情 -->
        <div class="detail-panel__rewards">
          <h3 class="section-title">奖励</h3>
          <div class="rewards-grid">
            <div v-if="selectedAchievement?.rewards.spiritStones" class="reward-item">
              <span class="reward-item__icon">💎</span>
              <span class="reward-item__value">{{ selectedAchievement.rewards.spiritStones }} 灵石</span>
            </div>
            <div v-if="selectedAchievement?.rewards.destinyPoints" class="reward-item">
              <span class="reward-item__icon">✨</span>
              <span class="reward-item__value">{{ selectedAchievement.rewards.destinyPoints }} 天机点</span>
            </div>
            <div v-if="selectedAchievement?.rewards.title" class="reward-item">
              <span class="reward-item__icon">🏷️</span>
              <span class="reward-item__value">称号「{{ selectedAchievement.rewards.title }}」</span>
            </div>
            <div v-if="selectedAchievement?.rewards.permanentTerm" class="reward-item reward-item--legendary">
              <span class="reward-item__icon">🌟</span>
              <span class="reward-item__value">永久词条</span>
            </div>
          </div>
        </div>

        <!-- 解锁提示 -->
        <div v-if="selectedAchievement?.isHidden && !selectedAchievement?.isUnlocked" class="detail-panel__hint">
          <h3 class="section-title">线索</h3>
          <p class="hint-text">{{ selectedAchievement.hint || '继续探索以发现更多线索……' }}</p>
        </div>

        <!-- 状态 -->
        <div class="detail-panel__status">
          <span v-if="selectedAchievement?.isUnlocked" class="status-badge status-badge--unlocked">
            ✓ 已解锁
          </span>
          <span v-else class="status-badge status-badge--locked">
            ○ 未解锁
          </span>
        </div>
      </div>
    </div>

    <!-- 底部导航 -->
    <div class="achievement-view__nav">
      <button class="nav-btn" @click="$router.push('/character')">
        <span class="nav-btn__icon">👤</span>
        <span class="nav-btn__label">角色</span>
      </button>
      <button class="nav-btn" @click="$router.push('/reality')">
        <span class="nav-btn__icon">🏠</span>
        <span class="nav-btn__label">返回</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import {
  getAllAchievements,
  getAchievementDetail,
  getAchievementStats,
  CATEGORY_NAMES,
  RARITY_NAMES,
  RARITY_COLORS,
  createInitialAchievementState,
} from '../engines/achievementEngine.js';

// ── 分类配置 ──
const categories = [
  { key: 'all', label: '全部', icon: '📜' },
  { key: 'cultivation', label: '修炼', icon: '🧘' },
  { key: 'combat', label: '战斗', icon: '⚔️' },
  { key: 'exploration', label: '探索', icon: '🗺️' },
  { key: 'social', label: '社交', icon: '🤝' },
  { key: 'collection', label: '收集', icon: '📦' },
  { key: 'special', label: '特殊', icon: '🌟' },
];

// ── 状态 ──
const activeCategory = ref('all');
const detailVisible = ref(false);
const selectedAchievement = ref(null);

// 使用初始状态作为演示数据（实际应从 store 获取）
const achievementState = ref(createInitialAchievementState());

// ── 计算属性 ──
const allAchievements = computed(() => {
  return getAllAchievements().map(ach => getAchievementDetail(ach.id, achievementState.value));
});

const filteredAchievements = computed(() => {
  if (activeCategory.value === 'all') return allAchievements.value;
  return allAchievements.value.filter(a => a.category === activeCategory.value);
});

const stats = computed(() => getAchievementStats(achievementState.value));

const totalCount = computed(() => stats.value.total);
const unlockedCount = computed(() => stats.value.unlocked);
const progressPercent = computed(() =>
  totalCount.value > 0 ? Math.round((unlockedCount.value / totalCount.value) * 100) : 0
);

// ── 方法 ──
function getCategoryCount(categoryKey) {
  if (categoryKey === 'all') return allAchievements.value.length;
  return allAchievements.value.filter(a => a.category === categoryKey).length;
}

function getCategoryIcon(category) {
  const cat = categories.find(c => c.key === category);
  return cat ? cat.icon : '📜';
}

function getRarityLabel(rarity) {
  return RARITY_NAMES[rarity] || rarity;
}

function getRarityColor(rarity) {
  return RARITY_COLORS[rarity] || '#ffffff';
}

function showDetail(achievement) {
  selectedAchievement.value = achievement;
  detailVisible.value = true;
}
</script>

<style scoped>
.achievement-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, var(--c-bg), var(--c-bg-light));
}

/* ── 头部 ── */
.achievement-view__header {
  display: flex;
  align-items: center;
  padding: var(--s-md) var(--s-lg);
  border-bottom: 1px solid var(--c-border-dim);
  gap: var(--s-md);
}

.back-btn {
  background: none;
  border: none;
  color: var(--c-text);
  font-size: 20px;
  cursor: pointer;
  padding: 4px 8px;
}

.achievement-view__title {
  flex: 1;
  font-size: var(--fs-lg);
  font-weight: 700;
  color: var(--c-gold-light);
  margin: 0;
}

.stat-badge {
  background: rgba(212, 175, 85, 0.1);
  border: 1px solid var(--c-border-dim);
  border-radius: var(--r-md);
  padding: 4px 12px;
  font-size: var(--fs-sm);
  color: var(--c-gold);
}

/* ── 分类筛选 ── */
.achievement-view__filter {
  display: flex;
  gap: 6px;
  padding: var(--s-md) var(--s-lg);
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.filter-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--c-border-dim);
  border-radius: var(--r-full);
  color: var(--c-text-dim);
  font-size: var(--fs-xs);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
  font-family: inherit;
}

.filter-btn:hover { border-color: var(--c-border); }

.filter-btn--active {
  background: rgba(212, 175, 85, 0.1);
  border-color: var(--c-gold);
  color: var(--c-gold-light);
}

.filter-btn__icon { font-size: 14px; }
.filter-btn__count { opacity: 0.6; }

/* ── 进度条 ── */
.achievement-view__progress {
  display: flex;
  align-items: center;
  gap: var(--s-sm);
  padding: 0 var(--s-lg) var(--s-md);
}

.progress-bar {
  flex: 1;
  height: 4px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 2px;
  overflow: hidden;
}

.progress-bar__fill {
  height: 100%;
  background: linear-gradient(90deg, var(--c-gold), var(--c-gold-light));
  border-radius: 2px;
  transition: width 0.3s;
}

.progress-text {
  font-size: var(--fs-xs);
  color: var(--c-text-dim);
  white-space: nowrap;
}

/* ── 成就列表 ── */
.achievement-view__list {
  flex: 1;
  overflow-y: auto;
  padding: 0 var(--s-lg) var(--s-lg);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.achievement-card {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--c-border-dim);
  border-radius: var(--r-lg);
  cursor: pointer;
  transition: all 0.15s;
}

.achievement-card:hover {
  background: rgba(255, 255, 255, 0.04);
  border-color: var(--c-border);
}

.achievement-card--locked {
  opacity: 0.5;
}

.achievement-card--legendary { border-left: 3px solid #fbbf24; }
.achievement-card--epic { border-left: 3px solid #a78bfa; }
.achievement-card--rare { border-left: 3px solid #4ade80; }
.achievement-card--common { border-left: 3px solid rgba(255,255,255,0.2); }

.achievement-card__icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}

.achievement-card__info { flex: 1; min-width: 0; }

.achievement-card__name-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}

.achievement-card__name {
  font-size: var(--fs-base);
  font-weight: 600;
  color: var(--c-text);
}

.achievement-card__rarity {
  font-size: var(--fs-xs);
  font-weight: 600;
}

.achievement-card__hidden-tag {
  font-size: var(--fs-xs);
  color: var(--c-text-dim);
  background: rgba(255, 255, 255, 0.05);
  padding: 1px 6px;
  border-radius: var(--r-sm);
}

.achievement-card__desc {
  font-size: var(--fs-sm);
  color: var(--c-text-dim);
  line-height: 1.5;
  margin-bottom: 6px;
}

.achievement-card__rewards {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.reward-tag {
  font-size: var(--fs-xs);
  color: var(--c-text-dim);
  background: rgba(255, 255, 255, 0.04);
  padding: 2px 8px;
  border-radius: var(--r-sm);
}

.reward-tag--title {
  color: var(--c-gold);
  background: rgba(212, 175, 85, 0.08);
}

.achievement-card__status {
  flex-shrink: 0;
  padding-top: 2px;
}

.status-icon { font-size: 18px; }
.status-icon--unlocked { color: var(--c-gold); }
.status-icon--locked { color: var(--c-text-dim); opacity: 0.3; }

/* ── 空状态 ── */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 40px 0;
  color: var(--c-text-dim);
}

.empty-state__icon { font-size: 32px; }
.empty-state__text { font-size: var(--fs-sm); }

/* ── 详情弹窗 ── */
.detail-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: var(--s-lg);
}

.detail-panel {
  width: 100%;
  max-width: 360px;
  background: var(--c-bg);
  border: 1px solid var(--c-border);
  border-radius: var(--r-xl);
  padding: var(--s-xl);
  position: relative;
}

.detail-panel--legendary { border-color: #fbbf24; }
.detail-panel--epic { border-color: #a78bfa; }
.detail-panel--rare { border-color: #4ade80; }

.detail-panel__close {
  position: absolute;
  top: 12px;
  right: 12px;
  background: none;
  border: none;
  color: var(--c-text-dim);
  font-size: 24px;
  cursor: pointer;
}

.detail-panel__header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: var(--s-md);
}

.detail-panel__icon {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  flex-shrink: 0;
}

.detail-panel__name {
  font-size: var(--fs-lg);
  font-weight: 700;
  color: var(--c-text);
  margin: 0 0 2px;
}

.detail-panel__rarity {
  font-size: var(--fs-sm);
  font-weight: 600;
}

.detail-panel__desc {
  font-size: var(--fs-base);
  color: var(--c-text-dim);
  line-height: 1.7;
  margin-bottom: var(--s-lg);
}

.section-title {
  font-size: var(--fs-sm);
  font-weight: 600;
  color: var(--c-gold);
  margin: 0 0 var(--s-sm);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.rewards-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: var(--s-lg);
}

.reward-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: var(--r-md);
}

.reward-item--legendary {
  background: rgba(212, 175, 85, 0.08);
  border: 1px solid rgba(212, 175, 85, 0.2);
}

.reward-item__icon { font-size: 18px; }
.reward-item__value { font-size: var(--fs-sm); color: var(--c-text); }

.hint-text {
  font-size: var(--fs-sm);
  color: var(--c-text-dim);
  font-style: italic;
  line-height: 1.6;
}

.detail-panel__status {
  margin-top: var(--s-md);
  text-align: center;
}

.status-badge {
  display: inline-block;
  padding: 6px 20px;
  border-radius: var(--r-full);
  font-size: var(--fs-sm);
  font-weight: 600;
}

.status-badge--unlocked {
  background: rgba(212, 175, 85, 0.15);
  color: var(--c-gold-light);
  border: 1px solid var(--c-gold);
}

.status-badge--locked {
  background: rgba(255, 255, 255, 0.04);
  color: var(--c-text-dim);
  border: 1px solid var(--c-border-dim);
}

/* ── 底部导航 ── */
.achievement-view__nav {
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: var(--s-sm) var(--s-lg);
  padding-bottom: calc(var(--s-sm) + var(--safe-bottom));
  border-top: 1px solid var(--c-border-dim);
  background: var(--c-bg);
}

.nav-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 8px 20px;
  min-height: 52px;
  background: none;
  border: none;
  color: var(--c-text-dim);
  font-family: inherit;
  cursor: pointer;
  border-radius: var(--r-md);
  transition: all 0.2s;
}

.nav-btn:active { transform: scale(0.92); }
.nav-btn:hover { color: var(--c-text); }
.nav-btn__icon { font-size: 20px; }
.nav-btn__label { font-size: var(--fs-xs); }
</style>
