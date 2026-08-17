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
import { audioManager } from './utils/audioManager.js';

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

  // 从设置中恢复音频状态（不在此处 init AudioContext，需等待用户交互）
  try {
    const settings = saveSystem.getSettings();
    audioManager.setBgmVolume(settings.bgmVolume ?? 0.7);
    audioManager.setSfxVolume(settings.sfxVolume ?? 0.8);
    audioManager.toggleBgm(settings.bgmEnabled !== false);
    audioManager.toggleSfx(settings.sfxEnabled !== false);
  } catch {}

  // 监听用户首次交互以初始化 AudioContext
  const initAudioOnInteraction = () => {
    audioManager.init();
    // 如果 BGM 开启，开始播放
    const settings = saveSystem.getSettings();
    if (settings.bgmEnabled !== false) {
      audioManager.startBgm();
    }
    // 移除监听器（只触发一次）
    document.removeEventListener('click', initAudioOnInteraction);
    document.removeEventListener('touchstart', initAudioOnInteraction);
  };
  document.addEventListener('click', initAudioOnInteraction, { once: false });
  document.addEventListener('touchstart', initAudioOnInteraction, { once: false });

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
