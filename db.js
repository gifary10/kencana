/* ==================== CONFIG ==================== */
// Isi URL setelah deploy Apps Script sebagai Web App
const GS_URL = window.GS_API_URL || '';

/* ==================== INTERNAL CACHE ====================
   Cache in-memory agar UI tidak lambat saat render ulang.
   [OPTIMASI] Tambahan TTL (Time-To-Live) 5 menit:
   - Data yang di-cache lebih dari 5 menit dianggap stale.
   - Cegah data kadaluarsa tanpa diketahui user.
*/
const _cache           = {};
const _pending         = {};            // mencegah double-request bersamaan
const _cacheTimestamps = {};            // untuk TTL expiry
const CACHE_TTL_MS     = 5 * 60 * 1000; // 5 menit

function _cacheKey(sheet, params) {
  if (params && Object.keys(params).length > 0) {
    return sheet + '::' + JSON.stringify(params);
  }
  return sheet;
}

// [OPTIMASI] Cek TTL sebelum return cache
function _isCacheValid(key) {
  if (!_cache[key]) return false;
  const ts = _cacheTimestamps[key];
  if (!ts) return false;
  return (Date.now() - ts) < CACHE_TTL_MS;
}

function _setCache(key, value) {
  _cache[key]           = value;
  _cacheTimestamps[key] = Date.now();
}

function _invalidate(sheet) {
  Object.keys(_cache).forEach(key => {
    if (key === sheet || key.startsWith(sheet + '::')) {
      delete _cache[key];
      delete _cacheTimestamps[key];
    }
  });
}

function _invalidateRelated(sheet) {
  _invalidate(sheet);
  if (sheet === 'projects') {
    ['jsa', 'work_methods', 'manpower', 'procurement'].forEach(_invalidate);
  }
}

/* ==================== HTTP HELPERS (with Retry) ==================== */

