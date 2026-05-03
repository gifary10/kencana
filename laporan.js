// laporan.js — Report Page (async Google Sheets)
const ReportPage = {
  _currentReportType: 'jsa',
  // Cache data setelah di-load agar render report tidak async
  _data: { projects:[], jsa:[], wm:[], po:[], personnel:[], manpower:[], company:null },

  render() {
    return `
    <div class="page-header no-print">
        <h2 class="page-title"><span class="page-title__icon"><i class="bi bi-file-earmark-pdf"></i></span>Laporan</h2>
        <button class="btn btn--primary" onclick="window.print()"><i class="bi bi-printer"></i> Cetak PDF</button>
      </div>
    <div id="reportListView">
      <div class="card no-print"><div class="card-body p-0">
        <div class="row g-2 p-3">
          <div class="col-4">
            <select class="form-select" id="selectReportProject" onchange="ReportPage.onProjectChange()">
              <option value="">Semua Proyek</option>
            </select>
          </div>
          <div class="col-4"><div id="reportDocSelector"></div></div>
          <div class="col-12">
            <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
              <div class="tab-nav" id="reportTabs" style="margin-bottom:0;border-bottom:none;">
                <button class="tab-nav__btn tab-nav__btn--active" onclick="ReportPage.switchReportTab('jsa')">JSA</button>
                <button class="tab-nav__btn" onclick="ReportPage.switchReportTab('wm')">Metode Kerja</button>
                <button class="tab-nav__btn" onclick="ReportPage.switchReportTab('po')">Cost Project</button>
                <button class="tab-nav__btn" onclick="ReportPage.switchReportTab('project')">Proyek</button>
                <button class="tab-nav__btn" onclick="ReportPage.switchReportTab('cashflow')">Keuangan</button>
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
    // Load all data once
    const [projects, jsa, wm, po, personnel, manpower, company] = await Promise.all([
      DataAccess.getAllProjects(), DataAccess.getAllJSA(), DataAccess.getAllWorkMethods(),
      DataAccess.getAllPO(), DataAccess.getAllPersonnel(), DataAccess.getAllManpower(),
      DataAccess.getCompany()
    ]);
    this._data = { projects, jsa, wm, po, personnel, manpower, company };

    const sel = document.getElementById('selectReportProject');
    if (sel) {
      sel.innerHTML = '<option value="">Semua Proyek</option>';
      projects.forEach(p => { const o=document.createElement('option'); o.value=p.id; o.textContent=p.name; sel.appendChild(o); });
    }

    if (!projects.length) {
      document.getElementById('reportOutput').innerHTML = UIService.showFlowBanner('bi-clipboard-plus','Belum Ada Proyek','Buat proyek terlebih dahulu sebelum mencetak laporan.','<i class="bi bi-clipboard-data"></i> Buat Proyek',"UIService.navigate('proyek')");
      return;
    }
    this.switchReportTab('jsa');
  },

  onProjectChange() { this.buildDocSelector(this._currentReportType); this.renderReport(); },

  switchReportTab(reportType) {
    this._currentReportType = reportType;
    document.querySelectorAll('#reportTabs .tab-nav__btn').forEach((btn,idx)=>{
      btn.classList.toggle('tab-nav__btn--active',['jsa','wm','po','project','cashflow','manpower'][idx]===reportType);
    });
    this.buildDocSelector(reportType);
    this.renderReport();
  },

  buildDocSelector(reportType) {
    const projectId = document.getElementById('selectReportProject')?.value||'';
    let selectorHTML = '';
    if (reportType==='jsa') {
      let list=this._data.jsa; if(projectId) list=list.filter(j=>j.project_id===projectId);
      selectorHTML=`<select class="form-select" id="selectReportDoc" onchange="ReportPage.renderReport()"><option value="">-- Semua Data (${list.length}) --</option>${list.map(j=>`<option value="${j.id}">${UtilityService.escapeHtml(j.document_number)}</option>`).join('')}</select>`;
    } else if (reportType==='wm') {
      let list=this._data.wm; if(projectId) list=list.filter(w=>w.project_id===projectId);
      selectorHTML=`<select class="form-select" id="selectReportDoc" onchange="ReportPage.renderReport()"><option value="">-- Semua Data (${list.length}) --</option>${list.map(w=>`<option value="${w.id}">${UtilityService.escapeHtml(w.document_number)}</option>`).join('')}</select>`;
    } else if (reportType==='po') {
      let list=this._data.po; if(projectId) list=list.filter(p=>p.project_id===projectId);
      selectorHTML=`<select class="form-select" id="selectReportDoc" onchange="ReportPage.renderReport()"><option value="">-- Semua Data (${list.length}) --</option>${list.map(p=>`<option value="${p.id}">${UtilityService.escapeHtml(p.material_name||p.id)} — ${UtilityService.formatCurrency(p.total_price)}</option>`).join('')}</select>`;
    } else if (reportType==='manpower') {
      const c=document.getElementById('reportDocSelector'); if(c) c.innerHTML=''; return;
    } else {
      const c=document.getElementById('reportDocSelector'); if(c) c.innerHTML=''; return;
    }
    const c=document.getElementById('reportDocSelector'); if(c) c.innerHTML=selectorHTML;
  },

  renderReport() {
    const projectId=document.getElementById('selectReportProject')?.value||'';
    const docId=document.getElementById('selectReportDoc')?.value||'';
    const company=this._data.company;
    let html='<div class="report-container">';
    switch(this._currentReportType){
      case 'jsa':      html+=this.buildJSAReport(docId,projectId,company); break;
      case 'wm':       html+=this.buildWMReport(docId,projectId,company); break;
      case 'po':       html+=this.buildPOReport(docId,projectId,company); break;
      case 'project':  html+=this.buildProjectReport(projectId,company); break;
      case 'cashflow':  html+=this.buildCashflowReport(projectId,company); break;
      case 'manpower':  html+=this.buildManpowerReport(projectId,company); break;
      default:         html+='<div class="alert alert-info">Pilih tipe laporan di atas</div>';
    }
    html+='</div>';
    document.getElementById('reportOutput').innerHTML=html;
  },

  createReportRow(label, value) {
    return `<tr><td class="col-width-28 fw-semibold" style="background:#f8fafc;">${UtilityService.escapeHtml(label)}</td><td>${value||'-'}</td></tr>`;
  },

  buildReportHeader(company, title, subtitle='', titleIcon='bi-file-earmark-pdf') {
    if (!company) return `<div class="report-header"><div class="report-header__content"><div class="report-header__title"><i class="bi ${titleIcon}"></i> ${UtilityService.escapeHtml(title)}</div>${subtitle?`<div class="report-header__subtitle">${UtilityService.escapeHtml(subtitle)}</div>`:''}<div class="report-header__date">Tanggal Cetak: ${UtilityService.formatDate(new Date().toISOString())}</div></div></div>`;
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
        ${subtitle?`<div class="report-header__doc-number">${UtilityService.escapeHtml(subtitle)}</div>`:''}
        <div class="report-header__date">${UtilityService.formatDate(new Date().toISOString())}</div>
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

  buildJSAReport(docId, projectId, company) {
    let list=[...this._data.jsa];
    if(projectId) list=list.filter(j=>j.project_id===projectId);
    if(docId) list=list.filter(j=>j.id===docId);
    if(!list.length) return '<div class="alert alert-info">Tidak ada data JSA untuk filter yang dipilih.</div>';
    const permitLabels={hot_work:'🔥 Hot Work',confined_space:'🚧 Confined Space',working_height:'📐 Ketinggian',electrical:'⚡ Isolasi Listrik',lifting:'🏗️ Lifting',excavation:'⛏️ Excavation',pressure_test:'🔧 Pressure Test',radiation:'☢️ Radiasi'};
    let html='';
    list.forEach((jsa,index)=>{
      const project=this._data.projects.find(p=>p.id===jsa.project_id);
      if(index>0) html+=`<div class="page-break"></div>`;
      html+=this.buildReportHeader(company,'JOB SAFETY ANALYSIS',jsa.document_number,'bi-journal-check');
      html+=this.buildProjectInfoSection(project,false);
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
      html+=`<div class="page-break-inside-avoid"><div class="report-section-title">${sn}. Lembar Pengesahan</div><div class="row signature-row"><div class="col-4"><div class="signature-box"><div class="signature-box__label">Disusun Oleh</div><div class="signature-box__name">${UtilityService.escapeHtml(jsa.prepared_by||'_________________')}</div><div class="signature-box__date">Tanggal: ${UtilityService.formatDate(jsa.date)}</div></div></div><div class="col-4"><div class="signature-box"><div class="signature-box__label">Diperiksa Oleh</div><div class="signature-box__name">${UtilityService.escapeHtml(jsa.reviewed_by||'_________________')}</div><div class="signature-box__date">Tanggal: _________________</div></div></div><div class="col-4"><div class="signature-box"><div class="signature-box__label">Disetujui Oleh</div><div class="signature-box__name">${UtilityService.escapeHtml(jsa.approved_by||'_________________')}</div><div class="signature-box__date">Tanggal: _________________</div></div></div></div></div>`;
      html+=this.buildReportFooter(company);
    });
    return html;
  },

  buildWMReport(docId, projectId, company) {
    let list=[...this._data.wm];
    if(projectId) list=list.filter(w=>w.project_id===projectId);
    if(docId) list=list.filter(w=>w.id===docId);
    if(!list.length) return '<div class="alert alert-info">Tidak ada data Metode Kerja untuk filter yang dipilih.</div>';
    let html='';
    list.forEach((wm,index)=>{
      const project=this._data.projects.find(p=>p.id===wm.project_id);
      if(index>0) html+=`<div class="page-break"></div>`;
      html+=this.buildReportHeader(company,'WORK METHOD',wm.document_number,'bi-diagram-3');
      html+=this.buildProjectInfoSection(project,false);
      html+=`<table class="table table-bordered table-sm"><tbody>${this.createReportRow('No. Dokumen',`<strong>${UtilityService.escapeHtml(wm.document_number)}</strong>`)}${this.createReportRow('Revisi',UtilityService.escapeHtml(wm.revision||'0'))}${this.createReportRow('Tanggal Pembuatan',UtilityService.formatDate(wm.date))}</tbody></table>`;
      const steps=wm.work_steps||[];
      html+=`<div class="report-section-title">1. Uraian Langkah Kerja</div><table class="table table-bordered table-sm"><thead><tr><th class="col-width-40">No</th><th>Tahapan Kerja</th><th>Alat Kerja</th><th>Proses / Kegiatan Pekerjaan</th></tr></thead><tbody>`;
      if(steps.length) steps.forEach((s,i)=>{ html+=`<tr><td class="text-center">${i+1}</td><td>${UtilityService.escapeHtml(s.work_stage||'-')}</td><td>${UtilityService.escapeHtml(s.tools||'-')}</td><td>${UtilityService.escapeHtml(s.work_process||'-')}</td></tr>`; });
      else html+=`<tr><td colspan="4" class="text-center text-muted">Tidak ada langkah kerja</td></tr>`;
      html+=`</tbody></table>`;
      html+=`<div class="page-break-inside-avoid"><div class="report-section-title">2. Lembar Pengesahan</div><div class="row signature-row"><div class="col-4"><div class="signature-box"><div class="signature-box__label">Disusun Oleh</div><div class="signature-box__name">${UtilityService.escapeHtml(wm.prepared_by||'_________________')}</div><div class="signature-box__date">Tanggal: ${UtilityService.formatDate(wm.date)}</div></div></div><div class="col-4"><div class="signature-box"><div class="signature-box__label">Diperiksa Oleh</div><div class="signature-box__name">${UtilityService.escapeHtml(wm.reviewed_by||'_________________')}</div><div class="signature-box__date">Tanggal: _________________</div></div></div><div class="col-4"><div class="signature-box"><div class="signature-box__label">Disetujui Oleh</div><div class="signature-box__name">${UtilityService.escapeHtml(wm.approved_by||'_________________')}</div><div class="signature-box__date">Tanggal: _________________</div></div></div></div></div>`;
      html+=this.buildReportFooter(company);
    });
    return html;
  },

  buildPOReport(docId, projectId, company) {
    let list=[...this._data.po];
    if(projectId) list=list.filter(p=>p.project_id===projectId);
    if(docId) list=list.filter(p=>p.id===docId);
    if(!list.length) return '<div class="alert alert-info">Tidak ada data Pembelian untuk filter yang dipilih.</div>';
    const project=projectId?this._data.projects.find(p=>p.id===projectId):null;
    const grandTotal=list.reduce((s,p)=>s+(p.total_price||0),0);
    let html='';
    html+=this.buildReportHeader(company,'COST PROJECT',project?`Proyek: ${project.name}`:'Semua Proyek','bi-cart');
    if(project) html+=this.buildProjectInfoSection(project,false);
    html+=`<div class="report-section-title">Daftar Item Pembelian</div><table class="table table-bordered table-sm"><thead><tr><th class="col-width-30">No</th>${!projectId?'<th>Proyek</th>':''}<th>Nama Material</th><th>Spesifikasi</th><th class="col-width-50">Qty</th><th class="col-width-50">Unit</th><th class="col-width-100">Harga Satuan</th><th class="col-width-100">Total Harga</th><th class="col-width-90">Tanggal</th></tr></thead><tbody>`;
    list.forEach((po,i)=>{ const pp=this._data.projects.find(x=>x.id===po.project_id); html+=`<tr><td class="text-center">${i+1}</td>${!projectId?`<td>${UtilityService.escapeHtml(pp?.name||'-')}</td>`:''}<td><strong>${UtilityService.escapeHtml(po.material_name||'-')}</strong></td><td>${UtilityService.escapeHtml(po.specification||'-')}</td><td class="text-center">${po.quantity||0}</td><td class="text-center">${UtilityService.escapeHtml(po.unit||'-')}</td><td class="text-end">${UtilityService.formatCurrency(po.unit_price)}</td><td class="text-end"><strong>${UtilityService.formatCurrency(po.total_price)}</strong></td><td class="text-center">${UtilityService.formatDate(po.date)}</td></tr>`; });
    html+=`</tbody><tfoot><tr class="fw-bold" style="background:#f0f9ff;"><td colspan="${projectId?'6':'7'}" class="text-end">TOTAL KESELURUHAN:</td><td class="text-end"><strong class="text-success">${UtilityService.formatCurrency(grandTotal)}</strong></td><td></td></tr></tfoot></table>`;
    html+=`<div class="report-summary-box"><div class="row"><div class="col-6"><strong>Total Item:</strong> ${list.length}</div><div class="col-6 text-end"><strong>Grand Total:</strong> <span class="text-success" style="font-size:1.1rem;">${UtilityService.formatCurrency(grandTotal)}</span></div></div></div>`;
    html+=this.buildReportFooter(company);
    return html;
  },

  buildProjectReport(projectId, company) {
    let projects=[...this._data.projects];
    if(projectId) projects=projects.filter(p=>p.id===projectId);
    if(!projects.length) return '<div class="alert alert-info">Tidak ada data Proyek untuk filter yang dipilih.</div>';
    let html='';
    html+=this.buildReportHeader(company,'DATA PROYEK',`${projects.length} Proyek`,'bi-clipboard-data');
    projects.forEach((project,index)=>{
      const jsaList=this._data.jsa.filter(j=>j.project_id===project.id);
      const poList=this._data.po.filter(p=>p.project_id===project.id);
      const totalPO=poList.reduce((s,p)=>s+(p.total_price||0),0);
      const wmList=this._data.wm.filter(w=>w.project_id===project.id);
      if(index>0) html+=`<hr style="border:2px dashed var(--color-border);margin:24px 0;">`;
      html+=`<div class="page-break-inside-avoid"><h5 class="text-primary mb-3"><i class="bi bi-building"></i> ${UtilityService.escapeHtml(project.name)}</h5>`;
      html+=`<table class="table table-bordered table-sm"><tbody>${this.createReportRow('Nama Proyek',`<strong>${UtilityService.escapeHtml(project.name)}</strong>`)}${this.createReportRow('Client / Owner',UtilityService.escapeHtml(project.client))}${this.createReportRow('Lokasi Proyek',UtilityService.escapeHtml(project.location))}${this.createReportRow('Penanggung Jawab (PIC)',UtilityService.escapeHtml(project.pic))}${this.createReportRow('Nilai Kontrak',`<strong>${UtilityService.formatCurrency(project.contract_value)}</strong>`)}${this.createReportRow('Tanggal Mulai',project.start_date?UtilityService.formatDate(project.start_date):'-')}${this.createReportRow('Tanggal Selesai',project.end_date?UtilityService.formatDate(project.end_date):'-')}</tbody></table>`;
      html+=`<div class="report-section-title">Ringkasan Data Proyek</div><div class="row g-3 mb-3"><div class="col-3"><div class="report-stat-mini"><div class="report-stat-mini__icon" style="background:var(--color-warning-bg);color:var(--color-warning);"><i class="bi bi-journal-check"></i></div><div class="report-stat-mini__value">${jsaList.length}</div><div class="report-stat-mini__label">Dokumen JSA</div></div></div><div class="col-3"><div class="report-stat-mini"><div class="report-stat-mini__icon" style="background:var(--color-primary-bg);color:var(--color-primary);"><i class="bi bi-diagram-3"></i></div><div class="report-stat-mini__value">${wmList.length}</div><div class="report-stat-mini__label">Metode Kerja</div></div></div><div class="col-3"><div class="report-stat-mini"><div class="report-stat-mini__icon" style="background:var(--color-success-bg);color:var(--color-success);"><i class="bi bi-cart"></i></div><div class="report-stat-mini__value">${poList.length}</div><div class="report-stat-mini__label">Item Pembelian</div></div></div></div>`;
      html+=`<table class="table table-bordered table-sm"><tbody>${this.createReportRow('Total Pembelian',`<strong class="text-success">${UtilityService.formatCurrency(totalPO)}</strong>`)}${this.createReportRow('Sisa Anggaran',`<strong class="${(project.contract_value-totalPO)>=0?'text-success':'text-danger'}">${UtilityService.formatCurrency(project.contract_value-totalPO)}</strong>`)}</tbody></table>`;
      if(jsaList.length){ html+=`<div class="report-section-title">Daftar JSA (${jsaList.length} Dokumen)</div><table class="table table-bordered table-sm"><thead><tr><th class="col-width-40">No</th><th>No. Dokumen</th><th>Revisi</th><th>Tanggal</th></tr></thead><tbody>`; jsaList.forEach((jsa,i)=>{ html+=`<tr><td class="text-center">${i+1}</td><td><strong>${UtilityService.escapeHtml(jsa.document_number)}</strong></td><td class="text-center">${UtilityService.escapeHtml(jsa.revision||'0')}</td><td>${UtilityService.formatDate(jsa.date)}</td></tr>`; }); html+=`</tbody></table>`; }
      if(poList.length){ html+=`<div class="report-section-title">Daftar Pembelian (${poList.length} Item)</div><table class="table table-bordered table-sm"><thead><tr><th class="col-width-40">No</th><th>Material</th><th class="col-width-60">Qty</th><th class="col-width-50">Unit</th><th class="col-width-110">Total Harga</th><th class="col-width-90">Tanggal</th></tr></thead><tbody>`; poList.forEach((po,i)=>{ html+=`<tr><td class="text-center">${i+1}</td><td>${UtilityService.escapeHtml(po.material_name||'-')}</td><td class="text-center">${po.quantity||0}</td><td class="text-center">${UtilityService.escapeHtml(po.unit||'-')}</td><td class="text-end">${UtilityService.formatCurrency(po.total_price)}</td><td class="text-center">${UtilityService.formatDate(po.date)}</td></tr>`; }); html+=`</tbody></table>`; }
      html+=`</div>`;
    });
    html+=this.buildReportFooter(company);
    return html;
  },

  buildCashflowReport(projectId, company) {
    let projects=[...this._data.projects];
    if(projectId) projects=projects.filter(p=>p.id===projectId);
    if(!projects.length) return '<div class="alert alert-info">Tidak ada data Proyek untuk filter yang dipilih.</div>';
    let html='', totalBudget=0, totalSpent=0;
    html+=this.buildReportHeader(company,'KEUANGAN PROYEK',`${projects.length} Proyek`,'bi-cash-stack');
    projects.forEach((project,index)=>{
      const poList=this._data.po.filter(p=>p.project_id===project.id);
      const totalPO=poList.reduce((s,p)=>s+(p.total_price||0),0);
      const budget=project.contract_value||0, remaining=budget-totalPO, pct=budget>0?Math.round((totalPO/budget)*100):0;
      totalBudget+=budget; totalSpent+=totalPO;
      if(index>0) html+=`<hr style="border:2px dashed var(--color-border);margin:24px 0;">`;
      html+=`<div class="page-break-inside-avoid"><h5 class="text-primary mb-3"><i class="bi bi-building"></i> ${UtilityService.escapeHtml(project.name)}</h5>`;
      html+=`<div class="row g-3 mb-3"><div class="col-4"><div class="report-finance-card report-finance-card--info"><div class="report-finance-card__label">Nilai Kontrak</div><div class="report-finance-card__value">${UtilityService.formatCurrency(budget)}</div></div></div><div class="col-4"><div class="report-finance-card report-finance-card--warning"><div class="report-finance-card__label">Total Pembelian</div><div class="report-finance-card__value">${UtilityService.formatCurrency(totalPO)}</div></div></div><div class="col-4"><div class="report-finance-card ${remaining>=0?'report-finance-card--success':'report-finance-card--danger'}"><div class="report-finance-card__label">Sisa Anggaran</div><div class="report-finance-card__value">${UtilityService.formatCurrency(remaining)}</div></div></div></div>`;
      html+=`<div class="progress progress--md mb-3"><div class="progress-bar" style="width:${Math.min(pct,100)}%;background:${pct>80?'#ef4444':pct>50?'#f59e0b':'#10b981'}"><strong>${pct}%</strong></div></div>`;
      html+=`<table class="table table-bordered table-sm"><tbody>${this.createReportRow('Nama Proyek',`<strong>${UtilityService.escapeHtml(project.name)}</strong>`)}${this.createReportRow('Client',UtilityService.escapeHtml(project.client))}${this.createReportRow('Nilai Kontrak',UtilityService.formatCurrency(budget))}${this.createReportRow('Total Pengeluaran',UtilityService.formatCurrency(totalPO))}${this.createReportRow('Persentase Penggunaan',`${pct}%`)}${this.createReportRow('Sisa Anggaran',`<strong class="${remaining>=0?'text-success':'text-danger'}">${UtilityService.formatCurrency(remaining)}</strong>`)}</tbody></table>`;
      if(poList.length){ html+=`<div class="report-section-title">Rincian Pembelian (${poList.length} Item)</div><table class="table table-bordered table-sm"><thead><tr><th class="col-width-30">No</th><th>Material</th><th class="col-width-50">Qty</th><th class="col-width-50">Unit</th><th class="col-width-100">Harga Satuan</th><th class="col-width-100">Total</th></tr></thead><tbody>`; poList.forEach((po,i)=>{ html+=`<tr><td class="text-center">${i+1}</td><td>${UtilityService.escapeHtml(po.material_name||'-')}</td><td class="text-center">${po.quantity||0}</td><td class="text-center">${UtilityService.escapeHtml(po.unit||'')}</td><td class="text-end">${UtilityService.formatCurrency(po.unit_price)}</td><td class="text-end">${UtilityService.formatCurrency(po.total_price)}</td></tr>`; }); html+=`</tbody></table>`; }
      html+=`</div>`;
    });
    const totalRem=totalBudget-totalSpent, totalPct=totalBudget>0?Math.round((totalSpent/totalBudget)*100):0;
    html+=`<div class="page-break-inside-avoid"><div class="report-section-title">Rekapitulasi Seluruh Proyek</div><div class="row g-3 mb-3"><div class="col-4"><div class="report-finance-card report-finance-card--info"><div class="report-finance-card__label">Total Nilai Kontrak</div><div class="report-finance-card__value" style="font-size:1.1rem;">${UtilityService.formatCurrency(totalBudget)}</div></div></div><div class="col-4"><div class="report-finance-card report-finance-card--warning"><div class="report-finance-card__label">Total Pembelian</div><div class="report-finance-card__value" style="font-size:1.1rem;">${UtilityService.formatCurrency(totalSpent)}</div></div></div><div class="col-4"><div class="report-finance-card ${totalRem>=0?'report-finance-card--success':'report-finance-card--danger'}"><div class="report-finance-card__label">Sisa Total Anggaran</div><div class="report-finance-card__value" style="font-size:1.1rem;">${UtilityService.formatCurrency(totalRem)}</div></div></div></div><div class="progress progress--md mb-3"><div class="progress-bar" style="width:${Math.min(totalPct,100)}%;background:${totalPct>80?'#ef4444':totalPct>50?'#f59e0b':'#10b981'}"><strong>${totalPct}%</strong></div></div></div>`;
    html+=this.buildReportFooter(company);
    return html;
  },

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

    // Susun daftar {project, personnel[]}
    let projects = [...this._data.projects];
    if (projectId) projects = projects.filter(p => p.id === projectId);
    if (!projects.length) return '<div class="alert alert-info">Tidak ada data Proyek untuk filter yang dipilih.</div>';

    // Build lookup
    const personnelMap = {};
    this._data.personnel.forEach(p => { personnelMap[p.id] = p; });

    // group assignment per project
    const assignByProject = {};
    this._data.manpower.forEach(m => {
      if (!assignByProject[m.project_id]) assignByProject[m.project_id] = [];
      assignByProject[m.project_id].push(m.personnel_id);
    });

    let html = '';
    html += this.buildReportHeader(company, 'MAN POWER',
      projectId ? (projects[0]?.name||'') : (projects.length + ' Proyek'), 'bi-people');

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

    // Rekap jika multi-proyek
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