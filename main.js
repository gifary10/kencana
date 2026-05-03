// main.js — KPT App (Google Sheets backend)
// StorageService, DataAccess, STORAGE_KEYS sudah dipindah ke db.js

/* ==================== WORK TYPE APD ==================== */
const WORK_TYPE_APD = {
  welding: { label: 'Welding (Pengelasan)', icon: 'bi-fire', items: [
    { id: 'ppe_welding_helmet', label: 'Helm Las (Auto Darkening)' },
    { id: 'ppe_safety_glasses_weld', label: 'Kacamata Safety' },
    { id: 'ppe_leather_gloves', label: 'Sarung Tangan Tahan Panas (Leather)' },
    { id: 'ppe_fire_resistant_apron', label: 'Apron / Baju Tahan Api' },
    { id: 'ppe_safety_shoes_weld', label: 'Sepatu Safety (Steel Toe)' },
    { id: 'ppe_respirator_weld', label: 'Masker / Respirator' },
    { id: 'ppe_ear_protection_weld', label: 'Pelindung Telinga (Earplug / Earmuff)' }
  ]},
  electrical: { label: 'Pekerjaan Listrik', icon: 'bi-lightning-charge', items: [
    { id: 'ppe_non_conductive_helmet', label: 'Helm Safety (Non-Conductive)' },
    { id: 'ppe_electrical_gloves', label: 'Sarung Tangan Isolasi Listrik' },
    { id: 'ppe_electrical_shoes', label: 'Sepatu Safety Anti Listrik' },
    { id: 'ppe_face_shield_elec', label: 'Kacamata Safety / Face Shield' },
    { id: 'ppe_arc_flash_suit', label: 'Arc Flash Suit (Tegangan Tinggi)' },
    { id: 'ppe_voltage_detector', label: 'Alat Deteksi Tegangan' }
  ]},
  working_height: { label: 'Pekerjaan di Ketinggian', icon: 'bi-arrow-up', items: [
    { id: 'ppe_full_body_harness', label: 'Full Body Harness' },
    { id: 'ppe_lanyard_lifeline', label: 'Lanyard + Lifeline' },
    { id: 'ppe_helmet_chin_strap', label: 'Helm Safety dengan Chin Strap' },
    { id: 'ppe_anti_slip_shoes', label: 'Sepatu Anti Slip' },
    { id: 'ppe_work_gloves_height', label: 'Sarung Tangan Kerja' }
  ]},
  chemical: { label: 'Pekerjaan Kimia', icon: 'bi-droplet', items: [
    { id: 'ppe_chemical_suit', label: 'Baju Pelindung (Chemical Suit / Lab Coat)' },
    { id: 'ppe_chemical_gloves', label: 'Sarung Tangan Tahan Bahan Kimia' },
    { id: 'ppe_goggles_chem', label: 'Kacamata Safety / Goggles' },
    { id: 'ppe_face_shield_chem', label: 'Face Shield' },
    { id: 'ppe_respirator_chem', label: 'Respirator / Masker Khusus' },
    { id: 'ppe_rubber_boots_chem', label: 'Sepatu Boot Karet' }
  ]},
  high_noise: { label: 'Pekerjaan dengan Kebisingan Tinggi', icon: 'bi-volume-up', items: [
    { id: 'ppe_earplug', label: 'Earplug' },
    { id: 'ppe_earmuff', label: 'Earmuff' },
    { id: 'ppe_helmet_noise', label: 'Helm Safety' },
    { id: 'ppe_safety_glasses_noise', label: 'Kacamata Safety' }
  ]},
  mechanical: { label: 'Pekerjaan Mekanik / Bengkel', icon: 'bi-gear', items: [
    { id: 'ppe_safety_glasses_mech', label: 'Kacamata Safety' },
    { id: 'ppe_work_gloves_mech', label: 'Sarung Tangan Kerja' },
    { id: 'ppe_safety_shoes_mech', label: 'Sepatu Safety' },
    { id: 'ppe_coverall', label: 'Coverall / Wearpack' },
    { id: 'ppe_face_shield_grinding', label: 'Face Shield (Jika Grinding)' }
  ]},
  general_construction: { label: 'Konstruksi Umum', icon: 'bi-building', items: [
    { id: 'ppe_helmet_const', label: 'Helm Safety' },
    { id: 'ppe_reflective_vest', label: 'Rompi Reflektif' },
    { id: 'ppe_safety_shoes_const', label: 'Sepatu Safety' },
    { id: 'ppe_work_gloves_const', label: 'Sarung Tangan' },
    { id: 'ppe_safety_glasses_const', label: 'Kacamata Safety' },
    { id: 'ppe_dust_mask_const', label: 'Masker Debu' }
  ]},
  grinding_cutting: { label: 'Grinding / Cutting', icon: 'bi-tools', items: [
    { id: 'ppe_face_shield_grind', label: 'Face Shield' },
    { id: 'ppe_safety_glasses_grind', label: 'Kacamata Safety' },
    { id: 'ppe_gloves_grind', label: 'Sarung Tangan' },
    { id: 'ppe_apron_grind', label: 'Apron' },
    { id: 'ppe_safety_shoes_grind', label: 'Sepatu Safety' },
    { id: 'ppe_respirator_grind', label: 'Masker Debu / Respirator' }
  ]}
};

