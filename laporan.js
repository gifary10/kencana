// laporan.js — Report Page (async Google Sheets)
const ReportPage = {
  _currentReportType: 'jsa',
  _loadedTabs: new Set(),
  _data: { projects:[], jsa:[], wm:[], po:[], personnel:[], manpower:[], company:null },

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
    this._data = { projects:[], jsa:[], wm:[], po:[], personnel:[], manpower:[], company:null };

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
      document.getElementById('reportOutput').innerHTML = UIService.showFlowBanner(
        'bi-clipboard-plus', 'Belum Ada Proyek',
        'Buat proyek terlebih dahulu sebelum mencetak laporan.',
        '<i class="bi bi-clipboard-data"></i> Buat Proyek',
        "UIService.navigate('proyek')"
      );
      return;
    }

    // Aktifkan tab default tapi langsung tampilkan banner pilih proyek
    this._currentReportType = 'jsa';
    document.querySelectorAll('#reportTabs .tab-nav__btn').forEach((btn, idx) => {
      btn.classList.toggle('tab-nav__btn--active', idx === 0);
    });
    this.renderReport(); // akan tampilkan banner "pilih proyek" karena belum ada yang dipilih
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
    // Load data tab aktif jika belum pernah dimuat
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
      // Belum pilih proyek — tampilkan banner langsung tanpa fetch data
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

    // Guard: proyek wajib dipilih sebelum laporan ditampilkan
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

    // Render timeline chart jika tab schedule
    if (this._currentReportType === 'schedule') {
      setTimeout(() => this.renderTimelineChart(projectId), 100);
    }
  },

  createReportRow(label, value) {
    return `<tr><td class="col-width-28 fw-semibold" style="background:#f8fafc;">${UtilityService.escapeHtml(label)}</td><td>${value||'-'}</td></tr>`;
  },

  // ============================================================
  // REPORT HEADER — TANPA nama proyek & TANPA tanggal
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

  buildProjectInfoSection(project, includeAllFields=true) {
    if(!project) return '';
    let h=`<div class="report-section-title">Informasi Proyek</div><table class="table table-bordered table-sm"><tbody>${this.createReportRow('Nama Proyek',`<strong>${UtilityService.escapeHtml(project.name)}</strong>`)}${this.createReportRow('Client / Owner',UtilityService.escapeHtml(project.client))}${this.createReportRow('Lokasi Proyek',UtilityService.escapeHtml(project.location))}${this.createReportRow('Penanggung Jawab (PIC)',UtilityService.escapeHtml(project.pic))}`;
    if(includeAllFields) h+=`${this.createReportRow('Nilai Kontrak',UtilityService.formatCurrency(project.contract_value))}${this.createReportRow('Tanggal Mulai',project.start_date?UtilityService.formatDate(project.start_date):'-')}${this.createReportRow('Tanggal Selesai',project.end_date?UtilityService.formatDate(project.end_date):'-')}`;
    h+=`</tbody></table>`;
    return h;
  },

  // ============================================================
  // LEMBAR PENGESAHAN — TANPA tanggal
  // ============================================================
  buildApprovalSection(preparedBy, reviewedBy, approvedBy) {
    return `<div class="report-section-title">Lembar Pengesahan</div>
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
  // SCHEDULE REPORT WITH TIMELINE CHART
  // ============================================================
  buildScheduleReport(projectId, company) {
    let wmList = [...this._data.wm];
    if (projectId) wmList = wmList.filter(w => w.project_id === projectId);
    
    const project = projectId ? this._data.projects.find(p => p.id === projectId) : null;

    // Kumpulkan semua schedule data dari work methods
    const scheduleItems = [];
    wmList.forEach(wm => {
      if (wm.work_steps && Array.isArray(wm.work_steps)) {
        wm.work_steps.forEach((step, i) => {
          const startDate = step.start_date || '';
          const endDate = step.end_date || '';
          scheduleItems.push({
            id: `sch_${wm.id}_${i}`,
            documentNumber: wm.document_number || 'Tanpa Nomor',
            stepNumber: step.step_number || (i + 1),
            workStage: step.work_stage || '',
            tools: step.tools || '',
            workProcess: step.work_process || '',
            startDate: startDate,
            endDate: endDate,
            projectId: wm.project_id
          });
        });
      }
    });

    // Urutkan berdasarkan document number dan step number
    scheduleItems.sort((a, b) => {
      if (a.documentNumber !== b.documentNumber) {
        return a.documentNumber.localeCompare(b.documentNumber);
      }
      return a.stepNumber - b.stepNumber;
    });

    let html = '';
    html += this.buildReportHeader(company, 'SCHEDULE', 'bi-calendar-week');

    if (project) {
      html += this.buildProjectInfoSection(project, false);
    }

    // Timeline Chart Container
    html += `
    <div class="report-section-title">
      <i class="bi bi-bar-chart-steps"></i> Timeline Chart
    </div>
    <div class="card mb-4 no-print" id="timelineChartCard">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-center mb-3">
          <div>
            <span style="font-size:.75rem;color:var(--color-text-muted);">
              <span class="badge bg-success me-1">&nbsp;</span> Selesai
              <span class="badge bg-warning me-1">&nbsp;</span> Berlangsung
              <span class="badge bg-info me-1">&nbsp;</span> Mendatang
              <span class="badge bg-secondary me-1">&nbsp;</span> Belum Diatur
            </span>
          </div>
        </div>
        <div id="timelineChart" style="overflow-x:auto;overflow-y:auto;max-height:600px;">
          <p class="text-center text-muted py-4">Memuat timeline...</p>
        </div>
      </div>
    </div>`;

    // Tabel Detail Jadwal
    html += `
    <div class="report-section-title">
      <i class="bi bi-table"></i> Detail Jadwal Kerja
    </div>
    <div class="table-responsive">
      <table class="table table-bordered table-sm">
        <thead>
          <tr>
            <th class="col-width-40 text-center">No</th>
            <th>Tahapan Kerja</th>
            <th>Proses / Kegiatan</th>
            <th class="text-center col-width-110">Tanggal Mulai</th>
            <th class="text-center col-width-110">Tanggal Selesai</th>
            <th class="text-center col-width-80">Durasi (Hari)</th>
          </tr>
        </thead>
        <tbody>`;

    if (scheduleItems.length === 0) {
      html += `<tr><td colspan="6" class="text-center text-muted py-4">Tidak ada data jadwal kerja</td></tr>`;
    } else {
      scheduleItems.forEach((item, index) => {
        const hasDates = item.startDate && item.endDate;
        const dateValid = hasDates && new Date(item.startDate) <= new Date(item.endDate);
        
        let duration = '-';
        if (dateValid) {
          const start = new Date(item.startDate);
          const end = new Date(item.endDate);
          const diffTime = Math.abs(end - start);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
          duration = diffDays + ' hari';
        }

        html += `
          <tr>
            <td class="text-center">${index + 1}</td>
            <td>${UtilityService.escapeHtml(item.workStage || '—')}</td>
            <td style="font-size:.78rem;">${UtilityService.escapeHtml(item.workProcess || '—')}</td>
            <td class="text-center">${item.startDate ? UtilityService.formatDate(item.startDate) : '—'}</td>
            <td class="text-center">${item.endDate ? UtilityService.formatDate(item.endDate) : '—'}</td>
            <td class="text-center">${duration}</td>
          </tr>`;
      });
    }

    html += `
        </tbody>
      </table>
    </div>`;

    html += this.buildReportFooter(company);
    return html;
  },

  // Render Timeline Chart menggunakan Canvas
  renderTimelineChart(projectId) {
    const chartContainer = document.getElementById('timelineChart');
    if (!chartContainer) return;

    let wmList = [...this._data.wm];
    if (projectId) wmList = wmList.filter(w => w.project_id === projectId);

    // Kumpulkan schedule items dengan tanggal
    const scheduleItems = [];
    wmList.forEach(wm => {
      if (wm.work_steps && Array.isArray(wm.work_steps)) {
        wm.work_steps.forEach((step, i) => {
          if (step.start_date && step.end_date) {
            scheduleItems.push({
              id: `sch_${wm.id}_${i}`,
              documentNumber: wm.document_number || 'Tanpa Nomor',
              stepNumber: step.step_number || (i + 1),
              workStage: step.work_stage || '',
              startDate: step.start_date,
              endDate: step.end_date
            });
          }
        });
      }
    });

    if (scheduleItems.length === 0) {
      chartContainer.innerHTML = '<p class="text-center text-muted py-4">Tidak ada data jadwal dengan tanggal yang lengkap untuk ditampilkan dalam timeline.</p>';
      return;
    }

    // Cari rentang tanggal
    let minDate = null;
    let maxDate = null;
    scheduleItems.forEach(item => {
      const start = new Date(item.startDate);
      const end = new Date(item.endDate);
      if (!minDate || start < minDate) minDate = start;
      if (!maxDate || end > maxDate) maxDate = end;
    });

    // Tambah padding 3 hari di kiri dan kanan
    minDate = new Date(minDate);
    minDate.setDate(minDate.getDate() - 3);
    maxDate = new Date(maxDate);
    maxDate.setDate(maxDate.getDate() + 3);

    const totalDays = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24)) + 1;

    // Siapkan canvas
    const rowHeight = 36;
    const leftMargin = 200;
    const rightMargin = 20;
    const topMargin = 30;
    const bottomMargin = 10;
    const barHeight = 20;
    const canvasWidth = Math.max(leftMargin + totalDays * 4 + rightMargin, 800);
    const canvasHeight = topMargin + scheduleItems.length * rowHeight + bottomMargin;

    chartContainer.innerHTML = `
      <canvas id="timelineCanvas" width="${canvasWidth}" height="${canvasHeight}" 
              style="min-width:100%;"></canvas>`;

    const canvas = document.getElementById('timelineCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Clear canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Draw header background
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, canvasWidth, topMargin);

    // Draw month labels
    ctx.fillStyle = '#f1f5f9';
    ctx.font = 'bold 10px Inter, sans-serif';
    ctx.textAlign = 'left';

    let currentMonth = null;
    let monthStartX = leftMargin;

    for (let d = 0; d < totalDays; d++) {
      const date = new Date(minDate);
      date.setDate(date.getDate() + d);
      const monthKey = date.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
      
      if (monthKey !== currentMonth) {
        if (currentMonth !== null) {
          const monthWidth = leftMargin + d * 4 - monthStartX;
          if (monthWidth > 40) {
            ctx.fillText(currentMonth, monthStartX + 4, 18);
          }
        }
        currentMonth = monthKey;
        monthStartX = leftMargin + d * 4;
      }
    }
    if (currentMonth && leftMargin + totalDays * 4 - monthStartX > 40) {
      ctx.fillText(currentMonth, monthStartX + 4, 18);
    }

    // Draw grid lines and date markers
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 0.5;

    for (let d = 0; d <= totalDays; d++) {
      const x = leftMargin + d * 4;
      
      ctx.beginPath();
      ctx.moveTo(x, topMargin);
      ctx.lineTo(x, canvasHeight);
      ctx.stroke();

      if (d % 7 === 0 && d < totalDays) {
        const date = new Date(minDate);
        date.setDate(date.getDate() + d);
        ctx.fillStyle = '#475569';
        ctx.font = '8px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(date.getDate(), x, topMargin - 6);
      }
    }

    // Draw today line
    if (today >= minDate && today <= maxDate) {
      const todayX = leftMargin + Math.ceil((today - minDate) / (1000 * 60 * 60 * 24)) * 4;
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(todayX, topMargin);
      ctx.lineTo(todayX, canvasHeight);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 9px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('HARI INI', todayX, topMargin - 12);
    }

    // Draw horizontal row backgrounds
    for (let i = 0; i < scheduleItems.length; i++) {
      const y = topMargin + i * rowHeight;
      ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#f8fafc';
      ctx.fillRect(0, y, canvasWidth, rowHeight);
    }

    // Draw labels
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 9px Inter, sans-serif';
    ctx.textAlign = 'right';

    for (let i = 0; i < scheduleItems.length; i++) {
      const y = topMargin + i * rowHeight;
      const label = scheduleItems[i].workStage.length > 28 
        ? scheduleItems[i].workStage.substring(0, 26) + '...' 
        : scheduleItems[i].workStage;
      
      ctx.fillStyle = '#64748b';
      ctx.font = '7px Inter, sans-serif';
      ctx.fillText(scheduleItems[i].documentNumber, leftMargin - 8, y + 12);
      
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 9px Inter, sans-serif';
      ctx.fillText(label, leftMargin - 8, y + 26);

      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, y + rowHeight - 1);
      ctx.lineTo(canvasWidth, y + rowHeight - 1);
      ctx.stroke();
    }

    // Draw bars
    for (let i = 0; i < scheduleItems.length; i++) {
      const item = scheduleItems[i];
      const startDate = new Date(item.startDate);
      const endDate = new Date(item.endDate);
      const y = topMargin + i * rowHeight + (rowHeight - barHeight) / 2;
      const x1 = leftMargin + Math.ceil((startDate - minDate) / (1000 * 60 * 60 * 24)) * 4;
      const x2 = leftMargin + Math.ceil((endDate - minDate) / (1000 * 60 * 60 * 24)) * 4 + 4;
      const barWidth = Math.max(x2 - x1, 6);
      const radius = 4;

      let barColor;
      if (endDate < today) {
        barColor = '#16a34a';
      } else if (startDate <= today && endDate >= today) {
        barColor = '#f59e0b';
      } else {
        barColor = '#3b82f6';
      }

      ctx.fillStyle = barColor;
      ctx.beginPath();
      ctx.moveTo(x1 + radius, y);
      ctx.lineTo(x1 + barWidth - radius, y);
      ctx.quadraticCurveTo(x1 + barWidth, y, x1 + barWidth, y + radius);
      ctx.lineTo(x1 + barWidth, y + barHeight - radius);
      ctx.quadraticCurveTo(x1 + barWidth, y + barHeight, x1 + barWidth - radius, y + barHeight);
      ctx.lineTo(x1 + radius, y + barHeight);
      ctx.quadraticCurveTo(x1, y + barHeight, x1, y + barHeight - radius);
      ctx.lineTo(x1, y + radius);
      ctx.quadraticCurveTo(x1, y, x1 + radius, y);
      ctx.closePath();
      ctx.fill();

      if (barWidth > 80) {
        ctx.fillStyle = '#ffffff';
        ctx.font = '7px Inter, sans-serif';
        ctx.textAlign = 'center';
        const startLabel = startDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
        const endLabel = endDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
        const midX = x1 + barWidth / 2;
        ctx.fillText(`${startLabel} - ${endLabel}`, midX, y + barHeight - 5);
      }
    }

    const legendHtml = `
      <div style="display:flex;gap:16px;justify-content:center;margin-top:8px;font-size:.75rem;color:var(--color-text-secondary);">
        <span><span style="display:inline-block;width:16px;height:12px;background:#16a34a;border-radius:3px;margin-right:4px;"></span> Selesai</span>
        <span><span style="display:inline-block;width:16px;height:12px;background:#f59e0b;border-radius:3px;margin-right:4px;"></span> Berlangsung</span>
        <span><span style="display:inline-block;width:16px;height:12px;background:#3b82f6;border-radius:3px;margin-right:4px;"></span> Mendatang</span>
      </div>`;
    chartContainer.insertAdjacentHTML('beforeend', legendHtml);
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
    list.forEach((jsa,index)=>{
      const proj=this._data.projects.find(p=>p.id===jsa.project_id);
      if(index>0) html+=`<hr style="border:2px dashed var(--color-border);margin:24px 0;">`;
      html+=`<div class="page-break-inside-avoid">`;
      html+=this.buildProjectInfoSection(proj,false);
      html+=`<table class="table table-bordered table-sm"><tbody>${this.createReportRow('No. Dokumen JSA',`<strong>${UtilityService.escapeHtml(jsa.document_number)}</strong>`)}${this.createReportRow('Revisi',UtilityService.escapeHtml(jsa.revision||'0'))}${this.createReportRow('Tanggal Pembuatan',UtilityService.formatDate(jsa.date))}</tbody></table>`;
      const apdItems=[...((jsa.ppe?.selected_items)||[]),...((jsa.ppe?.custom_items)||[]).filter(Boolean)];
      html+=`<div class="report-section-title">1. Alat Pelindung Diri (APD)</div><div class="mb-3">${apdItems.length?apdItems.map(i=>`<span class="badge bg-light text-dark me-1 mb-1">${UtilityService.escapeHtml(i)}</span>`).join(''):'<span class="text-muted">Tidak ada APD yang dipilih</span>'}</div>`;
      const hazards=jsa.hazard_identification||[];
      html+=`<div class="report-section-title">2. Identifikasi Bahaya & Pengendalian Risiko</div><table class="table table-bordered table-sm"><thead><tr><th class="col-width-40">No</th><th>Tahapan Pekerjaan</th><th>Potensi Bahaya</th><th>Dampak</th><th>Pengendalian Risiko</th></tr></thead><tbody>`;
      if(hazards.length) hazards.forEach((h,i)=>{ html+=`<tr><td class="text-center">${i+1}</td><td>${UtilityService.escapeHtml(h.step||'-')}</td><td>${UtilityService.escapeHtml(h.danger||'-')}</td><td>${UtilityService.escapeHtml(h.impact||'-')}</td><td>${UtilityService.escapeHtml(h.control||'-')}</td></tr>`; });
      else html+=`<tr><td colspan="5" class="text-center text-muted">Tidak ada data identifikasi bahaya</td></tr>`;
      html+=`</tbody></table>`;
      let sn=3;
      const em=jsa.emergency||{};
      if(em.type||em.procedure||em.assembly_point||em.emergency_number){ html+=`<div class="report-section-title">${sn}. Prosedur Tanggap Darurat</div><table class="table table-bordered table-sm"><tbody>${this.createReportRow('Jenis Keadaan Darurat',UtilityService.escapeHtml(em.type||'-'))}${this.createReportRow('Prosedur Penanganan',UtilityService.escapeHtml(em.procedure||'-'))}${this.createReportRow('Titik Kumpul',UtilityService.escapeHtml(em.assembly_point||'-'))}${this.createReportRow('Nomor Telepon Darurat',UtilityService.escapeHtml(em.emergency_number||'-'))}</tbody></table>`; sn++; }
      const activePermits=Object.entries(jsa.permits||{}).filter(([,v])=>v===true).map(([k])=>permitLabels[k]||k);
      if(activePermits.length){ html+=`<div class="report-section-title">${sn}. Permit to Work yang Diperlukan</div><div class="mb-3">${activePermits.map(p=>`<span class="badge bg-warning text-dark me-1 mb-1">${UtilityService.escapeHtml(p)}</span>`).join('')}</div>`; sn++; }
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
    html+=this.buildReportHeader(company,'WORK METHOD','bi-diagram-3');
    list.forEach((wm,index)=>{
      const proj=this._data.projects.find(p=>p.id===wm.project_id);
      if(index>0) html+=`<hr style="border:2px dashed var(--color-border);margin:24px 0;">`;
      html+=`<div class="page-break-inside-avoid">`;
      html+=this.buildProjectInfoSection(proj,false);
      html+=`<table class="table table-bordered table-sm"><tbody>${this.createReportRow('No. Dokumen',`<strong>${UtilityService.escapeHtml(wm.document_number)}</strong>`)}${this.createReportRow('Revisi',UtilityService.escapeHtml(wm.revision||'0'))}${this.createReportRow('Tanggal Pembuatan',UtilityService.formatDate(wm.date))}</tbody></table>`;
      const steps=wm.work_steps||[];
      html+=`<div class="report-section-title">1. Uraian Langkah Kerja</div><table class="table table-bordered table-sm"><thead><tr><th class="col-width-40">No</th><th>Tahapan Kerja</th><th>Alat Kerja</th><th>Proses / Kegiatan Pekerjaan</th></tr></thead><tbody>`;
      if(steps.length) steps.forEach((s,i)=>{ html+=`<tr><td class="text-center">${i+1}</td><td>${UtilityService.escapeHtml(s.work_stage||'-')}</td><td>${UtilityService.escapeHtml(s.tools||'-')}</td><td>${UtilityService.escapeHtml(s.work_process||'-')}</td></tr>`; });
      else html+=`<tr><td colspan="4" class="text-center text-muted">Tidak ada langkah kerja</td></tr>`;
      html+=`</tbody></table>`;
      html+=this.buildApprovalSection(wm.prepared_by, wm.reviewed_by, wm.approved_by);
      html+=`</div>`;
    });
    html+=this.buildReportFooter(company);
    return html;
  },

  // ============================================================
  // COST PROJECT REPORT (Dengan Keuangan)
  // ============================================================
  buildPOReport(projectId, company) {
    let list=[...this._data.po];
    if(projectId) list=list.filter(p=>p.project_id===projectId);
    if(!list.length) return '<div class="alert alert-info">Tidak ada data Pembelian untuk filter yang dipilih.</div>';
    const project=projectId?this._data.projects.find(p=>p.id===projectId):null;
    const grandTotal=list.reduce((s,p)=>s+(p.total_price||0),0);
    let html='';
    html+=this.buildReportHeader(company,'COST PROJECT','bi-cart');
    if(project) html+=this.buildProjectInfoSection(project,false);
    
    // ===== DAFTAR ITEM PEMBELIAN =====
    html+=`<div class="report-section-title">Daftar Item Pembelian</div><table class="table table-bordered table-sm"><thead><tr><th class="col-width-30">No</th><th>Proyek</th><th>Nama Material</th><th>Spesifikasi</th><th class="col-width-50">Qty</th><th class="col-width-50">Unit</th><th class="col-width-100">Harga Satuan</th><th class="col-width-100">Total Harga</th><th class="col-width-90">Tanggal</th></tr></thead><tbody>`;
    list.forEach((po,i)=>{ const pp=this._data.projects.find(x=>x.id===po.project_id); html+=`<tr><td class="text-center">${i+1}</td><td>${UtilityService.escapeHtml(pp?.name||'-')}</td><td><strong>${UtilityService.escapeHtml(po.material_name||'-')}</strong></td><td>${UtilityService.escapeHtml(po.specification||'-')}</td><td class="text-center">${po.quantity||0}</td><td class="text-center">${UtilityService.escapeHtml(po.unit||'-')}</td><td class="text-end">${UtilityService.formatCurrency(po.unit_price)}</td><td class="text-end"><strong>${UtilityService.formatCurrency(po.total_price)}</strong></td><td class="text-center">${UtilityService.formatDate(po.date)}</td></tr>`; });
    html+=`</tbody><tfoot><tr class="fw-bold" style="background:#f0f9ff;"><td colspan="7" class="text-end">TOTAL KESELURUHAN:</td><td class="text-end"><strong class="text-success">${UtilityService.formatCurrency(grandTotal)}</strong></td><td></td></tr></tfoot></table>`;
    html+=`<div class="report-summary-box"><div class="row"><div class="col-6"><strong>Total Item:</strong> ${list.length}</div><div class="col-6 text-end"><strong>Grand Total:</strong> <span class="text-success" style="font-size:1.1rem;">${UtilityService.formatCurrency(grandTotal)}</span></div></div></div>`;

    // ===== KEUANGAN PROYEK (CASHFLOW) =====
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

      // Rekapitulasi Seluruh Proyek
      if (!projectId && projects.length > 1) {
        const totalRem = totalBudget - totalSpent;
        const totalPct = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;
        html += `<div class="page-break-inside-avoid">
              <div class="report-section-title">Rekapitulasi Seluruh Proyek</div>
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
      html += '<h5 class="text-primary mb-2"><i class="bi bi-building"></i> '
        + E(project.name) + '</h5>';

      if (project.client || project.location) {
        html += '<p class="text-muted mb-3" style="font-size:.85rem;">'
          + (project.client ? '<i class="bi bi-person-badge"></i> ' + E(project.client) : '')
          + (project.client && project.location ? '  &nbsp;|&nbsp;  ' : '')
          + (project.location ? '<i class="bi bi-geo-alt"></i> ' + E(project.location) : '')
          + '</p>';
      }

      if (!workers.length) {
        html += '<div class="alert alert-warning">Belum ada personel yang ditugaskan untuk proyek ini.</div>';
      } else {
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
      html += '<div class="report-section-title">Rekapitulasi Man Power</div>';
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
        + '<td class="text-center">' + totalWorkers + '</td></tr></tfoot></table>';
      html += '</div>';
    }

    html += this.buildReportFooter(company);
    return html;
  }
};