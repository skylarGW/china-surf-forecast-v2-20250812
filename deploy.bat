@echo off
echo ========================================
echo 中国冲浪预测系统 - 安全版本部署脚本
echo ========================================
echo.

:: 检查目录
if not exist "GitHub修复包" (
    echo 错误: 找不到 GitHub修复包 目录
    echo 请确保在正确的项目根目录运行此脚本
    pause
    exit /b 1
)

:: 创建备份
echo 1. 创建当前版本备份...
set backup_dir=backup-%date:~0,4%%date:~5,2%%date:~8,2%-%time:~0,2%%time:~3,2%%time:~6,2%
set backup_dir=%backup_dir: =0%
mkdir "%backup_dir%" 2>nul
xcopy "GitHub修复包\*" "%backup_dir%\" /E /I /Q
echo    备份完成: %backup_dir%

:: 复制安全版本文件
echo.
echo 2. 部署安全版本文件...
copy "security-fix-v1.0\index-secure.html" "GitHub修复包\index.html" /Y
copy "security-fix-v1.0\security-utils.js" "GitHub修复包\security-utils.js" /Y
copy "security-fix-v1.0\windy-point-api.js" "GitHub修复包\windy-point-api.js" /Y
copy "security-fix-v1.0\visitor-counter.js" "GitHub修复包\visitor-counter.js" /Y
copy "security-fix-v1.0\visitor-counter-aws.js" "GitHub修复包\visitor-counter-aws.js" /Y
copy "security-fix-v1.0\data-freshness.js" "GitHub修复包\data-freshness.js" /Y
copy "security-fix-v1.0\windy-smart-cache.js" "GitHub修复包\windy-smart-cache.js" /Y
copy "security-fix-v1.0\AWS-VISITOR-SETUP.md" "GitHub修复包\AWS-VISITOR-SETUP.md" /Y
copy "security-fix-v1.0\app-v6-secure.js" "GitHub修复包\app-v6-secure.js" /Y
copy "security-fix-v1.0\dataService-secure.js" "GitHub修复包\dataService-secure.js" /Y
copy "security-fix-v1.0\WINDY-API-SETUP.md" "GitHub修复包\WINDY-API-SETUP.md" /Y
echo    文件复制完成

:: 更新HTML引用
echo.
echo 3. 更新HTML文件引用...
powershell -Command "(Get-Content 'GitHub修复包\index.html') -replace 'app-v5-增强版.js', 'app-v6-secure.js' | Set-Content 'GitHub修复包\index.html'"
powershell -Command "(Get-Content 'GitHub修复包\index.html') -replace '</head>', '    <script src=\"security-utils.js\"></script>$([Environment]::NewLine)</head>' | Set-Content 'GitHub修复包\index.html'"
echo    HTML引用更新完成

:: 验证文件
echo.
echo 4. 验证部署文件...
if exist "GitHub修复包\security-utils.js" (
    echo    ✓ security-utils.js
) else (
    echo    ✗ security-utils.js 缺失
)

if exist "GitHub修复包\app-v6-secure.js" (
    echo    ✓ app-v6-secure.js
) else (
    echo    ✗ app-v6-secure.js 缺失
)

if exist "GitHub修复包\dataService-secure.js" (
    echo    ✓ dataService-secure.js
) else (
    echo    ✗ dataService-secure.js 缺失
)

if exist "GitHub修复包\windy-point-api.js" (
    echo    ✓ windy-point-api.js
) else (
    echo    ✗ windy-point-api.js 缺失
)

if exist "GitHub修复包\WINDY-API-SETUP.md" (
    echo    ✓ WINDY-API-SETUP.md
) else (
    echo    ✗ WINDY-API-SETUP.md 缺失
)

if exist "GitHub修复包\visitor-counter.js" (
    echo    ✓ visitor-counter.js
) else (
    echo    ✗ visitor-counter.js 缺失
)

if exist "GitHub修复包\visitor-counter-aws.js" (
    echo    ✓ visitor-counter-aws.js
) else (
    echo    ✗ visitor-counter-aws.js 缺失
)

if exist "GitHub修复包\AWS-VISITOR-SETUP.md" (
    echo    ✓ AWS-VISITOR-SETUP.md
) else (
    echo    ✗ AWS-VISITOR-SETUP.md 缺失
)

echo.
echo ========================================
echo 部署完成！
echo ========================================
echo.
echo 下一步操作:
echo 1. 在本地测试: 打开 GitHub修复包\index.html
echo 2. 提交到GitHub: 
echo    git add .
echo    git commit -m "feat: 安全修复版本 - 修复XSS漏洞和内存泄漏"
echo    git push origin main
echo 3. Vercel会自动重新部署
echo.
echo 安全特性:
echo - ✓ XSS防护
echo - ✓ 内存泄漏修复  
echo - ✓ 请求频率限制
echo - ✓ 输入验证
echo - ✓ 安全日志
echo.
echo Windy API集成:
echo - ✓ Point Forecast API支持
echo - ✓ 专业海洋气象数据
echo - ✓ 24小时详细预测
echo - ✓ 智能缓存和降级
echo - ✓ 中国数据校准兼容
echo.
echo 访客统计功能:
echo - ✓ 实时访客计数
echo - ✓ 每日访客统计
echo - ✓ 7天访客趋势
echo - ✓ 本地存储，无隐私泄漏
echo - ✓ 智能去重，防止重复计数
echo - ✓ AWS云端存储支持
echo - ✓ 智能降级机制
echo.
echo 配置指南: 
echo - Windy API: 查看 WINDY-API-SETUP.md
echo - AWS访客统计: 查看 AWS-VISITOR-SETUP.md
echo.
pause