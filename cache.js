// cache.js — ES6 Module v2.0 with Memory Management & Performance Optimization

const _cache            = new Map();
const _cacheTimestamps  = new Map();
const _cacheMeta        = new Map();
const _pending          = new Map();

const MAX_CACHE_SIZE = 100;
const MAX_CACHE_AGE  = 30 * 60 * 1000; // 30 menit

const PRIORITY_SHEETS = Object.freeze({
  company:      { ttl: 60 * 60 * 1000, preload: true,  staleWhileRevalidate: true },
  accounts:     { ttl: 60 * 60 * 1000, preload: true,  staleWhileRevalidate: true },
  projects:     { ttl: 30 * 60 * 1000, preload: true,  staleWhileRevalidate: true },
  work_methods: { ttl: 10 * 60 * 1000, preload: false, staleWhileRevalidate: true },
  jsa:          { ttl: 10 * 60 * 1000, preload: false, staleWhileRevalidate: true },
  jadwal:       { ttl: 10 * 60 * 1000, preload: false, staleWhileRevalidate: true },
  manpower:     { ttl:  5 * 60 * 1000, preload: false, staleWhileRevalidate: true },
  personnel:    { ttl:  5 * 60 * 1000, preload: false, staleWhileRevalidate: true },
  procurement:  { ttl:  2 * 60 * 1000, preload: false, staleWhileRevalidate: true },
});

const CACHE_TTL = Object.freeze({
  company:        60 * 60 * 1000,
  accounts:       60 * 60 * 1000,
  projects:       30 * 60 * 1000,
  work_methods:   10 * 60 * 1000,
  jsa:            10 * 60 * 1000,
  jadwal:         10 * 60 * 1000,
  manpower:        5 * 60 * 1000,
  personnel:       5 * 60 * 1000,
  procurement:     2 * 60 * 1000,
  dashboard_stats:10 * 60 * 1000,
  laporan:         5 * 60 * 1000,
  default:         2 * 60 * 1000,
});

const STALE_WINDOW = Object.freeze({
  company:       4 * 60 * 60 * 1000,
  accounts:      4 * 60 * 60 * 1000,
  projects:      2 * 60 * 60 * 1000,
  work_methods: 45 * 60 * 1000,
  jsa:          45 * 60 * 1000,
  jadwal:       45 * 60 * 1000,
  manpower:     20 * 60 * 1000,
  personnel:    20 * 60 * 1000,
  procurement:  10 * 60 * 1000,
  laporan:      20 * 60 * 1000,
});

const BG_REFRESH_THRESHOLD = Object.freeze({
  procurement:  0.60,
  jsa:          0.70,
  work_methods: 0.70,
  jadwal:       0.70,
  manpower:     0.70,
  personnel:    0.70,
  projects:     0.75,
  company:      0.80,
  accounts:     0.80,
  default:      0.70,
});

const DEPENDENCY_MAP = Object.freeze({
  projects:     ['jsa', 'work_methods', 'manpower', 'procurement', 'jadwal'],
  work_methods: ['jsa', 'jadwal'],
  personnel:    ['manpower'],
  company:      ['laporan'],
});

const REVERSE_DEPENDENCY_MAP = (() => {
  const reverse = {};
  Object.entries(DEPENDENCY_MAP).forEach(([source, targets]) => {
    targets.forEach(target => {
      if (!reverse[target]) reverse[target] = [];
      reverse[target].push(source);
    });
  });
  return Object.freeze(reverse);
})();

let _cleanupTimer = null;

