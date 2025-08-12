// 安全版数据服务 - 修复内存泄漏和日志注入
class SecureDataService extends ChinaCalibratedDataService {
    constructor() {
        super();
        this.cache = new SafeCacheManager(100, 30 * 60 * 1000);
        this.requestCount = 0;
        this.maxRequestsPerMinute = 60;
        this.requestTimestamps = [];
    }

    // 请求频率限制
    checkRateLimit() {
        const now = Date.now();
        const oneMinuteAgo = now - 60000;
        
        // 清理旧的时间戳
        this.requestTimestamps = this.requestTimestamps.filter(timestamp => timestamp > oneMinuteAgo);
        
        if (this.requestTimestamps.length >= this.maxRequestsPerMinute) {
            throw new Error('请求频率过高，请稍后重试');
        }
        
        this.requestTimestamps.push(now);
    }

    // 安全的数据获取
    async getAllData(coordinates, date) {
        try {
            // 检查请求频率
            this.checkRateLimit();
            
            // 验证输入参数
            if (!this.validateCoordinates(coordinates)) {
                throw new Error('无效的坐标参数');
            }
            
            if (!this.validateDate(date)) {
                throw new Error('无效的日期参数');
            }
            
            // 生成安全的缓存键
            const cacheKey = this.generateSafeCacheKey(coordinates, date);
            
            // 检查缓存
            const cached = this.cache.get(cacheKey);
            if (cached) {
                SecurityUtils.safeLog('使用缓存数据', { coordinates, date: date.toISOString() });
                return cached;
            }
            
            // 获取数据
            const data = await super.getAllData(coordinates, date);
            
            // 验证返回数据
            const validatedData = this.validateResponseData(data);
            
            // 存储到缓存
            this.cache.set(cacheKey, validatedData);
            
            SecurityUtils.safeLog('数据获取成功', { 
                coordinates, 
                date: date.toISOString(),
                source: validatedData.source 
            });
            
            return validatedData;
            
        } catch (error) {
            ErrorHandler.logError(error, '数据获取');
            throw error;
        }
    }

    // 验证坐标
    validateCoordinates(coordinates) {
        if (!coordinates || typeof coordinates !== 'object') return false;
        
        const { lat, lng } = coordinates;
        
        // 检查纬度范围 (中国海域大致范围)
        if (typeof lat !== 'number' || lat < 18 || lat > 54) return false;
        
        // 检查经度范围
        if (typeof lng !== 'number' || lng < 73 || lng > 135) return false;
        
        return true;
    }

    // 验证日期
    validateDate(date) {
        if (!(date instanceof Date) || isNaN(date.getTime())) return false;
        
        const now = new Date();
        const maxFutureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7天后
        const minPastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 1天前
        
        return date >= minPastDate && date <= maxFutureDate;
    }

    // 生成安全的缓存键
    generateSafeCacheKey(coordinates, date) {
        const latStr = coordinates.lat.toFixed(4);
        const lngStr = coordinates.lng.toFixed(4);
        const dateStr = date.toISOString().split('T')[0];
        
        return `data_${latStr}_${lngStr}_${dateStr}`;
    }

    // 验证响应数据
    validateResponseData(data) {
        if (!data || typeof data !== 'object') {
            throw new Error('无效的响应数据');
        }

        // 验证必需字段
        const requiredFields = ['windy', 'weather', 'ocean'];
        for (const field of requiredFields) {
            if (!data[field]) {
                throw new Error(`缺少必需字段: ${field}`);
            }
        }

        // 验证数值范围
        const windyData = data.windy;
        if (windyData.waveHeight < 0 || windyData.waveHeight > 20) {
            SecurityUtils.safeLog('异常浪高数据', windyData.waveHeight);
            windyData.waveHeight = Math.max(0.1, Math.min(10, windyData.waveHeight));
        }

        if (windyData.windSpeed < 0 || windyData.windSpeed > 100) {
            SecurityUtils.safeLog('异常风速数据', windyData.windSpeed);
            windyData.windSpeed = Math.max(0, Math.min(50, windyData.windSpeed));
        }

        // 清理字符串字段
        if (data.weather.condition) {
            data.weather.condition = SecurityUtils.escapeHtml(data.weather.condition);
        }

        return data;
    }

