// laporan.js
const ReportPage = {
  _currentReportType: 'jsa',

  render() {
    return `<div id="reportListView">
      <div class="page-header no-print">
        <h2 class="page-title">
          <span class="page-title__icon"><i class="bi bi-file-earmark-pdf"></i></span>Laporan
        </h2>
        <button class="btn btn--primary btn--sm" onclick="window.print()">
          <i class="bi bi-printer"></i> Cetak PDF
        </button>
      </div>

      <div class="card no-print">
        <div class="card-body" style="padding:12px;">
          <div class="row g-2">
            <div class="col-12 col-sm-4">
              <select class="form-select form-select-sm" id="selectReportProject" onchange="ReportPage.onProjectChange()">
                <option value="">Semua Proyek</option>
              </select>
            </div>
            <div class="col-12 col-sm-4">
              <div id="reportDocSelector"></div>
            </div>
            <div class="col-12 col-sm-4">
              <div class="tab-nav" id="reportTabs" style="margin-bottom:0;border-bottom:none;">
                <button class="tab-nav__btn tab-nav__btn--active" onclick="ReportPage.switchReportTab('jsa')">JSA</button>
                <button class="tab-nav__btn" onclick="ReportPage.switchReportTab('wm')">Metode Kerja</button>
                <button class="tab-nav__btn" onclick="ReportPage.switchReportTab('po')">Pembelian</button>
                <button class="tab-nav__btn" onclick="ReportPage.switchReportTab('project')">Proyek</button>
                <button class="tab-nav__btn" onclick="ReportPage.switchReportTab('cashflow')">Keuangan</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div id="reportOutput">
        <div class="report-container">
          <div class="empty-state">
            <p>Pilih tipe laporan di atas</p>
          </div>
        </div>
      </div>
    </div>`;
  },

  init() {
    const projectSelect = document.getElementById('selectReportProject');
    if (projectSelect) {
      projectSelect.innerHTML = '<option value="">Semua Proyek</option>';
      DataAccess.getAllProjects().forEach(project => {
        const option = document.createElement('option');
        option.value = project.id;
        option.textContent = project.name;
        projectSelect.appendChild(option);
      });
    }

    if (!DataAccess.hasProjects()) {
      const docSelector = document.getElementById('reportDocSelector');
      if (docSelector) docSelector.innerHTML = '';

      document.getElementById('reportOutput').innerHTML = UIService.showFlowBanner(
        'bi-clipboard-plus',
        'Belum Ada Proyek',
        'Buat proyek terlebih dahulu sebelum mencetak laporan. Semua laporan harus terikat pada proyek yang telah dibuat.',
        '<i class="bi bi-clipboard-data"></i> Buat Proyek',
        "UIService.navigate('proyek')"
      );
      return;
    }

    this.switchReportTab('jsa');
  },

  onProjectChange() {
    this.buildDocSelector(this._currentReportType);
    this.renderReport();
  },

  switchReportTab(reportType) {
    this._currentReportType = reportType;

    document.querySelectorAll('#reportTabs .tab-nav__btn').forEach((btn, idx) => {
      const tabs = ['jsa', 'wm', 'po', 'project', 'cashflow'];
      btn.classList.toggle('tab-nav__btn--active', tabs[idx] === reportType);
    });

    this.buildDocSelector(reportType);
    this.renderReport();
  },

  buildDocSelector(reportType) {
    const projectId = document.getElementById('selectReportProject')?.value || '';
    let selectorHTML = '';

    if (reportType === 'jsa') {
      let list = DataAccess.getAllJSA();
      if (projectId) list = list.filter(j => j.project_id === projectId);
      selectorHTML = `<select class="form-select form-select-sm" id="selectReportDoc" onchange="ReportPage.renderReport()">
        <option value="">-- Semua Data (${list.length}) --</option>
        ${list.map(j => `<option value="${j.id}">${j.document_number}</option>`).join('')}
      </select>`;
    } else if (reportType === 'wm') {
      let list = DataAccess.getAllWorkMethods();
      if (projectId) list = list.filter(w => w.project_id === projectId);
      selectorHTML = `<select class="form-select form-select-sm" id="selectReportDoc" onchange="ReportPage.renderReport()">
        <option value="">-- Semua Data (${list.length}) --</option>
        ${list.map(w => `<option value="${w.id}">${w.document_number}</option>`).join('')}
      </select>`;
    } else if (reportType === 'po') {
      let list = DataAccess.getAllPO();
      if (projectId) list = list.filter(p => p.project_id === projectId);
      selectorHTML = `<select class="form-select form-select-sm" id="selectReportDoc" onchange="ReportPage.renderReport()">
        <option value="">-- Semua Data (${list.length}) --</option>
        ${list.map(p => `<option value="${p.id}">${p.material_name || p.id} — ${UtilityService.formatCurrency(p.total_price)}</option>`).join('')}
      </select>`;
    } else {
      const container = document.getElementById('reportDocSelector');
      if (container) container.innerHTML = '';
      return;
    }

    const container = document.getElementById('reportDocSelector');
    if (container) container.innerHTML = selectorHTML;
  },

  renderReport() {
    const projectId = document.getElementById('selectReportProject')?.value || '';
    const docSelect = document.getElementById('selectReportDoc');
    const docId = docSelect ? docSelect.value : '';
    const company = DataAccess.getCompany();

    let reportHTML = '<div class="report-container">';

    switch (this._currentReportType) {
      case 'jsa':
        reportHTML += this.buildJSAReport(docId, projectId, company);
        break;
      case 'wm':
        reportHTML += this.buildWMReport(docId, projectId, company);
        break;
      case 'po':
        reportHTML += this.buildPOReport(docId, projectId, company);
        break;
      case 'project':
        reportHTML += this.buildProjectReport(projectId, company);
        break;
      case 'cashflow':
        reportHTML += this.buildCashflowReport(projectId, company);
        break;
      default:
        reportHTML += '<div class="alert alert-info">Pilih tipe laporan di atas</div>';
    }

    reportHTML += '</div>';
    document.getElementById('reportOutput').innerHTML = reportHTML;
  },

  createReportRow(label, value) {
    return `<tr>
      <td width="28%" style="font-weight:600;background:#f8fafc;">${label}</td>
      <td>${value || '-'}</td>
    </tr>`;
  },

  // ==================== COMMON HEADER BUILDER ====================
  buildReportHeader(company, title, subtitle = '', titleIcon = 'bi-file-earmark-pdf') {
    if (!company) {
      return `<div class="report-header">
        <div class="report-header__content">
          <div class="report-header__title">
            <i class="bi ${titleIcon}"></i> ${title}
          </div>
          ${subtitle ? `<div class="report-header__subtitle">${subtitle}</div>` : ''}
          <div class="report-header__date">Tanggal Cetak: ${UtilityService.formatDate(new Date().toISOString())}</div>
        </div>
      </div>`;
    }

    return `<div class="report-header">
      <div class="report-header__layout">
        <div class="report-header__logo-section">
          ${company.logo 
            ? `<img src="${company.logo}" class="report-header__logo-img" alt="Logo Perusahaan">`
            : `<div class="report-header__logo-placeholder">
                <i class="bi bi-building"></i>
              </div>`
          }
        </div>
        <div class="report-header__company-info">
          <div class="report-header__company-name">${this.escapeHtml(company.name)}</div>
          ${company.address ? `<div class="report-header__company-detail"><i class="bi bi-geo-alt"></i> ${this.escapeHtml(company.address)}</div>` : ''}
          <div class="report-header__company-contact">
            ${company.contact ? `<span><i class="bi bi-telephone"></i> ${this.escapeHtml(company.contact)}</span>` : ''}
            ${company.email ? `<span><i class="bi bi-envelope"></i> ${this.escapeHtml(company.email)}</span>` : ''}
          </div>
          ${company.website ? `<div class="report-header__company-detail"><i class="bi bi-globe"></i> ${this.escapeHtml(company.website)}</div>` : ''}
        </div>
        <div class="report-header__doc-info">
          <div class="report-header__doc-type">${title}</div>
          ${subtitle ? `<div class="report-header__doc-number">${subtitle}</div>` : ''}
          <div class="report-header__date">${UtilityService.formatDate(new Date().toISOString())}</div>
        </div>
      </div>
    </div>`;
  },

  // ==================== COMMON FOOTER BUILDER ====================
  buildReportFooter(company) {
    if (!company) return '';
    
    return `<div class="report-footer no-screen">
      <div class="report-footer__content">
        <div class="report-footer__left">
          <strong>${this.escapeHtml(company.name)}</strong>
          ${company.address ? ` | ${this.escapeHtml(company.address)}` : ''}
        </div>
        <div class="report-footer__right">
          ${company.contact ? `Telp: ${this.escapeHtml(company.contact)}` : ''}
          ${company.email ? ` | Email: ${this.escapeHtml(company.email)}` : ''}
        </div>
      </div>
      <div class="report-footer__disclaimer">
        Dokumen ini dicetak dari sistem KPT Project v4.0 | Halaman ini sah tanpa tanda tangan basah
      </div>
    </div>`;
  },

  // ==================== PROJECT INFO SECTION BUILDER ====================
  buildProjectInfoSection(project, includeAllFields = true) {
    if (!project) return '';

    let html = `<div class="report-section-title">Informasi Proyek</div>
      <table class="table table-bordered table-sm">
        <tbody>
          ${this.createReportRow('Nama Proyek', `<strong>${this.escapeHtml(project.name)}</strong>`)}
          ${this.createReportRow('Client / Owner', project.client)}
          ${this.createReportRow('Lokasi Proyek', project.location)}
          ${this.createReportRow('Penanggung Jawab (PIC)', project.pic)}`;

    if (includeAllFields) {
      html += `${this.createReportRow('Nilai Kontrak', UtilityService.formatCurrency(project.contract_value))}
          ${this.createReportRow('Tanggal Mulai', project.start_date ? UtilityService.formatDate(project.start_date) : '-')}
          ${this.createReportRow('Tanggal Selesai', project.end_date ? UtilityService.formatDate(project.end_date) : '-')}
          ${this.createReportRow('Periode Pelaksanaan', 
            (project.start_date ? UtilityService.formatDate(project.start_date) : '-') + ' s/d ' + 
            (project.end_date ? UtilityService.formatDate(project.end_date) : '-')
          )}`;
    }

    html += `</tbody></table>`;
    return html;
  },

  // ==================== JSA REPORT ====================
  buildJSAReport(docId, projectId, company) {
    let jsaList = DataAccess.getAllJSA();
    if (projectId) jsaList = jsaList.filter(j => j.project_id === projectId);
    if (docId) jsaList = jsaList.filter(j => j.id === docId);

    if (!jsaList.length) {
      return '<div class="alert alert-info">Tidak ada data JSA untuk filter yang dipilih.</div>';
    }

    let html = '';

    jsaList.forEach((jsa, index) => {
      const project = DataAccess.getProjectById(jsa.project_id);

      // Build complete header with company data
      if (index === 0) {
        html += this.buildReportHeader(
          company, 
          'JOB SAFETY ANALYSIS (JSA)', 
          jsa.document_number,
          'bi-journal-check'
        );
      } else {
        html += `<div class="page-break"></div>`;
        html += this.buildReportHeader(
          company, 
          'JOB SAFETY ANALYSIS (JSA)', 
          jsa.document_number,
          'bi-journal-check'
        );
      }

      // Project information section
      html += this.buildProjectInfoSection(project, false);
      
      // Additional JSA-specific info
      html += `<table class="table table-bordered table-sm">
        <tbody>
          ${this.createReportRow('No. Dokumen JSA', `<strong>${jsa.document_number}</strong>`)}
          ${this.createReportRow('Revisi', jsa.revision || '0')}
          ${this.createReportRow('Tanggal Pembuatan', UtilityService.formatDate(jsa.date))}
        </tbody>
      </table>`;

      // 1. APD Section
      const apdItems = [];
      
      if (jsa.ppe?.selected_items && Array.isArray(jsa.ppe.selected_items)) {
        apdItems.push(...jsa.ppe.selected_items);
      }
      
      if (jsa.ppe?.custom_items && Array.isArray(jsa.ppe.custom_items)) {
        apdItems.push(...jsa.ppe.custom_items.filter(item => item));
      }

      html += `<div class="report-section-title">1. Alat Pelindung Diri (APD)</div>
        <div class="mb-3">
          ${apdItems.length 
            ? apdItems.map(item => `<span class="badge bg-light text-dark me-1 mb-1" style="padding:6px 12px;font-size:0.75rem;">${this.escapeHtml(item)}</span>`).join('') 
            : '<span class="text-muted">Tidak ada APD yang dipilih</span>'}
        </div>`;

      // 2. Identifikasi Bahaya
      html += `<div class="report-section-title">2. Identifikasi Bahaya & Pengendalian Risiko</div>
        <table class="table table-bordered table-sm">
          <thead>
            <tr>
              <th style="width:40px;">No</th>
              <th style="width:25%;">Tahapan Pekerjaan</th>
              <th style="width:25%;">Potensi Bahaya</th>
              <th style="width:25%;">Dampak</th>
              <th style="width:25%;">Pengendalian Risiko</th>
            </tr>
          </thead>
          <tbody>`;

      (jsa.hazard_identification || []).forEach((hazard, i) => {
        html += `<tr>
          <td class="text-center">${i + 1}</td>
          <td>${this.escapeHtml(hazard.step || '-')}</td>
          <td>${this.escapeHtml(hazard.danger || '-')}</td>
          <td>${this.escapeHtml(hazard.impact || '-')}</td>
          <td>${this.escapeHtml(hazard.control || '-')}</td>
        </tr>`;
      });

      if (!(jsa.hazard_identification || []).length) {
        html += `<tr><td colspan="5" class="text-center text-muted">Tidak ada data identifikasi bahaya</td></tr>`;
      }

      html += `</tbody></table>`;

      // 3. Tindakan Darurat
      let sectionNum = 3;
      if (jsa.emergency?.type || jsa.emergency?.procedure || jsa.emergency?.assembly_point || jsa.emergency?.emergency_number) {
        html += `<div class="report-section-title">${sectionNum}. Prosedur Tanggap Darurat</div>
          <table class="table table-bordered table-sm">
            <tbody>
              ${this.createReportRow('Jenis Keadaan Darurat', jsa.emergency.type || '-')}
              ${this.createReportRow('Prosedur Penanganan', this.escapeHtml(jsa.emergency.procedure || '-'))}
              ${this.createReportRow('Titik Kumpul (Assembly Point)', jsa.emergency.assembly_point || '-')}
              ${this.createReportRow('Nomor Telepon Darurat', jsa.emergency.emergency_number || '-')}
            </tbody>
          </table>`;
        sectionNum++;
      }

      // 4. Permit to Work
      const activePermits = Object.entries(jsa.permits || {})
        .filter(([, value]) => value === true)
        .map(([key]) => {
          const permitLabels = {
            hot_work: '🔥 Hot Work (Pekerjaan Panas)',
            confined_space: '🚧 Confined Space (Ruang Terbatas)',
            working_height: '📐 Working at Height (Ketinggian)',
            electrical: '⚡ Electrical Isolation (Isolasi Listrik)',
            lifting: '🏗️ Lifting Operation (Pengangkatan)',
            excavation: '⛏️ Excavation (Penggalian)',
            pressure_test: '🔧 Pressure Test (Uji Tekan)',
            radiation: '☢️ Radiation (Radiasi/Sinar)'
          };
          return permitLabels[key] || key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        });

      if (activePermits.length) {
        html += `<div class="report-section-title">${sectionNum}. Permit to Work yang Diperlukan</div>
          <div class="mb-3">
            ${activePermits.map(p => `<span class="badge bg-warning text-dark me-1 mb-1" style="padding:8px 14px;font-size:0.8rem;">${p}</span>`).join('')}
          </div>`;
        sectionNum++;
      }

      // 5. Pengesahan
      html += `<div class="page-break-inside-avoid">
        <div class="report-section-title">${sectionNum}. Lembar Pengesahan</div>
        <div class="row signature-row">
          <div class="col-4">
            <div class="signature-box">
              <div class="signature-box__label">Disusun Oleh</div>
              <div class="signature-box__name">${this.escapeHtml(jsa.prepared_by || '_________________')}</div>
              <div class="signature-box__date">Tanggal: ${UtilityService.formatDate(jsa.date)}</div>
            </div>
          </div>
          <div class="col-4">
            <div class="signature-box">
              <div class="signature-box__label">Diperiksa Oleh</div>
              <div class="signature-box__name">${this.escapeHtml(jsa.reviewed_by || '_________________')}</div>
              <div class="signature-box__date">Tanggal: _________________</div>
            </div>
          </div>
          <div class="col-4">
            <div class="signature-box">
              <div class="signature-box__label">Disetujui Oleh</div>
              <div class="signature-box__name">${this.escapeHtml(jsa.approved_by || '_________________')}</div>
              <div class="signature-box__date">Tanggal: _________________</div>
            </div>
          </div>
        </div>
      </div>`;

      // Footer for each JSA
      html += this.buildReportFooter(company);
    });

    return html;
  },

  // ==================== WORK METHOD REPORT ====================
  buildWMReport(docId, projectId, company) {
    let wmList = DataAccess.getAllWorkMethods();
    if (projectId) wmList = wmList.filter(w => w.project_id === projectId);
    if (docId) wmList = wmList.filter(w => w.id === docId);

    if (!wmList.length) {
      return '<div class="alert alert-info">Tidak ada data Metode Kerja untuk filter yang dipilih.</div>';
    }

    let html = '';

    wmList.forEach((wm, index) => {
      const project = DataAccess.getProjectById(wm.project_id);

      if (index > 0) {
        html += `<div class="page-break"></div>`;
      }

      html += this.buildReportHeader(
        company, 
        'WORK METHOD STATEMENT', 
        wm.document_number,
        'bi-diagram-3'
      );

      // Project information
      html += this.buildProjectInfoSection(project, false);
      
      // Document info
      html += `<table class="table table-bordered table-sm">
        <tbody>
          ${this.createReportRow('No. Dokumen', `<strong>${wm.document_number}</strong>`)}
          ${this.createReportRow('Revisi', wm.revision || '0')}
          ${this.createReportRow('Tanggal Pembuatan', UtilityService.formatDate(wm.date))}
        </tbody>
      </table>`;

      // Work Steps
      html += `<div class="report-section-title">1. Uraian Langkah Kerja</div>
        <table class="table table-bordered table-sm">
          <thead>
            <tr>
              <th style="width:40px;">No</th>
              <th style="width:30%;">Tahapan Kerja</th>
              <th style="width:30%;">Alat Kerja</th>
              <th style="width:40%;">Proses / Kegiatan Pekerjaan</th>
            </tr>
          </thead>
          <tbody>`;

      (wm.work_steps || []).forEach((step, i) => {
        html += `<tr>
          <td class="text-center">${i + 1}</td>
          <td>${this.escapeHtml(step.work_stage || '-')}</td>
          <td>${this.escapeHtml(step.tools || '-')}</td>
          <td>${this.escapeHtml(step.work_process || '-')}</td>
        </tr>`;
      });

      if (!(wm.work_steps || []).length) {
        html += `<tr><td colspan="4" class="text-center text-muted">Tidak ada langkah kerja</td></tr>`;
      }

      html += `</tbody></table>`;

      // Approval
      html += `<div class="page-break-inside-avoid">
        <div class="report-section-title">2. Lembar Pengesahan</div>
        <div class="row signature-row">
          <div class="col-4">
            <div class="signature-box">
              <div class="signature-box__label">Disusun Oleh</div>
              <div class="signature-box__name">${this.escapeHtml(wm.prepared_by || '_________________')}</div>
              <div class="signature-box__date">Tanggal: ${UtilityService.formatDate(wm.date)}</div>
            </div>
          </div>
          <div class="col-4">
            <div class="signature-box">
              <div class="signature-box__label">Diperiksa Oleh</div>
              <div class="signature-box__name">${this.escapeHtml(wm.reviewed_by || '_________________')}</div>
              <div class="signature-box__date">Tanggal: _________________</div>
            </div>
          </div>
          <div class="col-4">
            <div class="signature-box">
              <div class="signature-box__label">Disetujui Oleh</div>
              <div class="signature-box__name">${this.escapeHtml(wm.approved_by || '_________________')}</div>
              <div class="signature-box__date">Tanggal: _________________</div>
            </div>
          </div>
        </div>
      </div>`;

      html += this.buildReportFooter(company);
    });

    return html;
  },

  // ==================== PROCUREMENT REPORT ====================
  buildPOReport(docId, projectId, company) {
    let poList = DataAccess.getAllPO();
    if (projectId) poList = poList.filter(p => p.project_id === projectId);
    if (docId) poList = poList.filter(p => p.id === docId);

    if (!poList.length) {
      return '<div class="alert alert-info">Tidak ada data Pembelian untuk filter yang dipilih.</div>';
    }

    const project = projectId ? DataAccess.getProjectById(projectId) : null;
    const grandTotal = poList.reduce((sum, po) => sum + (po.total_price || 0), 0);

    let html = '';

    html += this.buildReportHeader(
      company, 
      'LAPORAN PEMBELIAN MATERIAL', 
      project ? `Proyek: ${project.name}` : 'Semua Proyek',
      'bi-cart'
    );

    // Project info if specific project selected
    if (project) {
      html += this.buildProjectInfoSection(project, false);
    }

    html += `<div class="report-section-title">Daftar Item Pembelian</div>
      <table class="table table-bordered table-sm">
        <thead>
          <tr>
            <th style="width:30px;">No</th>
            ${!projectId ? '<th>Proyek</th>' : ''}
            <th>Nama Material</th>
            <th>Spesifikasi</th>
            <th style="width:50px;">Qty</th>
            <th style="width:50px;">Unit</th>
            <th style="width:100px;">Harga Satuan</th>
            <th style="width:100px;">Total Harga</th>
            <th style="width:90px;">Tanggal</th>
          </tr>
        </thead>
        <tbody>`;

    poList.forEach((po, i) => {
      const poProject = DataAccess.getProjectById(po.project_id);
      html += `<tr>
        <td class="text-center">${i + 1}</td>
        ${!projectId ? `<td>${this.escapeHtml(poProject?.name || '-')}</td>` : ''}
        <td><strong>${this.escapeHtml(po.material_name || '-')}</strong></td>
        <td>${this.escapeHtml(po.specification || '-')}</td>
        <td class="text-center">${po.quantity || 0}</td>
        <td class="text-center">${this.escapeHtml(po.unit || '-')}</td>
        <td class="text-end">${UtilityService.formatCurrency(po.unit_price)}</td>
        <td class="text-end"><strong>${UtilityService.formatCurrency(po.total_price)}</strong></td>
        <td class="text-center">${UtilityService.formatDate(po.date)}</td>
      </tr>`;
    });

    html += `</tbody>
      <tfoot>
        <tr style="background: #f0f9ff; font-weight: 700;">
          <td colspan="${projectId ? '6' : '7'}" class="text-end" style="font-size:0.9rem;">TOTAL KESELURUHAN:</td>
          <td class="text-end"><strong style="color:var(--color-success);font-size:1rem;">${UtilityService.formatCurrency(grandTotal)}</strong></td>
          <td></td>
        </tr>
      </tfoot>
    </table>

    <div class="report-summary-box">
      <div class="row">
        <div class="col-6">
          <strong>Total Item:</strong> ${poList.length}
        </div>
        <div class="col-6 text-end">
          <strong>Grand Total:</strong> <span style="color:var(--color-success);font-size:1.1rem;">${UtilityService.formatCurrency(grandTotal)}</span>
        </div>
      </div>
    </div>`;

    html += this.buildReportFooter(company);

    return html;
  },

  // ==================== PROJECT REPORT ====================
  buildProjectReport(projectId, company) {
    let projects = DataAccess.getAllProjects();
    if (projectId) projects = projects.filter(p => p.id === projectId);

    if (!projects.length) {
      return '<div class="alert alert-info">Tidak ada data Proyek untuk filter yang dipilih.</div>';
    }

    let html = '';

    html += this.buildReportHeader(
      company, 
      'LAPORAN DATA PROYEK', 
      `${projects.length} Proyek`,
      'bi-clipboard-data'
    );

    projects.forEach((project, index) => {
      const jsaList = DataAccess.getJSAByProject(project.id);
      const poList = DataAccess.getPOByProject(project.id);
      const totalPO = poList.reduce((sum, po) => sum + (po.total_price || 0), 0);
      const mpList = DataAccess.getManpowerByProject(project.id);
      const wmList = DataAccess.getWorkMethodsByProject(project.id);

      if (index > 0) {
        html += `<hr style="border:2px dashed var(--color-border);margin:24px 0;">`;
      }

      html += `<div class="page-break-inside-avoid">
        <h5 style="margin-bottom:16px;color:var(--color-primary);">
          <i class="bi bi-building"></i> ${this.escapeHtml(project.name)}
        </h5>`;

      // Full project info
      html += `<table class="table table-bordered table-sm">
        <tbody>
          ${this.createReportRow('Nama Proyek', `<strong>${this.escapeHtml(project.name)}</strong>`)}
          ${this.createReportRow('Client / Owner', project.client)}
          ${this.createReportRow('Lokasi Proyek', project.location)}
          ${this.createReportRow('Penanggung Jawab (PIC)', project.pic)}
          ${this.createReportRow('Nilai Kontrak', `<strong>${UtilityService.formatCurrency(project.contract_value)}</strong>`)}
          ${this.createReportRow('Tanggal Mulai', project.start_date ? UtilityService.formatDate(project.start_date) : '-')}
          ${this.createReportRow('Tanggal Selesai', project.end_date ? UtilityService.formatDate(project.end_date) : '-')}
          ${this.createReportRow('Periode Pelaksanaan', 
            (project.start_date ? UtilityService.formatDate(project.start_date) : '-') + ' s/d ' + 
            (project.end_date ? UtilityService.formatDate(project.end_date) : '-')
          )}
        </tbody>
      </table>`;

      // Summary statistics
      html += `<div class="report-section-title">Ringkasan Data Proyek</div>
        <div class="row g-3 mb-3">
          <div class="col-3">
            <div class="report-stat-mini">
              <div class="report-stat-mini__icon" style="background:var(--color-warning-bg);color:var(--color-warning);">
                <i class="bi bi-journal-check"></i>
              </div>
              <div class="report-stat-mini__value">${jsaList.length}</div>
              <div class="report-stat-mini__label">Dokumen JSA</div>
            </div>
          </div>
          <div class="col-3">
            <div class="report-stat-mini">
              <div class="report-stat-mini__icon" style="background:var(--color-primary-bg);color:var(--color-primary);">
                <i class="bi bi-diagram-3"></i>
              </div>
              <div class="report-stat-mini__value">${wmList.length}</div>
              <div class="report-stat-mini__label">Metode Kerja</div>
            </div>
          </div>
          <div class="col-3">
            <div class="report-stat-mini">
              <div class="report-stat-mini__icon" style="background:var(--color-info-bg);color:var(--color-info);">
                <i class="bi bi-people"></i>
              </div>
              <div class="report-stat-mini__value">${mpList.length}</div>
              <div class="report-stat-mini__label">Personel</div>
            </div>
          </div>
          <div class="col-3">
            <div class="report-stat-mini">
              <div class="report-stat-mini__icon" style="background:var(--color-success-bg);color:var(--color-success);">
                <i class="bi bi-cart"></i>
              </div>
              <div class="report-stat-mini__value">${poList.length}</div>
              <div class="report-stat-mini__label">Item Pembelian</div>
            </div>
          </div>
        </div>
        ${this.createReportRow('Total Pembelian', `<strong style="color:var(--color-success);">${UtilityService.formatCurrency(totalPO)}</strong>`)}
        ${this.createReportRow('Sisa Anggaran', `<strong style="color:${(project.contract_value - totalPO) >= 0 ? 'var(--color-success)' : 'var(--color-danger)'};">${UtilityService.formatCurrency(project.contract_value - totalPO)}</strong>`)}
      </div>`;

      // JSA List if exists
      if (jsaList.length) {
        html += `<div class="report-section-title">Daftar JSA (${jsaList.length} Dokumen)</div>
          <table class="table table-bordered table-sm">
            <thead>
              <tr><th style="width:40px;">No</th><th>No. Dokumen</th><th>Revisi</th><th>Tanggal</th></tr>
            </thead>
            <tbody>`;
        jsaList.forEach((jsa, i) => {
          html += `<tr>
            <td class="text-center">${i + 1}</td>
            <td><strong>${jsa.document_number}</strong></td>
            <td class="text-center">${jsa.revision || '0'}</td>
            <td>${UtilityService.formatDate(jsa.date)}</td>
          </tr>`;
        });
        html += `</tbody></table>`;
      }

      // PO List if exists
      if (poList.length) {
        html += `<div class="report-section-title">Daftar Pembelian (${poList.length} Item)</div>
          <table class="table table-bordered table-sm">
            <thead>
              <tr><th style="width:40px;">No</th><th>Material</th><th style="width:60px;">Qty</th><th style="width:50px;">Unit</th><th style="width:110px;">Total Harga</th><th style="width:90px;">Tanggal</th></tr>
            </thead>
            <tbody>`;
        poList.forEach((po, i) => {
          html += `<tr>
            <td class="text-center">${i + 1}</td>
            <td>${this.escapeHtml(po.material_name || '-')}</td>
            <td class="text-center">${po.quantity || 0}</td>
            <td class="text-center">${this.escapeHtml(po.unit || '-')}</td>
            <td class="text-end">${UtilityService.formatCurrency(po.total_price)}</td>
            <td class="text-center">${UtilityService.formatDate(po.date)}</td>
          </tr>`;
        });
        html += `</tbody></table>`;
      }
    });

    html += this.buildReportFooter(company);

    return html;
  },

  // ==================== CASHFLOW REPORT ====================
  buildCashflowReport(projectId, company) {
    let projects = DataAccess.getAllProjects();
    if (projectId) projects = projects.filter(p => p.id === projectId);

    if (!projects.length) {
      return '<div class="alert alert-info">Tidak ada data Proyek untuk filter yang dipilih.</div>';
    }

    let html = '';

    html += this.buildReportHeader(
      company, 
      'LAPORAN KEUANGAN PROYEK', 
      `${projects.length} Proyek`,
      'bi-cash-stack'
    );

    let totalAllBudget = 0;
    let totalAllSpent = 0;

    projects.forEach((project, index) => {
      const poList = DataAccess.getPOByProject(project.id);
      const totalPO = poList.reduce((sum, po) => sum + (po.total_price || 0), 0);
      const budget = project.contract_value || 0;
      const remaining = budget - totalPO;
      const percentage = budget > 0 ? Math.round((totalPO / budget) * 100) : 0;

      totalAllBudget += budget;
      totalAllSpent += totalPO;

      if (index > 0) {
        html += `<hr style="border:2px dashed var(--color-border);margin:24px 0;">`;
      }

      html += `<div class="page-break-inside-avoid">
        <h5 style="margin-bottom:16px;color:var(--color-primary);">
          <i class="bi bi-building"></i> ${this.escapeHtml(project.name)}
        </h5>`;

      // Project financial overview
      html += `<div class="row g-3 mb-3">
        <div class="col-4">
          <div class="report-finance-card report-finance-card--info">
            <div class="report-finance-card__label">Nilai Kontrak</div>
            <div class="report-finance-card__value">${UtilityService.formatCurrency(budget)}</div>
          </div>
        </div>
        <div class="col-4">
          <div class="report-finance-card report-finance-card--warning">
            <div class="report-finance-card__label">Total Pembelian</div>
            <div class="report-finance-card__value">${UtilityService.formatCurrency(totalPO)}</div>
          </div>
        </div>
        <div class="col-4">
          <div class="report-finance-card ${remaining >= 0 ? 'report-finance-card--success' : 'report-finance-card--danger'}">
            <div class="report-finance-card__label">Sisa Anggaran</div>
            <div class="report-finance-card__value">${UtilityService.formatCurrency(remaining)}</div>
          </div>
        </div>
      </div>

      <div class="progress mb-3" style="height:14px;">
        <div class="progress-bar" style="width:${Math.min(percentage, 100)}%;background:${percentage > 80 ? '#ef4444' : percentage > 50 ? '#f59e0b' : '#10b981'}">
          <strong>${percentage}%</strong>
        </div>
      </div>

      <table class="table table-bordered table-sm">
        <tbody>
          ${this.createReportRow('Nama Proyek', `<strong>${this.escapeHtml(project.name)}</strong>`)}
          ${this.createReportRow('Client', project.client)}
          ${this.createReportRow('Nilai Kontrak', UtilityService.formatCurrency(budget))}
          ${this.createReportRow('Total Pengeluaran', UtilityService.formatCurrency(totalPO))}
          ${this.createReportRow('Persentase Penggunaan', `${percentage}%`)}
          ${this.createReportRow('Sisa Anggaran', `<strong style="color:${remaining >= 0 ? 'var(--color-success)' : 'var(--color-danger)'};">${UtilityService.formatCurrency(remaining)}</strong>`)}
        </tbody>
      </table>`;

      // Detail PO items
      if (poList.length) {
        html += `<div class="report-section-title">Rincian Pembelian (${poList.length} Item)</div>
          <table class="table table-bordered table-sm">
            <thead>
              <tr><th style="width:30px;">No</th><th>Material</th><th style="width:50px;">Qty</th><th style="width:50px;">Unit</th><th style="width:100px;">Harga Satuan</th><th style="width:100px;">Total</th></tr>
            </thead>
            <tbody>`;
        poList.forEach((po, i) => {
          html += `<tr>
            <td class="text-center">${i + 1}</td>
            <td>${this.escapeHtml(po.material_name || '-')}</td>
            <td class="text-center">${po.quantity || 0}</td>
            <td class="text-center">${this.escapeHtml(po.unit || '')}</td>
            <td class="text-end">${UtilityService.formatCurrency(po.unit_price)}</td>
            <td class="text-end">${UtilityService.formatCurrency(po.total_price)}</td>
          </tr>`;
        });
        html += `</tbody></table>`;
      }
      html += `</div>`;
    });

    // Grand Summary
    const totalRemaining = totalAllBudget - totalAllSpent;
    const totalPercentage = totalAllBudget > 0 ? Math.round((totalAllSpent / totalAllBudget) * 100) : 0;

    html += `<div class="page-break-inside-avoid">
      <div class="report-section-title">Rekapitulasi Seluruh Proyek</div>
      <div class="row g-3 mb-3">
        <div class="col-4">
          <div class="report-finance-card report-finance-card--info" style="background:var(--color-info-bg);border-color:var(--color-info-light);">
            <div class="report-finance-card__label">Total Nilai Kontrak</div>
            <div class="report-finance-card__value" style="font-size:1.1rem;">${UtilityService.formatCurrency(totalAllBudget)}</div>
          </div>
        </div>
        <div class="col-4">
          <div class="report-finance-card report-finance-card--warning" style="background:var(--color-warning-bg);border-color:var(--color-warning-light);">
            <div class="report-finance-card__label">Total Pembelian</div>
            <div class="report-finance-card__value" style="font-size:1.1rem;">${UtilityService.formatCurrency(totalAllSpent)}</div>
          </div>
        </div>
        <div class="col-4">
          <div class="report-finance-card ${totalRemaining >= 0 ? 'report-finance-card--success' : 'report-finance-card--danger'}" style="font-size:1.1rem;">
            <div class="report-finance-card__label">Sisa Total Anggaran</div>
            <div class="report-finance-card__value" style="font-size:1.1rem;">${UtilityService.formatCurrency(totalRemaining)}</div>
          </div>
        </div>
      </div>
      <div class="progress mb-3" style="height:14px;">
        <div class="progress-bar" style="width:${Math.min(totalPercentage, 100)}%;background:${totalPercentage > 80 ? '#ef4444' : totalPercentage > 50 ? '#f59e0b' : '#10b981'}">
          <strong>${totalPercentage}%</strong>
        </div>
      </div>
    </div>`;

    html += this.buildReportFooter(company);

    return html;
  },

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};