/**
 * Vue应用入口
 * @module main
 */

import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { router } from './router/index.js';

// 创建Vue应用实例
const app = createApp(App);

// 注册插件
app.use(createPinia());
app.use(router);

// 挂载应用
app.mount('#app');
