# 🚀 AWS访客统计系统部署指南

## 📋 概述

将访客统计从本地存储升级到AWS云端，实现：
- **全球统一**: 所有访客数据集中存储
- **实时同步**: 多设备访问实时更新
- **无限扩展**: 支持大量并发访问
- **专业分析**: 详细的访客行为分析
- **数据安全**: AWS企业级安全保障

## 🏗️ 架构设计

```
用户浏览器 → API Gateway → Lambda函数 → DynamoDB
     ↓
本地缓存(降级方案)
```

### 核心组件
- **DynamoDB**: 存储访客数据
- **Lambda**: 处理API请求
- **API Gateway**: 提供REST API
- **CloudFormation**: 基础设施即代码

## 💰 成本估算

### 免费额度（每月）
- **Lambda**: 100万次请求
- **DynamoDB**: 25GB存储 + 25个读写单位
- **API Gateway**: 100万次API调用

### 预期使用量
- **日访客**: 100-500人
- **月API调用**: ~15,000次
- **存储需求**: <1GB/年

**结论**: 完全在免费额度内！💰

## 🚀 部署步骤

### 1. 准备AWS账户
```bash
# 安装AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-windows-x86_64.msi" -o "AWSCLIV2.msi"
msiexec /i AWSCLIV2.msi

# 配置AWS凭证
aws configure
# 输入: Access Key ID, Secret Access Key, Region (us-east-1), Output (json)
```

### 2. 部署基础设施
```bash
# 创建CloudFormation堆栈
aws cloudformation create-stack \
  --stack-name surf-forecast-visitor-stats \
  --template-body file://aws-setup.yaml \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameters ParameterKey=ProjectName,ParameterValue=surf-forecast \
               ParameterKey=Environment,ParameterValue=prod
```

### 3. 部署Lambda代码
```bash
# 打包Lambda代码
zip lambda-function.zip aws-lambda-visitor-stats.js

# 更新Lambda函数
aws lambda update-function-code \
  --function-name surf-forecast-visitor-stats-prod \
  --zip-file fileb://lambda-function.zip
```

### 4. 获取API配置信息
```bash
# 获取API端点
aws cloudformation describe-stacks \
  --stack-name surf-forecast-visitor-stats \
  --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' \
  --output text

# 获取API密钥
aws apigateway get-api-key \
  --api-key $(aws cloudformation describe-stacks \
    --stack-name surf-forecast-visitor-stats \
    --query 'Stacks[0].Outputs[?OutputKey==`ApiKey`].OutputValue' \
    --output text) \
  --include-value \
  --query 'value' \
  --output text
```

## ⚙️ 前端配置

### 1. 更新API配置
在 `visitor-counter-aws.js` 中更新：
```javascript
class AWSVisitorCounter {
    constructor() {
        this.apiEndpoint = 'https://your-api-id.execute-api.us-east-1.amazonaws.com/prod/visitor-stats';
        // 从AWS获取的实际端点
    }
    
    async recordVisitAWS(sessionId) {
        const response = await fetch(this.apiEndpoint, {
            headers: {
                'X-API-Key': 'your-actual-api-key' // 从AWS获取的实际密钥
            }
        });
    }
}
```

### 2. 更新HTML引用
```html
<!-- 使用AWS版本 -->
<script src="visitor-counter-aws.js"></script>
```

### 3. 初始化混合统计器
```javascript
// 在页面加载时
document.addEventListener('DOMContentLoaded', async function() {
    const activeCounter = await hybridVisitorCounter.init();
    window.visitorCounter = activeCounter;
});
```

## 📊 数据结构

