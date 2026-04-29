// main.js
/* ==================== STORAGE CONSTANTS ==================== */
const STORAGE_KEYS = {
  COMPANY: 'kp_company',
  PROJECTS: 'kp_projects',
  JSA: 'kp_jsa',
  WORK_METHODS: 'kp_work_methods',
  MANPOWER: 'kp_manpower',
  PROCUREMENT: 'kp_procurement',
  AUDIT_LOG: 'kp_audit_log',
  CURRENT_USER: 'kp_current_user'
};

const WORK_TYPE_APD = {
  welding: {
    label: 'Welding (Pengelasan)',
    icon: 'bi-fire',
    items: [
      { id: 'ppe_welding_helmet', label: 'Helm Las (Auto Darkening)' },
      { id: 'ppe_safety_glasses_weld', label: 'Kacamata Safety' },
      { id: 'ppe_leather_gloves', label: 'Sarung Tangan Tahan Panas (Leather)' },
      { id: 'ppe_fire_resistant_apron', label: 'Apron / Baju Tahan Api' },
      { id: 'ppe_safety_shoes_weld', label: 'Sepatu Safety (Steel Toe)' },
      { id: 'ppe_respirator_weld', label: 'Masker / Respirator' },
      { id: 'ppe_ear_protection_weld', label: 'Pelindung Telinga (Earplug / Earmuff)' }
    ]
  },
  electrical: {
    label: 'Pekerjaan Listrik',
    icon: 'bi-lightning-charge',
    items: [
      { id: 'ppe_non_conductive_helmet', label: 'Helm Safety (Non-Conductive)' },
      { id: 'ppe_electrical_gloves', label: 'Sarung Tangan Isolasi Listrik' },
      { id: 'ppe_electrical_shoes', label: 'Sepatu Safety Anti Listrik' },
      { id: 'ppe_face_shield_elec', label: 'Kacamata Safety / Face Shield' },
      { id: 'ppe_arc_flash_suit', label: 'Arc Flash Suit (Tegangan Tinggi)' },
      { id: 'ppe_voltage_detector', label: 'Alat Deteksi Tegangan' }
    ]
  },
  working_height: {
    label: 'Pekerjaan di Ketinggian',
    icon: 'bi-arrow-up',
    items: [
      { id: 'ppe_full_body_harness', label: 'Full Body Harness' },
      { id: 'ppe_lanyard_lifeline', label: 'Lanyard + Lifeline' },
      { id: 'ppe_helmet_chin_strap', label: 'Helm Safety dengan Chin Strap' },
      { id: 'ppe_anti_slip_shoes', label: 'Sepatu Anti Slip' },
      { id: 'ppe_work_gloves_height', label: 'Sarung Tangan Kerja' }
    ]
  },
  chemical: {
    label: 'Pekerjaan Kimia',
    icon: 'bi-droplet',
    items: [
      { id: 'ppe_chemical_suit', label: 'Baju Pelindung (Chemical Suit / Lab Coat)' },
      { id: 'ppe_chemical_gloves', label: 'Sarung Tangan Tahan Bahan Kimia' },
      { id: 'ppe_goggles_chem', label: 'Kacamata Safety / Goggles' },
      { id: 'ppe_face_shield_chem', label: 'Face Shield' },
      { id: 'ppe_respirator_chem', label: 'Respirator / Masker Khusus' },
      { id: 'ppe_rubber_boots_chem', label: 'Sepatu Boot Karet' }
    ]
  },
  high_noise: {
    label: 'Pekerjaan dengan Kebisingan Tinggi',
    icon: 'bi-volume-up',
    items: [
      { id: 'ppe_earplug', label: 'Earplug' },
      { id: 'ppe_earmuff', label: 'Earmuff' },
      { id: 'ppe_helmet_noise', label: 'Helm Safety' },
      { id: 'ppe_safety_glasses_noise', label: 'Kacamata Safety' }
    ]
  },
  mechanical: {
    label: 'Pekerjaan Mekanik / Bengkel',
    icon: 'bi-gear',
    items: [
      { id: 'ppe_safety_glasses_mech', label: 'Kacamata Safety' },
      { id: 'ppe_work_gloves_mech', label: 'Sarung Tangan Kerja' },
      { id: 'ppe_safety_shoes_mech', label: 'Sepatu Safety' },
      { id: 'ppe_coverall', label: 'Coverall / Wearpack' },
      { id: 'ppe_face_shield_grinding', label: 'Face Shield (Jika Grinding)' }
    ]
  },
  general_construction: {
    label: 'Konstruksi Umum',
    icon: 'bi-building',
    items: [
      { id: 'ppe_helmet_const', label: 'Helm Safety' },
      { id: 'ppe_reflective_vest', label: 'Rompi Reflektif' },
      { id: 'ppe_safety_shoes_const', label: 'Sepatu Safety' },
      { id: 'ppe_work_gloves_const', label: 'Sarung Tangan' },
      { id: 'ppe_safety_glasses_const', label: 'Kacamata Safety' },
      { id: 'ppe_dust_mask_const', label: 'Masker Debu' }
    ]
  },
  grinding_cutting: {
    label: 'Grinding / Cutting',
    icon: 'bi-tools',
    items: [
      { id: 'ppe_face_shield_grind', label: 'Face Shield' },
      { id: 'ppe_safety_glasses_grind', label: 'Kacamata Safety' },
      { id: 'ppe_gloves_grind', label: 'Sarung Tangan' },
      { id: 'ppe_apron_grind', label: 'Apron' },
      { id: 'ppe_safety_shoes_grind', label: 'Sepatu Safety' },
      { id: 'ppe_respirator_grind', label: 'Masker Debu / Respirator' }
    ]
  }
};

