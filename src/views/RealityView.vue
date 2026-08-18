<template>
  <div class="reality-view scene-reality">
    <!-- 顶部状态栏 -->
    <StatusBar
      :playerName="playerName"
      :realm="realmName"
      :cultivation="cultivation"
      :maxCultivation="maxCultivation"
      :spiritStones="spiritStones"
      :destinyPoints="destinyPoints"
      :isSimulation="false"
    />

    <!-- 中部内容区 -->
    <div class="reality-view__content game-scroll" ref="scrollRef">
      <!-- NPC 对话头部（如果有） -->
      <div v-if="currentNpc" class="reality-view__npc anim-fade-down">
        <div class="reality-view__npc-avatar">
          <span>{{ currentNpc.emoji || '👤' }}</span>
        </div>
        <div class="reality-view__npc-info">
          <span class="reality-view__npc-name">{{ currentNpc.name }}</span>
          <span class="reality-view__npc-relation text-dim">{{ currentNpc.title || '' }}</span>
        </div>
      </div>

      <!-- 剧情文字展示 -->
      <div class="reality-view__story" @click="skipTyping">
        <TextDisplay
          ref="textRef"
          :text="storyText"
          :highlights="highlightWords"
          @complete="onTextComplete"
        />
      </div>

      <!-- 日志（最近事件记录） -->
      <div v-if="eventLog.length" class="reality-view__log">
        <div
          v-for="(log, i) in eventLog"
          :key="i"
          class="reality-view__log-item text-dim"
        >
          {{ log }}
        </div>
      </div>
    </div>

    <!-- 底部选项区 -->
    <div class="reality-view__choices" v-if="showChoices">
      <ChoicePanel
        :options="currentOptions"
        :isSimulation="false"
        @select="handleChoice"
      />
    </div>

    <!-- 底部操作栏 -->
    <div class="reality-view__nav" v-if="!showChoices">
      <button class="nav-btn" @click="$router.push('/character')">
        <span class="nav-btn__icon">👤</span>
        <span class="nav-btn__label">角色</span>
      </button>
      <button class="nav-btn" @click="$router.push('/achievements')">
        <span class="nav-btn__icon">🏆</span>
        <span class="nav-btn__label">成就</span>
      </button>
      <button class="nav-btn nav-btn--primary" @click="startSimulation" :disabled="!simUnlocked || !isInSafeZone">
        <span class="nav-btn__icon">{{ !simUnlocked ? '🔒' : (!isInSafeZone ? '⚠️' : '🔮') }}</span>
        <span class="nav-btn__label">{{ !simUnlocked ? '未解锁' : (!isInSafeZone ? '需安全区' : '命运模拟') }}</span>
      </button>
      <button class="nav-btn" @click="menuVisible = true">
        <span class="nav-btn__icon">☰</span>
        <span class="nav-btn__label">更多</span>
      </button>
    </div>

    <!-- 菜单弹窗 -->
    <Modal v-model:visible="menuVisible" title="菜单" size="sm">
      <div class="menu-list">
        <button class="menu-list__item" @click="goAchievements">🏆 成就系统</button>
        <button class="menu-list__item" @click="goSettings">⚙️ 设置</button>
        <button class="menu-list__item" @click="goSave">💾 保存进度</button>
        <button class="menu-list__item" @click="goInventory">🎒 背包物品</button>
        <button class="menu-list__item" @click="goMemory">🌊 记忆之海</button>
        <button class="menu-list__item text-danger" @click="goMainMenu">🚪 返回主菜单</button>
      </div>
    </Modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { usePlayerStore } from '../stores/playerStore.js';
import { useSimStore } from '../stores/simStore.js';
import { REALM_TABLE } from '../models/player.js';
import { audioManager } from '../utils/audioManager.js';
import { storyGraph, endingChoices } from '../data/storyGraph.js';
import StatusBar from '../components/StatusBar.vue';
import TextDisplay from '../components/TextDisplay.vue';
import ChoicePanel from '../components/ChoicePanel.vue';
import Modal from '../components/Modal.vue';

const router = useRouter();
const playerStore = usePlayerStore();
const simStore = useSimStore();

const textRef = ref(null);
const scrollRef = ref(null);
const menuVisible = ref(false);
const showChoices = ref(false);
const eventLog = ref([]);

// ─── 场景图驱动的剧情系统 ───
const storyText = ref('');
const currentNpc = ref(null);
const highlightWords = ref([]);
const currentOptions = ref([]);
const pendingChoices = ref([]);
const currentSceneId = ref('');

