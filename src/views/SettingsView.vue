<template>
  <div class="settings-view">
    <div class="settings-header">
      <button class="btn btn--ghost" @click="$router.back()">← 返回</button>
      <h2 class="font-title settings-header__title">设置</h2>
    </div>

    <div class="settings-content game-scroll">
      <!-- 文字速度 -->
      <div class="setting-group anim-fade-up">
        <h3 class="setting-group__title">显示</h3>
        <div class="setting-item">
          <span class="setting-item__label">文字速度</span>
          <div class="setting-item__control">
            <button
              v-for="spd in speedOptions"
              :key="spd.value"
              class="speed-btn"
              :class="{ 'speed-btn--active': settings.textSpeed === spd.value }"
              @click="settings.textSpeed = spd.value"
            >{{ spd.label }}</button>
          </div>
        </div>

        <div class="setting-item">
          <span class="setting-item__label">主题</span>
          <div class="setting-item__control">
            <button
              v-for="t in themeOptions"
              :key="t.value"
              class="speed-btn"
              :class="{ 'speed-btn--active': settings.theme === t.value }"
              @click="settings.theme = t.value"
            >{{ t.label }}</button>
          </div>
        </div>
      </div>

      <!-- 音效 -->
      <div class="setting-group anim-fade-up" style="animation-delay:0.1s;">
        <h3 class="setting-group__title">音效</h3>
        <div class="setting-item">
          <span class="setting-item__label">背景音乐</span>
          <label class="toggle">
            <input type="checkbox" v-model="settings.bgmEnabled" @change="onBgmToggle" />
            <span class="toggle__track"></span>
          </label>
        </div>
        <div class="setting-item">
          <span class="setting-item__label">BGM 音量</span>
          <div class="setting-item__slider">
            <input
              type="range"
              min="0" max="100" step="1"
              :value="Math.round(settings.bgmVolume * 100)"
              @input="onBgmVolumeInput($event)"
              class="volume-slider"
            />
            <span class="volume-value font-num">{{ Math.round(settings.bgmVolume * 100) }}%</span>
          </div>
        </div>
        <div class="setting-item">
          <span class="setting-item__label">音效</span>
          <label class="toggle">
            <input type="checkbox" v-model="settings.sfxEnabled" @change="onSfxToggle" />
            <span class="toggle__track"></span>
          </label>
        </div>
        <div class="setting-item">
          <span class="setting-item__label">SFX 音量</span>
          <div class="setting-item__slider">
            <input
              type="range"
              min="0" max="100" step="1"
              :value="Math.round(settings.sfxVolume * 100)"
              @input="onSfxVolumeInput($event)"
              class="volume-slider"
            />
            <span class="volume-value font-num">{{ Math.round(settings.sfxVolume * 100) }}%</span>
          </div>
        </div>
        <div class="setting-item">
          <span class="setting-item__label">震动反馈</span>
          <label class="toggle">
            <input type="checkbox" v-model="settings.vibration" />
            <span class="toggle__track"></span>
          </label>
        </div>
      </div>

      <!-- 存档管理 -->
      <div class="setting-group anim-fade-up" style="animation-delay:0.2s;">
        <h3 class="setting-group__title">存档</h3>
        <div class="setting-item">
          <span class="setting-item__label">自动存档</span>
          <label class="toggle">
            <input type="checkbox" v-model="settings.autoSave" />
            <span class="toggle__track"></span>
          </label>
        </div>
        <div class="save-slots">
          <div
            v-for="slot in saveSlots"
            :key="slot.index"
            class="save-slot"
            @click="handleSlotAction(slot)"
          >
            <div class="save-slot__info">
              <span class="save-slot__label font-num">槽位 {{ slot.index + 1 }}</span>
              <span v-if="slot.data" class="save-slot__detail text-dim">
                {{ slot.data.meta?.playerName || '未知' }} · {{ slot.data.meta?.realm || '' }}
              </span>
              <span v-else class="save-slot__empty text-dim">空</span>
            </div>
            <div class="save-slot__actions">
              <button class="save-slot__btn" @click.stop="handleSave(slot.index)">保存</button>
              <button class="save-slot__btn" :disabled="!slot.data" @click.stop="handleLoad(slot.index)">读取</button>
              <button class="save-slot__btn save-slot__btn--danger" :disabled="!slot.data" @click.stop="handleDelete(slot.index)">删除</button>
            </div>
          </div>
        </div>
      </div>

      <!-- 关于 -->
      <div class="setting-group anim-fade-up" style="animation-delay:0.3s;">
        <h3 class="setting-group__title">关于</h3>
        <div class="about-block">
          <p class="about-block__title font-title">玄衍仙途：命运模拟器</p>
          <p class="text-dim" style="font-size:var(--fs-sm);">v0.1.0 Demo · 炼气篇</p>
          <p class="text-dim" style="font-size:var(--fs-xs); margin-top:8px;">
            以命运为盘，以选择为子。<br>
            每一次选择都是一次命运的偏移。
          </p>
        </div>
      </div>

      <!-- 保存按钮 -->
      <button class="btn btn--primary settings-save-btn anim-fade-up" style="animation-delay:0.35s;" @click="handleSaveSettings">
        保存设置
      </button>

      <!-- 轻量 Toast 提示 -->
      <transition name="toast-fade">
        <div v-if="toastMsg" class="settings-toast">{{ toastMsg }}</div>
      </transition>
    </div>

    <!-- 确认删除弹窗 -->
    <Modal
      v-model:visible="deleteConfirmVisible"
      title="确认删除"
      size="sm"
      confirmText="删除"
      cancelText="取消"
      @confirm="confirmDelete"
    >
      <p>确定删除槽位 {{ deleteSlotIndex + 1 }} 的存档？此操作不可恢复。</p>
    </Modal>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue';
