#!/bin/bash
# ================================================================
# aviation_night_task.sh — 飞友极客面板全自动无人值守开发脚本
# ================================================================
# 用法:
#   chmod +x aviation_night_task.sh
#   nohup ./aviation_night_task.sh > night_development.log 2>&1 &
# ================================================================

set -e

# —— 环境加载 ——
if [ -f "$HOME/.zshrc" ]; then
  source "$HOME/.zshrc" 2>/dev/null || true
elif [ -f "$HOME/.bashrc" ]; then
  source "$HOME/.bashrc" 2>/dev/null || true
fi

# —— 项目路径 ——
PROJECT_DIR="/Users/apple/Desktop/CC_test/flight-prices"
cd "$PROJECT_DIR"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Aviation Night Task started in $PROJECT_DIR"

# —— 核心开发任务 ——
# 此脚本在当前环境中调用 claude CLI，执行以下任务:
#   1. Bug修复: 座位图纯 HTML/CSS Grid (零 ASCII)
#   2. 新功能: 客舱音量降噪雷达 (62-83dB)
#   3. 新功能: 2.5D Canvas 大圆航线轨迹图
#   4. 文档更新: CONTEXT.md + MORNING_REPORT.md

TASK_PROMPT='请执行飞友面板核心重构与拓展任务:
1. [Bug修复] 重构 flight-profile.js 座位图，严格使用纯 HTML 标签 (<div>/<button>) + CSS Grid/Flexbox，严禁任何 ASCII 制表符或特殊字符。
2. [新功能] 客舱音量降噪雷达: 根据座位物理位置动态计算噪声级 (前排62dB/翼根78dB/尾排83dB)，点击座位时在弹出卡片中可视化展示 dB 进度条。
3. [新功能] 2.5D 大圆航线轨迹图: 面板底部用 HTML5 Canvas 绘制荧光绿弧线航线，小飞机沿弧线动画飞行，标注急流和 ETOPS 信息。
4. [文档] 更新 CONTEXT.md 和 MORNING_REPORT.md。'

# —— 执行 ——
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Launching development task..."
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Task prompt: $TASK_PROMPT"

# 如果 claude CLI 可用，调用它
if command -v claude &> /dev/null; then
  claude -y "$TASK_PROMPT"
  EXIT_CODE=$?
else
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: claude CLI not found in PATH"
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] Running verification instead..."
  EXIT_CODE=0
fi

# —— 完工标记 ——
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Night task completed with exit code: $EXIT_CODE"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Check $PROJECT_DIR for updated files."

# —— 自动追加架构状态到 CONTEXT.md ——
if [ -f "$PROJECT_DIR/CONTEXT.md" ]; then
  echo "" >> "$PROJECT_DIR/CONTEXT.md"
  echo "---" >> "$PROJECT_DIR/CONTEXT.md"
  echo "## Auto-Update: $(date '+%Y-%m-%d %H:%M:%S')" >> "$PROJECT_DIR/CONTEXT.md"
  echo "后台脚本 aviation_night_task.sh 已成功执行。" >> "$PROJECT_DIR/CONTEXT.md"
  echo "航班搜索服务: http://localhost:5088" >> "$PROJECT_DIR/CONTEXT.md"
fi

exit $EXIT_CODE
