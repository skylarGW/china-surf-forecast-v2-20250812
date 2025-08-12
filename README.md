# 🏄 中国冲浪预测系统 V6.0

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/china-surf-forecast)

## 🌊 项目简介

中国冲浪预测系统是一个专业的海况分析和冲浪推荐平台，为中国沿海地区的冲浪爱好者提供准确的海况预测和AI智能推荐。

### ✨ 核心功能

- 🎯 **AI智能推荐** - 基于海况数据的专业冲浪建议
- 🌊 **实时海况** - Windy Point Forecast API专业数据
- 📊 **24小时预测** - 详细的逐小时海况分析
- 🏖️ **多地区覆盖** - 华南、华东、华北主要冲浪点
- 🔒 **安全防护** - XSS防护和安全输入验证
- 📱 **响应式设计** - 完美适配移动端和桌面端
- 📈 **访客统计** - AWS DynamoDB云端统计
- ⏰ **数据新鲜度** - 实时显示数据更新状态

## 🚀 快速开始

### 在线访问
访问部署版本：[https://china-surf-forecast.vercel.app](https://china-surf-forecast.vercel.app)

### 本地运行
```bash
# 克隆项目
git clone https://github.com/your-username/china-surf-forecast.git
cd china-surf-forecast

# 安装依赖
npm install

# 启动本地服务器
npm start
```

## 🔧 配置说明

### Windy API配置
1. 注册 [Windy Point Forecast API](https://api.windy.com)
2. 获取免费API密钥（1000次/月）
3. 在浏览器控制台设置：
```javascript
localStorage.setItem('windyApiKey', 'your-api-key-here');
```

### AWS访客统计（可选）
参考 [AWS-VISITOR-SETUP.md](./AWS-VISITOR-SETUP.md) 配置云端统计功能。

## 📁 项目结构

```
├── index.html                 # 主页面
├── app-v6-secure.js          # 核心应用逻辑
├── security-utils.js         # 安全工具类
├── windy-point-api.js        # Windy API集成
├── windy-smart-cache.js      # 智能缓存系统
├── data-freshness.js         # 数据新鲜度管理
├── visitor-counter-aws.js    # AWS访客统计
├── styles-v3.css            # 样式文件
├── vercel.json              # Vercel部署配置
└── docs/                    # 文档目录
    ├── SECURITY-UPGRADE-GUIDE.md
    ├── WINDY-API-SETUP.md
    └── AWS-VISITOR-SETUP.md
```

## 🛡️ 安全特性

- **XSS防护** - 所有用户输入经过安全验证
- **DOM安全** - 使用SecurityUtils进行安全DOM操作
- **内存管理** - 智能缓存避免内存泄漏
- **API安全** - 安全的API密钥管理

## 🌍 支持地区

### 华南地区
- 海南三亚、万宁
- 广东深圳、汕头
- 福建厦门、平潭

### 华东地区  
- 浙江舟山、温州
- 江苏连云港
- 上海奉贤

### 华北地区
- 山东青岛、烟台
- 河北秦皇岛
- 天津滨海

## 📊 技术栈

- **前端**: 原生JavaScript ES6+
- **API**: Windy Point Forecast API
- **云服务**: AWS DynamoDB (可选)
- **部署**: Vercel
- **安全**: 自研SecurityUtils

## 🔄 更新日志

### V6.0 (2024-12-19)
- ✅ 修复所有XSS安全漏洞
- ✅ 集成Windy Point Forecast API
- ✅ 添加AWS云端访客统计
- ✅ 实现数据新鲜度显示
- ✅ 优化4小时更新频率

### V5.0 (2024-08-10)
- ✅ 修复脚本引用错误
- ✅ 优化日期选择器UI
- ✅ 完善响应式设计

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 📞 联系方式

- 项目维护：Amazon Q Developer
- 问题反馈：[GitHub Issues](https://github.com/your-username/china-surf-forecast/issues)
- 邮箱：wing394499753@126.com

## 🙏 致谢

- [Windy.com](https://windy.com) - 提供专业气象数据API
- [Vercel](https://vercel.com) - 免费静态网站托管
- [AWS](https://aws.amazon.com) - 云服务支持

---

**⚠️ 免责声明**: 本系统提供的海况预测仅供参考，实际冲浪活动请以当地实时海况为准，注意安全。