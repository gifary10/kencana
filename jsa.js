// jsa.js
const JSAPage = {
  _currentJSA: null,
  _currentStep: 1,

  render() {
    return `<div id="jsaListView">
      <div class="page-header no-print">
        <h2 class="page-title">
          <span class="page-title__icon"><i class="bi bi-journal-check"></i></span>Daftar JSA
        </h2>
        <button class="btn btn--primary btn--lg" onclick="JSAPage.showJSAForm()">
          <i class="bi bi-plus-lg"></i> JSA Baru
        </button>
      </div>

      <div class="card">
        <div class="card-body" style="padding:12px;">
          <div class="row g-2">
            <div class="col-8 col-sm-4">
              <div class="input-search">
                <i class="bi bi-search"></i>
                <input type="text" class="form-control form-control-sm" id="inputSearchJSA" placeholder="Cari..." oninput="JSAPage.loadJSAList()">
              </div>
            </div>
            <div class="col-4 col-sm-3">
              <select class="form-select form-select-sm" id="selectFilterJSAProject" onchange="JSAPage.loadJSAList()">
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
                  <th>No. Dokumen</th>
                  <th>Proyek</th>
                  <th>Tanggal</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody id="jsaTableBody"></tbody>
            </table>
          </div>
        </div>
      </div>

      <div id="jsaCardList" class="d-md-none"></div>
    </div>

    <div id="jsaFormView" style="display:none;">
      <div class="page-header no-print">
        <h2 class="page-title">
          <span class="page-title__icon"><i class="bi bi-journal-plus"></i></span>
          <span id="jsaPageTitle">Form JSA Baru</span>
        </h2>
        <div class="d-flex gap-2">
          <button class="btn btn--outline-secondary btn--sm" onclick="JSAPage.saveAsDraft()">
            <i class="bi bi-cloud-check"></i> Draft
          </button>
          <button class="btn btn--outline-danger btn--sm" onclick="JSAPage.showJSAList()">
            <i class="bi bi-x-lg"></i> Batal
          </button>
        </div>
      </div>

      <div class="wizard">
        <div class="wizard__header no-print">
          <div class="wizard__title">
            <i class="bi bi-journal-check"></i> Job Safety Analysis
          </div>
          <div class="step-pills" id="jsaStepPills"></div>
        </div>
        <div class="wizard__body">
          <div id="jsaStepContent" class="step-content"></div>
        </div>
        <div class="wizard__footer no-print">
          <button class="btn btn--outline-secondary" id="btnJSAPrev" onclick="JSAPage.goToPreviousStep()">
            <i class="bi bi-arrow-left"></i> Sebelumnya
          </button>
          <div class="ms-auto d-flex gap-2">
            <button class="btn btn--primary" id="btnJSANext" onclick="JSAPage.goToNextStep()">
              Lanjut <i class="bi bi-arrow-right"></i>
            </button>
            <button class="btn btn--success" id="btnJSAFinish" onclick="JSAPage.finishJSA()">
              <i class="bi bi-check-lg"></i> Selesaikan
            </button>
          </div>
        </div>
      </div>
    </div>`;
  },

  init() {
    this._currentJSA = null;
    this._currentStep = 1;

    const projectSelect = document.getElementById('selectFilterJSAProject');
    if (projectSelect) {
      projectSelect.innerHTML = '<option value="">Semua Proyek</option>';
      DataAccess.getAllProjects().forEach(project => {
        const option = document.createElement('option');
        option.value = project.id;
        option.textContent = project.name;
        projectSelect.appendChild(option);
      });
    }

    this.loadJSAList();
  },

  showJSAList() {
    const listView = document.getElementById('jsaListView');
    const formView = document.getElementById('jsaFormView');
    if (listView) listView.style.display = 'block';
    if (formView) formView.style.display = 'none';
    this.loadJSAList();
  },

  showJSAForm(jsaData = null) {
    if (!DataAccess.hasProjects()) {
      UIService.showToast('Buat proyek terlebih dahulu!', 'warning');
      UIService.navigate('proyek');
      return;
    }

    const listView = document.getElementById('jsaListView');
    const formView = document.getElementById('jsaFormView');
    if (listView) listView.style.display = 'none';
    if (formView) formView.style.display = 'block';

    const stepLabels = ['Info Umum', 'APD', 'Identifikasi Bahaya', 'Tindakan Darurat', 'Permit & Approval'];
    const stepPills = document.getElementById('jsaStepPills');
    if (stepPills) {
      stepPills.innerHTML = stepLabels.map((label, index) => {
        const stepNumber = index + 1;
        return `<div class="step-pill" id="jsaPill_${stepNumber}">
          <span class="step-pill__number" id="jsaPillNumber_${stepNumber}">${stepNumber}</span>${label}
        </div>`;
      }).join('');
    }

    if (jsaData) {
      this._currentJSA = JSON.parse(JSON.stringify(jsaData));
      const pageTitle = document.getElementById('jsaPageTitle');
      if (pageTitle) pageTitle.textContent = 'Edit: ' + this._currentJSA.document_number;
    } else {
      this._currentJSA = {
        id: 'jsa_' + Date.now(),
        project_id: '',
        document_number: UtilityService.generateJSADocNumber(),
        revision: '0',
        date: new Date().toISOString().split('T')[0],
        ppe: {
          selected_items: [],
          custom_items: []
        },
        hazard_identification: [],
        emergency: {
          type: '',
          procedure: '',
          assembly_point: '',
          emergency_number: ''
        },
        permits: {
          hot_work: false,
          confined_space: false,
          working_height: false,
          electrical: false,
          lifting: false,
          excavation: false,
          pressure_test: false,
          radiation: false
        },
        prepared_by: DataAccess.getCurrentUser(),
        reviewed_by: '',
        approved_by: '',
        created_at: new Date().toISOString()
      };
      const pageTitle = document.getElementById('jsaPageTitle');
      if (pageTitle) pageTitle.textContent = 'Form JSA Baru';
    }

    this._currentStep = 1;
    this.renderCurrentStep();
  },

  updateStepPills() {
    for (let i = 1; i <= 5; i++) {
      const pill = document.getElementById('jsaPill_' + i);
      if (pill) {
        pill.className = 'step-pill';
        if (i === this._currentStep) {
          pill.classList.add('step-pill--active');
        } else if (i < this._currentStep) {
          pill.classList.add('step-pill--done');
        }
      }
    }
  },

  renderCurrentStep() {
    this.updateStepPills();

    const prevBtn = document.getElementById('btnJSAPrev');
    const nextBtn = document.getElementById('btnJSANext');
    const finishBtn = document.getElementById('btnJSAFinish');

    if (prevBtn) prevBtn.style.display = this._currentStep > 1 ? 'inline-flex' : 'none';
    if (nextBtn) nextBtn.style.display = this._currentStep < 5 ? 'inline-flex' : 'none';
    if (finishBtn) finishBtn.style.display = this._currentStep === 5 ? 'inline-flex' : 'none';

    const stepContent = document.getElementById('jsaStepContent');
    if (stepContent) {
      stepContent.innerHTML = this.buildStepHTML(this._currentStep);
      this.fillStepData(this._currentStep);
    }
  },

  buildStepHTML(step) {
    const projects = DataAccess.getAllProjects();
    const projectOptions = projects.map(p => `<option value="${p.id}">${p.name}</option>`).join('');

    if (step === 1) {
      return `<div class="section-title">Informasi Umum</div>
        <div class="row g-3">
          <div class="col-sm-6">
            <label class="form-label">No. Dokumen</label>
            <input type="text" class="form-control" id="inputJSADocNumber" readonly style="background:var(--color-surface-2);">
          </div>
          <div class="col-sm-3">
            <label class="form-label">Revisi</label>
            <input type="text" class="form-control" id="inputJSARevision" value="0">
          </div>
          <div class="col-sm-3">
            <label class="form-label">Tanggal</label>
            <input type="date" class="form-control" id="inputJSADate">
          </div>
          <div class="col-12">
            <label class="form-label">Proyek <span class="text-danger">*</span></label>
            <select class="form-select" id="selectJSAProject">
              <option value="">-- Pilih --</option>
              ${projectOptions}
            </select>
          </div>
        </div>`;
    }

    if (step === 2) {
      let html = `<div class="section-title">APD (Alat Pelindung Diri)</div>
        <div class="apd-category-grid">`;

      for (const [key, workType] of Object.entries(WORK_TYPE_APD)) {
        html += `<div class="apd-category">
          <div class="apd-category__header">
            <input type="checkbox" class="apd-category-checkbox" data-category="${key}" id="apdCat_${key}" onchange="JSAPage.toggleAPDCategory('${key}')">
            <div class="apd-category__icon"><i class="bi ${workType.icon}"></i></div>
            <div class="apd-category__title">${workType.label}</div>
          </div>
          <div class="apd-category__items" id="apdItems_${key}">`;

        workType.items.forEach(item => {
          html += `<label class="apd-item">
            <input type="checkbox" class="apd-item-checkbox" data-category="${key}" data-item-id="${item.id}" value="${item.label}">
            <span>${item.label}</span>
          </label>`;
        });

        html += `</div></div>`;
      }

      html += `</div>
        <div class="mt-4">
          <label class="form-label">APD Kustom (pisahkan dengan koma)</label>
          <textarea class="form-control" id="inputJSAPPECustom" rows="2" placeholder="Contoh: Kacamata tambahan, Sarung tangan khusus, dll."></textarea>
          <small class="text-muted">Masukkan APD tambahan yang tidak tersedia di atas</small>
        </div>`;
      return html;
    }

    if (step === 3) {
      const wmOptions = this.getWorkMethodOptions();

      return `<div class="section-title">Identifikasi Bahaya</div>
        <div class="d-flex gap-2 mb-3 flex-wrap">
          ${wmOptions ? `
          <div class="d-flex align-items-center gap-2">
            <label class="form-label mb-0" style="white-space:nowrap;">Import dari Metode Kerja:</label>
            <select class="form-select form-select-sm" id="selectImportWorkMethod" style="width:auto;" onchange="JSAPage.importFromWorkMethod(this.value)">
              <option value="">-- Pilih Metode Kerja --</option>
              ${wmOptions}
            </select>
          </div>
          ` : ''}
          <button class="btn btn--sm btn--primary ms-auto" onclick="JSAPage.addHazardRow()">
            <i class="bi bi-plus-lg"></i> Tambah Manual
          </button>
        </div>
        <div class="table-responsive">
          <table class="hiradc-table">
            <thead>
              <tr>
                <th>No</th>
                <th>Tahapan *</th>
                <th>Bahaya *</th>
                <th>Dampak</th>
                <th>Pengendalian</th>
                <th></th>
              </tr>
            </thead>
            <tbody id="jsaHazardTbody"></tbody>
          </table>
        </div>`;
    }

    if (step === 4) {
      return `<div class="section-title">Tindakan Darurat</div>
        <div class="row g-3">
          <div class="col-sm-6">
            <label class="form-label">Jenis Darurat</label>
            <input class="form-control" id="inputJSAEmergencyType" placeholder="Contoh: Kebakaran, Kecelakaan Kerja, Gempa">
          </div>
          <div class="col-sm-6">
            <label class="form-label">Titik Kumpul</label>
            <input class="form-control" id="inputJSAEmergencyAssembly" placeholder="Lokasi titik kumpul darurat">
          </div>
          <div class="col-12">
            <label class="form-label">Prosedur</label>
            <textarea class="form-control" id="inputJSAEmergencyProcedure" rows="4" placeholder="Langkah-langkah yang harus dilakukan saat keadaan darurat..."></textarea>
          </div>
          <div class="col-sm-6">
            <label class="form-label">Nomor Darurat</label>
            <input class="form-control" id="inputJSAEmergencyNumber" placeholder="Contoh: 112, 113, 119">
          </div>
        </div>`;
    }

    if (step === 5) {
      return `<div class="section-title">Permit to Work & Approval</div>
        <div class="permit-grid">
          <label class="permit-item">
            <input type="checkbox" class="permit-checkbox" data-permit="hot_work" onchange="JSAPage.updatePermitState()">
            <span class="permit-item__icon">🔥</span>
            <span class="permit-item__label">Hot Work</span>
          </label>
          <label class="permit-item">
            <input type="checkbox" class="permit-checkbox" data-permit="confined_space" onchange="JSAPage.updatePermitState()">
            <span class="permit-item__icon">🚧</span>
            <span class="permit-item__label">Confined Space</span>
          </label>
          <label class="permit-item">
            <input type="checkbox" class="permit-checkbox" data-permit="working_height" onchange="JSAPage.updatePermitState()">
            <span class="permit-item__icon">📐</span>
            <span class="permit-item__label">Pekerjaan di Ketinggian</span>
          </label>
          <label class="permit-item">
            <input type="checkbox" class="permit-checkbox" data-permit="electrical" onchange="JSAPage.updatePermitState()">
            <span class="permit-item__icon">⚡</span>
            <span class="permit-item__label">Isolasi Listrik</span>
          </label>
          <label class="permit-item">
            <input type="checkbox" class="permit-checkbox" data-permit="lifting" onchange="JSAPage.updatePermitState()">
            <span class="permit-item__icon">🏗️</span>
            <span class="permit-item__label">Lifting / Pengangkatan</span>
          </label>
          <label class="permit-item">
            <input type="checkbox" class="permit-checkbox" data-permit="excavation" onchange="JSAPage.updatePermitState()">
            <span class="permit-item__icon">⛏️</span>
            <span class="permit-item__label">Penggalian (Excavation)</span>
          </label>
          <label class="permit-item">
            <input type="checkbox" class="permit-checkbox" data-permit="pressure_test" onchange="JSAPage.updatePermitState()">
            <span class="permit-item__icon">🔧</span>
            <span class="permit-item__label">Pressure Test</span>
          </label>
          <label class="permit-item">
            <input type="checkbox" class="permit-checkbox" data-permit="radiation" onchange="JSAPage.updatePermitState()">
            <span class="permit-item__icon">☢️</span>
            <span class="permit-item__label">Radiasi / Sinar</span>
          </label>
        </div>
        <hr>
        <div class="row g-3">
          <div class="col-sm-4">
            <label class="form-label">Disusun Oleh</label>
            <input type="text" class="form-control" id="inputJSAPreparedBy" placeholder="Nama penyusun">
          </div>
          <div class="col-sm-4">
            <label class="form-label">Diperiksa Oleh</label>
            <input type="text" class="form-control" id="inputJSAReviewedBy" placeholder="Nama pemeriksa">
          </div>
          <div class="col-sm-4">
            <label class="form-label">Disetujui Oleh</label>
            <input type="text" class="form-control" id="inputJSAApprovedBy" placeholder="Nama pemberi persetujuan">
          </div>
        </div>`;
    }

    return '';
  },

  getWorkMethodOptions() {
    const projectId = this._currentJSA?.project_id;
    if (!projectId) return '';

    const workMethods = DataAccess.getWorkMethodsByProject(projectId);
    if (!workMethods.length) return '';

    return workMethods.map(wm =>
      `<option value="${wm.id}">${wm.document_number} (${(wm.work_steps || []).length} langkah)</option>`
    ).join('');
  },

  importFromWorkMethod(wmId) {
    if (!wmId) return;

    const workMethod = DataAccess.getWorkMethodById(wmId);
    if (!workMethod || !workMethod.work_steps || !workMethod.work_steps.length) {
      UIService.showToast('Metode kerja tidak memiliki tahapan!', 'warning');
      return;
    }

    const tbody = document.getElementById('jsaHazardTbody');
    const existingRows = tbody ? tbody.querySelectorAll('tr[data-hazard-index]').length : 0;

    const shouldReplace = existingRows > 0
      ? confirm(`Ada ${existingRows} bahaya yang sudah ada.\n\nKlik OK untuk mengganti dengan tahapan dari Metode Kerja.\nKlik Batal untuk menambahkan di akhir.`)
      : true;

    if (shouldReplace && tbody) {
      this._currentJSA.hazard_identification = [];
      tbody.innerHTML = '';
    }

    workMethod.work_steps.forEach(step => {
      this.addHazardRow({
        step: step.work_stage || '',
        danger: '',
        impact: '',
        control: ''
      });
    });

    UIService.showToast(`${workMethod.work_steps.length} tahapan ${shouldReplace ? 'diimport' : 'ditambahkan'}!`, 'success');

    const selectElement = document.getElementById('selectImportWorkMethod');
    if (selectElement) selectElement.value = '';
  },

  fillStepData(step) {
    if (!this._currentJSA) return;

    const setValue = (elementId, value) => {
      const element = document.getElementById(elementId);
      if (element) element.value = value || '';
    };

    if (step === 1) {
      setValue('inputJSADocNumber', this._currentJSA.document_number);
      setValue('inputJSARevision', this._currentJSA.revision);
      setValue('inputJSADate', this._currentJSA.date);
      if (this._currentJSA.project_id) {
        setValue('selectJSAProject', this._currentJSA.project_id);
      }
    }

    if (step === 2) this.fillAPDData();
    if (step === 3) this.renderHazardRows();

    if (step === 4 && this._currentJSA.emergency) {
      setValue('inputJSAEmergencyType', this._currentJSA.emergency.type);
      setValue('inputJSAEmergencyProcedure', this._currentJSA.emergency.procedure);
      setValue('inputJSAEmergencyAssembly', this._currentJSA.emergency.assembly_point);
      setValue('inputJSAEmergencyNumber', this._currentJSA.emergency.emergency_number);
    }

    if (step === 5) {
      const permits = this._currentJSA.permits || {};
      document.querySelectorAll('.permit-checkbox').forEach(cb => {
        const permitKey = cb.getAttribute('data-permit');
        if (permitKey && permits[permitKey] !== undefined) {
          cb.checked = permits[permitKey] === true;
        }
      });
      setValue('inputJSAPreparedBy', this._currentJSA.prepared_by);
      setValue('inputJSAReviewedBy', this._currentJSA.reviewed_by);
      setValue('inputJSAApprovedBy', this._currentJSA.approved_by);
    }
  },

  collectStepData(step) {
    if (!this._currentJSA) return;

    const getValue = (elementId) => {
      const element = document.getElementById(elementId);
      return element ? (element.value || '') : '';
    };

    if (step === 1) {
      this._currentJSA.project_id = getValue('selectJSAProject');
      this._currentJSA.date = getValue('inputJSADate');
      this._currentJSA.revision = getValue('inputJSARevision');
    }

    if (step === 2) {
      this._currentJSA.ppe = this.collectAPDData();
    }

    if (step === 3) {
      this._currentJSA.hazard_identification = [];
      document.querySelectorAll('#jsaHazardTbody tr[data-hazard-index]').forEach(row => {
        this._currentJSA.hazard_identification.push({
          step: row.querySelector('.hazard-step')?.value?.trim() || '',
          danger: row.querySelector('.hazard-danger')?.value?.trim() || '',
          impact: row.querySelector('.hazard-impact')?.value?.trim() || '',
          control: row.querySelector('.hazard-control')?.value?.trim() || ''
        });
      });
    }

    if (step === 4) {
      this._currentJSA.emergency = {
        type: getValue('inputJSAEmergencyType'),
        procedure: getValue('inputJSAEmergencyProcedure'),
        assembly_point: getValue('inputJSAEmergencyAssembly'),
        emergency_number: getValue('inputJSAEmergencyNumber')
      };
    }

    if (step === 5) {
      const permits = {};
      document.querySelectorAll('.permit-checkbox').forEach(cb => {
        const permitKey = cb.getAttribute('data-permit');
        if (permitKey) {
          permits[permitKey] = cb.checked;
        }
      });
      this._currentJSA.permits = permits;
      this._currentJSA.prepared_by = getValue('inputJSAPreparedBy');
      this._currentJSA.reviewed_by = getValue('inputJSAReviewedBy');
      this._currentJSA.approved_by = getValue('inputJSAApprovedBy');
    }
  },

  goToPreviousStep() {
    if (this._currentStep > 1) {
      this.collectStepData(this._currentStep);
      this._currentStep--;
      this.renderCurrentStep();
    }
  },

  goToNextStep() {
    this.collectStepData(this._currentStep);

    if (this._currentStep === 1 && !this._currentJSA.project_id) {
      UIService.showToast('Pilih proyek!', 'warning');
      return;
    }

    if (this._currentStep < 5) {
      this._currentStep++;
      this.renderCurrentStep();
    }
  },

  saveAsDraft() {
    this.collectStepData(this._currentStep);
    DataAccess.saveJSA(this._currentJSA);
    UIService.showToast('Draft tersimpan!', 'success');
  },

  finishJSA() {
    this.collectStepData(5);
    DataAccess.saveJSA(this._currentJSA);
    UIService.showToast('JSA selesai!', 'success');
    setTimeout(() => this.showJSAList(), 1200);
  },

  // ==================== APD HANDLERS ====================
  toggleAPDCategory(categoryKey) {
    const categoryCheckbox = document.getElementById(`apdCat_${categoryKey}`);
    const isChecked = categoryCheckbox ? categoryCheckbox.checked : false;
    
    const itemCheckboxes = document.querySelectorAll(`.apd-item-checkbox[data-category="${categoryKey}"]`);
    itemCheckboxes.forEach(cb => {
      cb.checked = isChecked;
    });
  },

  collectAPDData() {
    const selectedItems = [];
    
    document.querySelectorAll('.apd-item-checkbox:checked').forEach(cb => {
      const itemLabel = cb.value;
      if (itemLabel) {
        selectedItems.push(itemLabel);
      }
    });
    
    const customText = document.getElementById('inputJSAPPECustom')?.value || '';
    const customItems = customText.split(/[,\n]+/).map(s => s.trim()).filter(Boolean);
    
    return {
      selected_items: selectedItems,
      custom_items: customItems
    };
  },

  fillAPDData() {
    const ppe = this._currentJSA.ppe || { selected_items: [], custom_items: [] };
    const selectedItems = ppe.selected_items || [];
    
    for (const [categoryKey, workType] of Object.entries(WORK_TYPE_APD)) {
      const categoryCheckbox = document.getElementById(`apdCat_${categoryKey}`);
      let anyChecked = false;
      
      workType.items.forEach(item => {
        const itemCheckbox = document.querySelector(`.apd-item-checkbox[data-category="${categoryKey}"][data-item-id="${item.id}"]`);
        if (itemCheckbox) {
          const isChecked = selectedItems.includes(item.label);
          itemCheckbox.checked = isChecked;
          if (isChecked) anyChecked = true;
        }
      });
      
      if (categoryCheckbox) {
        categoryCheckbox.checked = anyChecked;
      }
    }
    
    const customInput = document.getElementById('inputJSAPPECustom');
    if (customInput && ppe.custom_items) {
      customInput.value = ppe.custom_items.join(', ');
    }
  },

  // ==================== PERMIT HANDLERS ====================
  updatePermitState() {

  },

  // ==================== HAZARD ROW HANDLERS ====================
  addHazardRow(hazardData = {}) {
    const tbody = document.getElementById('jsaHazardTbody');
    if (!tbody) return;

    const hazardIndex = tbody.querySelectorAll('tr[data-hazard-index]').length;
    const row = document.createElement('tr');
    row.setAttribute('data-hazard-index', hazardIndex);

    row.innerHTML = `<td class="text-center">${hazardIndex + 1}</td>
      <td><textarea class="hazard-step" rows="1" placeholder="Tahapan pekerjaan">${this.escapeHtml(hazardData.step || '')}</textarea></td>
      <td><textarea class="hazard-danger" rows="1" placeholder="Potensi bahaya">${this.escapeHtml(hazardData.danger || '')}</textarea></td>
      <td><textarea class="hazard-impact" rows="1" placeholder="Dampak jika terjadi">${this.escapeHtml(hazardData.impact || '')}</textarea></td>
      <td><textarea class="hazard-control" rows="1" placeholder="Pengendalian risiko">${this.escapeHtml(hazardData.control || '')}</textarea></td>
      <td class="text-center">
        <button class="btn btn--xs btn--outline-danger" onclick="this.closest('tr').remove()">
          <i class="bi bi-trash"></i>
        </button>
      </td>`;

    tbody.appendChild(row);
  },

  renderHazardRows() {
    const tbody = document.getElementById('jsaHazardTbody');
    if (tbody) {
      tbody.innerHTML = '';
      (this._currentJSA.hazard_identification || []).forEach(hazard => this.addHazardRow(hazard));
      if (!(this._currentJSA.hazard_identification || []).length) this.addHazardRow();
    }
  },

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  loadJSAList() {
    let jsaList = DataAccess.getAllJSA();
    const searchInput = document.getElementById('inputSearchJSA');
    const projectSelect = document.getElementById('selectFilterJSAProject');
    
    const searchQuery = (searchInput?.value || '').toLowerCase();
    const projectId = projectSelect?.value || '';

    if (searchQuery) {
      jsaList = jsaList.filter(jsa => (jsa.document_number || '').toLowerCase().includes(searchQuery));
    }
    if (projectId) {
      jsaList = jsaList.filter(jsa => jsa.project_id === projectId);
    }

    jsaList.sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at));

    const tableBody = document.getElementById('jsaTableBody');
    const cardList = document.getElementById('jsaCardList');

    if (!jsaList.length) {
      if (tableBody) {
        tableBody.innerHTML = '<tr><td colspan="4" class="text-center py-5">Tidak ada JSA</td></tr>';
      }
      if (cardList) {
        cardList.innerHTML = '<div class="empty-state">Tidak ada JSA</div>';
      }
    } else {
      if (tableBody) {
        tableBody.innerHTML = jsaList.map(jsa => {
          const project = DataAccess.getProjectById(jsa.project_id);
          return `<tr>
            <td><strong>${jsa.document_number}</strong></td>
            <td>${project?.name || '-'}</td>
            <td>${UtilityService.formatDate(jsa.date)}</td>
            <td class="text-center">
              <button class="btn btn--xs btn--outline-warning me-1" onclick="JSAPage.editJSA('${jsa.id}')">
                <i class="bi bi-pencil"></i>
              </button>
              <button class="btn btn--xs btn--outline-danger" onclick="JSAPage.deleteJSA('${jsa.id}')">
                <i class="bi bi-trash"></i>
              </button>
            </td>
          </tr>`;
        }).join('');
      }

      if (cardList) {
        cardList.innerHTML = jsaList.map(jsa => {
          return `<div class="card">
            <div class="card-body">
              <div style="font-weight:700;">${jsa.document_number}</div>
              <div style="display:flex;gap:7px;margin-top:8px;">
                <button class="btn btn--xs btn--outline-warning" onclick="JSAPage.editJSA('${jsa.id}')">Edit</button>
                <button class="btn btn--xs btn--outline-danger" onclick="JSAPage.deleteJSA('${jsa.id}')">Hapus</button>
              </div>
            </div>
          </div>`;
        }).join('');
      }
    }
  },

  editJSA(jsaId) {
    const jsa = DataAccess.getJSAById(jsaId);
    if (jsa) this.showJSAForm(jsa);
  },

  deleteJSA(jsaId) {
    if (!confirm('Hapus JSA ini?')) return;
    DataAccess.deleteJSA(jsaId);
    this.loadJSAList();
    UIService.showToast('JSA dihapus.', 'warning');
  }
};