// ============================================================
// Code.gs — KPT App Backend (Google Apps Script) [OPTIMIZED v3 - Lazy Loading]
// Sheet ID: 1labR19GsvF8mFcn4eAsHpzFGenWFROSBfdG0b_yoSXQ
// ============================================================

const SHEET_ID = '1labR19GsvF8mFcn4eAsHpzFGenWFROSBfdG0b_yoSXQ';

// ============================================================
// KEAMANAN: Token API
// Ganti nilai ini dengan string acak yang kuat (min 32 karakter).
// Simpan token yang sama di frontend: config.js → window.GS_API_TOKEN
// Cara generate token acak: https://www.random.org/strings/
// ============================================================
const API_TOKEN = PropertiesService.getScriptProperties().getProperty('KPT_API_TOKEN') || '';

const SHEETS = {
  company:      { name: 'company',      headers: ['id','name','address','contact','email','website','updated_at'] },
  projects:     { name: 'projects',     headers: ['id','name','client','location','pic','start_date','end_date','contract_value','created_at','updated_at'] },
  jsa:          { name: 'jsa',          headers: ['id','project_id','document_number','revision','date','ppe','hazard_identification','emergency','permits','prepared_by','reviewed_by','approved_by','created_at','updated_at'] },
  work_methods: { name: 'work_methods', headers: ['id','project_id','document_number','revision','date','work_steps','prepared_by','reviewed_by','approved_by','created_at','updated_at'] },
  personnel:    { name: 'personnel',    headers: ['id','name','nik','birth_date','address','position','updated_at'] },
  manpower:     { name: 'manpower',     headers: ['id','project_id','personnel_id','updated_at'] },
  procurement:  { name: 'procurement',  headers: ['id','project_id','material_name','specification','quantity','unit','unit_price','total_price','date','created_at','updated_at'] },
  accounts:     { name: 'accounts',     headers: ['username','password','role','name'] }
};

// Cache spreadsheet
let _ssCache = null;
function _getSpreadsheet() {
  if (!_ssCache) _ssCache = SpreadsheetApp.openById(SHEET_ID);
  return _ssCache;
}

// ============================================================
// HTTP HANDLERS
// ============================================================

// ============================================================
// TOKEN VALIDATION — validasi setiap request masuk
// ============================================================
function _validateToken(tokenFromRequest) {
  if (!API_TOKEN) return true; // Token belum dikonfigurasi → lewati (mode dev)
  return tokenFromRequest === API_TOKEN;
}

function doGet(e) {
  const action = e.parameter.action || '';
  const sheet  = e.parameter.sheet  || '';
  const id     = e.parameter.id     || '';

  // Action 'ping' dan 'login' tidak butuh token
  if (action !== 'ping') {
    const tok = e.parameter.token || '';
    if (!_validateToken(tok)) return jsonErr('Unauthorized');
  }
  
  try {
    if (action === 'ping')       return jsonOk({ message: 'KPT API ready', ts: new Date().toISOString() });
    if (action === 'getAll')     return _handleGetAll(e);
    if (action === 'getById')    return jsonOk({ row: getById(sheet, id) });
    if (action === 'getCount')   return jsonOk({ count: getCount(sheet) });
    if (action === 'getCounts')  return jsonOk(getCounts(e.parameter.sheets ? e.parameter.sheets.split(',') : []));
    if (action === 'getStats')   return jsonOk(getDashboardStats());
    if (action === 'getRecent')  return jsonOk(getRecentOptimized(sheet, parseInt(e.parameter.limit) || 5));
    if (action === 'getSummary') return jsonOk(getProjectSummary(e.parameter.projectId));
    return jsonErr('Unknown GET action: ' + action);
  } catch(err) {
    return jsonErr(err.toString());
  }
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const { action, sheet, data, id } = payload;

    // Login tidak butuh token (belum punya token saat login)
    if (action !== 'login') {
      if (!_validateToken(payload.token || '')) return jsonErr('Unauthorized');
    }

    if (action === 'login')         return jsonOk(handleLogin(payload.username, payload.password));
    if (action === 'upsert')        return jsonOk({ row: upsert(sheet, data) });
    if (action === 'delete')        return jsonOk({ deleted: deleteRow(sheet, id) });
    if (action === 'deleteWhere')   return jsonOk({ deleted: deleteWhere(sheet, payload.field, payload.value) });
    if (action === 'batchUpsert')   return jsonOk({ rows: batchUpsert(payload.operations || []) });
    if (action === 'batchDelete')   return jsonOk({ deleted: batchDelete(payload.operations || []) });
    if (action === 'initSheets')    return jsonOk({ message: initAllSheets() });
    if (action === 'saveAccount')   return jsonOk({ row: handleSaveAccount(payload) });
    if (action === 'deleteProject') return jsonOk({ deleted: deleteProjectCascade(payload.projectId) });

    return jsonErr('Unknown POST action: ' + action);
  } catch(err) {
    return jsonErr(err.toString());
  }
}

