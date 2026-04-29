/* ==================== AUTH SYSTEM ==================== */

const AUTH_KEY = 'kp_auth_session';

const ROLES = {
  admin: {
    label: 'Admin',
    icon: 'bi-shield-lock-fill',
    color: '#2185D5',
    allowedRoutes: ['dashboard', 'perusahaan', 'proyek', 'metode', 'jsa', 'manpower', 'pembelian', 'laporan', 'akun'],
    defaultRoute: 'dashboard',
    badge: 'bg-primary'
  },
  hse: {
    label: 'HSE',
    icon: 'bi-journal-check',
    color: '#10B981',
    allowedRoutes: ['dashboard', 'metode', 'jsa', 'manpower', 'laporan'],
    defaultRoute: 'jsa',
    badge: 'bg-success'
  },
  pembeli: {
    label: 'Pembeli',
    icon: 'bi-cart-fill',
    color: '#F59E0B',
    allowedRoutes: ['dashboard', 'pembelian', 'laporan'],
    defaultRoute: 'pembelian',
    badge: 'bg-warning text-dark'
  }
};

const DEFAULT_ACCOUNTS = [
  { username: 'admin',   password: 'admin123',   role: 'admin',   name: 'Administrator' },
  { username: 'hse',     password: 'hse123',     role: 'hse',     name: 'HSE Officer'   },
  { username: 'pembeli', password: 'pembeli123', role: 'pembeli', name: 'Staff Pembeli'  }
];

const ACCOUNTS_KEY = 'kp_accounts';

