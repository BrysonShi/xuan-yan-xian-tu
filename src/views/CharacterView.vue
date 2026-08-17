<template>
  <div class="character-view">
    <!-- 头部 -->
    <div class="char-header">
      <button class="btn btn--ghost char-header__back" @click="$router.back()">← 返回</button>
      <h2 class="font-title char-header__title">角色面板</h2>
    </div>

    <div class="char-content game-scroll">
      <div v-if="player" class="char-body">
        <!-- 角色信息卡 -->
        <div class="char-card anim-fade-up">
          <div class="char-card__avatar">
            <span>{{ player.name?.charAt(0) || '仙' }}</span>
          </div>
          <div class="char-card__info">
            <h3 class="char-card__name font-title">{{ player.name }}</h3>
            <p class="char-card__realm text-jade">{{ realmName }}</p>
            <p class="char-card__age text-dim">{{ player.age }}岁 · {{ spiritRootText }}</p>
          </div>
        </div>

        <!-- 修为进度 -->
        <div class="char-section anim-fade-up" style="animation-delay:0.08s;">
          <div class="char-section__head">
            <span class="char-section__title">修为</span>
            <span class="font-num text-dim">{{ player.cultivation }} / {{ player.maxCultivation }}</span>
          </div>
          <ProgressBar :current="player.cultivation" :max="player.maxCultivation" type="cultivation" :showLabel="false" />
        </div>

        <!-- 气血 & 灵力 -->
        <div class="char-row anim-fade-up" style="animation-delay:0.12s;">
          <div class="char-mini-bar">
            <span class="char-mini-bar__label">气血</span>
            <ProgressBar :current="player.hp" :max="player.maxHp" type="hp" :showLabel="false" />
            <span class="font-num text-dim" style="font-size:var(--fs-xs);">{{ player.hp }}/{{ player.maxHp }}</span>
          </div>
          <div class="char-mini-bar">
            <span class="char-mini-bar__label">灵力</span>
            <ProgressBar :current="player.mp" :max="player.maxMp" type="mp" :showLabel="false" />
            <span class="font-num text-dim" style="font-size:var(--fs-xs);">{{ player.mp }}/{{ player.maxMp }}</span>
          </div>
        </div>

        <!-- 六维属性 + 雷达图 -->
        <div class="char-section anim-fade-up" style="animation-delay:0.16s;">
          <h3 class="char-section__title">六维属性</h3>
          <div class="attr-layout">
            <!-- CSS 雷达图 -->
            <div class="radar-chart">
              <svg viewBox="-15 -15 230 230" class="radar-chart__svg">
                <!-- 背景网格 -->
                <polygon v-for="n in 4" :key="'grid-'+n"
                  :points="gridPoints(n * 20 + 10)"
                  fill="none"
                  stroke="rgba(212,175,85,0.08)"
                  stroke-width="0.5"
                />
                <!-- 轴线 -->
                <line v-for="i in 6" :key="'axis-'+i"
                  :x1="100" :y1="100"
                  :x2="axisEnd(i).x" :y2="axisEnd(i).y"
                  stroke="rgba(212,175,85,0.06)"
                  stroke-width="0.5"
                />
                <!-- 属性区域 -->
                <polygon
                  :points="attrPolygon"
                  fill="rgba(126,200,160,0.15)"
                  stroke="var(--c-jade)"
                  stroke-width="1.5"
                />
                <!-- 属性点 -->
                <circle
                  v-for="(pt, i) in attrPoints"
                  :key="'pt-'+i"
                  :cx="pt.x" :cy="pt.y" r="3"
                  fill="var(--c-jade)"
                />
                <!-- 属性标签 -->
                <text
                  v-for="(label, i) in attrLabels"
                  :key="'lbl-'+i"
                  :x="label.x" :y="label.y"
                  text-anchor="middle"
                  dominant-baseline="middle"
                  class="radar-chart__label"
                >{{ label.text }}</text>
              </svg>
            </div>

            <!-- 属性数值列表 -->
            <div class="attr-list">
              <div v-for="(val, key) in attrMap" :key="key" class="attr-list__item">
                <span class="attr-list__name">{{ attrNames[key] }}</span>
                <span class="attr-list__value font-num">{{ player.attributes[key] }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 词条槽位 -->
        <div class="char-section anim-fade-up" style="animation-delay:0.2s;">
          <h3 class="char-section__title">词条装备</h3>
          <div class="slots-grid">
            <TermSlot
              v-for="slot in slots"
              :key="slot.id"
              :termId="slot.termId"
              :name="slot.termName || ''"
              :rarity="slot.rarity || 'common'"
              :locked="slot.locked"
              :unlockCondition="slot.unlockCondition || ''"
              @click="handleSlotClick(slot)"
            />
          </div>
        </div>

        <!-- 功法列表 -->
        <div class="char-section anim-fade-up" style="animation-delay:0.24s;">
          <h3 class="char-section__title">功法</h3>
          <div v-if="techniques.length" class="tech-list">
            <div
              v-for="tech in techniques"
              :key="tech.id"
              class="tech-item"
              :class="{ 'tech-item--active': tech.id === player.activeTechnique }"
            >
              <div class="tech-item__info">
                <span class="tech-item__name">{{ tech.name }}</span>
                <span class="tech-item__level text-dim font-num">第{{ tech.level }}层</span>
              </div>
              <ProgressBar
                :current="tech.masteryLevel || 0"
                :max="100"
                type="exp"
                :showLabel="false"
              />
            </div>
          </div>
          <p v-else class="text-dim" style="font-size:var(--fs-sm); padding:8px 0;">尚未习得任何功法</p>
        </div>

        <!-- 背包 -->
        <div class="char-section anim-fade-up" style="animation-delay:0.28s;">
          <h3 class="char-section__title">背包</h3>
          <div v-if="inventory.length" class="inv-grid">
            <div v-for="item in inventory" :key="item.id" class="inv-item">
              <span class="inv-item__icon">{{ item.icon }}</span>
              <div class="inv-item__info">
                <span class="inv-item__name">{{ item.name }}</span>
                <span class="inv-item__qty font-num text-dim">×{{ item.qty }}</span>
              </div>
            </div>
          </div>
          <p v-else class="text-dim" style="font-size:var(--fs-sm); padding:8px 0;">背包空空如也</p>
        </div>

        <!-- 资源统计 -->
        <div class="char-section anim-fade-up" style="animation-delay:0.32s;">
          <h3 class="char-section__title">资源</h3>
          <div class="res-grid">
            <div class="res-item">
              <span class="res-item__icon">💎</span>
              <span class="res-item__label">灵石</span>
              <span class="res-item__val font-num">{{ player.resources?.spiritStones || 0 }}</span>
            </div>
            <div class="res-item">
              <span class="res-item__icon">🏅</span>
              <span class="res-item__label">贡献</span>
              <span class="res-item__val font-num">{{ player.resources?.contribution || 0 }}</span>
            </div>
            <div class="res-item">
              <span class="res-item__icon">🙏</span>
              <span class="res-item__label">功德</span>
              <span class="res-item__val font-num">{{ player.resources?.merit || 0 }}</span>
            </div>
            <div class="res-item">
              <span class="res-item__icon">📣</span>
              <span class="res-item__label">声望</span>
              <span class="res-item__val font-num">{{ player.resources?.reputation || 0 }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { usePlayerStore } from '../stores/playerStore.js';
import ProgressBar from '../components/ProgressBar.vue';
import TermSlot from '../components/TermSlot.vue';

const playerStore = usePlayerStore();
const player = computed(() => playerStore.playerData);
const realmName = computed(() => playerStore.realmName || '炼气一层');

const spiritRootText = computed(() => {
  const q = player.value?.spiritRoot?.quality || 2;
  const map = { 1: '废品灵根', 2: '伪灵根', 3: '真灵根', 4: '地灵根', 5: '天灵根', 6: '变异灵根' };
  return map[q] || '未知灵根';
});

const attrNames = {
  comprehension: '悟性', luck: '气运', charisma: '魅力',
  strength: '根骨', agility: '敏捷', spirit: '神识',
};

const attrMap = computed(() => player.value?.attributes || {});

// 雷达图计算
const maxAttr = 100;
const attrKeys = ['comprehension', 'luck', 'charisma', 'strength', 'agility', 'spirit'];

function getAttrValue(key) {
  return Math.min(maxAttr, (attrMap.value[key] || 0) / maxAttr * 80);
}

function gridPoints(size) {
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI * 2 / 6) * i - Math.PI / 2;
    pts.push(`${100 + Math.cos(angle) * size},${100 + Math.sin(angle) * size}`);
  }
  return pts.join(' ');
}