// ============================================================
// OPTIMIZED: getAll dengan parameter yang lebih efisien
// ============================================================
function _handleGetAll(e) {
  const sheet       = e.parameter.sheet || '';
  const filterField = e.parameter.filterField || '';
  const filterValue = e.parameter.filterValue || '';
  const searchField = e.parameter.searchField || '';
  const searchValue = e.parameter.searchValue || '';
  const limit       = parseInt(e.parameter.limit) || 0;
  const offset      = parseInt(e.parameter.offset) || 0;
  const fields      = e.parameter.fields ? e.parameter.fields.split(',') : null; // NEW: Select specific fields
  
  return jsonOk(getAllOptimized(sheet, { filterField, filterValue, searchField, searchValue, limit, offset, fields }));
}

function getAllOptimized(sheetName, opts = {}) {
  const ws      = getOrCreateSheet(sheetName);
  const headers = SHEETS[sheetName].headers;
  const lastRow = ws.getLastRow();
  
  const result = { rows: [], total: 0 };
  if (lastRow < 2) return result;

  // Jika fields ditentukan, baca hanya kolom yang diperlukan
  let colIndices = [];
  let readHeaders = headers;
  
  if (opts.fields && opts.fields.length > 0) {
    colIndices = opts.fields.map(f => headers.indexOf(f)).filter(i => i !== -1);
    readHeaders = opts.fields;
    if (colIndices.length === 0) colIndices = headers.map((_, i) => i);
  } else {
    colIndices = headers.map((_, i) => i);
  }

  const values = ws.getRange(2, 1, lastRow - 1, headers.length).getValues();
  let filtered = values.filter(row => row[0] !== '' && row[0] !== null && row[0] !== undefined);

  result.total = filtered.length;

  if (opts.filterField && opts.filterValue) {
    const ci = headers.indexOf(opts.filterField);
    if (ci !== -1) {
      filtered = filtered.filter(row => String(row[ci]) === String(opts.filterValue));
      result.total = filtered.length;
    }
  }

  if (opts.searchField && opts.searchValue) {
    const ci = headers.indexOf(opts.searchField);
    const searchLower = opts.searchValue.toLowerCase();
    if (ci !== -1) {
      filtered = filtered.filter(row => row[ci] && String(row[ci]).toLowerCase().includes(searchLower));
      result.total = filtered.length;
    }
  }

  // Sort by updated_at / created_at descending
  const dateCI = headers.indexOf('updated_at');
  const createdCI = headers.indexOf('created_at');
  filtered.sort((a, b) => {
    const dA = a[dateCI] || a[createdCI] || '';
    const dB = b[dateCI] || b[createdCI] || '';
    return String(dB).localeCompare(String(dA));
  });

  if (opts.limit > 0) {
    filtered = filtered.slice(opts.offset, opts.offset + opts.limit);
  }

  // Map dengan field yang dipilih saja
  result.rows = filtered.map(row => {
    const obj = {};
    colIndices.forEach((ci, i) => {
      const headerName = readHeaders[i] || headers[ci];
      obj[headerName] = row[ci];
    });
    return rowToObj(headers, row); // Tetap gunakan rowToObj untuk formatting
  });
  
  return result;
}

// ============================================================
// OPTIMIZED: getRecent - Baca langsung dari bawah tanpa getAll
// ============================================================
function getRecentOptimized(sheetName, limit) {
  const ws      = getOrCreateSheet(sheetName);
  const headers = SHEETS[sheetName].headers;
  const lastRow = ws.getLastRow();
  
  if (lastRow < 2) return { rows: [], total: 0 };
  
  const startRow = Math.max(2, lastRow - limit + 1);
  const numRows  = lastRow - startRow + 1;
  
  const values = ws.getRange(startRow, 1, numRows, headers.length).getValues();
  const filtered = values.filter(row => row[0] !== '' && row[0] !== null).reverse();
  
  return {
    rows: filtered.map(row => rowToObj(headers, row)),
    total: filtered.length
  };
}

