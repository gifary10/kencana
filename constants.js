// constants.js — Konstanta terpusat KPT App
// Semua magic strings (route, sheet name, role, ID elemen) didefinisikan di sini.
// JANGAN tulis string literal untuk hal-hal ini di file lain — gunakan konstanta ini.

/* ==================== ROUTES ==================== */
const ROUTES = Object.freeze({
  DASHBOARD:  'dashboard',
  PERUSAHAAN: 'perusahaan',
  PROYEK:     'proyek',
  METODE:     'metode',
  JSA:        'jsa',
  MANPOWER:   'manpower',
  PEMBELIAN:  'pembelian',
  LAPORAN:    'laporan',
  AKUN:       'akun',
});

// Route yang memerlukan data perusahaan lengkap
const ROUTES_NEED_COMPANY = Object.freeze([
  ROUTES.PROYEK, ROUTES.METODE, ROUTES.JSA,
  ROUTES.MANPOWER, ROUTES.PEMBELIAN, ROUTES.LAPORAN, ROUTES.AKUN,
]);

// Route yang memerlukan minimal 1 proyek
const ROUTES_NEED_PROJECT = Object.freeze([
  ROUTES.METODE, ROUTES.JSA, ROUTES.MANPOWER, ROUTES.PEMBELIAN, ROUTES.LAPORAN,
]);

/* ==================== SHEET NAMES ==================== */
const SHEETS = Object.freeze({
  COMPANY:      'company',
  PROJECTS:     'projects',
  JSA:          'jsa',
  WORK_METHODS: 'work_methods',
  PERSONNEL:    'personnel',
  MANPOWER:     'manpower',
  PROCUREMENT:  'procurement',
  ACCOUNTS:     'accounts',
});

/* ==================== ELEMENT IDs ==================== */
// IDs DOM yang dirujuk dari lebih dari satu file
const EL = Object.freeze({
  // Layout utama
  APP_NAVBAR:       'appNavbar',
  APP_SIDEBAR:      'appSidebar',
  APP_MAIN_CONTENT: 'appMainContent',
  SIDEBAR_OVERLAY:  'sidebarOverlay',
  NAVBAR_SPINNER:   'navbarLoadingSpinner',
  SIDEBAR_USERNAME: 'sidebarUserName',
  SIDEBAR_USERROLE: 'sidebarUserRole',
  NAV_SECTION_ADMIN:'navSectionAdmin',
  NAV_ITEM_AKUN:    'navItemAkun',

  // Login
  LOGIN_CONTAINER:  'loginContainer',
  LOGIN_USERNAME:   'loginUsername',
  LOGIN_PASSWORD:   'loginPassword',
  LOGIN_BTN:        'loginBtn',
  LOGIN_ERROR:      'loginError',
  LOGIN_ERROR_MSG:  'loginErrorMsg',

  // Account manager
  ACCOUNT_TABLE_CARD:     'accountTableCard',
  ADD_ACCOUNT_FORM_CARD:  'addAccountFormCard',
  EDIT_ACCOUNT_USERNAME:  'editAccountUsername',
  INPUT_ACCOUNT_USERNAME: 'inputAccountUsername',
  INPUT_ACCOUNT_PASSWORD: 'inputAccountPassword',
  INPUT_ACCOUNT_NAME:     'inputAccountName',
  INPUT_ACCOUNT_ROLE:     'inputAccountRole',

  // Dashboard
  DASHBOARD_ALERTS:  'dashboardAlerts',
  STAT_COMPANY:      'statCompany',
  STAT_PROJECTS:     'statProjects',
  STAT_JSA:          'statJSA',
  STAT_WORK_METHODS: 'statWorkMethods',
  STAT_PROCUREMENT:  'statProcurement',
  STAT_MANPOWER:     'statManpower',
  RECENT_JSA:        'recentJSA',
  RECENT_PROJECTS:   'recentProjects',
});

/* ==================== ROLES ==================== */
const ROLE_KEYS = Object.freeze({
  ADMIN:   'admin',
  HSE:     'hse',
  PEMBELI: 'pembeli',
});

/* ==================== ERROR MESSAGES ==================== */
// Pesan error yang ramah user — terpusat agar mudah diubah/diterjemahkan
const ERR = Object.freeze({
  COMPANY_INCOMPLETE: 'Harap lengkapi profil perusahaan terlebih dahulu.',
  NO_PROJECT:         'Seluruh fitur harus terikat pada sebuah Proyek.',
  NETWORK:            'Gagal terhubung ke server. Periksa koneksi internet Anda.',
  SAVE_FAILED:        'Gagal menyimpan data. Silakan coba lagi.',
  DELETE_FAILED:      'Gagal menghapus data. Silakan coba lagi.',
  LOAD_FAILED:        'Gagal memuat data. Silakan muat ulang halaman.',
  REQUIRED_FIELD:     (field) => `${field} wajib diisi!`,
  MIN_LENGTH:         (field, n) => `${field} minimal ${n} karakter!`,
  DUPLICATE:          (field) => `${field} sudah digunakan!`,
});

/* ==================== TOAST TYPES ==================== */
const TOAST = Object.freeze({
  SUCCESS: 'success',
  DANGER:  'danger',
  WARNING: 'warning',
  INFO:    'info',
});

/* ==================== DEBOUNCE KEYS ==================== */
// Kunci unik untuk setiap search input — dipakai DB.debounceCall()
const DEBOUNCE_KEYS = Object.freeze({
  SEARCH_PROJECT:     'searchProject',
  SEARCH_JSA:         'searchJSA',
  SEARCH_WORK_METHOD: 'searchWorkMethod',
  SEARCH_PO:          'searchPO',
});