function axisEnd(i) {
  const angle = (Math.PI * 2 / 6) * (i - 1) - Math.PI / 2;
  return { x: 100 + Math.cos(angle) * 90, y: 100 + Math.sin(angle) * 90 };
}

const attrPoints = computed(() => {
  return attrKeys.map((key, i) => {
    const val = getAttrValue(key);
    const angle = (Math.PI * 2 / 6) * i - Math.PI / 2;
    return { x: 100 + Math.cos(angle) * val, y: 100 + Math.sin(angle) * val };
  });
});

const attrPolygon = computed(() => attrPoints.value.map(p => `${p.x},${p.y}`).join(' '));

const attrLabels = computed(() => {
  return attrKeys.map((key, i) => {
    const angle = (Math.PI * 2 / 6) * i - Math.PI / 2;
    return {
      x: 100 + Math.cos(angle) * 105,
      y: 100 + Math.sin(angle) * 105,
      text: attrNames[key],
    };
  });
});

// 词条槽位（示例数据）
const slots = computed(() => {
  const p = player.value;
  const s = p?.slots || [];
  return Array.from({ length: Math.max(s.length, 4) }, (_, i) => {
    if (i < s.length) return s[i];
    if (i < 3) return { id: `slot_${i}`, termId: null, locked: false };
    return { id: `slot_${i}`, termId: null, locked: true, unlockCondition: '炼气4层' };
  });
});

