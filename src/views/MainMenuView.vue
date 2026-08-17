<template>
  <div class="main-menu">
    <!-- 背景装饰 -->
    <div class="main-menu__bg">
      <div class="main-menu__mist mist-1"></div>
      <div class="main-menu__mist mist-2"></div>
      <div class="main-menu__lines"></div>
    </div>

    <!-- 内容区 -->
    <div class="main-menu__content">
      <!-- 标题区域 -->
      <div class="main-menu__title-block anim-fade-up">
        <h1 class="main-menu__title font-title title-mist">玄衍仙途</h1>
        <p class="main-menu__subtitle text-dim">命 运 模 拟 器</p>
        <p class="main-menu__tagline">以命运为盘，以选择为子</p>
      </div>

      <!-- 按钮区 -->
      <div class="main-menu__actions anim-fade-up" style="animation-delay: 0.2s;">
        <button
          v-if="hasSave"
          class="menu-btn menu-btn--primary"
          @click="handleContinue"
        >
          <span class="menu-btn__icon">▶</span>
          继续仙途
        </button>
        <button class="menu-btn menu-btn--primary" @click="handleNewGame">
          <span class="menu-btn__icon">✦</span>
          踏入仙途
        </button>
        <button class="menu-btn menu-btn--ghost" @click="handleSettings">
          <span class="menu-btn__icon">⚙</span>
          设置
        </button>
      </div>

      <!-- 版本信息 -->
      <div class="main-menu__footer">
        <p>v0.1.0 Demo · 炼气篇</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { saveSystem } from '../engines/saveSystem.js';

const router = useRouter();
const hasSave = ref(false);

onMounted(() => {
  try {
    saveSystem.init();
    const slot = saveSystem.load(0);
    hasSave.value = !!slot?.player;
  } catch {
    hasSave.value = false;
  }
});

function handleContinue() {
  router.push('/reality');
}

function handleNewGame() {
  router.push('/new-game');
}

function handleSettings() {
  router.push('/settings');
}
</script>

<style scoped>
.main-menu {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  background: radial-gradient(ellipse at 50% 30%, #2d1f0f 0%, #1a1208 70%);
}

/* 背景装饰 */
.main-menu__bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.main-menu__mist {
  position: absolute;
  border-radius: 50%;
  filter: blur(60px);
  opacity: 0.18;
}

.mist-1 {
  width: 280px;
  height: 280px;
  background: radial-gradient(circle, var(--c-gold-dim), transparent 70%);
  top: -60px;
  left: -40px;
  animation: mist-drift-1 12s ease-in-out infinite;
}

.mist-2 {
  width: 200px;
  height: 200px;
  background: radial-gradient(circle, var(--c-jade-dim), transparent 70%);
  bottom: 10%;
  right: -30px;
  animation: mist-drift-2 15s ease-in-out infinite;
}

@keyframes mist-drift-1 {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(30px, 20px); }
}

@keyframes mist-drift-2 {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(-20px, -30px); }
}

.main-menu__lines {
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    90deg,
    transparent,
    transparent 40px,
    rgba(212, 175, 85, 0.015) 40px,
    rgba(212, 175, 85, 0.015) 41px
  );
}

/* 内容区 */
.main-menu__content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 32px;
  width: 100%;
  max-width: 360px;
}

/* 标题 */
.main-menu__title-block {
  text-align: center;
  margin-bottom: 56px;
}

.main-menu__title {
  font-size: var(--fs-title);
  letter-spacing: 0.2em;
  margin-bottom: 8px;
  line-height: 1.3;
}

.main-menu__subtitle {
  font-size: var(--fs-lg);
  letter-spacing: 0.25em;
  margin-bottom: 16px;
}

.main-menu__tagline {
  font-size: var(--fs-xs);
  color: var(--c-text-muted);
  letter-spacing: 0.15em;
}

/* 按钮 */
.main-menu__actions {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.menu-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  padding: 14px 24px;
  font-size: var(--fs-lg);
  font-family: inherit;
  letter-spacing: 0.1em;
  border-radius: var(--r-md);
  cursor: pointer;
  transition:
    transform var(--dur-fast) var(--ease-spring),
    background var(--dur-normal) var(--ease-out),
    border-color var(--dur-normal) var(--ease-out),
    box-shadow var(--dur-normal) var(--ease-out);
  outline: none;
  position: relative;
  overflow: hidden;
}

.menu-btn:active { transform: scale(0.96); }

.menu-btn--primary {
  background: linear-gradient(135deg, rgba(212, 175, 85, 0.18), rgba(212, 175, 85, 0.06));
  border: 1px solid var(--c-border);
  color: var(--c-gold-light);
}

.menu-btn--primary:hover {
  background: linear-gradient(135deg, rgba(212, 175, 85, 0.28), rgba(212, 175, 85, 0.12));
  border-color: var(--c-gold);
  box-shadow: 0 0 20px rgba(212, 175, 85, 0.12);
}

.menu-btn--ghost {
  background: transparent;
  border: 1px solid var(--c-border-dim);
  color: var(--c-text-dim);
}

.menu-btn--ghost:hover {
  border-color: var(--c-border);
  color: var(--c-text);
}

.menu-btn__icon {
  font-size: 0.85em;
  opacity: 0.7;
}

/* 底部 */
.main-menu__footer {
  position: absolute;
  bottom: calc(32px + var(--safe-bottom));
  text-align: center;
  width: 100%;
  left: 0;
}

.main-menu__footer p {
  font-size: var(--fs-xs);
  color: var(--c-text-muted);
  letter-spacing: 0.1em;
}
</style>