import { saveSystem } from '../engines/saveSystem.js';
import { audioManager } from '../utils/audioManager.js';
import Modal from '../components/Modal.vue';

const speedOptions = [
  { value: 'slow', label: '慢' },
  { value: 'normal', label: '正常' },
  { value: 'fast', label: '快' },
  { value: 'instant', label: '即时' },
];

const themeOptions = [
  { value: 'dark', label: '暗色' },
  { value: 'light', label: '亮色' },
];

const settings = reactive({
  textSpeed: 'normal',
  theme: 'dark',
  autoSave: true,
  vibration: true,
  bgmEnabled: true,
  sfxEnabled: true,
  bgmVolume: 0.7,
  sfxVolume: 0.8,
});

const saveSlots = ref([]);
const toastMsg = ref('');
const deleteConfirmVisible = ref(false);
const deleteSlotIndex = ref(-1);
let toastTimer = null;

function showToast(msg) {
  toastMsg.value = msg;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastMsg.value = ''; }, 2000);
}

onMounted(() => {
  try {
    const saved = saveSystem.getSettings();
    Object.assign(settings, saved);
  } catch { /* ignore */ }

  // 加载存档槽位信息
  saveSlots.value = [0, 1, 2, 3].map(i => {
    try {
      const data = saveSystem.load(i);
      return { index: i, data };
    } catch {
      return { index: i, data: null };
    }
  });
});

function handleSaveSettings() {
  saveSystem.updateSettings({ ...settings });
  showToast('设置已保存');
}

// ─── 音频控制回调 ───
function onBgmToggle() {
  try { audioManager.toggleBgm(settings.bgmEnabled); } catch {}
}

function onSfxToggle() {
  try { audioManager.toggleSfx(settings.sfxEnabled); } catch {}
}

function onBgmVolumeInput(e) {
  settings.bgmVolume = parseInt(e.target.value) / 100;
  try { audioManager.setBgmVolume(settings.bgmVolume); } catch {}
}

function onSfxVolumeInput(e) {
  settings.sfxVolume = parseInt(e.target.value) / 100;
  try { audioManager.setSfxVolume(settings.sfxVolume); } catch {}
  // 播放一个试听音效确认 SFX 正常
  try { audioManager.playClick(); } catch {}
}

function handleSave(slotIndex) {
  try {
    // TODO: 获取当前 player 数据
    showToast(`存档到槽位 ${slotIndex + 1}`);
  } catch {
    showToast('存档失败');
  }
}

function handleLoad(slotIndex) {
  try {
    saveSystem.load(slotIndex);
    showToast(`已从槽位 ${slotIndex + 1} 读取`);
  } catch {
    showToast('读取失败');
  }
}

function handleDelete(slotIndex) {
  deleteSlotIndex.value = slotIndex;
  deleteConfirmVisible.value = true;
}

function confirmDelete() {
  try {
    saveSystem.deleteSlot(deleteSlotIndex.value);
    saveSlots.value[deleteSlotIndex.value].data = null;
    showToast('存档已删除');
  } catch {
    showToast('删除失败');
  }
  deleteConfirmVisible.value = false;
}

function handleSlotAction(slot) {
  // 点击整个槽位的行为
}
</script>

<style scoped>
.settings-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--c-bg);
}

.settings-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: var(--s-lg);
  padding-top: calc(var(--s-lg) + var(--safe-top));
  border-bottom: 1px solid var(--c-border-dim);
}

.settings-header__title {
  font-size: var(--fs-xl);
  color: var(--c-gold-light);
  letter-spacing: 0.1em;
}

.settings-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--s-lg);
}

/* 设置组 */
.setting-group {
  margin-bottom: var(--s-2xl);
}

