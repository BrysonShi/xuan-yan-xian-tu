<template>
  <div class="new-game">
    <div class="new-game__header">
      <button class="btn btn--ghost new-game__back" @click="$router.push('/main-menu')">
        ← 返回
      </button>
      <h2 class="font-title new-game__title">踏入仙途</h2>
    </div>

    <div class="new-game__body game-scroll">
      <!-- 开场叙述 -->
      <div class="awakening-intro anim-fade-up" v-if="!showWheel">
        <p class="awakening-intro__text">
          青云宗每五年开山门一次，广纳天下有志修仙之人。<br/><br/>
          你怀揣着村中老者凑钱买来的推荐帖，跋山涉水来到青云山脚。<br/><br/>
          山门前，一块巨大的测灵石碑静静矗立，碑面泛着幽微的光芒——它将测定你的灵根资质，决定你能否踏入仙途。<br/><br/>
          <span class="text-dim">你深吸一口气，走上前去……</span>
        </p>
        <button class="btn btn--primary awakening-btn" @click="startAwakening">
          ✦ 将双手按上石碑
        </button>
      </div>

      <!-- 道号输入 -->
      <div class="form-section anim-fade-up" v-if="showWheel">
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

      <!-- 天赋觉醒（简易转盘） -->
      <div class="form-section anim-fade-up talent-section" v-if="showWheel" :class="{ 'talent-section--revealed': talentRevealed }">
        <label class="form-label">先天灵根</label>
        <div class="awakening-narration text-dim" v-if="!talentRevealed && !isSpinning">
          石碑上的光芒缓缓亮起，似乎在感应你的灵根……
        </div>
        <div class="talent-wheel" :class="{ 'talent-wheel--spinning': isSpinning, 'talent-wheel--revealed': talentRevealed }">
          <div class="talent-wheel__glow" v-if="isSpinning || talentRevealed"></div>
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
          <div class="talent-wheel__pointer">▼</div>
        </div>
        <!-- 灵根结果展示 -->
        <transition name="reveal">
          <div class="talent-result" v-if="selectedTalent" :class="`talent-result--${selectedTalent.rarity}`">
            <div class="talent-result__emoji">{{ selectedTalent.emoji }}</div>
            <p class="talent-result__name" :class="`rarity-${selectedTalent.rarity}`">
              {{ selectedTalent.name }}
            </p>
            <p class="talent-result__desc">{{ selectedTalent.desc }}</p>
            <p class="talent-result__flavor text-dim">{{ selectedTalent.flavor }}</p>
          </div>
        </transition>
        <button
          class="btn btn--ghost talent-btn"
          :disabled="isSpinning || talentRevealed"
          @click="rollTalent"
          v-if="!talentRevealed"
        >
          {{ isSpinning ? '石碑光芒涌动中…' : '闭目感应灵根' }}
        </button>
      </div>

      <!-- 确认按钮 -->
      <div class="form-section anim-fade-up" style="animation-delay: 0.3s;" v-if="showWheel">
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
const showWheel = ref(false);
const talentRevealed = ref(false);

const talentPool = [
  { name: '天灵根', emoji: '🌟', rarity: 'legendary', desc: '五行灵根纯净，修炼速度极快', mult: 3.0, flavor: '万中无一的绝世之才，修仙界为之侧目' },
  { name: '地灵根', emoji: '💎', rarity: 'epic', desc: '灵根品质上乘，天赋异禀', mult: 2.0, flavor: '根基深厚，假以时日必成大器' },
  { name: '变异灵根', emoji: '⚡', rarity: 'epic', desc: '罕见变异灵根，潜力无穷', mult: 2.5, flavor: '异象突现，天机难测，前路未可知' },
  { name: '真灵根', emoji: '🔥', rarity: 'rare', desc: '标准灵根，资质尚可', mult: 1.2, flavor: '中规中矩，胜在勤勉可补不足' },
  { name: '伪灵根', emoji: '🌫', rarity: 'common', desc: '灵根驳杂，修炼缓慢', mult: 0.7, flavor: '资质平平，却有一线机缘暗藏其中' },
  { name: '废品灵根', emoji: '💀', rarity: 'cursed', desc: '废材灵根，仙途艰难', mult: 0.3, flavor: '众人皆叹可惜，殊不知命运另有安排……' },
];

function startAwakening() {
  showWheel.value = true;
}

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
    // 延迟显示结果，增加仪式感
    setTimeout(() => {
      talentRevealed.value = true;
    }, 400);
  }, 2600);
}

const canCreate = computed(() => playerName.value.trim().length > 0);

