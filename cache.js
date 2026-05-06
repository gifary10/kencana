const _cache = {};
const _cacheTimestamps = {};
const _cacheMeta = {};
const _pending = {};

const PRIORITY_SHEETS = Object.freeze({
  company: { ttl: 60 * 60 * 1000, preload: true, staleWhileRevalidate: true },
  accounts: { ttl: 60 * 60 * 1000, preload: true, staleWhileRevalidate: true },
  projects: { ttl: 30 * 60 * 1000, preload: true, staleWhileRevalidate: true },
  work_methods: { ttl: 10 * 60 * 1000, preload: false, staleWhileRevalidate: true },
  jsa: { ttl: 10 * 60 * 1000, preload: false, staleWhileRevalidate: true },
  jadwal: { ttl: 10 * 60 * 1000, preload: false, staleWhileRevalidate: true },
  manpower: { ttl: 5 * 60 * 1000, preload: false, staleWhileRevalidate: true },
  personnel: { ttl: 5 * 60 * 1000, preload: false, staleWhileRevalidate: true },
  procurement: { ttl: 2 * 60 * 1000, preload: false, staleWhileRevalidate: true },
});

const CACHE_TTL = Object.freeze({
  company: 60 * 60 * 1000,
  accounts: 60 * 60 * 1000,
  projects: 30 * 60 * 1000,
  work_methods: 10 * 60 * 1000,
  jsa: 10 * 60 * 1000,
  jadwal: 10 * 60 * 1000,
  manpower: 5 * 60 * 1000,
  personnel: 5 * 60 * 1000,
  procurement: 2 * 60 * 1000,
  dashboard_stats: 10 * 60 * 1000,
  laporan: 5 * 60 * 1000,
  default: 2 * 60 * 1000,
});

const STALE_WINDOW = Object.freeze({
  company: 4 * 60 * 60 * 1000,
  accounts: 4 * 60 * 60 * 1000,
  projects: 2 * 60 * 60 * 1000,
  work_methods: 45 * 60 * 1000,
  jsa: 45 * 60 * 1000,
  jadwal: 45 * 60 * 1000,
  manpower: 20 * 60 * 1000,
  personnel: 20 * 60 * 1000,
  procurement: 10 * 60 * 1000,
  laporan: 20 * 60 * 1000,
});

const BG_REFRESH_THRESHOLD = Object.freeze({
  procurement: 0.60,
  jsa: 0.70,
  work_methods: 0.70,
  jadwal: 0.70,
  manpower: 0.70,
  personnel: 0.70,
  projects: 0.75,
  company: 0.80,
  accounts: 0.80,
  default: 0.70,
});

