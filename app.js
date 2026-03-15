/**
 * TPSE 5° 2° - App Controller
 * Taller de Proyectos Socio Educativos
 * Versión: 2.0.0
 */

// ============================================
// CONFIGURACIÓN GLOBAL
// ============================================

const CONFIG = {
    appName: 'TPSE 5° 2°',
    version: '2.0.0',
    storagePrefix: 'tpse_',
    syncInterval: 30000, // 30 segundos
    debounceDelay: 300,
    animations: {
        enabled: true,
        duration: 300
    }
};

// ============================================
// ESTADO GLOBAL DE LA APP
// ============================================

const AppState = {
    currentSection: 'dashboard',
    isOnline: navigator.onLine,
    isInstalled: false,
    deferredPrompt: null,
    projects: [],
    materials: [],
    notifications: [],
    user: {
        name: 'Estudiante',
        role: 'Coordinador/a',
        avatar: 'assets/avatar-me.png'
    },
    sync: {
        isSyncing: false,
        lastSync: null,
        queue: []
    }
};

// ============================================
// UTILIDADES (Helpers)
// ============================================

const Utils = {
    // Generar ID único
    generateId: () => `_${Math.random().toString(36).substr(2, 9)}`,
    
    // Formatear fecha
    formatDate: (date) => {
        const d = new Date(date);
        return d.toLocaleDateString('es-AR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    },
    
    // Tiempo relativo
    timeAgo: (date) => {
        const seconds = Math.floor((new Date() - new Date(date)) / 1000);
        const intervals = {
            año: 31536000,
            mes: 2592000,
            semana: 604800,
            día: 86400,
            hora: 3600,
            minuto: 60
        };
        
        for (const [unit, secondsInUnit] of Object.entries(intervals)) {
            const interval = Math.floor(seconds / secondsInUnit);
            if (interval >= 1) {
                return `Hace ${interval} ${unit}${interval > 1 ? 's' : ''}`;
            }
        }
        return 'Hace un momento';
    },
    
    // Debounce para eventos frecuentes
    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },
    
    // Guardar en localStorage con prefijo
    storage: {
        set: (key, value) => {
            try {
                localStorage.setItem(CONFIG.storagePrefix + key, JSON.stringify(value));
                return true;
            } catch (e) {
                console.error('Error guardando:', e);
                return false;
            }
        },
        get: (key, defaultValue = null) => {
            try {
                const item = localStorage.getItem(CONFIG.storagePrefix + key);
                return item ? JSON.parse(item) : defaultValue;
            } catch (e) {
                return defaultValue;
            }
        },
        remove: (key) => localStorage.removeItem(CONFIG.storagePrefix + key)
    },
    
    // Animaciones suaves
    animate: (element, animation, duration = CONFIG.animations.duration) => {
        if (!CONFIG.animations.enabled) return;
        element.style.animation = `${animation} ${duration}ms ease`;
        setTimeout(() => element.style.animation = '', duration);
    }
};

// ============================================
// SISTEMA DE NOTIFICACIONES (Toast)
// ============================================

const Toast = {
    container: null,
    
    init() {
        this.container = document.getElementById('toast-container');
    },
    
    show(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.setAttribute('role', 'alert');
        
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        
        toast.innerHTML = `
            <span class="toast-icon">${icons[type]}</span>
            <span class="toast-message">${message}</span>
            <button class="toast-close" aria-label="Cerrar notificación">✕</button>
        `;
        
        this.container.appendChild(toast);
        
        // Animación de entrada
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });
        
        // Auto-cerrar
        const timeout = setTimeout(() => this.dismiss(toast), duration);
        
        // Cerrar manual
        toast.querySelector('.toast-close').addEventListener('click', () => {
            clearTimeout(timeout);
            this.dismiss(toast);
        });
    },
    
    dismiss(toast) {
        toast.classList.remove('show');
        toast.addEventListener('transitionend', () => toast.remove());
    },
    
    success: (msg) => Toast.show(msg, 'success'),
    error: (msg) => Toast.show(msg, 'error'),
    warning: (msg) => Toast.show(msg, 'warning'),
    info: (msg) => Toast.show(msg, 'info')
};