function handleCreate() {
  if (!canCreate.value) return;
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

    saveSystem.save(0, player);
    router.push('/reality');
  } catch (err) {
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

/* ─── 开场觉醒叙述 ─── */
.awakening-intro {
  text-align: center;
  padding: var(--s-2xl) var(--s-lg);
  max-width: 480px;
  margin: 0 auto;
}

.awakening-intro__text {
  font-size: var(--fs-base);
  line-height: 2;
  color: var(--c-text);
  margin-bottom: var(--s-2xl);
  letter-spacing: 0.05em;
}

.awakening-btn {
  padding: 14px 32px;
  font-size: var(--fs-lg);
  letter-spacing: 0.2em;
  animation: pulse-gold 2s ease-in-out infinite;
}

@keyframes pulse-gold {
  0%, 100% { box-shadow: 0 0 0 0 rgba(212, 175, 85, 0.3); }
  50% { box-shadow: 0 0 20px 4px rgba(212, 175, 85, 0.15); }
}

/* ─── 表单通用 ─── */
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

/* ─── 天赋觉醒区 ─── */
.talent-section {
  text-align: center;
}

.awakening-narration {
  font-size: var(--fs-sm);
  margin-bottom: var(--s-md);
  opacity: 0.7;
  font-style: italic;
}

/* 天赋转盘 */
.talent-wheel {
  position: relative;
  width: 160px;
  height: 160px;
  margin: var(--s-lg) auto;
}

.talent-wheel__glow {
  position: absolute;
  inset: -12px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(212, 175, 85, 0.15) 0%, transparent 70%);
  animation: glow-pulse 1.5s ease-in-out infinite;
  pointer-events: none;
}

@keyframes glow-pulse {
  0%, 100% { opacity: 0.5; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.08); }
}

.talent-wheel__inner {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 2px solid var(--c-border-dim);
  position: relative;
  background: radial-gradient(circle, var(--c-bg-light), var(--c-bg));
  transition: border-color 0.3s, box-shadow 0.3s;
}

.talent-wheel--spinning .talent-wheel__inner {
  border-color: var(--c-gold);
  box-shadow: 0 0 30px rgba(212, 175, 85, 0.3), inset 0 0 20px rgba(212, 175, 85, 0.05);
}

.talent-wheel--revealed .talent-wheel__inner {
  border-color: var(--c-gold);
  box-shadow: 0 0 15px rgba(212, 175, 85, 0.15);
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
  bottom: -18px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 14px;
  color: var(--c-gold);
  text-shadow: 0 0 6px rgba(212, 175, 85, 0.5);
  z-index: 2;
}

/* ─── 灵根结果展示 ─── */
.talent-result {
  text-align: center;
  margin-top: var(--s-lg);
  padding: var(--s-lg);
  background: rgba(255,255,255,0.02);
  border-radius: var(--r-lg);
  border: 1px solid var(--c-border-dim);
}

.talent-result__emoji {
  font-size: 36px;
  margin-bottom: var(--s-sm);
  animation: emoji-float 2s ease-in-out infinite;
}

@keyframes emoji-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}

.talent-result--legendary {
  border-color: rgba(255, 215, 0, 0.4);
  background: rgba(255, 215, 0, 0.05);
  box-shadow: 0 0 20px rgba(255, 215, 0, 0.1);
}

.talent-result--epic {
  border-color: rgba(168, 85, 247, 0.4);
  background: rgba(168, 85, 247, 0.05);
  box-shadow: 0 0 15px rgba(168, 85, 247, 0.08);
}

.talent-result--rare {
  border-color: rgba(59, 130, 246, 0.3);
  background: rgba(59, 130, 246, 0.04);
}

.talent-result--common {
  border-color: var(--c-border-dim);
}

.talent-result--cursed {
  border-color: rgba(224, 85, 85, 0.3);
  background: rgba(224, 85, 85, 0.03);
}

.talent-result__name {
  font-size: var(--fs-xl);
  font-weight: 700;
  margin-bottom: 6px;
}

.talent-result__desc {
  font-size: var(--fs-sm);
  line-height: 1.6;
}

.talent-result__flavor {
  font-size: var(--fs-xs);
  margin-top: 8px;
  font-style: italic;
  line-height: 1.5;
}

/* 品质颜色 */
.rarity-legendary { color: #ffd700; }
.rarity-epic { color: #a855f7; }
.rarity-rare { color: #3b82f6; }
.rarity-common { color: var(--c-text); }
.rarity-cursed { color: #ef4444; }

/* 结果揭示动画 */
.reveal-enter-active {
  animation: reveal-in 0.6s ease-out;
}

@keyframes reveal-in {
  0% { opacity: 0; transform: translateY(12px) scale(0.95); }
  60% { opacity: 1; transform: translateY(-2px) scale(1.02); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
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
