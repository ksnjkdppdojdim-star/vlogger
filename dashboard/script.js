/**
 * VLogger Dashboard JavaScript
 * 
 * Handles all dashboard interactivity including:
 * - Real-time data loading
 * - Tab switching
 * - Modal management
 * - Settings management
 * - Data visualization
 * - Search and filtering
 * - Theme management
 * - Keyboard shortcuts
 */

class VLoggerDashboard {
    constructor() {
        this.settings = this.loadSettings();
        this.autoRefreshEnabled = true;
        this.autoRefreshInterval = null;
        this.currentTab = 'logs';
        this.lastLogCount = 0;
        this.currentLogs = [];
        this.filteredLogs = [];
        this.currentPage = 1;
        this.logsPerPage = 50;
        this.searchQuery = '';
        this.filters = {
            method: '',
            status: '',
            time: ''
        };
        
        this.init();
    }
    
    /**
     * Initialize dashboard
     */
    init() {
        this.setupEventListeners();
        this.initializeTabs();
        this.initializeTheme();
        this.startAutoRefresh();
        this.loadProjectInfo();
        this.loadInitialData();
        this.requestNotificationPermission();
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
        
        // Search functionality
        const searchInput = document.getElementById('search-input');
        searchInput.addEventListener('input', (e) => {
            this.searchQuery = e.target.value;
            this.filterLogs();
        });
        
        document.getElementById('search-clear').addEventListener('click', () => {
            searchInput.value = '';
            this.searchQuery = '';
            this.filterLogs();
        });
        
        // Filter controls
        document.getElementById('method-filter').addEventListener('change', (e) => {
            this.filters.method = e.target.value;
            this.filterLogs();
        });
        
        document.getElementById('status-filter').addEventListener('change', (e) => {
            this.filters.status = e.target.value;
            this.filterLogs();
        });
        
        document.getElementById('time-filter').addEventListener('change', (e) => {
            this.filters.time = e.target.value;
            this.filterLogs();
        });
        
        // Theme toggle
        document.getElementById('theme-toggle').addEventListener('click', () => {
            this.toggleTheme();
        });
        
        // Fullscreen toggle
        document.getElementById('fullscreen-toggle').addEventListener('click', () => {
            this.toggleFullscreen();
        });
        
        // Pagination
        document.getElementById('prev-page').addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.displayLogs(this.filteredLogs);
            }
        });
        
        document.getElementById('next-page').addEventListener('click', () => {
            const totalPages = Math.ceil(this.filteredLogs.length / this.logsPerPage);
            if (this.currentPage < totalPages) {
                this.currentPage++;
                this.displayLogs(this.filteredLogs);
            }
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
        
        document.getElementById('enable-notifications').addEventListener('change', (e) => {
            this.settings.enableNotifications = e.target.checked;
            this.saveSettings();
        });
        
        document.getElementById('theme-preference').addEventListener('change', (e) => {
            this.settings.theme = e.target.value;
            this.saveSettings();
            this.applyTheme(e.target.value);
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
                    case '5':
                        e.preventDefault();
                        this.switchTab('analytics');
                        break;
                    case 'r':
                        e.preventDefault();
                        this.refreshData();
                        break;
                    case 'f':
                        e.preventDefault();
                        document.getElementById('search-input').focus();
                        break;
                    case 'd':
                        e.preventDefault();
                        this.toggleTheme();
                        break;
                }
            }
            
            if (e.key === 'Escape') {
                if (document.querySelector('.modal.active')) {
                    this.closeModal();
                } else if (this.searchQuery) {
                    document.getElementById('search-input').value = '';
                    this.searchQuery = '';
                    this.filterLogs();
                }
            }
            
            if (e.key === 'F11') {
                e.preventDefault();
                this.toggleFullscreen();
            }
            
            if (e.key === '?') {
                e.preventDefault();
                this.showKeyboardShortcuts();
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
     * Initialize theme system
     */
    initializeTheme() {
        this.applyTheme(this.settings.theme);
    }
    
    /**
     * Apply theme
     */
    applyTheme(theme) {
        document.body.setAttribute('data-theme', theme);
        
        const themeIcon = document.querySelector('.theme-icon');
        if (theme === 'dark') {
            themeIcon.textContent = '☀️';
        } else if (theme === 'light') {
            themeIcon.textContent = '🌙';
        } else {
            // Auto theme
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            themeIcon.textContent = prefersDark ? '☀️' : '🌙';
        }
    }
    
    /**
     * Toggle theme
     */
    toggleTheme() {
        const themes = ['auto', 'light', 'dark'];
        const currentIndex = themes.indexOf(this.settings.theme);
        const nextIndex = (currentIndex + 1) % themes.length;
        
        this.settings.theme = themes[nextIndex];
        this.saveSettings();
        this.applyTheme(this.settings.theme);
        
        // Update settings modal if open
        const themeSelect = document.getElementById('theme-preference');
        if (themeSelect) {
            themeSelect.value = this.settings.theme;
        }
    }
    
    /**
     * Toggle fullscreen
     */
    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            document.querySelector('.fullscreen-icon').textContent = '⛶';
        } else {
            document.exitFullscreen();
            document.querySelector('.fullscreen-icon').textContent = '⛶';
        }
    }
    
    /**
     * Request notification permission
     */
    requestNotificationPermission() {
        if ('Notification' in window && this.settings.enableNotifications) {
            Notification.requestPermission();
        }
    }
    
    /**
     * Show notification
     */
    showNotification(title, message, type = 'info') {
        if (!this.settings.enableNotifications || Notification.permission !== 'granted') {
            return;
        }
        
        const notification = new Notification(title, {
            body: message,
            icon: '/favicon.ico',
            tag: 'vlogger-' + type
        });
        
        setTimeout(() => notification.close(), 5000);
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
            case 'analytics':
                this.loadAnalytics();
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
            document.getElementById('project-version').textContent = `v${projectInfo.version || '1.5.12'}`;
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
            
            // Calculate additional stats
            const totalRequests = stats.totalRequests || stats.total_requests || 0;
            const totalErrors = stats.totalErrors || stats.total_errors || 0;
            const successRate = totalRequests > 0 ? ((totalRequests - totalErrors) / totalRequests * 100).toFixed(1) : 100;
            document.getElementById('success-rate').textContent = `${successRate}%`;
            
            // Calculate average response time
            const endpoints = stats.endpoints || [];
            let totalDuration = 0;
            let totalCalls = 0;
            endpoints.forEach(endpoint => {
                totalDuration += (endpoint.totalDuration || 0);
                totalCalls += (endpoint.calls || 0);
            });
            const avgResponse = totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0;
            document.getElementById('avg-response').textContent = `${avgResponse}ms`;
            
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
            
            // Check for new logs
            const newLogsCount = logs.length - this.currentLogs.length;
            if (newLogsCount > 0 && this.currentLogs.length > 0) {
                this.showNotification('New Logs', `${newLogsCount} new request(s) logged`, 'info');
            }
            
            this.currentLogs = logs;
            if (logs.length > this.lastLogCount) {
                // New logs detected
                this.lastLogCount = logs.length;
            }
            
            this.filterLogs();
            
        } catch (error) {
            console.error('Error loading logs:', error);
            this.showError('Failed to load logs');
        }
    }
    
    /**
     * Filter logs based on search and filters
     */
    filterLogs() {
        let filtered = [...this.currentLogs];
        
        // Apply search filter
        if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase();
            filtered = filtered.filter(log => 
                log.method?.toLowerCase().includes(query) ||
                log.path?.toLowerCase().includes(query) ||
                log.ip?.toLowerCase().includes(query) ||
                (log.response?.status && log.response.status.toString().includes(query))
            );
        }
        
        // Apply method filter
        if (this.filters.method) {
            filtered = filtered.filter(log => log.method === this.filters.method);
        }
        
        // Apply status filter
        if (this.filters.status) {
            const statusRange = this.filters.status;
            filtered = filtered.filter(log => {
                const status = log.response?.status;
                if (!status) return false;
                
                switch (statusRange) {
                    case '2xx': return status >= 200 && status < 300;
                    case '3xx': return status >= 300 && status < 400;
                    case '4xx': return status >= 400 && status < 500;
                    case '5xx': return status >= 500 && status < 600;
                    default: return true;
                }
            });
        }
        
        // Apply time filter
        if (this.filters.time) {
            const now = Date.now();
            const timeLimit = this.getTimeLimit(this.filters.time);
            filtered = filtered.filter(log => {
                const logTime = new Date(log.timestamp).getTime();
                return now - logTime <= timeLimit;
            });
        }
        
        this.filteredLogs = filtered;
        this.currentPage = 1; // Reset to first page
        this.displayLogs(filtered);
    }
    
    /**
     * Get time limit in milliseconds
     */
    getTimeLimit(timeFilter) {
        switch (timeFilter) {
            case '1h': return 60 * 60 * 1000;
            case '24h': return 24 * 60 * 60 * 1000;
            case '7d': return 7 * 24 * 60 * 60 * 1000;
            default: return Infinity;
        }
    }
    
    /**
     * Display logs in the UI
     */
    displayLogs(logs) {
        const logsContainer = document.getElementById('logs');
        const pagination = document.getElementById('logs-pagination');
        
        if (logs.length === 0) {
            logsContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📋</div>
                    <p>${this.searchQuery || Object.values(this.filters).some(f => f) ? 'No logs match your filters' : 'No requests logged yet...'}</p>
                    <small>${this.searchQuery || Object.values(this.filters).some(f => f) ? 'Try adjusting your search or filters' : 'Start making requests to see logs appear here'}</small>
                </div>
            `;
            pagination.style.display = 'none';
            return;
        }
        
        // Pagination
        const totalPages = Math.ceil(logs.length / this.logsPerPage);
        const startIndex = (this.currentPage - 1) * this.logsPerPage;
        const endIndex = startIndex + this.logsPerPage;
        const paginatedLogs = logs.slice(startIndex, endIndex);
        
        // Update pagination controls
        if (totalPages > 1) {
            pagination.style.display = 'flex';
            document.getElementById('page-info').textContent = `Page ${this.currentPage} of ${totalPages} (${logs.length} total)`;
            document.getElementById('prev-page').disabled = this.currentPage === 1;
            document.getElementById('next-page').disabled = this.currentPage === totalPages;
        } else {
            pagination.style.display = 'none';
        }
        
        const logsHTML = paginatedLogs.map((log, index) => {
            const isError = log.isError || log.is_error;
            const method = (log.method || '').toUpperCase();
            const status = log.response?.status || 'N/A';
            const duration = Math.round(log.performance?.duration || 0);
            const timestamp = new Date(log.timestamp).toLocaleString();
            const isNew = index >= paginatedLogs.length - 5;
            const isHighlighted = this.searchQuery && (
                log.method?.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                log.path?.toLowerCase().includes(this.searchQuery.toLowerCase())
            );
            
            return `
                <div class="log-entry ${isNew ? 'new' : ''} ${isHighlighted ? 'highlighted' : ''}" onclick="showLogDetail('${log.id}')">
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
        window.currentLogs = this.currentLogs;
        
        // Auto-scroll to bottom if enabled
        if (document.getElementById('auto-scroll').checked && this.currentPage === Math.ceil(logs.length / this.logsPerPage)) {
            logsContainer.scrollTop = logsContainer.scrollHeight;
        }
    }
    
    /**
     * Load endpoints data
     */
    async loadEndpoints() {
        try {
            const response = await fetch('/api/stats');
            const stats = await response.json();
            const endpoints = stats.endpoints || [];
            
            // Apply sorting
            const sortBy = document.getElementById('endpoint-sort')?.value || 'calls';
            const sortedEndpoints = [...endpoints].sort((a, b) => {
                switch (sortBy) {
                    case 'errors': return (b.errors || 0) - (a.errors || 0);
                    case 'avgDuration': return (b.avgDuration || b.avg_duration || 0) - (a.avgDuration || a.avg_duration || 0);
                    case 'maxDuration': return (b.maxDuration || b.max_duration || 0) - (a.maxDuration || a.max_duration || 0);
                    default: return (b.calls || 0) - (a.calls || 0);
                }
            });
            
            this.displayEndpoints(sortedEndpoints);
            
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
            const avgDuration = Math.round(endpoint.avgDuration || endpoint.avg_duration || 0);
            const maxDuration = Math.round(endpoint.maxDuration || endpoint.max_duration || 0);
            const minDuration = Math.round(endpoint.minDuration || endpoint.min_duration || 0);
            
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
                            <div class="endpoint-stat-value">${avgDuration}ms</div>
                            <div class="endpoint-stat-label">Avg Duration</div>
                        </div>
                        <div class="endpoint-stat">
                            <div class="endpoint-stat-value">${maxDuration}ms</div>
                            <div class="endpoint-stat-label">Max Duration</div>
                        </div>
                        <div class="endpoint-stat">
                            <div class="endpoint-stat-value">${minDuration}ms</div>
                            <div class="endpoint-stat-label">Min Duration</div>
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
        
        // Calculate performance insights
        const totalRequests = stats.totalRequests || stats.total_requests || 0;
        const totalErrors = stats.totalErrors || stats.total_errors || 0;
        const avgResponseTime = endpoints.reduce((sum, ep) => sum + (ep.avgDuration || ep.avg_duration || 0), 0) / endpoints.length;
        
        const performanceHTML = `
            <div style="padding: var(--spacing-lg);">
                <div class="performance-summary" style="margin-bottom: var(--spacing-xl);">
                    <div class="analytics-grid">
                        <div class="analytics-card">
                            <h3>Performance Overview</h3>
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: var(--spacing-md);">
                                <div class="endpoint-stat">
                                    <div class="endpoint-stat-value">${Math.round(avgResponseTime)}ms</div>
                                    <div class="endpoint-stat-label">Avg Response Time</div>
                                </div>
                                <div class="endpoint-stat">
                                    <div class="endpoint-stat-value">${((totalRequests - totalErrors) / totalRequests * 100).toFixed(1)}%</div>
                                    <div class="endpoint-stat-label">Success Rate</div>
                                </div>
                                <div class="endpoint-stat">
                                    <div class="endpoint-stat-value">${totalRequests}</div>
                                    <div class="endpoint-stat-label">Total Requests</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
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
                                <div style="margin-top: var(--spacing-sm); color: var(--text-secondary); font-size: 0.75rem;">
                                    ${endpoint.calls} calls, ${endpoint.errors} errors
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
        
        // Group errors by type
        const groupBy = document.getElementById('error-grouping')?.value || 'status';
        const groupedErrors = this.groupErrors(errors, groupBy);
        
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
                <div class="error-summary" style="margin-bottom: var(--spacing-xl);">
                    <div class="analytics-grid">
                        <div class="analytics-card">
                            <h3>Error Summary</h3>
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: var(--spacing-md);">
                                ${Object.entries(groupedErrors).map(([key, group]) => `
                                    <div class="endpoint-stat">
                                        <div class="endpoint-stat-value">${group.length}</div>
                                        <div class="endpoint-stat-label">${key}</div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>
                
                <h3>Recent Errors (${errors.length} total)</h3>
                <div>
                    ${errorsHTML}
                </div>
            </div>
        `;
    }
    
    /**
     * Group errors by specified criteria
     */
    groupErrors(errors, groupBy) {
        const groups = {};
        
        errors.forEach(error => {
            let key;
            switch (groupBy) {
                case 'status':
                    key = `${error.response?.status || 'Unknown'}`;
                    break;
                case 'endpoint':
                    key = `${error.method} ${error.path}`;
                    break;
                case 'time':
                    const date = new Date(error.timestamp);
                    key = date.toDateString();
                    break;
                default:
                    key = 'All';
            }
            
            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(error);
        });
        
        return groups;
    }
    
    /**
     * Load analytics data
     */
    async loadAnalytics() {
        try {
            const [statsResponse, logsResponse] = await Promise.all([
                fetch('/api/stats'),
                fetch('/api/logs')
            ]);
            
            const stats = await statsResponse.json();
            const logs = await logsResponse.json();
            
            this.displayAnalytics(stats, logs);
            
        } catch (error) {
            console.error('Error loading analytics:', error);
            this.showError('Failed to load analytics');
        }
    }
    
    /**
     * Display analytics
     */
    displayAnalytics(stats, logs) {
        const container = document.getElementById('analytics');
        
        // Analyze user agents
        const userAgents = this.analyzeUserAgents(logs);
        
        // Update user agents display
        const userAgentsContainer = document.getElementById('user-agents');
        if (userAgentsContainer) {
            userAgentsContainer.innerHTML = Object.entries(userAgents)
                .slice(0, 4)
                .map(([agent, percentage]) => `
                    <div class="user-agent-item">
                        <span>${agent}</span>
                        <span class="percentage">${percentage}%</span>
                    </div>
                `).join('');
        }
        
        // Update status distribution
        const statusDistribution = this.analyzeStatusDistribution(logs);
        const statusContainer = document.getElementById('status-distribution');
        if (statusContainer) {
            statusContainer.innerHTML = Object.entries(statusDistribution)
                .map(([range, percentage]) => `
                    <div class="status-item">
                        <span class="status-color status-${range}"></span>
                        <span>${range}: ${percentage}%</span>
                    </div>
                `).join('');
        }
    }
    
    /**
     * Analyze user agents
     */
    analyzeUserAgents(logs) {
        const agents = {};
        const total = logs.length;
        
        logs.forEach(log => {
            const userAgent = log.headers?.['user-agent'] || 'Unknown';
            let browser = 'Other';
            
            if (userAgent.includes('Chrome')) browser = 'Chrome';
            else if (userAgent.includes('Firefox')) browser = 'Firefox';
            else if (userAgent.includes('Safari')) browser = 'Safari';
            else if (userAgent.includes('Edge')) browser = 'Edge';
            
            agents[browser] = (agents[browser] || 0) + 1;
        });
        
        // Convert to percentages
        Object.keys(agents).forEach(agent => {
            agents[agent] = ((agents[agent] / total) * 100).toFixed(1);
        });
        
        return agents;
    }
    
    /**
     * Analyze status code distribution
     */
    analyzeStatusDistribution(logs) {
        const distribution = { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0 };
        const total = logs.length;
        
        logs.forEach(log => {
            const status = log.response?.status;
            if (status >= 200 && status < 300) distribution['2xx']++;
            else if (status >= 300 && status < 400) distribution['3xx']++;
            else if (status >= 400 && status < 500) distribution['4xx']++;
            else if (status >= 500) distribution['5xx']++;
        });
        
        // Convert to percentages
        Object.keys(distribution).forEach(range => {
            distribution[range] = ((distribution[range] / total) * 100).toFixed(1);
        });
        
        return distribution;
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
        
        // Clear filters and search
        document.getElementById('search-input').value = '';
        document.getElementById('method-filter').value = '';
        document.getElementById('status-filter').value = '';
        document.getElementById('time-filter').value = '';
        
        this.searchQuery = '';
        this.filters = { method: '', status: '', time: '' };
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
        document.getElementById('enable-notifications').checked = this.settings.enableNotifications;
        document.getElementById('theme-preference').value = this.settings.theme;
        
        this.showModal('settings-modal');
    }
    
    /**
     * Show keyboard shortcuts modal
     */
    showKeyboardShortcuts() {
        this.showModal('shortcuts-modal');
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
            showPerformance: true,
            enableNotifications: false,
            theme: 'auto'
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
        console.error(message);
        
        // Show notification if available
        if (this.settings.enableNotifications) {
            this.showNotification('Error', message, 'error');
        }
        
        // Could be enhanced with a toast system
        const toast = document.createElement('div');
        toast.className = 'toast error';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--error-500);
            color: white;
            padding: var(--spacing-md);
            border-radius: var(--radius-md);
            z-index: 10000;
            animation: slideIn 0.3s ease-out;
        `;
        
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.remove();
        }, 5000);
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

function showKeyboardShortcuts() {
    if (window.dashboard) {
        window.dashboard.showKeyboardShortcuts();
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