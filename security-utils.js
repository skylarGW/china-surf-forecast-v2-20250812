// 安全工具类 - 防止XSS和代码注入
class SecurityUtils {
    // HTML转义函数
    static escapeHtml(text) {
        if (typeof text !== 'string') return text;
        
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;',
            '/': '&#x2F;'
        };
        
        return text.replace(/[&<>"'/]/g, (s) => map[s]);
    }
    
    // 安全的DOM元素创建
    static createSafeElement(tagName, textContent = '', attributes = {}) {
        const element = document.createElement(tagName);
        
        if (textContent) {
            element.textContent = textContent; // 使用textContent而不是innerHTML
        }
        
        // 安全设置属性
        Object.entries(attributes).forEach(([key, value]) => {
            if (typeof value === 'string') {
                element.setAttribute(key, this.escapeHtml(value));
            }
        });
        
        return element;
    }
    
    // 安全的innerHTML替代方案
    static safeSetHTML(element, htmlString) {
        // 清空元素
        element.innerHTML = '';
        
        // 创建临时容器
        const temp = document.createElement('div');
        temp.textContent = htmlString; // 这会自动转义HTML
        
        // 将转义后的内容添加到目标元素
        element.appendChild(temp);
    }
    
    // 输入验证
    static validateInput(input, type = 'text') {
        if (typeof input !== 'string') return false;
        
        switch (type) {
            case 'spotName':
                return /^[a-zA-Z0-9\u4e00-\u9fa5\s\-_]{1,50}$/.test(input);
            case 'region':
                return ['zhoushan', 'qingdao', 'all'].includes(input);
            case 'number':
                return !isNaN(parseFloat(input)) && isFinite(input);
            default:
                return input.length <= 1000; // 基本长度限制
        }
    }
    
    // 日志安全输出
    static safeLog(message, data = null) {
        const safeMessage = this.escapeHtml(String(message));
        if (data) {
            console.log(safeMessage, JSON.stringify(data, null, 2));
        } else {
            console.log(safeMessage);
        }
    }
}

// 缓存管理类 - 解决内存泄漏
class SafeCacheManager {
    constructor(maxSize = 100, ttl = 30 * 60 * 1000) {
        this.cache = new Map();
        this.maxSize = maxSize;
        this.ttl = ttl;
        this.startCleanupTimer();
    }
    
    set(key, value) {
        // 检查缓存大小
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        
        this.cache.set(key, {
            value: value,
            timestamp: Date.now()
        });
    }
    
    get(key) {
        const item = this.cache.get(key);
        if (!item) return null;
        
        // 检查是否过期
        if (Date.now() - item.timestamp > this.ttl) {
            this.cache.delete(key);
            return null;
        }
        
        return item.value;
    }
    
    // 定期清理过期缓存
    startCleanupTimer() {
        setInterval(() => {
            const now = Date.now();
            for (const [key, item] of this.cache.entries()) {
                if (now - item.timestamp > this.ttl) {
                    this.cache.delete(key);
                }
            }
        }, 60000); // 每分钟清理一次
    }
    
    clear() {
        this.cache.clear();
    }
    
    size() {
        return this.cache.size;
    }
}

// 错误处理类
class ErrorHandler {
    static handle(error, context = '') {
        const safeContext = SecurityUtils.escapeHtml(context);
        const safeMessage = SecurityUtils.escapeHtml(error.message || '未知错误');
        
        console.error(`[${safeContext}] 错误: ${safeMessage}`);
        
        // 返回用户友好的错误信息，不暴露敏感信息
        return '系统暂时不可用，请稍后重试';
    }
    
    static logError(error, context = '') {
        SecurityUtils.safeLog(`错误 [${context}]`, {
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
    }
}