/* ==================== UTILITY SERVICE ==================== */
const UtilityService = {
  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  calculateRisk(severity, likelihood) {
    const s = Math.max(0, Math.min(5, parseInt(severity) || 0));
    const l = Math.max(0, Math.min(5, parseInt(likelihood) || 0));
    const level = s * l;
    let category = 'Tidak Ada', badgeClass = '';
    if (level >= 1  && level <= 4)  { category = 'Rendah';  badgeClass = 'badge--risk-low'; }
    if (level >= 5  && level <= 9)  { category = 'Sedang';  badgeClass = 'badge--risk-medium'; }
    if (level >= 10 && level <= 15) { category = 'Tinggi';  badgeClass = 'badge--risk-high'; }
    if (level >= 16)                { category = 'Ekstrim'; badgeClass = 'badge--risk-extreme'; }
    return { level, category, badgeClass };
  },

  getRiskBadgeClass(category) {
    return ({ 'Rendah':'badge--risk-low','Sedang':'badge--risk-medium','Tinggi':'badge--risk-high','Ekstrim':'badge--risk-extreme' })[category] || '';
  },

  formatDate(d) {
    if (!d) return '-';
    try { return new Date(d).toLocaleDateString('id-ID', { year:'numeric', month:'long', day:'numeric' }); }
    catch { return String(d); }
  },

  getTimeAgo(d) {
    if (!d) return '-';
    try {
      const diff = Date.now() - new Date(d).getTime();
      if (diff < 0) return this.formatDate(d);
      const min = Math.floor(diff/60000), h = Math.floor(diff/3600000), day = Math.floor(diff/86400000);
      if (min < 1) return 'baru saja';
      if (min < 60) return `${min}m lalu`;
      if (h < 24) return `${h}j lalu`;
      if (day < 7) return `${day}h lalu`;
      return this.formatDate(d);
    } catch { return '-'; }
  },

  formatCurrency(amount) {
    if (amount === null || amount === undefined || isNaN(amount)) return '-';
    return 'Rp ' + new Intl.NumberFormat('id-ID').format(amount);
  },

  getPPEList(ppeData) {
    if (!ppeData) return [];
    const items = [];
    if (ppeData.selected_work_types && Array.isArray(ppeData.selected_work_types)) {
      ppeData.selected_work_types.forEach(typeKey => {
        const wt = WORK_TYPE_APD[typeKey];
        if (wt && wt.items) wt.items.forEach(i => items.push(i.label));
      });
    }
    if (ppeData.custom_items && Array.isArray(ppeData.custom_items)) {
      items.push(...ppeData.custom_items.filter(Boolean));
    }
    return items;
  },

  async generateJSADocNumber() {
    // Akan di-override oleh _patchUtility di db.js
    const currentYear = new Date().getFullYear();
    const jsaList = await DB.getAll('jsa');
    const prefix = `JSA-${currentYear}-`;
    const count = jsaList.rows.filter(j => j.document_number && j.document_number.startsWith(prefix)).length;
    return `${prefix}${String(count + 1).padStart(3, '0')}`;
  },

  async generateWMDocNumber() {
    // Akan di-override oleh _patchUtility di db.js
    const currentYear = new Date().getFullYear();
    const wmList = await DB.getAll('work_methods');
    const prefix = `WM-${currentYear}-`;
    const count = wmList.rows.filter(w => w.document_number && w.document_number.startsWith(prefix)).length;
    return `${prefix}${String(count + 1).padStart(3, '0')}`;
  },

  async getDashboardStats() {
    // Akan di-override oleh _patchUtility di db.js
    const [projects, jsa, wm, po, mp] = await Promise.all([
      DB.getAll('projects'), DB.getAll('jsa'), DB.getAll('work_methods'),
      DB.getAll('procurement'), DB.getAll('manpower')
    ]);
    return {
      totalProjects: projects.total,
      totalJSA: jsa.total,
      totalWorkMethods: wm.total,
      totalPO: po.total,
      totalManpower: mp.total
    };
  },

  showConfirmDialog(message, onConfirm, onCancel) {
    const existing = document.getElementById('confirmDialog');
    if (existing) existing.remove();
    document.body.insertAdjacentHTML('beforeend', `
      <div class="modal fade" id="confirmDialog" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title"><i class="bi bi-question-circle text-warning"></i> Konfirmasi</h5>
              <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body"><p>${message}</p></div>
            <div class="modal-footer">
              <button type="button" class="btn btn--outline-secondary" data-bs-dismiss="modal" id="confirmCancelBtn">Batal</button>
              <button type="button" class="btn btn--primary" id="confirmOkBtn">OK</button>
            </div>
          </div>
        </div>
      </div>`);
    const modalEl = document.getElementById('confirmDialog');
    const modal = new bootstrap.Modal(modalEl);
    document.getElementById('confirmOkBtn').addEventListener('click', () => { modal.hide(); if (onConfirm) onConfirm(); });
    document.getElementById('confirmCancelBtn').addEventListener('click', () => { modal.hide(); if (onCancel) onCancel(); });
    modalEl.addEventListener('hidden.bs.modal', () => modalEl.remove());
    modal.show();
  }
};

