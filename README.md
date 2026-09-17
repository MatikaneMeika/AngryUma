# AngryUma · 弹弓大作战

使用 Canvas 2D、Matter.js 和本地角色 PNG 贴图的静态网页游戏，包含三个世界、六个关卡和四种技能角色。

## 本地运行

在项目目录运行 `python -m http.server 8080 --bind 127.0.0.1`，然后打开 http://127.0.0.1:8080/ 。无需安装 npm 依赖或构建。

- 拖住弹弓角色向后拉，松手发射。
- 飞行中点击画面：加速、分裂或引爆（普通角色没有主动技能）。
- 拖动画面平移镜头，鼠标滚轮缩放。
- 进度与音效设置保存在当前浏览器 localStorage 中。

## 素材对应

| 用途 | 文件 |
| --- | --- |
| 普通角色 | `media/birds/initial.png` |
| 加速角色 | `media/birds/accelerate.png` |
| 分裂角色 | `media/birds/split.png` |
| 爆炸角色 | `media/birds/boom.png` |
| 普通对手 | `media/pigs/pig_normal.png` / `pig_hurt.png` |
| 国王对手 | `media/pigs/King_normal.png` / `King_hurt.png` |

`index.html` 的 `SPRITES` 保存素材路径及透明边缘裁剪区域。加载全部贴图后才启动游戏循环。角色仅以 `drawImage` 绘制，旋转跟随物理刚体；碰撞形状依旧为圆形。普通/受伤贴图共享定位，国王的王冠不改变身体中心。原始素材保持不变。

Matter.js 0.19.0 已放在 `vendor/` 下，许可证见 `vendor/MATTER-LICENSE.txt`。Google Fonts 为可选装饰字体，无法连接时回退到系统字体。角色素材由项目所有者提供，其授权由原权利人保留；本项目不声明拥有素材版权。

## 验证

运行 `node tests/smoke.cjs` 进行脚本语法、资源存在性、贴图加载、六关初始化、受伤贴图选择及技能逻辑测试。该测试使用模拟 Canvas/DOM，不替代真实浏览器视觉和交互验收。

## GitHub Pages

部署静态文件即可。在仓库 **Settings → Pages** 中选择 **Deploy from a branch → main → /(root)** 并保存。无需配置服务器端运行环境。