const AppCache = {
  getPrioritySheets() {
    return Object.keys(PRIORITY_SHEETS).filter(s => PRIORITY_SHEETS[s].preload);
  },

  getAllPrioritySheets() {
    return Object.keys(PRIORITY_SHEETS);
  },

  isPrioritySheet(sheet) {
    return !!PRIORITY_SHEETS[sheet];
  },

  hasStaleSupport(sheet) {
    return !!(PRIORITY_SHEETS[sheet]?.staleWhileRevalidate);
  },

  buildKey(sheet, params) {
    if (params && Object.keys(params).length > 0) {
      return sheet + '::' + JSON.stringify(params);
    }
    return sheet;
  },

  getTTL(sheet) {
    return CACHE_TTL[sheet] || CACHE_TTL.default;
  },

  getStaleWindow(sheet) {
    return STALE_WINDOW[sheet] || 0;
  },

  getBgRefreshThreshold(sheet) {
    return BG_REFRESH_THRESHOLD[sheet] || BG_REFRESH_THRESHOLD.default;
  },

  isStale(key, sheet) {
    if (!_cache[key]) return false;
    const ts = _cacheTimestamps[key];
    if (!ts) return false;
    return (Date.now() - ts) >= this.getTTL(sheet || 'default');
  },

  isStaleWindowValid(key, sheet) {
    const sw = this.getStaleWindow(sheet);
    if (!sw) return false;
    if (!_cache[key]) return false;
    const ts = _cacheTimestamps[key];
    if (!ts) return false;
    return (Date.now() - ts) < (this.getTTL(sheet) + sw);
  },

  isValid(key, sheet, allowStale = false) {
    if (!_cache[key]) return false;
    const ts = _cacheTimestamps[key];
    if (!ts) return false;
    const age = Date.now() - ts;
    const ttl = this.getTTL(sheet || 'default');
    if (age < ttl) return true;
    if (allowStale && this.hasStaleSupport(sheet)) {
      return this.isStaleWindowValid(key, sheet);
    }
    return false;
  },

  get(key) {
    return _cache[key];
  },

  set(key, value, sheet, meta = {}) {
    const now = Date.now();
    _cache[key] = value;
    _cacheTimestamps[key] = now;
    _cacheMeta[key] = { ..._cacheMeta[key], ...meta, sheet, isPriority: this.isPrioritySheet(sheet), hasStale: this.hasStaleSupport(sheet), lastUpdated: now };
  },

  invalidate(sheet) {
    let count = 0;
    Object.keys(_cache).forEach(key => {
      if (key === sheet || key.startsWith(sheet + '::')) {
        delete _cache[key];
        delete _cacheTimestamps[key];
        delete _cacheMeta[key];
        count++;
      }
    });
  },

  invalidateRelated(sheet) {
    this.invalidate(sheet);
    switch (sheet) {
      case 'projects':
        ['jsa', 'work_methods', 'manpower', 'procurement', 'jadwal'].forEach(s => {
          this.invalidate(s);
          this.invalidate(s + '::count');
          this.invalidate(s + '::summary');
        });
        this.invalidate('dashboard_stats');
        this.invalidate('laporan');
        break;
      case 'work_methods':
        this.invalidate('jadwal');
        this.invalidate('dashboard_stats');
        this.invalidate('laporan');
        break;
      case 'personnel':
        this.invalidate('manpower');
        break;
      case 'jsa':
      case 'procurement':
      case 'manpower':
      case 'jadwal':
        this.invalidate('dashboard_stats');
        this.invalidate('laporan');
        break;
      case 'company':
        this.invalidate('dashboard_stats');
        this.invalidate('laporan');
        break;
    }
  },

  clear() {
    Object.keys(_cache).forEach(k => {
      delete _cache[k];
      delete _cacheTimestamps[k];
      delete _cacheMeta[k];
    });
  },

  getPending(key) { return _pending[key] || null; },
  setPending(key, promise) { _pending[key] = promise; },
  deletePending(key) { delete _pending[key]; },

  async warmup(sheets = null) {
    const sheetsToWarm = sheets || this.getPrioritySheets();
    const warmupPromises = sheetsToWarm.map(async (sheet) => {
      try {
        if (!this.isValid(sheet, sheet, true)) {
          if (sheet === 'company') {
            const all = await DB.getAll(sheet);
            const row = all.rows?.[0] || null;
            if (row) { this.set(sheet, row, sheet); }
          } else {
            await DB.getAll(sheet);
          }
        }
      } catch (err) {
        console.warn(`[AppCache] Warmup failed for ${sheet}:`, err.message);
      }
    });
    await Promise.allSettled(warmupPromises);
  },

  async refreshStale(sheet) {
    if (!this.hasStaleSupport(sheet)) return;
    const isStale = this.isStale(sheet, sheet);
    const isStaleValid = this.isStaleWindowValid(sheet, sheet);
    if (isStale && isStaleValid) {
      try {
        const result = await DB.getAll(sheet);
        this.set(sheet, result, sheet);
      } catch (err) {
        console.warn(`[AppCache] BG refresh failed for ${sheet}:`, err.message);
      }
    }
  },

  shouldBackgroundRefresh(key, sheet) {
    if (!this.hasStaleSupport(sheet)) return false;
    const age = this.getCacheAge(key);
    if (age === null) return false;
    const ttlSec = this.getTTL(sheet) / 1000;
    const threshold = this.getBgRefreshThreshold(sheet);
    return age > ttlSec * threshold;
  },

  getCacheAge(key) {
    const ts = _cacheTimestamps[key];
    if (!ts) return null;
    return Math.round((Date.now() - ts) / 1000);
  },
};

window.AppCache = AppCache;