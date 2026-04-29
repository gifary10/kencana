const ManpowerPage = {
  render() {
    return `<div id="manpowerView">
      <div class="page-header no-print">
        <h2 class="page-title">
          <span class="page-title__icon"><i class="bi bi-people"></i></span>Data Man Power
        </h2>
      </div>

      <div class="card no-print">
        <div class="card-body" style="padding:12px;">
          <div class="row g-2 align-items-end">
            <div class="col-12 col-sm-6">
              <label class="form-label mb-1">Pilih Proyek</label>
              <select class="form-select form-select-sm" id="selectManpowerProject" onchange="ManpowerPage.loadManpowerData()">
                <option value="">-- Pilih Proyek --</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div id="manpowerContent">
        <div class="empty-state">
          <div class="empty-state__icon"><i class="bi bi-people"></i></div>
          <p>Pilih proyek untuk melihat data manpower</p>
        </div>
      </div>
    </div>`;
  },

  init() {
    const projectSelect = document.getElementById('selectManpowerProject');
    if (projectSelect) {
      projectSelect.innerHTML = '<option value="">-- Pilih Proyek --</option>';

      DataAccess.getAllProjects().forEach(project => {
        const option = document.createElement('option');
        option.value = project.id;
        option.textContent = project.name;
        projectSelect.appendChild(option);
      });
    }
  },

  loadManpowerData() {
    const projectId = document.getElementById('selectManpowerProject')?.value;

    if (!projectId) {
      document.getElementById('manpowerContent').innerHTML = 
        '<div class="empty-state"><div class="empty-state__icon"><i class="bi bi-people"></i></div><p>Pilih proyek untuk melihat data manpower</p></div>';
      return;
    }

    const workers = DataAccess.getManpowerByProject(projectId);
    const project = DataAccess.getProjectById(projectId);

    const html = `<div class="card">
      <div class="card-header">
        <i class="bi bi-people"></i> Daftar Personel — <strong>${project?.name || 'Proyek'}</strong>
        <button class="btn btn--sm btn--primary ms-auto" onclick="ManpowerPage.addManpowerRow()">
          <i class="bi bi-person-plus"></i> Tambah
        </button>
      </div>
      <div class="card-body p-0">
        <div class="table-responsive">
          <table class="table table--hover mb-0">
            <thead>
              <tr>
                <th style="width:50px;">No</th>
                <th>Nama</th>
                <th>Jabatan</th>
                <th style="width:80px;">Aksi</th>
              </tr>
            </thead>
            <tbody id="manpowerTableBody">
              ${workers.length === 0 ? `<tr><td colspan="4" class="text-center py-4 text-muted">Belum ada data personel. Klik "Tambah" untuk menambahkan.</td></tr>` : ''}
            </tbody>
          </table>
        </div>
      </div>
      <div class="card-footer d-flex justify-content-between align-items-center">
        <span id="manpowerCount" class="text-muted" style="font-size:.78rem;">Total: ${workers.length} personel</span>
        <div class="d-flex gap-2">
          <button class="btn btn--outline-secondary btn--sm" onclick="ManpowerPage.loadManpowerData()">
            <i class="bi bi-arrow-counterclockwise"></i> Reset
          </button>
          <button class="btn btn--primary btn--sm" onclick="ManpowerPage.saveManpowerData()">
            <i class="bi bi-save"></i> Simpan Semua
          </button>
        </div>
      </div>
    </div>`;

    document.getElementById('manpowerContent').innerHTML = html;

    // Render existing workers
    if (workers.length) {
      workers.forEach((worker, index) => this.addManpowerRow(worker, index));
    }
  },

  addManpowerRow(workerData = {}, existingIndex = null) {
    const tableBody = document.getElementById('manpowerTableBody');
    if (!tableBody) return;

    // Hapus empty state row jika ada
    const emptyRow = tableBody.querySelector('tr td[colspan]');
    if (emptyRow) {
      emptyRow.closest('tr').remove();
    }

    const rowIndex = existingIndex !== null ? existingIndex : tableBody.querySelectorAll('tr').length;
    const row = document.createElement('tr');
    row.setAttribute('data-mp-index', rowIndex);

    row.innerHTML = `<td class="text-center" style="font-weight:600;font-size:.78rem;">${rowIndex + 1}</td>
      <td><input type="text" class="form-control form-control-sm manpower-name" value="${this.escapeHtml(workerData.name || '')}" placeholder="Nama personel"></td>
      <td><input type="text" class="form-control form-control-sm manpower-position" value="${this.escapeHtml(workerData.position || '')}" placeholder="Jabatan"></td>
      <td class="text-center">
        <button class="btn btn--xs btn--outline-danger" onclick="ManpowerPage.removeManpowerRow(this)" title="Hapus">
          <i class="bi bi-trash"></i>
        </button>
      </td>`;

    tableBody.appendChild(row);

    // Update nomor urut
    this.updateRowNumbers();
  },

  removeManpowerRow(buttonElement) {
    const row = buttonElement.closest('tr');
    if (!row) return;

    const tableBody = document.getElementById('manpowerTableBody');
    row.remove();

    // Update nomor urut
    this.updateRowNumbers();

    // Update count
    const count = tableBody.querySelectorAll('tr').length;
    const countEl = document.getElementById('manpowerCount');
    if (countEl) countEl.textContent = `Total: ${count} personel`;
  },

  updateRowNumbers() {
    const tableBody = document.getElementById('manpowerTableBody');
    if (!tableBody) return;

    const rows = tableBody.querySelectorAll('tr');
    rows.forEach((row, index) => {
      const firstCell = row.querySelector('td:first-child');
      if (firstCell) {
        firstCell.textContent = index + 1;
      }
    });
  },

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  saveManpowerData() {
    const projectId = document.getElementById('selectManpowerProject')?.value;

    if (!projectId) {
      UIService.showToast('Pilih proyek terlebih dahulu!', 'warning');
      return;
    }

    const workers = [];
    document.querySelectorAll('#manpowerTableBody tr').forEach(row => {
      const nameInput = row.querySelector('.manpower-name');
      const positionInput = row.querySelector('.manpower-position');
      
      const name = nameInput ? nameInput.value.trim() : '';
      const position = positionInput ? positionInput.value.trim() : '';
      
      if (name || position) {
        workers.push({
          id: 'mp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
          name,
          position
        });
      }
    });

    const saved = DataAccess.saveManpower({ project_id: projectId, workers });
    this.loadManpowerData();
    UIService.showToast(`Data manpower berhasil disimpan! (${workers.length} personel)`, 'success');
  }
};