/* ==================== AUTH SERVICE ==================== */
const AuthService = {

  getAccounts() {
    try {
      const raw = localStorage.getItem(ACCOUNTS_KEY);
      if (!raw) return null;
      const accounts = JSON.parse(raw);
      return Array.isArray(accounts) ? accounts : null;
    } catch {
      return null;
    }
  },

  initAccounts() {
    if (!this.getAccounts()) {
      localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(DEFAULT_ACCOUNTS));
    }
  },

  getSession() {
    try {
      const raw = sessionStorage.getItem(AUTH_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  setSession(user) {
    sessionStorage.setItem(AUTH_KEY, JSON.stringify({
      ...user,
      loginAt: new Date().toISOString()
    }));
  },

  clearSession() {
    sessionStorage.removeItem(AUTH_KEY);
  },

  isLoggedIn() {
    return !!this.getSession();
  },

  getCurrentRole() {
    return this.getSession()?.role || null;
  },

  getCurrentUser() {
    return this.getSession() || null;
  },

  canAccess(route) {
    const role = this.getCurrentRole();
    if (!role || !ROLES[role]) return false;
    return ROLES[role].allowedRoutes.includes(route);
  },

  login(username, password) {
    const accounts = this.getAccounts() || DEFAULT_ACCOUNTS;
    const account = accounts.find(
      a => a.username.toLowerCase() === username.toLowerCase().trim() && a.password === password
    );
    if (!account) return { success: false, message: 'Username atau password salah.' };

    this.setSession({ username: account.username, name: account.name, role: account.role });
    return { success: true, role: account.role };
  },

  logout() {
    this.clearSession();
    window.location.hash = '';
    window.location.reload();
  }
};

/* ==================== NAVBAR SERVICE ==================== */
const AppNavbar = {
  breadcrumbLabels: {
    dashboard: { icon: 'bi-speedometer2', label: 'Dashboard' },
    perusahaan: { icon: 'bi-building', label: 'Profil Perusahaan' },
    proyek: { icon: 'bi-clipboard-data', label: 'Proyek' },
    metode: { icon: 'bi-diagram-3', label: 'Metode Kerja' },
    jsa: { icon: 'bi-journal-check', label: 'JSA' },
    manpower: { icon: 'bi-people', label: 'Man Power' },
    pembelian: { icon: 'bi-cart', label: 'Pembelian' },
    laporan: { icon: 'bi-file-earmark-pdf', label: 'Laporan' },
    akun: { icon: 'bi-people-fill', label: 'Manajemen Akun' }
  },

  toggleSidebar() {
    const sidebar = document.getElementById('appSidebar');
    const overlay = document.getElementById('sidebarOverlay');

    if (sidebar && overlay) {
      const isOpen = sidebar.classList.contains('open');

      if (isOpen) {
        this.closeSidebar();
      } else {
        sidebar.classList.add('open');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
      }
    }
  },

  closeSidebar() {
    const sidebar = document.getElementById('appSidebar');
    const overlay = document.getElementById('sidebarOverlay');

    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';
  },

  closeSidebarOnMobile() {
    if (window.innerWidth < 769) {
      this.closeSidebar();
    }
  },

  updateBreadcrumb(route) {
    const breadcrumb = document.getElementById('navbarBreadcrumb');
    if (!breadcrumb) return;

    const info = this.breadcrumbLabels[route];
    if (info) {
      breadcrumb.innerHTML = `<i class="bi ${info.icon}"></i><span>${info.label}</span>`;
    } else {
      breadcrumb.innerHTML = `<i class="bi bi-speedometer2"></i><span>Dashboard</span>`;
    }
  },

  updateUserInfo(session) {
    const userAvatar = document.getElementById('navbarUserAvatar');
    const userInfo = document.getElementById('navbarUserInfo');
    const dropdownHeader = document.getElementById('dropdownUserHeader');

    if (!session) return;

    const roleConfig = ROLES[session.role];

    if (userAvatar) {
      userAvatar.innerHTML = `<i class="bi ${roleConfig?.icon || 'bi-person-circle'}" style="font-size:0.9rem;"></i>`;
      userAvatar.style.background = roleConfig?.color || 'var(--gradient-primary)';
    }

    if (userInfo) {
      userInfo.innerHTML = `
        <span class="app-navbar__user-name">${session.name || 'User'}</span>
        <span class="app-navbar__user-role">${roleConfig?.label || 'Role'}</span>
      `;
      userInfo.style.display = window.innerWidth >= 769 ? 'flex' : 'none';
    }

    if (dropdownHeader) {
      dropdownHeader.innerHTML = `<i class="bi ${roleConfig?.icon || 'bi-person-circle'} me-2"></i>${session.name || 'User'} — <span class="badge ${roleConfig?.badge || 'bg-secondary'} ms-1" style="font-size:0.6rem;">${roleConfig?.label || 'Role'}</span>`;
    }

    this.handleResponsiveUserInfo();
  },

  handleResponsiveUserInfo() {
    const userInfo = document.getElementById('navbarUserInfo');
    if (userInfo) {
      userInfo.style.display = window.innerWidth >= 769 ? 'flex' : 'none';
    }
  },

  updateBrandLogo() {
    const company = typeof DataAccess !== 'undefined' ? DataAccess.getCompany() : null;
    const logoUrl = company?.logo;

    const navbarLogo = document.getElementById('navbarBrandLogo');
    if (navbarLogo && logoUrl) {
      navbarLogo.innerHTML = `<img src="${logoUrl}" alt="Logo" style="width:100%;height:100%;object-fit:contain;border-radius:6px;">`;
      navbarLogo.style.background = 'transparent';
    }

    const sidebarLogo = document.getElementById('sidebarBrandLogo');
    if (sidebarLogo && logoUrl) {
      sidebarLogo.innerHTML = `<img src="${logoUrl}" alt="Logo" style="width:100%;height:100%;object-fit:contain;border-radius:10px;">`;
      sidebarLogo.style.background = 'transparent';
      sidebarLogo.style.boxShadow = 'none';
    }
  },

  init() {
    window.addEventListener('resize', () => {
      this.handleResponsiveUserInfo();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeSidebar();
      }
    });

    this.updateBrandLogo();
  }
};

/* ==================== LOGIN PAGE ==================== */
const LoginPage = {
  show() {
    const navbar = document.getElementById('appNavbar');
    const sidebar = document.getElementById('appSidebar');
    const mainContent = document.getElementById('appMainContent');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (navbar) navbar.style.display = 'none';
    if (sidebar) sidebar.style.display = 'none';
    if (mainContent) mainContent.style.display = 'none';
    if (overlay) overlay.classList.remove('active');

    let loginContainer = document.getElementById('loginContainer');
    if (!loginContainer) {
      loginContainer = document.createElement('div');
      loginContainer.id = 'loginContainer';
      document.body.appendChild(loginContainer);
    }

    loginContainer.style.display = 'flex';
    loginContainer.innerHTML = this.renderHTML();

    setTimeout(() => {
      const usernameInput = document.getElementById('loginUsername');
      if (usernameInput) usernameInput.focus();

      const inputs = loginContainer.querySelectorAll('input');
      inputs.forEach(input => {
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') LoginPage.submit();
        });
      });

      if (typeof UIService !== 'undefined' && UIService.updateAllCompanyLogos) {
        const company = typeof DataAccess !== 'undefined' ? DataAccess.getCompany() : null;
        const logoUrl = company?.logo;
        const loginLogoDisplay = document.getElementById('loginLogoDisplay');
        if (loginLogoDisplay && logoUrl) {
          loginLogoDisplay.innerHTML = `<img src="${logoUrl}" alt="Logo" style="width:100%;height:100%;object-fit:contain;border-radius:14px;">`;
        }
      }
    }, 50);
  },

  renderHTML() {
    return `
    <style>
      /* Login-specific styles scoped to container */
      #loginContainer {
        position: fixed;
        inset: 0;
        z-index: 9999;
        background: linear-gradient(135deg, #f3f3f3 0%, #f9fafb 50%, #f3f3f3 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
        font-family: 'Plus Jakarta Sans', sans-serif;
      }
      .login-card {
        background: #fff;
        border-radius: 20px;
        box-shadow: 0 8px 40px rgba(0,0,0,.12);
        width: 100%;
        max-width: 420px;
        overflow: hidden;
        animation: loginSlideUp 0.4s ease-out;
      }
      @keyframes loginSlideUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .login-card__header {
        background: linear-gradient(180deg, #303841 0%, #2a3139 100%);
        padding: 32px 28px 24px;
        text-align: center;
      }
      .login-card__logo {
        width: 60px;
        height: 60px;
        border-radius: 14px;
        background: rgba(255,255,255,.1);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 1.6rem;
        color: #fff;
        margin-bottom: 12px;
        overflow: hidden;
      }
      .login-card__logo img {
        width: 100%;
        height: 100%;
        object-fit: contain;
        border-radius: 14px;
      }
      .login-card__title {
        color: #fff;
        font-size: 1.15rem;
        font-weight: 700;
        margin: 0 0 4px;
      }
      .login-card__subtitle {
        color: rgba(255,255,255,.5);
        font-size: .78rem;
        margin: 0;
      }
      .login-card__body {
        padding: 28px;
      }
      .login-role-hint {
        display: flex;
        gap: 8px;
        margin-bottom: 20px;
        flex-wrap: wrap;
      }
      .login-role-badge {
        font-size: .68rem;
        padding: 4px 10px;
        border-radius: 20px;
        cursor: pointer;
        border: 1.5px solid transparent;
        transition: all .15s;
        font-weight: 600;
        user-select: none;
        background: #fff;
      }
      .login-role-badge:hover { opacity: .8; transform: translateY(-1px); }
      .login-role-badge:active { transform: scale(0.95); }
      .login-role-badge--admin { background: #EFF6FF; color: #2185D5; border-color: #BFDBFE; }
      .login-role-badge--hse   { background: #ECFDF5; color: #059669; border-color: #A7F3D0; }
      .login-role-badge--pembeli { background: #FFFBEB; color: #D97706; border-color: #FDE68A; }
      .login-input-group {
        margin-bottom: 14px;
      }
      .login-input-group label {
        display: block;
        font-size: .78rem;
        font-weight: 600;
        color: #4A5568;
        margin-bottom: 6px;
      }
      .login-input-group input {
        width: 100%;
        border: 1.5px solid rgba(48,56,65,.12);
        border-radius: 10px;
        padding: 10px 14px;
        font-size: .88rem;
        outline: none;
        background: #f3f3f3;
        color: #1A2024;
        box-sizing: border-box;
        transition: border-color .15s, box-shadow .15s;
        font-family: inherit;
      }
      .login-input-group input:focus {
        border-color: #2185D5;
        box-shadow: 0 0 0 3px rgba(33,133,213,.15);
        background: #fff;
      }
      .login-btn {
        width: 100%;
        padding: 11px;
        border-radius: 10px;
        border: none;
        background: linear-gradient(135deg, #2185D5, #4A9FE5);
        color: #fff;
        font-size: .9rem;
        font-weight: 700;
        cursor: pointer;
        margin-top: 6px;
        transition: opacity .15s, transform .1s;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        font-family: inherit;
      }
      .login-btn:hover { opacity: .9; transform: translateY(-1px); }
      .login-btn:active { transform: translateY(0); }
      .login-error {
        background: #FEF2F2;
        color: #B91C1C;
        border: 1px solid #FECACA;
        border-radius: 8px;
        padding: 9px 13px;
        font-size: .78rem;
        margin-top: 12px;
        display: none;
        align-items: center;
        gap: 7px;
      }
      .login-footer {
        text-align: center;
        font-size: .68rem;
        color: #8A95A0;
        margin-top: 20px;
        padding-top: 16px;
        border-top: 1px solid rgba(48,56,65,.08);
      }
    </style>
    <div class="login-card">
      <div class="login-card__header">
        <div class="login-card__logo" id="loginLogoDisplay">
          <i class="bi bi-building"></i>
        </div>
        <h1 class="login-card__title">Kencana Project</h1>
        <p class="login-card__subtitle">Masuk untuk melanjutkan</p>
      </div>
      <div class="login-card__body">
        <div class="login-role-hint">
          <span class="login-role-badge login-role-badge--admin" onclick="LoginPage.fillDemo('admin','admin123')" title="Klik untuk isi demo">
            <i class="bi bi-shield-lock-fill"></i> Admin
          </span>
          <span class="login-role-badge login-role-badge--hse" onclick="LoginPage.fillDemo('hse','hse123')" title="Klik untuk isi demo">
            <i class="bi bi-journal-check"></i> HSE
          </span>
          <span class="login-role-badge login-role-badge--pembeli" onclick="LoginPage.fillDemo('pembeli','pembeli123')" title="Klik untuk isi demo">
            <i class="bi bi-cart-fill"></i> Pembeli
          </span>
        </div>
        <div class="login-input-group">
          <label for="loginUsername"><i class="bi bi-person"></i> Username</label>
          <input type="text" id="loginUsername" placeholder="Masukkan username" autocomplete="username">
        </div>
        <div class="login-input-group">
          <label for="loginPassword"><i class="bi bi-lock"></i> Password</label>
          <input type="password" id="loginPassword" placeholder="Masukkan password" autocomplete="current-password">
        </div>
        <button class="login-btn" onclick="LoginPage.submit()">
          <i class="bi bi-box-arrow-in-right"></i> Masuk
        </button>
        <div class="login-error" id="loginError">
          <i class="bi bi-exclamation-circle-fill"></i>
          <span id="loginErrorMsg">Username atau password salah.</span>
        </div>
        <div class="login-footer">
          Klik badge peran di atas untuk isi demo otomatis<br>
          Kencana Project v4.0
        </div>
      </div>
    </div>`;
  },

  fillDemo(username, password) {
    const usernameInput = document.getElementById('loginUsername');
    const passwordInput = document.getElementById('loginPassword');
    if (usernameInput) usernameInput.value = username;
    if (passwordInput) passwordInput.value = password;
    const errorBox = document.getElementById('loginError');
    if (errorBox) errorBox.style.display = 'none';
    if (passwordInput) passwordInput.focus();
  },

  submit() {
    const username = document.getElementById('loginUsername')?.value || '';
    const password = document.getElementById('loginPassword')?.value || '';

    const errorBox = document.getElementById('loginError');
    const errorMsg = document.getElementById('loginErrorMsg');

    if (!username || !password) {
      if (errorMsg) errorMsg.textContent = 'Username dan password wajib diisi.';
      if (errorBox) errorBox.style.display = 'flex';
      return;
    }

    const result = AuthService.login(username, password);

    if (!result.success) {
      if (errorMsg) errorMsg.textContent = result.message;
      if (errorBox) errorBox.style.display = 'flex';
      const passwordInput = document.getElementById('loginPassword');
      if (passwordInput) { passwordInput.value = ''; passwordInput.focus(); }
      return;
    }

    if (errorBox) errorBox.style.display = 'none';
    this.hide();
    AppAuth.onLoginSuccess(result.role);
  },

  hide() {
    const loginContainer = document.getElementById('loginContainer');
    if (loginContainer) loginContainer.style.display = 'none';

    const navbar = document.getElementById('appNavbar');
    const sidebar = document.getElementById('appSidebar');
    const mainContent = document.getElementById('appMainContent');
    
    if (navbar) navbar.style.display = '';
    if (sidebar) sidebar.style.display = '';
    if (mainContent) mainContent.style.display = '';
  }
};

