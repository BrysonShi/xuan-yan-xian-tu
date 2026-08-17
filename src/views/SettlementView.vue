<template>
  <div class="settlement-view">
    <!-- 背景 -->
    <div class="settlement-view__bg">
      <div class="settlement-view__glow"></div>
    </div>

    <div class="settlement-view__content game-scroll">
      <!-- 标题 -->
      <div class="settlement-view__header anim-fade-down">
        <h2 class="font-title settlement-view__title">模拟终结</h2>
        <p class="settlement-view__subtitle text-dim">命运之轮停止转动</p>
      </div>

      <!-- 模拟摘要 -->
      <div class="settlement-view__summary anim-fade-up">
        <div class="summary-grid">
          <div class="summary-item">
            <span class="summary-item__label">存活年数</span>
            <span class="summary-item__value font-num">{{ simYears }}</span>
          </div>
          <div class="summary-item">
            <span class="summary-item__label">最高境界</span>
            <span class="summary-item__value">{{ highestRealm }}</span>
          </div>
          <div class="summary-item">
            <span class="summary-item__label">经历事件</span>
            <span class="summary-item__value font-num">{{ eventCount }}</span>
          </div>
          <div class="summary-item">
            <span class="summary-item__label">综合评价</span>
            <span class="summary-item__value summary-item__value--grade font-num">
              {{ grade }}
            </span>
          </div>
        </div>
      </div>

      <!-- 死亡回放 -->
      <div v-if="deathCause" class="settlement-view__death anim-fade-up" style="animation-delay:0.2s;">
        <p class="settlement-view__death-text text-dim">
          「{{ deathCause }}」
        </p>
      </div>

      <!-- 奖励选择 4选1 -->
      <div class="settlement-view__rewards anim-fade-up" style="animation-delay:0.35s;">
        <h3 class="rewards-title font-title">选择一项奖励带回现实</h3>
        <div class="rewards-grid">
          <div
            v-for="(reward, idx) in rewards"
            :key="idx"
            class="reward-card anim-card-flip"
            :class="[
              `reward-card--${reward.rarity}`,
              { 'reward-card--selected': selectedReward === idx }
            ]"
            @click="selectReward(idx)"
          >
            <div class="reward-card__icon">{{ reward.icon }}</div>
            <div class="reward-card__info">
              <span class="reward-card__name" :class="`rarity-${reward.rarity}`">{{ reward.name }}</span>
              <span class="reward-card__desc">{{ reward.desc }}</span>
              <span class="reward-card__rarity">{{ rarityLabel(reward.rarity) }}</span>
            </div>
            <div v-if="selectedReward === idx" class="reward-card__check">✓</div>
          </div>
        </div>
      </div>

      <!-- 确认按钮 -->
      <div class="settlement-view__action anim-fade-up" style="animation-delay:0.5s;">
        <button
          class="btn btn--primary settlement-view__confirm"
          :disabled="selectedReward === null"
          @click="confirmReward"
        >
          {{ selectedReward !== null ? '确认带回' : '请选择一项奖励' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

const simYears = ref(84);
const highestRealm = ref('炼气九层');
const eventCount = ref(23);
const grade = ref('B');
const deathCause = ref('寿元耗尽，坐化于洞府之中');
const selectedReward = ref(null);

const rewards = ref([
  {
    icon: '✦',
    name: '剑道入门',
    desc: '获得词条：剑道入门（良品）',
    rarity: 'rare',
  },
  {
    icon: '💫',
    name: '修为灌顶',
    desc: '获得3000点修为',
    rarity: 'common',
  },
  {
    icon: '📜',
    name: '清心诀',
    desc: '获得功法：清心诀',
    rarity: 'epic',
  },
  {
    icon: '🌟',
    name: '悟性碎片',
    desc: '永久悟性+1',
    rarity: 'legendary',
  },
]);

function rarityLabel(r) {
  const m = { common: '凡品', rare: '良品', epic: '极品', legendary: '仙品', cursed: '凶品' };
  return m[r] || '凡品';
}

function selectReward(idx) {
  selectedReward.value = idx;
}

function confirmReward() {
  if (selectedReward.value === null) return;
  // TODO: 将奖励写入玩家数据
  router.push('/reality');
}
</script>

<style scoped>
.settlement-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
  background: linear-gradient(180deg, #0d0d1a, #1a0a2d, #0d0d1a);
  overflow: hidden;
}

.settlement-view__bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.settlement-view__glow {
  position: absolute;
  top: -80px;
  left: 50%;
  transform: translateX(-50%);
  width: 300px;
  height: 300px;
  background: radial-gradient(circle, rgba(167, 139, 250, 0.12), transparent 70%);
  border-radius: 50%;
  filter: blur(40px);
}

.settlement-view__content {
  position: relative;
  z-index: 1;
  flex: 1;
  overflow-y: auto;
  padding: var(--s-xl) var(--s-lg);
  padding-top: calc(var(--s-xl) + var(--safe-top));
  padding-bottom: calc(var(--s-xl) + var(--safe-bottom));
}

/* 标题 */
.settlement-view__header {
  text-align: center;
  margin-bottom: var(--s-2xl);
}

.settlement-view__title {
  font-size: var(--fs-2xl);
  color: var(--sim-glow);
  letter-spacing: 0.2em;
  margin-bottom: 8px;
}

.settlement-view__subtitle {
  font-size: var(--fs-sm);
  letter-spacing: 0.15em;
}

/* 摘要 */
.settlement-view__summary {
  margin-bottom: var(--s-xl);
}

.summary-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.summary-item {
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(140, 100, 230, 0.15);
  border-radius: var(--r-md);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.summary-item__label {
  font-size: var(--fs-xs);
  color: var(--c-text-dim);
}

.summary-item__value {
  font-size: var(--fs-lg);
  font-weight: 700;
  color: var(--sim-text);
}

.summary-item__value--grade {
  color: var(--c-gold-light);
  font-size: var(--fs-2xl);
}

/* 死亡回放 */
.settlement-view__death {
  text-align: center;
  margin-bottom: var(--s-xl);
  padding: var(--s-md);
  border: 1px dashed rgba(224, 85, 85, 0.2);
  border-radius: var(--r-md);
}

.settlement-view__death-text {
  font-size: var(--fs-sm);
  font-style: italic;
  line-height: 1.6;
}

/* 奖励选择 */
.rewards-title {
  font-size: var(--fs-base);
  color: var(--c-gold);
  text-align: center;
  margin-bottom: var(--s-lg);
  letter-spacing: 0.1em;
}

.rewards-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.reward-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  border: 1px solid var(--c-border-dim);
  border-radius: var(--r-md);
  background: rgba(255, 255, 255, 0.02);
  cursor: pointer;
  position: relative;
  transition:
    transform var(--dur-fast) var(--ease-spring),
    border-color var(--dur-normal),
    box-shadow var(--dur-normal);
}

.reward-card:active { transform: scale(0.97); }

.reward-card--common    { border-color: rgba(192,192,192,0.2); }
.reward-card--rare      { border-color: rgba(85,153,255,0.3);  }
.reward-card--epic      { border-color: rgba(187,102,255,0.35); box-shadow: 0 0 12px rgba(187,102,255,0.08); }
.reward-card--legendary { border-color: rgba(255,167,51,0.45);  box-shadow: 0 0 16px rgba(255,167,51,0.12); }

.reward-card--selected {
  border-color: var(--c-gold) !important;
  background: rgba(212, 175, 85, 0.06) !important;
  box-shadow: 0 0 20px rgba(212, 175, 85, 0.15) !important;
}

.reward-card__icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--r-sm);
  background: rgba(255,255,255,0.04);
  font-size: 20px;
  flex-shrink: 0;
}

.reward-card__info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.reward-card__name {
  font-size: var(--fs-base);
  font-weight: 600;
}

.reward-card__desc {
  font-size: var(--fs-sm);
  color: var(--c-text-dim);
}

.reward-card__rarity {
  font-size: var(--fs-xs);
  color: var(--c-text-muted);
}

.reward-card__check {
  position: absolute;
  top: 10px;
  right: 12px;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--c-gold);
  color: var(--c-bg);
  font-weight: 700;
  font-size: 12px;
  border-radius: 50%;
}

/* 确认按钮 */
.settlement-view__action {
  margin-top: var(--s-xl);
}

.settlement-view__confirm {
  width: 100%;
  padding: 14px;
  font-size: var(--fs-lg);
  letter-spacing: 0.1em;
}
</style>
