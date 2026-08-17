<template>
  <div class="text-display" @click="handleClick">
    <div class="text-display__content" ref="contentRef">
      <span v-html="displayedText"></span>
      <span v-if="isTyping" class="typewriter-cursor"></span>
    </div>
    <div v-if="showSkip" class="text-display__skip text-dim font-num">
      点击跳过 ▼
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick, computed, onBeforeUnmount } from 'vue';

const props = defineProps({
  /** 要展示的完整文本 */
  text: { type: String, default: '' },
  /** 打字速度 (ms/字) */
  speed: { type: Number, default: 40 },
  /** 是否自动开始 */
  autoStart: { type: Boolean, default: true },
  /** 需要高亮的关键词列表 */
  highlights: { type: Array, default: () => [] },
});

const emit = defineEmits(['complete', 'click']);

const contentRef = ref(null);
const charIndex = ref(0);
const isTyping = ref(false);
let timerId = null;

const displaySpeed = computed(() => {
  try {
    const saved = localStorage.getItem('xyxztu_settings');
    if (saved) {
      const s = JSON.parse(saved);
      const map = { slow: 70, normal: 40, fast: 18, instant: 0 };
      if (map[s.textSpeed] !== undefined) return map[s.textSpeed];
    }
  } catch (e) { /* ignore */ }
  return props.speed;
});

const displayedText = computed(() => {
  const raw = props.text.slice(0, charIndex.value);
  if (props.highlights.length) {
    let result = raw;
    for (const kw of props.highlights) {
      if (!kw) continue;
      const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      result = result.replace(
        new RegExp(`(${escaped})`, 'g'),
        '<mark class="text-highlight">$1</mark>'
      );
    }
    return result;
  }
  return raw;
});

const showSkip = computed(() => isTyping.value && charIndex.value < props.text.length * 0.8);

function startTyping() {
  stopTyping();
  charIndex.value = 0;
  isTyping.value = true;

  const speed = displaySpeed.value;
  if (speed === 0) {
    charIndex.value = props.text.length;
    finishTyping();
    return;
  }

  tickOnce();
}

function tickOnce() {
  if (charIndex.value < props.text.length) {
    charIndex.value++;
    const ch = props.text[charIndex.value - 1];
    const delay = '，。！？；：…'.includes(ch)
      ? displaySpeed.value * 2.5
      : displaySpeed.value;

    timerId = setTimeout(() => {
      scrollToBottom();
      tickOnce();
    }, delay);
  } else {
    finishTyping();
  }
}

function stopTyping() {
  if (timerId) {
    clearTimeout(timerId);
    timerId = null;
  }
  isTyping.value = false;
}

function finishTyping() {
  stopTyping();
  charIndex.value = props.text.length;
  emit('complete');
}

function handleClick() {
  if (isTyping.value) {
    finishTyping();
  }
  emit('click');
}

function scrollToBottom() {
  nextTick(() => {
    const el = contentRef.value;
    if (el && el.parentElement) {
      el.parentElement.scrollTop = el.parentElement.scrollHeight;
    }
  });
}

watch(() => props.text, () => {
  if (props.autoStart) {
    nextTick(() => startTyping());
  }
}, { immediate: true });

onBeforeUnmount(() => {
  stopTyping();
});

defineExpose({ startTyping, finishTyping, isTyping });
</script>

<style scoped>
.text-display {
  line-height: 1.8;
  font-size: var(--fs-base);
  position: relative;
}

.text-display__content {
  white-space: pre-wrap;
  word-break: break-all;
}

.text-display :deep(.text-highlight) {
  color: var(--c-gold-light);
  background: rgba(212, 175, 85, 0.12);
  padding: 0 2px;
  border-radius: 2px;
  font-weight: 600;
}

.text-display__skip {
  font-size: var(--fs-xs);
  margin-top: 8px;
  opacity: 0.6;
  text-align: center;
  cursor: pointer;
  padding: 4px 8px;
  transition: opacity 0.2s;
}

.text-display__skip:hover {
  opacity: 0.9;
}
</style>