// ─── 修为变化效果函数 ───
function applyEffect(effects) {
  if (!effects) return;
  const msgs = [];
  playerStore.batchUpdate(player => {
    if (effects.cultivation) {
      player.cultivation += effects.cultivation;
      msgs.push(`修为 +${effects.cultivation}`);
    }
    if (effects.spiritStones) {
      player.resources.spiritStones += effects.spiritStones;
      msgs.push(`灵石 +${effects.spiritStones}`);
    }
    if (effects.destinyPoints) {
      player.resources.destinyPoints += effects.destinyPoints;
      msgs.push(`天机点 +${effects.destinyPoints}`);
    }
    if (effects.merit) {
      player.resources.merit += effects.merit;
      msgs.push(`功德 +${effects.merit}`);
    }
    if (effects.reputation) {
      player.resources.reputation += effects.reputation;
      msgs.push(`声望 +${effects.reputation}`);
    }
    // 检查突破
    while (player.cultivation >= player.maxCultivation) {
      player.cultivation -= player.maxCultivation;
      player.realmLevel++;
      const nextRealm = REALM_TABLE[player.realmLevel];
      if (nextRealm) {
        player.realm = nextRealm.name;
        player.maxCultivation = nextRealm.maxCultivation;
        msgs.push(`突破至${nextRealm.name}！`);
        // 播放突破音效
        try { audioManager.playBreakthrough(); } catch {}
      } else {
        player.cultivation = player.maxCultivation;
        break;
      }
    }
  });
  msgs.forEach(m => eventLog.value.push(`【${m}】`));
}

// ─── 场景加载函数 ───
function loadScene(sceneId) {
  const scene = storyGraph[sceneId];
  if (!scene) {
    console.error('Scene not found:', sceneId);
    return;
  }
  currentSceneId.value = sceneId;
  // 支持动态文案：text 可以是字符串或函数
  if (typeof scene.text === 'function') {
    const realm = playerStore.playerData?.realm || '炼气一层';
    const stones = playerStore.playerData?.resources?.spiritStones || 0;
    storyText.value = scene.text(realm, stones);
  } else {
    storyText.value = scene.text;
  }
  currentNpc.value = scene.npc || null;
  highlightWords.value = scene.highlights || [];
  showChoices.value = false;

  // 播放场景切换音效
  try { audioManager.playTransition(); } catch {}

  // 应用进入场景时的效果（传入上下文）
  if (scene.onEnter) {
    scene.onEnter({
      applyEffect,
      eventLog: eventLog.value,
      unlockSim: () => {
        if (playerStore.playerData) {
          playerStore.batchUpdate(p => { p.flags.sim_unlocked = true; });
          eventLog.value.push('【命运模拟器已解锁！底部导航栏可进入模拟】');
        }
      },
    });
  }

  // 存储选项，等文字播放完再显示
  pendingChoices.value = scene.choices || [];

  // 滚动到顶部
  nextTick(() => {
    if (scrollRef.value) {
      scrollRef.value.scrollTop = 0;
    }
  });
}

// ─── 选项处理 ───
function handleChoice(opt) {
  showChoices.value = false;
  currentOptions.value = [];
  eventLog.value.push(`你选择了：${opt.text}`);

  // 命运模拟特殊处理
  if (opt.action === 'simulation') {
    router.push('/simulation');
    return;
  }

  // 跳转到下一个场景
  if (opt.next) {
    setTimeout(() => {
      loadScene(opt.next);
    }, 300);
  }
}

// ─── 文字播放完毕回调 ───
function onTextComplete() {
  if (pendingChoices.value.length > 0) {
    currentOptions.value = pendingChoices.value;
    setTimeout(() => { showChoices.value = true; }, 300);
  } else {
    showChoices.value = false;
  }
}

// ─── 计算属性 ───
const playerName = computed(() => playerStore.playerData?.name || '无名散修');
const realmName = computed(() => playerStore.realmName || '炼气一层');
const cultivation = computed(() => playerStore.playerData?.cultivation || 0);
const maxCultivation = computed(() => playerStore.playerData?.maxCultivation || 100);
const spiritStones = computed(() => playerStore.playerData?.resources?.spiritStones || 0);
const destinyPoints = computed(() => playerStore.playerData?.resources?.destinyPoints || 0);
const simUnlocked = computed(() => playerStore.playerData?.flags?.sim_unlocked || false);
const isInSafeZone = computed(() => {
  const scene = storyGraph[currentSceneId.value];
  return scene?.isSafeZone === true;
});

// ─── 交互函数 ───
function skipTyping() {
  textRef.value?.finishTyping();
}

// 根据境界获取模拟消耗灵石数
function getSimCost() {
  const rl = playerStore.playerData?.realmLevel || 0;
  if (rl <= 2) return 8;      // 炼气1-3层
  if (rl <= 5) return 15;     // 炼气4-6层
  if (rl <= 8) return 30;     // 炼气7-9层
  return 60;                  // 筑基+
}

// 根据境界获取每日模拟次数上限
function getDailySimLimit() {
  const rl = playerStore.playerData?.realmLevel || 0;
  if (rl <= 2) return 3;
  if (rl <= 5) return 5;
  if (rl <= 8) return 8;
  return 10;
}

// 检查并增加今日模拟次数
function consumeDailySim() {
  const today = new Date().toISOString().slice(0, 10);
  const flags = playerStore.playerData.flags;
  if (!flags.sim_daily) flags.sim_daily = { date: '', count: 0 };
  if (flags.sim_daily.date !== today) {
    flags.sim_daily.date = today;
    flags.sim_daily.count = 0;
  }
  flags.sim_daily.count++;
}

