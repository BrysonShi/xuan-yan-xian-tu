# 📦 部署指南 — GitHub Pages

本指南将帮助你把「玄衍仙途：命运模拟器」部署到 GitHub Pages，让任何人都能通过浏览器访问。

---

## 前提条件

- 一个 GitHub 账号（[注册](https://github.com/signup)）
- 本地已安装 Git（[下载](https://git-scm.com/downloads)）
- 本地已安装 Node.js >= 18（[下载](https://nodejs.org/)）
- 项目已能本地运行（`npm install && npm run dev`）

---

## 步骤一：在 GitHub 创建仓库

1. 打开 [GitHub](https://github.com)，登录账号
2. 点击右上角 **「+」→「New repository」**
3. 填写信息：
   - **Repository name**：`xuan-yan-xian-tu`（或你喜欢的名称）
   - **Description**：`玄衍仙途：命运模拟器 — 一款浏览器端的模拟器流修仙文字游戏`
   - **Public** ✅（GitHub Pages 免费版仅支持公开仓库）
   - **不要**勾选「Add a README file」（我们已有）
   - **不要**勾选「Add .gitignore」和「Choose a license」
4. 点击 **「Create repository」**

创建成功后，记下仓库地址，格式类似：
```
https://github.com/YOUR_USERNAME/xuan-yan-xian-tu.git
```

---

## 步骤二：本地初始化 Git 并推送代码

打开终端，进入项目目录：

```bash
# 进入项目目录
cd /path/to/修仙模拟器

# 初始化 Git 仓库
git init

# 添加所有文件（.gitignore 会自动排除 node_modules 等）
git add .

# 提交
git commit -m "feat: 初始版本 - 玄衍仙途命运模拟器"

# 添加远程仓库（替换为你的实际仓库地址）
git remote add origin https://github.com/YOUR_USERNAME/xuan-yan-xian-tu.git

# 推送到 main 分支
git branch -M main
git push -u origin main
```

---

## 步骤三：启用 GitHub Pages

1. 打开你的仓库页面
2. 点击顶部 **「Settings」**（设置）
3. 左侧菜单找到 **「Pages」**
4. 在 **「Source」** 下拉菜单中，选择 **「GitHub Actions」**

> ⚠️ 注意：不要选择「Deploy from a branch」，我们使用的是 GitHub Actions 工作流部署。

---

## 步骤四：等待自动部署

推送代码到 `main` 分支后，GitHub Actions 会自动触发部署工作流：

1. 在仓库页面点击 **「Actions」** 标签
2. 你可以看到正在运行的 workflow：`Deploy to GitHub Pages`
3. 等待 build 和 deploy 两个 job 都完成（绿色 ✅）
4. 通常需要 1-3 分钟

---

## 步骤五：访问你的游戏

部署完成后，你的游戏地址为：

```
https://YOUR_USERNAME.github.io/xuan-yan-xian-tu/
```

> 将 `YOUR_USERNAME` 替换为你的 GitHub 用户名。

你可以在 **Settings → Pages** 页面看到完整的访问 URL。

---

## 后续更新

以后每次修改代码并推送到 `main` 分支，都会自动重新部署：

```bash
# 修改代码后
git add .
git commit -m "feat: 新增XX功能"
git push
```

GitHub Actions 会自动构建并部署最新版本。

---

## 手动触发部署

如果只想重新部署而不修改代码：

1. 进入仓库的 **「Actions」** 页面
2. 左侧选择 **「Deploy to GitHub Pages」**
3. 右侧点击 **「Run workflow」→「Run workflow」**

---

## 自定义域名（可选）

如果你想使用自己的域名：

1. 在仓库根目录创建 `CNAME` 文件，内容为你的域名（如 `game.example.com`）
2. 在你的 DNS 提供商处添加 CNAME 记录，指向 `YOUR_USERNAME.github.io`
3. 在 **Settings → Pages → Custom domain** 中填入域名
4. 勾选 **「Enforce HTTPS」**

---

## 常见问题

### Q: 部署后页面空白？
A: 检查 `vite.config.js` 中 `base` 是否设置为 `'./'`。

### Q: 刷新页面 404？
A: 已配置 `public/404.html` 处理 SPA 路由，确保该文件存在且已推送到仓库。

### Q: Actions 构建失败？
A: 检查 `package.json` 中的 `build` 脚本是否正确，查看 Actions 日志中的错误信息。

### Q: 资源文件 404？
A: 确保所有静态资源使用相对路径引用，而非绝对路径。

---

<p align="center">祝部署顺利，仙途愉快！ 🚀</p>
