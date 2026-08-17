<template>
  <div
    class="term-slot"
    :class="[
      `term-slot--${rarity || 'empty'}`,
      { 'term-slot--locked': locked, 'term-slot--empty': !termId }
    ]"
    @click="handleClick"
  >
    <div class="term-slot__icon">
      <template v-if="locked">
        <span class="term-slot__lock">🔒</span>
      </template>
      <template v-else-if="termId">
        <span class="term-slot__gem" :class="`rarity-${rarity}`">{{ gemIcon }}</span>
      </template>
      <template v-else>
        <span class="term-slot__placeholder">＋</span>
      </template>
    </div>
    <div class="term-slot__info" v-if="!locked && termId">
      <span class="term-slot__name">{{ name }}</span>
      <span class="term-slot__rarity">{{ rarityLabel }}</span>
    </div>
    <div class="term-slot__info" v-else-if="locked">
      <span class="term-slot__name text-dim">{{ unlockCondition || '未解锁' }}</span>
    </div>
    <div class="term-slot__info" v-else>
      <span class="term-slot__name text-dim">空槽位</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  termId: { type: String, default: null },
  name: { type: String, default: '' },
  rarity: { type: String, default: 'common' },
  locked: { type: Boolean, default: false },
  unlockCondition: { type: String, default: '' },
});

const emit = defineEmits(['click']);

const rarityLabel = computed(() => {
  const map = {
    common: '凡品', rare: '良品', epic: '极品', legendary: '仙品', cursed: '凶品',
  };
  return map[props.rarity] || '凡品';
});

const gemIcon = computed(() => {
  const map = {
    common: '◇', rare: '◈', epic: '✦', legendary: '★', cursed: '✧',
  };
  return map[props.rarity] || '◇';
});

function handleClick() {
  emit('click', { termId: props.termId, name: props.name, rarity: props.rarity });
}
</script>

<style scoped>
.term-slot {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--c-border-dim);
  border-radius: var(--r-md);
  background: rgba(255, 255, 255, 0.02);
  cursor: pointer;
  transition:
    transform var(--dur-fast) var(--ease-spring),
    border-color var(--dur-normal),
    box-shadow var(--dur-normal);
  min-height: 52px;
}

.term-slot:active { transform: scale(0.97); }

.term-slot--empty { border-style: dashed; opacity: 0.5; }
.term-slot--locked { opacity: 0.4; cursor: default; }

/* 品质色边框 */
.term-slot--common    { border-color: rgba(192,192,192,0.25); }
.term-slot--rare      { border-color: rgba(85,153,255,0.35);  box-shadow: 0 0 8px rgba(85,153,255,0.1); }
.term-slot--epic      { border-color: rgba(187,102,255,0.40); box-shadow: 0 0 10px rgba(187,102,255,0.12); }
.term-slot--legendary { border-color: rgba(255,167,51,0.50);  box-shadow: 0 0 14px rgba(255,167,51,0.18); animation: term-glow-legendary 3s ease-in-out infinite; }
.term-slot--cursed    { border-color: rgba(122,51,85,0.40); }

.term-slot__icon {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--r-sm);
  background: rgba(255, 255, 255, 0.04);
  font-size: 16px;
}

.term-slot__gem {
  font-size: 18px;
  font-weight: 700;
}

.term-slot__lock {
  font-size: 14px;
  opacity: 0.6;
}

.term-slot__placeholder {
  font-size: 18px;
  color: var(--c-text-muted);
}

.term-slot__info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.term-slot__name {
  font-size: var(--fs-sm);
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.term-slot__rarity {
  font-size: var(--fs-xs);
  color: var(--c-text-dim);
}

.term-slot--legendary .term-slot__name { color: var(--rarity-legendary); }
.term-slot--epic .term-slot__name      { color: var(--rarity-epic); }
.term-slot--rare .term-slot__name      { color: var(--rarity-rare); }
.term-slot--cursed .term-slot__name    { color: var(--rarity-cursed); }
</style>
