#!/bin/bash

# 清理脚本 - 删除所有敏感的浏览器状态和缓存文件

echo "🧹 正在清理 Kagi 搜索工具的状态文件..."

# 删除项目目录中的状态文件
echo "清理项目目录中的状态文件..."
rm -f browser-state*.json
rm -f *browser-state*.json
rm -f kagi-search-*.html
rm -f kagi-search-*.png
rm -rf kagi-search-html/
rm -rf google-search-html/

# 删除用户主目录中的状态文件
echo "清理用户主目录中的状态文件..."
rm -f ~/.kagi-search-browser-state.json
rm -f ~/.google-search-browser-state.json

# 删除可能的日志文件
echo "清理日志文件..."
rm -rf logs/
find . -name "*.log" -delete 2>/dev/null || true

# 删除编译输出（可选）
if [ "$1" = "--full" ]; then
    echo "完全清理：删除编译输出和依赖..."
    rm -rf dist/
    rm -rf node_modules/
    rm -f package-lock.json
    echo "运行 'npm install && npm run build' 来重新安装和构建"
fi

echo "✅ 清理完成！"
echo ""
echo "⚠️  注意："
echo "   - 下次搜索时可能需要重新进行认证"
echo "   - 请确保您的 .env 文件包含有效的 KAGI_TOKEN"
echo "   - 这些状态文件已被添加到 .gitignore，不会被提交到 git"
