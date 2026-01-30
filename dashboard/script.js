/**
 * VLogger Dashboard JavaScript
 * 
 * Handles all dashboard interactivity including:
 * - Real-time data loading
 * - Tab switching
 * - Modal management
 * - Settings management
 * - Data visualization
 */

class VLoggerDashboard {
    constructor() {
        this.settings = this.loadSettings();
        this.autoRefreshEnabled = true;
        this.autoRefreshInterval = null;
        this.currentTab = 'logs';
        this.lastLogCount = 0;
        
        this.init();
    }
    
    /**
     * Initialize dashboard
     */
    init() {
        this.setupEventListeners();
        this.initializeTabs();
        this.startAutoRefresh();
        this.loadProjectInfo();
        this.loadInitialData();
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });
        
        // Auto-refresh toggle
        document.getElementById('auto-refresh').addEventListener('click', () => {
            this.toggleAutoRefresh();
        });
        
        // Clear logs
        document.getElementById('clear-logs').addEventListener('click', () => {
            this.clearLogsView();
        });
        
        // Modal close
        document.querySelectorAll('.modal-close').forEach(button => {
            button.addEventListener('click', () => {
                this.closeModal();
            });
        });
        
        // Click outside modal to close
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal();
                }
            });
        });
        
        // Settings form
        document.getElementById('refresh-interval').addEventListener('change', (e) => {
            this.settings.refreshInterval = parseInt(e.target.value);
            this.saveSettings();
            this.updateAutoRefresh();
        });
        
        document.getElementById('log-limit').addEventListener('change', (e) => {
            this.settings.logLimit = parseInt(e.target.value);
            this.saveSettings();
        });
        
        document.getElementById('group-similar').addEventListener('change', (e) => {
            this.settings.groupSimilar = e.target.checked;
            this.saveSettings();
        });
        
        document.getElementById('show-performance').addEventListener('change', (e) => {
            this.settings.showPerformance = e.target.checked;
            this.saveSettings();
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case '1':
                        e.preventDefault();
                        this.switchTab('logs');
                        break;
                    case '2':
                        e.preventDefault();
                        this.switchTab('endpoints');
                        break;
                    case '3':
                        e.preventDefault();
                        this.switchTab('performance');
                        break;
                    case '4':
                        e.preventDefault();
                        this.switchTab('errors');
                        break;
                    case 'r':
                        e.preventDefault();
                        this.refreshData();
                        break;
                }
            }
            
            if (e.key === 'Escape') {
                this.closeModal();
            }
        });
    }
    
    /**
     * Initialize tab system
     */
    initializeTabs() {
        this.switchTab('logs');
    }
    
    /**
     * Switch active tab
     */
    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-button').forEach(button => {
            button.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        
        // Update tab panels
        document.querySelectorAll('.tab-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');
        
        this.currentTab = tabName;
        
        // Load tab-specific data
        this.loadTabData(tabName);
    }
    
    /**
     * Load data for specific tab
     */
    loadTabData(tabName) {
        switch (tabName) {
            case 'logs':
                this.loadLogs();
                break;
            case 'endpoints':
                this.loadEndpoints();
                break;
            case 'performance':
                this.loadPerformance();
                break;
            case 'errors':
                this.loadErrors();
                break;
        }
    }
    
    /**
     * Start auto-refresh
     */
    startAutoRefresh() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
        }
        
        this.autoRefreshInterval = setInterval(() => {
            if (this.autoRefreshEnabled) {
                this.refreshData();
            }
        }, this.settings.refreshInterval * 1000);
    }
    
    /**
     * Update auto-refresh interval
     */
    updateAutoRefresh() {
        this.startAutoRefresh();
    }
    
    /**
     * Toggle auto-refresh
     */
    toggleAutoRefresh() {
        this.autoRefreshEnabled = !this.autoRefreshEnabled;
        const button = document.getElementById('auto-refresh');
        button.textContent = `Auto-refresh: ${this.autoRefreshEnabled ? 'ON' : 'OFF'}`;
        button.dataset.enabled = this.autoRefreshEnabled;
    }
    
    /**
     * Refresh all data
     */
    refreshData() {
        this.loadStats();
        this.loadTabData(this.currentTab);
    }
    
    /**
     * Load initial data
     */
    loadInitialData() {
        this.loadStats();
        this.loadLogs();
    }
    
    /**
     * Load project information
     */
    async loadProjectInfo() {
        try {
            const response = await fetch('/api/project');
            const projectInfo = await response.json();
            
            document.getElementById('project-name').textContent = projectInfo.name || 'Unknown Project';
            document.getElementById('project-version').textContent = `v${projectInfo.version || '1.0.0'}`;
        } catch (error) {
            console.error('Error loading project info:', error);
        }
    }
    
    /**
     * Load statistics
     */
    async loadStats() {
        try {
            const response = await fetch('/api/stats');
            const stats = await response.json();
            
            document.getElementById('total-requests').textContent = stats.totalRequests || stats.total_requests || 0;
            document.getElementById('total-errors').textContent = stats.totalErrors || stats.total_errors || 0;
            document.getElementById('endpoints').textContent = stats.endpoints?.length || 0;
            
            // Calculate uptime
            const startedAt = new Date(stats.startedAt || stats.started_at);
            const uptime = Date.now() - startedAt.getTime();
            document.getElementById('uptime').textContent = this.formatDuration(uptime);
            
        } catch (error) {
            console.error('Error loading stats:', error);
            this.showError('Failed to load statistics');
        }
    }
    
    /**
     * Load logs
     */
    async loadLogs() {
        try {
            const response = await fetch('/api/logs');
            const logs = await response.json();
            
            if (logs.length > this.lastLogCount) {
                // New logs detected
                this.lastLogCount = logs.length;
            }
            
            this.displayLogs(logs);
            
        } catch (error) {
            console.error('Error loading logs:', error);
            this.showError('Failed to load logs');
        }
    }
    
    /**
     * Display logs in the UI
     */
    displayLogs(logs) {
        const logsContainer = document.getElementById('logs');
        
        if (logs.length === 0) {
            logsContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📋</div>
                    <p>No requests logged yet...</p>
                    <small>Start making requests to see logs appear here</small>
                </div>
            `;
            return;
        }
        
        // Limit logs based on settings
        const limitedLogs = logs.slice(-this.settings.logLimit);
        
        const logsHTML = limitedLogs.map((log, index) => {
            const isError = log.isError || log.is_error;
            const method = (log.method || '').toUpperCase();
            const status = log.response?.status || 'N/A';
            const duration = Math.round(log.performance?.duration || 0);
            const timestamp = new Date(log.timestamp).toLocaleString();
            
            return `
                <div class="log-entry ${index >= limitedLogs.length - 5 ? 'new' : ''}" onclick="showLogDetail('${log.id}')">
                    <div class="log-header">
                        <span class="log-method method-${method.toLowerCase()}">${method}</span>
                        <span class="log-path">${log.path || log.fullUrl || log.full_url}</span>
                        <span class="log-status ${isError ? 'status-error' : status < 400 ? 'status-success' : 'status-warning'}">
                            ${status}
                        </span>
                        <span class="log-duration">${duration}ms</span>
                    </div>
                    <div class="log-meta">
                        <span class="log-time">${timestamp}</span>
                        <span class="log-ip">${log.ip || 'unknown'}</span>
                        ${isError ? '<span class="text-error">ERROR</span>' : ''}
                    </div>
                </div>
            `;
        }).join('');
        
        logsContainer.innerHTML = logsHTML;
        
        // Store logs for detail view
        window.currentLogs = logs;
    }
    
    /**
     * Load endpoints data
     */
    async loadEndpoints() {
        try {
            const response = await fetch('/api/stats');
            const stats = await response.json();
            const endpoints = stats.endpoints || [];
            
            this.displayEndpoints(endpoints);
            
        } catch (error) {
            console.error('Error loading endpoints:', error);
            this.showError('Failed to load endpoints');
        }
    }
    
    /**
     * Display endpoints
     */
    displayEndpoints(endpoints) {
        const container = document.getElementById('endpoints');
        
        if (endpoints.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🔗</div>
                    <p>No endpoints tracked yet...</p>
                </div>
            `;
            return;
        }
        
        const endpointsHTML = endpoints.map(endpoint => {
            const errorRate = endpoint.calls > 0 ? ((endpoint.errors / endpoint.calls) * 100).toFixed(1) : '0';
            
            return `
                <div class="endpoint-card">
                    <div class="endpoint-header">
                        <span class="log-method method-${(endpoint.method || '').toLowerCase()}">${endpoint.method}</span>
                        <span class="endpoint-path">${endpoint.path}</span>
                    </div>
                    <div class="endpoint-stats">
                        <div class="endpoint-stat">
                            <div class="endpoint-stat-value">${endpoint.calls}</div>
                            <div class="endpoint-stat-label">Calls</div>
                        </div>
                        <div class="endpoint-stat">
                            <div class="endpoint-stat-value">${endpoint.errors}</div>
                            <div class="endpoint-stat-label">Errors</div>
                        </div>
                        <div class="endpoint-stat">
                            <div class="endpoint-stat-value">${errorRate}%</div>
                            <div class="endpoint-stat-label">Error Rate</div>
                        </div>
                        <div class="endpoint-stat">
                            <div class="endpoint-stat-value">${Math.round(endpoint.avgDuration || endpoint.avg_duration || 0)}ms</div>
                            <div class="endpoint-stat-label">Avg Duration</div>
                        </div>
                        <div class="endpoint-stat">
                            <div class="endpoint-stat-value">${Math.round(endpoint.maxDuration || endpoint.max_duration || 0)}ms</div>
                            <div class="endpoint-stat-label">Max Duration</div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        container.innerHTML = endpointsHTML;
    }
    
    /**
     * Load performance data
     */
    async loadPerformance() {
        try {
            const response = await fetch('/api/stats');
            const stats = await response.json();
            
            this.displayPerformance(stats);
            
        } catch (error) {
            console.error('Error loading performance data:', error);
            this.showError('Failed to load performance data');
        }
    }
    
    /**
     * Display performance metrics
     */
    displayPerformance(stats) {
        const container = document.getElementById('performance');
        const endpoints = stats.endpoints || [];
        
        if (endpoints.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">⚡</div>
                    <p>Performance data will appear here...</p>
                </div>
            `;
            return;
        }
        
        // Sort by average duration
        const sortedEndpoints = [...endpoints].sort((a, b) => 
            (b.avgDuration || b.avg_duration || 0) - (a.avgDuration || a.avg_duration || 0)
        );
        
        const performanceHTML = `
            <div style="padding: var(--spacing-lg);">
                <h3>Slowest Endpoints</h3>
                <div class="endpoint-stats">
                    ${sortedEndpoints.slice(0, 10).map(endpoint => `
                        <div class="endpoint-card">
                            <div class="endpoint-header">
                                <span class="log-method method-${(endpoint.method || '').toLowerCase()}">${endpoint.method}</span>
                                <span class="endpoint-path">${endpoint.path}</span>
                            </div>
                            <div style="text-align: center; padding: var(--spacing-md);">
                                <div style="font-size: 2rem; font-weight: 700; color: var(--warning-600);">
                                    ${Math.round(endpoint.avgDuration || endpoint.avg_duration || 0)}ms
                                </div>
                                <div style="color: var(--text-secondary); font-size: 0.875rem;">
                                    avg (${Math.round(endpoint.minDuration || endpoint.min_duration || 0)}ms - ${Math.round(endpoint.maxDuration || endpoint.max_duration || 0)}ms)
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        container.innerHTML = performanceHTML;
    }
    
    /**
     * Load errors data
     */
    async loadErrors() {
        try {
            const response = await fetch('/api/logs');
            const logs = await response.json();
            
            const errors = logs.filter(log => log.isError || log.is_error);
            this.displayErrors(errors);
            
        } catch (error) {
            console.error('Error loading errors:', error);
            this.showError('Failed to load errors');
        }
    }
    
    /**
     * Display errors
     */
    displayErrors(errors) {
        const container = document.getElementById('errors');
        
        if (errors.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🚨</div>
                    <p>No errors to display</p>
                    <small>Your application is running smoothly!</small>
                </div>
            `;
            return;
        }
        
        const errorsHTML = errors.slice(-20).map(error => {
            const timestamp = new Date(error.timestamp).toLocaleString();
            const status = error.response?.status || 'N/A';
            const method = (error.method || '').toUpperCase();
            
            return `
                <div class="log-entry" onclick="showLogDetail('${error.id}')">
                    <div class="log-header">
                        <span class="log-method method-${method.toLowerCase()}">${method}</span>
                        <span class="log-path">${error.path || error.fullUrl || error.full_url}</span>
                        <span class="log-status status-error">${status}</span>
                    </div>
                    <div class="log-meta">
                        <span class="log-time">${timestamp}</span>
                        <span class="text-error">ERROR</span>
                        ${error.error?.message ? `<span class="log-error">${error.error.message}</span>` : ''}
                    </div>
                </div>
            `;
        }).join('');
        
        container.innerHTML = `
            <div style="padding: var(--spacing-lg);">
                <h3>Recent Errors (${errors.length} total)</h3>
                <div>
                    ${errorsHTML}
                </div>
            </div>
        `;
    }
    
    /**
     * Show log detail modal
     */
    showLogDetail(logId) {
        const logs = window.currentLogs || [];
        const log = logs.find(l => l.id === logId);
        
        if (!log) {
            this.showError('Log entry not found');
            return;
        }
        
        const content = `
            <div>
                <h4>Request Information</h4>
                <div class="code-block">${JSON.stringify({
                    method: log.method,
                    path: log.path,
                    fullUrl: log.fullUrl || log.full_url,
                    timestamp: log.timestamp,
                    ip: log.ip
                }, null, 2)}</div>
                
                <h4 style="margin-top: var(--spacing-lg);">Headers</h4>
                <div class="code-block">${JSON.stringify(log.headers, null, 2)}</div>
                
                ${log.query && Object.keys(log.query).length > 0 ? `
                    <h4 style="margin-top: var(--spacing-lg);">Query Parameters</h4>
                    <div class="code-block">${JSON.stringify(log.query, null, 2)}</div>
                ` : ''}
                
                ${log.body ? `
                    <h4 style="margin-top: var(--spacing-lg);">Request Body</h4>
                    <div class="code-block">${JSON.stringify(log.body, null, 2)}</div>
                ` : ''}
                
                ${log.response ? `
                    <h4 style="margin-top: var(--spacing-lg);">Response</h4>
                    <div class="code-block">${JSON.stringify(log.response, null, 2)}</div>
                ` : ''}
                
                <h4 style="margin-top: var(--spacing-lg);">Performance</h4>
                <div class="code-block">${JSON.stringify(log.performance, null, 2)}</div>
                
                ${log.error ? `
                    <h4 style="margin-top: var(--spacing-lg);">Error</h4>
                    <div class="code-block">${JSON.stringify(log.error, null, 2)}</div>
                ` : ''}
            </div>
        `;
        
        document.getElementById('log-detail-content').innerHTML = content;
        this.showModal('log-detail-modal');
    }
    
    /**
     * Clear logs view
     */
    clearLogsView() {
        document.getElementById('logs').innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📋</div>
                <p>View cleared</p>
                <small>Refresh to see logs again</small>
            </div>
        `;
    }
    
    /**
     * Show modal
     */
    showModal(modalId) {
        document.getElementById(modalId).classList.add('active');
    }
    
    /**
     * Close all modals
     */
    closeModal() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
    }
    
    /**
     * Show settings modal
     */
    showSettings() {
        // Populate current settings
        document.getElementById('refresh-interval').value = this.settings.refreshInterval;
        document.getElementById('log-limit').value = this.settings.logLimit;
        document.getElementById('group-similar').checked = this.settings.groupSimilar;
        document.getElementById('show-performance').checked = this.settings.showPerformance;
        
        this.showModal('settings-modal');
    }
    
    /**
     * Save settings
     */
    saveSettings() {
        localStorage.setItem('vlogger-settings', JSON.stringify(this.settings));
    }
    
    /**
     * Load settings
     */
    loadSettings() {
        const defaultSettings = {
            refreshInterval: 5,
            logLimit: 50,
            groupSimilar: false,
            showPerformance: true
        };
        
        const stored = localStorage.getItem('vlogger-settings');
        if (stored) {
            try {
                return { ...defaultSettings, ...JSON.parse(stored) };
            } catch (error) {
                console.error('Error loading settings:', error);
            }
        }
        
        return defaultSettings;
    }
    
    /**
     * Download logs as JSON
     */
    async downloadLogs() {
        try {
            const response = await fetch('/api/logs');
            const logs = await response.json();
            
            const dataStr = JSON.stringify(logs, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `vlogger-logs-${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            
        } catch (error) {
            console.error('Error downloading logs:', error);
            this.showError('Failed to download logs');
        }
    }
    
    /**
     * Show error message
     */
    showError(message) {
        // Simple error display - could be enhanced with a toast system
        console.error(message);
        alert(message);
    }
    
    /**
     * Format duration for display
     */
    formatDuration(ms) {
        if (ms < 1000) return `${ms}ms`;
        if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
        if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
        return `${(ms / 3600000).toFixed(1)}h`;
    }
}

// Global functions for HTML onclick handlers
function showLogDetail(logId) {
    if (window.dashboard) {
        window.dashboard.showLogDetail(logId);
    }
}

function closeModal() {
    if (window.dashboard) {
        window.dashboard.closeModal();
    }
}

function showSettings() {
    if (window.dashboard) {
        window.dashboard.showSettings();
    }
}

function downloadLogs() {
    if (window.dashboard) {
        window.dashboard.downloadLogs();
    }
}

function saveSettings() {
    if (window.dashboard) {
        window.dashboard.closeModal();
        // Settings are auto-saved on input change
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new VLoggerDashboard();
});