    // 安全的日志记录
    logDataSource(source, region) {
        const safeSource = SecurityUtils.escapeHtml(String(source));
        const safeRegion = SecurityUtils.escapeHtml(String(region));
        
        SecurityUtils.safeLog('数据源信息', {
            source: safeSource,
            region: safeRegion,
            timestamp: new Date().toISOString()
        });
    }

    // 获取缓存统计
    getCacheStats() {
        return {
            size: this.cache.size(),
            maxSize: this.cache.maxSize,
            requestCount: this.requestCount,
            requestsInLastMinute: this.requestTimestamps.length
        };
    }

    // 清理缓存
    clearCache() {
        this.cache.clear();
        SecurityUtils.safeLog('缓存已清理');
    }
}

// Windy API集成 - 安全版本
class WindyAPIService {
    constructor() {
        this.apiKey = 'YOUR_WINDY_API_KEY';
        this.baseUrl = 'https://api.windy.com/api/point-forecast/v2';
        this.cache = new SafeCacheManager(50, 60 * 60 * 1000); // 1小时缓存
    }

    // 检查API配置
    isConfigured() {
        return this.apiKey && this.apiKey !== 'YOUR_WINDY_API_KEY';
    }

    // 获取Windy数据
    async getWindyData(coordinates, date) {
        try {
            if (!this.isConfigured()) {
                SecurityUtils.safeLog('Windy API未配置，使用模拟数据');
                return this.generateSimulatedWindyData(coordinates, date);
            }

            // 验证输入
            if (!this.validateCoordinates(coordinates)) {
                throw new Error('无效的坐标');
            }

            const cacheKey = `windy_${coordinates.lat.toFixed(4)}_${coordinates.lng.toFixed(4)}_${date.toDateString()}`;
            const cached = this.cache.get(cacheKey);
            if (cached) return cached;

            // 构建安全的API请求
            const requestData = {
                lat: parseFloat(coordinates.lat.toFixed(4)),
                lon: parseFloat(coordinates.lng.toFixed(4)),
                model: 'gfs',
                parameters: ['wind', 'wave', 'temp'],
                levels: ['surface'],
                key: this.apiKey
            };

            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestData)
            });

            if (!response.ok) {
                throw new Error(`Windy API请求失败: ${response.status}`);
            }

            const data = await response.json();
            const processedData = this.processWindyResponse(data);
            
            this.cache.set(cacheKey, processedData);
            
            SecurityUtils.safeLog('Windy数据获取成功', {
                coordinates,
                dataPoints: processedData.hourly?.waveHeight?.length || 0
            });

            return processedData;

        } catch (error) {
            ErrorHandler.logError(error, 'Windy API');
            return this.generateSimulatedWindyData(coordinates, date);
        }
    }

    // 处理Windy API响应
    processWindyResponse(data) {
        if (!data || !data.data) {
            throw new Error('无效的Windy API响应');
        }

        // 安全处理数据
        const processedData = {
            waveHeight: this.validateNumericArray(data.data.waves_height, 0.1, 10),
            wavePeriod: this.validateNumericArray(data.data.waves_period, 3, 20),
            waveDirection: this.validateNumericArray(data.data.waves_direction, 0, 360),
            windSpeed: this.validateNumericArray(data.data.wind_speed, 0, 50),
            windDirection: this.validateNumericArray(data.data.wind_direction, 0, 360),
            timestamp: Date.now(),
            source: 'Windy API'
        };

        return processedData;
    }

    // 验证数值数组
    validateNumericArray(arr, min, max) {
        if (!Array.isArray(arr)) return [];
        
        return arr.map(val => {
            const num = parseFloat(val);
            if (isNaN(num)) return (min + max) / 2;
            return Math.max(min, Math.min(max, num));
        });
    }

    // 生成模拟Windy数据
    generateSimulatedWindyData(coordinates, date) {
        const month = date.getMonth() + 1;
        const isWinter = month >= 11 || month <= 2;
        
        // 基于地理位置的季节性调整
        const baseWave = coordinates.lat > 30 ? 
            (isWinter ? 1.5 : 1.0) : 
            (isWinter ? 1.2 : 0.8);
        
        const hourlyData = [];
        for (let i = 0; i < 24; i++) {
            hourlyData.push({
                waveHeight: Math.max(0.1, baseWave + (Math.random() - 0.5) * 0.6),
                windSpeed: Math.max(2, 8 + (Math.random() - 0.5) * 8),
                windDirection: 180 + (Math.random() - 0.5) * 90
            });
        }

        return {
            waveHeight: hourlyData.map(h => Math.round(h.waveHeight * 10) / 10),
            windSpeed: hourlyData.map(h => Math.round(h.windSpeed * 10) / 10),
            windDirection: hourlyData.map(h => Math.round(h.windDirection)),
            timestamp: Date.now(),
            source: 'Simulated Data'
        };
    }

    validateCoordinates(coordinates) {
        return coordinates && 
               typeof coordinates.lat === 'number' && 
               typeof coordinates.lng === 'number' &&
               coordinates.lat >= -90 && coordinates.lat <= 90 &&
               coordinates.lng >= -180 && coordinates.lng <= 180;
    }
}

