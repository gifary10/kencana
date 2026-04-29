const ProcurementPage = {
  _currentPO: null,
  _currentItems: [],

  render() {
    return `<div id="procurementListView">
      <div class="page-header no-print">
        <h2 class="page-title">
          <span class="page-title__icon"><i class="bi bi-cart"></i></span>Pembelian Material
        </h2>
        <button class="btn btn--primary btn--lg" onclick="ProcurementPage.showPOForm()">
          <i class="bi bi-plus-lg"></i> Item Pembelian Baru
        </button>
      </div>

      <div class="card">
        <div class="card-body" style="padding:12px;">
          <div class="row g-2">
            <div class="col-8 col-sm-4">
              <div class="input-search">
                <i class="bi bi-search"></i>
                <input type="text" class="form-control form-control-sm" id="inputSearchPO" placeholder="Cari item..." oninput="ProcurementPage.loadPOList()">
              </div>
            </div>
            <div class="col-4 col-sm-3">
              <select class="form-select form-select-sm" id="selectFilterPOProject" onchange="ProcurementPage.loadPOList()">
                <option value="">Semua Proyek</option>
              </select>
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
                  <th>No</th>
                  <th>Proyek</th>
                  <th>Nama Material</th>
                  <th>Spesifikasi</th>
                  <th>Qty</th>
                  <th>Unit</th>
                  <th>Harga Satuan</th>
                  <th>Total</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody id="poTableBody"></tbody>
            </table>
          </div>
        </div>
      </div>

      <div id="poCardList" class="d-md-none"></div>
    </div>

    <div id="procurementFormView" style="display:none;">
      <div class="page-header no-print">
        <h2 class="page-title">
          <span class="page-title__icon"><i class="bi bi-cart"></i></span>
          <span id="poPageTitle">Item Pembelian Baru</span>
        </h2>
        <div class="d-flex gap-2">
          <button class="btn btn--outline-secondary btn--sm" onclick="ProcurementPage.saveAllItems()">
            <i class="bi bi-cloud-check"></i> Simpan Semua
          </button>
          <button class="btn btn--outline-danger btn--sm" onclick="ProcurementPage.showPOList()">
            <i class="bi bi-x-lg"></i> Batal
          </button>
        </div>
      </div>

      <div class="wizard">
        <div class="wizard__header">
          <div class="wizard__title">
            <i class="bi bi-cart"></i> Form Item Pembelian
          </div>
        </div>
        <div class="wizard__body">
          <div id="poStepContent" class="step-content">
            <div class="section-title">Informasi Proyek</div>
            <div class="row g-3 mb-4">
              <div class="col-sm-6">
                <label class="form-label">Proyek <span class="text-danger">*</span></label>
                <select class="form-select" id="selectPOProject" onchange="ProcurementPage.onProjectChange()">
                  <option value="">-- Pilih Proyek --</option>
                </select>
              </div>
              <div class="col-sm-6">
                <label class="form-label">Tanggal Pembelian</label>
                <input type="date" class="form-control" id="inputPODate">
              </div>
            </div>

            <div class="section-title">Daftar Item Pembelian</div>
            <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
              <p class="text-muted mb-0">Tambahkan item pembelian</p>
              <button class="btn btn--sm btn--primary" onclick="ProcurementPage.addItemRow()">
                <i class="bi bi-plus-lg"></i> Tambah Item
              </button>
            </div>
            <div class="table-responsive">
              <table class="hiradc-table" id="poItemsTable">
                <thead>
                  <tr>
                    <th style="width:40px;">No</th>
                    <th>Nama Material <span class="text-danger">*</span></th>
                    <th>Spesifikasi</th>
                    <th style="width:80px;">Qty</th>
                    <th style="width:80px;">Unit</th>
                    <th style="width:130px;">Harga Satuan</th>
                    <th style="width:130px;">Total</th>
                    <th style="width:40px;"></th>
                  </tr>
                </thead>
                <tbody id="poItemsTableBody"></tbody>
              </table>
            </div>
            
            <div class="mt-3 p-3" style="background: var(--color-surface); border-radius: var(--radius-md);">
              <div class="d-flex justify-content-end align-items-center gap-3">
                <span class="text-muted" style="font-size: var(--font-size-sm);">Total Pembelian:</span>
                <strong style="font-size: var(--font-size-lg); color: var(--color-success);" id="poGrandTotal">Rp 0</strong>
              </div>
            </div>
          </div>
        </div>
        <div class="wizard__footer">
          <button class="btn btn--outline-secondary" onclick="ProcurementPage.showPOList()">
            <i class="bi bi-x-lg"></i> Batal
          </button>
          <div class="ms-auto d-flex gap-2">
            <button class="btn btn--success" onclick="ProcurementPage.finishAllItems()">
              <i class="bi bi-check-lg"></i> Simpan Semua Item
            </button>
          </div>
        </div>
      </div>
    </div>`;
  },

  init() {
    const projectSelect = document.getElementById('selectFilterPOProject');
    if (projectSelect) {
      projectSelect.innerHTML = '<option value="">Semua Proyek</option>';
      DataAccess.getAllProjects().forEach(project => {
        const option = document.createElement('option');
        option.value = project.id;
        option.textContent = project.name;
        projectSelect.appendChild(option);
      });
    }

    this.loadPOList();
  },

  showPOList() {
    document.getElementById('procurementListView').style.display = 'block';
    document.getElementById('procurementFormView').style.display = 'none';
    this.loadPOList();
  },

  showPOForm(editData = null) {
    if (!DataAccess.hasProjects()) {
      UIService.showToast('Buat proyek terlebih dahulu!', 'warning');
      UIService.navigate('proyek');
      return;
    }

    document.getElementById('procurementListView').style.display = 'none';
    document.getElementById('procurementFormView').style.display = 'block';

    // Reset items
    this._currentItems = [];

    if (editData) {
      // Edit existing PO
      document.getElementById('poPageTitle').textContent = 'Edit Item Pembelian';
      this._currentItems = [{
        id: editData.id,
        material_name: editData.material_name || '',
        specification: editData.specification || '',
        quantity: editData.quantity || 1,
        unit: editData.unit || '',
        unit_price: editData.unit_price || 0,
        total_price: editData.total_price || 0
      }];
    } else {
      document.getElementById('poPageTitle').textContent = 'Item Pembelian Baru';
    }

    this.renderPOForm(editData);
  },

  renderPOForm(editData = null) {
    const projects = DataAccess.getAllProjects();
    const projectOptions = projects.map(p => {
      const selected = editData && editData.project_id === p.id ? 'selected' : '';
      return `<option value="${p.id}" ${selected}>${p.name}</option>`;
    }).join('');

    document.getElementById('poStepContent').innerHTML = `
      <div class="section-title">Informasi Proyek</div>
      <div class="row g-3 mb-4">
        <div class="col-sm-6">
          <label class="form-label">Proyek <span class="text-danger">*</span></label>
          <select class="form-select" id="selectPOProject" onchange="ProcurementPage.onProjectChange()">
            <option value="">-- Pilih Proyek --</option>
            ${projectOptions}
          </select>
        </div>
        <div class="col-sm-6">
          <label class="form-label">Tanggal Pembelian</label>
          <input type="date" class="form-control" id="inputPODate" value="${editData ? editData.date : new Date().toISOString().split('T')[0]}">
        </div>
      </div>

      <div class="section-title">Daftar Item Pembelian</div>
      <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
        <p class="text-muted mb-0">Tambahkan item pembelian</p>
        <button class="btn btn--sm btn--primary" onclick="ProcurementPage.addItemRow()">
          <i class="bi bi-plus-lg"></i> Tambah Item
        </button>
      </div>
      <div class="table-responsive">
        <table class="hiradc-table" id="poItemsTable">
          <thead>
            <tr>
              <th style="width:40px;">No</th>
              <th>Nama Material <span class="text-danger">*</span></th>
              <th>Spesifikasi</th>
              <th style="width:80px;">Qty</th>
              <th style="width:80px;">Unit</th>
              <th style="width:130px;">Harga Satuan</th>
              <th style="width:130px;">Total</th>
              <th style="width:40px;"></th>
            </tr>
          </thead>
          <tbody id="poItemsTableBody"></tbody>
        </table>
      </div>
      
      <div class="mt-3 p-3" style="background: var(--color-surface); border-radius: var(--radius-md);">
        <div class="d-flex justify-content-end align-items-center gap-3">
          <span class="text-muted" style="font-size: var(--font-size-sm);">Total Pembelian:</span>
          <strong style="font-size: var(--font-size-lg); color: var(--color-success);" id="poGrandTotal">Rp 0</strong>
        </div>
      </div>`;

    // Set project value
    if (editData) {
      setTimeout(() => {
        const projectSelect = document.getElementById('selectPOProject');
        if (projectSelect && editData.project_id) {
          projectSelect.value = editData.project_id;
        }
      }, 50);
    }

    // Render existing items
    if (this._currentItems.length > 0) {
      this._currentItems.forEach(item => this.addItemRow(item));
    } else {
      // Add one empty row by default
      this.addItemRow();
    }

    this.calculateGrandTotal();
  },

  onProjectChange() {
    const projectId = document.getElementById('selectPOProject')?.value;
    const project = DataAccess.getProjectById(projectId);
    
    if (project) {
      // Auto-fill date with current date if not set
      const dateInput = document.getElementById('inputPODate');
      if (dateInput && !dateInput.value) {
        dateInput.value = new Date().toISOString().split('T')[0];
      }
    }
  },

  addItemRow(itemData = {}) {
    const tbody = document.getElementById('poItemsTableBody');
    if (!tbody) return;

    const rowIndex = tbody.querySelectorAll('tr').length;
    const row = document.createElement('tr');
    row.setAttribute('data-item-index', rowIndex);

    row.innerHTML = `
      <td class="text-center" style="font-weight:600;">${rowIndex + 1}</td>
      <td><input type="text" class="po-item-name" value="${this.escapeHtml(itemData.material_name || '')}" placeholder="Nama material" oninput="ProcurementPage.calculateItemTotal(this)"></td>
      <td><input type="text" class="po-item-spec" value="${this.escapeHtml(itemData.specification || '')}" placeholder="Spesifikasi"></td>
      <td><input type="number" class="po-item-qty" value="${itemData.quantity || 1}" min="0" step="any" oninput="ProcurementPage.calculateItemTotal(this)"></td>
      <td><input type="text" class="po-item-unit" value="${this.escapeHtml(itemData.unit || '')}" placeholder="pcs"></td>
      <td><input type="number" class="po-item-price" value="${itemData.unit_price || 0}" min="0" oninput="ProcurementPage.calculateItemTotal(this)"></td>
      <td><input type="text" class="po-item-total" value="${UtilityService.formatCurrency(itemData.total_price || 0)}" readonly style="background:var(--color-surface-2);font-weight:700;"></td>
      <td class="text-center">
        <button class="btn btn--xs btn--outline-danger" onclick="ProcurementPage.removeItemRow(this)" title="Hapus item">
          <i class="bi bi-trash"></i>
        </button>
      </td>`;

    tbody.appendChild(row);
    this.calculateItemTotal(row.querySelector('.po-item-name'));
  },

  removeItemRow(buttonElement) {
    const row = buttonElement.closest('tr');
    if (!row) return;

    const tbody = document.getElementById('poItemsTableBody');
    row.remove();

    // Update row numbers
    this.updateRowNumbers();

    // If no rows left, add one empty row
    if (tbody.querySelectorAll('tr').length === 0) {
      this.addItemRow();
    }

    this.calculateGrandTotal();
  },

  updateRowNumbers() {
    const tbody = document.getElementById('poItemsTableBody');
    if (!tbody) return;

    const rows = tbody.querySelectorAll('tr');
    rows.forEach((row, index) => {
      row.setAttribute('data-item-index', index);
      const firstCell = row.querySelector('td:first-child');
      if (firstCell) {
        firstCell.textContent = index + 1;
      }
    });
  },

  calculateItemTotal(inputElement) {
    const row = inputElement.closest('tr');
    if (!row) return;

    const qty = parseFloat(row.querySelector('.po-item-qty')?.value || 0);
    const price = parseFloat(row.querySelector('.po-item-price')?.value || 0);
    const total = qty * price;
    const totalInput = row.querySelector('.po-item-total');
    
    if (totalInput) {
      totalInput.value = UtilityService.formatCurrency(total);
    }

    this.calculateGrandTotal();
  },

  calculateGrandTotal() {
    const tbody = document.getElementById('poItemsTableBody');
    if (!tbody) return;

    let grandTotal = 0;
    tbody.querySelectorAll('tr').forEach(row => {
      const qty = parseFloat(row.querySelector('.po-item-qty')?.value || 0);
      const price = parseFloat(row.querySelector('.po-item-price')?.value || 0);
      grandTotal += qty * price;
    });

    const grandTotalEl = document.getElementById('poGrandTotal');
    if (grandTotalEl) {
      grandTotalEl.textContent = UtilityService.formatCurrency(grandTotal);
    }
  },

  saveAllItems() {
    const projectId = document.getElementById('selectPOProject')?.value;
    
    if (!projectId) {
      UIService.showToast('Pilih proyek terlebih dahulu!', 'warning');
      return;
    }

    const items = this.collectItems();
    if (items.length === 0) {
      UIService.showToast('Minimal 1 item harus diisi!', 'warning');
      return;
    }

    // Validate items
    for (let i = 0; i < items.length; i++) {
      if (!items[i].material_name) {
        UIService.showToast(`Item #${i + 1}: Nama material wajib diisi!`, 'warning');
        return;
      }
      if (items[i].quantity <= 0) {
        UIService.showToast(`Item #${i + 1}: Quantity harus lebih dari 0!`, 'warning');
        return;
      }
    }

    // Save all items
    const savedCount = { success: 0, failed: 0 };
    const poDate = document.getElementById('inputPODate')?.value || new Date().toISOString().split('T')[0];

    items.forEach(item => {
      const poData = {
        id: item.id || 'po_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        project_id: projectId,
        material_name: item.material_name,
        specification: item.specification || '',
        quantity: item.quantity,
        unit: item.unit || '',
        unit_price: item.unit_price,
        total_price: item.total_price,
        date: poDate,
        created_at: item.created_at || new Date().toISOString()
      };
      
      const result = DataAccess.savePO(poData);
      if (result) {
        savedCount.success++;
      } else {
        savedCount.failed++;
      }
    });

    if (savedCount.success > 0) {
      UIService.showToast(`${savedCount.success} item berhasil disimpan!`, 'success');
      setTimeout(() => this.showPOList(), 1200);
    } else {
      UIService.showToast('Gagal menyimpan item.', 'danger');
    }
  },

  finishAllItems() {
    const projectId = document.getElementById('selectPOProject')?.value;
    
    if (!projectId) {
      UIService.showToast('Pilih proyek terlebih dahulu!', 'warning');
      return;
    }

    const items = this.collectItems();
    
    // Filter out empty items (no material name)
    const validItems = items.filter(item => item.material_name && item.material_name.trim());
    
    if (validItems.length === 0) {
      UIService.showToast('Minimal 1 item dengan nama material harus diisi!', 'warning');
      return;
    }

    // Validate valid items
    for (let i = 0; i < validItems.length; i++) {
      if (validItems[i].quantity <= 0) {
        UIService.showToast(`Item "${validItems[i].material_name}": Quantity harus lebih dari 0!`, 'warning');
        return;
      }
    }

    if (!confirm(`Simpan ${validItems.length} item pembelian?`)) return;

    // Save all valid items
    const poDate = document.getElementById('inputPODate')?.value || new Date().toISOString().split('T')[0];

    validItems.forEach(item => {
      const poData = {
        id: item.id || 'po_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        project_id: projectId,
        material_name: item.material_name.trim(),
        specification: item.specification || '',
        quantity: item.quantity,
        unit: item.unit || '',
        unit_price: item.unit_price,
        total_price: item.total_price,
        date: poDate,
        created_at: item.created_at || new Date().toISOString()
      };
      
      DataAccess.savePO(poData);
    });

    UIService.showToast(`${validItems.length} item pembelian berhasil disimpan!`, 'success');
    setTimeout(() => this.showPOList(), 1200);
  },

  collectItems() {
    const items = [];
    const tbody = document.getElementById('poItemsTableBody');
    if (!tbody) return items;

    tbody.querySelectorAll('tr').forEach(row => {
      const nameInput = row.querySelector('.po-item-name');
      const materialName = nameInput ? nameInput.value.trim() : '';
      
      // Only collect items that have a material name
      if (materialName) {
        items.push({
          material_name: materialName,
          specification: row.querySelector('.po-item-spec')?.value?.trim() || '',
          quantity: parseFloat(row.querySelector('.po-item-qty')?.value || 0),
          unit: row.querySelector('.po-item-unit')?.value?.trim() || '',
          unit_price: parseFloat(row.querySelector('.po-item-price')?.value || 0),
          total_price: parseFloat(row.querySelector('.po-item-qty')?.value || 0) * parseFloat(row.querySelector('.po-item-price')?.value || 0)
        });
      }
    });

    return items;
  },

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  loadPOList() {
    let poList = DataAccess.getAllPO();
    const searchQuery = (document.getElementById('inputSearchPO')?.value || '').toLowerCase();
    const projectId = document.getElementById('selectFilterPOProject')?.value || '';

    if (searchQuery) {
      poList = poList.filter(po =>
        (po.material_name || '').toLowerCase().includes(searchQuery) ||
        (po.specification || '').toLowerCase().includes(searchQuery)
      );
    }
    if (projectId) {
      poList = poList.filter(po => po.project_id === projectId);
    }

    poList.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const tableBody = document.getElementById('poTableBody');

    if (!poList.length) {
      if (tableBody) {
        tableBody.innerHTML = '<tr><td colspan="9" class="text-center py-5">Tidak ada item pembelian</td></tr>';
      }
    } else if (tableBody) {
      tableBody.innerHTML = poList.map((po, index) => {
        const project = DataAccess.getProjectById(po.project_id);
        return `<tr>
          <td class="text-center">${index + 1}</td>
          <td>${this.escapeHtml(project?.name || '-')}</td>
          <td><strong>${this.escapeHtml(po.material_name || '-')}</strong></td>
          <td>${this.escapeHtml(po.specification || '-')}</td>
          <td class="text-center">${po.quantity || 0}</td>
          <td class="text-center">${this.escapeHtml(po.unit || '-')}</td>
          <td class="text-end">${UtilityService.formatCurrency(po.unit_price)}</td>
          <td class="text-end"><strong>${UtilityService.formatCurrency(po.total_price)}</strong></td>
          <td class="text-center">
            <button class="btn btn--xs btn--outline-warning me-1" onclick="ProcurementPage.editPO('${po.id}')">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn--xs btn--outline-danger" onclick="ProcurementPage.deletePOConfirm('${po.id}')">
              <i class="bi bi-trash"></i>
            </button>
          </td>
        </tr>`;
      }).join('');
    }

    const cardList = document.getElementById('poCardList');
    if (cardList) {
      cardList.innerHTML = poList.length
        ? poList.map(po => {
            const project = DataAccess.getProjectById(po.project_id);
            return `<div class="card">
              <div class="card-body" style="padding:13px;">
                <div style="font-weight:700;">${this.escapeHtml(po.material_name || '-')}</div>
                <div style="font-size:.7rem;">${this.escapeHtml(project?.name || '-')} | ${this.escapeHtml(po.specification || '-')}</div>
                <div style="font-size:.7rem;">${po.quantity || 0} ${this.escapeHtml(po.unit || '')} | ${UtilityService.formatCurrency(po.unit_price)}</div>
                <div style="font-weight:600;color:var(--color-success);">${UtilityService.formatCurrency(po.total_price)}</div>
                <div style="display:flex;gap:7px;margin-top:8px;">
                  <button class="btn btn--xs btn--outline-warning" onclick="ProcurementPage.editPO('${po.id}')">Edit</button>
                  <button class="btn btn--xs btn--outline-danger" onclick="ProcurementPage.deletePOConfirm('${po.id}')">Hapus</button>
                </div>
              </div>
            </div>`;
          }).join('')
        : '<div class="empty-state">Tidak ada item pembelian</div>';
    }
  },

  editPO(poId) {
    const po = DataAccess.getPOById(poId);
    if (po) {
      this._currentItems = [{
        id: po.id,
        material_name: po.material_name || '',
        specification: po.specification || '',
        quantity: po.quantity || 1,
        unit: po.unit || '',
        unit_price: po.unit_price || 0,
        total_price: po.total_price || 0,
        created_at: po.created_at
      }];
      
      document.getElementById('procurementListView').style.display = 'none';
      document.getElementById('procurementFormView').style.display = 'block';
      document.getElementById('poPageTitle').textContent = 'Edit Item Pembelian';
      this.renderPOForm(po);
    }
  },

  deletePOConfirm(poId) {
    if (!confirm('Hapus item ini?')) return;
    DataAccess.deletePO(poId);
    this.loadPOList();
    UIService.showToast('Item dihapus.', 'warning');
  }
};