function getTodaySimCount() {
  const today = new Date().toISOString().slice(0, 10);
  const sd = playerStore.playerData?.flags?.sim_daily;
  if (!sd || sd.date !== today) return 0;
  return sd.count;
}

function startSimulation() {
  if (!simUnlocked.value) {
    eventLog.value.push('【命运模拟器尚未解锁】');
    return;
  }
  // 检查安全区
  const curScene = storyGraph[currentSceneId.value];
  if (!curScene?.isSafeZone) {
    eventLog.value.push('【只能在安全区域启动命运模拟】');
    return;
  }
  // 检查每日次数
  const todayUsed = getTodaySimCount();
  const dailyLimit = getDailySimLimit();
  if (todayUsed >= dailyLimit) {
    eventLog.value.push(`【今日模拟次数已用尽（${todayUsed}/${dailyLimit}），明日再来】`);
    return;
  }
  // 检查灵石
  const cost = getSimCost();
  if (playerStore.playerData.resources.spiritStones < cost) {
    eventLog.value.push(`【灵石不足，启动模拟需要 ${cost} 枚灵石】`);
    return;
  }
  // 扣除灵石并记录次数
  playerStore.modifyResource('spiritStones', -cost);
  consumeDailySim();
  // 存档并跳转
  simStore.startSimulation(currentSceneId.value, playerStore);
  router.push('/simulation');
}

function goSettings() {
  menuVisible.value = false;
  router.push('/settings');
}

function goAchievements() {
  menuVisible.value = false;
  router.push('/achievements');
}

function goSave() {
  menuVisible.value = false;
}

function goInventory() {
  menuVisible.value = false;
}

function goMemory() {
  menuVisible.value = false;
}

function goMainMenu() {
  menuVisible.value = false;
  router.push('/main-menu');
}

// ─── 初始化 ───
onMounted(() => {
  loadScene('start');
});
</script>

<style scoped>
.reality-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, var(--c-bg), var(--c-bg-light));
  position: relative;
}

/* 内容区 */
.reality-view__content {
  flex: 1;
  overflow-y: auto;
  padding: var(--s-xl) var(--s-lg);
  padding-bottom: var(--s-sm);
}

/* NPC 对话头 */
.reality-view__npc {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: var(--s-lg);
  padding-bottom: var(--s-md);
  border-bottom: 1px solid var(--c-border-dim);
}

.reality-view__npc-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(255,255,255,0.05);
  border: 1.5px solid var(--c-border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  flex-shrink: 0;
}

.reality-view__npc-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.reality-view__npc-name {
  font-size: var(--fs-base);
  font-weight: 600;
  color: var(--c-gold-light);
}

.reality-view__npc-relation {
  font-size: var(--fs-xs);
}

/* 剧情文字区 */
.reality-view__story {
  margin-bottom: var(--s-lg);
  cursor: pointer;
  line-height: 1.9;
  font-size: var(--fs-base);
}

/* 日志 */
.reality-view__log {
  margin-top: var(--s-lg);
  padding-top: var(--s-md);
  border-top: 1px solid var(--c-border-dim);
}

.reality-view__log-item {
  font-size: var(--fs-sm);
  line-height: 1.6;
  padding: 4px 0;
  padding-left: 12px;
  border-left: 2px solid var(--c-border-dim);
  margin-bottom: 6px;
}

/* 选项区 */
.reality-view__choices {
  padding: var(--s-md) var(--s-lg);
  padding-bottom: calc(var(--s-md) + var(--safe-bottom));
  border-top: 1px solid var(--c-border-dim);
  background: linear-gradient(0deg, var(--c-bg), rgba(26, 18, 8, 0.85));
}

/* 底部导航栏 */
.reality-view__nav {
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: var(--s-sm) var(--s-lg);
  padding-bottom: calc(var(--s-sm) + var(--safe-bottom));
  border-top: 1px solid var(--c-border-dim);
  background: var(--c-bg);
}

.nav-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 8px 20px;
  min-height: 52px;
  background: none;
  border: none;
  color: var(--c-text-dim);
  font-family: inherit;
  cursor: pointer;
  border-radius: var(--r-md);
  transition: all 0.2s;
}

.nav-btn:active { transform: scale(0.92); }
.nav-btn:hover { color: var(--c-text); }

.nav-btn--primary {
  color: var(--c-gold-light);
  background: rgba(212, 175, 85, 0.08);
  border: 1px solid var(--c-border-dim);
  padding: 10px 20px;
}

.nav-btn--primary:hover {
  background: rgba(212, 175, 85, 0.14);
  border-color: var(--c-border);
}

.nav-btn__icon {
  font-size: 20px;
}

.nav-btn__label {
  font-size: var(--fs-xs);
}

/* 菜单列表 */
.menu-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.menu-list__item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: none;
  border: none;
  border-radius: var(--r-md);
  color: var(--c-text);
  font-family: inherit;
  font-size: var(--fs-base);
  cursor: pointer;
  text-align: left;
  transition: background 0.15s;
}

.menu-list__item:hover {
  background: rgba(255,255,255,0.04);
}
</style>