// ============================================
// GESTIÓN DE NAVEGACIÓN
// ============================================

const Navigation = {
    sections: ['dashboard', 'proyectos', 'materiales', 'calendario', 'equipo'],
    
    init() {
        // Navegación por hash
        window.addEventListener('hashchange', () => this.handleHashChange());
        
        // Navegación por clicks
        document.querySelectorAll('.nav-item, .nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                const section = link.dataset.section;
                if (section) {
                    e.preventDefault();
                    this.navigateTo(section);
                }
            });
        });
        
        // Estado inicial
        const initialHash = window.location.hash.replace('#', '') || 'dashboard';
        this.navigateTo(initialHash);
    },
    
    navigateTo(sectionId) {
        if (!this.sections.includes(sectionId)) return;
        
        // Ocultar sección actual
        document.querySelectorAll('.section').forEach(sec => {
            sec.classList.add('hidden');
            sec.classList.remove('active');
        });
        
        // Mostrar nueva sección
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.remove('hidden');
            targetSection.classList.add('active');
            Utils.animate(targetSection, 'fadeInUp');
        }
        
        // Actualizar navegación activa
        document.querySelectorAll('.nav-item, .nav-link').forEach(link => {
            link.classList.toggle('active', link.dataset.section === sectionId);
        });
        
        // Actualizar estado y URL
        AppState.currentSection = sectionId;
        window.location.hash = sectionId;
        
        // Scroll al top
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        // Evento personalizado
        window.dispatchEvent(new CustomEvent('sectionchange', { detail: sectionId }));
    },
    
    handleHashChange() {
        const hash = window.location.hash.replace('#', '');
        if (hash && hash !== AppState.currentSection) {
            this.navigateTo(hash);
        }
    }
};

// ============================================
// GESTIÓN DE PROYECTOS
// ============================================

const ProjectManager = {
    init() {
        this.loadProjects();
        this.setupFilters();
        this.renderProjects();
        
        // Escuchar cambios de sección
        window.addEventListener('sectionchange', (e) => {
            if (e.detail === 'proyectos') this.renderProjects();
        });
    },
    
    loadProjects() {
        AppState.projects = Utils.storage.get('projects', [
            {
                id: 'proj-1',
                title: 'Huerta Escolar Sustentable',
                description: 'Implementación de huerta orgánica como recurso pedagógico interdisciplinario.',
                status: 'active',
                progress: 35,
                stage: 'Diagnóstico',
                team: ['user', 'maria', 'lucas', 'ana', 'pedro'],
                startDate: '2024-03-10',
                icon: '🌱',
                color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            },
            {
                id: 'proj-2',
                title: 'Taller de Expresión Corporal',
                description: 'Propuesta de danza y teatro para la inclusión de estudiantes con dificultades.',
                status: 'draft',
                progress: 15,
                stage: 'Propuesta',
                team: ['user', 'carla', 'martin'],
                startDate: '2024-03-15',
                icon: '🎭',
                color: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
            }
        ]);
    },
    
    saveProjects() {
        Utils.storage.set('projects', AppState.projects);
    },
    
    createProject(projectData) {
        const newProject = {
            id: Utils.generateId(),
            status: 'draft',
            progress: 0,
            stage: 'Ideación',
            team: ['user'],
            startDate: new Date().toISOString(),
            ...projectData
        };
        
        AppState.projects.unshift(newProject);
        this.saveProjects();
        this.renderProjects();
        
        Toast.success('¡Proyecto creado exitosamente!');
        return newProject;
    },
    
    updateProject(id, updates) {
        const index = AppState.projects.findIndex(p => p.id === id);
        if (index !== -1) {
            AppState.projects[index] = { ...AppState.projects[index], ...updates };
            this.saveProjects();
            this.renderProjects();
        }
    },
    
    deleteProject(id) {
        AppState.projects = AppState.projects.filter(p => p.id !== id);
        this.saveProjects();
        this.renderProjects();
        Toast.success('Proyecto eliminado');
    },
    
    setupFilters() {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.renderProjects(e.target.dataset.filter);
            });
        });
    },
    
    renderProjects(filter = 'all') {
        const container = document.getElementById('projects-container');
        if (!container) return;
        
        let filtered = AppState.projects;
        if (filter !== 'all') {
            filtered = AppState.projects.filter(p => p.status === filter);
        }
        
        // Actualizar stats
        document.getElementById('active-projects').textContent = 
            AppState.projects.filter(p => p.status === 'active').length;
        
        container.innerHTML = filtered.map(project => this.createProjectCard(project)).join('');
        
        // Agregar card de "nuevo" al final
        container.innerHTML += `
            <button class="project-card add-new" onclick="createNewProject()">
                <div class="add-icon">➕</div>
                <span>Crear nuevo proyecto</span>
            </button>
        `;
    },
    
    createProjectCard(project) {
        const statusLabels = {
            active: 'En curso',
            draft: 'Borrador',
            completed: 'Finalizado'
        };
        
        return `
            <article class="project-card" data-status="${project.status}" data-id="${project.id}">
                <div class="project-header">
                    <div class="project-icon" style="background: ${project.color}">
                        ${project.icon}
                    </div>
                    <div class="project-meta">
                        <span class="project-status ${project.status}">${statusLabels[project.status]}</span>
                        <span class="project-date">Inicio: ${Utils.formatDate(project.startDate)}</span>
                    </div>
                </div>
                <h3>${project.title}</h3>
                <p>${project.description}</p>
                
                <div class="project-team">
                    <div class="team-avatars">
                        ${project.team.slice(0, 3).map(() => 
                            `<div class="avatar-placeholder"></div>`
                        ).join('')}
                        ${project.team.length > 3 ? `<span class="avatar-more">+${project.team.length - 3}</span>` : ''}
                    </div>
                    <span class="team-count">${project.team.length} integrantes</span>
                </div>

                <div class="project-progress">
                    <div class="progress-info">
                        <span>Etapa: ${project.stage}</span>
                        <span>${project.progress}%</span>
                    </div>
                    <div class="progress-bar small">
                        <div class="progress-fill" style="width: ${project.progress}%"></div>
                    </div>
                </div>

                <div class="project-actions">
                    <button class="btn-secondary" onclick="viewProject('${project.id}')">Ver detalles</button>
                    <button class="btn-icon" onclick="projectOptions('${project.id}')" aria-label="Opciones">⋮</button>
                </div>
            </article>
        `;
    }
};

