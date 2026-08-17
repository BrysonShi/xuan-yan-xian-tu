<template>
  <div class="new-game">
    <div class="new-game__header">
      <button class="btn btn--ghost new-game__back" @click="$router.push('/main-menu')">
        ← 返回
      </button>
      <h2 class="font-title new-game__title">踏入仙途</h2>
    </div>

    <div class="new-game__body game-scroll">
      <!-- 道号输入 -->
      <div class="form-section anim-fade-up">
        <label class="form-label">道号</label>
        <div class="form-input-wrap">
          <input
            v-model="playerName"
            class="form-input"
            placeholder="请输入你的道号"
            maxlength="12"
            @keyup.enter="proceedToTalent"
          />
        </div>
        <p class="form-hint text-dim">取一个仙途上的名号</p>
      </div>

      <!-- 天赋选择（简易转盘） -->
      <div class="form-section anim-fade-up" style="animation-delay: 0.15s;">
        <label class="form-label">先天灵根</label>
        <div class="talent-wheel" :class="{ 'talent-wheel--spinning': isSpinning }">
          <div class="talent-wheel__inner" :style="wheelStyle">
            <div
              v-for="(t, i) in talentPool"
              :key="i"
              class="talent-wheel__seg"
              :style="segStyle(i)"
            >
              <span class="talent-wheel__emoji">{{ t.emoji }}</span>
              <span class="talent-wheel__name">{{ t.name }}</span>
            </div>
          </div>
          <div class="talent-wheel__pointer">▲</div>
        </div>
        <div class="talent-result" v-if="selectedTalent">
          <p class="talent-result__name" :class="`rarity-${selectedTalent.rarity}`">
            {{ selectedTalent.name }}
          </p>
          <p class="talent-result__desc text-dim">{{ selectedTalent.desc }}</p>
        </div>
        <button
          class="btn btn--ghost talent-btn"
          :disabled="isSpinning"
          @click="rollTalent"
        >
          {{ isSpinning ? '感应中…' : '随机感应天赋' }}
        </button>
      </div>

      <!-- 确认按钮 -->
      <div class="form-section anim-fade-up" style="animation-delay: 0.3s;">
        <button
          class="btn btn--primary new-game__confirm"
          :disabled="!canCreate"
          @click="handleCreate"
        >
          ✦ 踏入仙途
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { usePlayerStore } from '../stores/playerStore.js';
import { saveSystem } from '../engines/saveSystem.js';

const router = useRouter();
const playerStore = usePlayerStore();

const playerName = ref('');
const isSpinning = ref(false);
const selectedTalent = ref(null);
const spinDeg = ref(0);

const talentPool = [
  { name: '天灵根', emoji: '🌟', rarity: 'legendary', desc: '五行灵根纯净，修炼速度极快', mult: 3.0 },
  { name: '地灵根', emoji: '💎', rarity: 'epic', desc: '灵根品质上乘，天赋异禀', mult: 2.0 },
  { name: '变异灵根', emoji: '⚡', rarity: 'epic', desc: '罕见变异灵根，潜力无穷', mult: 2.5 },
  { name: '真灵根', emoji: '🔥', rarity: 'rare', desc: '标准灵根，资质尚可', mult: 1.2 },
  { name: '伪灵根', emoji: '🌫', rarity: 'common', desc: '灵根驳杂，修炼缓慢', mult: 0.7 },
  { name: '废品灵根', emoji: '💀', rarity: 'cursed', desc: '废材灵根，仙途艰难', mult: 0.3 },
];

const wheelStyle = computed(() => ({
  transform: `rotate(${spinDeg.value}deg)`,
  transition: isSpinning.value ? 'transform 2.5s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none',
}));

function segStyle(i) {
  const angle = (360 / talentPool.length) * i;
  return { transform: `rotate(${angle}deg) translateY(-32px)` };
}

function rollTalent() {
  if (isSpinning.value) return;
  isSpinning.value = true;

  const extra = 1440 + Math.random() * 720; // 4~6圈
  const target = spinDeg.value + extra;
  spinDeg.value = target;

  setTimeout(() => {
    isSpinning.value = false;
    // 计算选中
    const norm = ((360 - (target % 360)) + 360) % 360;
    const idx = Math.floor(norm / (360 / talentPool.length)) % talentPool.length;
    selectedTalent.value = talentPool[idx];
  }, 2600);
}

