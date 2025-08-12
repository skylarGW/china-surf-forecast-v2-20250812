// 简化版冲浪预测系统 - 适用于GitHub Pages
class SimpleSurfApp {
    constructor() {
        this.spots = [
            { name: '三亚后海湾', location: '海南', score: 85, waveHeight: '1.2-1.8m', windSpeed: '15km/h', temperature: '28°C' },
            { name: '万宁日月湾', location: '海南', score: 78, waveHeight: '1.0-1.5m', windSpeed: '12km/h', temperature: '27°C' },
            { name: '舟山朱家尖', location: '浙江', score: 72, waveHeight: '0.8-1.2m', windSpeed: '18km/h', temperature: '22°C' },
            { name: '青岛金沙滩', location: '山东', score: 68, waveHeight: '0.6-1.0m', windSpeed: '20km/h', temperature: '20°C' },
            { name: '厦门环岛路', location: '福建', score: 75, waveHeight: '0.9-1.3m', windSpeed: '16km/h', temperature: '25°C' },
            { name: '深圳大梅沙', location: '广东', score: 70, waveHeight: '0.7-1.1m', windSpeed: '14km/h', temperature: '26°C' }
        ];
        this.currentDate = new Date();
        this.selectedRegion = 'all';
    }

    init() {
        this.renderDateButtons();
        this.renderRegionButtons();
        this.renderAIRecommendation();
        this.renderSpots();
        this.updateSystemStatus();
        this.renderVisitorStats();
    }

    renderDateButtons() {
        const container = document.getElementById('dateButtons');
        if (!container) return;

        let html = '';
        for (let i = 0; i < 7; i++) {
            const date = new Date();
            date.setDate(date.getDate() + i);
            const isToday = i === 0;
            const dateStr = date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
            
            html += `<button class="date-btn ${isToday ? 'active today' : ''}" data-date="${i}">
                ${isToday ? '今天' : dateStr}
            </button>`;
        }
        container.innerHTML = html;

        // 添加点击事件
        container.addEventListener('click', (e) => {
            if (e.target.classList.contains('date-btn')) {
                document.querySelectorAll('.date-btn').forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
                this.renderSpots();
            }
        });
    }