/* ==================== STORAGE SERVICE ==================== */
const StorageService = {
  getData(key) {
    try {
      const rawData = localStorage.getItem(key);
      if (!rawData) return [];
      const parsedData = JSON.parse(rawData);
      return Array.isArray(parsedData) ? parsedData : [];
    } catch (error) {
      console.error('[StorageService] Read error:', key, error);
      return [];
    }
  },

  saveData(key, data) {
    try {
      const serialized = JSON.stringify(data);
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, '1');
      localStorage.removeItem(testKey);
      
      localStorage.setItem(key, serialized);
      return true;
    } catch (error) {
      console.error('[StorageService] Write error:', key, error);
      if (error.name === 'QuotaExceededError' || error.code === 22) {
        UIService.showToast('Penyimpanan penuh! Harap hapus data lama.', 'danger');
      } else {
        UIService.showToast('Gagal menyimpan data.', 'danger');
      }
      return false;
    }
  },

  addAuditLog(actionType, description) {
    const logs = this.getData(STORAGE_KEYS.AUDIT_LOG);
    const user = DataAccess.getCurrentUser ? DataAccess.getCurrentUser() : 'System';
    const entry = {
      id: 'audit_' + Date.now(),
      timestamp: new Date().toISOString(),
      action: actionType,
      details: description,
      user: user
    };
    logs.push(entry);
    if (logs.length > 500) {
      logs.splice(0, logs.length - 500);
    }
    this.saveData(STORAGE_KEYS.AUDIT_LOG, logs);
    return entry;
  }
};

