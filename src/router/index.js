/**
 * 路由配置 + 路由守卫
 * @module router/index
 */

import { createRouter, createWebHistory } from 'vue-router';
import { gameStateMachine, GameState } from '../engines/gameStateMachine.js';

/**
 * 路由定义
 * 使用路由懒加载减少首屏体积
 */
const routes = [
  {
    path: '/',
    redirect: '/main-menu',
  },
  {
    path: '/main-menu',
    name: 'MainMenu',
    component: () => import('../views/MainMenuView.vue'),
    meta: { requiresLoad: false },
  },
  {
    path: '/new-game',
    name: 'NewGame',
    component: () => import('../views/NewGameView.vue'),
    meta: { requiresLoad: false },
  },
  {
    path: '/reality',
    name: 'Reality',
    component: () => import('../views/RealityView.vue'),
    meta: { requiresLoad: true },
  },
  {
    path: '/simulation',
    name: 'Simulation',
    component: () => import('../views/SimulationView.vue'),
    meta: { requiresLoad: true },
  },
  {
    path: '/settlement',
    name: 'Settlement',
    component: () => import('../views/SettlementView.vue'),
    meta: { requiresLoad: true },
  },
  {
    path: '/character',
    name: 'Character',
    component: () => import('../views/CharacterView.vue'),
    meta: { requiresLoad: true },
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('../views/SettingsView.vue'),
    meta: { requiresLoad: false },
  },
  {
    path: '/achievements',
    name: 'Achievements',
    component: () => import('../views/AchievementView.vue'),
    meta: { requiresLoad: true },
  },
  {
    // 404 重定向到主菜单
    path: '/:pathMatch(.*)*',
    redirect: '/main-menu',
  },
];

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

/**
 * 全局前置守卫
 */
router.beforeEach((to, from, next) => {
  const currentState = gameStateMachine.getCurrentState();

  // 规则1：模拟进行中禁止跳转到非相关路由
  if (
    currentState === GameState.SIMULATION &&
    !['/simulation', '/settlement', '/settings'].includes(to.path)
  ) {
    // 简化处理：阻止跳转
    console.warn('[Router] 模拟进行中，禁止跳转到:', to.path);
    next(false);
    return;
  }

  // 规则2：需要加载存档的路由，检查是否已加载
  if (to.meta.requiresLoad) {
    // 简化处理：直接放行（实际应检查playerStore.isLoaded）
    // const playerStore = usePlayerStore();
    // if (!playerStore.isLoaded) {
    //   next('/main-menu');
    //   return;
    // }
  }

  next();
});

/**
 * 全局后置钩子 - 同步游戏状态机
 */
router.afterEach((to) => {
  // 根据路由映射到游戏状态
  const routeStateMap = {
    '/main-menu': GameState.MAIN_MENU,
    '/new-game': GameState.NEW_GAME,
    '/reality': GameState.REALITY,
    '/simulation': GameState.SIMULATION,
    '/settlement': GameState.SIMULATION_SETTLE,
    '/character': GameState.CHARACTER_PANEL,
    '/settings': GameState.SETTINGS,
    '/achievements': GameState.REALITY,
  };

  const targetState = routeStateMap[to.path];
  if (targetState && targetState !== gameStateMachine.getCurrentState()) {
    gameStateMachine.forceState(targetState);
  }
});

export default router;