// ============================================================
// OPTIMIZED: getCounts - Multiple counts in one request
// ============================================================
function getCounts(sheetNames) {
  const ss = _getSpreadsheet();
  const counts = {};
  
  sheetNames.forEach(name => {
    if (!SHEETS[name]) { counts[name] = 0; return; }
    const cfg = SHEETS[name];
    const ws  = ss.getSheetByName(cfg.name);
    if (!ws || ws.getLastRow() < 2) { counts[name] = 0; return; }
    
    const idCol = cfg.headers.indexOf('id');
    if (idCol === -1) {
      const userCol = cfg.headers.indexOf('username') + 1;
      const vals = ws.getRange(2, userCol, ws.getLastRow() - 1, 1).getValues().flat();
      counts[name] = vals.filter(v => v && String(v).trim() !== '').length;
    } else {
      const vals = ws.getRange(2, idCol + 1, ws.getLastRow() - 1, 1).getValues().flat();
      counts[name] = vals.filter(v => v && String(v).trim() !== '').length;
    }
  });
  
  return counts;
}

// ============================================================
// OPTIMIZED: getProjectSummary - Summary per project tanpa getAll
// ============================================================
function getProjectSummary(projectId) {
  if (!projectId) return jsonErr('projectId required');
  
  const ss = _getSpreadsheet();
  const summary = { jsa_count: 0, wm_count: 0, po_count: 0, mp_count: 0 };
  
  // Count JSA for project
  ['jsa', 'work_methods', 'procurement', 'manpower'].forEach(sheetName => {
    const ws = ss.getSheetByName(SHEETS[sheetName].name);
    if (!ws || ws.getLastRow() < 2) return;
    
    const headers = SHEETS[sheetName].headers;
    const projCol = headers.indexOf('project_id');
    if (projCol === -1) return;
    
    const vals = ws.getRange(2, projCol + 1, ws.getLastRow() - 1, 1).getValues().flat();
    const countKey = sheetName === 'jsa' ? 'jsa_count' : 
                     sheetName === 'work_methods' ? 'wm_count' : 
                     sheetName === 'procurement' ? 'po_count' : 'mp_count';
    summary[countKey] = vals.filter(v => String(v) === String(projectId)).length;
  });
  
  return summary;
}

// ============================================================
// EXISTING FUNCTIONS (dipertahankan dengan optimasi)
// ============================================================

function getById(sheetName, id) {
  if (!id) return null;
  const ws      = getOrCreateSheet(sheetName);
  const headers = SHEETS[sheetName].headers;
  const idCol   = headers.indexOf('id') + 1;
  if (idCol === 0) return null;

  const lastRow = ws.getLastRow();
  if (lastRow < 2) return null;

  const finder = ws.getRange(2, idCol, lastRow - 1, 1)
    .createTextFinder(String(id))
    .matchEntireCell(true);
  const cell = finder.findNext();
  if (!cell) return null;

  const row = ws.getRange(cell.getRow(), 1, 1, headers.length).getValues()[0];
  return rowToObj(headers, row);
}

function getCount(sheetName) {
  const ws      = getOrCreateSheet(sheetName);
  const lastRow = ws.getLastRow();
  if (lastRow < 2) return 0;

  const headers = SHEETS[sheetName].headers;
  const idCol   = headers.indexOf('id');

  if (idCol === -1) {
    const userCol = headers.indexOf('username') + 1;
    const vals    = ws.getRange(2, userCol, lastRow - 1, 1).getValues().flat();
    return vals.filter(v => v && String(v).trim() !== '').length;
  }
  const vals = ws.getRange(2, idCol + 1, lastRow - 1, 1).getValues().flat();
  return vals.filter(v => v && String(v).trim() !== '').length;
}

