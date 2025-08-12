// 主应用程序 V6.0 - 安全修复版
class SurfForecastAppV6 {
    constructor() {
        this.selectedDate = new Date();
        this.selectedRegion = 'all';
        this.currentAnalyses = [];
        this.globalTop3 = [];
        this.calibrationEnabled = true;
        this.cache = new SafeCacheManager(50, 30 * 60 * 1000);
        
        this.init();
    }

    init() {
        try {
            this.initDateSelector();
            this.initRegionSelector();
            this.initModal();
            this.initChinaCalibration();
            this.loadData();
        } catch (error) {
            ErrorHandler.logError(error, 'App初始化');
            this.showError(ErrorHandler.handle(error, 'App初始化'));
        }
    }

    initDateSelector() {
        const dateButtons = document.getElementById('dateButtons');
        if (!dateButtons) return;
        
        // 清空现有内容
        dateButtons.innerHTML = '';
        
        const today = new Date();
        
        for (let i = 0; i < 7; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            
            const button = SecurityUtils.createSafeElement('button', '', {
                class: `date-btn ${i === 0 ? 'active' : ''}`,
                'data-date': date.toISOString()
            });
            
            // 安全设置按钮文本
            const buttonText = i === 0 ? '今天' : 
                              i === 1 ? '明天' : 
                              `${date.getMonth() + 1}/${date.getDate()}`;
            button.textContent = buttonText;
            
            button.addEventListener('click', () => this.selectDate(date, button));
            dateButtons.appendChild(button);
        }
    }

