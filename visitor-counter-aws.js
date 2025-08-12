// AWS DynamoDB 访客统计系统
class AWSVisitorCounter {
    constructor() {
        this.apiEndpoint = 'https://your-api-gateway-url.amazonaws.com/prod/visitor-stats';
        this.fallbackCounter = new VisitorCounter(); // 本地备选方案
        this.useAWS = true;
        this.sessionKey = 'surf_forecast_session_aws';
        this.init();
    }

    init() {
        try {
            this.recordVisit();
            this.displayStats();
        } catch (error) {
            ErrorHandler.logError(error, 'AWS访客统计初始化');
            this.fallbackToLocal();
        }
    }

    // 记录访问 - AWS版本
    async recordVisit() {
        try {
            const sessionId = this.generateSessionId();
            const lastSession = localStorage.getItem(this.sessionKey);
            
            if (lastSession === sessionId) {
                return; // 同一会话，不重复计数
            }

            // 记录新会话
            localStorage.setItem(this.sessionKey, sessionId);

            if (this.useAWS) {
                await this.recordVisitAWS(sessionId);
            } else {
                this.fallbackCounter.recordVisit();
            }

        } catch (error) {
            ErrorHandler.logError(error, 'AWS访客记录');
            this.fallbackToLocal();
        }
    }