// 集成Windy Point Forecast API
class EnhancedSecureDataService extends SecureDataService {
    constructor() {
        super();
        this.windyPointAPI = new WindyPointForecastAPI();
        this.dataSourcePriority = ['windy', 'simulation'];
    }

    // 获取增强的海洋数据
    async getAllData(coordinates, date) {
        try {
            this.checkRateLimit();
            
            if (!this.validateCoordinates(coordinates) || !this.validateDate(date)) {
                throw new Error('无效的输入参数');
            }

            const cacheKey = this.generateSafeCacheKey(coordinates, date);
            const cached = this.cache.get(cacheKey);
            if (cached) {
                SecurityUtils.safeLog('使用缓存数据');
                return cached;
            }

            // 优先使用Windy Point Forecast API
            let data = null;
            
            if (this.windyPointAPI.isConfigured()) {
                SecurityUtils.safeLog('尝试使用Windy Point Forecast API');
                data = await this.windyPointAPI.getSurfForecast(coordinates, 48);
                
                if (data) {
                    SecurityUtils.safeLog('Windy数据获取成功');
                    // 如果启用中国校准，进行数据校准
                    if (this.enableChinaCalibration) {
                        data = await this.applyChinaCalibration(data, coordinates, date);
                    }
                } else {
                    SecurityUtils.safeLog('Windy API失败，使用备选方案');
                }
            }
            
            // 备选方案：使用原有的数据获取方法
            if (!data) {
                SecurityUtils.safeLog('使用模拟数据');
                data = await super.getAllData(coordinates, date);
            }

            const validatedData = this.validateResponseData(data);
            this.cache.set(cacheKey, validatedData);
            
            return validatedData;
            
        } catch (error) {
            ErrorHandler.logError(error, '增强数据获取');
            throw error;
        }
    }

    // 应用中国数据校准
    async applyChinaCalibration(windyData, coordinates, date) {
        try {
            const spotId = this.getSpotIdFromCoordinates(coordinates);
            if (spotId && typeof chinaMarineScraper !== 'undefined') {
                const chinaData = await chinaMarineScraper.getChinaMarineData(spotId, date);
                if (chinaData) {
                    return chinaMarineScraper.calibrateWithChinaData(windyData, chinaData);
                }
            }
            return windyData;
        } catch (error) {
            ErrorHandler.logError(error, '中国数据校准');
            return windyData;
        }
    }

    // 获取数据源状态
    getDataSourceStatus() {
        return {
            windy: {
                configured: this.windyPointAPI.isConfigured(),
                stats: this.windyPointAPI.getAPIStats()
            },
            cache: this.getCacheStats(),
            calibration: {
                enabled: this.enableChinaCalibration
            }
        };
    }
}

// 创建增强的安全数据服务实例
const secureDataService = new EnhancedSecureDataService();

// 保持向后兼容
const dataService = secureDataService;