// Windy Point Forecast API 专用服务 - 冲浪预测优化版
class WindyPointForecastAPI {
    constructor() {
        this.apiKey = 'YOUR_WINDY_POINT_FORECAST_API_KEY';
        this.baseUrl = 'https://api.windy.com/api/point-forecast/v2';
        this.cache = new SafeCacheManager(50, 60 * 60 * 1000); // 1小时缓存
        
        // 冲浪相关的关键参数
        this.surfParameters = [
            'wind',           // 风速风向 (必需)
            'waves',          // 海浪数据 (核心)
            'temp',           // 气温
            'dewpoint',       // 露点
            'rh',             // 相对湿度
            'pressure',       // 气压
            'cloudcover',     // 云量
            'visibility',     // 能见度
            'gust',           // 阵风
            'cape'            // 对流有效位能
        ];
        
        // 数据层级 (海面数据)
        this.levels = ['surface'];
        
        // 预测模型 (GFS全球模型，最适合海洋预测)
        this.model = 'gfs';
    }

    // 检查API配置
    isConfigured() {
        return this.apiKey && this.apiKey !== 'YOUR_WINDY_POINT_FORECAST_API_KEY';
    }

    // 获取冲浪预测数据
    async getSurfForecast(coordinates, hours = 48) {
        try {
            if (!this.isConfigured()) {
                SecurityUtils.safeLog('Windy Point Forecast API未配置');
                return null;
            }

            // 验证坐标
            if (!this.validateCoordinates(coordinates)) {
                throw new Error('无效的坐标参数');
            }

            const cacheKey = `windy_point_${coordinates.lat.toFixed(4)}_${coordinates.lng.toFixed(4)}_${hours}h`;
            const cached = this.cache.get(cacheKey);
            if (cached) {
                SecurityUtils.safeLog('使用Windy缓存数据');
                return cached;
            }

            // 构建API请求
            const requestPayload = {
                lat: parseFloat(coordinates.lat.toFixed(6)),
                lon: parseFloat(coordinates.lng.toFixed(6)),
                model: this.model,
                parameters: this.surfParameters,
                levels: this.levels,
                key: this.apiKey
            };

            SecurityUtils.safeLog('请求Windy Point Forecast数据', {
                lat: requestPayload.lat,
                lon: requestPayload.lon,
                parameters: this.surfParameters.length
            });

            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'China-Surf-Forecast/1.0'
                },
                body: JSON.stringify(requestPayload)
            });

            if (!response.ok) {
                throw new Error(`Windy API请求失败: ${response.status} ${response.statusText}`);
            }

            const rawData = await response.json();
            const processedData = this.processSurfData(rawData, coordinates);
            
            // 缓存处理后的数据
            this.cache.set(cacheKey, processedData);
            
            SecurityUtils.safeLog('Windy数据获取成功', {
                dataPoints: processedData.hourly?.waveHeight?.length || 0,
                source: 'Windy Point Forecast API'
            });

            return processedData;

        } catch (error) {
            ErrorHandler.logError(error, 'Windy Point Forecast API');
            return null;
        }
    }

    // 处理冲浪数据
    processSurfData(rawData, coordinates) {
        if (!rawData || !rawData.data) {
            throw new Error('Windy API返回无效数据');
        }

        const data = rawData.data;
        const timestamps = rawData.timestamps || [];
        
        // 提取当前时刻数据 (第一个时间点)
        const currentData = this.extractCurrentConditions(data, 0);
        
        // 提取24小时预测数据
        const hourlyData = this.extractHourlyData(data, timestamps);
        
        // 生成潮汐数据 (Windy不提供潮汐，需要估算)
        const tideData = this.generateTideEstimate(coordinates, new Date());

        return {
            // 当前条件
            windy: {
                waveHeight: currentData.waveHeight,
                wavePeriod: currentData.wavePeriod,
                waveDirection: currentData.waveDirection,
                swellHeight: currentData.swellHeight,
                swellPeriod: currentData.swellPeriod,
                swellDirection: currentData.swellDirection,
                windSpeed: currentData.windSpeed,
                windDirection: currentData.windDirection,
                windGust: currentData.windGust
            },
            
            // 天气条件
            weather: {
                temperature: currentData.temperature,
                humidity: currentData.humidity,
                pressure: currentData.pressure,
                visibility: currentData.visibility,
                cloudCover: currentData.cloudCover,
                condition: this.getWeatherCondition(currentData)
            },
            
            // 海洋条件
            ocean: {
                waterTemperature: currentData.seaTemperature,
                tideHeight: tideData.currentHeight,
                tideLevel: tideData.currentLevel,
                currentSpeed: 0.5, // 估算值
                currentDirection: 90,
                seaState: this.calculateSeaState(currentData.waveHeight)
            },
            
            // 24小时数据
            hourly: hourlyData,
            
            // 潮汐时间表
            tideSchedule: tideData.schedule,
            
            // 元数据
            timestamp: Date.now(),
            source: 'Windy Point Forecast API',
            model: this.model,
            coordinates: coordinates
        };
    }

    // 提取当前条件
    extractCurrentConditions(data, index = 0) {
        return {
            // 海浪数据
            waveHeight: this.safeGetValue(data['waves-height'], index, 1.0),
            wavePeriod: this.safeGetValue(data['waves-period'], index, 8.0),
            waveDirection: this.safeGetValue(data['waves-direction'], index, 180),
            swellHeight: this.safeGetValue(data['waves-swell'], index, 0.8),
            swellPeriod: this.safeGetValue(data['waves-swellPeriod'], index, 10.0),
            swellDirection: this.safeGetValue(data['waves-swellDirection'], index, 180),
            
            // 风力数据
            windSpeed: this.convertToKnots(this.safeGetValue(data['wind-surface'], index, 10)),
            windDirection: this.safeGetValue(data['winddir-surface'], index, 180),
            windGust: this.convertToKnots(this.safeGetValue(data['gust-surface'], index, 12)),
            
            // 气象数据
            temperature: this.safeGetValue(data['temp-surface'], index, 20),
            humidity: this.safeGetValue(data['rh-surface'], index, 70),
            pressure: this.safeGetValue(data['pressure-surface'], index, 1013),
            visibility: this.safeGetValue(data['visibility-surface'], index, 10),
            cloudCover: this.safeGetValue(data['cloudcover-surface'], index, 50),
            
            // 海水温度 (如果有的话，否则基于气温估算)
            seaTemperature: this.estimateSeaTemperature(
                this.safeGetValue(data['temp-surface'], index, 20),
                new Date().getMonth() + 1
            )
        };
    }

    // 提取24小时数据
    extractHourlyData(data, timestamps) {
        const hours = Math.min(24, timestamps.length);
        const hourlyData = {
            waveHeight: [],
            windWave: [],
            swell: [],
            windSpeed: [],
            windGust: [],
            windDirection: [],
            tideHeight: [],
            temperature: [],
            pressure: []
        };

        for (let i = 0; i < hours; i++) {
            const waveHeight = this.safeGetValue(data['waves-height'], i, 1.0);
            const swellHeight = this.safeGetValue(data['waves-swell'], i, 0.8);
            const windWave = Math.max(0, waveHeight - swellHeight);

            hourlyData.waveHeight.push(Math.round(waveHeight * 10) / 10);
            hourlyData.windWave.push(Math.round(windWave * 10) / 10);
            hourlyData.swell.push(Math.round(swellHeight * 10) / 10);
            hourlyData.windSpeed.push(Math.round(this.convertToKnots(this.safeGetValue(data['wind-surface'], i, 10)) * 10) / 10);
            hourlyData.windGust.push(Math.round(this.convertToKnots(this.safeGetValue(data['gust-surface'], i, 12)) * 10) / 10);
            hourlyData.windDirection.push(Math.round(this.safeGetValue(data['winddir-surface'], i, 180)));
            hourlyData.temperature.push(Math.round(this.safeGetValue(data['temp-surface'], i, 20) * 10) / 10);
            hourlyData.pressure.push(Math.round(this.safeGetValue(data['pressure-surface'], i, 1013)));
            
            // 估算潮汐高度 (基于时间的正弦波)
            hourlyData.tideHeight.push(Math.round((2.0 + Math.sin(i * Math.PI / 6) * 1.5) * 10) / 10);
        }

        return hourlyData;
    }

    // 安全获取数值
    safeGetValue(array, index, defaultValue) {
        if (!Array.isArray(array) || index >= array.length || array[index] == null) {
            return defaultValue;
        }
        
        const value = parseFloat(array[index]);
        return isNaN(value) ? defaultValue : value;
    }

    // 转换为节 (m/s to knots)
    convertToKnots(mps) {
        return mps * 1.94384;
    }

    // 估算海水温度
    estimateSeaTemperature(airTemp, month) {
        // 海水温度通常比气温低2-5度，冬季差异更大
        const isWinter = month >= 11 || month <= 2;
        const tempDiff = isWinter ? 5 : 3;
        return Math.max(5, airTemp - tempDiff);
    }

    // 计算海况等级
    calculateSeaState(waveHeight) {
        if (waveHeight < 0.5) return 1; // 平静
        if (waveHeight < 1.0) return 2; // 轻浪
        if (waveHeight < 2.0) return 3; // 中浪
        if (waveHeight < 3.0) return 4; // 大浪
        if (waveHeight < 4.0) return 5; // 巨浪
        return 6; // 狂浪
    }

    // 获取天气状况描述
    getWeatherCondition(data) {
        const cloudCover = data.cloudCover;
        const visibility = data.visibility;
        
        if (visibility < 5) return '雾';
        if (cloudCover < 20) return '晴朗';
        if (cloudCover < 50) return '少云';
        if (cloudCover < 80) return '多云';
        return '阴天';
    }

    // 生成潮汐估算 (Windy不提供潮汐数据)
    generateTideEstimate(coordinates, date) {
        const hour = date.getHours();
        const schedule = [];
        
        // 基于地理位置调整潮汐时间
        const baseOffset = coordinates.lat > 30 ? 0 : 1;
        
        for (let i = 0; i < 4; i++) {
            const tideHour = (6 + baseOffset + i * 6.2) % 24;
            const isHigh = i % 2 === 0;
            const height = isHigh ? 3.2 + Math.random() * 0.8 : 1.1 + Math.random() * 0.6;
            
            schedule.push({
                time: `${Math.floor(tideHour).toString().padStart(2, '0')}:${Math.floor((tideHour % 1) * 60).toString().padStart(2, '0')}`,
                type: isHigh ? '高潮' : '低潮',
                height: Math.round(height * 10) / 10
            });
        }
        
        const currentHeight = 2.0 + Math.sin(hour * Math.PI / 6) * 1.5;
        const currentLevel = this.getCurrentTideLevel(hour);
        
        return {
            schedule: schedule.sort((a, b) => a.time.localeCompare(b.time)),
            currentHeight: Math.round(currentHeight * 10) / 10,
            currentLevel: currentLevel
        };
    }

    // 获取当前潮汐状态
    getCurrentTideLevel(hour) {
        const phase = (hour / 6) % 4;
        if (phase < 1) return '低潮';
        if (phase < 2) return '涨潮';
        if (phase < 3) return '高潮';
        return '落潮';
    }

    // 验证坐标
    validateCoordinates(coordinates) {
        return coordinates && 
               typeof coordinates.lat === 'number' && 
               typeof coordinates.lng === 'number' &&
               coordinates.lat >= -90 && coordinates.lat <= 90 &&
               coordinates.lng >= -180 && coordinates.lng <= 180;
    }

    // 获取API使用统计
    getAPIStats() {
        return {
            cacheSize: this.cache.size(),
            configured: this.isConfigured(),
            parameters: this.surfParameters,
            model: this.model
        };
    }
}

// 创建全局Windy Point API实例
const windyPointAPI = new WindyPointForecastAPI();