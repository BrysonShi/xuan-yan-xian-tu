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

      <!-- 天赋觉醒（SVG转盘） -->
      <div class="form-section anim-fade-up talent-section" v-if="showWheel" :class="{ 'talent-section--revealed': talentRevealed }">
        <label class="form-label">先天灵根</label>
        <div class="awakening-narration text-dim" v-if="!talentRevealed && !isSpinning">
          石碑上的光芒缓缓亮起，似乎在感应你的灵根……
        </div>
        <div class="talent-wheel" :class="{ 'talent-wheel--spinning': isSpinning, 'talent-wheel--revealed': talentRevealed }">
          <div class="talent-wheel__glow" v-if="isSpinning || talentRevealed"></div>
          <svg class="talent-wheel__svg" :style="wheelStyle" viewBox="-90 -90 180 180">
            <g
              v-for="(t, i) in talentPool"
              :key="i"
              :transform="`rotate(${(360 / talentPool.length) * i})`"
            >
              <path :d="slicePath" :fill="sliceColors[i]" stroke="rgba(212,175,85,0.3)" stroke-width="0.5" />
              <text
                :transform="`rotate(${180 / talentPool.length}) translate(0, -50)`"
                text-anchor="middle"
                dominant-baseline="central"
                class="talent-wheel__label"
              >
                <tspan x="0" dy="-6" font-size="16">{{ t.emoji }}</tspan>
                <tspan x="0" dy="14" font-size="7" fill="rgba(255,255,255,0.85)">{{ t.name }}</tspan>
              </text>
            </g>
            <!-- 中心圆 -->
            <circle cx="0" cy="0" r="18" fill="rgba(15,12,8,0.9)" stroke="rgba(212,175,85,0.4)" stroke-width="1" />
            <text x="0" y="0" text-anchor="middle" dominant-baseline="central" fill="rgba(212,175,85,0.8)" font-size="7">灵根</text>
          </svg>
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
            <p class="talent-result__bonus text-dim" v-if="selectedTalent.bonusText">{{ selectedTalent.bonusText }}</p>
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
import { SPIRIT_ROOT_DATA } from '../models/player.js';

const router = useRouter();
const playerStore = usePlayerStore();

const playerName = ref('');
const isSpinning = ref(false);
const selectedTalent = ref(null);
const spinDeg = ref(0);
const showWheel = ref(false);
const talentRevealed = ref(false);

const talentPool = [
  { name: '天灵根', emoji: '🌟', rarity: 'legendary', desc: '五行灵根纯净，修炼速度极快', mult: 3.0, bonusText: '属性：悟性+5 神识+5', flavor: '万中无一的绝世之才，修仙界为之侧目' },
  { name: '地灵根', emoji: '💎', rarity: 'epic', desc: '灵根品质上乘，天赋异禀', mult: 2.0, bonusText: '属性：根骨+4 神识+3', flavor: '根基深厚，假以时日必成大器' },
  { name: '变异灵根', emoji: '⚡', rarity: 'epic', desc: '罕见变异灵根，潜力无穷', mult: 2.5, bonusText: '属性：气运+8 悟性+2', flavor: '异象突现，天机难测，前路未可知' },
  { name: '真灵根', emoji: '🔥', rarity: 'rare', desc: '标准灵根，资质尚可', mult: 1.2, bonusText: '属性：悟性+2 根骨+2', flavor: '中规中矩，胜在勤勉可补不足' },
  { name: '伪灵根', emoji: '🌫', rarity: 'common', desc: '灵根驳杂，修炼缓慢', mult: 0.7, bonusText: '属性：气运+5', flavor: '资质平平，却有一线机缘暗藏其中' },
  { name: '废品灵根', emoji: '💀', rarity: 'cursed', desc: '废材灵根，仙途艰难', mult: 0.3, bonusText: '属性：气运+10（？！）', flavor: '众人皆叹可惜，殊不知命运另有安排……' },
];

// SVG 转盘：扇形路径（60度一片，半径75）
const slicePath = computed(() => {
  const r = 75;
  const angle = 360 / talentPool.length; // 60度
  const rad = (angle * Math.PI) / 180;
  const x = r * Math.sin(rad);
  const y = -r * Math.cos(rad);
  return `M 0,0 L 0,${-r} A ${r},${r} 0 0,1 ${x.toFixed(2)},${y.toFixed(2)} Z`;
});

// 每片颜色（对应灵根品质）
const sliceColors = [
  'rgba(255,215,0,0.25)',   // 天灵根-金
  'rgba(168,85,247,0.25)',  // 地灵根-紫
  'rgba(139,92,246,0.25)',  // 变异灵根-深紫
  'rgba(239,68,68,0.2)',    // 真灵根-红
  'rgba(107,114,128,0.2)',  // 伪灵根-灰
  'rgba(75,85,99,0.25)',    // 废品灵根-暗灰
];

function startAwakening() {
  showWheel.value = true;
}

function proceedToTalent() {}

const wheelStyle = computed(() => ({
  transform: `rotate(${spinDeg.value}deg)`,
  transition: isSpinning.value ? 'transform 2.5s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none',
}));

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
      const rootData = SPIRIT_ROOT_DATA[selectedTalent.value.name];
      player.spiritRoot = {
        typeName: selectedTalent.value.name,  // 灵根名称（用于剧情分支）
        type: ['金', '木', '水', '火', '土'],
        quality: selectedTalent.value.rarity === 'legendary' ? 5
          : selectedTalent.value.rarity === 'epic' ? 4
          : selectedTalent.value.rarity === 'rare' ? 3
          : selectedTalent.value.rarity === 'cursed' ? 1
          : 2,
        multiplier: selectedTalent.value.mult,
      };

      // 灵根属性加成（闭环：灵根影响属性）
      if (rootData?.attrBonus) {
        Object.entries(rootData.attrBonus).forEach(([attr, val]) => {
          if (player.attributes[attr] !== undefined) {
            player.attributes[attr] += val;
          }
        });
      }

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
  width: 200px;
  height: 200px;
  margin: var(--s-lg) auto;
}

.talent-wheel__glow {
  position: absolute;
  inset: -16px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(212, 175, 85, 0.2) 0%, transparent 70%);
  animation: glow-pulse 1.5s ease-in-out infinite;
  pointer-events: none;
}

@keyframes glow-pulse {
  0%, 100% { opacity: 0.5; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.1); }
}

.talent-wheel__svg {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  filter: drop-shadow(0 0 8px rgba(212,175,85,0.15));
}

.talent-wheel--spinning .talent-wheel__svg {
  filter: drop-shadow(0 0 20px rgba(212,175,85,0.4));
}

.talent-wheel--revealed .talent-wheel__svg {
  filter: drop-shadow(0 0 12px rgba(212,175,85,0.25));
}

.talent-wheel__label {
  pointer-events: none;
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

.talent-result__bonus {
  font-size: var(--fs-xs);
  margin-top: 6px;
  color: var(--c-gold);
  font-weight: 600;
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