// 功法（示例）
const techniques = computed(() => {
  const t = player.value?.techniques || [];
  if (t.length) return t.map(x => ({ ...x, name: x.name || x.id, masteryLevel: x.level * 20 }));
  return [
    { id: 'GJ-A01', name: '青云诀', level: 2, masteryLevel: 35 },
  ];
});

// 背包（示例）
const inventory = [
  { id: 'ITM-D01', name: '聚气丹', icon: '💊', qty: 3 },
  { id: 'ITM-D02', name: '灵石袋', icon: '💰', qty: 1 },
];

function handleSlotClick(slot) {
  // TODO: 打开词条选择/详情
}
</script>

<style scoped>
.character-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--c-bg);
}

.char-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: var(--s-lg);
  padding-top: calc(var(--s-lg) + var(--safe-top));
  border-bottom: 1px solid var(--c-border-dim);
}

.char-header__back {
  font-size: var(--fs-sm);
  padding: 6px 12px;
}

.char-header__title {
  font-size: var(--fs-xl);
  color: var(--c-gold-light);
  letter-spacing: 0.1em;
}

.char-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--s-lg);
}

/* 角色信息卡 */
.char-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: var(--c-bg-panel);
  border: 1px solid var(--c-border-dim);
  border-radius: var(--r-lg);
  margin-bottom: var(--s-lg);
}

.char-card__avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--c-gold-dim), var(--c-jade-dim));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 700;
  color: var(--c-gold-light);
  flex-shrink: 0;
  border: 2px solid var(--c-border);
}

.char-card__name {
  font-size: var(--fs-lg);
  color: var(--c-gold-light);
  margin-bottom: 2px;
}

.char-card__realm {
  font-size: var(--fs-sm);
  font-weight: 600;
  margin-bottom: 2px;
}

.char-card__age {
  font-size: var(--fs-xs);
}

/* 通用section */
.char-section {
  margin-bottom: var(--s-xl);
}

.char-section__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--s-sm);
}

.char-section__title {
  font-size: var(--fs-sm);
  color: var(--c-gold);
  letter-spacing: 0.08em;
  font-weight: 600;
  margin-bottom: var(--s-sm);
}

.char-section__head .char-section__title {
  margin-bottom: 0;
}

/* 气血灵力行 */
.char-row {
  display: flex;
  gap: 12px;
  margin-bottom: var(--s-xl);
}

.char-mini-bar {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.char-mini-bar__label {
  font-size: var(--fs-xs);
  color: var(--c-text-dim);
}

/* 雷达图 + 属性 */
.attr-layout {
  display: flex;
  gap: 16px;
  align-items: center;
}

.radar-chart {
  width: 140px;
  height: 140px;
  flex-shrink: 0;
}

.radar-chart__svg {
  width: 100%;
  height: 100%;
}

.radar-chart__label {
  fill: var(--c-text-dim);
  font-size: 9px;
  font-family: inherit;
}

.attr-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.attr-list__item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 10px;
  background: rgba(255,255,255,0.02);
  border-radius: var(--r-sm);
}

.attr-list__name {
  font-size: var(--fs-sm);
  color: var(--c-text-dim);
}

.attr-list__value {
  font-size: var(--fs-base);
  font-weight: 700;
  color: var(--c-jade);
}

/* 词条槽位 */
.slots-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* 功法列表 */
.tech-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tech-item {
  padding: 10px 12px;
  background: rgba(255,255,255,0.02);
  border: 1px solid var(--c-border-dim);
  border-radius: var(--r-md);
}

.tech-item--active {
  border-color: var(--c-jade-dim);
  background: rgba(126, 200, 160, 0.04);
}

.tech-item__info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.tech-item__name {
  font-size: var(--fs-sm);
  font-weight: 500;
}

.tech-item__level {
  font-size: var(--fs-xs);
}

/* 背包 */
.inv-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 8px;
}

.inv-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: rgba(255,255,255,0.02);
  border: 1px solid var(--c-border-dim);
  border-radius: var(--r-md);
}

.inv-item__icon {
  font-size: 20px;
}

.inv-item__info {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.inv-item__name {
  font-size: var(--fs-sm);
}

.inv-item__qty {
  font-size: var(--fs-xs);
}

/* 资源 */
.res-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.res-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: rgba(255,255,255,0.02);
  border: 1px solid var(--c-border-dim);
  border-radius: var(--r-md);
}

.res-item__icon { font-size: 16px; }
.res-item__label { font-size: var(--fs-sm); color: var(--c-text-dim); flex: 1; }
.res-item__val { font-size: var(--fs-base); font-weight: 600; color: var(--c-gold-light); }
</style>