async function _fetchWithRetry(url, options = {}, retries = 3, delay = 1000) {
  let lastError;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (response.ok || (response.status >= 400 && response.status < 500)) {
        return response;
      }
      lastError = new Error(`Server error: ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    if (attempt === retries) throw lastError;
    const waitTime = delay * Math.pow(2, attempt - 1);
    console.warn(`[DB] Retry ${attempt}/${retries} after ${waitTime}ms. Error:`, lastError.message);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
}

async function _get(params) {
  if (!GS_URL) throw new Error('GS_API_URL belum dikonfigurasi. Edit config.js.');
  const url = GS_URL + '?' + new URLSearchParams(params).toString();
  const res = await _fetchWithRetry(url);
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || 'API error');
  return json;
}

async function _post(body) {
  if (!GS_URL) throw new Error('GS_API_URL belum dikonfigurasi. Edit config.js.');
  const res = await _fetchWithRetry(GS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify(body)
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || 'API error');
  return json;
}

/* ==================== NAVBAR LOADING SPINNER ==================== */
let _loadingCount = 0;

function _showLoading() {
  _loadingCount++;
  const spinner = document.getElementById('navbarLoadingSpinner');
  if (spinner) spinner.style.display = 'inline-block';
}

function _hideLoading() {
  _loadingCount = Math.max(0, _loadingCount - 1);
  if (_loadingCount === 0) {
    const spinner = document.getElementById('navbarLoadingSpinner');
    if (spinner) spinner.style.display = 'none';
  }
}

/* ==================== DEBOUNCE UTILITY ====================
   [OPTIMASI] Satu fungsi debounce terpusat, dipakai oleh
   semua search input di seluruh halaman.
   Mencegah API call terpicu setiap kali user mengetik 1 huruf.
*/
function debounce(fn, delay = 300) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

// Registry debounced handlers — dibuat lazy saat pertama kali dipanggil
const _debouncedHandlers = {};

/**
 * Panggil fn dengan debounce. key harus unik per search input.
 * Contoh: DB.debounceCall('searchProject', () => ProjectPage.loadProjectTable());
 */
function _debounceCall(key, fn, delay = 300) {
  if (!_debouncedHandlers[key]) {
    _debouncedHandlers[key] = debounce(fn, delay);
  } else {
    // Update fn terbaru (penting karena fn bisa closure berbeda)
    _debouncedHandlers[key] = debounce(fn, delay);
  }
  _debouncedHandlers[key]();
}

/* ==================== CORE DB API ==================== */
const DB = {

  // Expose debounce helper untuk dipakai modul lain
  debounceCall: _debounceCall,
  debounce,

  // --- READ ALL (with cache + TTL) ---
  async getAll(sheet, opts = {}) {
    const key = _cacheKey(sheet, opts);

    // [OPTIMASI] Cek TTL — jangan pakai cache yang sudah stale
    if (_isCacheValid(key)) return _cache[key];

    // Prevent parallel duplicate requests
    if (_pending[key]) return _pending[key];

    _showLoading();

    const params = { action: 'getAll', sheet };
    if (opts.filterField) params.filterField = opts.filterField;
    if (opts.filterValue) params.filterValue = opts.filterValue;
    if (opts.searchField) params.searchField = opts.searchField;
    if (opts.searchValue) params.searchValue = opts.searchValue;
    if (opts.limit)       params.limit       = opts.limit;
    if (opts.offset)      params.offset      = opts.offset;

    _pending[key] = _get(params)
      .then(r => {
        const result = { rows: r.rows || [], total: r.total || 0 };
        _setCache(key, result);   // [OPTIMASI] set dengan timestamp
        delete _pending[key];
        _hideLoading();
        return result;
      })
      .catch(err => {
        delete _pending[key];
        _hideLoading();
        throw err;
      });

    return _pending[key];
  },

  // --- GET COUNT ONLY ---
  async getCount(sheet) {
    const key = _cacheKey(sheet, { action: 'count' });
    if (_isCacheValid(key)) return _cache[key];

    _showLoading();
    try {
      const r = await _get({ action: 'getCount', sheet });
      _setCache(key, r.count);
      return r.count;
    } finally {
      _hideLoading();
    }
  },

  // --- GET STATS (untuk dashboard) ---
  async getStats() {
    const key = 'dashboard_stats';
    if (_isCacheValid(key)) return _cache[key];

    _showLoading();
    try {
      const r = await _get({ action: 'getStats' });
      _setCache(key, r);
      return r;
    } finally {
      _hideLoading();
    }
  },

  // --- GET RECENT ---
  async getRecent(sheet, limit = 5) {
    const key = _cacheKey(sheet, { action: 'recent', limit });
    if (_isCacheValid(key)) return _cache[key];

    _showLoading();
    try {
      const r = await _get({ action: 'getRecent', sheet, limit });
      const rows = r.rows || [];
      _setCache(key, rows);
      return rows;
    } finally {
      _hideLoading();
    }
  },

  // --- UPSERT with Optimistic Update ---
  async upsert(sheet, data) {
    const key      = _cacheKey(sheet);
    const oldCache = _cache[key] ? { ..._cache[key] } : null;

    if (_cache[key] && _cache[key].rows) {
      const existingIdx = _cache[key].rows.findIndex(
        r => (r.id || r.username) === (data.id || data.username)
      );
      if (existingIdx >= 0) {
        _cache[key].rows[existingIdx] = { ...data };
      } else {
        _cache[key].rows.unshift(data);
        if (_cache[key].total !== undefined) _cache[key].total++;
      }
    }

    _showLoading();
    try {
      const r = await _post({ action: 'upsert', sheet, data });
      if (_cache[key] && _cache[key].rows) {
        const serverIdx = _cache[key].rows.findIndex(
          r => (r.id || r.username) === (data.id || data.username)
        );
        if (serverIdx >= 0) _cache[key].rows[serverIdx] = r.row;
      }
      return r.row;
    } catch (error) {
      if (oldCache) _cache[key] = oldCache; else _invalidate(sheet);
      throw error;
    } finally {
      _hideLoading();
    }
  },

  // --- DELETE BY ID with Optimistic Update ---
  async delete(sheet, id) {
    const key      = _cacheKey(sheet);
    const oldCache = _cache[key]
      ? { ..._cache[key], rows: [...(_cache[key].rows || [])] }
      : null;

    if (_cache[key] && _cache[key].rows) {
      _cache[key].rows = _cache[key].rows.filter(r => r.id !== id);
      if (_cache[key].total !== undefined)
        _cache[key].total = Math.max(0, (_cache[key].total || 1) - 1);
    }

    _showLoading();
    try {
      const r = await _post({ action: 'delete', sheet, id });
      return r.deleted;
    } catch (error) {
      if (oldCache) _cache[key] = oldCache; else _invalidate(sheet);
      throw error;
    } finally {
      _hideLoading();
    }
  },

  // --- DELETE WHERE field = value ---
  async deleteWhere(sheet, field, value) {
    _invalidate(sheet);
    _showLoading();
    try {
      const r = await _post({ action: 'deleteWhere', sheet, field, value });
      return r.deleted;
    } finally {
      _hideLoading();
    }
  },

  // --- BATCH UPSERT ---
  async batchUpsert(operations) {
    const sheets = [...new Set(operations.map(op => op.sheet))];
    sheets.forEach(s => _invalidate(s));
    _showLoading();
    try {
      const r = await _post({ action: 'batchUpsert', operations });
      return r.rows;
    } finally {
      _hideLoading();
    }
  },

  // --- BATCH DELETE ---
  async batchDelete(operations) {
    const sheets = [...new Set(operations.map(op => op.sheet))];
    sheets.forEach(s => _invalidate(s));
    _showLoading();
    try {
      const r = await _post({ action: 'batchDelete', operations });
      return r.deleted;
    } finally {
      _hideLoading();
    }
  },

  // --- INIT SHEETS ---
  async initSheets() {
    _showLoading();
    try {
      return await _post({ action: 'initSheets' });
    } finally {
      _hideLoading();
    }
  }
};

/* ==================== STORAGE SERVICE (compatibility shim) ==================== */
const StorageService = {
  async getData(sheet) {
    try {
      const result = await DB.getAll(sheet);
      return result.rows || [];
    } catch(err) {
      console.error('[StorageService] getData error:', sheet, err);
      UIService.showToast('Gagal membaca data: ' + err.message, 'danger');
      return [];
    }
  },

  async saveData(sheet, dataArray) {
    try {
      const operations = dataArray.map(data => ({ sheet, data }));
      await DB.batchUpsert(operations);
      return true;
    } catch(err) {
      console.error('[StorageService] saveData error:', sheet, err);
      UIService.showToast('Gagal menyimpan data.', 'danger');
      try {
        for (const row of dataArray) await DB.upsert(sheet, row);
        return true;
      } catch(err2) {
        console.error('[StorageService] saveData fallback error:', sheet, err2);
        return false;
      }
    }
  },

  addAuditLog(actionType, description) {
    console.info('[Audit]', actionType, description);
  }
};

/* ==================== DATA ACCESS LAYER (async) ==================== */
const DataAccess = {

  getCurrentUser() {
    if (typeof AuthService !== 'undefined' && AuthService.getCurrentUser) {
      const session = AuthService.getCurrentUser();
      if (session && session.name) return session.name;
    }
    return 'Admin KPT';
  },

  // ---------- COMPANY ----------
  async getCompany() {
    const list = await StorageService.getData('company');
    return list.length > 0 ? list[0] : null;
  },

  async isCompanyComplete() {
    const c = await this.getCompany();
    return !!(c && c.name && c.name.trim().length > 0);
  },

  async saveCompany(data) {
    if (!data || !data.name) return null;
    data.updated_at = new Date().toISOString();
    await DB.upsert('company', data);
    _invalidate('company');
    StorageService.addAuditLog('UPDATE_COMPANY', 'Profil perusahaan diperbarui');
    return data;
  },

  // ---------- PROJECTS ----------
  async getAllProjects() {
    return StorageService.getData('projects');
  },

  async hasProjects() {
    const count = await DB.getCount('projects');
    return count > 0;
  },

  async getProjectById(id) {
    if (!id) return null;
    const all = await this.getAllProjects();
    return all.find(p => p.id === id) || null;
  },

  async saveProject(data) {
    if (!data || !data.id) return null;
    data.updated_at = new Date().toISOString();
    if (!data.created_at) data.created_at = new Date().toISOString();
    await DB.upsert('projects', data);
    _invalidate('projects');
    StorageService.addAuditLog('SAVE_PROJECT', `Proyek ${data.name} disimpan`);
    return data;
  },

  async deleteProject(id) {
    if (!id) return false;
    const batchOps = [
      { sheet: 'jsa',          field: 'project_id', value: id },
      { sheet: 'work_methods', field: 'project_id', value: id },
      { sheet: 'procurement',  field: 'project_id', value: id },
      { sheet: 'manpower',     field: 'project_id', value: id }
    ];
    await DB.batchDelete(batchOps);
    await DB.delete('projects', id);
    _invalidateRelated('projects');
    StorageService.addAuditLog('DELETE_PROJECT', `Proyek ${id} beserta data terkait dihapus`);
    return true;
  },

  // ---------- JSA ----------
  async getAllJSA() {
    return StorageService.getData('jsa');
  },

  async getJSAById(id) {
    if (!id) return null;
    const all = await this.getAllJSA();
    return all.find(j => j.id === id) || null;
  },

  async getJSAByProject(projectId) {
    if (!projectId) return [];
    const result = await DB.getAll('jsa', { filterField: 'project_id', filterValue: projectId });
    return result.rows || [];
  },

  async saveJSA(data) {
    if (!data || !data.id) return null;
    data.updated_at = new Date().toISOString();
    if (!data.created_at) data.created_at = new Date().toISOString();
    await DB.upsert('jsa', data);
    _invalidate('jsa');
    StorageService.addAuditLog('SAVE_JSA', `JSA ${data.document_number || data.id} disimpan`);
    return data;
  },

  async deleteJSA(id) {
    if (!id) return false;
    await DB.delete('jsa', id);
    _invalidate('jsa');
    return true;
  },

  // ---------- WORK METHODS ----------
  async getAllWorkMethods() {
    return StorageService.getData('work_methods');
  },

  async getWorkMethodById(id) {
    if (!id) return null;
    const all = await this.getAllWorkMethods();
    return all.find(w => w.id === id) || null;
  },

  async getWorkMethodsByProject(projectId) {
    if (!projectId) return [];
    const result = await DB.getAll('work_methods', { filterField: 'project_id', filterValue: projectId });
    return result.rows || [];
  },

  async saveWorkMethod(data) {
    if (!data || !data.id) return null;
    data.updated_at = new Date().toISOString();
    if (!data.created_at) data.created_at = new Date().toISOString();
    await DB.upsert('work_methods', data);
    _invalidate('work_methods');
    StorageService.addAuditLog('SAVE_WORK_METHOD', `WM ${data.document_number || data.id} disimpan`);
    return data;
  },

  async deleteWorkMethod(id) {
    if (!id) return false;
    await DB.delete('work_methods', id);
    _invalidate('work_methods');
    return true;
  },

  // ---------- PERSONNEL ----------
  async getAllPersonnel() {
    return StorageService.getData('personnel');
  },

  async savePersonnel(data) {
    if (!data || !data.id) return null;
    data.updated_at = new Date().toISOString();
    await DB.upsert('personnel', data);
    _invalidate('personnel');
    StorageService.addAuditLog('SAVE_PERSONNEL', `Personel ${data.name} disimpan`);
    return data;
  },

  async deletePersonnel(id) {
    if (!id) return false;
    await DB.batchDelete([{ sheet: 'manpower', field: 'personnel_id', value: id }]);
    _invalidate('manpower');
    await DB.delete('personnel', id);
    _invalidate('personnel');
    StorageService.addAuditLog('DELETE_PERSONNEL', `Personel ${id} dihapus`);
    return true;
  },

  // ---------- MANPOWER ----------
  async getAllManpower() {
    return StorageService.getData('manpower');
  },

  async getManpowerByProject(projectId) {
    if (!projectId) return [];
    const result = await DB.getAll('manpower', { filterField: 'project_id', filterValue: projectId });
    return result.rows || [];
  },

  async getPersonnelByProject(projectId) {
    if (!projectId) return [];
    const [assignments, personnel] = await Promise.all([
      this.getManpowerByProject(projectId),
      this.getAllPersonnel()
    ]);
    const assignedIds = new Set(assignments.map(a => a.personnel_id));
    return personnel.filter(p => assignedIds.has(p.id));
  },

  async saveManpower({ project_id, personnel_ids }) {
    if (!project_id) return null;
    await DB.deleteWhere('manpower', 'project_id', project_id);
    _invalidate('manpower');
    const operations = (personnel_ids || []).map(pid => ({
      sheet: 'manpower',
      data: {
        id: 'mp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        project_id,
        personnel_id: pid,
        updated_at: new Date().toISOString()
      }
    }));
    if (operations.length > 0) await DB.batchUpsert(operations);
    _invalidate('manpower');
    StorageService.addAuditLog('SAVE_MANPOWER', `Manpower proyek ${project_id} diperbarui (${personnel_ids.length} personel)`);
    return personnel_ids;
  },

  async deleteManpowerByProject(projectId) {
    if (!projectId) return false;
    await DB.deleteWhere('manpower', 'project_id', projectId);
    _invalidate('manpower');
    return true;
  },

  // ---------- PROCUREMENT ----------
  async getAllPO() {
    return StorageService.getData('procurement');
  },

  async getPOById(id) {
    if (!id) return null;
    const all = await this.getAllPO();
    return all.find(p => p.id === id) || null;
  },

  async getPOByProject(projectId) {
    if (!projectId) return [];
    const result = await DB.getAll('procurement', { filterField: 'project_id', filterValue: projectId });
    return result.rows || [];
  },

  async savePO(data) {
    if (!data || !data.id) return null;
    data.updated_at = new Date().toISOString();
    if (!data.created_at) data.created_at = new Date().toISOString();
    await DB.upsert('procurement', data);
    _invalidate('procurement');
    return data;
  },

  async saveMultiplePO(poArray) {
    if (!poArray || poArray.length === 0) return [];
    const operations = poArray.map(po => ({
      sheet: 'procurement',
      data: {
        ...po,
        updated_at: new Date().toISOString(),
        created_at: po.created_at || new Date().toISOString()
      }
    }));
    const results = await DB.batchUpsert(operations);
    _invalidate('procurement');
    return results;
  },

  async deletePO(id) {
    if (!id) return false;
    await DB.delete('procurement', id);
    _invalidate('procurement');
    return true;
  },

  // ---------- ACCOUNTS ----------
  async getAccounts() {
    return StorageService.getData('accounts');
  },

  async saveAccount(data) {
    await DB.upsert('accounts', data);
    _invalidate('accounts');
    return data;
  },

  async deleteAccount(username) {
    await DB.deleteWhere('accounts', 'username', username);
    _invalidate('accounts');
    return true;
  }
};

/* ==================== UTILITY: doc number generators (async) ==================== */
window._patchUtility = async function () {
  if (typeof UtilityService === 'undefined') return;

  UtilityService.generateJSADocNumber = async function () {
    const currentYear = new Date().getFullYear();
    const jsaList     = await DataAccess.getAllJSA();
    const prefix      = `JSA-${currentYear}-`;
    const count       = jsaList.filter(j => j.document_number && j.document_number.startsWith(prefix)).length;
    return `${prefix}${String(count + 1).padStart(3, '0')}`;
  };

  UtilityService.generateWMDocNumber = async function () {
    const currentYear = new Date().getFullYear();
    const wmList      = await DataAccess.getAllWorkMethods();
    const prefix      = `WM-${currentYear}-`;
    const count       = wmList.filter(w => w.document_number && w.document_number.startsWith(prefix)).length;
    return `${prefix}${String(count + 1).padStart(3, '0')}`;
  };

  UtilityService.getDashboardStats = async function () {
    return await DB.getStats();
  };
};