### DynamoDB表结构
```javascript
// 访问记录
{
  PK: "VISIT#session_123",
  SK: "1703001234567",
  sessionId: "session_123",
  date: "2024-12-19",
  timestamp: 1703001234567,
  userAgent: "Mozilla/5.0...",
  referrer: "https://google.com",
  timezone: "Asia/Shanghai",
  TTL: 1710777234 // 90天后自动删除
}

// 每日统计
{
  PK: "DAILY_STATS",
  SK: "2024-12-19",
  date: "2024-12-19",
  visitors: 156
}

// 总计数器
{
  PK: "TOTAL_COUNTER",
  SK: "TOTAL",
  totalVisitors: 12543,
  lastUpdated: 1703001234567
}
```

## 🔧 高级配置

### 1. 自定义域名（可选）
```bash
# 创建自定义域名
aws apigateway create-domain-name \
  --domain-name api.your-domain.com \
  --certificate-arn arn:aws:acm:us-east-1:123456789:certificate/abc123
```

### 2. CloudWatch监控
```bash
# 设置告警
aws cloudwatch put-metric-alarm \
  --alarm-name "VisitorStats-HighErrorRate" \
  --alarm-description "访客统计API错误率过高" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold
```

### 3. 备份策略
```bash
# 启用DynamoDB备份
aws dynamodb put-backup-policy \
  --table-name surf-forecast-visitor-stats-prod \
  --backup-policy BillingMode=PAY_PER_REQUEST
```

## 🔍 测试验证

### 1. API健康检查
```bash
curl -X POST https://your-api-endpoint/visitor-stats \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{"action": "ping"}'
```

### 2. 记录访客测试
```bash
curl -X POST https://your-api-endpoint/visitor-stats \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "action": "record",
    "data": {
      "sessionId": "test_session_123",
      "timestamp": 1703001234567,
      "date": "2024-12-19",
      "userAgent": "Test Agent",
      "referrer": "test",
      "timezone": "Asia/Shanghai"
    }
  }'
```

### 3. 获取统计测试
```bash
curl -X POST https://your-api-endpoint/visitor-stats \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{"action": "getStats", "days": 7}'
```

## 📈 监控和维护

### 1. CloudWatch日志
- Lambda函数日志: `/aws/lambda/surf-forecast-visitor-stats-prod`
- API Gateway日志: 在API Gateway控制台启用

### 2. 性能监控
- **延迟**: API响应时间 < 500ms
- **错误率**: < 1%
- **可用性**: > 99.9%

### 3. 成本监控
```bash
# 设置成本告警
aws budgets create-budget \
  --account-id 123456789012 \
  --budget '{
    "BudgetName": "SurfForecast-Monthly",
    "BudgetLimit": {"Amount": "5", "Unit": "USD"},
    "TimeUnit": "MONTHLY",
    "BudgetType": "COST"
  }'
```

## 🔒 安全最佳实践

### 1. API密钥管理
- 定期轮换API密钥
- 使用不同环境的不同密钥
- 监控API密钥使用情况

### 2. 访问控制
- 启用CloudTrail记录API调用
- 设置IAM最小权限原则
- 定期审查访问日志

### 3. 数据保护
- 启用DynamoDB加密
- 设置数据保留策略
- 定期备份重要数据

## 🚨 故障排除

### 常见问题

#### 1. API调用失败
```
错误: 403 Forbidden
解决: 检查API密钥是否正确，是否在请求头中包含X-API-Key
```

#### 2. Lambda超时
```
错误: Task timed out after 30.00 seconds
解决: 增加Lambda超时时间或优化代码性能
```

#### 3. DynamoDB限流
```
错误: ProvisionedThroughputExceededException
解决: 使用按需计费模式或增加预置容量
```

## 📞 技术支持

### AWS支持资源
- **文档**: https://docs.aws.amazon.com/
- **论坛**: https://forums.aws.amazon.com/
- **支持**: AWS Support Center

### 项目支持
- **监控**: CloudWatch Dashboard
- **告警**: 自动邮件通知
- **备份**: 自动每日备份

---

**部署完成后，你的访客统计系统将具备企业级的可靠性和扩展性！** ☁️