/* ==================== APP AUTH INTEGRATION ==================== */
const AppAuth = {
  _navigatePatched: false,

  onLoginSuccess(role) {
    const session = AuthService.getCurrentUser();
    if (typeof AppNavbar !== 'undefined') {
      AppNavbar.updateUserInfo(session);
      AppNavbar.init();
    }

    this.applyRoleToUI(role);

    if (typeof UIService !== 'undefined' && UIService.updateAllCompanyLogos) {
      UIService.updateAllCompanyLogos();
    }

    if (typeof AppNavbar !== 'undefined') {
      AppNavbar.updateBrandLogo();
    }

    const roleConfig = ROLES[role];
    const defaultRoute = roleConfig?.defaultRoute || 'dashboard';
    window.location.hash = '#' + defaultRoute;
    
    if (typeof AppNavbar !== 'undefined') {
      AppNavbar.updateBreadcrumb(defaultRoute);
    }

    if (typeof UIService !== 'undefined' && UIService.navigate) {
      UIService.navigate(defaultRoute);
    }
  },

  applyRoleToUI(role) {
    const roleConfig = ROLES[role];
    if (!roleConfig) return;

    const session = AuthService.getCurrentUser();

    const navSectionAdmin = document.getElementById('navSectionAdmin');
    const navItemAkun = document.getElementById('navItemAkun');
    if (navSectionAdmin) navSectionAdmin.style.display = role === 'admin' ? '' : 'none';
    if (navItemAkun) navItemAkun.style.display = role === 'admin' ? '' : 'none';

    document.querySelectorAll('.nav-item[data-route]').forEach(navItem => {
      const route = navItem.dataset.route;
      navItem.style.display = roleConfig.allowedRoutes.includes(route) ? '' : 'none';
    });

    document.querySelectorAll('.nav-section-label').forEach(label => {
      let nextEl = label.nextElementSibling;
      let hasVisible = false;
      while (nextEl && !nextEl.classList.contains('nav-section-label')) {
        if (nextEl.classList.contains('nav-item') && nextEl.style.display !== 'none') {
          hasVisible = true;
          break;
        }
        nextEl = nextEl.nextElementSibling;
      }
      label.style.display = hasVisible ? '' : 'none';
    });

    this.renderUserInfo(session, roleConfig);

    if (typeof AppNavbar !== 'undefined') {
      AppNavbar.updateUserInfo(session);
    }

    this.patchNavigate(role);
  },

  renderUserInfo(session, roleConfig) {
    const footer = document.querySelector('.app-sidebar__footer');
    if (!footer) return;

    footer.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:8px;">
        <div style="display:flex;align-items:center;gap:8px;">
          <div style="width:30px;height:30px;border-radius:8px;background:rgba(255,255,255,.1);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <i class="bi ${roleConfig.icon}" style="color:${roleConfig.color};"></i>
          </div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:.72rem;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${session?.name || 'User'}</div>
            <span class="badge ${roleConfig.badge}" style="font-size:.6rem;">${roleConfig.label}</span>
          </div>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;border-top:1px solid rgba(255,255,255,.1);padding-top:8px;">
          <span style="font-size:.64rem;color:rgba(255,255,255,.45);"><i class="bi bi-database"></i> v4.0</span>
          <button onclick="AppAuth.logout()" style="background:rgba(239,68,68,.15);border:1px solid rgba(239,68,68,.3);color:#FCA5A5;border-radius:6px;padding:3px 9px;font-size:.65rem;cursor:pointer;display:flex;align-items:center;gap:4px;font-family:inherit;">
            <i class="bi bi-box-arrow-right"></i> Keluar
          </button>
        </div>
      </div>`;
  },

  patchNavigate(role) {
    if (this._navigatePatched) return;
    
    const roleConfig = ROLES[role];
    if (!roleConfig) return;
    if (typeof UIService === 'undefined') return;

    const _originalNavigate = UIService.navigate.bind(UIService);
    UIService.navigate = function(route) {
      if (!roleConfig.allowedRoutes.includes(route)) {
        UIService.showToast(`Akses ditolak. Role "${roleConfig.label}" tidak dapat mengakses halaman ini.`, 'danger');
        return;
      }
      
      if (typeof AppNavbar !== 'undefined') {
        AppNavbar.updateBreadcrumb(route);
      }
      
      _originalNavigate(route);
    };
    
    this._navigatePatched = true;
  },

  logout() {
    if (!confirm('Yakin ingin keluar?')) return;
    AuthService.logout();
  },

  renderAccountManager() {
    const accounts = AuthService.getAccounts() || DEFAULT_ACCOUNTS;
    const roleColors = { admin: 'primary', hse: 'success', pembeli: 'warning' };

    let html = `<div class="page-header no-print">
      <h2 class="page-title">
        <span class="page-title__icon"><i class="bi bi-people-fill"></i></span>Manajemen Akun
      </h2>
      <button class="btn btn--primary btn--lg" onclick="AppAuth.showAddAccountForm()">
        <i class="bi bi-person-plus"></i> Tambah Akun
      </button>
    </div>

    <div id="addAccountFormCard" class="card" style="display:none;">
      <div class="card-header"><i class="bi bi-person-plus"></i> Tambah / Edit Akun</div>
      <div class="card-body">
        <div class="row g-3">
          <input type="hidden" id="editAccountIndex" value="">
          <div class="col-sm-6">
            <label class="form-label">Username <span class="text-danger">*</span></label>
            <input type="text" class="form-control" id="inputAccountUsername" placeholder="username" required>
          </div>
          <div class="col-sm-6">
            <label class="form-label">Password <span class="text-danger">*</span></label>
            <input type="password" class="form-control" id="inputAccountPassword" placeholder="password" required>
          </div>
          <div class="col-sm-6">
            <label class="form-label">Nama <span class="text-danger">*</span></label>
            <input type="text" class="form-control" id="inputAccountName" placeholder="Nama lengkap" required>
          </div>
          <div class="col-sm-6">
            <label class="form-label">Role</label>
            <select class="form-select" id="inputAccountRole">
              <option value="admin">Admin — Akses Penuh</option>
              <option value="hse">HSE — Metode, JSA, Man Power</option>
              <option value="pembeli">Pembeli — Pembelian</option>
            </select>
          </div>
        </div>
        <div class="d-flex gap-2 mt-3">
          <button class="btn btn--primary" onclick="AppAuth.saveAccount()"><i class="bi bi-save"></i> Simpan</button>
          <button class="btn btn--outline-secondary" onclick="document.getElementById('addAccountFormCard').style.display='none'">Batal</button>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table--hover mb-0">
            <thead>
              <tr>
                <th>No</th>
                <th>Username</th>
                <th>Nama</th>
                <th>Role</th>
                <th>Akses</th>
                <th class="text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>`;

    accounts.forEach((acc, i) => {
      const roleConfig = ROLES[acc.role];
      const accessList = (roleConfig?.allowedRoutes || []).join(', ');
      html += `<tr>
        <td class="text-center">${i + 1}</td>
        <td><strong>${acc.username}</strong></td>
        <td>${acc.name || '-'}</td>
        <td><span class="badge bg-${roleColors[acc.role] || 'secondary'}">${roleConfig?.label || acc.role}</span></td>
        <td style="font-size:.72rem;color:var(--color-text-3);">${accessList}</td>
        <td class="text-center">
          <button class="btn btn--xs btn--outline-warning me-1" onclick="AppAuth.editAccount(${i})">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn--xs btn--outline-danger" onclick="AppAuth.deleteAccount(${i})">
            <i class="bi bi-trash"></i>
          </button>
        </td>
      </tr>`;
    });

    html += `</tbody></table></div></div></div>`;
    return html;
  },

  showAddAccountForm() {
    document.getElementById('editAccountIndex').value = '';
    document.getElementById('inputAccountUsername').value = '';
    document.getElementById('inputAccountPassword').value = '';
    document.getElementById('inputAccountName').value = '';
    document.getElementById('inputAccountRole').value = 'admin';
    const formCard = document.getElementById('addAccountFormCard');
    formCard.style.display = 'block';
    setTimeout(() => formCard.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  },

  editAccount(index) {
    const accounts = AuthService.getAccounts() || DEFAULT_ACCOUNTS;
    const acc = accounts[index];
    if (!acc) return;

    document.getElementById('editAccountIndex').value = index;
    document.getElementById('inputAccountUsername').value = acc.username;
    document.getElementById('inputAccountPassword').value = acc.password;
    document.getElementById('inputAccountName').value = acc.name || '';
    document.getElementById('inputAccountRole').value = acc.role;
    const formCard = document.getElementById('addAccountFormCard');
    formCard.style.display = 'block';
    setTimeout(() => formCard.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  },

  saveAccount() {
    const username = document.getElementById('inputAccountUsername').value.trim();
    const password = document.getElementById('inputAccountPassword').value.trim();
    const name = document.getElementById('inputAccountName').value.trim();
    const role = document.getElementById('inputAccountRole').value;
    const editIndex = document.getElementById('editAccountIndex').value;

    if (!username || !password || !name) {
      if (typeof UIService !== 'undefined') {
        UIService.showToast('Username, password, dan nama wajib diisi!', 'warning');
      } else {
        alert('Username, password, dan nama wajib diisi!');
      }
      return;
    }

    if (username.length < 3) {
      UIService.showToast('Username minimal 3 karakter!', 'warning');
      return;
    }

    const accounts = AuthService.getAccounts() || [...DEFAULT_ACCOUNTS];

    const duplicateIndex = accounts.findIndex(a => a.username.toLowerCase() === username.toLowerCase());
    if (duplicateIndex !== -1 && String(duplicateIndex) !== String(editIndex) && editIndex !== '') {
      UIService.showToast('Username sudah digunakan!', 'warning');
      return;
    }

    if (editIndex !== '' && editIndex !== null) {
      accounts[parseInt(editIndex)] = { username, password, name, role };
    } else {
      accounts.push({ username, password, name, role });
    }

    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
    UIService.showToast('Akun berhasil disimpan!', 'success');
    document.getElementById('addAccountFormCard').style.display = 'none';

    document.getElementById('appMainContent').innerHTML = AppAuth.renderAccountManager();
  },

  deleteAccount(index) {
    const accounts = AuthService.getAccounts() || [...DEFAULT_ACCOUNTS];
    if (accounts.length <= 1) {
      UIService.showToast('Minimal harus ada 1 akun!', 'danger');
      return;
    }

    const session = AuthService.getCurrentUser();
    if (session && accounts[index]?.username === session.username) {
      UIService.showToast('Tidak dapat menghapus akun yang sedang aktif!', 'danger');
      return;
    }

    if (!confirm(`Hapus akun "${accounts[index].username}"?`)) return;
    accounts.splice(index, 1);
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
    UIService.showToast('Akun dihapus.', 'warning');
    document.getElementById('appMainContent').innerHTML = AppAuth.renderAccountManager();
  }
};

/* ==================== INITIALIZATION ==================== */
document.addEventListener('DOMContentLoaded', function() {
  if (typeof AppNavbar !== 'undefined') {
    AppNavbar.init();
  }

  AuthService.initAccounts();

  if (!AuthService.isLoggedIn()) {
    setTimeout(() => {
      if (typeof LoginPage !== 'undefined') {
        LoginPage.show();
      }
    }, 100);
  }
});