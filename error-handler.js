// error-handler.js — Penanganan error terpusat KPT App
//
// MASALAH SEBELUMNYA:
//   - Pesan error teknis (mis. "TypeError: Cannot read property...") ditampilkan langsung ke user
//   - Pola try/catch tidak seragam di setiap modul
//   - Tidak ada offline detection
//
// SOLUSI:
//   - AppError: satu titik untuk menampilkan error ke user dengan pesan yang ramah
//   - Semua modul memanggil AppError.handle(err, konteks) — tidak perlu nulis logika error sendiri

const AppError = {

  // -------------------------------------------------------
  // handle(err, context)
  // Panggil ini di blok catch mana pun.
  // context: string singkat, mis. 'Menyimpan proyek', 'Memuat JSA'
  // -------------------------------------------------------
  handle(err, context = '') {
    // Log teknis untuk developer
    console.error(`[AppError]${context ? ' ' + context + ':' : ''}`, err);

    // Terjemahkan ke pesan ramah user
    const message = this._translate(err, context);
    UIService.showToast(message, TOAST.DANGER);
    return message;
  },

  // -------------------------------------------------------
  // handlePageLoad(err, route)
  // Khusus untuk error saat memuat halaman — render error block di main content
  // -------------------------------------------------------
  handlePageLoad(err, route = '') {
    console.error(`[AppError] Gagal memuat halaman "${route}":`, err);

    const mainContent = document.getElementById(EL.APP_MAIN_CONTENT);
    if (!mainContent) return;

    const message = this._translate(err, `Memuat halaman ${route}`);
    const errDiv  = document.createElement('div');
    errDiv.className = 'alert alert-danger m-3';

    // Gunakan textContent untuk pesan agar aman dari XSS
    const msgSpan = document.createElement('span');
    msgSpan.textContent = message;

    errDiv.innerHTML = '<i class="bi bi-exclamation-triangle-fill me-2"></i>';
    errDiv.appendChild(msgSpan);

    const reloadBtn = document.createElement('button');
    reloadBtn.className = 'btn btn--outline-primary mt-2 d-block';
    reloadBtn.innerHTML = '<i class="bi bi-arrow-clockwise"></i> Coba Lagi';
    reloadBtn.onclick = () => UIService.navigate(route || ROUTES.DASHBOARD);
    errDiv.appendChild(reloadBtn);

    mainContent.innerHTML = '';
    mainContent.appendChild(errDiv);
  },

  // -------------------------------------------------------
  // _translate(err, context) — private
  // Terjemahkan Error object ke pesan Indonesia yang mudah dipahami
  // -------------------------------------------------------
  _translate(err, context = '') {
    if (!err) return ERR.LOAD_FAILED;

    const msg = (err.message || String(err)).toLowerCase();

    // Deteksi offline
    if (!navigator.onLine) {
      return 'Tidak ada koneksi internet. Periksa jaringan Anda dan coba lagi.';
    }

    // Timeout / network error dari fetch
    if (msg.includes('failed to fetch') || msg.includes('networkerror') || msg.includes('network request failed')) {
      return ERR.NETWORK;
    }

    // Google Apps Script quota error
    if (msg.includes('quota') || msg.includes('rate limit') || msg.includes('too many')) {
      return 'Batas permintaan terlampaui. Tunggu beberapa saat lalu coba lagi.';
    }

    // Apps Script timeout (6 menit)
    if (msg.includes('timeout') || msg.includes('deadline exceeded')) {
      return 'Server lambat merespons. Coba lagi dalam beberapa saat.';
    }

    // Auth error
    if (msg.includes('unauthorized') || msg.includes('forbidden') || msg.includes('403') || msg.includes('401')) {
      return 'Sesi Anda telah berakhir. Silakan login kembali.';
    }

    // API error yang dikirim dari Apps Script (json.error)
    if (err.message && err.message.startsWith('API error') === false && err.message.length < 200) {
      // Pesan dari server cukup pendek dan bukan stack trace — aman ditampilkan
      if (!msg.includes('typeerror') && !msg.includes('referenceerror') && !msg.includes('syntaxerror')) {
        const prefix = context ? `${context} gagal: ` : 'Terjadi kesalahan: ';
        return prefix + err.message;
      }
    }

    // Fallback untuk JS error teknis
    if (context) return `${context} gagal. Silakan coba lagi.`;
    return ERR.LOAD_FAILED;
  },

  // -------------------------------------------------------
  // wrapAsync(fn, context) — Decorator untuk async function
  // Membungkus fungsi async dengan error handler otomatis.
  //
  // Contoh penggunaan:
  //   const safeSave = AppError.wrapAsync(
  //     async () => await DataAccess.saveProject(data),
  //     'Menyimpan proyek'
  //   );
  //   await safeSave();
  // -------------------------------------------------------
  wrapAsync(fn, context = '') {
    return async (...args) => {
      try {
        return await fn(...args);
      } catch (err) {
        this.handle(err, context);
        return null;
      }
    };
  },
};

// -------------------------------------------------------
// Deteksi offline/online — tampilkan notifikasi otomatis
// -------------------------------------------------------
window.addEventListener('offline', () => {
  UIService.showToast(
    'Koneksi internet terputus. Beberapa fitur mungkin tidak tersedia.',
    TOAST.WARNING
  );
});

window.addEventListener('online', () => {
  UIService.showToast('Koneksi internet pulih.', TOAST.SUCCESS);
});
