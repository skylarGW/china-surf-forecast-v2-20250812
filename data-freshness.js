// 数据新鲜度管理器
class DataFreshnessManager {
    constructor() {
        this.lastUpdateTime = null;
        this.dataSource = 'unknown';
        this.updateInterval = 4 * 60 * 60 * 1000; // 4小时
    }

    // 更新数据时间戳
    updateTimestamp(source = 'windy') {
        this.lastUpdateTime = Date.now();
        this.dataSource = source;
        this.displayFreshness();
        
        SecurityUtils.safeLog('数据时间戳已更新', {
            source: source,
            time: new Date(this.lastUpdateTime).toLocaleString('zh-CN')
        });
    }

    // 显示数据新鲜度
    displayFreshness() {
        const timeElement = document.getElementById('lastUpdateTime');
        const statusElement = document.getElementById('freshnessStatus');
        
        if (!timeElement || !statusElement) return;

        if (!this.lastUpdateTime) {
            timeElement.textContent = '加载中...';
            statusElement.textContent = '🔄';
            return;
        }

        const now = Date.now();
        const ageMinutes = Math.floor((now - this.lastUpdateTime) / (60 * 1000));
        const ageHours = Math.floor(ageMinutes / 60);
        
        // 格式化显示时间
        let timeText = '';
        let statusIcon = '';
        let statusClass = '';

        if (ageMinutes < 1) {
            timeText = '刚刚更新';
            statusIcon = '✅';
            statusClass = 'freshness-fresh';
        } else if (ageMinutes < 60) {
            timeText = `${ageMinutes}分钟前`;
            statusIcon = '✅';
            statusClass = 'freshness-fresh';
        } else if (ageHours < 4) {
            timeText = `${ageHours}小时前`;
            statusIcon = '✅';
            statusClass = 'freshness-fresh';
        } else if (ageHours < 8) {
            timeText = `${ageHours}小时前`;
            statusIcon = '⚠️';
            statusClass = 'freshness-stale';
        } else {
            timeText = `${ageHours}小时前`;
            statusIcon = '❌';
            statusClass = 'freshness-old';
        }

        // 添加数据源信息
        const sourceText = this.getSourceText(this.dataSource);
        timeText += ` (${sourceText})`;

        timeElement.textContent = timeText;
        statusElement.textContent = statusIcon;
        statusElement.className = `freshness-status ${statusClass}`;
    }

    // 获取数据源显示文本
    getSourceText(source) {
        const sourceMap = {
            'windy': 'Windy API',
            'simulation': '模拟数据',
            'china': '中国校准',
            'cache': '缓存数据',
            'unknown': '未知来源'
        };
        return sourceMap[source] || source;
    }

    // 获取数据新鲜度状态
    getFreshnessStatus() {
        if (!this.lastUpdateTime) return 'loading';

        const ageHours = (Date.now() - this.lastUpdateTime) / (60 * 60 * 1000);
        
        if (ageHours < 4) return 'fresh';
        if (ageHours < 8) return 'stale';
        return 'old';
    }

    // 检查是否需要更新
    needsUpdate() {
        if (!this.lastUpdateTime) return true;
        
        const age = Date.now() - this.lastUpdateTime;
        return age > this.updateInterval;
    }

    // 启动定时更新显示
    startPeriodicUpdate() {
        // 每分钟更新一次显示
        setInterval(() => {
            this.displayFreshness();
        }, 60000);
    }

    // 获取详细的新鲜度信息
    getDetailedInfo() {
        if (!this.lastUpdateTime) {
            return {
                status: 'loading',
                message: '数据加载中...',
                age: 0,
                source: this.dataSource
            };
        }

        const age = Date.now() - this.lastUpdateTime;
        const ageMinutes = Math.floor(age / (60 * 1000));
        const ageHours = Math.floor(ageMinutes / 60);
        
        let status, message;
        
        if (ageHours < 4) {
            status = 'fresh';
            message = '数据新鲜，预测准确';
        } else if (ageHours < 8) {
            status = 'stale';
            message = '数据稍旧，建议刷新';
        } else {
            status = 'old';
            message = '数据较旧，请刷新页面';
        }

        return {
            status: status,
            message: message,
            age: age,
            ageText: ageHours > 0 ? `${ageHours}小时前` : `${ageMinutes}分钟前`,
            source: this.dataSource,
            lastUpdate: new Date(this.lastUpdateTime).toLocaleString('zh-CN')
        };
    }

    // 手动刷新数据
    async refreshData() {
        try {
            const statusElement = document.getElementById('freshnessStatus');
            if (statusElement) {
                statusElement.textContent = '🔄';
                statusElement.className = 'freshness-status';
            }

            // 触发数据重新加载
            if (window.app && typeof window.app.loadData === 'function') {
                await window.app.loadData();
            }

            SecurityUtils.safeLog('手动刷新数据完成');
        } catch (error) {
            ErrorHandler.logError(error, '手动刷新数据');
        }
    }
}

// 创建全局数据新鲜度管理器
const dataFreshnessManager = new DataFreshnessManager();