/* ==================== DATA ACCESS LAYER ==================== */
const DataAccess = {
  getCurrentUser() {
    if (typeof AuthService !== 'undefined' && AuthService.getCurrentUser) {
      const session = AuthService.getCurrentUser();
      if (session && session.name) return session.name;
    }
    const userData = StorageService.getData(STORAGE_KEYS.CURRENT_USER);
    return (userData[0] && userData[0].name) ? userData[0].name : 'Admin Kencana Project';
  },

  getCompany() {
    const companyList = StorageService.getData(STORAGE_KEYS.COMPANY);
    return companyList.length > 0 ? companyList[0] : null;
  },

  isCompanyComplete() {
    const company = this.getCompany();
    return !!(company && company.name && company.name.trim().length > 0);
  },

  saveCompany(companyData) {
    if (!companyData || !companyData.name) return null;
    companyData.updated_at = new Date().toISOString();
    StorageService.saveData(STORAGE_KEYS.COMPANY, [companyData]);
    StorageService.addAuditLog('UPDATE_COMPANY', 'Profil perusahaan diperbarui');
    return companyData;
  },

  hasProjects() {
    return this.getAllProjects().length > 0;
  },

  getAllProjects() {
    return StorageService.getData(STORAGE_KEYS.PROJECTS);
  },

  getProjectById(projectId) {
    if (!projectId) return null;
    return this.getAllProjects().find(project => project.id === projectId) || null;
  },

  saveProject(projectData) {
    if (!projectData || !projectData.id) return null;
    const projects = this.getAllProjects();
    const existingIndex = projects.findIndex(p => p.id === projectData.id);
    projectData.updated_at = new Date().toISOString();

    if (existingIndex >= 0) {
      projects[existingIndex] = { ...projects[existingIndex], ...projectData };
    } else {
      projectData.created_at = projectData.created_at || new Date().toISOString();
      projects.push(projectData);
    }

    const saved = StorageService.saveData(STORAGE_KEYS.PROJECTS, projects);
    if (saved) {
      StorageService.addAuditLog('SAVE_PROJECT', `Proyek ${projectData.name} disimpan`);
    }
    return projectData;
  },

  deleteProject(projectId) {
    if (!projectId) return false;
    const filteredProjects = this.getAllProjects().filter(p => p.id !== projectId);
    const saved = StorageService.saveData(STORAGE_KEYS.PROJECTS, filteredProjects);
    if (saved) {
      StorageService.addAuditLog('DELETE_PROJECT', `Proyek ${projectId} dihapus`);
    }
    return true;
  },

  getAllJSA() {
    return StorageService.getData(STORAGE_KEYS.JSA);
  },

  getJSAById(jsaId) {
    if (!jsaId) return null;
    return this.getAllJSA().find(jsa => jsa.id === jsaId) || null;
  },

  getJSAByProject(projectId) {
    if (!projectId) return [];
    return this.getAllJSA().filter(jsa => jsa.project_id === projectId);
  },

  saveJSA(jsaData) {
    if (!jsaData || !jsaData.id) return null;
    const jsaList = StorageService.getData(STORAGE_KEYS.JSA);
    const existingIndex = jsaList.findIndex(j => j.id === jsaData.id);
    jsaData.updated_at = new Date().toISOString();

    if (existingIndex >= 0) {
      jsaList[existingIndex] = { ...jsaList[existingIndex], ...jsaData };
    } else {
      jsaData.created_at = jsaData.created_at || new Date().toISOString();
      jsaList.push(jsaData);
    }

    const saved = StorageService.saveData(STORAGE_KEYS.JSA, jsaList);
    if (saved) {
      StorageService.addAuditLog('SAVE_JSA', `JSA ${jsaData.document_number || jsaData.id} disimpan`);
    }
    return jsaData;
  },

  deleteJSA(jsaId) {
    if (!jsaId) return false;
    const filteredJSA = this.getAllJSA().filter(j => j.id !== jsaId);
    const saved = StorageService.saveData(STORAGE_KEYS.JSA, filteredJSA);
    if (saved) {
      StorageService.addAuditLog('DELETE_JSA', `JSA ${jsaId} dihapus`);
    }
    return true;
  },

  getAllWorkMethods() {
    return StorageService.getData(STORAGE_KEYS.WORK_METHODS);
  },

  getWorkMethodById(methodId) {
    if (!methodId) return null;
    return this.getAllWorkMethods().find(wm => wm.id === methodId) || null;
  },

  getWorkMethodsByProject(projectId) {
    if (!projectId) return [];
    return this.getAllWorkMethods().filter(wm => wm.project_id === projectId);
  },

  saveWorkMethod(wmData) {
    if (!wmData || !wmData.id) return null;
    const wmList = StorageService.getData(STORAGE_KEYS.WORK_METHODS);
    const existingIndex = wmList.findIndex(w => w.id === wmData.id);
    wmData.updated_at = new Date().toISOString();

    if (existingIndex >= 0) {
      wmList[existingIndex] = { ...wmList[existingIndex], ...wmData };
    } else {
      wmData.created_at = wmData.created_at || new Date().toISOString();
      wmList.push(wmData);
    }

    const saved = StorageService.saveData(STORAGE_KEYS.WORK_METHODS, wmList);
    if (saved) {
      StorageService.addAuditLog('SAVE_WORK_METHOD', `Work Method ${wmData.document_number || wmData.id} disimpan`);
    }
    return wmData;
  },

  deleteWorkMethod(methodId) {
    if (!methodId) return false;
    const filteredWM = this.getAllWorkMethods().filter(w => w.id !== methodId);
    const saved = StorageService.saveData(STORAGE_KEYS.WORK_METHODS, filteredWM);
    if (saved) {
      StorageService.addAuditLog('DELETE_WORK_METHOD', `Work Method ${methodId} dihapus`);
    }
    return true;
  },

  getManpowerByProject(projectId) {
    if (!projectId) return [];
    return StorageService.getData(STORAGE_KEYS.MANPOWER).filter(mp => mp.project_id === projectId);
  },

  getAllManpower() {
    return StorageService.getData(STORAGE_KEYS.MANPOWER);
  },

  saveManpower(manpowerData) {
    if (!manpowerData || !manpowerData.project_id) return null;
    let allManpower = StorageService.getData(STORAGE_KEYS.MANPOWER)
      .filter(mp => mp.project_id !== manpowerData.project_id);

    if (manpowerData.workers && Array.isArray(manpowerData.workers)) {
      manpowerData.workers.forEach(worker => {
        allManpower.push({
          ...worker,
          project_id: manpowerData.project_id,
          id: worker.id || 'mp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
          updated_at: new Date().toISOString()
        });
      });
    }

    const saved = StorageService.saveData(STORAGE_KEYS.MANPOWER, allManpower);
    if (saved) {
      StorageService.addAuditLog('SAVE_MANPOWER', `Manpower proyek ${manpowerData.project_id} diperbarui`);
    }
    return allManpower.filter(mp => mp.project_id === manpowerData.project_id);
  },

  deleteManpowerByProject(projectId) {
    if (!projectId) return false;
    const filteredManpower = StorageService.getData(STORAGE_KEYS.MANPOWER)
      .filter(mp => mp.project_id !== projectId);
    const saved = StorageService.saveData(STORAGE_KEYS.MANPOWER, filteredManpower);
    if (saved) {
      StorageService.addAuditLog('DELETE_MANPOWER', `Manpower proyek ${projectId} dihapus`);
    }
    return true;
  },

  getAllPO() {
    return StorageService.getData(STORAGE_KEYS.PROCUREMENT);
  },

  getPOById(poId) {
    if (!poId) return null;
    return this.getAllPO().find(po => po.id === poId) || null;
  },

  getPOByProject(projectId) {
    if (!projectId) return [];
    return this.getAllPO().filter(po => po.project_id === projectId);
  },

  savePO(poData) {
    if (!poData || !poData.id) return null;
    const poList = StorageService.getData(STORAGE_KEYS.PROCUREMENT);
    const existingIndex = poList.findIndex(p => p.id === poData.id);
    poData.updated_at = new Date().toISOString();

    if (existingIndex >= 0) {
      poList[existingIndex] = { ...poList[existingIndex], ...poData };
    } else {
      poData.created_at = poData.created_at || new Date().toISOString();
      poList.push(poData);
    }

    const saved = StorageService.saveData(STORAGE_KEYS.PROCUREMENT, poList);
    if (saved) {
      StorageService.addAuditLog('SAVE_PO', `PO ${poData.material_name || poData.id} disimpan`);
    }
    return poData;
  },

  deletePO(poId) {
    if (!poId) return false;
    const filteredPO = this.getAllPO().filter(p => p.id !== poId);
    const saved = StorageService.saveData(STORAGE_KEYS.PROCUREMENT, filteredPO);
    if (saved) {
      StorageService.addAuditLog('DELETE_PO', `PO ${poId} dihapus`);
    }
    return true;
  }
};