// ============================================
// GESTIÓN DE MATERIALES
// ============================================

const MaterialManager = {
    init() {
        this.setupSearch();
        this.setupCategories();
        this.renderMaterials();
    },
    
    setupSearch() {
        const searchInput = document.getElementById('material-search');
        if (searchInput) {
            searchInput.addEventListener('input', Utils.debounce((e) => {
                this.renderMaterials(null, e.target.value);
            }, CONFIG.debounceDelay));
        }
    },
    
    setupCategories() {
        document.querySelectorAll('.category-chip').forEach(chip => {
            chip.addEventListener('click', (e) => {
                document.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
                e.target.classList.add('active');
                this.renderMaterials(e.target.dataset.category);
            });
        });
    },
    
    renderMaterials(category = 'all', search = '') {
        const container = document.getElementById('materials-container');
        if (!container) return;
        
        const materials = [
            {
                id: 'mat-1',
                title: 'Guía de Diagnóstico Participativo',
                desc: 'Metodologías para el relevamiento de necesidades comunitarias',
                category: 'guia',
                type: 'PDF',
                size: '2.4 MB',
                status: 'available',
                icon: '📄'
            },
            {
                id: 'mat-2',
                title: 'Template: Plan de Proyecto',
                desc: 'Estructura estándar para presentación de propuestas',
                category: 'template',
                type: 'DOCX',
                size: '850 KB',
                status: 'available',
                icon: '📋'
            },
            {
                id: 'mat-3',
                title: 'Proyecto Ejemplo: Biblioteca Comunitaria',
                desc: 'Caso completo de implementación en escuela rural',
                category: 'ejemplo',
                type: 'PDF',
                size: '5.1 MB',
                status: 'syncing',
                icon: '📚'
            },
            {
                id: 'mat-4',
                title: 'Tutorial: Herramientas de Evaluación',
                desc: 'Video explicativo sobre indicadores de impacto',
                category: 'video',
                type: 'MP4',
                size: '45 min',
                status: 'locked',
                icon: '🎥'
            }
        ];
        
        let filtered = materials;
        
        if (category !== 'all') {
            filtered = filtered.filter(m => m.category === category);
        }
        
        if (search) {
            const searchLower = search.toLowerCase();
            filtered = filtered.filter(m => 
                m.title.toLowerCase().includes(searchLower) ||
                m.desc.toLowerCase().includes(searchLower)
            );
        }
        
        container.innerHTML = filtered.map(m => this.createMaterialItem(m)).join('');
    },
    
    createMaterialItem(material) {
        const statusConfig = {
            available: { icon: '✓', class: 'available', label: 'Offline' },
            syncing: { icon: '⏳', class: 'syncing', label: 'Sincronizando...' },
            locked: { icon: '🔒', class: 'locked', label: 'Próximamente' }
        };
        
        const status = statusConfig[material.status];
        
        return `
            <article class="material-item" data-category="${material.category}" data-status="${material.status}">
                <div class="material-icon-box ${status.class}">
                    <span>${material.icon}</span>
                    <div class="sync-status" title="${status.label}">${status.icon}</div>
                </div>
                <div class="material-details">
                    <h4>${material.title}</h4>
                    <p class="material-desc">${material.desc}</p>
                    <div class="material-tags">
                        <span class="tag">${material.type}</span>
                        <span class="tag">${material.size}</span>
                        <span class="tag tag-${material.status}">${status.label}</span>
                    </div>
                </div>
                <div class="material-actions">
                    ${material.status === 'available' ? `
                        <button class="btn-icon" onclick="viewMaterial('${material.id}')" aria-label="Ver">👁️</button>
                        <button class="btn-icon" onclick="shareMaterial('${material.id}')" aria-label="Compartir">📤</button>
                    ` : `
                        <button class="btn-icon" disabled aria-label="No disponible">${status.icon}</button>
                    `}
                </div>
            </article>
        `;
    }
};

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
        
        const indicator = document.getElementById('connection-status');
        if (indicator) {
            indicator.className = `connection-indicator ${online ? 'online' : 'offline'}`;
            indicator.querySelector('.status-text').textContent = online ? 'Online' : 'Offline';
        }
        
        if (online) {
            Toast.success('¡Conexión restaurada! Sincronizando...');
            this.syncNow();
        } else {
            Toast.warning('Modo offline activado. Los cambios se guardarán localmente.');
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
            
            Toast.success('Sincronización completada');
        } catch (error) {
            console.error('Error de sincronización:', error);
            Toast.error('Error al sincronizar. Se reintentará más tarde.');
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
            console.log('Sincronizando:', task);
            // Aquí iría la lógica real de sincronización
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

// ============================================
// INSTALACIÓN DE PWA
// ============================================

const InstallManager = {
    init() {
        this.setupInstallPrompt();
        this.checkInstalled();
    },
    
    setupInstallPrompt() {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            AppState.deferredPrompt = e;
            this.showInstallBanner();
        });
        
        window.addEventListener('appinstalled', () => {
            AppState.isInstalled = true;
            this.hideInstallBanner();
            Toast.success('¡App instalada correctamente!');
            AppState.deferredPrompt = null;
        });
        
        // Botones del banner
        const installBtn = document.getElementById('install-btn');
        const dismissBtn = document.getElementById('dismiss-install');
        
        if (installBtn) {
            installBtn.addEventListener('click', () => this.installApp());
        }
        
        if (dismissBtn) {
            dismissBtn.addEventListener('click', () => this.dismissInstall());
        }
    },
    
    showInstallBanner() {
        const banner = document.getElementById('install-banner');
        if (banner && !Utils.storage.get('installDismissed')) {
            banner.classList.remove('hidden');
            banner.classList.add('visible');
        }
    },
    
    hideInstallBanner() {
        const banner = document.getElementById('install-banner');
        if (banner) {
            banner.classList.remove('visible');
            setTimeout(() => banner.classList.add('hidden'), 300);
        }
    },
    
    async installApp() {
        if (!AppState.deferredPrompt) return;
        
        AppState.deferredPrompt.prompt();
        const { outcome } = await AppState.deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
            console.log('Usuario aceptó instalación');
        } else {
            console.log('Usuario rechazó instalación');
            this.dismissInstall();
        }
        
        AppState.deferredPrompt = null;
    },
    
    dismissInstall() {
        this.hideInstallBanner();
        Utils.storage.set('installDismissed', true);
        Utils.storage.set('installDismissedDate', new Date().toISOString());
    },
    
    checkInstalled() {
        if (window.matchMedia('(display-mode: standalone)').matches) {
            AppState.isInstalled = true;
        }
    }
};

