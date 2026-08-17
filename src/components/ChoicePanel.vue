<template>
  <div class="choice-panel" :class="{ 'choice-panel--sim': isSimulation }">
    <div
      v-for="(opt, idx) in options"
      :key="opt.id || idx"
      class="choice-panel__item anim-option-enter"
      :class="{
        'choice-panel__item--disabled': !opt.enabled,
        'choice-panel__item--selected': selectedId === opt.id,
        'choice-panel__item--memory': opt.isMemoryHint,
      }"
      @click="handleSelect(opt)"
      @touchstart.passive="touchStart(opt.id)"
      @touchend.passive="touchEnd(opt.id)"
    >
      <span class="choice-panel__label font-num">{{ opt.id || String.fromCharCode(65 + idx) }}</span>
      <span class="choice-panel__text">{{ opt.text }}</span>
      <span v-if="opt.description" class="choice-panel__desc">{{ opt.description }}</span>
      <span v-if="opt.successRate !== undefined && opt.successRate < 1" class="choice-panel__rate font-num">
        成功率 {{ Math.round(opt.successRate * 100) }}%
      </span>
      <!-- 不可用 tooltip -->
      <div v-if="!opt.enabled && opt.disabledReason" class="choice-panel__tooltip">
        {{ opt.disabledReason }}
      </div>
    </div>
    <div v-if="!options.length" class="choice-panel__empty text-dim">
      暂无可选行动
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { audioManager } from '../utils/audioManager.js';

const props = defineProps({
  options: { type: Array, default: () => [] },
  isSimulation: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
});

const emit = defineEmits(['select', 'longpress']);
const selectedId = ref(null);
let pressTimer = null;

function handleSelect(opt) {
  if (props.disabled) return;
  if (!opt.enabled && opt.enabled !== undefined) return;

  // 播放音效
  try { audioManager.playClick(); } catch {}
  setTimeout(() => { try { audioManager.playChoice(); } catch {} }, 80);

  selectedId.value = opt.id;
  emit('select', opt);
}

function touchStart(id) {
  pressTimer = setTimeout(() => {
    emit('longpress', id);
  }, 600);
}

function touchEnd() {
  if (pressTimer) {
    clearTimeout(pressTimer);
    pressTimer = null;
  }
}
</script>

<style scoped>
.choice-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 4px 0;
}

.choice-panel__item {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 14px 16px;
  min-height: 48px;
  border: 1px solid var(--c-border-dim);
  border-radius: var(--r-md);
  background: rgba(255, 255, 255, 0.025);
  cursor: pointer;
  transition:
    transform var(--dur-fast) var(--ease-spring),
    background var(--dur-normal) var(--ease-out),
    border-color var(--dur-normal) var(--ease-out);
  overflow: visible;
  -webkit-user-select: none;
  user-select: none;
}

.choice-panel__item:active {
  transform: scale(0.97);
}

.choice-panel__item:hover:not(.choice-panel__item--disabled) {
  background: rgba(255, 255, 255, 0.06);
  border-color: var(--c-border);
}

/* 模拟界面配色 */
.choice-panel--sim .choice-panel__item {
  border-color: rgba(140, 100, 230, 0.2);
}

.choice-panel--sim .choice-panel__item:hover:not(.choice-panel__item--disabled) {
  border-color: var(--sim-border);
  background: rgba(140, 100, 230, 0.06);
}

/* 选中态 */
.choice-panel__item--selected {
  border-color: var(--c-gold) !important;
  background: rgba(212, 175, 85, 0.08) !important;
  animation: choice-selected 0.5s var(--ease-out) both;
}

.choice-panel--sim .choice-panel__item--selected {
  border-color: var(--sim-glow) !important;
  background: rgba(167, 139, 250, 0.10) !important;
}

/* 禁用态 */
.choice-panel__item--disabled {
  opacity: 0.38;
  cursor: not-allowed;
}

/* 记忆碎片提示高亮 */
.choice-panel__item--memory {
  border-color: rgba(187, 102, 255, 0.5);
  box-shadow: 0 0 12px rgba(187, 102, 255, 0.15);
}

.choice-panel__label {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--r-sm);
  background: rgba(255, 255, 255, 0.06);
  font-size: var(--fs-sm);
  color: var(--c-gold);
  font-weight: 600;
}

.choice-panel--sim .choice-panel__label {
  color: var(--sim-glow);
}

.choice-panel__text {
  flex: 1;
  font-size: var(--fs-base);
  min-width: 0;
}

.choice-panel__desc {
  width: 100%;
  font-size: var(--fs-sm);
  color: var(--c-text-dim);
  margin-top: -2px;
  padding-left: 32px;
}

.choice-panel__rate {
  font-size: var(--fs-xs);
  color: var(--c-warning);
  flex-shrink: 0;
}

.choice-panel__tooltip {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  padding: 6px 12px;
  background: rgba(0, 0, 0, 0.88);
  border-radius: var(--r-sm);
  font-size: var(--fs-xs);
  color: var(--c-text);
  white-space: nowrap;
  max-width: 280px;
  white-space: normal;
  text-align: center;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s;
  z-index: 10;
  margin-top: 4px;
}

.choice-panel__item--disabled:active .choice-panel__tooltip,
.choice-panel__item--disabled:hover .choice-panel__tooltip {
  opacity: 1;
}

.choice-panel__empty {
  text-align: center;
  padding: 24px;
  font-size: var(--fs-sm);
}
</style>
