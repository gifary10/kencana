// mp.js — Manpower: master personel + assignment per proyek (Optimized)

const ManpowerPage = {
  _personnel: [],
  _projects:  [],
  _assignments: {}, // { project_id: Set(personnel_id) }

  // ======================================================
  // HELPERS
  // ======================================================
  _calcAge(birthDate) {
    if (!birthDate) return '-';
    const dob  = new Date(birthDate);
    if (isNaN(dob)) return '-';
    const now  = new Date();
    let age    = now.getFullYear() - dob.getFullYear();
    const m    = now.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
    return age + ' tahun';
  },

  _fmtDate(d) {
    if (!d) return '-';
    try {
      return new Date(d).toLocaleDateString('id-ID', { day:'2-digit', month:'long', year:'numeric' });
    } catch { return d; }
  },

  // ======================================================
  // RENDER
  // ======================================================
  render() {
    return `
    <div id="manpowerView">
      <div class="tab-nav no-print" id="manpowerTabNav">
        <button class="tab-nav__btn tab-nav__btn--active" onclick="ManpowerPage.switchTab('assign')">
          <i class="bi bi-diagram-3"></i> Penugasan per Proyek
        </button>
        <button class="tab-nav__btn" onclick="ManpowerPage.switchTab('master')">
          <i class="bi bi-person-lines-fill"></i> Master Personel
        </button>
      </div>

      <!-- ====== TAB PENUGASAN ====== -->
      <div id="tabAssign">
        <div class="card no-print">
          <div class="card-body p-3">
            <label class="form-label mb-1 fw-semibold">Pilih Proyek</label>
            <select class="form-select form-select-sm" id="selectManpowerProject"
              onchange="ManpowerPage.onProjectChange()" style="max-width:420px;">
              <option value="">-- Pilih Proyek --</option>
            </select>
          </div>
        </div>
        <div id="manpowerAssignContent">
          <div class="empty-state">
            <div class="empty-state__icon"><i class="bi bi-people"></i></div>
            <p>Pilih proyek untuk mengatur personel yang ditugaskan</p>
          </div>
        </div>
      </div>

      <!-- ====== TAB MASTER PERSONEL ====== -->
      <div id="tabMaster" style="display:none;">
        <!-- Form tambah/edit -->
        <div class="card" id="personnelFormCard">
          <div class="card-header">
            <i class="bi bi-person-plus"></i>
            <span id="personnelFormTitle">Tambah Personel Baru</span>
          </div>
          <div class="card-body">
            <input type="hidden" id="editPersonnelId">
            <div class="row g-3">
              <div class="col-sm-6 col-md-4">
                <label class="form-label">Nama Lengkap <span class="text-danger">*</span></label>
                <input type="text" class="form-control form-control-sm" id="inputPersonnelName"
                  placeholder="Nama lengkap">
              </div>
              <div class="col-sm-6 col-md-4">
                <label class="form-label">Jabatan / Posisi <span class="text-danger">*</span></label>
                <input type="text" class="form-control form-control-sm" id="inputPersonnelPosition"
                  placeholder="Project Manager, Welder, dll.">
              </div>
              <div class="col-sm-6 col-md-4">
                <label class="form-label">NIK <span class="text-danger">*</span></label>
                <input type="text" class="form-control form-control-sm" id="inputPersonnelNik"
                  placeholder="16 digit NIK KTP" maxlength="16">
              </div>
              <div class="col-sm-6 col-md-4">
                <label class="form-label">Tanggal Lahir <span class="text-danger">*</span></label>
                <input type="date" class="form-control form-control-sm" id="inputPersonnelBirthDate">
              </div>
              <div class="col-sm-6 col-md-2">
                <label class="form-label">Umur</label>
                <input type="text" class="form-control form-control-sm" id="displayPersonnelAge"
                  readonly placeholder="—" style="background:#f8fafc;cursor:default;">
              </div>
              <div class="col-sm-12 col-md-6">
                <label class="form-label">Alamat</label>
                <input type="text" class="form-control form-control-sm" id="inputPersonnelAddress"
                  placeholder="Alamat lengkap">
              </div>
            </div>
            <div class="d-flex gap-2 mt-3">
              <button class="btn btn--primary btn--sm" onclick="ManpowerPage.savePersonnel()">
                <i class="bi bi-save"></i> Simpan
              </button>
              <button class="btn btn--outline-secondary btn--sm" onclick="ManpowerPage.resetPersonnelForm()">
                <i class="bi bi-x-lg"></i> Batal
              </button>
            </div>
          </div>
        </div>

        <!-- Tabel master -->
        <div class="card">
          <div class="card-header">
            <i class="bi bi-person-lines-fill"></i> Daftar Semua Personel
            <span id="masterPersonnelCount" class="badge bg-secondary ms-2">0</span>
          </div>
          <div class="card-body p-0">
            <div class="table-responsive">
              <table class="table table--hover mb-0">
                <thead>
                  <tr>
                    <th class="col-width-40">No</th>
                    <th>Nama</th>
                    <th>NIK</th>
                    <th>Tgl Lahir</th>
                    <th>Umur</th>
                    <th>Jabatan</th>
                    <th>Ditugaskan di</th>
                    <th class="text-center col-width-80">Aksi</th>
                  </tr>
                </thead>
                <tbody id="masterPersonnelBody">
                  <tr><td colspan="8" class="text-center py-4 text-muted">Memuat data...</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div><!-- /tabMaster -->
    </div>`;
  },

  // ======================================================
  // INIT
  // ======================================================
  async init() {
    const [personnel, projects, manpower] = await Promise.all([
      DataAccess.getAllPersonnel(),
      DataAccess.getAllProjects(),
      DataAccess.getAllManpower()
    ]);
    this._personnel  = personnel;
    this._projects   = projects;
    this._assignments = {};
    manpower.forEach(m => {
      if (!this._assignments[m.project_id]) this._assignments[m.project_id] = new Set();
      this._assignments[m.project_id].add(m.personnel_id);
    });

    const sel = document.getElementById('selectManpowerProject');
    if (sel) {
      sel.innerHTML = '<option value="">-- Pilih Proyek --</option>';
      projects.forEach(p => {
        const o = document.createElement('option');
        o.value = p.id; o.textContent = p.name;
        sel.appendChild(o);
      });
    }

    // Auto-hitung umur saat tanggal lahir berubah
    const bdInput = document.getElementById('inputPersonnelBirthDate');
    if (bdInput) {
      bdInput.addEventListener('change', () => {
        document.getElementById('displayPersonnelAge').value =
          ManpowerPage._calcAge(bdInput.value);
      });
    }

    this._renderMasterTable();
  },

  // ======================================================
  // TAB SWITCH
  // ======================================================
  switchTab(tab) {
    document.getElementById('tabAssign').style.display = tab === 'assign' ? '' : 'none';
    document.getElementById('tabMaster').style.display  = tab === 'master' ? '' : 'none';
    document.querySelectorAll('#manpowerTabNav .tab-nav__btn').forEach((btn, i) => {
      btn.classList.toggle('tab-nav__btn--active', ['assign','master'][i] === tab);
    });
  },

  // ======================================================
  // TAB PENUGASAN
  // ======================================================
  onProjectChange() {
    const projectId = document.getElementById('selectManpowerProject')?.value;
    const content   = document.getElementById('manpowerAssignContent');
    if (!projectId) {
      content.innerHTML = '<div class="empty-state"><div class="empty-state__icon"><i class="bi bi-people"></i></div><p>Pilih proyek untuk mengatur personel yang ditugaskan</p></div>';
      return;
    }
    const project  = this._projects.find(p => p.id === projectId);
    const assigned = this._assignments[projectId] || new Set();

    if (this._personnel.length === 0) {
      content.innerHTML = '<div class="card"><div class="card-body text-center py-4 text-muted">'
        + '<i class="bi bi-person-x" style="font-size:2rem;"></i>'
        + '<p class="mt-2">Belum ada personel. Tambahkan dulu di tab <strong>Master Personel</strong>.</p>'
        + '<button class="btn btn--primary btn--sm mt-1" onclick="ManpowerPage.switchTab(\'master\')">'
        + '<i class="bi bi-person-plus"></i> Tambah Personel</button></div></div>';
      return;
    }

    const rows = this._personnel.map(p => {
      const chk  = assigned.has(p.id) ? 'checked' : '';
      const age  = this._calcAge(p.birth_date);
      return '<tr>'
        + '<td class="text-center"><input type="checkbox" class="form-check-input mp-assign-check"'
        + ' data-personnel-id="' + p.id + '" ' + chk + '></td>'
        + '<td><span class="fw-semibold">' + UtilityService.escapeHtml(p.name) + '</span>'
        + (p.nik ? '<br><small class="text-muted">NIK: ' + UtilityService.escapeHtml(p.nik) + '</small>' : '')
        + '</td>'
        + '<td>' + UtilityService.escapeHtml(p.position||'-') + '</td>'
        + '<td>' + (p.birth_date ? this._fmtDate(p.birth_date) : '-') + '</td>'
        + '<td>' + age + '</td>'
        + '</tr>';
    }).join('');

    content.innerHTML = '<div class="card">'
      + '<div class="card-header"><i class="bi bi-people"></i> Personel — <strong>'
      + UtilityService.escapeHtml(project?.name||'') + '</strong>'
      + '<span class="ms-2 text-muted" style="font-size:.78rem;" id="assignCountLabel">'
      + assigned.size + ' / ' + this._personnel.length + ' dipilih</span>'
      + '</div>'
      + '<div class="card-body p-0"><div class="table-responsive">'
      + '<table class="table table--hover mb-0"><thead><tr>'
      + '<th class="col-width-50 text-center"><input type="checkbox" class="form-check-input"'
      + ' id="checkAllPersonnel" title="Pilih Semua" onchange="ManpowerPage.toggleSelectAll(this)"></th>'
      + '<th>Nama / NIK</th><th>Jabatan</th><th>Tgl Lahir</th><th>Umur</th>'
      + '</tr></thead><tbody>' + rows + '</tbody></table>'
      + '</div></div>'
      + '<div class="card-footer d-flex justify-content-between align-items-center">'
      + '<span class="text-muted" style="font-size:.78rem;"><i class="bi bi-info-circle"></i>'
      + ' Centang personel yang bertugas di proyek ini</span>'
      + '<button class="btn btn--primary btn--sm" onclick="ManpowerPage.saveAssignment()">'
      + '<i class="bi bi-save"></i> Simpan Penugasan</button>'
      + '</div></div>';

    document.querySelectorAll('.mp-assign-check').forEach(cb => {
      cb.addEventListener('change', () => this._updateAssignCount());
    });
    this._syncSelectAll();
  },

  toggleSelectAll(masterCb) {
    document.querySelectorAll('.mp-assign-check').forEach(cb => { cb.checked = masterCb.checked; });
    this._updateAssignCount();
  },

  _updateAssignCount() {
    const total   = document.querySelectorAll('.mp-assign-check').length;
    const checked = document.querySelectorAll('.mp-assign-check:checked').length;
    const lbl = document.getElementById('assignCountLabel');
    if (lbl) lbl.textContent = checked + ' / ' + total + ' dipilih';
    this._syncSelectAll();
  },

  _syncSelectAll() {
    const all      = document.querySelectorAll('.mp-assign-check');
    const checked  = document.querySelectorAll('.mp-assign-check:checked');
    const masterCb = document.getElementById('checkAllPersonnel');
    if (!masterCb) return;
    masterCb.checked       = all.length > 0 && checked.length === all.length;
    masterCb.indeterminate = checked.length > 0 && checked.length < all.length;
  },

  async saveAssignment() {
    const projectId = document.getElementById('selectManpowerProject')?.value;
    if (!projectId) { UIService.showToast('Pilih proyek terlebih dahulu!', 'warning'); return; }
    
    const personnel_ids = [...document.querySelectorAll('.mp-assign-check:checked')]
      .map(cb => cb.dataset.personnelId);
    
    // OPTIMASI: Gunakan fungsi yang sudah menggunakan batch upsert
    await DataAccess.saveManpower({ project_id: projectId, personnel_ids });
    
    this._assignments[projectId] = new Set(personnel_ids);
    this._updateAssignCount();
    UIService.showToast('Penugasan disimpan — ' + personnel_ids.length + ' personel.', 'success');
  },

  // ======================================================
  // TAB MASTER PERSONEL
  // ======================================================
  _renderMasterTable() {
    const tbody   = document.getElementById('masterPersonnelBody');
    const countEl = document.getElementById('masterPersonnelCount');
    if (!tbody) return;
    if (countEl) countEl.textContent = this._personnel.length;

    if (this._personnel.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-muted">'
        + 'Belum ada personel. Isi form di atas untuk menambahkan.</td></tr>';
      return;
    }

    const assignCount = {};
    Object.values(this._assignments).forEach(set => {
      set.forEach(pid => { assignCount[pid] = (assignCount[pid]||0) + 1; });
    });

    tbody.innerHTML = this._personnel.map((p, i) => {
      const projCount  = assignCount[p.id] || 0;
      const projBadge  = projCount > 0
        ? '<span class="badge bg-success">' + projCount + ' proyek</span>'
        : '<span class="text-muted" style="font-size:.75rem;">—</span>';
      const safeName = UtilityService.escapeHtml(p.name).replace(/'/g, "\\'");
      return '<tr>'
        + '<td class="text-center text-muted" style="font-size:.78rem;">' + (i+1) + '</td>'
        + '<td><strong>' + UtilityService.escapeHtml(p.name) + '</strong>'
        + (p.nik ? '<br><small class="text-muted">' + UtilityService.escapeHtml(p.nik) + '</small>' : '')
        + '</td>'
        + '<td class="text-muted" style="font-size:.78rem;">' + (p.nik ? UtilityService.escapeHtml(p.nik) : '—') + '</td>'
        + '<td>' + (p.birth_date ? this._fmtDate(p.birth_date) : '—') + '</td>'
        + '<td><span class="badge bg-info text-dark">' + this._calcAge(p.birth_date) + '</span></td>'
        + '<td>' + UtilityService.escapeHtml(p.position||'-') + '</td>'
        + '<td>' + projBadge + '</td>'
        + '<td class="text-center">'
        + '<button class="btn btn--xs btn--outline-warning me-1" onclick="ManpowerPage.editPersonnel(\'' + p.id + '\')"><i class="bi bi-pencil"></i></button>'
        + '<button class="btn btn--xs btn--outline-danger" onclick="ManpowerPage.deletePersonnel(\'' + p.id + '\',\'' + safeName + '\')"><i class="bi bi-trash"></i></button>'
        + '</td></tr>';
    }).join('');
  },

  resetPersonnelForm() {
    document.getElementById('editPersonnelId').value         = '';
    document.getElementById('inputPersonnelName').value      = '';
    document.getElementById('inputPersonnelNik').value       = '';
    document.getElementById('inputPersonnelBirthDate').value = '';
    document.getElementById('displayPersonnelAge').value     = '';
    document.getElementById('inputPersonnelAddress').value   = '';
    document.getElementById('inputPersonnelPosition').value  = '';
    document.getElementById('personnelFormTitle').textContent = 'Tambah Personel Baru';
  },

  editPersonnel(id) {
    const p = this._personnel.find(x => x.id === id);
    if (!p) return;
    document.getElementById('editPersonnelId').value         = p.id;
    document.getElementById('inputPersonnelName').value      = p.name     || '';
    document.getElementById('inputPersonnelNik').value       = p.nik      || '';
    document.getElementById('inputPersonnelBirthDate').value = p.birth_date || '';
    document.getElementById('displayPersonnelAge').value     = this._calcAge(p.birth_date);
    document.getElementById('inputPersonnelAddress').value   = p.address  || '';
    document.getElementById('inputPersonnelPosition').value  = p.position || '';
    document.getElementById('personnelFormTitle').textContent = 'Edit Personel';
    document.getElementById('personnelFormCard')
      .scrollIntoView({ behavior: 'smooth', block: 'start' });
  },

  async savePersonnel() {
    const id         = document.getElementById('editPersonnelId').value.trim();
    const name       = document.getElementById('inputPersonnelName').value.trim();
    const nik        = document.getElementById('inputPersonnelNik').value.trim();
    const birth_date = document.getElementById('inputPersonnelBirthDate').value;
    const address    = document.getElementById('inputPersonnelAddress').value.trim();
    const position   = document.getElementById('inputPersonnelPosition').value.trim();

    if (!name)     { UIService.showToast('Nama wajib diisi!', 'warning'); return; }
    if (!nik)      { UIService.showToast('NIK wajib diisi!', 'warning'); return; }
    if (nik.length !== 16 || !/^\d+$/.test(nik)) {
      UIService.showToast('NIK harus 16 digit angka!', 'warning'); return;
    }
    if (!birth_date) { UIService.showToast('Tanggal lahir wajib diisi!', 'warning'); return; }
    if (!position)   { UIService.showToast('Jabatan wajib diisi!', 'warning'); return; }

    // Cek duplikat NIK
    const dupNik = this._personnel.find(p => p.nik === nik && p.id !== id);
    if (dupNik) { UIService.showToast('NIK sudah terdaftar atas nama ' + dupNik.name + '!', 'danger'); return; }

    const data = {
      id: id || ('per_' + Date.now() + '_' + Math.random().toString(36).substr(2,5)),
      name, nik, birth_date, address, position
    };

    await DataAccess.savePersonnel(data);

    const idx = this._personnel.findIndex(p => p.id === data.id);
    if (idx >= 0) this._personnel[idx] = data;
    else          this._personnel.push(data);

    this._renderMasterTable();
    this.resetPersonnelForm();
    UIService.showToast('Personel "' + name + '" berhasil disimpan.', 'success');
  },

  deletePersonnel(id, name) {
    UtilityService.showConfirmDialog(
      'Hapus personel "' + name + '"? Personel ini juga akan dihapus dari semua penugasan proyek.',
      async () => {
        await DataAccess.deletePersonnel(id);
        this._personnel = this._personnel.filter(p => p.id !== id);
        Object.values(this._assignments).forEach(set => set.delete(id));
        this._renderMasterTable();
        UIService.showToast('Personel "' + name + '" dihapus.', 'warning');
      }
    );
  }
};