/* ==================== UTILITY FUNCTIONS ==================== */
const UtilityService = {
  calculateRisk(severity, likelihood) {
    const severityScore = Math.max(0, Math.min(5, parseInt(severity) || 0));
    const likelihoodScore = Math.max(0, Math.min(5, parseInt(likelihood) || 0));
    const riskLevel = severityScore * likelihoodScore;

    let category = 'Tidak Ada';
    let badgeClass = '';

    if (riskLevel >= 1 && riskLevel <= 4) {
      category = 'Rendah';
      badgeClass = 'badge--risk-low';
    } else if (riskLevel >= 5 && riskLevel <= 9) {
      category = 'Sedang';
      badgeClass = 'badge--risk-medium';
    } else if (riskLevel >= 10 && riskLevel <= 15) {
      category = 'Tinggi';
      badgeClass = 'badge--risk-high';
    } else if (riskLevel >= 16) {
      category = 'Ekstrim';
      badgeClass = 'badge--risk-extreme';
    }

    return { level: riskLevel, category, badgeClass };
  },

  getRiskBadgeClass(category) {
    const classMap = {
      'Rendah': 'badge--risk-low',
      'Sedang': 'badge--risk-medium',
      'Tinggi': 'badge--risk-high',
      'Ekstrim': 'badge--risk-extreme'
    };
    return classMap[category] || '';
  },

  formatDate(dateInput) {
    if (!dateInput) return '-';
    try {
      return new Date(dateInput).toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return String(dateInput);
    }
  },

  getTimeAgo(dateInput) {
    if (!dateInput) return '-';
    try {
      const timeDiff = Date.now() - new Date(dateInput).getTime();
      if (timeDiff < 0) return this.formatDate(dateInput);
      
      const minutes = Math.floor(timeDiff / 60000);
      const hours = Math.floor(timeDiff / 3600000);
      const days = Math.floor(timeDiff / 86400000);

      if (minutes < 1) return 'baru saja';
      if (minutes < 60) return `${minutes}m lalu`;
      if (hours < 24) return `${hours}j lalu`;
      if (days < 7) return `${days}h lalu`;
      return this.formatDate(dateInput);
    } catch (error) {
      return '-';
    }
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
        const workType = WORK_TYPE_APD[typeKey];
        if (workType && workType.items) {
          workType.items.forEach(item => {
            items.push(item.label);
          });
        }
      });
    }
    
    if (ppeData.custom_items && Array.isArray(ppeData.custom_items)) {
      items.push(...ppeData.custom_items.filter(Boolean));
    }
    
    return items;
  },

  generateJSADocNumber() {
    const currentYear = new Date().getFullYear();
    const jsaList = StorageService.getData(STORAGE_KEYS.JSA);
    const prefix = `JSA-${currentYear}-`;
    const prefixCount = jsaList.filter(j => j.document_number && j.document_number.startsWith(prefix)).length;
    return `${prefix}${String(prefixCount + 1).padStart(3, '0')}`;
  },

  generateWMDocNumber() {
    const currentYear = new Date().getFullYear();
    const wmList = StorageService.getData(STORAGE_KEYS.WORK_METHODS);
    const prefix = `WM-${currentYear}-`;
    const prefixCount = wmList.filter(w => w.document_number && w.document_number.startsWith(prefix)).length;
    return `${prefix}${String(prefixCount + 1).padStart(3, '0')}`;
  },

  getDashboardStats() {
    return {
      totalProjects: DataAccess.getAllProjects().length,
      totalJSA: DataAccess.getAllJSA().length,
      totalWorkMethods: DataAccess.getAllWorkMethods().length,
      totalPO: DataAccess.getAllPO().length,
      totalManpower: StorageService.getData(STORAGE_KEYS.MANPOWER).length
    };
  }
};

