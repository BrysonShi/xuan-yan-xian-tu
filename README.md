# 🏔️ 玄衍仙途：命运模拟器

> **「一念成仙，一念堕魔。万般命运，皆在你手。」**

一款基于浏览器的**模拟器流修仙文字游戏**。在这里，你将踏上一段波澜壮阔的修仙之路——每一次选择都将改写命运，每一世轮回都蕴含机缘。

---

## 🎮 在线试玩

🔗 **[点击这里在线试玩](https://YOUR_USERNAME.github.io/xuan-yan-xian-tu/)**

> 首次部署后，将上方链接替换为你的实际 GitHub Pages 地址。

---

## ✨ 游戏特色

### 🔄 轮回模拟系统
- 每一次修仙都是一段全新的人生
- 从凡人起步，经历练气、筑基、金丹、元婴直至渡劫飞升
- 死亡并非终结——前世修为化为底蕴，来世起步更高

### 🎲 命运抉择
- 海量随机事件，每次游玩都有不同体验
- 关键节点的抉择影响后续命运走向
- 机缘、劫难、奇遇，一切皆有因果

### 📊 深度养成
- 灵根天赋、功法修炼、法宝炼制、丹药调配
- 多条修炼路线：剑修、丹修、符修、阵修……
- 属性系统、境界突破、天劫考验

### 📖 丰富剧情
- 基于修仙小说世界观的沉浸式叙事
- 宗门、秘境、仙盟，构建完整的修仙社会
- NPC 关系系统，结交道友、收徒传法

---

## 📸 游戏截图

> 截图将在游戏开发完善后更新

| 主界面 | 修炼系统 | 事件选择 |
|:---:|:---:|:---:|
| ![主界面](docs/screenshots/main.png) | ![修炼](docs/screenshots/cultivation.png) | ![事件](docs/screenshots/event.png) |

---

## 🛠️ 技术栈

| 技术 | 用途 |
|------|------|
| [Vue 3](https://vuejs.org/) | 前端框架（Composition API） |
| [Pinia](https://pinia.vuejs.org/) | 状态管理 |
| [Vue Router](https://router.vuejs.org/) | 路由管理 |
| [Vite](https://vitejs.dev/) | 构建工具 |
| GitHub Pages | 静态部署 |
| GitHub Actions | 自动化 CI/CD |

---

## 🚀 本地运行

### 环境要求
- Node.js >= 18
- npm >= 9

### 安装与运行

```bash
# 克隆仓库
git clone https://github.com/YOUR_USERNAME/xuan-yan-xian-tu.git
cd xuan-yan-xian-tu

# 安装依赖
npm install

# 启动开发服务器（http://localhost:3000）
npm run dev

# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

---

## 📂 项目结构

```
修仙模拟器/
├── public/              # 静态资源
│   └── 404.html         # SPA 路由修复
├── src/
│   ├── assets/          # 图片、样式等资源
│   ├── components/      # 公共组件
│   ├── router/          # 路由配置
│   ├── stores/          # Pinia 状态管理
│   ├── views/           # 页面视图
│   ├── App.vue          # 根组件
│   └── main.js          # 入口文件
├── .github/workflows/   # GitHub Actions 部署
├── index.html           # HTML 入口
├── package.json         # 项目配置
└── vite.config.js       # Vite 配置
```

---

## 📜 开发历程

本项目灵感来源于模拟器流修仙小说的独特魅力——将修仙的浪漫与模拟器的策略性相结合，打造一款沉浸式的文字修仙体验。

项目从零开始，采用现代化的前端技术栈，所有游戏逻辑运行在浏览器端，无需后端服务器，真正做到「打开即玩」。

---

## 📄 License

MIT License

---

<p align="center">
  <strong>愿道友仙途坦荡，一飞冲天！</strong> 🌟
</p>