.setting-group__title {
  font-size: var(--fs-sm);
  color: var(--c-gold);
  letter-spacing: 0.08em;
  font-weight: 600;
  margin-bottom: var(--s-md);
  padding-bottom: var(--s-xs);
  border-bottom: 1px solid var(--c-border-dim);
}

/* 设置项 */
.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid rgba(255,255,255,0.03);
}

.setting-item__label {
  font-size: var(--fs-base);
  color: var(--c-text);
}

.setting-item__control {
  display: flex;
  gap: 6px;
}

/* 速度按钮组 */
.speed-btn {
  padding: 5px 12px;
  font-size: var(--fs-sm);
  font-family: inherit;
  color: var(--c-text-dim);
  background: rgba(255,255,255,0.03);
  border: 1px solid var(--c-border-dim);
  border-radius: var(--r-sm);
  cursor: pointer;
  transition: all 0.15s;
}

.speed-btn:hover {
  border-color: var(--c-border);
  color: var(--c-text);
}

.speed-btn--active {
  background: rgba(212, 175, 85, 0.12);
  border-color: var(--c-gold);
  color: var(--c-gold-light);
}

/* 开关 */
.toggle {
  position: relative;
  display: inline-block;
  cursor: pointer;
}

.toggle input {
  display: none;
}

.toggle__track {
  display: block;
  width: 42px;
  height: 24px;
  border-radius: 12px;
  background: rgba(255,255,255,0.08);
  border: 1px solid var(--c-border-dim);
  position: relative;
  transition: all 0.2s;
}

.toggle__track::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--c-text-dim);
  transition: all 0.2s var(--ease-spring);
}

.toggle input:checked + .toggle__track {
  background: rgba(212, 175, 85, 0.15);
  border-color: var(--c-gold);
}

.toggle input:checked + .toggle__track::after {
  transform: translateX(18px);
  background: var(--c-gold);
}

/* 存档槽位 */
.save-slots {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: var(--s-md);
}

.save-slot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  background: rgba(255,255,255,0.02);
  border: 1px solid var(--c-border-dim);
  border-radius: var(--r-md);
}

.save-slot__info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.save-slot__label {
  font-size: var(--fs-sm);
  font-weight: 600;
  color: var(--c-text);
}

.save-slot__detail,
.save-slot__empty {
  font-size: var(--fs-xs);
}

.save-slot__actions {
  display: flex;
  gap: 6px;
}

.save-slot__btn {
  padding: 4px 10px;
  font-size: var(--fs-xs);
  font-family: inherit;
  color: var(--c-text-dim);
  background: rgba(255,255,255,0.04);
  border: 1px solid var(--c-border-dim);
  border-radius: var(--r-sm);
  cursor: pointer;
  transition: all 0.15s;
}

.save-slot__btn:hover:not(:disabled) {
  border-color: var(--c-border);
  color: var(--c-text);
}

.save-slot__btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.save-slot__btn--danger:hover:not(:disabled) {
  border-color: var(--c-danger);
  color: var(--c-danger);
}

/* 关于 */
.about-block {
  padding: var(--s-md) 0;
  line-height: 1.8;
}

.about-block__title {
  font-size: var(--fs-lg);
  color: var(--c-gold-light);
  letter-spacing: 0.1em;
  margin-bottom: 4px;
}

/* 保存按钮 */
.settings-save-btn {
  width: 100%;
  padding: 14px;
  font-size: var(--fs-lg);
  letter-spacing: 0.1em;
  margin-top: var(--s-lg);
  margin-bottom: var(--s-2xl);
}

/* Toast 提示 */
.settings-toast {
  position: fixed;
  bottom: calc(80px + var(--safe-bottom));
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 24px;
  background: rgba(0, 0, 0, 0.85);
  border: 1px solid var(--c-border);
  border-radius: var(--r-md);
  color: var(--c-text);
  font-size: var(--fs-sm);
  z-index: 100;
  white-space: nowrap;
  backdrop-filter: blur(8px);
}

.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: opacity 0.25s, transform 0.25s;
}

.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(8px);
}

/* 存档操作按钮增大点击区域 */
.save-slot__btn {
  padding: 8px 12px;
  min-height: 32px;
}

/* 音量滑块 */
.setting-item__slider {
  display: flex;
  align-items: center;
  gap: 10px;
}

.volume-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 100px;
  height: 4px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.1);
  outline: none;
  cursor: pointer;
}

.volume-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--c-gold);
  border: 2px solid var(--c-gold-light);
  cursor: pointer;
  transition: transform 0.15s;
}

.volume-slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
}

.volume-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--c-gold);
  border: 2px solid var(--c-gold-light);
  cursor: pointer;
}

.volume-value {
  font-size: var(--fs-xs);
  color: var(--c-text-dim);
  min-width: 32px;
  text-align: right;
}
</style>
