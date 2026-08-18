<template>
  <div class="status-bar" :class="{ 'status-bar--sim': isSimulation }">
    <div class="status-bar__left">
      <div class="status-bar__realm">
        <span class="status-bar__name">{{ playerName }}</span>
        <span class="status-bar__dot">·</span>
        <span class="status-bar__realm-text">{{ realm }}</span>
      </div>
      <div class="status-bar__cultivation">
        <ProgressBar
          :current="cultivation"
          :max="maxCultivation"
          type="cultivation"
          :showLabel="false"
        />
      </div>
    </div>
    <div class="status-bar__right">
      <div class="status-bar__res">
        <span class="status-bar__res-icon">💎</span>
        <span class="status-bar__res-val font-num" :class="{ 'num-change': stoneChanged }">{{ spiritStones }}</span>
      </div>
      <div class="status-bar__res" v-if="showDestiny">
        <span class="status-bar__res-icon">🔮</span>
        <span class="status-bar__res-val font-num" :class="{ 'num-change': destinyChanged }">{{ destinyPoints }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import ProgressBar from './ProgressBar.vue';

const props = defineProps({
  playerName: { type: String, default: '无名散修' },
  realm: { type: String, default: '炼气一层' },
  cultivation: { type: Number, default: 0 },
  maxCultivation: { type: Number, default: 100 },
  spiritStones: { type: Number, default: 0 },
  destinyPoints: { type: Number, default: 0 },
  showDestiny: { type: Boolean, default: true },
  isSimulation: { type: Boolean, default: false },
});

const stoneChanged = ref(false);
const destinyChanged = ref(false);

watch(() => props.spiritStones, () => {
  stoneChanged.value = true;
  setTimeout(() => { stoneChanged.value = false; }, 450);
});

watch(() => props.destinyPoints, () => {
  destinyChanged.value = true;
  setTimeout(() => { destinyChanged.value = false; }, 450);
});
</script>

<style scoped>
.status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  padding-top: calc(10px + var(--safe-top));
  background: linear-gradient(180deg, rgba(26, 18, 8, 0.95), rgba(26, 18, 8, 0.75));
  border-bottom: 1px solid var(--c-border-dim);
  gap: 12px;
  position: relative;
  z-index: 10;
}

.status-bar--sim {
  background: linear-gradient(180deg, rgba(10, 10, 26, 0.95), rgba(10, 10, 26, 0.75));
  border-bottom-color: rgba(140, 100, 230, 0.2);
}

.status-bar__left {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.status-bar__realm {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: var(--fs-sm);
}

.status-bar__name {
  color: var(--c-gold-light);
  font-weight: 600;
}

.status-bar--sim .status-bar__name {
  color: var(--sim-glow);
}

.status-bar__dot {
  color: var(--c-text-muted);
}

.status-bar__realm-text {
  color: var(--c-jade);
  font-size: var(--fs-xs);
}

.status-bar__cultivation {
  width: 100%;
  max-width: 160px;
  min-width: 80px;
}

.status-bar__right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.status-bar__res {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: var(--fs-sm);
}

.status-bar__res-icon {
  font-size: 14px;
}

.status-bar__res-val {
  color: var(--c-gold-light);
  font-weight: 600;
  font-size: var(--fs-sm);
}

.status-bar--sim .status-bar__res-val {
  color: var(--sim-text);
}

/* 数值变化动画 */
.num-change {
  animation: num-flash 0.45s ease-out;
}

@keyframes num-flash {
  0% { transform: scale(1); color: var(--c-gold-light); }
  30% { transform: scale(1.4); color: #4ade80; text-shadow: 0 0 8px rgba(74, 222, 128, 0.6); }
  100% { transform: scale(1); color: var(--c-gold-light); text-shadow: none; }
}

.status-bar--sim .num-change {
  animation: num-flash-sim 0.45s ease-out;
}

@keyframes num-flash-sim {
  0% { transform: scale(1); }
  30% { transform: scale(1.4); color: #a78bfa; text-shadow: 0 0 8px rgba(167, 139, 250, 0.6); }
  100% { transform: scale(1); text-shadow: none; }
}
</style>
