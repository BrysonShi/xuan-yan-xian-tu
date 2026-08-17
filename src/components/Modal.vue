<template>
  <Teleport to="body">
    <transition name="modal-fade">
      <div v-if="visible" class="modal-overlay" @click.self="handleOverlayClick">
        <div class="modal-box" :class="[`modal-box--${size}`]">
          <div class="modal-box__header" v-if="title">
            <h3 class="modal-box__title font-title">{{ title }}</h3>
            <button class="modal-box__close" @click="handleClose">✕</button>
          </div>
          <div class="modal-box__body game-scroll">
            <slot></slot>
          </div>
          <div class="modal-box__footer" v-if="showFooter">
            <button
              v-if="cancelText"
              class="btn btn--ghost"
              @click="handleCancel"
            >{{ cancelText }}</button>
            <button
              v-if="confirmText"
              class="btn btn--primary"
              :disabled="confirmDisabled"
              @click="handleConfirm"
            >{{ confirmText }}</button>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
const props = defineProps({
  visible: { type: Boolean, default: false },
  title: { type: String, default: '' },
  size: { type: String, default: 'md', validator: (v) => ['sm', 'md', 'lg'].includes(v) },
  showFooter: { type: Boolean, default: true },
  confirmText: { type: String, default: '确认' },
  cancelText: { type: String, default: '取消' },
  confirmDisabled: { type: Boolean, default: false },
  closeOnOverlay: { type: Boolean, default: true },
});

const emit = defineEmits(['close', 'confirm', 'cancel', 'update:visible']);

function handleClose() {
  emit('update:visible', false);
  emit('close');
}

function handleConfirm() {
  emit('confirm');
}

function handleCancel() {
  emit('update:visible', false);
  emit('cancel');
}

function handleOverlayClick() {
  if (props.closeOnOverlay) handleClose();
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
  padding-bottom: calc(20px + var(--safe-bottom));
  backdrop-filter: blur(4px);
}

.modal-box {
  width: 100%;
  max-width: 380px;
  background: linear-gradient(160deg, var(--c-bg-light), var(--c-bg));
  border: 1px solid var(--c-border);
  border-radius: var(--r-lg);
  overflow: hidden;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.5);
}

.modal-box--sm { max-width: 300px; }
.modal-box--lg { max-width: 420px; }

.modal-box__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 12px;
  border-bottom: 1px solid var(--c-border-dim);
}

.modal-box__title {
  font-size: var(--fs-lg);
  color: var(--c-gold-light);
  letter-spacing: 0.05em;
}

.modal-box__close {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  color: var(--c-text-dim);
  font-size: 18px;
  cursor: pointer;
  border-radius: var(--r-sm);
  transition: all 0.15s;
  flex-shrink: 0;
}

.modal-box__close:hover {
  background: rgba(255,255,255,0.08);
  color: var(--c-text);
}

.modal-box__body {
  padding: 20px;
  max-height: 60vh;
  overflow-y: auto;
  font-size: var(--fs-base);
  line-height: 1.7;
}

.modal-box__footer {
  display: flex;
  gap: 10px;
  padding: 12px 20px 16px;
  justify-content: flex-end;
  border-top: 1px solid var(--c-border-dim);
}

.modal-box__footer .btn {
  min-width: 80px;
  padding: 8px 20px;
  font-size: var(--fs-sm);
}

/* 过渡 */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.25s var(--ease-out);
}

.modal-fade-enter-active .modal-box,
.modal-fade-leave-active .modal-box {
  transition: transform 0.3s var(--ease-spring);
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-from .modal-box {
  transform: scale(0.92) translateY(16px);
}

.modal-fade-leave-to .modal-box {
  transform: scale(0.96);
}
</style>
