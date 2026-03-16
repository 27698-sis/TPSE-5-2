// ============================================
// SINCRONIZACIÓN Y CONECTIVIDAD
// ============================================

const SyncManager = {
    init() {
        this.setupOnlineListeners();
        this.checkConnectivity();
        this.startPeriodicSync();
    },
    
    setupOnlineListeners() {
        window.addEventListener('online', () => this.handleConnectivityChange(true));
        window.addEventListener('offline', () => this.handleConnectivityChange(false));
    },
    
    handleConnectivityChange(online) {
        AppState.isOnline = online;
        
        // Actualizar indicador visual de conexión (header)
        const indicator = document.getElementById('connection-status');
        if (indicator) {
            indicator.className = `connection-indicator ${online ? 'online' : 'offline'}`;
            indicator.querySelector('.status-text').textContent = online ? 'Online' : 'Offline';
        }
        
        if (online) {
            this.syncNow();
        }
        
        // Actualizar UI de materiales
        MaterialManager.renderMaterials();
    },
    
    checkConnectivity() {
        AppState.isOnline = navigator.onLine;
    },
    
    async syncNow() {
        if (AppState.sync.isSyncing || !AppState.isOnline) return;
        
        AppState.sync.isSyncing = true;
        this.showSyncIndicator(true);
        
        try {
            // Simular sincronización con "servidor"
            await this.processSyncQueue();
            
            AppState.sync.lastSync = new Date();
            Utils.storage.set('lastSync', AppState.sync.lastSync);
            
            // ✅ SIN TOAST - Sync silencioso en segundo plano
            
        } catch (error) {
            console.error('Error de sincronización:', error);
            // ✅ SIN TOAST - Error silencioso (se reintenta después)
        } finally {
            AppState.sync.isSyncing = false;
            this.showSyncIndicator(false);
        }
    },
    
    async processSyncQueue() {
        // Simular delay de red
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Procesar cola de cambios pendientes
        const queue = AppState.sync.queue;
        while (queue.length > 0) {
            const task = queue.shift();
            console.log('[Sync] Procesando:', task);
            // Aquí iría la lógica real de sincronización con backend
        }
        
        Utils.storage.set('syncQueue', queue);
    },
    
    showSyncIndicator(show) {
        const indicator = document.getElementById('sync-indicator');
        if (indicator) {
            indicator.classList.toggle('hidden', !show);
        }
    },
    
    startPeriodicSync() {
        // Sync automático cada 30 segundos (silencioso)
        setInterval(() => {
            if (AppState.isOnline && !AppState.sync.isSyncing) {
                this.syncNow();
            }
        }, CONFIG.syncInterval);
    },
    
    queueChange(change) {
        AppState.sync.queue.push({
            ...change,
            timestamp: new Date().toISOString(),
            id: Utils.generateId()
        });
        Utils.storage.set('syncQueue', AppState.sync.queue);
    }
};
