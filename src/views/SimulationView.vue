<template>
  <div class="simulation-view scene-simulation">
    <!-- 模拟信息头 -->
    <div class="sim-header" :class="{ 'dataflow-border': true }">
      <div class="sim-header__info">
        <span class="sim-header__year font-num">第 {{ currentYear }} 年</span>
        <span class="sim-header__sep">|</span>
        <span class="sim-header__cost text-dim font-num">天机点 {{ destinyCost }}</span>
      </div>
      <button class="sim-header__pause btn btn--ghost" @click="handlePause">
        {{ isPaused ? '▶ 继续' : '⏸ 暂停' }}
      </button>
    </div>

    <!-- 模拟状态栏 -->
    <StatusBar
      :playerName="playerName"
      :realm="realmName"
      :cultivation="cultivation"
      :maxCultivation="maxCultivation"
      :spiritStones="spiritStones"
      :destinyPoints="destinyPoints"
      :isSimulation="true"
    />

    <!-- 中部事件展示 -->
    <div class="sim-content game-scroll" ref="scrollRef" @click="skipText">
      <!-- 事件日志 -->
      <div class="sim-content__log">
        <div
          v-for="(log, i) in eventHistory"
          :key="i"
          class="sim-content__log-item"
          :class="{ 'sim-content__log-item--death': log.isDeath }"
        >
          <span class="sim-content__log-year font-num">[{{ log.year }}年]</span>
          <span>{{ log.text }}</span>
        </div>
      </div>

      <!-- 当前事件 -->
      <div v-if="currentEvent" class="sim-content__current anim-fade-up">
        <div class="sim-content__event-text sim-tremble">
          <TextDisplay
            ref="textRef"
            :text="currentEvent.description || ''"
            :highlights="highlightWords"
            @complete="onTextComplete"
          />
        </div>
      </div>

      <!-- 无事件时的静修提示 -->
      <div v-else-if="!showChoices" class="sim-content__idle">
        <p class="text-dim">岁月静好，修炼平稳推进中……</p>
      </div>
    </div>

    <!-- 底部选项区 -->
    <div class="sim-choices" v-if="showChoices">
      <ChoicePanel
        :options="visibleOptions"
        :isSimulation="true"
        @select="handleChoice"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { usePlayerStore } from '../stores/playerStore.js';
import { useSimStore } from '../stores/simStore.js';
import { storyGraph, endingChoices } from '../data/storyGraph.js';
import { REALM_TABLE } from '../models/player.js';
import StatusBar from '../components/StatusBar.vue';
import TextDisplay from '../components/TextDisplay.vue';
import ChoicePanel from '../components/ChoicePanel.vue';

const router = useRouter();
const playerStore = usePlayerStore();
const simStore = useSimStore();

const textRef = ref(null);
const scrollRef = ref(null);
const isPaused = ref(false);
const showChoices = ref(false);

// ─── 场景相关 ───
const storyText = ref('');
const currentNpc = ref(null);
const highlightWords = ref([]);
const currentOptions = ref([]);
const pendingChoices = ref([]);
const currentSceneId = ref('');

// ─── 模拟状态 ───
const currentYear = ref(16);
const destinyCost = ref(10);
const currentEvent = ref(null);
const visibleOptions = ref([]);
const eventHistory = ref([]);
const simEventLog = ref([]);  // 供 storyGraph onEnter 使用的日志

// 最大模拟年数（寿终限制）
const MAX_SIM_YEARS = 80;

// ─── 计算属性（使用模拟中的临时玩家状态）───
const playerName = computed(() => simStore.simPlayerState?.name || playerStore.playerData?.name || '无名散修');
const realmName = computed(() => simStore.simPlayerState?.realm || '炼气一层');
const cultivation = computed(() => simStore.simPlayerState?.cultivation || 0);
const maxCultivation = computed(() => simStore.simPlayerState?.maxCultivation || 100);
const spiritStones = computed(() => simStore.simPlayerState?.resources?.spiritStones || 0);
const destinyPoints = computed(() => simStore.simPlayerState?.resources?.destinyPoints || 0);

// ─── 模拟上下文中的 applyEffect ───
function simApplyEffect(effects) {
  const msgs = simStore.applySimEffect(effects);
  msgs.forEach(m => simEventLog.value.push(`【${m}】`));
}

// ─── 模拟上下文对象 ───
function getSimContext() {
  return {
    applyEffect: simApplyEffect,
    eventLog: simEventLog.value,
  };
}