function getDashboardStats() {
  const ss      = _getSpreadsheet();
  const sheetNames = ['projects', 'jsa', 'work_methods', 'procurement', 'manpower'];
  const counts  = {};

  sheetNames.forEach(name => {
    const cfg = SHEETS[name];
    const ws  = ss.getSheetByName(cfg.name);
    if (!ws || ws.getLastRow() < 2) { counts[name] = 0; return; }

    const idCol = cfg.headers.indexOf('id') + 1;
    if (idCol === 0) { counts[name] = 0; return; }

    const vals    = ws.getRange(2, idCol, ws.getLastRow() - 1, 1).getValues().flat();
    counts[name]  = vals.filter(v => v && String(v).trim() !== '').length;
  });

  return {
    totalProjects:    counts['projects'],
    totalJSA:         counts['jsa'],
    totalWorkMethods: counts['work_methods'],
    totalPO:          counts['procurement'],
    totalManpower:    counts['manpower']
  };
}

function getRecent(sheetName, limit) {
  return getRecentOptimized(sheetName, limit);
}

function upsert(sheetName, data) {
  const ws      = getOrCreateSheet(sheetName);
  const headers = SHEETS[sheetName].headers;
  const idCol   = headers.indexOf('id');

  if (idCol === -1) {
    const keyCol  = headers.indexOf('username');
    const lastRow = ws.getLastRow();
    if (lastRow >= 2) {
      const vals = ws.getRange(2, keyCol + 1, lastRow - 1, 1).getValues();
      for (let i = 0; i < vals.length; i++) {
        if (vals[i][0] === data.username) {
          ws.getRange(i + 2, 1, 1, headers.length).setValues([objToRow(headers, data)]);
          return data;
        }
      }
    }
    ws.appendRow(objToRow(headers, data));
    return data;
  }

  const lastRow = ws.getLastRow();
  if (lastRow >= 2) {
    const finder = ws.getRange(2, idCol + 1, lastRow - 1, 1)
      .createTextFinder(String(data.id))
      .matchEntireCell(true);
    const cell = finder.findNext();
    if (cell) {
      ws.getRange(cell.getRow(), 1, 1, headers.length).setValues([objToRow(headers, data)]);
      return data;
    }
  }
  ws.appendRow(objToRow(headers, data));
  return data;
}

function deleteRow(sheetName, id) {
  const ws      = getOrCreateSheet(sheetName);
  const headers = SHEETS[sheetName].headers;
  const idCol   = headers.indexOf('id');
  if (idCol === -1) return false;

  const lastRow = ws.getLastRow();
  if (lastRow < 2) return false;

  const finder = ws.getRange(2, idCol + 1, lastRow - 1, 1)
    .createTextFinder(String(id))
    .matchEntireCell(true);
  const cell = finder.findNext();
  if (!cell) return false;

  ws.deleteRow(cell.getRow());
  return true;
}

function deleteWhere(sheetName, field, value) {
  const ws      = getOrCreateSheet(sheetName);
  const headers = SHEETS[sheetName].headers;
  const col     = headers.indexOf(field);
  if (col === -1) return 0;

  const lastRow = ws.getLastRow();
  if (lastRow < 2) return 0;

  const vals   = ws.getRange(2, col + 1, lastRow - 1, 1).getValues();
  let deleted  = 0;
  for (let i = vals.length - 1; i >= 0; i--) {
    if (String(vals[i][0]) === String(value)) {
      ws.deleteRow(i + 2);
      deleted++;
    }
  }
  return deleted;
}

function batchUpsert(operations) {
  const results = [];
  const grouped = {};
  operations.forEach(op => {
    if (!grouped[op.sheet]) grouped[op.sheet] = [];
    grouped[op.sheet].push(op.data);
  });

  for (const [sheetName, dataArray] of Object.entries(grouped)) {
    const ws      = getOrCreateSheet(sheetName);
    const headers = SHEETS[sheetName].headers;
    const idCol   = headers.indexOf('id');

    if (idCol === -1) {
      dataArray.forEach(data => results.push(upsert(sheetName, data)));
      continue;
    }

    const lastRow = ws.getLastRow();
    const existingIds = {};
    if (lastRow >= 2) {
      const idVals = ws.getRange(2, idCol + 1, lastRow - 1, 1).getValues();
      idVals.forEach((v, i) => { if (v[0]) existingIds[String(v[0])] = i + 2; });
    }

    const newRows = [];
    dataArray.forEach(data => {
      const rowNum = existingIds[String(data.id)];
      if (rowNum) {
        ws.getRange(rowNum, 1, 1, headers.length).setValues([objToRow(headers, data)]);
      } else {
        newRows.push(objToRow(headers, data));
      }
      results.push(data);
    });

    if (newRows.length > 0) {
      ws.getRange(ws.getLastRow() + 1, 1, newRows.length, headers.length).setValues(newRows);
    }
  }

  return results;
}