const canCreate = computed(() => playerName.value.trim().length > 0);

function handleCreate() {
  alert('按钮被点击了! 名字: [' + playerName.value + '] canCreate=' + canCreate.value);
  if (!canCreate.value) {
    alert('canCreate 为 false，请先输入道号');
    return;
  }
  try {
    const player = playerStore.createPlayer(playerName.value.trim());

    if (selectedTalent.value) {
      player.spiritRoot = {
        type: ['金', '木', '水', '火', '土'],
        quality: selectedTalent.value.rarity === 'legendary' ? 5
          : selectedTalent.value.rarity === 'epic' ? 4
          : selectedTalent.value.rarity === 'rare' ? 3
          : selectedTalent.value.rarity === 'cursed' ? 1
          : 2,
        multiplier: selectedTalent.value.mult,
      };
      playerStore.updatePlayer(player);
    }

    alert('即将保存并跳转...');
    saveSystem.save(0, player);
    router.push('/reality');
  } catch (err) {
    alert('创建角色失败: ' + err.message + '\n' + err.stack);
    console.error('[NewGame] handleCreate error:', err);
  }
}
</script>

<style scoped>
.new-game {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--c-bg);
}

.new-game__header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: var(--s-lg);
  padding-top: calc(var(--s-lg) + var(--safe-top));
  border-bottom: 1px solid var(--c-border-dim);
}

.new-game__back {
  font-size: var(--fs-sm);
  padding: 6px 12px;
}

.new-game__title {
  font-size: var(--fs-xl);
  color: var(--c-gold-light);
  letter-spacing: 0.15em;
}

.new-game__body {
  flex: 1;
  overflow-y: auto;
  padding: var(--s-xl);
}

.form-section {
  margin-bottom: var(--s-2xl);
}

.form-label {
  display: block;
  font-size: var(--fs-sm);
  color: var(--c-gold);
  letter-spacing: 0.1em;
  margin-bottom: var(--s-sm);
  font-weight: 600;
}

.form-input-wrap {
  position: relative;
}

.form-input {
  width: 100%;
  padding: 12px 16px;
  font-size: var(--fs-base);
  font-family: inherit;
  color: var(--c-text);
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--c-border-dim);
  border-radius: var(--r-md);
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-input:focus {
  border-color: var(--c-gold);
  box-shadow: 0 0 12px rgba(212, 175, 85, 0.1);
}

.form-input::placeholder {
  color: var(--c-text-muted);
}

.form-hint {
  font-size: var(--fs-xs);
  margin-top: 6px;
}

/* 天赋转盘 */
.talent-wheel {
  position: relative;
  width: 140px;
  height: 140px;
  margin: var(--s-lg) auto;
}

.talent-wheel__inner {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 2px solid var(--c-border-dim);
  position: relative;
  background: radial-gradient(circle, var(--c-bg-light), var(--c-bg));
}

.talent-wheel--spinning .talent-wheel__inner {
  border-color: var(--c-gold);
  box-shadow: 0 0 20px rgba(212, 175, 85, 0.2);
}

.talent-wheel__seg {
  position: absolute;
  top: 50%;
  left: 50%;
  margin: -14px 0 0 -14px;
  width: 28px;
  height: 28px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transform-origin: 14px calc(50% + 18px);
  font-size: 10px;
}

.talent-wheel__emoji {
  font-size: 14px;
  line-height: 1;
}

.talent-wheel__name {
  font-size: 7px;
  color: var(--c-text-dim);
  white-space: nowrap;
  margin-top: 1px;
}

.talent-wheel__pointer {
  position: absolute;
  top: -14px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 14px;
  color: var(--c-gold);
  text-shadow: 0 0 6px rgba(212, 175, 85, 0.5);
  z-index: 2;
}

.talent-result {
  text-align: center;
  margin-top: var(--s-lg);
  padding: var(--s-md);
  background: rgba(255,255,255,0.02);
  border-radius: var(--r-md);
  border: 1px solid var(--c-border-dim);
}

.talent-result__name {
  font-size: var(--fs-lg);
  font-weight: 700;
  margin-bottom: 4px;
}

.talent-result__desc {
  font-size: var(--fs-sm);
}

.talent-btn {
  width: 100%;
  margin-top: var(--s-md);
}

.new-game__confirm {
  width: 100%;
  padding: 14px;
  font-size: var(--fs-lg);
  letter-spacing: 0.15em;
}
</style>
