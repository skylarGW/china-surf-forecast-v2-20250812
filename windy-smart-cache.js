// Windy智能缓存管理 - 免费模式优化
class WindySmartCache extends WindyPointForecastAPI {
    constructor() {
        super();
        this.freeMode = true;
        this.dailyRequestCount = 0;
        this.maxDailyRequests = 25; // 保守设置
        this.updateInterval = 4 * 60 * 60 * 1000; // 4小时更新
        this.cache = new SafeCacheManager(20, 6 * 60 * 60 * 1000); // 6小时缓存
        this.lastRequestDate = null;
        this.prioritySpots = ['dongsha', 'shilaoren']; // 优先更新的热门浪点
    }

    // 检查是否可以发起请求
    canMakeRequest() {
        const today = new Date().toDateString();
        
        // 重置每日计数
        if (this.lastRequestDate !== today) {
            this.dailyRequestCount = 0;
            this.lastRequestDate = today;
        }

        return this.dailyRequestCount < this.maxDailyRequests;
    }

    // 智能获取数据
    async getSurfForecast(coordinates, hours = 48) {
        const cacheKey = `windy_${coordinates.lat.toFixed(4)}_${coordinates.lng.toFixed(4)}`;
        
        // 检查缓存
        const cached = this.cache.get(cacheKey);
        if (cached) {
            SecurityUtils.safeLog('使用Windy缓存数据', {
                age: Math.round((Date.now() - cached.timestamp) / 60000) + '分钟'
            });
            return cached;
        }

        // 检查请求限制
        if (!this.canMakeRequest()) {
            SecurityUtils.safeLog('达到每日请求限制，使用模拟数据');
            return this.generateFallbackData(coordinates);
        }

        try {
            // 发起API请求
            const data = await super.getSurfForecast(coordinates, hours);
            if (data) {
                this.dailyRequestCount++;
                SecurityUtils.safeLog('Windy API请求成功', {
                    dailyCount: this.dailyRequestCount,
                    remaining: this.maxDailyRequests - this.dailyRequestCount
                });
                return data;
            }
        } catch (error) {
            ErrorHandler.logError(error, 'Windy API请求');
        }

        // 降级到模拟数据
        return this.generateFallbackData(coordinates);
    }

    // 批量更新策略
    async batchUpdateSpots(spotCoordinates) {
        const results = [];
        const availableRequests = this.maxDailyRequests - this.dailyRequestCount;
        
        // 优先更新热门浪点
        const sortedSpots = this.prioritizeSpots(spotCoordinates);
        const spotsToUpdate = sortedSpots.slice(0, availableRequests);
        
        SecurityUtils.safeLog('批量更新Windy数据', {
            totalSpots: spotCoordinates.length,
            willUpdate: spotsToUpdate.length,
            availableRequests: availableRequests
        });

        for (const spot of spotsToUpdate) {
            const data = await this.getSurfForecast(spot.coordinates);
            results.push({ spot, data });
            
            // 避免请求过快
            await this.delay(1000);
        }

        return results;
    }

    // 浪点优先级排序
    prioritizeSpots(spots) {
        return spots.sort((a, b) => {
            const aPriority = this.prioritySpots.includes(a.id) ? 1 : 0;
            const bPriority = this.prioritySpots.includes(b.id) ? 1 : 0;
            return bPriority - aPriority;
        });
    }

    // 生成降级数据
    generateFallbackData(coordinates) {
        const month = new Date().getMonth() + 1;
        const isWinter = month >= 11 || month <= 2;
        
        // 基于地理位置的智能模拟
        const baseWave = coordinates.lat > 30 ? 
            (isWinter ? 1.5 : 1.0) : 
            (isWinter ? 1.2 : 0.8);

        return {
            waveHeight: Math.max(0.3, baseWave + (Math.random() - 0.5) * 0.6),
            wavePeriod: 8 + Math.random() * 4,
            waveDirection: 180 + (Math.random() - 0.5) * 60,
            windSpeed: Math.max(5, 10 + (Math.random() - 0.5) * 8),
            windDirection: 180 + (Math.random() - 0.5) * 90,
            temperature: isWinter ? 15 + Math.random() * 10 : 20 + Math.random() * 8,
            source: 'Smart Simulation',
            timestamp: Date.now()
        };
    }

    // 延迟函数
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // 获取使用统计
    getUsageStats() {
        const today = new Date().toDateString();
        if (this.lastRequestDate !== today) {
            this.dailyRequestCount = 0;
        }

        return {
            dailyUsed: this.dailyRequestCount,
            dailyLimit: this.maxDailyRequests,
            remaining: this.maxDailyRequests - this.dailyRequestCount,
            cacheSize: this.cache.size(),
            updateInterval: this.updateInterval / (60 * 60 * 1000) + '小时'
        };
    }

    // 动态调整更新频率
    adjustUpdateFrequency() {
        const stats = this.getUsageStats();
        const hour = new Date().getHours();
        
        // 保持稳定的4小时更新频率
        if (hour >= 6 && hour <= 22) {
            // 白天正常更新
            this.updateInterval = 4 * 60 * 60 * 1000; // 4小时
        } else {
            // 夜间降低频率
            this.updateInterval = 8 * 60 * 60 * 1000; // 8小时
        }

        SecurityUtils.safeLog('调整更新频率', {
            newInterval: this.updateInterval / (60 * 60 * 1000) + '小时',
            remaining: stats.remaining
        });
    }
}

// 创建智能缓存实例
const windySmartCache = new WindySmartCache();