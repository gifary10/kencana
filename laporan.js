// laporan.js — Report Page (async Google Sheets) - UPDATED with Modern Vertical Timeline
const ReportPage = {
  _currentReportType: 'jsa',
  _loadedTabs: new Set(),
  _data: { projects:[], jsa:[], wm:[], po:[], personnel:[], manpower:[], company:null, schedule:[] },

  render() {
    return `
    <div class="page-header no-print">
        <h2 class="page-title"><span class="page-title__icon"><i class="bi bi-building-gear"></i></span>KPT Project Management Portal</h2>
        <div class="page-header__filter">
          <select class="form-select" id="selectReportProject" onchange="ReportPage.onProjectChange()">
            <option value="">-- Pilih Proyek --</option>
          </select>
        </div>
        <button class="btn btn--primary" onclick="window.print()"><i class="bi bi-printer"></i> Cetak PDF</button>
      </div>
    <div id="reportListView">
      <div class="card no-print"><div class="card-body p-0">
        <div class="row g-2 p-3">
          <div class="col-12">
            <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
              <div class="tab-nav" id="reportTabs" style="margin-bottom:0;border-bottom:none;">
                <button class="tab-nav__btn tab-nav__btn--active" onclick="ReportPage.switchReportTab('jsa')">JSA</button>
                <button class="tab-nav__btn" onclick="ReportPage.switchReportTab('wm')">Metode Kerja</button>
                <button class="tab-nav__btn" onclick="ReportPage.switchReportTab('schedule')">Jadwal Kerja</button>
                <button class="tab-nav__btn" onclick="ReportPage.switchReportTab('po')">Cost Project</button>
                <button class="tab-nav__btn" onclick="ReportPage.switchReportTab('manpower')">Man Power</button>
              </div>
            </div>
          </div>
        </div>
      </div></div>
      <div id="reportOutput"><div class="report-container"><div class="empty-state"><p>Memuat data…</p></div></div></div>
    </div>`;
  },

  async init() {
    this._loadedTabs = new Set();
    this._data = { projects:[], jsa:[], wm:[], po:[], personnel:[], manpower:[], company:null, schedule:[] };

    const [projects, company] = await Promise.all([
      DataAccess.getAllProjects(),
      DataAccess.getCompany()
    ]);
    this._data.projects = projects;
    this._data.company  = company;

    const sel = document.getElementById('selectReportProject');
    if (sel) {
      sel.innerHTML = '<option value="">-- Pilih Proyek --</option>';
      projects.forEach(p => { const o=document.createElement('option'); o.value=p.id; o.textContent=p.name; sel.appendChild(o); });
    }

    if (!projects.length) {
      document.getElementById('reportOutput').innerHTML = this.showFlowBanner(
        'bi-clipboard-plus', 'Belum Ada Proyek',
        'Buat proyek terlebih dahulu sebelum mencetak laporan.',
        '<i class="bi bi-clipboard-data"></i> Buat Proyek',
        "UIService.navigate('proyek')"
      );
      return;
    }

    this._currentReportType = 'jsa';
    document.querySelectorAll('#reportTabs .tab-nav__btn').forEach((btn, idx) => {
      btn.classList.toggle('tab-nav__btn--active', idx === 0);
    });
    this.renderReport();
  },

  showFlowBanner(icon, title, message, buttonLabel, buttonAction) {
    return `<div class="flow-guard-banner">
      <div class="flow-guard-banner__icon"><i class="bi ${icon}"></i></div>
      <h5 class="flow-guard-banner__title">${title}</h5>
      <p class="flow-guard-banner__description">${message}</p>
      <button class="btn btn--primary no-print" onclick="${buttonAction}">${buttonLabel}</button>
    </div>`;
  },

  async _loadTabData(tab) {
    const reportEl = document.getElementById('reportOutput');
    if (reportEl) reportEl.innerHTML = '<div class="report-container"><div class="empty-state"><p>Memuat data…</p></div></div>';

    try {
      if (tab === 'jsa' && !this._data.jsa.length) {
        this._data.jsa = await DataAccess.getAllJSA();
      }
      if ((tab === 'wm' || tab === 'schedule') && !this._data.wm.length) {
        this._data.wm = await DataAccess.getAllWorkMethods();
      }
      if (tab === 'schedule' && !this._data.schedule.length) {
        this._data.schedule = await StorageService.getData('jadwal');
      }
      if (tab === 'po' && !this._data.po.length) {
        this._data.po = await DataAccess.getAllPO();
      }
      if (tab === 'manpower' && !this._data.personnel.length) {
        [this._data.personnel, this._data.manpower] = await Promise.all([
          DataAccess.getAllPersonnel(),
          DataAccess.getAllManpower()
        ]);
      }
    } catch (err) {
      AppError.handle(err, `Memuat data tab ${tab}`);
    }
  },

  async onProjectChange() {
    const projectId = document.getElementById('selectReportProject')?.value || '';
    if (!projectId) {
      this.renderReport();
      return;
    }
    const tab = this._currentReportType;
    if (!this._loadedTabs.has(tab)) {
      await this._loadTabData(tab);
      this._loadedTabs.add(tab);
    }
    this.renderReport();
  },

  async switchReportTab(reportType) {
    this._currentReportType = reportType;
    document.querySelectorAll('#reportTabs .tab-nav__btn').forEach((btn, idx) => {
      const tabs = ['jsa', 'wm', 'schedule', 'po', 'manpower'];
      btn.classList.toggle('tab-nav__btn--active', tabs[idx] === reportType);
    });

    const projectId = document.getElementById('selectReportProject')?.value || '';
    if (!projectId) {
      this.renderReport();
      return;
    }

    if (!this._loadedTabs.has(reportType)) {
      await this._loadTabData(reportType);
      this._loadedTabs.add(reportType);
    }
    this.renderReport();
  },

  renderReport() {
    const projectId = document.getElementById('selectReportProject')?.value || '';
    const company   = this._data.company;

    if (!projectId) {
      document.getElementById('reportOutput').innerHTML = `
        <div class="report-container">
          <div class="flow-guard-banner">
            <div class="flow-guard-banner__icon"><i class="bi bi-funnel"></i></div>
            <h5 class="flow-guard-banner__title">Pilih Proyek Terlebih Dahulu</h5>
            <p class="flow-guard-banner__description">Gunakan filter <strong>Pilih Proyek</strong> di atas untuk menampilkan laporan.</p>
          </div>
        </div>`;
      return;
    }

    let html = '<div class="report-container">';
    switch (this._currentReportType) {
      case 'jsa':      html += this.buildJSAReport(projectId, company);      break;
      case 'wm':       html += this.buildWMReport(projectId, company);       break;
      case 'schedule': html += this.buildScheduleReport(projectId, company); break;
      case 'po':       html += this.buildPOReport(projectId, company);       break;
      case 'manpower': html += this.buildManpowerReport(projectId, company); break;
      default:         html += '<div class="alert alert-info">Pilih tipe laporan di atas</div>';
    }
    html += '</div>';
    document.getElementById('reportOutput').innerHTML = html;
  },

  createReportRow(label, value) {
    return `<tr><td class="col-width-28 fw-semibold" style="background:#f8fafc;">${UtilityService.escapeHtml(label)}</td><td>${value||'-'}</td></tr>`;
  },

  // ============================================================
  // REPORT HEADER
  // ============================================================
  buildReportHeader(company, title, titleIcon='bi-file-earmark-pdf') {
    if (!company) return `<div class="report-header"><div class="report-header__content"><div class="report-header__title"><i class="bi ${titleIcon}"></i> ${UtilityService.escapeHtml(title)}</div></div></div>`;
    return `<div class="report-header"><div class="report-header__layout">
      <div class="report-header__left">
        <div class="report-header__company-info">
          <div class="report-header__logo-section"><img src="logo.png" alt="Logo" style="width:100%;height:100%"></div>
          <div class="report-header__company-name">${UtilityService.escapeHtml(company.name)}</div>
          ${company.address?`<div class="report-header__company-detail"> ${UtilityService.escapeHtml(company.address)}</div>`:''}
          <div class="report-header__company-contact">
            ${company.contact?`<span><i class="bi bi-telephone"></i> ${UtilityService.escapeHtml(company.contact)}</span>`:''}
            ${company.email?`<span><i class="bi bi-envelope"></i> ${UtilityService.escapeHtml(company.email)}</span>`:''}
            ${company.website?`<span><i class="bi bi-globe"></i> ${UtilityService.escapeHtml(company.website)}</span>`:''}
          </div>
        </div>
      </div>
      <div class="report-header__right">
        <div class="report-header__doc-type">${UtilityService.escapeHtml(title)}</div>
      </div>
    </div></div>`;
  },

  buildReportFooter(company) {
    if(!company) return '';
    return `<div class="report-footer no-screen"><div class="report-footer__content"><div class="report-footer__left"><strong>${UtilityService.escapeHtml(company.name)}</strong>${company.address?` | ${UtilityService.escapeHtml(company.address)}`:''}</div><div class="report-footer__right">${company.contact?`Telp: ${UtilityService.escapeHtml(company.contact)}`:''}${company.email?` | Email: ${UtilityService.escapeHtml(company.email)}`:''}</div></div><div class="report-footer__disclaimer">Dokumen ini dicetak dari sistem KPT Project v4.0 | Halaman ini sah tanpa tanda tangan basah</div></div>`;
  },

  // ============================================================
  // INFORMASI PROYEK
  // ============================================================
  buildProjectInfoSection(project, includeAllFields=true) {
    if(!project) return '';
    let h=`<div class="report-section-title"><i class="bi bi-info-circle"></i> Informasi Proyek</div>
    <table class="table table-bordered table-sm"><tbody>
      ${this.createReportRow('Nama Proyek',`<strong>${UtilityService.escapeHtml(project.name)}</strong>`)}
      ${this.createReportRow('Client / Owner',UtilityService.escapeHtml(project.client))}
      ${this.createReportRow('Lokasi Proyek',UtilityService.escapeHtml(project.location))}
      ${this.createReportRow('Penanggung Jawab (PIC)',UtilityService.escapeHtml(project.pic))}`;
    if(includeAllFields) {
      h+=`${this.createReportRow('Nilai Kontrak',UtilityService.formatCurrency(project.contract_value))}
      ${this.createReportRow('Tanggal Mulai',project.start_date?UtilityService.formatDate(project.start_date):'-')}
      ${this.createReportRow('Tanggal Selesai',project.end_date?UtilityService.formatDate(project.end_date):'-')}`;
    }
    h+=`</tbody></table>`;
    return h;
  },

  // ============================================================
  // LEMBAR PENGESAHAN
  // ============================================================
  buildApprovalSection(preparedBy, reviewedBy, approvedBy) {
    return `<div class="report-section-title"><i class="bi bi-check2-square"></i> Lembar Pengesahan</div>
    <div class="row signature-row">
      <div class="col-4">
        <div class="signature-box">
          <div class="signature-box__label">Disusun Oleh</div>
          <div class="signature-box__name">${UtilityService.escapeHtml(preparedBy||'_________________')}</div>
        </div>
      </div>
      <div class="col-4">
        <div class="signature-box">
          <div class="signature-box__label">Diperiksa Oleh</div>
          <div class="signature-box__name">${UtilityService.escapeHtml(reviewedBy||'_________________')}</div>
        </div>
      </div>
      <div class="col-4">
        <div class="signature-box">
          <div class="signature-box__label">Disetujui Oleh</div>
          <div class="signature-box__name">${UtilityService.escapeHtml(approvedBy||'_________________')}</div>
        </div>
      </div>
    </div>`;
  },

  // ============================================================
  // MODERN VERTICAL TIMELINE SCHEDULE REPORT
  // ============================================================
  buildScheduleReport(projectId, company) {
    const project = projectId ? this._data.projects.find(p => p.id === projectId) : null;
    
    let scheduleData = [];
    if (projectId) {
      scheduleData = this._data.schedule.filter(s => s.project_id === projectId);
    } else {
      scheduleData = [...this._data.schedule];
    }

    // Urutkan berdasarkan document number dan step number
    scheduleData.sort((a, b) => {
      if (a.document_number !== b.document_number) {
        return (a.document_number || '').localeCompare(b.document_number || '');
      }
      return (parseInt(a.step_number) || 0) - (parseInt(b.step_number) || 0);
    });

    let html = '';
    html += this.buildReportHeader(company, 'JADWAL KERJA', 'bi-calendar-week');

    // Informasi Proyek
    if (project) {
      html += this.buildProjectInfoSection(project, false);
    }

    // Summary Stats
    const totalItems = scheduleData.length;
    const itemsWithDates = scheduleData.filter(s => s.start_date && s.end_date).length;
    const completedItems = scheduleData.filter(s => {
      if (!s.end_date) return false;
      const end = new Date(s.end_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return end < today;
    }).length;
    const inProgressItems = scheduleData.filter(s => {
      if (!s.start_date || !s.end_date) return false;
      const start = new Date(s.start_date);
      const end = new Date(s.end_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return start <= today && end >= today;
    }).length;

    html += `
    <div class="row g-3 mb-4">
      <div class="col-6 col-md-3">
        <div class="report-stat-mini">
          <div class="report-stat-mini__icon" style="background:#eff6ff;color:#3b82f6;">
            <i class="bi bi-list-ol"></i>
          </div>
          <div class="report-stat-mini__value">${totalItems}</div>
          <div class="report-stat-mini__label">Total Tahapan</div>
        </div>
      </div>
      <div class="col-6 col-md-3">
        <div class="report-stat-mini">
          <div class="report-stat-mini__icon" style="background:#f0fdf4;color:#16a34a;">
            <i class="bi bi-check-circle"></i>
          </div>
          <div class="report-stat-mini__value">${completedItems}</div>
          <div class="report-stat-mini__label">Selesai</div>
        </div>
      </div>
      <div class="col-6 col-md-3">
        <div class="report-stat-mini">
          <div class="report-stat-mini__icon" style="background:#fffbeb;color:#f59e0b;">
            <i class="bi bi-arrow-repeat"></i>
          </div>
          <div class="report-stat-mini__value">${inProgressItems}</div>
          <div class="report-stat-mini__label">Berlangsung</div>
        </div>
      </div>
      <div class="col-6 col-md-3">
        <div class="report-stat-mini">
          <div class="report-stat-mini__icon" style="background:#f8fafc;color:#64748b;">
            <i class="bi bi-calendar-check"></i>
          </div>
          <div class="report-stat-mini__value">${itemsWithDates}</div>
          <div class="report-stat-mini__label">Terjadwal</div>
        </div>
      </div>
    </div>`;

    // Modern Vertical Timeline
    html += `<div class="report-section-title"><i class="bi bi-clock-history"></i> Timeline Pekerjaan</div>`;

    if (scheduleData.length === 0) {
      html += `<div class="flow-guard-banner">
        <div class="flow-guard-banner__icon"><i class="bi bi-calendar-x"></i></div>
        <h5 class="flow-guard-banner__title">Belum Ada Data Jadwal</h5>
        <p class="flow-guard-banner__description">Silakan buat jadwal kerja melalui menu <strong>Jadwal Kerja</strong> terlebih dahulu.</p>
        <button class="btn btn--primary" onclick="UIService.navigate('jadwal')">
          <i class="bi bi-calendar-week"></i> Buka Jadwal Kerja
        </button>
      </div>`;
    } else {
      html += this.buildModernVerticalTimeline(scheduleData, project);
    }

    html += this.buildReportFooter(company);
    return html;
  },

  // ============================================================
  // MODERN VERTICAL TIMELINE BUILDER
  // ============================================================
  buildModernVerticalTimeline(scheduleItems, project) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Group by document number
    const grouped = {};
    scheduleItems.forEach(item => {
      const docKey = item.document_number || 'Tanpa Nomor';
      if (!grouped[docKey]) grouped[docKey] = [];
      grouped[docKey].push(item);
    });

    const docColors = [
      { bg: '#eff6ff', border: '#3b82f6', dot: '#3b82f6', icon: 'bi-file-earmark-text' },
      { bg: '#f0fdf4', border: '#16a34a', dot: '#16a34a', icon: 'bi-file-earmark-check' },
      { bg: '#fffbeb', border: '#f59e0b', dot: '#f59e0b', icon: 'bi-file-earmark-richtext' },
      { bg: '#fef2f2', border: '#ef4444', dot: '#ef4444', icon: 'bi-file-earmark-medical' },
      { bg: '#f5f3ff', border: '#8b5cf6', dot: '#8b5cf6', icon: 'bi-file-earmark-code' },
      { bg: '#f0f9ff', border: '#0ea5e9', dot: '#0ea5e9', icon: 'bi-file-earmark-zip' },
      { bg: '#fff1f2', border: '#e11d48', dot: '#e11d48', icon: 'bi-file-earmark-lock' },
      { bg: '#fdf2f8', border: '#db2777', dot: '#db2777', icon: 'bi-file-earmark-person' },
    ];

    let docIndex = 0;
    let globalIndex = 0;
    let html = '';

    // Timeline container
    html += `<div class="modern-timeline" style="position:relative;padding-left:0;">`;

    // Draw the main vertical line
    html += `<div style="position:absolute;left:48px;top:0;bottom:0;width:3px;background:linear-gradient(180deg, #e2e8f0 0%, #cbd5e1 50%, #e2e8f0 100%);z-index:1;"></div>`;

    Object.entries(grouped).forEach(([docNum, items]) => {
      const colorScheme = docColors[docIndex % docColors.length];
      
      // Document group header
      html += `
      <div style="position:relative;z-index:2;margin-bottom:24px;">
        <div style="display:flex;align-items:center;gap:16px;margin-bottom:8px;margin-left:0;">
          <div style="width:40px;height:40px;border-radius:50%;background:${colorScheme.bg};border:3px solid ${colorScheme.border};display:flex;align-items:center;justify-content:center;z-index:3;flex-shrink:0;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
            <i class="bi ${colorScheme.icon}" style="font-size:1.1rem;color:${colorScheme.border};"></i>
          </div>
          <div style="flex:1;">
            <h4 style="margin:0;font-size:1rem;font-weight:700;color:#1e293b;line-height:1.3;">
              <i class="bi bi-diagram-3" style="color:${colorScheme.border};"></i> 
              ${UtilityService.escapeHtml(docNum)}
            </h4>
            <span style="font-size:0.75rem;color:#64748b;font-weight:500;">
              <i class="bi bi-list-ol"></i> ${items.length} tahapan
            </span>
          </div>
        </div>
      </div>`;

      // Items for this document
      items.forEach((item, idx) => {
        globalIndex++;
        const hasDates = item.start_date && item.end_date;
        const startDate = item.start_date ? new Date(item.start_date) : null;
        const endDate = item.end_date ? new Date(item.end_date) : null;
        
        // Determine status
        let statusLabel = 'Belum Terjadwal';
        let statusColor = '#94a3b8';
        let statusBg = '#f1f5f9';
        let statusIcon = 'bi-clock';
        
        if (hasDates && startDate && endDate) {
          const start = new Date(startDate);
          const end = new Date(endDate);
          start.setHours(0, 0, 0, 0);
          end.setHours(0, 0, 0, 0);
          
          if (end < today) {
            statusLabel = 'Selesai';
            statusColor = '#16a34a';
            statusBg = '#f0fdf4';
            statusIcon = 'bi-check-circle-fill';
          } else if (start <= today && end >= today) {
            statusLabel = 'Berlangsung';
            statusColor = '#f59e0b';
            statusBg = '#fffbeb';
            statusIcon = 'bi-arrow-repeat';
          } else if (start > today) {
            statusLabel = 'Mendatang';
            statusColor = '#3b82f6';
            statusBg = '#eff6ff';
            statusIcon = 'bi-calendar-event';
          }
          
          if (start > end) {
            statusLabel = 'Tgl Tidak Valid';
            statusColor = '#ef4444';
            statusBg = '#fef2f2';
            statusIcon = 'bi-exclamation-triangle-fill';
          }
        }

        // Calculate duration
        let durationDisplay = '-';
        if (startDate && endDate && startDate <= endDate) {
          const diffTime = Math.abs(endDate - startDate);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
          durationDisplay = `${diffDays} hari`;
        }

        // Format dates
        const startDisplay = item.start_date ? UtilityService.formatDate(item.start_date) : '—';
        const endDisplay = item.end_date ? UtilityService.formatDate(item.end_date) : '—';
        const startShort = item.start_date ? new Date(item.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '';
        const endShort = item.end_date ? new Date(item.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '';
        const yearLabel = item.start_date ? new Date(item.start_date).getFullYear() : (item.end_date ? new Date(item.end_date).getFullYear() : '');

        // Timeline item
        html += `
        <div style="position:relative;z-index:2;margin-bottom:20px;margin-left:0;">
          <div style="display:flex;gap:16px;">
            <!-- Timeline dot and connector -->
            <div style="width:40px;flex-shrink:0;display:flex;flex-direction:column;align-items:center;position:relative;">
              <div style="width:18px;height:18px;border-radius:50%;background:${statusColor};border:3px solid #ffffff;box-shadow:0 2px 6px rgba(0,0,0,0.15);z-index:3;margin-top:4px;"></div>
              ${idx < items.length - 1 ? `<div style="width:2px;flex:1;background:linear-gradient(180deg, #cbd5e1 0%, #e2e8f0 100%);margin-top:-2px;"></div>` : ''}
            </div>
            
            <!-- Content card -->
            <div style="flex:1;background:#ffffff;border:1.5px solid #e2e8f0;border-radius:12px;overflow:hidden;transition:all 0.3s ease;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
              <!-- Card header with step number and status -->
              <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:${colorScheme.bg};border-bottom:1px solid #e2e8f0;">
                <div style="display:flex;align-items:center;gap:10px;">
                  <span style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:8px;background:${colorScheme.border};color:white;font-weight:700;font-size:0.8rem;">
                    ${globalIndex}
                  </span>
                  <div>
                    <div style="font-weight:700;font-size:0.88rem;color:#1e293b;line-height:1.3;">
                      ${UtilityService.escapeHtml(item.work_stage || 'Tahapan Tanpa Nama')}
                    </div>
                    <div style="font-size:0.72rem;color:#64748b;line-height:1.2;">
                      ${UtilityService.escapeHtml(docNum)}
                    </div>
                  </div>
                </div>
                <span style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:20px;background:${statusBg};color:${statusColor};font-size:0.72rem;font-weight:600;white-space:nowrap;">
                  <i class="bi ${statusIcon}" style="font-size:0.7rem;"></i> ${statusLabel}
                </span>
              </div>
              
              <!-- Card body -->
              <div style="padding:12px 16px;">
                <!-- Dates row -->
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;flex-wrap:wrap;">
                  <!-- Start date -->
                  <div style="display:flex;align-items:center;gap:6px;background:#f8fafc;padding:6px 10px;border-radius:8px;border:1px solid #e2e8f0;">
                    <i class="bi bi-calendar-plus" style="color:#3b82f6;font-size:0.85rem;"></i>
                    <div>
                      <div style="font-size:0.68rem;color:#64748b;line-height:1;">Mulai</div>
                      <div style="font-size:0.82rem;font-weight:600;color:#1e293b;line-height:1.3;">${startShort || startDisplay}</div>
                    </div>
                  </div>
                  
                  <!-- Arrow -->
                  <div style="color:#94a3b8;font-size:0.8rem;">
                    <i class="bi bi-arrow-right"></i>
                  </div>
                  
                  <!-- End date -->
                  <div style="display:flex;align-items:center;gap:6px;background:#f8fafc;padding:6px 10px;border-radius:8px;border:1px solid #e2e8f0;">
                    <i class="bi bi-calendar-check" style="color:#16a34a;font-size:0.85rem;"></i>
                    <div>
                      <div style="font-size:0.68rem;color:#64748b;line-height:1;">Selesai</div>
                      <div style="font-size:0.82rem;font-weight:600;color:#1e293b;line-height:1.3;">${endShort || endDisplay}</div>
                    </div>
                  </div>
                  
                  <!-- Duration badge -->
                  <div style="display:flex;align-items:center;gap:4px;background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);color:white;padding:6px 10px;border-radius:8px;font-size:0.75rem;font-weight:600;margin-left:auto;">
                    <i class="bi bi-hourglass-split" style="font-size:0.75rem;"></i>
                    ${durationDisplay}
                  </div>
                </div>
                
                <!-- Progress bar -->
                <div style="height:6px;background:#f1f5f9;border-radius:3px;overflow:hidden;margin-bottom:10px;">
                  <div style="height:100%;background:${statusColor};border-radius:3px;transition:width 0.3s ease;${
                    statusLabel === 'Selesai' ? 'width:100%;' : 
                    statusLabel === 'Berlangsung' && startDate && endDate ? 
                      `width:${Math.min(100, Math.max(5, Math.round(((today - startDate) / (endDate - startDate)) * 100)))}%;` : 
                    statusLabel === 'Mendatang' ? 'width:5%;' : 'width:0%;'
                  }"></div>
                </div>
                
                <!-- Work process description -->
                ${item.work_process ? `
                <div style="display:flex;align-items:flex-start;gap:8px;padding:8px 10px;background:#f8fafc;border-radius:8px;border:1px dashed #e2e8f0;">
                  <i class="bi bi-gear" style="color:#6366f1;font-size:0.85rem;margin-top:1px;"></i>
                  <div>
                    <div style="font-size:0.72rem;color:#64748b;font-weight:600;margin-bottom:2px;">PROSES / KEGIATAN</div>
                    <div style="font-size:0.82rem;color:#334155;line-height:1.5;">
                      ${UtilityService.escapeHtml(item.work_process)}
                    </div>
                  </div>
                </div>
                ` : `
                <div style="padding:8px 10px;background:#f8fafc;border-radius:8px;border:1px dashed #e2e8f0;text-align:center;">
                  <span style="font-size:0.75rem;color:#94a3b8;">
                    <i class="bi bi-info-circle"></i> Belum ada deskripsi proses
                  </span>
                </div>
                `}
                
                <!-- Year label if visible -->
                ${yearLabel ? `
                <div style="text-align:right;margin-top:8px;">
                  <span style="font-size:0.68rem;color:#94a3b8;font-weight:500;">
                    <i class="bi bi-dot"></i> ${yearLabel}
                  </span>
                </div>
                ` : ''}
              </div>
            </div>
          </div>
        </div>`;
      });
      
      docIndex++;
    });

    html += `</div>`; // Close modern-timeline

    // Print-specific styles
    html += `
    <style>
      @media print {
        .modern-timeline > div[style*="position:absolute"] {
          background: #cbd5e1 !important;
        }
        .modern-timeline [style*="border-radius:50%"] {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .modern-timeline [style*="border-radius:12px"] {
          break-inside: avoid;
          page-break-inside: avoid;
        }
      }
    </style>`;

    return html;
  },

  // ============================================================
  // JSA REPORT
  // ============================================================
  buildJSAReport(projectId, company) {
    let list=[...this._data.jsa];
    if(projectId) list=list.filter(j=>j.project_id===projectId);
    if(!list.length) return '<div class="alert alert-info">Tidak ada data JSA untuk filter yang dipilih.</div>';
    const permitLabels={hot_work:'🔥 Hot Work',confined_space:'🚧 Confined Space',working_height:'📐 Ketinggian',electrical:'⚡ Isolasi Listrik',lifting:'🏗️ Lifting',excavation:'⛏️ Excavation',pressure_test:'🔧 Pressure Test',radiation:'☢️ Radiasi'};
    const project = projectId ? this._data.projects.find(p=>p.id===projectId) : null;
    let html='';
    html+=this.buildReportHeader(company,'JOB SAFETY ANALYSIS','bi-journal-check');
    
    if (project) {
      html += this.buildProjectInfoSection(project, false);
    }
    
    list.forEach((jsa,index)=>{
      const proj=this._data.projects.find(p=>p.id===jsa.project_id);
      if(index>0) html+=`<hr style="border:2px dashed var(--color-border);margin:24px 0;">`;
      html+=`<div class="page-break-inside-avoid">`;
      
      html+=`<div class="report-section-title"><i class="bi bi-file-text"></i> Detail Dokumen JSA</div>`;
      html+=`<table class="table table-bordered table-sm"><tbody>
        ${this.createReportRow('No. Dokumen JSA',`<strong>${UtilityService.escapeHtml(jsa.document_number)}</strong>`)}
        ${this.createReportRow('Revisi',UtilityService.escapeHtml(jsa.revision||'0'))}
        ${this.createReportRow('Tanggal Pembuatan',UtilityService.formatDate(jsa.date))}
      </tbody></table>`;
      
      const apdItems=[...((jsa.ppe?.selected_items)||[]),...((jsa.ppe?.custom_items)||[]).filter(Boolean)];
      html+=`<div class="report-section-title"><i class="bi bi-shield-check"></i> 1. Alat Pelindung Diri (APD)</div>
      <div class="mb-3">${apdItems.length?apdItems.map(i=>`<span class="badge bg-light text-dark me-1 mb-1">${UtilityService.escapeHtml(i)}</span>`).join(''):'<span class="text-muted">Tidak ada APD yang dipilih</span>'}</div>`;
      
      const hazards=jsa.hazard_identification||[];
      html+=`<div class="report-section-title"><i class="bi bi-exclamation-triangle"></i> 2. Identifikasi Bahaya & Pengendalian Risiko</div>
      <table class="table table-bordered table-sm"><thead><tr><th class="col-width-40">No</th><th>Tahapan Pekerjaan</th><th>Potensi Bahaya</th><th>Dampak</th><th>Pengendalian Risiko</th></tr></thead><tbody>`;
      if(hazards.length) hazards.forEach((h,i)=>{ html+=`<tr><td class="text-center">${i+1}</td><td>${UtilityService.escapeHtml(h.step||'-')}</td><td>${UtilityService.escapeHtml(h.danger||'-')}</td><td>${UtilityService.escapeHtml(h.impact||'-')}</td><td>${UtilityService.escapeHtml(h.control||'-')}</td>`; });
      else html+=`<tr><td colspan="5" class="text-center text-muted">Tidak ada data identifikasi bahaya</td></tr>`;
      html+=`</tbody></table>`;
      
      let sn=3;
      const em=jsa.emergency||{};
      if(em.type||em.procedure||em.assembly_point||em.emergency_number){ 
        html+=`<div class="report-section-title"><i class="bi bi-exclamation-octagon"></i> ${sn}. Prosedur Tanggap Darurat</div>
        <table class="table table-bordered table-sm"><tbody>
          ${this.createReportRow('Jenis Keadaan Darurat',UtilityService.escapeHtml(em.type||'-'))}
          ${this.createReportRow('Prosedur Penanganan',UtilityService.escapeHtml(em.procedure||'-'))}
          ${this.createReportRow('Titik Kumpul',UtilityService.escapeHtml(em.assembly_point||'-'))}
          ${this.createReportRow('Nomor Telepon Darurat',UtilityService.escapeHtml(em.emergency_number||'-'))}
        </tbody></table>`; sn++; 
      }
      
      const activePermits=Object.entries(jsa.permits||{}).filter(([,v])=>v===true).map(([k])=>permitLabels[k]||k);
      if(activePermits.length){ 
        html+=`<div class="report-section-title"><i class="bi bi-patch-check"></i> ${sn}. Permit to Work yang Diperlukan</div>
        <div class="mb-3">${activePermits.map(p=>`<span class="badge bg-warning text-dark me-1 mb-1">${UtilityService.escapeHtml(p)}</span>`).join('')}</div>`; sn++; 
      }
      
      html+=this.buildApprovalSection(jsa.prepared_by, jsa.reviewed_by, jsa.approved_by);
      html+=`</div>`;
    });
    html+=this.buildReportFooter(company);
    return html;
  },

  // ============================================================
  // WORK METHOD REPORT
  // ============================================================
  buildWMReport(projectId, company) {
    let list=[...this._data.wm];
    if(projectId) list=list.filter(w=>w.project_id===projectId);
    if(!list.length) return '<div class="alert alert-info">Tidak ada data Metode Kerja untuk filter yang dipilih.</div>';
    const project = projectId ? this._data.projects.find(p=>p.id===projectId) : null;
    let html='';
    html+=this.buildReportHeader(company,'METODE KERJA','bi-diagram-3');
    
    if (project) {
      html += this.buildProjectInfoSection(project, false);
    }
    
    list.forEach((wm,index)=>{
      const proj=this._data.projects.find(p=>p.id===wm.project_id);
      if(index>0) html+=`<hr style="border:2px dashed var(--color-border);margin:24px 0;">`;
      html+=`<div class="page-break-inside-avoid">`;
      
      html+=`<div class="report-section-title"><i class="bi bi-file-text"></i> Detail Dokumen Metode Kerja</div>`;
      html+=`<table class="table table-bordered table-sm"><tbody>
        ${this.createReportRow('No. Dokumen',`<strong>${UtilityService.escapeHtml(wm.document_number)}</strong>`)}
        ${this.createReportRow('Revisi',UtilityService.escapeHtml(wm.revision||'0'))}
        ${this.createReportRow('Tanggal Pembuatan',UtilityService.formatDate(wm.date))}
      </tbody></table>`;
      
      const steps=wm.work_steps||[];
      html+=`<div class="report-section-title"><i class="bi bi-list-ol"></i> 1. Uraian Langkah Kerja</div>
      <table class="table table-bordered table-sm"><thead><tr><th class="col-width-40">No</th><th>Tahapan Kerja</th><th>Alat Kerja</th><th>Proses / Kegiatan Pekerjaan</th></tr></thead><tbody>`;
      if(steps.length) steps.forEach((s,i)=>{ html+=`<tr><td class="text-center">${i+1}</td><td>${UtilityService.escapeHtml(s.work_stage||'-')}</td><td>${UtilityService.escapeHtml(s.tools||'-')}</td><td>${UtilityService.escapeHtml(s.work_process||'-')}</td>`; });
      else html+=`<tr><td colspan="4" class="text-center text-muted">Tidak ada langkah kerja</td></tr>`;
      html+=`</tbody></table>`;
      
      html+=this.buildApprovalSection(wm.prepared_by, wm.reviewed_by, wm.approved_by);
      html+=`</div>`;
    });
    html+=this.buildReportFooter(company);
    return html;
  },

  // ============================================================
  // COST PROJECT REPORT
  // ============================================================
  buildPOReport(projectId, company) {
    let list=[...this._data.po];
    if(projectId) list=list.filter(p=>p.project_id===projectId);
    if(!list.length) return '<div class="alert alert-info">Tidak ada data Pembelian untuk filter yang dipilih.</div>';
    const project=projectId?this._data.projects.find(p=>p.id===projectId):null;
    const grandTotal=list.reduce((s,p)=>s+(p.total_price||0),0);
    let html='';
    html+=this.buildReportHeader(company,'COST PROJECT','bi-cart');
    
    if(project) {
      html+=this.buildProjectInfoSection(project, true);
    }
    
    html+=`<div class="report-section-title"><i class="bi bi-cart-check"></i> Daftar Item Pembelian</div>
    <table class="table table-bordered table-sm"><thead><tr>
      <th class="col-width-30">No</th>
      <th>Nama Material</th>
      <th>Spesifikasi</th>
      <th class="col-width-50">Qty</th>
      <th class="col-width-50">Unit</th>
      <th class="col-width-100">Harga Satuan</th>
      <th class="col-width-100">Total Harga</th>
      <th class="col-width-90">Tanggal</th>
    </tr></thead><tbody>`;
    
    list.forEach((po,i)=>{ 
      html+=`<tr>
        <td class="text-center">${i+1}</td>
        <td><strong>${UtilityService.escapeHtml(po.material_name||'-')}</strong></td>
        <td>${UtilityService.escapeHtml(po.specification||'-')}</td>
        <td class="text-center">${po.quantity||0}</td>
        <td class="text-center">${UtilityService.escapeHtml(po.unit||'-')}</td>
        <td class="text-end">${UtilityService.formatCurrency(po.unit_price)}</td>
        <td class="text-end"><strong>${UtilityService.formatCurrency(po.total_price)}</strong></td>
        <td class="text-center">${UtilityService.formatDate(po.date)}</td>
      </tr>`; 
    });
    
    html+=`</tbody><tfoot><tr class="fw-bold" style="background:#f0f9ff;">
      <td colspan="6" class="text-end">TOTAL KESELURUHAN:</td>
      <td class="text-end"><strong class="text-success">${UtilityService.formatCurrency(grandTotal)}</strong></td>
      <td></td>
    </tr></tfoot></table>`;
    
    html+=`<div class="report-summary-box"><div class="row">
      <div class="col-6"><strong>Total Item:</strong> ${list.length}</div>
      <div class="col-6 text-end"><strong>Grand Total:</strong> <span class="text-success" style="font-size:1.1rem;">${UtilityService.formatCurrency(grandTotal)}</span></div>
    </div></div>`;

    let projects=[...this._data.projects];
    if(projectId) projects=projects.filter(p=>p.id===projectId);
    
    if(projects.length) {
      let totalBudget=0, totalSpent=0;

      html += `<div class="page-break"></div>`;
      html += `<div class="report-section-title"><i class="bi bi-cash-stack"></i> Keuangan Proyek</div>`;

      projects.forEach((project, index) => {
        const poList = this._data.po.filter(p => p.project_id === project.id);
        const totalPO = poList.reduce((s, p) => s + (p.total_price || 0), 0);
        const budget = project.contract_value || 0;
        const remaining = budget - totalPO;
        const pct = budget > 0 ? Math.round((totalPO / budget) * 100) : 0;
        totalBudget += budget;
        totalSpent += totalPO;

        if (index > 0) html += `<hr style="border:2px dashed var(--color-border);margin:24px 0;">`;
        html += `<div class="page-break-inside-avoid">`;
        html += `<h5 class="text-primary mb-3"><i class="bi bi-building"></i> ${UtilityService.escapeHtml(project.name)}</h5>`;
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
            </div>`;
        html += `<div class="progress progress--md mb-3">
              <div class="progress-bar" style="width:${Math.min(pct, 100)}%;background:${pct > 80 ? '#ef4444' : pct > 50 ? '#f59e0b' : '#10b981'}">
                <strong>${pct}%</strong>
              </div>
            </div>`;
        html += `<table class="table table-bordered table-sm"><tbody>
              ${this.createReportRow('Nama Proyek', `<strong>${UtilityService.escapeHtml(project.name)}</strong>`)}
              ${this.createReportRow('Client', UtilityService.escapeHtml(project.client))}
              ${this.createReportRow('Nilai Kontrak', UtilityService.formatCurrency(budget))}
              ${this.createReportRow('Total Pengeluaran', UtilityService.formatCurrency(totalPO))}
              ${this.createReportRow('Persentase Penggunaan', `${pct}%`)}
              ${this.createReportRow('Sisa Anggaran', `<strong class="${remaining >= 0 ? 'text-success' : 'text-danger'}">${UtilityService.formatCurrency(remaining)}</strong>`)}
            </tbody></table>`;
        html += `</div>`;
      });

      if (!projectId && projects.length > 1) {
        const totalRem = totalBudget - totalSpent;
        const totalPct = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;
        html += `<div class="page-break-inside-avoid">
              <div class="report-section-title"><i class="bi bi-pie-chart"></i> Rekapitulasi Seluruh Proyek</div>
              <div class="row g-3 mb-3">
                <div class="col-4">
                  <div class="report-finance-card report-finance-card--info">
                    <div class="report-finance-card__label">Total Nilai Kontrak</div>
                    <div class="report-finance-card__value" style="font-size:1.1rem;">${UtilityService.formatCurrency(totalBudget)}</div>
                  </div>
                </div>
                <div class="col-4">
                  <div class="report-finance-card report-finance-card--warning">
                    <div class="report-finance-card__label">Total Pembelian</div>
                    <div class="report-finance-card__value" style="font-size:1.1rem;">${UtilityService.formatCurrency(totalSpent)}</div>
                  </div>
                </div>
                <div class="col-4">
                  <div class="report-finance-card ${totalRem >= 0 ? 'report-finance-card--success' : 'report-finance-card--danger'}">
                    <div class="report-finance-card__label">Sisa Total Anggaran</div>
                    <div class="report-finance-card__value" style="font-size:1.1rem;">${UtilityService.formatCurrency(totalRem)}</div>
                  </div>
                </div>
              </div>
              <div class="progress progress--md mb-3">
                <div class="progress-bar" style="width:${Math.min(totalPct, 100)}%;background:${totalPct > 80 ? '#ef4444' : totalPct > 50 ? '#f59e0b' : '#10b981'}">
                  <strong>${totalPct}%</strong>
                </div>
              </div>
            </div>`;
      }
    }

    html += this.buildReportFooter(company);
    return html;
  },

  // ============================================================
  // MANPOWER REPORT
  // ============================================================
  buildManpowerReport(projectId, company) {
    const E = UtilityService.escapeHtml.bind(UtilityService);
    const fmtDate = UtilityService.formatDate.bind(UtilityService);

    function calcAge(birthDate) {
      if (!birthDate) return '-';
      const dob = new Date(birthDate);
      if (isNaN(dob)) return '-';
      const now = new Date();
      let age = now.getFullYear() - dob.getFullYear();
      const m = now.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
      return age + ' thn';
    }

    let projects = [...this._data.projects];
    if (projectId) projects = projects.filter(p => p.id === projectId);
    if (!projects.length) return '<div class="alert alert-info">Tidak ada data Proyek untuk filter yang dipilih.</div>';

    const personnelMap = {};
    this._data.personnel.forEach(p => { personnelMap[p.id] = p; });

    const assignByProject = {};
    this._data.manpower.forEach(m => {
      if (!assignByProject[m.project_id]) assignByProject[m.project_id] = [];
      assignByProject[m.project_id].push(m.personnel_id);
    });

    let html = '';
    html += this.buildReportHeader(company, 'MAN POWER', 'bi-people');

    projects.forEach((project, index) => {
      const pIds     = assignByProject[project.id] || [];
      const workers  = pIds.map(id => personnelMap[id]).filter(Boolean);
      
      if (index > 0) html += '<hr style="border:2px dashed var(--color-border);margin:24px 0;">';
      html += '<div class="page-break-inside-avoid">';
      
      html += this.buildProjectInfoSection(project, false);

      if (!workers.length) {
        html += '<div class="alert alert-warning"><i class="bi bi-person-x"></i> Belum ada personel yang ditugaskan untuk proyek ini.</div>';
      } else {
        html += `<div class="report-section-title"><i class="bi bi-people-fill"></i> Daftar Personel</div>`;
        html += '<table class="table table-bordered table-sm">'
          + '<thead><tr>'
          + '<th class="col-width-40 text-center">No</th>'
          + '<th>Nama Lengkap</th>'
          + '<th>NIK</th>'
          + '<th>Tanggal Lahir</th>'
          + '<th class="col-width-60 text-center">Umur</th>'
          + '<th>Jabatan</th>'
          + '<th>Alamat</th>'
          + '</tr></thead><tbody>';
        workers.forEach((w, i) => {
          html += '<tr>'
            + '<td class="text-center">' + (i+1) + '</td>'
            + '<td><strong>' + E(w.name) + '</strong></td>'
            + '<td style="font-family:monospace;">' + E(w.nik||'—') + '</td>'
            + '<td>' + (w.birth_date ? fmtDate(w.birth_date) : '—') + '</td>'
            + '<td class="text-center"><span class="badge bg-info text-dark">' + calcAge(w.birth_date) + '</span></td>'
            + '<td>' + E(w.position||'-') + '</td>'
            + '<td>' + E(w.address||'—') + '</td>'
            + '</tr>';
        });
        html += '</tbody></table>';
        html += '<div class="report-summary-box"><div class="row">'
          + '<div class="col-6"><strong>Total Personel:</strong> ' + workers.length + ' orang</div>'
          + '<div class="col-6 text-end"><strong>Tanggal Cetak:</strong> '
          + fmtDate(new Date().toISOString()) + '</div>'
          + '</div></div>';
      }
      html += '</div>';
    });

    if (!projectId && projects.length > 1) {
      const totalWorkers = new Set(
        Object.values(assignByProject).flat()
      ).size;
      html += '<hr style="border:2px solid var(--color-border);margin:24px 0;">';
      html += '<div class="page-break-inside-avoid">';
      html += '<div class="report-section-title"><i class="bi bi-pie-chart"></i> Rekapitulasi Man Power</div>';
      html += '<table class="table table-bordered table-sm"><thead><tr>'
        + '<th class="col-width-40">No</th><th>Nama Proyek</th>'
        + '<th class="text-center col-width-80">Jml Personel</th>'
        + '</tr></thead><tbody>';
      projects.forEach((project, i) => {
        const cnt = (assignByProject[project.id]||[]).length;
        html += '<tr><td class="text-center">' + (i+1) + '</td>'
          + '<td>' + E(project.name) + '</td>'
          + '<td class="text-center"><strong>' + cnt + '</strong></td></tr>';
      });
      html += '</tbody><tfoot><tr class="fw-bold" style="background:#f0f9ff;">'
        + '<td colspan="2" class="text-end">Total Personel Unik:</td>'
        + '<td class="text-center">' + totalWorkers + '</td>'
        + '</tr></tfoot></table>';
      html += '</div>';
    }

    html += this.buildReportFooter(company);
    return html;
  }
};