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
      <button class="nav-btn nav-btn--primary" @click="startSimulation">
        <span class="nav-btn__icon">🔮</span>
        <span class="nav-btn__label">命运模拟</span>
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
import { REALM_TABLE } from '../models/player.js';
import StatusBar from '../components/StatusBar.vue';
import TextDisplay from '../components/TextDisplay.vue';
import ChoicePanel from '../components/ChoicePanel.vue';
import Modal from '../components/Modal.vue';

const router = useRouter();
const playerStore = usePlayerStore();

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
      } else {
        player.cultivation = player.maxCultivation;
        break;
      }
    }
  });
  msgs.forEach(m => eventLog.value.push(`【${m}】`));
}

// ─── 通用结局选项（结局场景复用） ───
const endingChoices = [
  { id: 'A', text: '继续修炼', desc: '去练功场打磨修为', next: 'training_1' },
  { id: 'B', text: '去后山看看', desc: '听说后山有灵脉', next: 'mountain_1' },
  { id: 'C', text: '启动命运模拟', desc: '消耗10天机点，窥探命运', action: 'simulation' },
];

// ─── 完整场景图 ───
const storyGraph = {
  // ═══ 开场 ═══
  'start': {
    text: '你站在青云宗外门的山道上，远处瀑布飞流直下，灵气缭绕。\n\n晨钟已响三遍，外门弟子们纷纷走向练功场。你今日尚无安排——\n\n一个熟悉的身影从远处走来，正是你的好友陈墨。\n\n「今日可有安排？听说后山新开辟了一处灵脉，不少弟子都去碰碰运气。」',
    npc: { name: '陈墨', emoji: '🧑‍🦱', title: '外门弟子 · 好友' },
    highlights: ['灵脉', '陈墨'],
    choices: [
      { id: 'A', text: '与陈墨同去后山灵脉', desc: '可能遇到奇遇，也可能遇到危险', next: 'mountain_1' },
      { id: 'B', text: '独自去练功场修炼', desc: '稳扎稳打，提升修为', next: 'training_1' },
      { id: 'C', text: '启动命运模拟', desc: '消耗10天机点，窥探命运', action: 'simulation' },
    ],
  },

  // ═══ 后山线 ═══
  'mountain_1': {
    text: '你与陈墨一同走向后山。山路蜿蜒，古木参天，越往深处灵气越浓。\n\n走了约莫半个时辰，你们在一处山涧旁发现了微弱的灵光，从岩缝中透出幽蓝光芒。\n\n陈墨停下脚步，低声道：「这灵光不寻常，像是某种阵法残留……要进去看看吗？」',
    npc: { name: '陈墨', emoji: '🧑‍🦱', title: '外门弟子 · 好友' },
    highlights: ['灵光', '阵法'],
    choices: [
      { id: 'A', text: '深入探查灵光来源', desc: '富贵险中求', next: 'mountain_2a' },
      { id: 'B', text: '谨慎观察，不贸然进入', desc: '先看看周围情况', next: 'mountain_2b' },
    ],
    onEnter: () => applyEffect({ cultivation: 200 }),
  },

  'mountain_2a': {
    text: '你拨开藤蔓，侧身挤入岩缝。通道尽头豁然开朗——竟是一座被遗忘的洞府！\n\n石壁上刻着密密麻麻的符文，隐约可辨是一套功法口诀。洞府角落还有几块散发着灵光的灵石。\n\n陈墨惊叹：「这是……前辈洞府！石壁上的功法似乎还完整。」',
    npc: { name: '陈墨', emoji: '🧑‍🦱', title: '外门弟子 · 好友' },
    highlights: ['洞府', '功法', '灵石'],
    choices: [
      { id: 'A', text: '尝试修炼石壁上的功法', desc: '机缘难得，试试看', next: 'mountain_3a' },
      { id: 'B', text: '拿走灵石，记下功法后离开', desc: '稳妥为上', next: 'mountain_3b' },
    ],
  },

  'mountain_2b': {
    text: '你没有贸然进入，而是在周围仔细观察。忽然，灌木丛中传来微弱的呜咽声。\n\n拨开草丛，你发现一只通体银白的小灵狐，后腿被猎兽夹死死咬住，伤口处隐隐有灵气外泄。\n\n灵狐用一双琥珀色的眼睛望着你，目光中竟带着几分恳求。',
    npc: null,
    highlights: ['灵狐', '猎兽夹'],
    choices: [
      { id: 'A', text: '救治灵狐', desc: '它很可怜，帮帮它', next: 'mountain_3c' },
      { id: 'B', text: '记下位置，离开继续修炼', desc: '自身修为要紧', next: 'end_calm' },
    ],
  },

  'mountain_3a': {
    text: '你盘膝坐在石壁前，按照功法口诀运转灵气。起初晦涩难懂，但渐渐地，文字仿佛活了过来。\n\n一股温热的气流从丹田涌起，沿着经脉奔涌！周围的灵气如潮水般汇聚而来——\n\n「轰！」体内仿佛有什么壁垒被冲开了！你感到修为暴涨！',
    npc: null,
    highlights: ['功法', '壁垒', '暴涨'],
    choices: endingChoices,
    onEnter: () => applyEffect({ cultivation: 800 }),
  },

  'mountain_3b': {
    text: '你小心翼翼地收好灵石，又用玉简拓印了石壁上的功法口诀。\n\n回到山道上，陈墨拍了拍你的肩膀：「收获不错。这些灵石蕴含浓郁灵气，够修炼好一阵了。」\n\n你点了点头，心中暗自盘算着接下来的修炼计划。',
    npc: { name: '陈墨', emoji: '🧑‍🦱', title: '外门弟子 · 好友' },
    highlights: ['灵石', '玉简'],
    choices: endingChoices,
    onEnter: () => applyEffect({ spiritStones: 30, cultivation: 300 }),
  },

  'mountain_3c': {
    text: '你小心掰开猎兽夹，用随身布条为灵狐包扎伤口。灵狐舔了舔你的手，竟用脑袋蹭了蹭你。\n\n伤好后，灵狐不愿离去，反而在前面带路。你跟着一路走到一处隐秘的山洞——\n\n洞中竟有一汪灵泉，泉水散发着柔和的银色光芒！这是……天然灵泉！',
    npc: null,
    highlights: ['灵狐', '灵泉', '银色光芒'],
    choices: endingChoices,
    onEnter: () => {
      applyEffect({ cultivation: 600 });
      eventLog.value.push('【获得伙伴：银灵狐】');
    },
  },

  // ═══ 修炼线 ═══
  'training_1': {
    text: '你来到练功场，选了一处僻静角落盘膝坐下。\n\n运转功法，灵气缓缓汇入经脉。正当你渐入佳境时——\n\n一道身影挡在你面前。是个面容冷峻的青年，腰间佩着一柄长剑。\n\n「听说新来的师弟修为不低？在下王浩，练气五层。可否切磋一二？」',
    npc: { name: '王浩', emoji: '⚔️', title: '外门弟子 · 练气五层' },
    highlights: ['王浩', '切磋'],
    choices: [
      { id: 'A', text: '接受切磋', desc: '以战养战，突破自我', next: 'training_2a' },
      { id: 'B', text: '婉拒，继续修炼', desc: '不喜争斗，专注修炼', next: 'training_2b' },
    ],
    onEnter: () => applyEffect({ cultivation: 200 }),
  },

  'training_2a': {
    text: '你起身抱拳：「王师兄请了。」\n\n王浩拔剑，剑光如虹，凌厉的剑气扑面而来！他的剑法走的是刚猛一路，每一剑都带着破空之声。\n\n你勉强格挡，发现他的剑法虽猛，但收招时有片刻的破绽。你该如何应对？',
    npc: { name: '王浩', emoji: '⚔️', title: '外门弟子 · 练气五层' },
    highlights: ['剑光', '破绽'],
    choices: [
      { id: 'A', text: '全力迎战，以力对力', desc: '正面硬刚，不怂', next: 'training_3a' },
      { id: 'B', text: '利用破绽，施展巧技', desc: '四两拨千斤', next: 'training_3b' },
    ],
  },

  'training_2b': {
    text: '你抱拳婉拒：「师兄见谅，今日只想专心修炼。」\n\n王浩冷哼一声，拂袖而去。你重新入定，将全部心神投入功法运转之中。\n\n灵气如涓涓细流，不断汇聚。你隐约感到体内有一层薄膜般的屏障——那是瓶颈！\n\n你积蓄力量，准备冲击。',
    npc: null,
    highlights: ['瓶颈', '灵气'],
    choices: [
      { id: 'A', text: '全力冲击瓶颈', desc: '一鼓作气，破！', next: 'training_3c' },
      { id: 'B', text: '稳扎稳打，水到渠成', desc: '不急不躁', next: 'end_steady' },
    ],
    onEnter: () => applyEffect({ cultivation: 300 }),
  },

  'training_3a': {
    text: '你深吸一口气，全力催动灵力迎上！拳剑相交，灵气激荡！\n\n王浩的攻势凶猛，但你寸步不让。百招过后，你抓住他收剑的瞬间，一掌拍在他肩头！\n\n王浩后退三步，拱手认输：「好身手！师弟果然名不虚传。」\n\n一场激战，你的修为在战斗中也得到了锤炼。',
    npc: { name: '王浩', emoji: '⚔️', title: '外门弟子 · 练气五层' },
    highlights: ['激战', '锤炼'],
    choices: endingChoices,
    onEnter: () => applyEffect({ cultivation: 600, reputation: 5 }),
  },

  'training_3b': {
    text: '你不再硬接，而是侧身闪避，等王浩一剑刺空、旧力已尽之时——\n\n你并指如剑，灵气凝聚于指尖，轻点他手腕！王浩长剑脱手，一脸震惊。\n\n「你……这是四两拨千斤的路子？好巧妙的功夫！」王浩抱拳，心悦诚服。\n\n围观的弟子纷纷点头，对你刮目相看。',
    npc: { name: '王浩', emoji: '⚔️', title: '外门弟子 · 练气五层' },
    highlights: ['巧妙', '刮目相看'],
    choices: endingChoices,
    onEnter: () => applyEffect({ cultivation: 500, reputation: 8 }),
  },

  'training_3c': {
    text: '你将积蓄已久的灵力凝聚成一团，猛然向那层瓶颈冲去！\n\n「轰！」体内传来一声闷响，仿佛有什么东西碎裂了——瓶颈破了！\n\n灵气如潮水般涌入新的经脉，你的修为暴涨！周围的弟子感受到了灵气波动，纷纷投来惊讶的目光。\n\n又一位天才弟子的崛起，从这一刻开始。',
    npc: null,
    highlights: ['瓶颈', '突破', '暴涨'],
    choices: endingChoices,
    onEnter: () => applyEffect({ cultivation: 700 }),
  },

  // ═══ 结局场景 ═══
  'end_calm': {
    text: '你沿着山路缓缓而行，一边感受山间灵气，一边默默运转功法。\n\n虽然没有大的奇遇，但这份宁静中蕴含的感悟，也让你的修为有了些许长进。\n\n修行之路，本就不是一朝一夕的事。',
    npc: null,
    highlights: ['宁静', '感悟'],
    choices: endingChoices,
    onEnter: () => applyEffect({ cultivation: 250 }),
  },

  'end_steady': {
    text: '你没有急于求成，而是以平和的心态缓缓修炼。灵气如水般滋润着经脉。\n\n虽然没有突破瓶颈，但根基更加扎实。你隐约觉得，突破只是时间问题。\n\n「水到渠成」，这四个字渐渐浮上心头。',
    npc: null,
    highlights: ['根基', '水到渠成'],
    choices: endingChoices,
    onEnter: () => applyEffect({ cultivation: 400 }),
  },
};

// ─── 场景加载函数 ───
function loadScene(sceneId) {
  const scene = storyGraph[sceneId];
  if (!scene) {
    console.error('Scene not found:', sceneId);
    return;
  }
  currentSceneId.value = sceneId;
  storyText.value = scene.text;
  currentNpc.value = scene.npc || null;
  highlightWords.value = scene.highlights || [];
  showChoices.value = false;

  // 应用进入场景时的效果
  if (scene.onEnter) {
    scene.onEnter();
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

// ─── 交互函数 ───
function skipTyping() {
  textRef.value?.finishTyping();
}

function startSimulation() {
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