/* ==================== UI SERVICE ==================== */
const UIService = {
  currentRoute: null,

  init() {
    this.setupRouting();
  },

  showFlowBanner(icon, title, message, buttonLabel, buttonAction) {
    return `<div class="flow-guard-banner">
      <div class="flow-guard-banner__icon"><i class="bi ${icon}"></i></div>
      <h5 class="flow-guard-banner__title">${title}</h5>
      <p class="flow-guard-banner__description">${message}</p>
      <button class="btn btn--primary" onclick="${buttonAction}">${buttonLabel}</button>
    </div>`;
  },

  showToast(message, type = 'success') {
    let container = document.querySelector('.app-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'app-toast-container';
      document.body.appendChild(container);
    }
    const iconMap = { success:'bi-check-circle-fill', danger:'bi-x-circle-fill', warning:'bi-exclamation-triangle-fill', info:'bi-info-circle-fill' };
    const el = document.createElement('div');
    el.className = `toast align-items-center text-bg-${type} border-0 show mb-2`;
    el.style.minWidth = '300px';
    el.style.animation = 'slideIn 0.3s ease-out';
    el.innerHTML = `<div class="d-flex"><div class="toast-body d-flex align-items-center gap-2"><i class="bi ${iconMap[type]||iconMap.info}"></i><span class="toast-msg"></span></div><button type="button" class="btn-close btn-close-white me-2 m-auto" onclick="this.closest('.toast').remove()"></button></div>`;
    el.querySelector('.toast-msg').textContent = message;
    container.appendChild(el);
    setTimeout(() => { if (el.parentElement) { el.style.opacity='0'; el.style.transition='opacity .3s'; setTimeout(() => el.remove(), 300); } }, 3500);
  },

  setupRouting() {
    const handle = () => {
      const hash = window.location.hash.replace('#', '') || 'dashboard';
      this.navigate(hash);
    };
    window.addEventListener('hashchange', handle);
    if (window.location.hash) handle();
    else window.location.hash = '#dashboard';
  },

  navigate(route) {
    if (document.getElementById('loginContainer')?.style.display === 'flex') return;
    this.currentRoute = route;
    document.querySelectorAll('.nav-item[data-route]').forEach(n => n.classList.toggle('active', n.dataset.route === route));
    this.loadPage(route);
    if (window.innerWidth < 769) setTimeout(() => AppNavbar?.closeSidebar(), 100);
  },

  async loadPage(route) {
    const mainContent = document.getElementById('appMainContent');
    if (!mainContent) return;

    if (route === 'akun') {
      if (typeof AppAuth !== 'undefined') {
        mainContent.innerHTML = await AppAuth.renderAccountManager();
        document.querySelectorAll('.nav-item[data-route]').forEach(n => n.classList.toggle('active', n.dataset.route === 'akun'));
      }
      return;
    }

    // Guard: company complete?
    if (route !== 'dashboard' && route !== 'perusahaan') {
      const companyOk = await DataAccess.isCompanyComplete();
      if (!companyOk) {
        mainContent.innerHTML = this.showFlowBanner('bi-building-exclamation','Lengkapi Data Perusahaan Terlebih Dahulu','Harap lengkapi profil perusahaan terlebih dahulu.','<i class="bi bi-building"></i> Isi Data Perusahaan',"UIService.navigate('perusahaan')");
        document.querySelectorAll('.nav-item[data-route]').forEach(n => n.classList.toggle('active', n.dataset.route === route));
        return;
      }
    }

    // Guard: has projects?
    const routesNeedProject = ['metode','jsa','manpower','pembelian','laporan'];
    if (routesNeedProject.includes(route)) {
      const hasP = await DataAccess.hasProjects();
      if (!hasP) {
        mainContent.innerHTML = this.showFlowBanner('bi-clipboard-plus','Buat Proyek Terlebih Dahulu','Seluruh fitur harus terikat pada sebuah Proyek.','<i class="bi bi-clipboard-data"></i> Buat Proyek Baru',"UIService.navigate('proyek')");
        document.querySelectorAll('.nav-item[data-route]').forEach(n => n.classList.toggle('active', n.dataset.route === route));
        return;
      }
    }

    try {
      switch (route) {
        case 'dashboard':  mainContent.innerHTML = DashboardPage.render(); await DashboardPage.init(); break;
        case 'perusahaan': mainContent.innerHTML = CompanyPage.render();   await CompanyPage.init();   break;
        case 'proyek':     mainContent.innerHTML = ProjectPage.render();   await ProjectPage.init();   break;
        case 'metode':     mainContent.innerHTML = WorkMethodPage.render(); await WorkMethodPage.init(); break;
        case 'jsa':        mainContent.innerHTML = JSAPage.render();       await JSAPage.init();       break;
        case 'manpower':   mainContent.innerHTML = ManpowerPage.render();  await ManpowerPage.init();  break;
        case 'pembelian':  mainContent.innerHTML = ProcurementPage.render(); await ProcurementPage.init(); break;
        case 'laporan':    mainContent.innerHTML = ReportPage.render();    await ReportPage.init();    break;
        default:           mainContent.innerHTML = DashboardPage.render(); await DashboardPage.init();
      }
    } catch (err) {
      console.error('[UIService] Error loading page:', route, err);
      const errDiv = document.createElement('div');
      errDiv.className = 'alert alert-danger';
      errDiv.innerHTML = '<i class="bi bi-exclamation-triangle-fill"></i> Gagal memuat halaman: <span class="err-msg"></span><br><button class="btn btn--sm btn--outline-primary mt-2" onclick="UIService.navigate(\'dashboard\')">Kembali ke Dashboard</button>';
      errDiv.querySelector('.err-msg').textContent = err.message;
      mainContent.innerHTML = '';
      mainContent.appendChild(errDiv);
    }
  }
};