// ─── 场景加载 ───
function loadScene(sceneId) {
  const scene = storyGraph[sceneId];
  if (!scene) {
    console.error('[Simulation] Scene not found:', sceneId);
    // 场景不存在，结束模拟
    handleDeath('命运轨迹断裂，元神消散……');
    return;
  }
  currentSceneId.value = sceneId;
  storyText.value = scene.text;
  highlightWords.value = scene.highlights || [];
  showChoices.value = false;
  currentEvent.value = { description: scene.text };

  // 清空场景日志
  simEventLog.value = [];

  // 应用进入场景效果
  if (scene.onEnter) {
    scene.onEnter(getSimContext());
  }

  // 记录场景事件
  const sceneLabel = scene.npc ? `${scene.npc.name}：${scene.text.substring(0, 30)}…` : scene.text.substring(0, 50) + '…';
  simStore.recordEvent(currentYear.value, sceneLabel);

  // 将 simEventLog 中的消息也记录到历史
  simEventLog.value.forEach(msg => {
    simStore.recordEvent(currentYear.value, msg);
  });

  // 记录到前端展示
  eventHistory.value.push({
    year: currentYear.value,
    text: scene.text.substring(0, 60) + (scene.text.length > 60 ? '…' : ''),
  });

  // 检查是否是死亡场景
  if (scene.isDeath) {
    const deathText = scene.deathText || '你陨落于命运推演之中……';
    setTimeout(() => {
      handleDeath(deathText);
    }, 1500);
    return;
  }

  // 存储选项
  pendingChoices.value = scene.choices || [];

  scrollToBottom();
}

// ─── 选项处理 ───
function handleChoice(opt) {
  showChoices.value = false;
  currentOptions.value = [];

  // 记录选择
  eventHistory.value.push({
    year: currentYear.value,
    text: `【选择】${opt.text}`,
  });
  simStore.recordEvent(currentYear.value, `【选择】${opt.text}`);

  // 推进年数（每个选择推进1-3年）
  const yearsAdvance = Math.floor(Math.random() * 3) + 1;
  currentYear.value += yearsAdvance;
  simStore.simYears += yearsAdvance;
  destinyCost.value += yearsAdvance * 2;

  // 更新模拟中的年龄
  if (simStore.simPlayerState) {
    simStore.simPlayerState.age = (simStore.startAge || 16) + (currentYear.value - 16);
  }

  // 检查寿终
  if (currentYear.value - 16 >= MAX_SIM_YEARS) {
    setTimeout(() => {
      handleDeath('寿元耗尽，坐化于天地之间');
    }, 1000);
    return;
  }

  // 跳转到下一个场景
  if (opt.next) {
    setTimeout(() => {
      loadScene(opt.next);
    }, 400);
  } else {
    // 没有下一个场景，继续静修
    currentEvent.value = null;
    setTimeout(() => {
      advanceIdle();
    }, 1000);
  }
}

// ─── 静修推进 ───
function advanceIdle() {
  if (isPaused.value) return;

  // 静修一年
  currentYear.value += 1;
  simStore.simYears += 1;
  destinyCost.value += 2;

  // 更新年龄
  if (simStore.simPlayerState) {
    simStore.simPlayerState.age = (simStore.startAge || 16) + (currentYear.value - 16);
  }

  // 少量修为增长
  simApplyEffect({ cultivation: Math.floor(Math.random() * 100) + 50 });

  eventHistory.value.push({
    year: currentYear.value,
    text: '平静的一年过去了，修为略有精进。',
  });
  simStore.recordEvent(currentYear.value, '平静修炼');

  // 检查寿终
  if (currentYear.value - 16 >= MAX_SIM_YEARS) {
    handleDeath('寿元耗尽，坐化于天地之间');
    return;
  }

  // 40%概率触发场景事件
  if (Math.random() < 0.4 && simStore.saveSnapshot) {
    const startScene = simStore.saveSnapshot.sceneId;
    // 从起始场景的几个选项分支中随机选一个
    const startSceneData = storyGraph[startScene];
    if (startSceneData && startSceneData.choices && startSceneData.choices.length > 0) {
      const randChoice = startSceneData.choices[Math.floor(Math.random() * startSceneData.choices.length)];
      if (randChoice.next) {
        loadScene(randChoice.next);
        return;
      }
    }
  }

  scrollToBottom();

  // 继续自动推进
  setTimeout(() => {
    if (!isPaused.value) advanceIdle();
  }, 1500);
}