    initRegionSelector() {
        const regionBtns = document.querySelectorAll('.region-btn');
        regionBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const region = e.target.dataset.region;
                
                // 验证region输入
                if (!SecurityUtils.validateInput(region, 'region')) {
                    SecurityUtils.safeLog('无效的region输入', region);
                    return;
                }
                
                regionBtns.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.selectedRegion = region;
                this.filterSpotsByRegion();
            });
        });
    }

    initModal() {
        const modal = document.getElementById('detailModal');
        const closeBtn = modal?.querySelector('.close');
        
        if (closeBtn) {
            closeBtn.addEventListener('click', () => modal.style.display = 'none');
        }
        
        window.addEventListener('click', (e) => {
            if (e.target === modal) modal.style.display = 'none';
        });
    }

    selectDate(date, button) {
        document.querySelectorAll('.date-btn').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        this.selectedDate = date;
        this.loadData();
    }

    async loadData() {
        try {
            await Promise.all([
                this.loadGlobalTop3(),
                this.loadRegionalData()
            ]);
            
            // 更新数据新鲜度
            if (window.dataFreshnessManager) {
                dataFreshnessManager.updateTimestamp('windy');
            }
        } catch (error) {
            ErrorHandler.logError(error, '数据加载');
            this.showError(ErrorHandler.handle(error, '数据加载'));
        }
    }

    async loadGlobalTop3() {
        const globalAnalysis = document.getElementById('globalAiAnalysis');
        if (!globalAnalysis) return;
        
        // 安全设置加载状态
        const loadingDiv = SecurityUtils.createSafeElement('div', '正在分析全国最佳冲浪条件...', {
            class: 'loading'
        });
        globalAnalysis.innerHTML = '';
        globalAnalysis.appendChild(loadingDiv);

        try {
            const allSpots = CONFIG.getAllSpots();
            const analyses = [];

            for (const spot of allSpots) {
                // 验证spot数据
                if (!spot.name || !SecurityUtils.validateInput(spot.name, 'spotName')) {
                    SecurityUtils.safeLog('无效的spot数据', spot);
                    continue;
                }
                
                const data = await dataService.getAllData(spot.coordinates, this.selectedDate);
                const analysis = await aiAnalyzer.analyzeSpot(spot, data, this.selectedDate);
                
                if (analysis && analysis.scores && typeof analysis.scores.totalScore === 'number') {
                    analyses.push(analysis);
                }
            }

            this.globalTop3 = analyses
                .sort((a, b) => (b.scores.totalScore || 0) - (a.scores.totalScore || 0))
                .slice(0, 3);

            this.displayGlobalTop3();
        } catch (error) {
            ErrorHandler.logError(error, '全国TOP3加载');
            const errorDiv = SecurityUtils.createSafeElement('div', '加载失败，请稍后重试', {
                class: 'error'
            });
            globalAnalysis.innerHTML = '';
            globalAnalysis.appendChild(errorDiv);
        }
    }

    displayGlobalTop3() {
        const globalAnalysis = document.getElementById('globalAiAnalysis');
        if (!globalAnalysis) return;
        
        globalAnalysis.innerHTML = '';
        
        if (this.globalTop3.length === 0) {
            const noDataDiv = SecurityUtils.createSafeElement('div', '暂无推荐数据', {
                class: 'no-data'
            });
            globalAnalysis.appendChild(noDataDiv);
            return;
        }

        this.globalTop3.forEach((analysis, index) => {
            const spot = analysis.spot;
            const scores = analysis.scores || {};
            const suggestion = analysis.suggestion || {};
            const totalScore = scores.totalScore || 0;
            const medal = ['🥇', '🥈', '🥉'][index];
            
            // 创建卡片容器
            const card = SecurityUtils.createSafeElement('div', '', {
                class: 'top-spot-card',
                'data-spot-id': spot.id
            });
            
            // 安全添加内容
            const rankBadge = SecurityUtils.createSafeElement('div', `${medal} TOP ${index + 1}`, {
                class: 'rank-badge'
            });
            
            const spotInfo = SecurityUtils.createSafeElement('div', '', { class: 'spot-info' });
            const spotName = SecurityUtils.createSafeElement('h3', spot.name);
            const regionName = SecurityUtils.createSafeElement('p', 
                spot.region === 'zhoushan' ? '舟山群岛' : '青岛海岸', 
                { class: 'region' }
            );
            
            const scoreDisplay = SecurityUtils.createSafeElement('div', '', { class: 'score-display' });
            const totalScoreSpan = SecurityUtils.createSafeElement('span', totalScore.toFixed(1), { class: 'total-score' });
            const scoreLabel = SecurityUtils.createSafeElement('span', '综合评分', { class: 'score-label' });
            
            scoreDisplay.appendChild(totalScoreSpan);
            scoreDisplay.appendChild(scoreLabel);
            
            spotInfo.appendChild(spotName);
            spotInfo.appendChild(regionName);
            spotInfo.appendChild(scoreDisplay);
            
            // 添加统计信息
            const quickStats = SecurityUtils.createSafeElement('div', '', { class: 'quick-stats' });
            const waveDiv = SecurityUtils.createSafeElement('div', `🌊 ${analysis.data.windy.waveHeight}m`, { class: 'stat' });
            const windDiv = SecurityUtils.createSafeElement('div', `💨 ${analysis.data.windy.windSpeed}节`, { class: 'stat' });
            const tempDiv = SecurityUtils.createSafeElement('div', `🌡️ ${analysis.data.ocean.waterTemperature}°C`, { class: 'stat' });
            
            quickStats.appendChild(waveDiv);
            quickStats.appendChild(windDiv);
            quickStats.appendChild(tempDiv);
            
            // 添加AI预览
            const aiPreview = SecurityUtils.createSafeElement('div', '', { class: 'ai-preview' });
            const equipmentPreview = SecurityUtils.createSafeElement('div', 
                `🏄 ${(suggestion.equipment || ['分析中...'])[0]}`, 
                { class: 'equipment-preview' }
            );
            const skillPreview = SecurityUtils.createSafeElement('div', 
                `👤 ${(suggestion.skillLevel || ['分析中...'])[0]}`, 
                { class: 'skill-preview' }
            );
            
            aiPreview.appendChild(equipmentPreview);
            aiPreview.appendChild(skillPreview);
            
            // 组装卡片
            card.appendChild(rankBadge);
            card.appendChild(spotInfo);
            card.appendChild(quickStats);
            card.appendChild(aiPreview);
            
            // 添加点击事件
            card.addEventListener('click', () => this.showSpotDetail(spot.id));
            
            globalAnalysis.appendChild(card);
        });
    }

    async showSpotDetail(spotId) {
        try {
            // 验证spotId
            if (!SecurityUtils.validateInput(String(spotId), 'text')) {
                SecurityUtils.safeLog('无效的spotId', spotId);
                return;
            }
            
            let analysis = this.currentAnalyses.find(a => a.spot.id === spotId);
            
            if (!analysis) {
                const topSpot = this.globalTop3.find(t => t.spot.id === spotId);
                if (topSpot) {
                    analysis = topSpot;
                }
            }
            
            if (!analysis) return;

            const modal = document.getElementById('detailModal');
            const content = document.getElementById('modalContent');
            
            if (!modal || !content) return;
            
            // 清空内容
            content.innerHTML = '';
            
            const data = analysis.data;
            const spot = analysis.spot;
            const scores = analysis.scores || {};
            const suggestion = analysis.suggestion || {};

            // 安全创建模态框内容
            const title = SecurityUtils.createSafeElement('h2', `${spot.name} - 专业分析报告`);
            const description = SecurityUtils.createSafeElement('p', spot.description, { class: 'spot-description' });
            const coordinates = SecurityUtils.createSafeElement('p', 
                `📍 坐标: ${UTILS.formatCoordinates(spot.coordinates)}`, 
                { class: 'spot-coordinates' }
            );
            
            content.appendChild(title);
            content.appendChild(description);
            content.appendChild(coordinates);
            
            // 添加详细分析部分
            this.addDetailSection(content, '🌊 当前浪况分析', scores.waveScore, {
                '浪高': `${data.windy.waveHeight}m`,
                '周期': `${data.windy.wavePeriod}s`,
                '浪向': UTILS.degreeToDirection(data.windy.waveDirection),
                '涌浪': `${data.windy.swellHeight}m`
            });
            
            this.addDetailSection(content, '💨 当前风况分析', scores.windScore, {
                '风速': `${data.windy.windSpeed}节`,
                '风向': UTILS.degreeToDirection(data.windy.windDirection),
                '阵风': `${data.windy.windGust}节`
            });
            
            modal.style.display = 'block';
            
        } catch (error) {
            ErrorHandler.logError(error, '显示详情');
            this.showError(ErrorHandler.handle(error, '显示详情'));
        }
    }
    
    addDetailSection(container, title, score, items) {
        const section = SecurityUtils.createSafeElement('div', '', { class: 'detail-section' });
        const sectionTitle = SecurityUtils.createSafeElement('h3', 
            `${title} (评分: ${(score || 0).toFixed(1)}/10)`
        );
        
        const grid = SecurityUtils.createSafeElement('div', '', { class: 'detail-grid' });
        
        Object.entries(items).forEach(([key, value]) => {
            const item = SecurityUtils.createSafeElement('div', '', { class: 'detail-item' });
            const label = SecurityUtils.createSafeElement('strong', `${key}:`);
            const valueSpan = SecurityUtils.createSafeElement('span', ` ${value}`);
            
            item.appendChild(label);
            item.appendChild(valueSpan);
            grid.appendChild(item);
        });
        
        section.appendChild(sectionTitle);
        section.appendChild(grid);
        container.appendChild(section);
    }

    showError(message) {
        const safeMessage = SecurityUtils.escapeHtml(message);
        SecurityUtils.safeLog('显示错误', safeMessage);
        
        // 创建安全的错误提示
        const errorDiv = SecurityUtils.createSafeElement('div', safeMessage, {
            class: 'error-message',
            style: 'background: #ffebee; color: #c62828; padding: 10px; border-radius: 5px; margin: 10px 0;'
        });
        
        // 找到合适的容器显示错误
        const container = document.getElementById('globalAiAnalysis') || document.body;
        container.insertBefore(errorDiv, container.firstChild);
        
        // 3秒后自动移除错误提示
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 3000);
    }

    // 其他方法保持不变，但都要使用安全的DOM操作
    async loadRegionalData() {
        // 实现类似的安全处理...
        SecurityUtils.safeLog('加载地区数据');
    }
    
    filterSpotsByRegion() {
        // 实现类似的安全处理...
        SecurityUtils.safeLog('过滤地区浪点', this.selectedRegion);
    }
}

// 全局函数 - 安全版本
function toggleCalibration() {
    try {
        if (window.app) {
            app.toggleCalibration();
        } else {
            SecurityUtils.safeLog('应用未初始化完成，请稍后重试');
        }
    } catch (error) {
        ErrorHandler.logError(error, '切换校准');
    }
}

// 等待依赖加载并启动应用
let app;

function checkDependencies() {
    try {
        if (typeof CONFIG !== 'undefined' && 
            typeof dataService !== 'undefined' && 
            typeof aiAnalyzer !== 'undefined' && 
            typeof UTILS !== 'undefined' &&
            typeof SecurityUtils !== 'undefined') {
            
            app = new SurfForecastAppV6();
            SecurityUtils.safeLog('✅ 安全版应用启动成功');
        } else {
            setTimeout(checkDependencies, 100);
        }
    } catch (error) {
        ErrorHandler.logError(error, '依赖检查');
        setTimeout(checkDependencies, 1000);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkDependencies);
} else {
    checkDependencies();
}