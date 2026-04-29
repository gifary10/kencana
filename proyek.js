const ProjectPage = {
  render() {
    return `<div class="page-header no-print">
      <h2 class="page-title">
        <span class="page-title__icon"><i class="bi bi-clipboard-data"></i></span>Proyek
      </h2>
      <button class="btn btn--primary btn--lg" onclick="ProjectPage.showProjectForm()">
        <i class="bi bi-plus-lg"></i> Proyek Baru
      </button>
    </div>

    <div id="projectFormCard" class="card" style="display:none;">
      <div class="card-header" id="formCardTitle">
        <i class="bi bi-plus-circle"></i> Tambah Proyek Baru
      </div>
      <div class="card-body">
        <form id="projectForm">
          <input type="hidden" id="inputProjectId">
          <div class="row g-3">
            <div class="col-12">
              <label class="form-label">Nama Proyek <span class="text-danger">*</span></label>
              <input type="text" class="form-control" id="inputProjectName" required placeholder="Pembangunan Gedung A">
            </div>
            <div class="col-sm-6">
              <label class="form-label">Client</label>
              <input type="text" class="form-control" id="inputProjectClient" placeholder="PT. Client Utama">
            </div>
            <div class="col-sm-6">
              <label class="form-label">Lokasi</label>
              <input type="text" class="form-control" id="inputProjectLocation" placeholder="Kota, Provinsi">
            </div>
            <div class="col-sm-6">
              <label class="form-label">PIC</label>
              <input type="text" class="form-control" id="inputProjectPic" placeholder="Nama PIC">
            </div>
            <div class="col-sm-6">
              <label class="form-label">Nilai Kontrak</label>
              <input type="number" class="form-control" id="inputProjectContractValue" placeholder="Nilai kontrak">
            </div>
            <div class="col-sm-3">
              <label class="form-label">Tgl Mulai</label>
              <input type="date" class="form-control" id="inputProjectStartDate">
            </div>
            <div class="col-sm-3">
              <label class="form-label">Tgl Selesai</label>
              <input type="date" class="form-control" id="inputProjectEndDate">
            </div>
          </div>
          <div class="d-flex gap-2 mt-3">
            <button type="submit" class="btn btn--primary">
              <i class="bi bi-save"></i> Simpan
            </button>
            <button type="button" class="btn btn--outline-secondary" onclick="ProjectPage.hideProjectForm()">Batal</button>
          </div>
        </form>
      </div>
    </div>

    <div class="card">
      <div class="card-body" style="padding:12px;">
        <div class="row g-2">
          <div class="col-8 col-sm-5">
            <div class="input-search">
              <i class="bi bi-search"></i>
              <input type="text" class="form-control form-control-sm" id="inputSearchProject" placeholder="Cari proyek..." oninput="ProjectPage.loadProjectTable()">
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="card d-none d-md-block">
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table--hover mb-0">
            <thead>
              <tr>
                <th>Nama Proyek</th>
                <th>Client</th>
                <th>Lokasi</th>
                <th>PIC</th>
                <th>JSA</th>
                <th>WM</th>
                <th>PO</th>
                <th class="text-center">Aksi</th>
              </tr>
            </thead>
            <tbody id="projectTableBody"></tbody>
          </table>
        </div>
      </div>
    </div>

    <div id="projectCardList" class="d-md-none"></div>`;
  },

  init() {
    this.loadProjectTable();
    document.getElementById('projectForm').addEventListener('submit', function(event) {
      event.preventDefault();
      ProjectPage.saveProject();
    });
  },

  loadProjectTable() {
    let projects = DataAccess.getAllProjects();
    const searchQuery = (document.getElementById('inputSearchProject').value || '').toLowerCase();

    if (searchQuery) {
      projects = projects.filter(project =>
        (project.name || '').toLowerCase().includes(searchQuery) ||
        (project.client || '').toLowerCase().includes(searchQuery)
      );
    }

    projects = projects.reverse();

    const tableBody = document.getElementById('projectTableBody');

    if (!projects.length) {
      tableBody.innerHTML = `<tr>
        <td colspan="8" class="text-center py-5">
          <div class="empty-state">
            <div class="empty-state__icon"><i class="bi bi-clipboard-x"></i></div>
            <p>Tidak ada proyek ditemukan</p>
          </div>
        </td>
      </tr>`;
    } else {
      tableBody.innerHTML = projects.map(project => {
        const jsaCount = DataAccess.getJSAByProject(project.id).length;
        const wmCount = DataAccess.getWorkMethodsByProject(project.id).length;
        const poCount = DataAccess.getPOByProject(project.id).length;

        return `<tr>
          <td><strong>${project.name}</strong></td>
          <td>${project.client || '-'}</td>
          <td>${project.location || '-'}</td>
          <td>${project.pic || '-'}</td>
          <td><span class="badge bg-info cursor-pointer" onclick="UIService.navigate('jsa')">${jsaCount}</span></td>
          <td><span class="badge bg-primary cursor-pointer" onclick="UIService.navigate('metode')">${wmCount}</span></td>
          <td><span class="badge bg-indigo cursor-pointer" style="background:var(--color-indigo);color:white;" onclick="UIService.navigate('pembelian')">${poCount}</span></td>
          <td class="text-center" style="white-space:nowrap;">
            <button class="btn btn--xs btn--outline-info me-1" onclick="ProjectPage.showProjectDetail('${project.id}')">
              <i class="bi bi-eye"></i>
            </button>
            <button class="btn btn--xs btn--outline-warning me-1" onclick="ProjectPage.editProject('${project.id}')">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn--xs btn--outline-danger" onclick="ProjectPage.deleteProject('${project.id}')">
              <i class="bi bi-trash"></i>
            </button>
          </td>
        </tr>`;
      }).join('');
    }

    this.renderProjectCards(projects);
  },

  renderProjectCards(projects) {
    const cardList = document.getElementById('projectCardList');

    if (!projects.length) {
      cardList.innerHTML = `<div class="empty-state">
        <div class="empty-state__icon"><i class="bi bi-clipboard-x"></i></div>
        <p>Tidak ada proyek ditemukan</p>
      </div>`;
    } else {
      cardList.innerHTML = projects.map(project => {
        return `<div class="card">
          <div class="card-body" style="padding:14px;">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:8px;">
              <div style="flex:1;min-width:0;">
                <div style="font-weight:700;font-size:.9rem;">${project.name}</div>
                <div style="font-size:.76rem;color:var(--color-text-3);">${project.client || ''}</div>
              </div>
            </div>
            <div style="display:flex;gap:8px;">
              <button class="btn btn--xs btn--outline-info" onclick="ProjectPage.showProjectDetail('${project.id}')">
                <i class="bi bi-eye"></i>
              </button>
              <button class="btn btn--xs btn--outline-warning" onclick="ProjectPage.editProject('${project.id}')">
                <i class="bi bi-pencil"></i>
              </button>
              <button class="btn btn--xs btn--outline-danger ms-auto" onclick="ProjectPage.deleteProject('${project.id}')">
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </div>
        </div>`;
      }).join('');
    }
  },

  showProjectForm(projectData = null) {
    const formCard = document.getElementById('projectFormCard');
    document.getElementById('projectForm').reset();
    document.getElementById('inputProjectId').value = '';

    if (projectData) {
      document.getElementById('formCardTitle').innerHTML = '<i class="bi bi-pencil-square"></i> Edit Proyek';
      document.getElementById('inputProjectId').value = projectData.id;
      document.getElementById('inputProjectName').value = projectData.name || '';
      document.getElementById('inputProjectClient').value = projectData.client || '';
      document.getElementById('inputProjectLocation').value = projectData.location || '';
      document.getElementById('inputProjectPic').value = projectData.pic || '';
      document.getElementById('inputProjectStartDate').value = projectData.start_date || '';
      document.getElementById('inputProjectEndDate').value = projectData.end_date || '';
      document.getElementById('inputProjectContractValue').value = projectData.contract_value || '';
    } else {
      document.getElementById('formCardTitle').innerHTML = '<i class="bi bi-plus-circle"></i> Tambah Proyek Baru';
    }

    formCard.style.display = 'block';
    formCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
  },

  hideProjectForm() {
    document.getElementById('projectFormCard').style.display = 'none';
  },

  editProject(projectId) {
    const project = DataAccess.getProjectById(projectId);
    if (project) this.showProjectForm(project);
  },

  saveProject() {
    const existingId = document.getElementById('inputProjectId').value;
    const isNew = !existingId;
    const projectId = existingId || ('proj_' + Date.now());

    const projectData = {
      id: projectId,
      company_id: 'comp_main',
      name: document.getElementById('inputProjectName').value.trim(),
      client: document.getElementById('inputProjectClient').value.trim(),
      location: document.getElementById('inputProjectLocation').value.trim(),
      pic: document.getElementById('inputProjectPic').value.trim(),
      start_date: document.getElementById('inputProjectStartDate').value,
      end_date: document.getElementById('inputProjectEndDate').value,
      contract_value: parseFloat(document.getElementById('inputProjectContractValue').value) || 0
    };

    DataAccess.saveProject(projectData);
    this.hideProjectForm();
    this.loadProjectTable();
    UIService.showToast('Proyek berhasil disimpan!', 'success');

    if (isNew && DataAccess.getAllProjects().length === 1) {
      setTimeout(() => {
        UIService.showToast('Proyek dibuat! Sekarang Anda bisa membuat Metode Kerja, JSA, atau input Man Power.', 'info');
      }, 800);
    }
  },

  deleteProject(projectId) {
    const project = DataAccess.getProjectById(projectId);
    if (!confirm(`Hapus proyek "${project?.name}"?\nSemua data terkait juga akan dihapus.`)) return;

    // Delete related data first
    StorageService.saveData(STORAGE_KEYS.JSA, DataAccess.getAllJSA().filter(jsa => jsa.project_id !== projectId));
    StorageService.saveData(STORAGE_KEYS.WORK_METHODS, DataAccess.getAllWorkMethods().filter(wm => wm.project_id !== projectId));
    StorageService.saveData(STORAGE_KEYS.PROCUREMENT, DataAccess.getAllPO().filter(po => po.project_id !== projectId));
    DataAccess.deleteManpowerByProject(projectId);
    DataAccess.deleteProject(projectId);

    this.loadProjectTable();
    UIService.showToast('Proyek dihapus.', 'warning');
  },

  showProjectDetail(projectId) {
    const project = DataAccess.getProjectById(projectId);
    if (!project) return;

    const jsaCount = DataAccess.getJSAByProject(project.id).length;
    const wmCount = DataAccess.getWorkMethodsByProject(project.id).length;
    const mpCount = DataAccess.getManpowerByProject(project.id).length;
    const poList = DataAccess.getPOByProject(project.id);
    const poCount = poList.length;
    const totalPO = poList.reduce((sum, po) => sum + (po.total_price || 0), 0);

    document.getElementById('projectDetailTitle').innerHTML = `<i class="bi bi-clipboard-data"></i> ${project.name}`;
    document.getElementById('projectDetailContent').innerHTML = `<div class="row g-3">
      <div class="col-sm-6">
        <div class="card">
          <div class="card-body">
            <h6>Informasi Proyek</h6>
            <table class="table table-sm mb-0">
              <tr><td style="font-weight:600;">Client</td><td>${project.client || '-'}</td></tr>
              <tr><td style="font-weight:600;">Lokasi</td><td>${project.location || '-'}</td></tr>
              <tr><td style="font-weight:600;">PIC</td><td>${project.pic || '-'}</td></tr>
              <tr><td style="font-weight:600;">Nilai Kontrak</td><td><strong>${UtilityService.formatCurrency(project.contract_value)}</strong></td></tr>
            </table>
          </div>
        </div>
      </div>
      <div class="col-sm-6">
        <div class="card">
          <div class="card-body">
            <h6>Ringkasan</h6>
            <table class="table table-sm mb-0">
              <tr><td style="font-weight:600;">JSA</td><td>${jsaCount} dokumen</td></tr>
              <tr><td style="font-weight:600;">Metode Kerja</td><td>${wmCount} dokumen</td></tr>
              <tr><td style="font-weight:600;">Man Power</td><td>${mpCount} personel</td></tr>
              <tr><td style="font-weight:600;">PO</td><td>${poCount} item</td></tr>
              <tr><td style="font-weight:600;">Total Pembelian</td><td><strong style="color:var(--color-success);">${UtilityService.formatCurrency(totalPO)}</strong></td></tr>
            </table>
          </div>
        </div>
      </div>
    </div>`;

    const modal = new bootstrap.Modal(document.getElementById('projectDetailModal'));
    modal.show();
  }
};
