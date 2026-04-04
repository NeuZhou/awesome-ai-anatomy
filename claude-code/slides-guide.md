# Claude Code 拆解 — 视频配套幻灯片内容

## 使用说明
每页对应视频的一个段落。图片可以从GitHub仓库README截图，或用Google AI生成。

---

## Slide 1: 封面
**标题:** 拆解Claude Code：51万行源码揭秘最强AI编程助手
**副标题:** awesome-ai-anatomy #001
**配图:** 用Google AI生成一张科技感的封面图（机器人+代码的视觉）

---

## Slide 2: 宠物系统（开头钩子）
**标题:** Claude Code内部居然藏了一个虚拟宠物系统
**要点:**
- 18种宠物
- 5个稀有度等级
- RPG属性：调试力/耐心值/混乱值/智慧值/毒舌值
- 1%闪光变体
**配图:** 可以画一个简单的宠物卡片示意图，或用AI生成可爱的像素宠物图

---

## Slide 3: 泄露事件
**标题:** 51万行源码，意外泄露
**要点:**
- npm包残留.map文件
- 指向无鉴权的云存储
- 1,903个文件，完整TypeScript源码
**配图:** 一个简单的流程图：npm包 → .map文件 → R2链接 → 源码下载

---

## Slide 4: 技术栈
**标题:** Level 1: 聪明但可预见
**要点:**
- Bun + TypeScript + React/Ink
- 终端UI竟然是React写的
- 复杂状态管理的合理选择
**配图:** 从GitHub README截图技术栈表格

---

## Slide 5: Agentic Loop
**标题:** 核心：一个while(true)循环
**要点:**
- src/query.ts, 1,729行
- 预处理 → 调API → 检测工具 → 执行 → 循环
**配图:** 从GitHub README截图Agentic Core的Mermaid图

---

## Slide 6: 四层上下文管理
**标题:** Level 2: 四把手术刀
**要点:**
- L1: 精准删除（删APP）
- L2: 缓存层编辑（清缓存）
- L3: 结构化归档（压缩照片）
- L4: 全量压缩（恢复出厂）
- 原则：先无损再有损
**配图:** 从GitHub README截图Context Management的Mermaid图（那个绿→蓝→黄→红的渐变图）

---

## Slide 7: 流式工具并行
**标题:** 模型还在说话就开始干活了
**要点:**
- 传统Agent：等说完 → 检查 → 执行
- Claude Code：边说边执行
- 只读操作并行，写操作独占
- 这就是为什么它感觉更快
**配图:** 从GitHub README截图streaming execution的时序图

---

## Slide 8: 工具系统
**标题:** 40+工具，零继承
**要点:**
- 纯函数式buildTool()
- 每个工具自包含
- BashTool最复杂：沙箱/超时/大输出管理
**配图:** 工具列表示意图，或从README截图Tool System部分

---

## Slide 9: 隐藏功能
**标题:** Level 3: 完全没想到
**要点:**
- 🎤 语音模式（代号：琥珀石英）
- 🌉 远程控制模式
- 🧪 消融实验基础设施
- 🐣 虚拟宠物系统
**配图:** 可以用AI生成一张"隐藏宝箱"风格的图

---

## Slide 10: 宠物名彩蛋
**标题:** 18个名字里有一个是下一个模型的代号
**要点:**
duck, goose, blob, cat, dragon, octopus, owl, penguin, turtle, snail, ghost, axolotl, capybara, cactus, robot, rabbit, mushroom, chonk
- 全部十六进制编码
- 哪个是下一个模型？
**配图:** 18个宠物名排列成网格，中间打个大问号

---

## Slide 11: 争议观点
**标题:** Hot Take: Claude Code有过度工程倾向
**要点:**
- 4层上下文管理
- 40+工具
- 双层Feature Flag
- 消融实验基础设施
- 虚拟宠物
- 1,729行单文件
- "研究团队合理，维护者噩梦"
**配图:** 天平图——左边"研究价值"，右边"维护成本"

---

## Slide 12: 泄露教训
**标题:** 51万行，被一个忘删的文件暴露了
**要点:**
- package.json用白名单
- CI检查.map文件
- 源码URL加鉴权
**配图:** 简单的checklist图标

---

## Slide 13: 总结
**标题:** 最大的收获：研究型工程文化
**要点:**
- 用做论文的方法做产品
- 每个功能都有量化验证
- 每个决策都有trade-off分析
**配图:** "Research → Engineering → Product" 的循环图

---

## Slide 14: 结尾CTA
**标题:** awesome-ai-anatomy #001
**要点:**
- 下一期：字节DeerFlow
- GitHub: github.com/NeuZhou/awesome-ai-anatomy
- ⭐ Star the repo
**配图:** GitHub仓库截图 + 二维码