    // AWS DynamoDB 记录访问
    async recordVisitAWS(sessionId) {
        const visitData = {
            sessionId: sessionId,
            timestamp: Date.now(),
            date: new Date().toISOString().split('T')[0],
            userAgent: navigator.userAgent.substring(0, 200),
            referrer: document.referrer || 'direct',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        };

        const response = await fetch(this.apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': 'your-api-key-here' // 在实际部署时配置
            },
            body: JSON.stringify({
                action: 'record',
                data: visitData
            })
        });

        if (!response.ok) {
            throw new Error(`AWS API错误: ${response.status}`);
        }

        const result = await response.json();
        SecurityUtils.safeLog('AWS访客记录成功', {
            sessionId: sessionId.substring(0, 8),
            totalVisitors: result.totalVisitors
        });
    }

    // 获取AWS统计数据
    async getStatsAWS() {
        try {
            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': 'your-api-key-here'
                },
                body: JSON.stringify({
                    action: 'getStats',
                    days: 7
                })
            });

            if (!response.ok) {
                throw new Error(`AWS API错误: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            ErrorHandler.logError(error, 'AWS统计获取');
            return null;
        }
    }

    // 显示统计信息
    async displayStats() {
        let stats;
        
        if (this.useAWS) {
            stats = await this.getStatsAWS();
        }
        
        if (!stats) {
            // 使用本地备选方案
            stats = this.fallbackCounter.getStats();
            stats.source = 'local';
        } else {
            stats.source = 'aws';
        }

        this.updateVisitorDisplay(stats);
    }

    // 更新页面显示
    updateVisitorDisplay(stats) {
        // 更新访客统计面板
        this.updateVisitorPanel(stats);
        
        // 更新摘要显示
        const summary = this.getVisitorSummary(stats);
        const summaryElement = document.getElementById('visitorSummary');
        const footerElement = document.getElementById('footerVisitorStats');
        
        if (summaryElement) {
            summaryElement.textContent = summary;
        }
        if (footerElement) {
            footerElement.textContent = summary;
        }
    }

    // 更新访客统计面板
    updateVisitorPanel(stats) {
        const panelElement = document.getElementById('visitorStatsPanel');
        if (!panelElement) return;

        panelElement.innerHTML = '';

        // 创建统计卡片
        const statsCard = SecurityUtils.createSafeElement('div', '', { class: 'visitor-stats-card' });

        // 数据源指示器
        const sourceDiv = SecurityUtils.createSafeElement('div', '', { class: 'data-source-indicator' });
        const sourceIcon = stats.source === 'aws' ? '☁️' : '💾';
        const sourceText = stats.source === 'aws' ? 'AWS云端数据' : '本地存储数据';
        sourceDiv.textContent = `${sourceIcon} ${sourceText}`;
        statsCard.appendChild(sourceDiv);

        // 总访客数
        const totalDiv = SecurityUtils.createSafeElement('div', '', { class: 'stat-item total-visitors' });
        const totalLabel = SecurityUtils.createSafeElement('span', '总访客', { class: 'stat-label' });
        const totalValue = SecurityUtils.createSafeElement('span', this.formatNumber(stats.total || stats.totalVisitors || 0), { class: 'stat-value' });
        totalDiv.appendChild(totalLabel);
        totalDiv.appendChild(totalValue);

        // 今日访客数
        const todayDiv = SecurityUtils.createSafeElement('div', '', { class: 'stat-item today-visitors' });
        const todayLabel = SecurityUtils.createSafeElement('span', '今日访客', { class: 'stat-label' });
        const todayValue = SecurityUtils.createSafeElement('span', (stats.today || stats.todayVisitors || 0).toString(), { class: 'stat-value' });
        todayDiv.appendChild(todayLabel);
        todayDiv.appendChild(todayValue);

        statsCard.appendChild(totalDiv);
        statsCard.appendChild(todayDiv);

        // 7天趋势
        if (stats.recent7Days || stats.dailyStats) {
            const trendDiv = SecurityUtils.createSafeElement('div', '', { class: 'visitor-trend' });
            const trendTitle = SecurityUtils.createSafeElement('h4', '📈 7天访客趋势', { class: 'trend-title' });
            trendDiv.appendChild(trendTitle);

            const trendList = SecurityUtils.createSafeElement('div', '', { class: 'trend-list' });
            const dailyData = stats.recent7Days || stats.dailyStats || [];
            
            dailyData.forEach((day, index) => {
                const dayItem = SecurityUtils.createSafeElement('div', '', { class: 'trend-item' });
                const dayLabel = SecurityUtils.createSafeElement('span', day.label || `${index}天前`, { class: 'trend-label' });
                const dayValue = SecurityUtils.createSafeElement('span', (day.count || day.visitors || 0).toString(), { class: 'trend-value' });
                
                dayItem.appendChild(dayLabel);
                dayItem.appendChild(dayValue);
                trendList.appendChild(dayItem);
            });

            trendDiv.appendChild(trendList);
            statsCard.appendChild(trendDiv);
        }

        // 实时统计信息
        if (stats.source === 'aws') {
            const realtimeDiv = SecurityUtils.createSafeElement('div', '', { class: 'realtime-stats' });
            const realtimeTitle = SecurityUtils.createSafeElement('h4', '📊 实时统计', { class: 'trend-title' });
            realtimeDiv.appendChild(realtimeTitle);

            const realtimeInfo = SecurityUtils.createSafeElement('div', '', { class: 'realtime-info' });
            realtimeInfo.innerHTML = `
                <div class="realtime-item">🌍 全球访客统计</div>
                <div class="realtime-item">⚡ 实时数据同步</div>
                <div class="realtime-item">🔒 安全云端存储</div>
                <div class="realtime-item">📈 专业级分析</div>
            `;
            realtimeDiv.appendChild(realtimeInfo);
            statsCard.appendChild(realtimeDiv);
        }

        panelElement.appendChild(statsCard);
    }

    // 生成会话ID
    generateSessionId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2);
        return `aws_${timestamp}_${random}`;
    }

    // 格式化数字显示
    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    // 获取访客统计摘要
    getVisitorSummary(stats) {
        const total = stats.total || stats.totalVisitors || 0;
        const today = stats.today || stats.todayVisitors || 0;
        const source = stats.source === 'aws' ? '☁️' : '💾';
        return `${source} 总访客: ${this.formatNumber(total)} | 今日: ${today}`;
    }

    // 降级到本地存储
    fallbackToLocal() {
        this.useAWS = false;
        SecurityUtils.safeLog('降级到本地访客统计');
        this.fallbackCounter.displayStats();
    }

    // 测试AWS连接
    async testAWSConnection() {
        try {
            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': 'your-api-key-here'
                },
                body: JSON.stringify({
                    action: 'ping'
                })
            });

            return response.ok;
        } catch (error) {
            return false;
        }
    }

    // 导出AWS统计数据
    async exportAWSStats() {
        try {
            const stats = await this.getStatsAWS();
            if (!stats) {
                throw new Error('无法获取AWS统计数据');
            }

            const exportData = {
                exportDate: new Date().toISOString(),
                source: 'AWS DynamoDB',
                ...stats,
                version: 'v6.0-aws'
            };

            const dataStr = JSON.stringify(exportData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `surf-forecast-aws-stats-${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            
            SecurityUtils.safeLog('AWS统计数据已导出');
        } catch (error) {
            ErrorHandler.logError(error, 'AWS数据导出');
            // 降级到本地导出
            this.fallbackCounter.exportStats();
        }
    }
}

// 混合访客统计器 - 优先使用AWS，降级到本地
class HybridVisitorCounter {
    constructor() {
        this.awsCounter = new AWSVisitorCounter();
        this.localCounter = new VisitorCounter();
        this.preferAWS = true;
    }

    async init() {
        // 测试AWS连接
        const awsAvailable = await this.awsCounter.testAWSConnection();
        
        if (awsAvailable && this.preferAWS) {
            SecurityUtils.safeLog('使用AWS访客统计');
            return this.awsCounter;
        } else {
            SecurityUtils.safeLog('使用本地访客统计');
            return this.localCounter;
        }
    }

    // 获取当前活跃的计数器
    getActiveCounter() {
        return this.preferAWS ? this.awsCounter : this.localCounter;
    }
}

// 创建混合访客统计实例
const hybridVisitorCounter = new HybridVisitorCounter();