export const AppCache = {
  _startPeriodicCleanup() {
    if (_cleanupTimer) return;
    _cleanupTimer = setInterval(() => this._evictExpiredEntries(), 5 * 60 * 1000);
    window.addEventListener('beforeunload', () => {
      if (_cleanupTimer) { clearInterval(_cleanupTimer); _cleanupTimer = null; }
    });
  },

  _evictExpiredEntries() {
    const now = Date.now();
    const toDelete = [];
    _cacheTimestamps.forEach((ts, key) => {
      if (now - ts > MAX_CACHE_AGE) toDelete.push(key);
    });
    toDelete.forEach(key => {
      _cache.delete(key); _cacheTimestamps.delete(key);
      _cacheMeta.delete(key); _pending.delete(key);
    });
    if (toDelete.length > 0) console.debug(`[AppCache] Evicted ${toDelete.length} expired entries`);
  },

  _enforceMaxSize() {
    if (_cache.size <= MAX_CACHE_SIZE) return;
    const entries = [..._cacheTimestamps.entries()].sort((a, b) => a[1] - b[1]);
    entries.slice(0, _cache.size - MAX_CACHE_SIZE).forEach(([key]) => {
      _cache.delete(key); _cacheTimestamps.delete(key); _cacheMeta.delete(key);
    });
  },

  getPrioritySheets()    { return Object.keys(PRIORITY_SHEETS).filter(s => PRIORITY_SHEETS[s].preload); },
  getAllPrioritySheets()  { return Object.keys(PRIORITY_SHEETS); },
  isPrioritySheet(sheet) { return !!PRIORITY_SHEETS[sheet]; },
  hasStaleSupport(sheet) { return !!(PRIORITY_SHEETS[sheet]?.staleWhileRevalidate); },

  buildKey(sheet, params) {
    if (params && Object.keys(params).length > 0) {
      const sorted = {};
      Object.keys(params).sort().forEach(k => { sorted[k] = params[k]; });
      return sheet + '::' + JSON.stringify(sorted);
    }
    return sheet;
  },

  extractDependencies(sheet, params = {}) {
    const deps = [sheet];
    if (params.filterField === 'project_id' && params.filterValue)     deps.push(`projects:${params.filterValue}`);
    if (params.filterField === 'work_method_id' && params.filterValue) deps.push(`work_methods:${params.filterValue}`);
    if (params.filterField === 'personnel_id' && params.filterValue)   deps.push(`personnel:${params.filterValue}`);
    (REVERSE_DEPENDENCY_MAP[sheet] || []).forEach(r => deps.push(r));
    return [...new Set(deps)];
  },

  getTTL(sheet)              { return CACHE_TTL[sheet] || CACHE_TTL.default; },
  getStaleWindow(sheet)      { return STALE_WINDOW[sheet] || 0; },
  getBgRefreshThreshold(sh)  { return BG_REFRESH_THRESHOLD[sh] || BG_REFRESH_THRESHOLD.default; },

  isStale(key, sheet) {
    if (!_cache.has(key)) return false;
    const ts = _cacheTimestamps.get(key);
    return ts ? (Date.now() - ts) >= this.getTTL(sheet || 'default') : false;
  },

  isStaleWindowValid(key, sheet) {
    const sw = this.getStaleWindow(sheet);
    if (!sw || !_cache.has(key)) return false;
    const ts = _cacheTimestamps.get(key);
    return ts ? (Date.now() - ts) < (this.getTTL(sheet) + sw) : false;
  },

  isValid(key, sheet, allowStale = false) {
    if (!_cache.has(key)) return false;
    const ts = _cacheTimestamps.get(key);
    if (!ts) return false;
    const age = Date.now() - ts;
    if (age < this.getTTL(sheet || 'default')) return true;
    if (allowStale && this.hasStaleSupport(sheet)) return this.isStaleWindowValid(key, sheet);
    return false;
  },

  get(key) { return _cache.get(key); },

  set(key, value, sheet, meta = {}) {
    const now = Date.now();
    let dependsOn = meta.dependsOn || [];
    if (key.includes('::')) {
      try {
        const params = JSON.parse(key.split('::')[1]);
        dependsOn = [...dependsOn, ...this.extractDependencies(sheet, params)];
      } catch { dependsOn = [sheet]; }
    } else {
      dependsOn = [sheet];
    }
    dependsOn = [...new Set([...dependsOn, ...(REVERSE_DEPENDENCY_MAP[sheet] || [])])];
    _cache.set(key, value);
    _cacheTimestamps.set(key, now);
    _cacheMeta.set(key, { ..._cacheMeta.get(key), ...meta, sheet, dependsOn,
      isPriority: this.isPrioritySheet(sheet), hasStale: this.hasStaleSupport(sheet), lastUpdated: now });
    this._enforceMaxSize();
  },

  invalidateByDependency(dependency) {
    let count = 0;
    const toDelete = [];
    _cacheMeta.forEach((meta, key) => {
      if (meta?.dependsOn?.includes(dependency)) toDelete.push(key);
    });
    toDelete.forEach(key => {
      _cache.delete(key); _cacheTimestamps.delete(key); _cacheMeta.delete(key); count++;
    });
    if (!dependency.includes(':')) {
      (DEPENDENCY_MAP[dependency] || []).forEach(dep => {
        _cacheMeta.forEach((meta, key) => {
          if (meta?.dependsOn?.includes(dep) && !toDelete.includes(key)) {
            _cache.delete(key); _cacheTimestamps.delete(key); _cacheMeta.delete(key); count++;
          }
        });
      });
    }
    return count;
  },

  invalidate(sheet, options = {}) {
    let count = 0;
    if (options.projectId)  count += this.invalidateByDependency(`projects:${options.projectId}`);
    else if (options.entityId) count += this.invalidateByDependency(`${sheet}:${options.entityId}`);
    else {
      count += this.invalidateByDependency(sheet);
      const toDelete = [];
      _cache.forEach((_, key) => { if (key === sheet || key.startsWith(sheet + '::')) toDelete.push(key); });
      toDelete.forEach(key => { _cache.delete(key); _cacheTimestamps.delete(key); _cacheMeta.delete(key); });
      count += toDelete.length;
    }
    return count;
  },

  invalidateRelated(sheet, options = {}) {
    this.invalidate(sheet, options);
    const statsSheets = ['jsa','work_methods','manpower','procurement','jadwal','projects','company'];
    if (statsSheets.includes(sheet)) {
      this.invalidateByDependency('dashboard_stats');
      this.invalidateByDependency('laporan');
    }
    (DEPENDENCY_MAP[sheet] || []).forEach(dep => {
      if (options.projectId) this.invalidateByDependency(`projects:${options.projectId}`);
      else this.invalidate(dep);
    });
  },

  clear() {
    _cache.clear(); _cacheTimestamps.clear(); _cacheMeta.clear(); _pending.clear();
  },

  getPending(key)           { return _pending.get(key) || null; },
  setPending(key, promise)  { _pending.set(key, promise); },
  deletePending(key)        { _pending.delete(key); },

  getStats() {
    const bySheet = {};
    _cacheMeta.forEach((meta) => {
      const sheet = meta.sheet || 'unknown';
      if (!bySheet[sheet]) bySheet[sheet] = { count: 0, dependencies: new Set() };
      bySheet[sheet].count++;
      (meta.dependsOn || []).forEach(dep => bySheet[sheet].dependencies.add(dep));
    });
    return {
      totalKeys: _cache.size, cacheSize: _cache.size, pendingSize: _pending.size,
      bySheet: Object.fromEntries(Object.entries(bySheet).map(([s, d]) => [s, { count: d.count, dependencies: [...d.dependencies] }]))
    };
  },

  async warmup(sheets = null) {
    const sheetsToWarm = sheets || this.getPrioritySheets();
    await Promise.allSettled(sheetsToWarm.map(async (sheet) => {
      try {
        if (!this.isValid(sheet, sheet, true)) {
          if (sheet === 'company') {
            const all = await DB.getAll(sheet);
            const row = all.rows?.[0] || null;
            if (row) this.set(sheet, row, sheet);
          } else {
            await DB.getAll(sheet);
          }
        }
      } catch (err) { console.warn(`[AppCache] Warmup failed for ${sheet}:`, err.message); }
    }));
  },

  async refreshStale(sheet) {
    if (!this.hasStaleSupport(sheet)) return;
    if (this.isStale(sheet, sheet) && this.isStaleWindowValid(sheet, sheet)) {
      try {
        const result = await DB.getAll(sheet);
        this.set(sheet, result, sheet);
      } catch (err) { console.warn(`[AppCache] BG refresh failed for ${sheet}:`, err.message); }
    }
  },

  shouldBackgroundRefresh(key, sheet) {
    if (!this.hasStaleSupport(sheet)) return false;
    const age = this.getCacheAge(key);
    if (age === null) return false;
    return age > (this.getTTL(sheet) / 1000) * this.getBgRefreshThreshold(sheet);
  },

  getCacheAge(key) {
    const ts = _cacheTimestamps.get(key);
    return ts ? Math.round((Date.now() - ts) / 1000) : null;
  },
};

AppCache._startPeriodicCleanup();
