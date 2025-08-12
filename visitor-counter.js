// 访客统计系统 - 轻量级本地存储版本
class VisitorCounter {
    constructor() {
        this.storageKey = 'surf_forecast_visitors';
        this.sessionKey = 'surf_forecast_session';
        this.dailyKey = 'surf_forecast_daily';
        this.init();
    }

    init() {
        try {
            this.recordVisit();
            this.displayStats();
            this.startDailyReset();
        } catch (error) {
            ErrorHandler.logError(error, '访客统计初始化');
        }
    }

    // 记录访问
    recordVisit() {
        const now = new Date();
        const today = now.toDateString();
        const sessionId = this.generateSessionId();

        // 检查是否为新会话
        const lastSession = localStorage.getItem(this.sessionKey);
        if (lastSession === sessionId) {
            return; // 同一会话，不重复计数
        }

        // 记录新会话
        localStorage.setItem(this.sessionKey, sessionId);

        // 获取总访客数
        let totalVisitors = parseInt(localStorage.getItem(this.storageKey) || '0');
        totalVisitors++;
        localStorage.setItem(this.storageKey, totalVisitors.toString());

        // 获取今日访客数
        const dailyData = JSON.parse(localStorage.getItem(this.dailyKey) || '{}');
        if (!dailyData[today]) {
            dailyData[today] = 0;
        }
        dailyData[today]++;
        
        // 只保留最近7天的数据
        this.cleanOldDailyData(dailyData);
        localStorage.setItem(this.dailyKey, JSON.stringify(dailyData));

        SecurityUtils.safeLog('访客记录', {
            total: totalVisitors,
            today: dailyData[today],
            session: sessionId.substring(0, 8)
        });
    }

    // 生成会话ID
    generateSessionId() {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2);
        return `${timestamp}_${random}`;
    }

    // 清理旧的每日数据
    cleanOldDailyData(dailyData) {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        Object.keys(dailyData).forEach(date => {
            if (new Date(date) < sevenDaysAgo) {
                delete dailyData[date];
            }
        });
    }

    // 显示统计信息
    displayStats() {
        const stats = this.getStats();
        this.updateVisitorDisplay(stats);
    }

    // 获取统计数据
    getStats() {
        const totalVisitors = parseInt(localStorage.getItem(this.storageKey) || '0');
        const dailyData = JSON.parse(localStorage.getItem(this.dailyKey) || '{}');
        const today = new Date().toDateString();
        const todayVisitors = dailyData[today] || 0;

        return {
            total: totalVisitors,
            today: todayVisitors,
            recent7Days: this.getRecent7DaysStats(dailyData)
        };
    }

    // 获取最近7天统计
    getRecent7DaysStats(dailyData) {
        const stats = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toDateString();
            const count = dailyData[dateStr] || 0;
            
            stats.push({
                date: dateStr,
                count: count,
                label: i === 0 ? '今天' : i === 1 ? '昨天' : `${i}天前`
            });
        }
        return stats;
    }

    // 更新页面显示
    updateVisitorDisplay(stats) {
        // 更新总访客数
        const totalElement = document.getElementById('totalVisitors');
        if (totalElement) {
            totalElement.textContent = this.formatNumber(stats.total);
        }

        // 更新今日访客数
        const todayElement = document.getElementById('todayVisitors');
        if (todayElement) {
            todayElement.textContent = stats.today;
        }

        // 更新访客统计面板
        this.updateVisitorPanel(stats);
    }

    // 更新访客统计面板
    updateVisitorPanel(stats) {
        const panelElement = document.getElementById('visitorStatsPanel');
        if (!panelElement) return;

        panelElement.innerHTML = '';

        // 创建统计卡片
        const statsCard = SecurityUtils.createSafeElement('div', '', { class: 'visitor-stats-card' });

        // 总访客数
        const totalDiv = SecurityUtils.createSafeElement('div', '', { class: 'stat-item total-visitors' });
        const totalLabel = SecurityUtils.createSafeElement('span', '总访客', { class: 'stat-label' });
        const totalValue = SecurityUtils.createSafeElement('span', this.formatNumber(stats.total), { class: 'stat-value' });
        totalDiv.appendChild(totalLabel);
        totalDiv.appendChild(totalValue);

        // 今日访客数
        const todayDiv = SecurityUtils.createSafeElement('div', '', { class: 'stat-item today-visitors' });
        const todayLabel = SecurityUtils.createSafeElement('span', '今日访客', { class: 'stat-label' });
        const todayValue = SecurityUtils.createSafeElement('span', stats.today.toString(), { class: 'stat-value' });
        todayDiv.appendChild(todayLabel);
        todayDiv.appendChild(todayValue);

        statsCard.appendChild(totalDiv);
        statsCard.appendChild(todayDiv);

        // 7天趋势
        const trendDiv = SecurityUtils.createSafeElement('div', '', { class: 'visitor-trend' });
        const trendTitle = SecurityUtils.createSafeElement('h4', '📈 7天访客趋势', { class: 'trend-title' });
        trendDiv.appendChild(trendTitle);

        const trendList = SecurityUtils.createSafeElement('div', '', { class: 'trend-list' });
        stats.recent7Days.forEach(day => {
            const dayItem = SecurityUtils.createSafeElement('div', '', { class: 'trend-item' });
            const dayLabel = SecurityUtils.createSafeElement('span', day.label, { class: 'trend-label' });
            const dayValue = SecurityUtils.createSafeElement('span', day.count.toString(), { class: 'trend-value' });
            
            dayItem.appendChild(dayLabel);
            dayItem.appendChild(dayValue);
            trendList.appendChild(dayItem);
        });

        trendDiv.appendChild(trendList);
        statsCard.appendChild(trendDiv);
        panelElement.appendChild(statsCard);
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

    // 每日重置检查
    startDailyReset() {
        // 每小时检查一次是否需要重置
        setInterval(() => {
            this.checkDailyReset();
        }, 60 * 60 * 1000);
    }

    // 检查是否需要每日重置
    checkDailyReset() {
        const lastResetDate = localStorage.getItem('last_reset_date');
        const today = new Date().toDateString();
        
        if (lastResetDate !== today) {
            localStorage.setItem('last_reset_date', today);
            this.displayStats(); // 刷新显示
        }
    }

    // 获取访客统计摘要（用于页脚显示）
    getVisitorSummary() {
        const stats = this.getStats();
        return `👥 总访客: ${this.formatNumber(stats.total)} | 今日: ${stats.today}`;
    }

    // 重置统计数据（管理员功能）
    resetStats() {
        if (confirm('确定要重置访客统计吗？此操作不可恢复。')) {
            localStorage.removeItem(this.storageKey);
            localStorage.removeItem(this.dailyKey);
            localStorage.removeItem(this.sessionKey);
            localStorage.removeItem('last_reset_date');
            
            SecurityUtils.safeLog('访客统计已重置');
            this.displayStats();
        }
    }

    // 导出统计数据
    exportStats() {
        const stats = this.getStats();
        const exportData = {
            exportDate: new Date().toISOString(),
            totalVisitors: stats.total,
            todayVisitors: stats.today,
            recent7Days: stats.recent7Days,
            version: 'v6.0'
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `surf-forecast-stats-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        SecurityUtils.safeLog('统计数据已导出');
    }
}

// 创建全局访客统计实例
const visitorCounter = new VisitorCounter();