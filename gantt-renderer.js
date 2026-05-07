// gantt-renderer.js — Modul terpisah untuk rendering Gantt Chart
// Module ini HANYA di-load saat user membuka laporan jadwal
// Dipisahkan karena ukurannya besar (~15KB+ kode CSS & rendering)

export const GanttRenderer = {
  /**
   * Render Gantt Chart untuk jadwal proyek
   * @param {Array} scheduleItems - Data jadwal
   * @param {Object} project - Data proyek (opsional)
   * @returns {string} HTML Gantt Chart
   */
  render(scheduleItems, project) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let allDates = [];
    scheduleItems.forEach(item => {
      if (item.start_date) allDates.push(new Date(item.start_date));
      if (item.end_date) allDates.push(new Date(item.end_date));
    });

    const currentYear = today.getFullYear();
    let chartStartDate = allDates.length > 0 ? new Date(Math.min(...allDates)) : new Date(currentYear, 0, 1);
    let chartEndDate = allDates.length > 0 ? new Date(Math.max(...allDates)) : new Date(currentYear, 11, 31);
    
    chartStartDate.setDate(chartStartDate.getDate() - 1);
    chartEndDate.setDate(chartEndDate.getDate() + 1);
    
    const totalDays = Math.ceil((chartEndDate - chartStartDate) / (1000 * 60 * 60 * 24)) + 1;
    
    // Generate array hari dengan informasi weekend
    const days = [];
    let currentDayDate = new Date(chartStartDate);
    while (currentDayDate <= chartEndDate) {
      const dayOfWeek = currentDayDate.getDay();
      days.push({
        date: new Date(currentDayDate),
        dayOfWeek: dayOfWeek,
        isSaturday: dayOfWeek === 6,
        isSunday: dayOfWeek === 0,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6
      });
      currentDayDate.setDate(currentDayDate.getDate() + 1);
    }
    
    // Generate array bulan
    const months = [];
    for (let d = new Date(chartStartDate); d <= chartEndDate; d.setMonth(d.getMonth() + 1)) {
      months.push({
        label: d.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }),
        startDate: new Date(d.getFullYear(), d.getMonth(), 1),
        endDate: new Date(d.getFullYear(), d.getMonth() + 1, 0)
      });
    }

    // Hitung lebar label
    const maxLabelLength = Math.max(...scheduleItems.map(item => {
      const taskLabel = item.work_stage || item.work_process || 'Tahapan';
      let dateInfo = '';
      if (item.start_date && item.end_date) {
        const startLabel = new Date(item.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
        const endLabel = new Date(item.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
        dateInfo = ` (${startLabel} — ${endLabel})`;
      }
      return (taskLabel + dateInfo).length;
    }), 15);
    const labelWidth = Math.max(250, Math.min(400, maxLabelLength * 8));

    return this._buildHTML(scheduleItems, days, months, totalDays, chartStartDate, today, labelWidth);
  },

  _buildHTML(scheduleItems, days, months, totalDays, chartStartDate, today, labelWidth) {
    const E = (window.UtilityService?.escapeHtml || ((s) => s));
    
    let html = this._getStyles(labelWidth);
    
    html += `<div class="gantt-wrapper">
      <table class="gantt-table">
        <thead>
          <tr>
            <th class="gantt-label-header" rowspan="2">Tahapan Pekerjaan</th>`;
    
    months.forEach(month => {
      const monthDays = days.filter(d => d.date >= month.startDate && d.date <= month.endDate);
      const colspan = monthDays.length;
      if (colspan > 0) {
        html += `<th class="gantt-month-header" colspan="${colspan}">${month.label}</th>`;
      }
    });
    
    html += `</tr></thead><tbody>`;

    scheduleItems.forEach((item, idx) => {
      const taskLabel = item.work_stage || item.work_process || 'Tahapan';
      
      let dateDisplay = '';
      if (item.start_date && item.end_date) {
        const startLabel = new Date(item.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
        const endLabel = new Date(item.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
        dateDisplay = `${startLabel} — ${endLabel}`;
      } else {
        dateDisplay = 'Belum dijadwalkan';
      }
      
      let barClass = 'gantt-bar--upcoming';
      if (item.start_date && item.end_date) {
        const start = new Date(item.start_date); start.setHours(0,0,0,0);
        const end = new Date(item.end_date); end.setHours(0,0,0,0);
        if (end < today) barClass = 'gantt-bar--done';
        else if (start <= today && end >= today) barClass = 'gantt-bar--active';
      } else {
        barClass = 'gantt-bar--no-date';
      }

      const itemStart = item.start_date ? new Date(item.start_date) : null;
      const itemEnd = item.end_date ? new Date(item.end_date) : null;
      
      if (itemStart) itemStart.setHours(0,0,0,0);
      if (itemEnd) itemEnd.setHours(0,0,0,0);
      
      let leftPercent = 0;
      let widthPercent = 0;
      let barLabel = '';
      
      if (itemStart && itemEnd) {
        const startOffset = Math.max(0, (itemStart - chartStartDate) / (1000 * 60 * 60 * 24));
        const duration = (itemEnd - itemStart) / (1000 * 60 * 60 * 24) + 1;
        
        leftPercent = (startOffset / totalDays) * 100;
        widthPercent = Math.max(2, (duration / totalDays) * 100);
        
        const startLabel = itemStart.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
        const endLabel = itemEnd.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
        barLabel = `${startLabel} — ${endLabel}`;
      } else {
        leftPercent = 5;
        widthPercent = 90;
        barLabel = 'Belum dijadwalkan';
      }

      html += `<tr>`;
      html += `<td class="gantt-task-label" title="${E(taskLabel)} — ${dateDisplay}">
          <div class="gantt-task-label__name">${idx + 1}. ${E(taskLabel)}</div>
          <div class="gantt-task-label__date">${dateDisplay}</div>
        </td>`;

      html += `<td class="gantt-bar-cell" colspan="${days.length}" style="position:relative;">`;

      // Weekend lines
      days.forEach((day, dayIdx) => {
        const dayLeftPercent = (dayIdx / totalDays) * 100;
        if (day.isSaturday) {
          html += `<div class="gantt-weekend-line-saturday" style="left:${dayLeftPercent}%;width:${(1/totalDays)*100}%;"></div>`;
        }
        if (day.isSunday) {
          html += `<div class="gantt-weekend-line-sunday" style="left:${dayLeftPercent}%;width:${(1/totalDays)*100}%;"></div>`;
        }
      });

      // Today line
      const todayOffset = (today - chartStartDate) / (1000 * 60 * 60 * 24);
      if (todayOffset >= 0 && todayOffset <= totalDays) {
        html += `<div class="gantt-today-line" style="left:${(todayOffset / totalDays) * 100}%;"></div>`;
      }

      html += `<div class="gantt-bar ${barClass}" 
               style="left:${leftPercent}%; width:${widthPercent}%;"
               title="${itemStart && itemEnd ? itemStart.toLocaleDateString('id-ID', {day:'numeric',month:'long',year:'numeric'}) + ' — ' + itemEnd.toLocaleDateString('id-ID', {day:'numeric',month:'long',year:'numeric'}) : 'Belum dijadwalkan'}">
            ${barLabel}
          </div>
        </td>`;
      html += `</tr>`;
    });

    html += `</tbody></table></div>`;

    // Legend
    html += this._getLegend();
    
    return html;
  },

  _getStyles(labelWidth) {
    return `<style>
      .gantt-wrapper {
        overflow-x: auto;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        background: #ffffff;
        box-shadow: 0 1px 3px rgba(0,0,0,0.06);
        margin-bottom: 16px;
        max-width: 100%;
      }
      .gantt-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 0.75rem;
        table-layout: fixed;
        min-width: 900px;
      }
      .gantt-table thead th {
        background: #f8fafc;
        padding: 8px 4px;
        border-bottom: 2px solid #e2e8f0;
        font-weight: 600;
        color: #475569;
        text-align: center;
        font-size: 0.68rem;
        position: sticky;
        top: 0;
        z-index: 4;
      }
      .gantt-table thead th.gantt-label-header {
        text-align: left;
        padding: 8px 12px;
        position: sticky;
        left: 0;
        background: #f8fafc;
        z-index: 6;
        width: ${labelWidth}px;
        min-width: ${labelWidth}px;
        border-right: 1px solid #e2e8f0;
      }
      .gantt-table thead th.gantt-month-header {
        font-size: 0.7rem;
        font-weight: 600;
        color: #334155;
        border-right: 1px solid #e2e8f0;
      }
      .gantt-table tbody td {
        padding: 0;
        border-bottom: 1px solid #f1f5f9;
        vertical-align: middle;
        height: 48px;
        position: relative;
      }
      .gantt-table tbody tr:nth-child(even) td { background: #fafbfc; }
      .gantt-table tbody tr:hover td { background: #f1f5f9; }
      .gantt-task-label {
        padding: 6px 12px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        border-right: 1px solid #e2e8f0;
        position: sticky;
        left: 0;
        background: #ffffff;
        z-index: 3;
      }
      .gantt-table tbody tr:nth-child(even) .gantt-task-label { background: #fafbfc; }
      .gantt-table tbody tr:hover .gantt-task-label { background: #f1f5f9; }
      .gantt-task-label__name {
        font-weight: 600;
        color: #1e293b;
        font-size: 0.78rem;
      }
      .gantt-task-label__date {
        font-size: 0.65rem;
        color: #64748b;
        font-weight: 500;
        margin-top: 1px;
      }
      .gantt-bar-cell { position: relative; border-right: none; }
      .gantt-weekend-line-saturday {
        position: absolute; top: 0; bottom: 0; width: 2px;
        background: #fbbf24; z-index: 1; pointer-events: none; opacity: 0.7;
      }
      .gantt-weekend-line-sunday {
        position: absolute; top: 0; bottom: 0; width: 2px;
        background: #ef4444; z-index: 1; pointer-events: none; opacity: 0.6;
      }
      .gantt-bar {
        position: absolute; top: 12px; height: 22px; border-radius: 11px;
        cursor: pointer; z-index: 2; display: flex; align-items: center;
        padding: 0 10px; font-size: 0.6rem; font-weight: 600; color: white;
        white-space: nowrap; text-shadow: 0 1px 1px rgba(0,0,0,0.15);
        box-shadow: 0 1px 2px rgba(0,0,0,0.1); min-width: 24px;
        overflow: hidden; text-overflow: ellipsis; transition: all 0.15s ease;
      }
      .gantt-bar:hover { box-shadow: 0 3px 8px rgba(0,0,0,0.2); z-index: 5; }
      .gantt-bar--done { background: #10b981; border: 1px solid #059669; opacity: 0.85; }
      .gantt-bar--active { background: #f59e0b; border: 1px solid #d97706; opacity: 0.9; }
      .gantt-bar--upcoming { background: #3b82f6; border: 1px solid #2563eb; opacity: 0.85; }
      .gantt-bar--no-date {
        background: #f1f5f9; border: 1px dashed #cbd5e1; color: #64748b;
        text-shadow: none; opacity: 0.8; cursor: default; justify-content: center; font-weight: 500;
      }
      .gantt-today-line {
        position: absolute; top: 0; bottom: 0; width: 2px;
        background: #ef4444; z-index: 6; pointer-events: none; opacity: 0.8;
      }
      .gantt-today-line::after {
        content: ''; position: absolute; top: -2px; left: -4px;
        width: 10px; height: 10px; background: #ef4444; border-radius: 50%;
      }
      .gantt-legend {
        display: flex; gap: 16px; justify-content: center; margin-top: 12px;
        padding: 8px; background: #f8fafc; border-radius: 8px;
        font-size: 0.72rem; flex-wrap: wrap;
      }
      .gantt-legend__item { display: flex; align-items: center; gap: 6px; color: #64748b; }
      .gantt-legend__color { width: 20px; height: 12px; border-radius: 6px; display: inline-block; }
      
      @media (max-width: 768px) {
        .gantt-table thead th.gantt-label-header { width: 180px; min-width: 180px; }
        .gantt-task-label { width: 180px; min-width: 180px; font-size: 0.7rem; }
        .gantt-task-label__name { font-size: 0.7rem; }
        .gantt-task-label__date { font-size: 0.6rem; }
        .gantt-bar { font-size: 0.55rem; padding: 0 6px; height: 18px; top: 14px; }
      }
      
      @media print {
        .gantt-wrapper {
          overflow-x: visible !important;
          border: 1px solid #e2e8f0 !important;
          box-shadow: none !important;
          page-break-inside: avoid;
        }
        .gantt-table {
          font-size: 0.65rem !important;
          min-width: auto !important;
          width: 100% !important;
        }
        .gantt-table thead th {
          padding: 6px 2px !important; font-size: 0.6rem !important;
          background: #1e293b !important; color: #f1f5f9 !important;
          -webkit-print-color-adjust: exact; print-color-adjust: exact;
        }
        .gantt-bar--done { background: #10b981 !important; }
        .gantt-bar--active { background: #f59e0b !important; }
        .gantt-bar--upcoming { background: #3b82f6 !important; }
        .gantt-bar--no-date { background: #f1f5f9 !important; color: #64748b !important; }
        .gantt-today-line, .gantt-weekend-line-saturday, .gantt-weekend-line-sunday {
          -webkit-print-color-adjust: exact; print-color-adjust: exact;
        }
      }
    </style>`;
  },

  _getLegend() {
    return `<div class="gantt-legend no-print">
      <div class="gantt-legend__item">
        <span class="gantt-legend__color" style="background:#10b981;"></span> Selesai
      </div>
      <div class="gantt-legend__item">
        <span class="gantt-legend__color" style="background:#f59e0b;"></span> Berlangsung
      </div>
      <div class="gantt-legend__item">
        <span class="gantt-legend__color" style="background:#3b82f6;"></span> Mendatang
      </div>
      <div class="gantt-legend__item">
        <span class="gantt-legend__color" style="background:#f1f5f9; border:1px dashed #cbd5e1;"></span> Belum dijadwalkan
      </div>
      <div class="gantt-legend__item">
        <span style="display:inline-block;width:2px;height:12px;background:#fbbf24;border-radius:1px;"></span> Sabtu
      </div>
      <div class="gantt-legend__item">
        <span style="display:inline-block;width:2px;height:12px;background:#ef4444;border-radius:1px;"></span> Minggu
      </div>
      <div class="gantt-legend__item">
        <span style="display:inline-block;width:2px;height:12px;background:#ef4444;border-radius:1px;opacity:0.8;"></span> Hari ini
      </div>
    </div>`;
  }
};