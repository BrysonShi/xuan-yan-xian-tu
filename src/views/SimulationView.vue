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
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { usePlayerStore } from '../stores/playerStore.js';
import StatusBar from '../components/StatusBar.vue';
import TextDisplay from '../components/TextDisplay.vue';
import ChoicePanel from '../components/ChoicePanel.vue';

const router = useRouter();
const playerStore = usePlayerStore();

const textRef = ref(null);
const scrollRef = ref(null);
const isPaused = ref(false);
const showChoices = ref(false);

const currentYear = ref(16);
const destinyCost = ref(10);
const currentEvent = ref(null);
const visibleOptions = ref([]);
const eventHistory = ref([]);
const highlightWords = ref(['灵气', '突破']);

// 模拟引擎相关（简化版）
let simEngine = null;
let advanceTimer = null;

const playerName = computed(() => playerStore.playerData?.name || '无名散修');
const realmName = computed(() => playerStore.realmName || '炼气一层');
const cultivation = computed(() => playerStore.playerData?.cultivation || 0);
const maxCultivation = computed(() => playerStore.playerData?.maxCultivation || 100);
const spiritStones = computed(() => playerStore.playerData?.resources?.spiritStones || 0);
const destinyPoints = computed(() => playerStore.playerData?.resources?.destinyPoints || 0);

function skipText() {
  textRef.value?.finishTyping();
}

function onTextComplete() {
  setTimeout(() => { showChoices.value = true; }, 200);
}

function handleChoice(opt) {
  showChoices.value = false;

  // 记录选择
  eventHistory.value.push({
    year: currentYear.value,
    text: `【选择】${opt.text}`,
  });

  // 模拟处理（简化版）
  setTimeout(() => {
    currentEvent.value = null;
    // 模拟推进一年
    advanceYear();
  }, 400);
}

function advanceYear() {
  currentYear.value++;
  destinyCost.value += 2;

  // 随机决定是否触发事件
  if (Math.random() < 0.4) {
    triggerRandomEvent();
  } else {
    eventHistory.value.push({
      year: currentYear.value,
      text: '平静的一年过去了，修为略有精进。',
    });

    // 模拟死亡检查（简化：100年后）
    if (currentYear.value > 100) {
      handleDeath();
      return;
    }

    // 自动推进
    advanceTimer = setTimeout(() => {
      if (!isPaused.value) advanceYear();
    }, 1500);
  }

  scrollToBottom();
}

function triggerRandomEvent() {
  const events = [
    {
      id: 'EVT-01',
      description: '你在山间修炼时，意外发现了一处隐秘的灵泉。泉水中蕴含精纯灵气，但泉旁似乎有妖兽的气息……',
      options: [
        { id: 'A', text: '冒险取水', description: '可能需要战斗' },
        { id: 'B', text: '远远观察', description: '安全第一' },
        { id: 'C', text: '绕道而行', description: '不值得冒险' },
      ],
    },
    {
      id: 'EVT-02',
      description: '一位神秘老者出现在你面前，他似乎对你很感兴趣。「年轻人，我有一物可助你修行，你可愿意接受考验？」',
      options: [
        { id: 'A', text: '接受考验', description: '机不可失' },
        { id: 'B', text: '婉言拒绝', description: '来历不明，不可轻信' },
      ],
    },
    {
      id: 'EVT-03',
      description: '你在一次打坐中突然进入顿悟状态，灵气在体内疯狂运转。这是一次难得的突破机会！',
      options: [
        { id: 'A', text: '全力冲击', description: '悟性判定' },
        { id: 'B', text: '稳妥推进', description: '缓慢但安全' },
      ],
    },
  ];

  const evt = events[Math.floor(Math.random() * events.length)];
  currentEvent.value = evt;
  visibleOptions.value = evt.options;
}

function handleDeath() {
  eventHistory.value.push({
    year: currentYear.value,
    text: '你的模拟人生走到了尽头。寿元耗尽，元神消散于天地之间……',
    isDeath: true,
  });

  setTimeout(() => {
    router.push('/settlement');
  }, 2000);
}

function handlePause() {
  isPaused.value = !isPaused.value;
  if (!isPaused.value && !currentEvent.value) {
    advanceYear();
  } else if (isPaused.value && advanceTimer) {
    clearTimeout(advanceTimer);
  }
}

function scrollToBottom() {
  nextTick(() => {
    const el = scrollRef.value;
    if (el) el.scrollTop = el.scrollHeight;
  });
}

onMounted(() => {
  // 启动初始事件
  setTimeout(() => {
    triggerRandomEvent();
  }, 800);
});

onBeforeUnmount(() => {
  if (advanceTimer) clearTimeout(advanceTimer);
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
