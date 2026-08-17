<template>
  <div id="game-app" :class="['game-container', `theme-${currentTheme}`]">
    <router-view v-slot="{ Component }">
      <transition name="fade-slide" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
  </div>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount } from 'vue';
import { saveSystem } from './engines/saveSystem.js';
import { eventBus } from './utils/eventBus.js';

// 导入全局样式
import './styles/main.css';
import './styles/animations.css';

// 当前主题
const currentTheme = computed(() => {
  const settings = saveSystem.getSettings();
  return settings.theme || 'dark';
});

// 初始化
onMounted(() => {
  // 初始化存档系统
  saveSystem.init();

  // 页面关闭之前紧急存档
  window.addEventListener('beforeunload', handleBeforeUnload);

  console.log('[玄衍仙途] 命运之轮，开始转动……');
});

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload);
  saveSystem.emergencySave();
  eventBus.clear();
});

function handleBeforeUnload() {
  saveSystem.emergencySave();
}
</script>

<style>
/* 全局基础样式已由 main.css 提供，无需重复定义 */
</style>