/* ==================== STORAGE INITIALIZATION ==================== */
function initializeStorage() {
  const keysToInit = [
    STORAGE_KEYS.COMPANY,
    STORAGE_KEYS.PROJECTS,
    STORAGE_KEYS.JSA,
    STORAGE_KEYS.WORK_METHODS,
    STORAGE_KEYS.MANPOWER,
    STORAGE_KEYS.PROCUREMENT,
    STORAGE_KEYS.AUDIT_LOG,
    STORAGE_KEYS.CURRENT_USER
  ];

  keysToInit.forEach(key => {
    const rawData = localStorage.getItem(key);
    if (rawData === null) {
      localStorage.setItem(key, '[]');
    } else {
      try {
        const parsed = JSON.parse(rawData);
        if (!Array.isArray(parsed)) {
          localStorage.setItem(key, '[]');
        }
      } catch (error) {
        localStorage.setItem(key, '[]');
      }
    }
  });
}

/* ==================== IMPORT/EXPORT FUNCTIONS ==================== */
function exportDataToJSON() {
  try {
    return JSON.stringify({
      version: '4.0',
      export_date: new Date().toISOString(),
      company: DataAccess.getCompany(),
      projects: DataAccess.getAllProjects(),
      jsas: DataAccess.getAllJSA(),
      work_methods: DataAccess.getAllWorkMethods(),
      manpower: StorageService.getData(STORAGE_KEYS.MANPOWER),
      procurement: DataAccess.getAllPO(),
      audit: StorageService.getData(STORAGE_KEYS.AUDIT_LOG)
    }, null, 2);
  } catch (error) {
    console.error('[Export] Error:', error);
    return null;
  }
}

function importDataFromJSON(jsonString) {
  try {
    const importedData = JSON.parse(jsonString);
    if (!importedData || !importedData.version) {
      throw new Error('Format tidak valid atau tidak ada versi');
    }

    if (importedData.version !== '4.0') {
      console.warn('[Import] Version mismatch, attempting import anyway');
    }

    if (importedData.company) StorageService.saveData(STORAGE_KEYS.COMPANY, [importedData.company]);
    if (importedData.projects) StorageService.saveData(STORAGE_KEYS.PROJECTS, importedData.projects);
    if (importedData.jsas) StorageService.saveData(STORAGE_KEYS.JSA, importedData.jsas);
    if (importedData.work_methods) StorageService.saveData(STORAGE_KEYS.WORK_METHODS, importedData.work_methods);
    if (importedData.manpower) StorageService.saveData(STORAGE_KEYS.MANPOWER, importedData.manpower);
    if (importedData.procurement) StorageService.saveData(STORAGE_KEYS.PROCUREMENT, importedData.procurement);
    if (importedData.audit) StorageService.saveData(STORAGE_KEYS.AUDIT_LOG, importedData.audit);

    StorageService.addAuditLog('IMPORT_DATA', 'Data diimport dari backup');
    return true;
  } catch (error) {
    console.error('[Import] Error:', error);
    UIService.showToast('Gagal import: ' + error.message, 'danger');
    return false;
  }
}

