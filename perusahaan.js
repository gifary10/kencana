// perusahaan.js
const CompanyPage = {
  render() {
    return `<div class="page-header no-print">
      <h2 class="page-title">
        <span class="page-title__icon"><i class="bi bi-building"></i></span>Profil Perusahaan
      </h2>
    </div>
    <div class="row g-3">
      <div class="col-lg-8">
        <div class="card">
          <div class="card-header">
            <i class="bi bi-pencil-square"></i> Informasi Perusahaan
          </div>
          <div class="card-body">
            <form id="companyForm">
              <div class="row g-3">
                <div class="col-12">
                  <label class="form-label">Nama Perusahaan <span class="text-danger">*</span></label>
                  <input type="text" class="form-control" id="inputCompanyName" required placeholder="PT. Contoh Kontraktor">
                </div>
                <div class="col-12">
                  <label class="form-label">Alamat Lengkap</label>
                  <textarea class="form-control" id="inputAddress" rows="2" placeholder="Jl. Contoh No. 123, Kota, Provinsi"></textarea>
                </div>
                <div class="col-sm-6">
                  <label class="form-label">Telepon / Kontak</label>
                  <input type="text" class="form-control" id="inputContact" placeholder="+62 812-3456-7890">
                </div>
                <div class="col-sm-6">
                  <label class="form-label">Email</label>
                  <input type="email" class="form-control" id="inputEmail" placeholder="info@perusahaan.com">
                </div>
                <div class="col-sm-6">
                  <label class="form-label">Website</label>
                  <input type="text" class="form-control" id="inputWebsite" placeholder="www.perusahaan.com">
                </div>
              </div>
              <div class="d-flex gap-2 mt-4">
                <button type="submit" class="btn btn--primary">
                  <i class="bi bi-save"></i> Simpan
                </button>
                <button type="button" class="btn btn--outline-secondary" onclick="CompanyPage.loadCompanyData()">
                  <i class="bi bi-arrow-counterclockwise"></i> Reset
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <div class="col-lg-4">
        <div class="card">
          <div class="card-header">
            <i class="bi bi-image"></i> Logo Perusahaan
          </div>
          <div class="card-body text-center">
            <div id="logoBox" onclick="document.getElementById('inputLogoFile').click()"
                 style="border:2px dashed var(--color-border-mid);border-radius:12px;padding:18px;min-height:110px;display:flex;align-items:center;justify-content:center;cursor:pointer;margin-bottom:12px;">
              <img id="logoPreviewImage" src="" alt="Logo" style="max-height:90px;max-width:100%;display:none;border-radius:8px;">
              <div id="logoPlaceholder">
                <i class="bi bi-cloud-upload" style="font-size:2rem;color:var(--color-text-3);display:block;margin-bottom:6px;"></i>
                <div style="font-size:.76rem;color:var(--color-text-3);">Klik untuk upload logo</div>
              </div>
            </div>
            <input type="file" class="d-none" id="inputLogoFile" accept="image/*" onchange="CompanyPage.handleLogoPreview(event)">
            <input type="hidden" id="inputLogoBase64">
            <button class="btn btn--sm btn--outline-primary w-100 mb-2" onclick="document.getElementById('inputLogoFile').click()">
              <i class="bi bi-upload"></i> Pilih Logo
            </button>
            <button class="btn btn--sm btn--outline-danger w-100" id="btnClearLogo" onclick="CompanyPage.clearLogo()" style="display:none">
              <i class="bi bi-trash"></i> Hapus Logo
            </button>
            <p class="form-text mt-2">JPG, PNG, SVG. Maks. 2MB.</p>
          </div>
        </div>
      </div>
    </div>`;
  },

  init() {
    this.loadCompanyData();
    document.getElementById('companyForm').addEventListener('submit', function(event) {
      event.preventDefault();
      CompanyPage.saveCompanyData();
    });
  },

  loadCompanyData() {
    const company = DataAccess.getCompany();
    if (company) {
      document.getElementById('inputCompanyName').value = company.name || '';
      document.getElementById('inputAddress').value = company.address || '';
      document.getElementById('inputContact').value = company.contact || '';
      document.getElementById('inputEmail').value = company.email || '';
      document.getElementById('inputWebsite').value = company.website || '';
      document.getElementById('inputLogoBase64').value = company.logo || '';

      if (company.logo) {
        this.showLogoPreview(company.logo);
      }
    }
  },

  saveCompanyData() {
    const name = document.getElementById('inputCompanyName').value.trim();
    if (!name) {
      UIService.showToast('Nama perusahaan wajib diisi!', 'warning');
      return;
    }

    const companyData = {
      id: 'comp_main',
      name,
      address: document.getElementById('inputAddress').value.trim(),
      contact: document.getElementById('inputContact').value.trim(),
      email: document.getElementById('inputEmail').value.trim(),
      website: document.getElementById('inputWebsite').value.trim(),
      logo: document.getElementById('inputLogoBase64').value
    };

    DataAccess.saveCompany(companyData);
    UIService.updateAllCompanyLogos();
    UIService.showToast('Profil berhasil disimpan!', 'success');

    if (!DataAccess.hasProjects()) {
      setTimeout(() => {
        if (confirm('Data perusahaan berhasil disimpan! \n\nSelanjutnya, buat Proyek pertama Anda untuk mulai menggunakan semua fitur.\n\nMau buat proyek sekarang?')) {
          UIService.navigate('proyek');
        }
      }, 400);
    }
  },

  handleLogoPreview(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      UIService.showToast('Ukuran file maks. 2MB!', 'danger');
      return;
    }

    const fileReader = new FileReader();
    fileReader.onload = function(e) {
      document.getElementById('inputLogoBase64').value = e.target.result;
      CompanyPage.showLogoPreview(e.target.result);
    };
    fileReader.readAsDataURL(file);
  },

  showLogoPreview(imageSrc) {
    const previewImage = document.getElementById('logoPreviewImage');
    const placeholder = document.getElementById('logoPlaceholder');
    const clearButton = document.getElementById('btnClearLogo');

    previewImage.src = imageSrc;
    previewImage.style.display = 'block';
    placeholder.style.display = 'none';
    clearButton.style.display = 'block';
  },

  clearLogo() {
    document.getElementById('inputLogoBase64').value = '';
    document.getElementById('logoPreviewImage').src = '';
    document.getElementById('logoPreviewImage').style.display = 'none';
    document.getElementById('logoPlaceholder').style.display = 'block';
    document.getElementById('btnClearLogo').style.display = 'none';
    document.getElementById('inputLogoFile').value = '';
  }
};