function batchDelete(operations) {
  let totalDeleted = 0;
  const grouped = {};
  operations.forEach(op => {
    const key = op.sheet + '::' + op.field;
    if (!grouped[key]) grouped[key] = { sheet: op.sheet, field: op.field, values: [] };
    grouped[key].values.push(String(op.value));
  });

  for (const grp of Object.values(grouped)) {
    const ws      = getOrCreateSheet(grp.sheet);
    const headers = SHEETS[grp.sheet].headers;
    const col     = headers.indexOf(grp.field);
    if (col === -1) continue;

    const lastRow = ws.getLastRow();
    if (lastRow < 2) continue;

    const vals      = ws.getRange(2, col + 1, lastRow - 1, 1).getValues();
    const targetSet = new Set(grp.values);
    const rowsToDelete = [];

    vals.forEach((v, i) => {
      if (targetSet.has(String(v[0]))) rowsToDelete.push(i + 2);
    });

    for (let i = rowsToDelete.length - 1; i >= 0; i--) {
      ws.deleteRow(rowsToDelete[i]);
      totalDeleted++;
    }
  }

  return totalDeleted;
}

// ============================================================
// ATOMIC: Hapus proyek + semua data terkait dalam 1 request
// Menggantikan 5 round-trip terpisah dari client
// ============================================================
function deleteProjectCascade(projectId) {
  if (!projectId) throw new Error('projectId wajib diisi');

  // Hapus data terkait berdasarkan project_id
  const related = ['jsa', 'work_methods', 'procurement', 'manpower'];
  related.forEach(sheetName => deleteWhere(sheetName, 'project_id', projectId));

  // Hapus proyek itu sendiri
  deleteRow('projects', projectId);

  return true;
}

function initAllSheets() {
  const ss = _getSpreadsheet();
  Object.values(SHEETS).forEach(cfg => {
    let ws = ss.getSheetByName(cfg.name);
    if (!ws) ws = ss.insertSheet(cfg.name);
    if (ws.getLastRow() === 0 || ws.getRange(1,1).getValue() !== cfg.headers[0]) {
      ws.getRange(1, 1, 1, cfg.headers.length).setValues([cfg.headers]);
      ws.getRange(1, 1, 1, cfg.headers.length)
        .setFontWeight('bold').setBackground('#1e3a5f').setFontColor('#ffffff');
      ws.setFrozenRows(1);
    }
  });

  const accountWs = ss.getSheetByName('accounts');
  if (accountWs && accountWs.getLastRow() <= 1) {
    const defaults = [
      ['admin',   hashPassword('admin123'),   'admin',   'Administrator'],
      ['hse',     hashPassword('hse123'),     'hse',     'HSE Officer'],
      ['pembeli', hashPassword('pembeli123'), 'pembeli', 'Staff Pembeli']
    ];
    accountWs.getRange(2, 1, defaults.length, 4).setValues(defaults);
  }

  return 'All sheets initialized';
}

function getOrCreateSheet(sheetName) {
  const ss = _getSpreadsheet();
  let ws   = ss.getSheetByName(sheetName);
  if (!ws) {
    ws = ss.insertSheet(sheetName);
    const cfg = SHEETS[sheetName];
    if (cfg) {
      ws.getRange(1, 1, 1, cfg.headers.length).setValues([cfg.headers]);
      ws.getRange(1, 1, 1, cfg.headers.length)
        .setFontWeight('bold').setBackground('#1e3a5f').setFontColor('#ffffff');
      ws.setFrozenRows(1);
    }
  }
  return ws;
}

function rowToObj(headers, row) {
  const obj = {};
  headers.forEach((h, i) => {
    let v = row[i];
    if (v instanceof Date) v = v.toISOString();
    if (v === '' || v === null || v === undefined) v = null;
    if (typeof v === 'string' && (v.startsWith('{') || v.startsWith('['))) {
      try { v = JSON.parse(v); } catch(e) {}
    }
    obj[h] = v;
  });
  return obj;
}

// ============================================================
// KEAMANAN: Sanitasi formula injection
// Nilai yang diawali = + - @ bisa dieksekusi sebagai formula di Google Sheets
// ============================================================
function sanitizeValue(v) {
  if (typeof v !== 'string') return v;
  const dangerous = ['=', '+', '-', '@', '\t', '\r'];
  if (dangerous.some(c => v.startsWith(c))) {
    return "'" + v; // Prefix apostrof → Sheets perlakukan sebagai teks literal
  }
  return v;
}

