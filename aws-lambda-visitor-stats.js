// AWS Lambda函数 - 访客统计API
const AWS = require('aws-sdk');
const dynamodb = new AWS.DynamoDB.DocumentClient();

const TABLE_NAME = 'SurfForecastVisitorStats';
const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-API-Key',
    'Access-Control-Allow-Methods': 'POST,OPTIONS'
};

exports.handler = async (event) => {
    // 处理CORS预检请求
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: CORS_HEADERS,
            body: ''
        };
    }

    try {
        const body = JSON.parse(event.body);
        const action = body.action;

        switch (action) {
            case 'record':
                return await recordVisit(body.data);
            case 'getStats':
                return await getStats(body.days || 7);
            case 'ping':
                return await ping();
            default:
                return errorResponse(400, '无效的操作');
        }
    } catch (error) {
        console.error('Lambda错误:', error);
        return errorResponse(500, '服务器内部错误');
    }
};

// 记录访客
async recordVisit(visitData) {
    try {
        const today = new Date().toISOString().split('T')[0];
        const timestamp = Date.now();

        // 记录单次访问
        await dynamodb.put({
            TableName: TABLE_NAME,
            Item: {
                PK: `VISIT#${visitData.sessionId}`,
                SK: `${timestamp}`,
                sessionId: visitData.sessionId,
                date: visitData.date,
                timestamp: visitData.timestamp,
                userAgent: visitData.userAgent,
                referrer: visitData.referrer,
                timezone: visitData.timezone,
                TTL: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60) // 90天过期
            }
        }).promise();

        // 更新每日统计
        await updateDailyStats(today);

        // 更新总计数器
        const totalVisitors = await updateTotalCounter();

        return successResponse({
            message: '访客记录成功',
            totalVisitors: totalVisitors,
            date: today
        });

    } catch (error) {
        console.error('记录访客错误:', error);
        return errorResponse(500, '记录访客失败');
    }
}

// 更新每日统计
async updateDailyStats(date) {
    try {
        await dynamodb.update({
            TableName: TABLE_NAME,
            Key: {
                PK: 'DAILY_STATS',
                SK: date
            },
            UpdateExpression: 'ADD visitors :inc SET #date = :date',
            ExpressionAttributeNames: {
                '#date': 'date'
            },
            ExpressionAttributeValues: {
                ':inc': 1,
                ':date': date
            }
        }).promise();
    } catch (error) {
        console.error('更新每日统计错误:', error);
    }
}

// 更新总计数器
async updateTotalCounter() {
    try {
        const result = await dynamodb.update({
            TableName: TABLE_NAME,
            Key: {
                PK: 'TOTAL_COUNTER',
                SK: 'TOTAL'
            },
            UpdateExpression: 'ADD totalVisitors :inc SET lastUpdated = :timestamp',
            ExpressionAttributeValues: {
                ':inc': 1,
                ':timestamp': Date.now()
            },
            ReturnValues: 'ALL_NEW'
        }).promise();

        return result.Attributes.totalVisitors;
    } catch (error) {
        console.error('更新总计数器错误:', error);
        return 0;
    }
}

// 获取统计数据
async getStats(days = 7) {
    try {
        // 获取总访客数
        const totalResult = await dynamodb.get({
            TableName: TABLE_NAME,
            Key: {
                PK: 'TOTAL_COUNTER',
                SK: 'TOTAL'
            }
        }).promise();

        const totalVisitors = totalResult.Item?.totalVisitors || 0;

        // 获取最近N天的每日统计
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - days + 1);

        const dailyStats = [];
        for (let i = 0; i < days; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];

            try {
                const result = await dynamodb.get({
                    TableName: TABLE_NAME,
                    Key: {
                        PK: 'DAILY_STATS',
                        SK: dateStr
                    }
                }).promise();

                const visitors = result.Item?.visitors || 0;
                const label = i === days - 1 ? '今天' : 
                             i === days - 2 ? '昨天' : 
                             `${days - 1 - i}天前`;

                dailyStats.push({
                    date: dateStr,
                    visitors: visitors,
                    label: label
                });
            } catch (error) {
                console.error(`获取${dateStr}统计失败:`, error);
                dailyStats.push({
                    date: dateStr,
                    visitors: 0,
                    label: `${days - 1 - i}天前`
                });
            }
        }

        // 今日访客数
        const todayVisitors = dailyStats[dailyStats.length - 1]?.visitors || 0;

        return successResponse({
            totalVisitors: totalVisitors,
            todayVisitors: todayVisitors,
            dailyStats: dailyStats,
            period: `${days}天`,
            lastUpdated: Date.now()
        });

    } catch (error) {
        console.error('获取统计数据错误:', error);
        return errorResponse(500, '获取统计数据失败');
    }
}

// 健康检查
async ping() {
    return successResponse({
        message: 'AWS访客统计服务正常',
        timestamp: Date.now(),
        service: 'SurfForecast Visitor Stats'
    });
}

// 成功响应
function successResponse(data) {
    return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify(data)
    };
}

// 错误响应
function errorResponse(statusCode, message) {
    return {
        statusCode: statusCode,
        headers: CORS_HEADERS,
        body: JSON.stringify({
            error: message,
            timestamp: Date.now()
        })
    };
}