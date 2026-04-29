const WorkMethodPage = {
  _currentWorkMethod: null,
  _currentStep: 1,

  render() {
    return `<div id="workMethodListView">
      <div class="page-header no-print">
        <h2 class="page-title">
          <span class="page-title__icon"><i class="bi bi-diagram-3"></i></span>Metode Kerja
        </h2>
        <button class="btn btn--primary btn--lg" onclick="WorkMethodPage.showWorkMethodForm()">
          <i class="bi bi-plus-lg"></i> Metode Kerja Baru
        </button>
      </div>

      <div class="card">
        <div class="card-body" style="padding:12px;">
          <div class="row g-2">
            <div class="col-8 col-sm-4">
              <div class="input-search">
                <i class="bi bi-search"></i>
                <input type="text" class="form-control form-control-sm" id="inputSearchWorkMethod" placeholder="Cari..." oninput="WorkMethodPage.loadWorkMethodList()">
              </div>
            </div>
            <div class="col-4 col-sm-3">
              <select class="form-select form-select-sm" id="selectFilterWorkMethodProject" onchange="WorkMethodPage.loadWorkMethodList()">
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
                  <th class="text-center">Aksi</th>
                </tr>
              </thead>
              <tbody id="workMethodTableBody"></tbody>
            </table>
          </div>
        </div>
      </div>

      <div id="workMethodCardList" class="d-md-none"></div>
    </div>

    <div id="workMethodFormView" style="display:none;">
      <div class="page-header no-print">
        <h2 class="page-title">
          <span class="page-title__icon"><i class="bi bi-diagram-3"></i></span>
          <span id="workMethodPageTitle">Metode Kerja Baru</span>
        </h2>
        <div class="d-flex gap-2">
          <button class="btn btn--outline-secondary btn--sm" onclick="WorkMethodPage.saveAsDraft()">
            <i class="bi bi-cloud-check"></i> Draft
          </button>
          <button class="btn btn--outline-danger btn--sm" onclick="WorkMethodPage.showWorkMethodList()">
            <i class="bi bi-x-lg"></i> Batal
          </button>
        </div>
      </div>

      <div class="wizard">
        <div class="wizard__header no-print">
          <div class="wizard__title">
            <i class="bi bi-diagram-3"></i> Work Method Statement
          </div>
          <div class="step-pills" id="workMethodStepPills"></div>
        </div>
        <div class="wizard__body">
          <div id="workMethodStepContent" class="step-content"></div>
        </div>
        <div class="wizard__footer no-print">
          <button class="btn btn--outline-secondary" id="btnWorkMethodPrev" onclick="WorkMethodPage.goToPreviousStep()">
            <i class="bi bi-arrow-left"></i> Sebelumnya
          </button>
          <div class="ms-auto d-flex gap-2">
            <button class="btn btn--primary" id="btnWorkMethodNext" onclick="WorkMethodPage.goToNextStep()">
              Lanjut <i class="bi bi-arrow-right"></i>
            </button>
            <button class="btn btn--success" id="btnWorkMethodFinish" onclick="WorkMethodPage.finishWorkMethod()">
              <i class="bi bi-check-lg"></i> Selesaikan
            </button>
          </div>
        </div>
      </div>
    </div>`;
  },

  init() {
    this._currentWorkMethod = null;
    this._currentStep = 1;

    const projectSelect = document.getElementById('selectFilterWorkMethodProject');
    projectSelect.innerHTML = '<option value="">Semua Proyek</option>';
    DataAccess.getAllProjects().forEach(project => {
      const option = document.createElement('option');
      option.value = project.id;
      option.textContent = project.name;
      projectSelect.appendChild(option);
    });

    this.loadWorkMethodList();
  },

  showWorkMethodList() {
    document.getElementById('workMethodListView').style.display = 'block';
    document.getElementById('workMethodFormView').style.display = 'none';
    this.loadWorkMethodList();
  },

  showWorkMethodForm(workMethodData = null) {
    if (!DataAccess.hasProjects()) {
      UIService.showToast('Buat proyek terlebih dahulu!', 'warning');
      UIService.navigate('proyek');
      return;
    }

    document.getElementById('workMethodListView').style.display = 'none';
    document.getElementById('workMethodFormView').style.display = 'block';

    if (workMethodData) {
      this._currentWorkMethod = JSON.parse(JSON.stringify(workMethodData));
      document.getElementById('workMethodPageTitle').textContent = 'Edit: ' + this._currentWorkMethod.document_number;
    } else {
      this._currentWorkMethod = {
        id: 'wm_' + Date.now(),
        project_id: '',
        document_number: UtilityService.generateWMDocNumber(),
        revision: '0',
        date: new Date().toISOString().split('T')[0],
        work_steps: [],
        prepared_by: DataAccess.getCurrentUser(),
        reviewed_by: '',
        approved_by: '',
        created_at: new Date().toISOString()
      };
      document.getElementById('workMethodPageTitle').textContent = 'Metode Kerja Baru';
    }

    this.buildStepPills();
    this._currentStep = 1;
    this.renderCurrentStep();
  },

  buildStepPills() {
    const stepLabels = ['Info Umum', 'Langkah Kerja', 'Approval'];
    document.getElementById('workMethodStepPills').innerHTML = stepLabels.map((label, index) => {
      const stepNumber = index + 1;
      return `<div class="step-pill" id="workMethodPill_${stepNumber}">
        <span class="step-pill__number" id="workMethodPillNumber_${stepNumber}">${stepNumber}</span>${label}
      </div>`;
    }).join('');
  },

  updateStepPills() {
    for (let i = 1; i <= 3; i++) {
      const pill = document.getElementById('workMethodPill_' + i);
      const pillNumber = document.getElementById('workMethodPillNumber_' + i);
      if (!pill || !pillNumber) continue;

      pill.className = 'step-pill';
      if (i === this._currentStep) {
        pill.classList.add('step-pill--active');
      } else if (i < this._currentStep) {
        pill.classList.add('step-pill--done');
      }

      pillNumber.innerHTML = i < this._currentStep
        ? '<i class="bi bi-check-lg" style="font-size:.6rem;"></i>'
        : i;
    }
  },

  renderCurrentStep() {
    this.updateStepPills();

    document.getElementById('btnWorkMethodPrev').style.display = this._currentStep > 1 ? 'inline-flex' : 'none';
    document.getElementById('btnWorkMethodNext').style.display = this._currentStep < 3 ? 'inline-flex' : 'none';
    document.getElementById('btnWorkMethodFinish').style.display = this._currentStep === 3 ? 'inline-flex' : 'none';

    const stepContent = document.getElementById('workMethodStepContent');
    stepContent.innerHTML = this.buildStepHTML(this._currentStep);
    this.fillStepData(this._currentStep);
  },

  buildStepHTML(step) {
    const projects = DataAccess.getAllProjects();
    const projectOptions = projects.map(p => `<option value="${p.id}">${p.name}</option>`).join('');

    if (step === 1) {
      return `<div class="section-title">Informasi Umum</div>
        <div class="row g-3">
          <div class="col-sm-6">
            <label class="form-label">No. Dokumen</label>
            <input type="text" class="form-control" id="inputWMDocNumber" readonly style="background:var(--color-surface-2);">
          </div>
          <div class="col-sm-3">
            <label class="form-label">Revisi</label>
            <input type="text" class="form-control" id="inputWMRevision" value="0">
          </div>
          <div class="col-sm-3">
            <label class="form-label">Tanggal</label>
            <input type="date" class="form-control" id="inputWMDate">
          </div>
          <div class="col-sm-6">
            <label class="form-label">Proyek <span class="text-danger">*</span></label>
            <select class="form-select" id="selectWMProject">
              <option value="">-- Pilih --</option>
              ${projectOptions}
            </select>
          </div>
        </div>`;
    }

    if (step === 2) {
      return `<div class="section-title">Langkah Kerja</div>
        <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
          <p class="text-muted mb-0">Uraian langkah kerja</p>
          <button class="btn btn--sm btn--primary" onclick="WorkMethodPage.addWorkStep()">
            <i class="bi bi-plus-lg"></i> Tambah
          </button>
        </div>
        <div class="table-responsive">
          <table class="hiradc-table">
            <thead>
              <tr>
                <th>Nomor</th>
                <th>Tahapan Kerja</th>
                <th>Alat Kerja</th>
                <th>Proses / Kegiatan Pekerjaan</th>
                <th></th>
              </tr>
            </thead>
            <tbody id="workMethodStepsTbody"></tbody>
          </table>
        </div>`;
    }

    if (step === 3) {
      return `<div class="section-title">Approval</div>
        <div class="row g-3">
          <div class="col-sm-4">
            <label class="form-label">Disusun Oleh</label>
            <input type="text" class="form-control" id="inputWMPreparedBy">
          </div>
          <div class="col-sm-4">
            <label class="form-label">Diperiksa Oleh</label>
            <input type="text" class="form-control" id="inputWMReviewedBy">
          </div>
          <div class="col-sm-4">
            <label class="form-label">Disetujui Oleh</label>
            <input type="text" class="form-control" id="inputWMApprovedBy">
          </div>
        </div>`;
    }

    return '';
  },

  fillStepData(step) {
    if (!this._currentWorkMethod) return;

    const setValue = (elementId, value) => {
      const element = document.getElementById(elementId);
      if (element) element.value = value || '';
    };

    if (step === 1) {
      setValue('inputWMDocNumber', this._currentWorkMethod.document_number);
      setValue('inputWMRevision', this._currentWorkMethod.revision);
      setValue('inputWMDate', this._currentWorkMethod.date);
      if (this._currentWorkMethod.project_id) {
        setValue('selectWMProject', this._currentWorkMethod.project_id);
      }
    }

    if (step === 2) {
      this.renderWorkSteps();
    }

    if (step === 3) {
      setValue('inputWMPreparedBy', this._currentWorkMethod.prepared_by);
      setValue('inputWMReviewedBy', this._currentWorkMethod.reviewed_by);
      setValue('inputWMApprovedBy', this._currentWorkMethod.approved_by);
    }
  },

  collectStepData(step) {
    if (!this._currentWorkMethod) return;

    const getValue = (elementId) => {
      const element = document.getElementById(elementId);
      return element ? (element.value || '') : '';
    };

    if (step === 1) {
      this._currentWorkMethod.project_id = getValue('selectWMProject');
      this._currentWorkMethod.date = getValue('inputWMDate');
      this._currentWorkMethod.revision = getValue('inputWMRevision');
    }

    if (step === 2) {
      this._currentWorkMethod.work_steps = [];
      document.querySelectorAll('#workMethodStepsTbody tr[data-step-index]').forEach((row, index) => {
        this._currentWorkMethod.work_steps.push({
          step_number: index + 1,
          work_stage: row.querySelector('.ws-work-stage')?.value?.trim() || '',
          tools: row.querySelector('.ws-tools')?.value?.trim() || '',
          work_process: row.querySelector('.ws-work-process')?.value?.trim() || ''
        });
      });
    }

    if (step === 3) {
      this._currentWorkMethod.prepared_by = getValue('inputWMPreparedBy');
      this._currentWorkMethod.reviewed_by = getValue('inputWMReviewedBy');
      this._currentWorkMethod.approved_by = getValue('inputWMApprovedBy');
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

    if (this._currentStep === 1 && !this._currentWorkMethod.project_id) {
      UIService.showToast('Pilih proyek!', 'warning');
      return;
    }

    if (this._currentStep < 3) {
      this._currentStep++;
      this.renderCurrentStep();
    }
  },

  saveAsDraft() {
    this.collectStepData(this._currentStep);
    DataAccess.saveWorkMethod(this._currentWorkMethod);
    UIService.showToast('Draft tersimpan!', 'success');
  },

  finishWorkMethod() {
    this.collectStepData(3);

    if (!this._currentWorkMethod.work_steps?.length) {
      UIService.showToast('Minimal 1 langkah kerja!', 'warning');
      return;
    }

    DataAccess.saveWorkMethod(this._currentWorkMethod);
    UIService.showToast('Metode Kerja selesai!', 'success');
    setTimeout(() => this.showWorkMethodList(), 1200);
  },

  addWorkStep(stepData = {}) {
    const tbody = document.getElementById('workMethodStepsTbody');
    if (!tbody) return;

    const stepIndex = tbody.querySelectorAll('tr[data-step-index]').length;
    const row = document.createElement('tr');
    row.setAttribute('data-step-index', stepIndex);

    row.innerHTML = `<td class="text-center ws-step-number" style="font-weight:700;font-size:.74rem;">${stepIndex + 1}</td>
      <td><textarea class="ws-work-stage" rows="2">${stepData.work_stage || ''}</textarea></td>
      <td><textarea class="ws-tools" rows="2">${stepData.tools || ''}</textarea></td>
      <td><textarea class="ws-work-process" rows="2">${stepData.work_process || ''}</textarea></td>
      <td class="text-center">
        <button class="btn btn--xs btn--outline-danger" onclick="this.closest('tr').remove()">
          <i class="bi bi-trash"></i>
        </button>
      </td>`;

    tbody.appendChild(row);
  },

  renderWorkSteps() {
    const tbody = document.getElementById('workMethodStepsTbody');
    if (!tbody) return;

    tbody.innerHTML = '';
    const steps = this._currentWorkMethod.work_steps || [];

    if (steps.length) {
      steps.forEach(step => this.addWorkStep(step));
    } else {
      this.addWorkStep();
    }
  },

  loadWorkMethodList() {
    let workMethods = DataAccess.getAllWorkMethods();
    const searchQuery = (document.getElementById('inputSearchWorkMethod').value || '').toLowerCase();
    const projectId = document.getElementById('selectFilterWorkMethodProject').value;

    if (searchQuery) {
      workMethods = workMethods.filter(wm => (wm.document_number || '').toLowerCase().includes(searchQuery));
    }
    if (projectId) {
      workMethods = workMethods.filter(wm => wm.project_id === projectId);
    }

    workMethods.sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at));

    const tableBody = document.getElementById('workMethodTableBody');

    if (!workMethods.length) {
      tableBody.innerHTML = '<tr><td colspan="3" class="text-center py-5">Tidak ada metode kerja</td></tr>';
    } else {
      tableBody.innerHTML = workMethods.map(wm => `<tr>
        <td><strong>${wm.document_number}</strong></td>
        <td>${DataAccess.getProjectById(wm.project_id)?.name || '-'}</td>
        <td class="text-center">
          <button class="btn btn--xs btn--outline-warning me-1" onclick="WorkMethodPage.editWorkMethod('${wm.id}')">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn--xs btn--outline-danger" onclick="WorkMethodPage.deleteWorkMethod('${wm.id}')">
            <i class="bi bi-trash"></i>
          </button>
        </td>
      </tr>`).join('');
    }

    document.getElementById('workMethodCardList').innerHTML = workMethods.length
      ? workMethods.map(wm => `<div class="card">
          <div class="card-body" style="padding:13px;">
            <div style="font-weight:700;">${wm.document_number}</div>
            <div style="font-size:.7rem;">${DataAccess.getProjectById(wm.project_id)?.name || '-'}</div>
            <div style="display:flex;gap:7px;margin-top:8px;">
              <button class="btn btn--xs btn--outline-warning" onclick="WorkMethodPage.editWorkMethod('${wm.id}')">Edit</button>
              <button class="btn btn--xs btn--outline-danger" onclick="WorkMethodPage.deleteWorkMethod('${wm.id}')">Hapus</button>
            </div>
          </div>
        </div>`).join('')
      : '<div class="empty-state">Tidak ada metode kerja</div>';
  },

  editWorkMethod(methodId) {
    const workMethod = DataAccess.getWorkMethodById(methodId);
    if (workMethod) this.showWorkMethodForm(workMethod);
  },

  deleteWorkMethod(methodId) {
    if (!confirm('Hapus metode kerja ini?')) return;
    DataAccess.deleteWorkMethod(methodId);
    this.loadWorkMethodList();
    UIService.showToast('Metode kerja dihapus.', 'warning');
  }
};