// ============================================
// AVISOS Y NOTIFICACIONES
// ============================================

const NoticeManager = {
    init() {
        this.markReadListeners();
        this.updateUnreadCount();
    },
    
    markReadListeners() {
        document.querySelectorAll('.notice-item').forEach(notice => {
            notice.addEventListener('click', () => {
                if (notice.classList.contains('unread')) {
                    notice.classList.remove('unread');
                    this.updateUnreadCount();
                    Utils.animate(notice, 'pulse');
                }
            });
        });
    },
    
    updateUnreadCount() {
        const unread = document.querySelectorAll('.notice-item.unread').length;
        // Aquí podrías actualizar un badge en la navegación
    },
    
    markAllRead() {
        document.querySelectorAll('.notice-item.unread').forEach(notice => {
            notice.classList.remove('unread');
        });
        this.updateUnreadCount();
        Toast.success('Todos los avisos marcados como leídos');
    }
};

// ============================================
// MODAL SYSTEM
// ============================================

const Modal = {
    overlay: null,
    title: null,
    body: null,
    
    init() {
        this.overlay = document.getElementById('modal-overlay');
        this.title = document.getElementById('modal-title');
        this.body = document.getElementById('modal-body');
        
        // Cerrar al hacer click fuera
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) this.close();
        });
        
        // Cerrar con ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !this.overlay.classList.contains('hidden')) {
                this.close();
            }
        });
    },
    
    open(title, content) {
        this.title.textContent = title;
        this.body.innerHTML = content;
        this.overlay.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        Utils.animate(this.overlay.querySelector('.modal-content'), 'slideUp');
    },
    
    close() {
        this.overlay.classList.add('hidden');
        document.body.style.overflow = '';
    }
};