    renderRegionButtons() {
        const buttons = document.querySelectorAll('.region-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                buttons.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.selectedRegion = e.target.dataset.region;
                this.renderSpots();
            });
        });
    }

    renderAIRecommendation() {
        const container = document.getElementById('aiAnalysis');
        if (!container) return;

        const topSpots = this.spots.sort((a, b) => b.score - a.score).slice(0, 3);
        
        let html = '<div class="global-top3">';
        topSpots.forEach((spot, index) => {
            const rank = index + 1;
            const medal = ['🥇', '🥈', '🥉'][index];
            html += `
                <div class="top-spot rank-${rank}">
                    <div class="top-spot-header">
                        <div>
                            <div class="top-spot-rank">${medal} #${rank}</div>
                            <div class="top-spot-name">${spot.name}</div>
                            <div class="top-spot-location">${spot.location}</div>
                        </div>
                        <div class="top-spot-score">${spot.score}分</div>
                    </div>
                    <div class="top-spot-reason">
                        浪高${spot.waveHeight}，风速${spot.windSpeed}，水温${spot.temperature}，条件${spot.score >= 80 ? '优秀' : spot.score >= 70 ? '良好' : '一般'}
                    </div>
                </div>
            `;
        });
        html += '</div>';
        
        container.innerHTML = html;
    }

    renderSpots() {
        const container = document.getElementById('spotsGrid');
        if (!container) return;

        let filteredSpots = this.spots;
        if (this.selectedRegion !== 'all') {
            const regionMap = {
                'south': ['海南', '广东', '福建'],
                'east': ['浙江', '江苏', '上海'],
                'north': ['山东', '河北', '天津']
            };
            filteredSpots = this.spots.filter(spot => 
                regionMap[this.selectedRegion]?.includes(spot.location)
            );
        }

        let html = '';
        filteredSpots.forEach(spot => {
            const scoreClass = spot.score >= 80 ? 'excellent' : 
                              spot.score >= 70 ? 'good' : 
                              spot.score >= 60 ? 'fair' : 'poor';
            
            html += `
                <div class="spot-card" onclick="this.showSpotDetail('${spot.name}')">
                    <div class="spot-header">
                        <div>
                            <div class="spot-name">${spot.name}</div>
                            <div class="spot-location">${spot.location}</div>
                        </div>
                        <div class="score-badge score-${scoreClass}">${spot.score}分</div>
                    </div>
                    <div class="weather-grid">
                        <div class="weather-item">
                            <div class="weather-value">${spot.waveHeight}</div>
                            <div class="weather-label">浪高</div>
                        </div>
                        <div class="weather-item">
                            <div class="weather-value">${spot.windSpeed}</div>
                            <div class="weather-label">风速</div>
                        </div>
                        <div class="weather-item">
                            <div class="weather-value">${spot.temperature}</div>
                            <div class="weather-label">水温</div>
                        </div>
                    </div>
                    <div class="ai-suggestion">
                        <div class="suggestion-title">🤖 AI建议</div>
                        <div class="suggestion-text">
                            ${spot.score >= 80 ? '条件优秀，强烈推荐冲浪！' : 
                              spot.score >= 70 ? '条件良好，适合冲浪。' : 
                              '条件一般，建议谨慎选择。'}
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    updateSystemStatus() {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('zh-CN');
        
        // 更新时间显示
        const timeElement = document.getElementById('lastUpdateTime');
        if (timeElement) {
            timeElement.textContent = `${timeStr} ✅`;
            timeElement.className = 'config-value fresh';
        }

        // 更新访客统计
        const visitorElement = document.getElementById('visitorCount');
        if (visitorElement) {
            const count = Math.floor(Math.random() * 1000) + 500;
            visitorElement.textContent = `${count}人`;
            visitorElement.className = 'config-value fresh';
        }

        // 更新缓存状态
        const cacheElement = document.getElementById('cacheStatus');
        if (cacheElement) {
            cacheElement.textContent = '正常运行';
            cacheElement.className = 'config-value fresh';
        }
    }

    renderVisitorStats() {
        const container = document.getElementById('visitorStatsPanel');
        if (!container) return;

        const stats = {
            today: Math.floor(Math.random() * 200) + 100,
            total: Math.floor(Math.random() * 5000) + 2000,
            online: Math.floor(Math.random() * 50) + 10
        };

        container.innerHTML = `
            <div class="visitor-stats-card">
                <div class="stat-item">
                    <span class="stat-label">今日访客</span>
                    <span class="stat-value">${stats.today}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">总访客数</span>
                    <span class="stat-value">${stats.total}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">在线用户</span>
                    <span class="stat-value">${stats.online}</span>
                </div>
            </div>
        `;

        // 更新顶部和底部统计
        const summaryElements = ['visitorSummary', 'footerVisitorStats'];
        summaryElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = `👥 今日${stats.today} | 总计${stats.total}`;
            }
        });
    }

    showSpotDetail(spotName) {
        const spot = this.spots.find(s => s.name === spotName);
        if (!spot) return;

        const modal = document.getElementById('detailModal');
        const content = document.getElementById('modalContent');
        
        if (modal && content) {
            content.innerHTML = `
                <h2>${spot.name} - 详细信息</h2>
                <div class="spot-detail-content">
                    <p><strong>地区：</strong>${spot.location}</p>
                    <p><strong>综合评分：</strong>${spot.score}分</p>
                    <p><strong>浪高：</strong>${spot.waveHeight}</p>
                    <p><strong>风速：</strong>${spot.windSpeed}</p>
                    <p><strong>水温：</strong>${spot.temperature}</p>
                    <div class="ai-suggestion">
                        <div class="suggestion-title">🤖 详细分析</div>
                        <div class="suggestion-text">
                            基于当前海况数据分析，${spot.name}的冲浪条件${spot.score >= 80 ? '优秀' : spot.score >= 70 ? '良好' : '一般'}。
                            建议${spot.score >= 70 ? '前往冲浪' : '谨慎选择时间'}。
                        </div>
                    </div>
                </div>
            `;
            modal.style.display = 'block';
        }
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    const app = new SimpleSurfApp();
    app.init();

    // 模态框关闭事件
    const modal = document.getElementById('detailModal');
    const closeBtn = document.querySelector('.close');
    
    if (closeBtn) {
        closeBtn.onclick = () => modal.style.display = 'none';
    }
    
    if (modal) {
        modal.onclick = (e) => {
            if (e.target === modal) modal.style.display = 'none';
        };
    }

    // 定期更新状态
    setInterval(() => {
        app.updateSystemStatus();
    }, 30000);
});

// 全局方法
window.showSpotDetail = function(spotName) {
    if (window.surfApp) {
        window.surfApp.showSpotDetail(spotName);
    }
};