# 愤怒的马娘 · Angry Uma 🎯🐎

基于 **Matter.js** 2D 物理引擎与 **HTML5 Canvas** 打造的《赛马娘》同人弹射物理小游戏。

👉 **[点击立即在线游玩](https://matikanemeika.github.io/AngryUma/)**

---

## 🎮 游戏角色与技能

| 角色贴图 | 角色名称 | 技能特色 |
| :--- | :--- | :--- |
| ![帝王](media/birds/initial.png) | **东海帝王** | 初始全能马娘，弹力强劲，手感扎实 |
| ![米浴](media/birds/accelerate.png) | **米浴** | 飞行途中点击屏幕，瞬间**极速直线冲刺**，破木摧石！ |
| ![内恰](media/birds/split.png) | **优秀素质 (内恰)** | 飞行途中点击屏幕，瞬间**分裂为三位小内恰**形成范围覆盖！ |
| ![波旁](media/birds/boom.png) | **美浦波旁** | 生化机械马娘，点击屏幕或受剧烈撞击后触发**超负荷大爆炸**！ |

### 🎯 目标敌人：摸鱼的菱钻奇宝

| 正常状态 | 受伤状态 (HP < 55%) | 说明 |
| :---: | :---: | :--- |
| ![奇宝正常](media/pigs/pig_normal.png) | ![奇宝受伤](media/pigs/pig_hurt.png) | **普通奇宝猪**：戴着蓝白横条纹耳罩，受损时会闭眼吃痛 |
| ![国王奇宝正常](media/pigs/King_normal.png) | ![国王奇宝受伤](media/pigs/King_hurt.png) | **国王奇宝猪**：头顶王冠，拥有更厚实的血量与高额通关奖励 |

---

## 🌟 游戏特色

1. **原汁原味的物理弹射体验**：使用 Matter.js 真实刚体动力学，包含惯性、重力、角速度、弹性碰撞及建筑连锁坍塌。
2. **三套不同主题世界**：
   - 特雷森青青草地
   - 黄昏训练沙地
   - 奇宝夜间主场（附带星空与火把动态光影）
3. **精细贴图与动效**：
   - 包含拉弓形变、尾迹轨迹线、羽毛消散、火花爆裂、金币与加分浮动动效。
   - 自动适配各种手机触屏与 PC 浏览器（支持鼠标滚轮缩放与拖拽视口）。
4. **Web Audio 合成音效**：纯原生合成音效，无需外部繁重音频文件，即点即响。

---

## 🚀 GitHub Pages 开启与在线游玩指南

1. 打开本仓库的 **[Pages 设置页面](https://github.com/MatikaneMeika/AngryUma/settings/pages)**。
2. 在 **Build and deployment** 下：
   - **Source** 选择 `Deploy from a branch`。
   - **Branch** 选择 `main`，目录保持 `/ (root)`。
3. 点击 **Save** 保存。
4. 等待 1~2 分钟 GitHub 构建完毕后，即可通过以下链接访问游玩：
   `https://matikanemeika.github.io/AngryUma/`

---

## 💻 本地快捷预览方法

本项目提供免安装、零依赖的极速本地预览方式：

### 方法 1：Windows 双击一键启动（最推荐）
直接在文件夹中**双击 `start_preview.bat`**：
- 自动启动轻量静态 HTTP 服务器；
- 自动调用系统默认浏览器打开 `http://localhost:8080`；
- 控制台还会打印当前电脑在局域网中的 IP 地址，手机连同一个 WiFi 输入该地址即可在手机真机上触屏游玩！

### 方法 2：命令行启动
在项目根目录下执行以下任意一条命令：
```bash
node server.js
# 或者
npm start
```

---

*Enjoy the game! 芜湖起飞！*