// ============================================
// FUNCIONES GLOBALES (expuestas al HTML)
// ============================================

window.navigateTo = (section) => Navigation.navigateTo(section);

window.createNewProject = () => {
    Modal.open('Nuevo Proyecto', `
        <form id="new-project-form" class="form-modern">
            <div class="form-group">
                <label for="project-title">Título del proyecto</label>
                <input type="text" id="project-title" required placeholder="Ej: Huerta Escolar Sustentable">
            </div>
            <div class="form-group">
                <label for="project-desc">Descripción breve</label>
                <textarea id="project-desc" rows="3" placeholder="Describe el objetivo principal..."></textarea>
            </div>
            <div class="form-group">
                <label for="project-icon">Icono representativo</label>
                <select id="project-icon">
                    <option value="🌱">🌱 Naturaleza</option>
                    <option value="🎭">🎭 Arte</option>
                    <option value="📚">📚 Educación</option>
                    <option value="♻️">♻️ Reciclaje</option>
                    <option value="🤝">🤝 Comunidad</option>
                    <option value="💻">💻 Tecnología</option>
                </select>
            </div>
            <div class="form-actions">
                <button type="button" class="btn-secondary" onclick="Modal.close()">Cancelar</button>
                <button type="submit" class="btn btn-primary">Crear Proyecto</button>
            </div>
        </form>
    `);
    
    // Handler del formulario
    setTimeout(() => {
        document.getElementById('new-project-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const title = document.getElementById('project-title').value;
            const desc = document.getElementById('project-desc').value;
            const icon = document.getElementById('project-icon').value;
            
            ProjectManager.createProject({
                title,
                description: desc,
                icon,
                color: `linear-gradient(135deg, ${Utils.generateColor()} 0%, ${Utils.generateColor()} 100%)`
            });
            
            Modal.close();
        });
    }, 100);
};