/* ==================== UI SERVICE ==================== */
const UIService = {
  currentRoute: null,

  init() {
    initializeStorage();
    this.setupRouting();
    this.updateAllCompanyLogos();
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
    let toastContainer = document.querySelector('.app-toast-container');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.className = 'app-toast-container position-fixed top-0 end-0 p-3';
      toastContainer.style.zIndex = '9999';
      document.body.appendChild(toastContainer);
    }

    const iconMap = {
      success: 'bi-check-circle-fill',
      danger: 'bi-x-circle-fill',
      warning: 'bi-exclamation-triangle-fill',
      info: 'bi-info-circle-fill'
    };

    const toastElement = document.createElement('div');
    toastElement.className = `toast align-items-center text-bg-${type} border-0 show mb-2`;
    toastElement.style.minWidth = '300px';
    toastElement.style.animation = 'slideIn 0.3s ease-out';
    toastElement.innerHTML = `<div class="d-flex">
      <div class="toast-body d-flex align-items-center gap-2">
        <i class="bi ${iconMap[type] || iconMap.info}"></i><span>${message}</span>
      </div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" onclick="this.closest('.toast').remove()"></button>
    </div>`;

    toastContainer.appendChild(toastElement);
    setTimeout(() => {
      if (toastElement.parentElement) {
        toastElement.style.opacity = '0';
        toastElement.style.transition = 'opacity 0.3s';
        setTimeout(() => {
          if (toastElement.parentElement) toastElement.remove();
        }, 300);
      }
    }, 3500);
  },

  updateAllCompanyLogos() {
    const company = DataAccess.getCompany();
    const logoUrl = company && company.logo ? company.logo : null;

    const sidebarLogo = document.getElementById('sidebarBrandLogo');
    if (sidebarLogo) {
      if (logoUrl) {
        sidebarLogo.innerHTML = `<img src="${logoUrl}" alt="Logo Perusahaan" style="width:100%;height:100%;object-fit:contain;border-radius:10px;">`;
        sidebarLogo.style.background = 'transparent';
        sidebarLogo.style.boxShadow = 'none';
      } else {
        sidebarLogo.innerHTML = '<i class="bi bi-building"></i>';
        sidebarLogo.style.background = '';
        sidebarLogo.style.boxShadow = '';
      }
    }

    const loginLogoDisplay = document.getElementById('loginLogoDisplay');
    if (loginLogoDisplay && logoUrl) {
      loginLogoDisplay.innerHTML = `<img src="${logoUrl}" alt="Logo" style="width:100%;height:100%;object-fit:contain;border-radius:14px;">`;
    }
  },

  setupRouting() {
    const handleRouteChange = () => {
      const hash = window.location.hash.replace('#', '') || 'dashboard';
      this.navigate(hash);
    };

    window.addEventListener('hashchange', handleRouteChange);
    window.addEventListener('DOMContentLoaded', handleRouteChange);

    if (window.location.hash) {
      handleRouteChange();
    } else {
      window.location.hash = '#dashboard';
    }
  },

  navigate(route) {
    if (document.getElementById('loginContainer')?.style.display === 'flex') {
      return;
    }

    this.currentRoute = route;

    document.querySelectorAll('.nav-item[data-route]').forEach(navItem => {
      navItem.classList.toggle('active', navItem.dataset.route === route);
    });

    this.loadPage(route);
  },

  loadPage(route) {
    const mainContent = document.getElementById('appMainContent');
    if (!mainContent) return;

    if (route === 'akun') {
      if (typeof AppAuth !== 'undefined' && typeof AppAuth.renderAccountManager === 'function') {
        mainContent.innerHTML = AppAuth.renderAccountManager();
        document.querySelectorAll('.nav-item[data-route]').forEach(nav => {
          nav.classList.toggle('active', nav.dataset.route === 'akun');
        });
        return;
      }
    }

    if (route !== 'dashboard' && route !== 'perusahaan' && !DataAccess.isCompanyComplete()) {
      mainContent.innerHTML = this.showFlowBanner(
        'bi-building-exclamation',
        'Lengkapi Data Perusahaan Terlebih Dahulu',
        'Sebelum menggunakan fitur ini, harap lengkapi profil perusahaan terlebih dahulu. Data perusahaan akan digunakan sebagai identitas pada setiap laporan yang dicetak.',
        '<i class="bi bi-building"></i> Isi Data Perusahaan',
        "UIService.navigate('perusahaan')"
      );
      document.querySelectorAll('.nav-item[data-route]').forEach(navItem => {
        navItem.classList.toggle('active', navItem.dataset.route === route);
      });
      return;
    }

    const routesNeedingProject = ['metode', 'jsa', 'manpower', 'pembelian', 'laporan'];
    if (routesNeedingProject.includes(route) && !DataAccess.hasProjects()) {
      mainContent.innerHTML = this.showFlowBanner(
        'bi-clipboard-plus',
        'Buat Proyek Terlebih Dahulu',
        'Seluruh fitur Metode Kerja, JSA, Man Power, Pembelian, dan Laporan harus terikat pada sebuah Proyek. Silakan buat proyek terlebih dahulu.',
        '<i class="bi bi-clipboard-data"></i> Buat Proyek Baru',
        "UIService.navigate('proyek')"
      );
      document.querySelectorAll('.nav-item[data-route]').forEach(navItem => {
        navItem.classList.toggle('active', navItem.dataset.route === route);
      });
      return;
    }

    try {
      switch (route) {
        case 'dashboard':
          mainContent.innerHTML = DashboardPage.render();
          DashboardPage.init();
          break;
        case 'perusahaan':
          mainContent.innerHTML = CompanyPage.render();
          CompanyPage.init();
          break;
        case 'proyek':
          mainContent.innerHTML = ProjectPage.render();
          ProjectPage.init();
          break;
        case 'metode':
          mainContent.innerHTML = WorkMethodPage.render();
          WorkMethodPage.init();
          break;
        case 'jsa':
          mainContent.innerHTML = JSAPage.render();
          JSAPage.init();
          break;
        case 'manpower':
          mainContent.innerHTML = ManpowerPage.render();
          ManpowerPage.init();
          break;
        case 'pembelian':
          mainContent.innerHTML = ProcurementPage.render();
          ProcurementPage.init();
          break;
        case 'laporan':
          mainContent.innerHTML = ReportPage.render();
          ReportPage.init();
          break;
        default:
          mainContent.innerHTML = DashboardPage.render();
          DashboardPage.init();
      }
    } catch (error) {
      console.error('[UIService] Error loading page:', route, error);
      mainContent.innerHTML = `<div class="alert alert-danger">
        <i class="bi bi-exclamation-triangle-fill"></i> 
        Gagal memuat halaman: ${error.message}
        <br><button class="btn btn--sm btn--outline-primary mt-2" onclick="UIService.navigate('dashboard')">Kembali ke Dashboard</button>
      </div>`;
    }

    this.updateAllCompanyLogos();
  }
};

