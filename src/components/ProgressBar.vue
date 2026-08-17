<template>
  <div class="progress-bar" :class="[`progress-bar--${type}`]">
    <div class="progress-bar__track">
      <div
        class="progress-bar__fill progress-bar-fill"
        :style="{ width: percent + '%' }"
      ></div>
    </div>
    <div class="progress-bar__info" v-if="showLabel">
      <span class="progress-bar__label font-num">{{ label }}</span>
      <span class="progress-bar__value font-num">{{ currentDisplay }} / {{ maxDisplay }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  current: { type: Number, default: 0 },
  max: { type: Number, default: 100 },
  type: {
    type: String,
    default: 'cultivation',
    validator: (v) => ['cultivation', 'hp', 'mp', 'exp', 'generic'].includes(v),
  },
  showLabel: { type: Boolean, default: true },
  label: { type: String, default: '' },
});

const percent = computed(() => {
  if (props.max <= 0) return 0;
  return Math.min(100, Math.max(0, (props.current / props.max) * 100));
});

function formatNum(n) {
  if (n >= 100000000) return (n / 100000000).toFixed(1) + '亿';
  if (n >= 10000) return (n / 10000).toFixed(1) + '万';
  return n.toLocaleString();
}

const currentDisplay = computed(() => formatNum(props.current));
const maxDisplay = computed(() => formatNum(props.max));
</script>

<style scoped>
.progress-bar {
  width: 100%;
}

.progress-bar__track {
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.06);
  border-radius: var(--r-full);
  overflow: hidden;
  position: relative;
}

.progress-bar__fill {
  height: 100%;
  border-radius: var(--r-full);
  transition: width 0.6s var(--ease-out);
  position: relative;
}

/* 修为：金色 */
.progress-bar--cultivation .progress-bar__fill {
  background: linear-gradient(90deg, var(--c-gold-dim), var(--c-gold));
  box-shadow: 0 0 8px rgba(212, 175, 85, 0.3);
}

/* 气血：红色 */
.progress-bar--hp .progress-bar__fill {
  background: linear-gradient(90deg, #903030, #e05555);
  box-shadow: 0 0 8px rgba(224, 85, 85, 0.25);
}

/* 灵力：蓝色 */
.progress-bar--mp .progress-bar__fill {
  background: linear-gradient(90deg, #305090, #5599ff);
  box-shadow: 0 0 8px rgba(85, 153, 255, 0.25);
}

/* 经验：绿色 */
.progress-bar--exp .progress-bar__fill {
  background: linear-gradient(90deg, var(--c-jade-dim), var(--c-jade));
  box-shadow: 0 0 8px rgba(126, 200, 160, 0.2);
}

/* 通用：白色 */
.progress-bar--generic .progress-bar__fill {
  background: linear-gradient(90deg, rgba(255,255,255,0.15), rgba(255,255,255,0.35));
}

.progress-bar__info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 4px;
  font-size: var(--fs-xs);
}

.progress-bar__label {
  color: var(--c-text-dim);
}

.progress-bar__value {
  color: var(--c-text);
}
</style>