// ─── 死亡处理 ───
function handleDeath(cause) {
  eventHistory.value.push({
    year: currentYear.value,
    text: cause,
    isDeath: true,
  });
  simStore.recordEvent(currentYear.value, cause, true);
  simStore.endSimulation(cause);

  setTimeout(() => {
    router.push('/settlement');
  }, 2000);
}

// ─── 暂停/继续 ───
function handlePause() {
  isPaused.value = !isPaused.value;
  if (!isPaused.value && !currentEvent.value && !showChoices.value) {
    advanceIdle();
  }
}

// ─── 文字播放完成 ───
function onTextComplete() {
  if (pendingChoices.value.length > 0) {
    currentOptions.value = pendingChoices.value;
    visibleOptions.value = pendingChoices.value;
    setTimeout(() => { showChoices.value = true; }, 200);
  } else {
    showChoices.value = false;
  }
}

function skipText() {
  textRef.value?.finishTyping();
}

function scrollToBottom() {
  nextTick(() => {
    const el = scrollRef.value;
    if (el) el.scrollTop = el.scrollHeight;
  });
}

// ─── 初始化 ───
onMounted(() => {
  if (!simStore.isSimulating || !simStore.saveSnapshot) {
    // 没有进行中的模拟，返回现实
    router.push('/reality');
    return;
  }

  // 设置初始年份
  currentYear.value = (simStore.simPlayerState?.age || 16);
  simStore.simYears = 0;

  // 加载存档点的场景
  const startSceneId = simStore.saveSnapshot.sceneId || 'start';
  eventHistory.value.push({
    year: currentYear.value,
    text: '命运之轮转动，你踏入了另一段人生……',
  });

  setTimeout(() => {
    loadScene(startSceneId);
  }, 800);
});
</script>


<style scoped>
.simulation-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, var(--sim-bg), var(--sim-bg-light));
  position: relative;
}

/* 模拟信息头 */
.sim-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  padding-top: calc(10px + var(--safe-top));
  background: rgba(10, 10, 26, 0.95);
  border-bottom: 1px solid rgba(140, 100, 230, 0.2);
  position: relative;
  z-index: 10;
}

.sim-header__info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sim-header__year {
  font-size: var(--fs-lg);
  font-weight: 700;
  color: var(--sim-glow);
}

.sim-header__sep {
  color: rgba(140, 100, 230, 0.3);
}

.sim-header__cost {
  font-size: var(--fs-sm);
}

.sim-header__pause {
  font-size: var(--fs-sm);
  padding: 6px 14px;
  border-color: rgba(140, 100, 230, 0.3);
  color: var(--sim-text);
}

.sim-header__pause:hover {
  border-color: var(--sim-border);
}

/* 内容区 */
.sim-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--s-lg);
  position: relative;
}

/* 事件日志 */
.sim-content__log {
  margin-bottom: var(--s-lg);
}

.sim-content__log-item {
  font-size: var(--fs-sm);
  line-height: 1.7;
  padding: 6px 0;
  color: var(--sim-text);
  opacity: 0.7;
  border-bottom: 1px solid rgba(140, 100, 230, 0.08);
}

.sim-content__log-item--death {
  color: var(--c-danger);
  opacity: 1;
  font-weight: 600;
  border-color: rgba(224, 85, 85, 0.2);
}

.sim-content__log-year {
  color: var(--sim-glow);
  opacity: 0.6;
  margin-right: 6px;
  font-size: var(--fs-xs);
}

/* 当前事件 */
.sim-content__current {
  background: rgba(140, 100, 230, 0.04);
  border: 1px solid rgba(140, 100, 230, 0.15);
  border-radius: var(--r-md);
  padding: var(--s-lg);
  margin-top: var(--s-md);
}

.sim-content__event-text {
  color: var(--sim-text);
  font-size: var(--fs-base);
  line-height: 1.9;
}

/* 静修提示 */
.sim-content__idle {
  text-align: center;
  padding: var(--s-3xl) var(--s-lg);
  font-size: var(--fs-sm);
}

/* 选项区 */
.sim-choices {
  padding: var(--s-md) var(--s-lg);
  padding-bottom: calc(var(--s-md) + var(--safe-bottom));
  border-top: 1px solid rgba(140, 100, 230, 0.15);
  background: linear-gradient(0deg, var(--sim-bg), rgba(10, 10, 26, 0.9));
}
</style>