/* ==================== DASHBOARD PAGE ==================== */
const DashboardPage = {
  render() {
    const isCompanyReady = DataAccess.isCompanyComplete();
    const hasProjectsReady = DataAccess.hasProjects();

    return `<div class="page-header no-print">
      <h2 class="page-title">
        <span class="page-title__icon"><i class="bi bi-speedometer2"></i></span>Dashboard
      </h2>
      ${isCompanyReady && hasProjectsReady
        ? `<a href="#jsa" class="btn btn--primary btn--lg" onclick="UIService.navigate('jsa')"><i class="bi bi-plus-lg"></i> JSA Baru</a>`
        : !isCompanyReady
          ? `<button class="btn btn--lg" style="background:#f59e0b;color:#1e293b;" onclick="UIService.navigate('perusahaan')"><i class="bi bi-building"></i> Isi Data Perusahaan</button>`
          : `<button class="btn btn--success btn--lg" onclick="UIService.navigate('proyek')"><i class="bi bi-plus-lg"></i> Buat Proyek</button>`
      }
    </div>
    ${!isCompanyReady
      ? this.renderAlert('warning', 'Langkah 1:', 'Lengkapi <a href="#perusahaan" onclick="event.preventDefault();UIService.navigate(\'perusahaan\')">Data Perusahaan</a> terlebih dahulu sebelum menggunakan fitur lainnya.')
      : !hasProjectsReady
        ? this.renderAlert('info', 'Langkah 2:', 'Data perusahaan sudah lengkap. Sekarang <a href="#proyek" onclick="event.preventDefault();UIService.navigate(\'proyek\')">buat Proyek pertama Anda</a> untuk mulai menggunakan semua fitur.')
        : ''
    }
    <div class="stat-grid">
      ${this.renderStatCard('blue', 'bi-building', 'statCompany', 'Perusahaan', 'perusahaan')}
      ${this.renderStatCard('green', 'bi-clipboard-data', 'statProjects', 'Proyek', 'proyek')}
      ${this.renderStatCard('indigo', 'bi-diagram-3', 'statWorkMethods', 'Metode Kerja', 'metode')}
      ${this.renderStatCard('amber', 'bi-journal-check', 'statJSA', 'Total JSA', 'jsa')}
      ${this.renderStatCard('cyan', 'bi-people', 'statManpower', 'Man Power', 'manpower')}
      ${this.renderStatCard('red', 'bi-cart', 'statProcurement', 'Pembelian', 'pembelian')}
    </div>
    <div class="row g-3">
      <div class="col-md-6">
        <div class="card">
          <div class="card-header">
            <i class="bi bi-journal-text"></i> JSA Terbaru
            <a href="#jsa" class="ms-auto btn btn--xs btn--ghost" onclick="event.preventDefault();UIService.navigate('jsa')">Lihat Semua <i class="bi bi-chevron-right"></i></a>
          </div>
          <div id="recentJSA">
            <div class="empty-state">
              <div class="empty-state__icon"><i class="bi bi-journal"></i></div>
              <p>Belum ada JSA</p>
            </div>
          </div>
        </div>
      </div>
      <div class="col-md-6">
        <div class="card">
          <div class="card-header">
            <i class="bi bi-building"></i> Proyek Terbaru
            <a href="#proyek" class="ms-auto btn btn--xs btn--ghost" onclick="event.preventDefault();UIService.navigate('proyek')">Lihat Semua <i class="bi bi-chevron-right"></i></a>
          </div>
          <div id="recentProjects">
            <div class="empty-state">
              <div class="empty-state__icon"><i class="bi bi-clipboard-data"></i></div>
              <p>Belum ada proyek</p>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  },

  renderAlert(type, step, message) {
    const icon = type === 'warning' ? 'bi-exclamation-triangle-fill' : 'bi-info-circle-fill';
    return `<div class="flow-alert flow-alert--${type}"><i class="bi ${icon}"></i> <strong>${step}</strong> ${message}</div>`;
  },

  renderStatCard(colorClass, icon, id, label, route) {
    return `<div class="stat-card stat-card--${colorClass}" onclick="UIService.navigate('${route}')">
      <div class="stat-card__icon"><i class="bi ${icon}"></i></div>
      <div class="stat-card__value" id="${id}">0</div>
      <div class="stat-card__label">${label}</div>
    </div>`;
  },

  init() {
    const company = DataAccess.getCompany();
    document.getElementById('statCompany').textContent = company ? '✓' : '-';

    const stats = UtilityService.getDashboardStats();
    document.getElementById('statProjects').textContent = stats.totalProjects;
    document.getElementById('statJSA').textContent = stats.totalJSA;
    document.getElementById('statWorkMethods').textContent = stats.totalWorkMethods;
    document.getElementById('statProcurement').textContent = stats.totalPO;
    document.getElementById('statManpower').textContent = stats.totalManpower;

    const jsaList = DataAccess.getAllJSA();
    const recentJSAs = [...jsaList]
      .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))
      .slice(0, 5);

    if (recentJSAs.length) {
      document.getElementById('recentJSA').innerHTML = recentJSAs.map(jsa => {
        const project = DataAccess.getProjectById(jsa.project_id);
        return `<a href="#jsa" class="list-item" onclick="event.preventDefault(); UIService.navigate('jsa'); setTimeout(() => { if (typeof JSAPage !== 'undefined' && JSAPage.editJSA) JSAPage.editJSA('${jsa.id}'); }, 100)">
          <div class="list-item__icon" style="background:rgba(248,181,0,.08);color:var(--color-warning);">
            <i class="bi bi-journal-text"></i>
          </div>
          <div style="flex:1;min-width:0;">
            <div class="list-item__title">${jsa.document_number}</div>
            <div class="list-item__subtitle">${project ? project.name : '-'}</div>
          </div>
          <div class="list-item__end">
            <span class="text-muted">${UtilityService.getTimeAgo(jsa.updated_at || jsa.created_at)}</span>
          </div>
        </a>`;
      }).join('');
    }

    const projects = DataAccess.getAllProjects();
    const recentProjects = projects.slice(-4).reverse();

    if (recentProjects.length) {
      document.getElementById('recentProjects').innerHTML = recentProjects.map(project => {
        const jsaCount = DataAccess.getJSAByProject(project.id).length;
        return `<a href="#proyek" class="list-item" onclick="event.preventDefault();UIService.navigate('proyek')">
          <div class="list-item__icon" style="background:rgba(16,185,129,.08);color:var(--color-success);">
            <i class="bi bi-building"></i>
          </div>
          <div style="flex:1;min-width:0;">
            <div class="list-item__title">${project.name}</div>
            <div class="list-item__subtitle">${project.client || '-'}</div>
          </div>
          <div class="list-item__end">
            <span class="badge bg-info">${jsaCount} JSA</span>
          </div>
        </a>`;
      }).join('');
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  UIService.init();
});