function objToRow(headers, obj) {
  return headers.map(h => {
    let v = obj[h];
    if (v === undefined || v === null) return '';
    if (typeof v === 'object') return JSON.stringify(v);
    return sanitizeValue(String(v));
  });
}

// ============================================================
// AUTH HELPERS — password hashing & server-side login
// ============================================================

// SHA-256 hash menggunakan Utilities.computeDigest bawaan Apps Script
function hashPassword(password) {
  const raw = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    password,
    Utilities.Charset.UTF_8
  );
  return raw.map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');
}

// Migrasi otomatis: jika password belum di-hash (panjang < 64), hash dan simpan
function _migratePasswordIfNeeded(ws, headers, rowNum, plainPassword) {
  const hashed = hashPassword(plainPassword);
  const pwCol  = headers.indexOf('password') + 1;
  ws.getRange(rowNum, pwCol).setValue(hashed);
  return hashed;
}

// Login handler — validasi di server, hanya kembalikan data sesi (tanpa password)
function handleLogin(username, password) {
  if (!username || !password) throw new Error('Username dan password wajib diisi.');

  const ws      = getOrCreateSheet('accounts');
  const headers = SHEETS.accounts.headers;
  const lastRow = ws.getLastRow();

  if (lastRow < 2) throw new Error('Tidak ada akun terdaftar.');

  const values = ws.getRange(2, 1, lastRow - 1, headers.length).getValues();
  const uCol   = headers.indexOf('username');
  const pwCol  = headers.indexOf('password');
  const roleCol= headers.indexOf('role');
  const nameCol= headers.indexOf('name');

  const inputHash = hashPassword(password);

  for (let i = 0; i < values.length; i++) {
    const row      = values[i];
    const rowUser  = String(row[uCol] || '').toLowerCase();
    if (rowUser !== username.toLowerCase()) continue;

    let storedPw = String(row[pwCol] || '');

    // Auto-migrasi plaintext → hash saat pertama login
    if (storedPw.length < 64) {
      storedPw = _migratePasswordIfNeeded(ws, headers, i + 2, storedPw);
    }

    if (storedPw !== inputHash) throw new Error('Username atau password salah.');

    // Sukses — kembalikan data sesi (TANPA password)
    return {
      session: {
        username: String(row[uCol]),
        name:     String(row[nameCol] || ''),
        role:     String(row[roleCol] || 'hse')
      }
    };
  }

  throw new Error('Username atau password salah.');
}

// Save account — hash password sebelum disimpan; pertahankan password lama jika tidak dikirim
function handleSaveAccount(payload) {
  const { username, name, role, oldUsername, password } = payload;
  if (!username || !name) throw new Error('Data akun tidak lengkap.');

  let finalPasswordHash;

  if (password) {
    // Password baru dikirim → hash dan simpan
    finalPasswordHash = hashPassword(password);
  } else {
    // Password tidak dikirim (mode edit, tidak diubah) → ambil hash lama
    const ws      = getOrCreateSheet('accounts');
    const headers = SHEETS.accounts.headers;
    const lastRow = ws.getLastRow();
    const uCol    = headers.indexOf('username');
    const pwCol   = headers.indexOf('password');
    const targetUser = oldUsername || username;

    if (lastRow >= 2) {
      const values = ws.getRange(2, 1, lastRow - 1, headers.length).getValues();
      const row    = values.find(r => String(r[uCol]).toLowerCase() === targetUser.toLowerCase());
      if (row) finalPasswordHash = String(row[pwCol]);
    }
    if (!finalPasswordHash) throw new Error('Password wajib diisi untuk akun baru.');
  }

  // Jika rename username, hapus baris lama dulu
  if (oldUsername && oldUsername !== username) {
    deleteWhere('accounts', 'username', oldUsername);
  }

  return upsert('accounts', { username, password: finalPasswordHash, name, role });
}

function jsonOk(data) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, ...data }))
    .setMimeType(ContentService.MimeType.JSON);
}

function jsonErr(msg) {
  return ContentService
    .createTextOutput(JSON.stringify({ ok: false, error: msg }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doOptions(e) {
  return ContentService.createTextOutput('').setMimeType(ContentService.MimeType.TEXT);
}