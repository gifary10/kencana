// proyek.js
const ProjectPage = {
  render() {
    return `
    <div id="projectFormCard" class="card" style="display:none;">
      <div class="card-header" id="formCardTitle"><i class="bi bi-plus-circle"></i> Tambah Proyek Baru</div>
      <div class="card-body">
        <form id="projectForm" onsubmit="return false;">
          <input type="hidden" id="inputProjectId">
          <div class="row g-3">
            <div class="col-12">
              <label class="form-label">Nama Proyek <span class="text-danger">*</span></label>
              <input type="text" class="form-control" id="inputProjectName" required placeholder="Pembangunan Gedung A">
            </div>
            <div class="col-sm-6"><label class="form-label">Client</label><input type="text" class="form-control" id="inputProjectClient"></div>
            <div class="col-sm-6"><label class="form-label">Lokasi</label><input type="text" class="form-control" id="inputProjectLocation"></div>
            <div class="col-sm-6"><label class="form-label">PIC</label><input type="text" class="form-control" id="inputProjectPic"></div>
            <div class="col-sm-6"><label class="form-label">Nilai Kontrak</label><input type="number" class="form-control" id="inputProjectContractValue"></div>
            <div class="col-sm-3"><label class="form-label">Tgl Mulai</label><input type="date" class="form-control" id="inputProjectStartDate"></div>
            <div class="col-sm-3"><label class="form-label">Tgl Selesai</label><input type="date" class="form-control" id="inputProjectEndDate"></div>
          </div>
          <div class="d-flex gap-2 mt-3">
            <button type="button" class="btn btn--primary" onclick="ProjectPage.saveProject()"><i class="bi bi-save"></i> Simpan</button>
            <button type="button" class="btn btn--outline-secondary" onclick="ProjectPage.hideProjectForm()">Batal</button>
          </div>
        </form>
      </div>
    </div>

    <div class="card">
      <div class="card-body p-0">
        <div class="row g-2 p-3">
          <div class="col-9">
            <div class="input-search"><i class="bi bi-search"></i>
              <input type="text" class="form-control form-control-sm" id="inputSearchProject" placeholder="Cari proyek..." oninput="DB.debounceCall('searchProject', () => ProjectPage.loadProjectTable())">
            </div>
          </div>
          <div class="col-2">
            <button class="btn btn--primary btn--lg" onclick="ProjectPage.showProjectForm()"><i class="bi bi-plus-lg"></i></button>
          </div>
        </div>
      </div>
    </div>

    <div class="card d-none d-md-block">
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table--hover mb-0">
            <thead><tr><th>Nama Proyek</th><th>Client</th><th>Lokasi</th><th>PIC</th><th>JSA</th><th>WM</th><th>PO</th><th class="text-center">Aksi</th></tr></thead>
            <tbody id="projectTableBody"><tr><td colspan="8" class="text-center py-4">Memuat…</td></tr></tbody>
          </table>
        </div>
      </div>
    </div>
    <div id="projectCardList" class="d-md-none"></div>`;
  },

  async init() { await this.loadProjectTable(); },

  async loadProjectTable() {
    const searchQuery = (document.getElementById('inputSearchProject')?.value || '').toLowerCase();
    let projects = await DataAccess.getAllProjects();
    if (searchQuery) projects = projects.filter(p => (p.name||'').toLowerCase().includes(searchQuery) || (p.client||'').toLowerCase().includes(searchQuery));
    projects = [...projects].reverse();

    // OPTIMASI: Dapatkan counts dari server, bukan dari array
    // Fallback: gunakan count lokal jika server filter tidak tersedia
    const [allJSA, allWM, allPO] = await Promise.all([
      DataAccess.getAllJSA(), DataAccess.getAllWorkMethods(), DataAccess.getAllPO()
    ]);

    const tableBody = document.getElementById('projectTableBody');
    if (tableBody) {
      if (!projects.length) {
        tableBody.innerHTML = `<tr><td colspan="8" class="text-center py-5"><div class="empty-state"><div class="empty-state__icon"><i class="bi bi-clipboard-x"></i></div><p>Tidak ada proyek ditemukan</p></div></td></tr>`;
      } else {
        tableBody.innerHTML = projects.map(p => {
          const jc = allJSA.filter(j => j.project_id === p.id).length;
          const wc = allWM.filter(w => w.project_id === p.id).length;
          const pc = allPO.filter(o => o.project_id === p.id).length;
          return `<tr>
            <td><strong>${UtilityService.escapeHtml(p.name)}</strong></td>
            <td>${UtilityService.escapeHtml(p.client||'-')}</td>
            <td>${UtilityService.escapeHtml(p.location||'-')}</td>
            <td>${UtilityService.escapeHtml(p.pic||'-')}</td>
            <td><span class="badge bg-info">${jc}</span></td>
            <td><span class="badge bg-primary">${wc}</span></td>
            <td><span class="badge bg-indigo">${pc}</span></td>
            <td class="text-center">
              <button class="btn btn--xs btn--outline-info me-1" onclick="ProjectPage.showProjectDetail('${p.id}')"><i class="bi bi-eye"></i></button>
              <button class="btn btn--xs btn--outline-warning me-1" onclick="ProjectPage.editProject('${p.id}')"><i class="bi bi-pencil"></i></button>
              <button class="btn btn--xs btn--outline-danger" onclick="ProjectPage.deleteProject('${p.id}')"><i class="bi bi-trash"></i></button>
            </td>
          </tr>`;
        }).join('');
      }
    }

    const cardList = document.getElementById('projectCardList');
    if (cardList) {
      cardList.innerHTML = projects.length ? projects.map(p => `
        <div class="card"><div class="card-body py-3">
          <div class="d-flex align-items-start justify-content-between gap-2 mb-2">
            <div class="flex-grow-1 overflow-hidden">
              <div class="fw-bold" style="font-size:.9rem;">${UtilityService.escapeHtml(p.name)}</div>
              <div class="text-muted" style="font-size:.76rem;">${UtilityService.escapeHtml(p.client||'')}</div>
            </div>
          </div>
          <div class="d-flex gap-2">
            <button class="btn btn--xs btn--outline-info" onclick="ProjectPage.showProjectDetail('${p.id}')"><i class="bi bi-eye"></i></button>
            <button class="btn btn--xs btn--outline-warning" onclick="ProjectPage.editProject('${p.id}')"><i class="bi bi-pencil"></i></button>
            <button class="btn btn--xs btn--outline-danger ms-auto" onclick="ProjectPage.deleteProject('${p.id}')"><i class="bi bi-trash"></i></button>
          </div>
        </div></div>`).join('') :
        '<div class="empty-state"><div class="empty-state__icon"><i class="bi bi-clipboard-x"></i></div><p>Tidak ada proyek ditemukan</p></div>';
    }
  },

  showProjectForm(data = null) {
    const formCard = document.getElementById('projectFormCard');
    document.getElementById('inputProjectId').value = '';
    if (data) {
      document.getElementById('formCardTitle').innerHTML = '<i class="bi bi-pencil-square"></i> Edit Proyek';
      document.getElementById('inputProjectId').value          = data.id;
      document.getElementById('inputProjectName').value        = data.name || '';
      document.getElementById('inputProjectClient').value      = data.client || '';
      document.getElementById('inputProjectLocation').value    = data.location || '';
      document.getElementById('inputProjectPic').value         = data.pic || '';
      document.getElementById('inputProjectStartDate').value   = data.start_date || '';
      document.getElementById('inputProjectEndDate').value     = data.end_date || '';
      document.getElementById('inputProjectContractValue').value = data.contract_value || '';
    } else {
      document.getElementById('formCardTitle').innerHTML = '<i class="bi bi-plus-circle"></i> Tambah Proyek Baru';
      ['inputProjectName','inputProjectClient','inputProjectLocation','inputProjectPic','inputProjectStartDate','inputProjectEndDate','inputProjectContractValue']
        .forEach(id => { const el = document.getElementById(id); if(el) el.value=''; });
    }
    formCard.style.display = 'block';
    formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  },

  hideProjectForm() { document.getElementById('projectFormCard').style.display = 'none'; },

  async editProject(id) {
    const p = await DataAccess.getProjectById(id);
    if (p) this.showProjectForm(p);
  },

  async saveProject() {
    const name = document.getElementById('inputProjectName').value.trim();
    if (!name) { UIService.showToast('Nama proyek wajib diisi!', 'warning'); return; }
    const startDate = document.getElementById('inputProjectStartDate').value;
    const endDate   = document.getElementById('inputProjectEndDate').value;
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      UIService.showToast('Tanggal mulai tidak boleh lebih besar dari tanggal selesai!', 'warning'); return;
    }
    const existingId = document.getElementById('inputProjectId').value;
    const isNew = !existingId;
    const data = {
      id:             existingId || ('proj_' + Date.now()),
      name,
      client:         document.getElementById('inputProjectClient').value.trim(),
      location:       document.getElementById('inputProjectLocation').value.trim(),
      pic:            document.getElementById('inputProjectPic').value.trim(),
      start_date:     startDate,
      end_date:       endDate,
      contract_value: parseFloat(document.getElementById('inputProjectContractValue').value) || 0
    };
    await DataAccess.saveProject(data);
    this.hideProjectForm();
    await this.loadProjectTable();
    UIService.showToast('Proyek berhasil disimpan!', 'success');
    if (isNew) {
      const all = await DataAccess.getAllProjects();
      if (all.length === 1) setTimeout(() => UIService.showToast('Proyek dibuat! Sekarang buat Metode Kerja, JSA, atau input Man Power.', 'info'), 800);
    }
  },

  async deleteProject(id) {
    const p = await DataAccess.getProjectById(id);
    if (!p) return;
    UtilityService.showConfirmDialog(
      `Hapus proyek "${p.name}"? Semua data terkait (JSA, Metode Kerja, Pembelian, Manpower) juga akan dihapus.`,
      async () => {
        // OPTIMASI: Gunakan DataAccess.deleteProject yang sudah menggunakan batch delete
        await DataAccess.deleteProject(id);
        await this.loadProjectTable();
        UIService.showToast('Proyek beserta data terkait dihapus.', 'warning');
      }
    );
  },

  async showProjectDetail(id) {
    const p = await DataAccess.getProjectById(id);
    if (!p) return;
    const [jsa, wm, mp, po] = await Promise.all([
      DataAccess.getJSAByProject(id), DataAccess.getWorkMethodsByProject(id),
      DataAccess.getManpowerByProject(id), DataAccess.getPOByProject(id)
    ]);
    const totalPO = po.reduce((s,o) => s + (parseFloat(o.total_price)||0), 0);
    document.getElementById('projectDetailTitle').innerHTML = `<i class="bi bi-clipboard-data"></i> ${UtilityService.escapeHtml(p.name)}`;
    document.getElementById('projectDetailContent').innerHTML = `<div class="row g-3">
      <div class="col-sm-6"><div class="card"><div class="card-body"><h6>Informasi Proyek</h6>
        <table class="table table-sm mb-0">
          <tr><td class="fw-semibold">Client</td><td>${UtilityService.escapeHtml(p.client||'-')}</td></tr>
          <tr><td class="fw-semibold">Lokasi</td><td>${UtilityService.escapeHtml(p.location||'-')}</td></tr>
          <tr><td class="fw-semibold">PIC</td><td>${UtilityService.escapeHtml(p.pic||'-')}</td></tr>
          <tr><td class="fw-semibold">Nilai Kontrak</td><td><strong>${UtilityService.formatCurrency(p.contract_value)}</strong></td></tr>
        </table>
      </div></div></div>
      <div class="col-sm-6"><div class="card"><div class="card-body"><h6>Ringkasan</h6>
        <table class="table table-sm mb-0">
          <tr><td class="fw-semibold">JSA</td><td>${jsa.length} dokumen</td></tr>
          <tr><td class="fw-semibold">Metode Kerja</td><td>${wm.length} dokumen</td></tr>
          <tr><td class="fw-semibold">Man Power</td><td>${mp.length} personel</td></tr>
          <tr><td class="fw-semibold">PO</td><td>${po.length} item</td></tr>
          <tr><td class="fw-semibold">Total Pembelian</td><td><strong class="text-success">${UtilityService.formatCurrency(totalPO)}</strong></td></tr>
        </table>
      </div></div></div>
    </div>`;
    new bootstrap.Modal(document.getElementById('projectDetailModal')).show();
  }
};