window.viewProject = (id) => {
    const project = AppState.projects.find(p => p.id === id);
    if (!project) return;
    
    Modal.open(project.title, `
        <div class="project-detail">
            <div class="detail-header" style="background: ${project.color}; padding: 2rem; border-radius: 12px; color: white; margin-bottom: 1.5rem;">
                <div style="font-size: 4rem; margin-bottom: 1rem;">${project.icon}</div>
                <h2 style="color: white; margin: 0;">${project.title}</h2>
                <p style="opacity: 0.9; margin: 0.5rem 0 0 0;">${project.description}</p>
            </div>
            
            <div class="detail-stats" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 1.5rem;">
                <div class="stat-box" style="text-align: center; padding: 1rem; background: var(--bg-secondary); border-radius: 12px;">
                    <div style="font-size: 1.5rem; font-weight: 800; color: var(--primary-500);">${project.progress}%</div>
                    <div style="font-size: 0.875rem; color: var(--text-secondary);">Progreso</div>
                </div>
                <div class="stat-box" style="text-align: center; padding: 1rem; background: var(--bg-secondary); border-radius: 12px;">
                    <div style="font-size: 1.5rem; font-weight: 800; color: var(--primary-500);">${project.team.length}</div>
                    <div style="font-size: 0.875rem; color: var(--text-secondary);">Integrantes</div>
                </div>
                <div class="stat-box" style="text-align: center; padding: 1rem; background: var(--bg-secondary); border-radius: 12px;">
                    <div style="font-size: 1.5rem; font-weight: 800; color: var(--primary-500);">${project.stage}</div>
                    <div style="font-size: 0.875rem; color: var(--text-secondary);">Etapa actual</div>
                </div>
            </div>
            
            <div class="detail-actions" style="display: flex; gap: 1rem;">
                <button class="btn btn-primary" style="flex: 1;">Continuar trabajando</button>
                <button class="btn-secondary" onclick="ProjectManager.deleteProject('${project.id}')">Eliminar</button>
            </div>
        </div>
    `);
};

window.projectOptions = (id) => {
    // Menú contextual simple
    const options = confirm('¿Qué deseas hacer?\nAceptar: Ver detalles\nCancelar: Eliminar proyecto');
    if (options) {
        viewProject(id);
    } else {
        if (confirm('¿Estás seguro de eliminar este proyecto?')) {
            ProjectManager.deleteProject(id);
        }
    }
};

window.markAllRead = () => NoticeManager.markAllRead();

window.inviteMember = () => {
    Toast.info('Función disponible próximamente');
};

window.contactMember = (member) => {
    Toast.info(`Abriendo chat con ${member}...`);
};

window.viewMaterial = (id) => {
    Toast.success('Abriendo material...');
};

window.shareMaterial = (id) => {
    if (navigator.share) {
        navigator.share({
            title: 'Material TPSE',
            text: 'Mira este material del Taller de Proyectos',
            url: window.location.href
        });
    } else {
        Toast.info('Enlace copiado al portapapeles');
    }
};

// Helper para generar colores aleatorios
Utils.generateColor = () => {
    const colors = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe', '#43e97b', '#38f9d7'];
    return colors[Math.floor(Math.random() * colors.length)];
};

// ============================================
// INICIALIZACIÓN DE LA APP
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    console.log(`🚀 ${CONFIG.appName} v${CONFIG.version} iniciando...`);
    
    // Inicializar módulos en orden
    Toast.init();
    Navigation.init();
    Modal.init();
    ProjectManager.init();
    MaterialManager.init();
    SyncManager.init();
    InstallManager.init();
    NoticeManager.init();
    
    // Animación de entrada
    document.body.classList.add('app-loaded');
    
    // Actualizar stats iniciales
    setTimeout(() => {
        document.getElementById('completed-tasks').textContent = '12';
        document.getElementById('team-members').textContent = '5';
        document.getElementById('overall-progress').textContent = '35%';
        document.getElementById('overall-progress-bar').style.width = '35%';
    }, 500);
    
    console.log('✅ App lista');
});

// Exponer estado para debugging (solo desarrollo)
if (location.hostname === 'localhost') {
    window.AppState = AppState;
    window.Utils = Utils;
}