/* ==================== DASHBOARD PAGE (OPTIMIZED) ==================== */
const DashboardPage = {
  render() {
    return `
    <div id="dashboardAlerts"></div>
    <div class="stat-grid">
      ${this._statCard('blue','bi-building','statCompany','Perusahaan','perusahaan')}
      ${this._statCard('green','bi-clipboard-data','statProjects','Proyek','proyek')}
      ${this._statCard('indigo','bi-diagram-3','statWorkMethods','Metode Kerja','metode')}
      ${this._statCard('amber','bi-journal-check','statJSA','Total JSA','jsa')}
      ${this._statCard('cyan','bi-people','statManpower','Man Power','manpower')}
      ${this._statCard('red','bi-cart','statProcurement','Pembelian','pembelian')}
    </div>
    <div class="row g-3">
      <div class="col-md-6">
        <div class="card">
          <div class="card-header"><i class="bi bi-journal-text"></i> JSA Terbaru
            <a href="#jsa" class="ms-auto btn btn--xs btn--ghost" onclick="event.preventDefault();UIService.navigate('jsa')">Lihat Semua <i class="bi bi-chevron-right"></i></a>
          </div>
          <div id="recentJSA"><div class="empty-state"><div class="empty-state__icon"><i class="bi bi-journal"></i></div><p>Memuat…</p></div></div>
        </div>
      </div>
      <div class="col-md-6">
        <div class="card">
          <div class="card-header"><i class="bi bi-building"></i> Proyek Terbaru
            <a href="#proyek" class="ms-auto btn btn--xs btn--ghost" onclick="event.preventDefault();UIService.navigate('proyek')">Lihat Semua <i class="bi bi-chevron-right"></i></a>
          </div>
          <div id="recentProjects"><div class="empty-state"><div class="empty-state__icon"><i class="bi bi-clipboard-data"></i></div><p>Memuat…</p></div></div>
        </div>
      </div>
    </div>`;
  },

  _statCard(color, icon, id, label, route) {
    return `<div class="stat-card stat-card--${color}" onclick="UIService.navigate('${route}')" style="cursor:pointer;">
      <div class="stat-card__icon"><i class="bi ${icon}"></i></div>
      <div class="stat-card__value" id="${id}">-</div>
      <div class="stat-card__label">${label}</div>
    </div>`;
  },

  async init() {
    try {
      // OPTIMASI: Gunakan getStats() + getRecent() daripada getAll()
      const [company, stats, recentJSA, recentProjects] = await Promise.all([
        DataAccess.getCompany(),
        DB.getStats(),
        DB.getRecent('jsa', 5),
        DB.getRecent('projects', 4)
      ]);

      // Alerts
      const alertsEl = document.getElementById('dashboardAlerts');
      if (alertsEl) {
        const isCompanyReady = !!(company && company.name);
        const hasProj = stats.totalProjects > 0;
        if (!isCompanyReady) {
          alertsEl.innerHTML = `<div class="flow-alert flow-alert--warning"><i class="bi bi-exclamation-triangle-fill"></i> <strong>Langkah 1:</strong> Lengkapi <a href="#perusahaan" onclick="event.preventDefault();UIService.navigate('perusahaan')">Data Perusahaan</a> terlebih dahulu.</div>`;
        } else if (!hasProj) {
          alertsEl.innerHTML = `<div class="flow-alert flow-alert--info"><i class="bi bi-info-circle-fill"></i> <strong>Langkah 2:</strong> <a href="#proyek" onclick="event.preventDefault();UIService.navigate('proyek')">Buat Proyek pertama Anda</a> untuk mulai menggunakan semua fitur.</div>`;
        }
      }

      // Stats (hanya angka, tidak perlu semua data)
      const statCompanyEl = document.getElementById('statCompany');
      if (statCompanyEl) statCompanyEl.textContent = company ? '✓' : '-';
      
      const statMap = {
        statProjects: stats.totalProjects,
        statJSA: stats.totalJSA,
        statWorkMethods: stats.totalWorkMethods,
        statProcurement: stats.totalPO,
        statManpower: stats.totalManpower
      };
      Object.entries(statMap).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val !== undefined ? val : '-';
      });

      // Recent JSA (hanya 5 data terbaru)
      const recentJSAEl = document.getElementById('recentJSA');
      if (recentJSAEl) {
        if (recentJSA.length > 0) {
          recentJSAEl.innerHTML = recentJSA.map(jsa => {
            // Project info mungkin tidak tersedia di recent, tampilkan seadanya
            return `<a href="#jsa" class="list-item" onclick="event.preventDefault();UIService.navigate('jsa')">
              <div class="list-item__icon" style="background:rgba(248,181,0,.08);color:var(--color-warning);"><i class="bi bi-journal-text"></i></div>
              <div style="flex:1;min-width:0;">
                <div class="list-item__title">${UtilityService.escapeHtml(jsa.document_number || 'Tanpa Nomor')}</div>
                <div class="list-item__subtitle">${UtilityService.escapeHtml(jsa.project_id || '-')}</div>
              </div>
              <div class="list-item__end"><span class="text-muted">${UtilityService.getTimeAgo(jsa.updated_at || jsa.created_at)}</span></div>
            </a>`;
          }).join('');
        } else {
          recentJSAEl.innerHTML = '<div class="empty-state"><div class="empty-state__icon"><i class="bi bi-journal"></i></div><p>Belum ada JSA</p></div>';
        }
      }

      // Recent Projects (4 proyek terbaru)
      const recentProjectsEl = document.getElementById('recentProjects');
      if (recentProjectsEl) {
        if (recentProjects.length > 0) {
          recentProjectsEl.innerHTML = recentProjects.map(project => {
            return `<a href="#proyek" class="list-item" onclick="event.preventDefault();UIService.navigate('proyek')">
              <div class="list-item__icon" style="background:rgba(16,185,129,.08);color:var(--color-success);"><i class="bi bi-building"></i></div>
              <div style="flex:1;min-width:0;">
                <div class="list-item__title">${UtilityService.escapeHtml(project.name)}</div>
                <div class="list-item__subtitle">${UtilityService.escapeHtml(project.client || '-')}</div>
              </div>
              <div class="list-item__end"><span class="text-muted">${UtilityService.getTimeAgo(project.updated_at || project.created_at)}</span></div>
            </a>`;
          }).join('');
        } else {
          recentProjectsEl.innerHTML = '<div class="empty-state"><div class="empty-state__icon"><i class="bi bi-clipboard-data"></i></div><p>Belum ada proyek</p></div>';
        }
      }
    } catch(err) {
      console.error('[Dashboard] init error:', err);
      // Fallback: tampilkan error state
      const alertsEl = document.getElementById('dashboardAlerts');
      if (alertsEl) {
        alertsEl.innerHTML = `<div class="flow-alert flow-alert--warning"><i class="bi bi-exclamation-triangle-fill"></i> Gagal memuat data dashboard. <a href="javascript:location.reload()">Muat ulang</a></div>`;
      }
    }
  }
};

document.addEventListener('DOMContentLoaded', () => { UIService.init(); });
window.UIService = UIService;