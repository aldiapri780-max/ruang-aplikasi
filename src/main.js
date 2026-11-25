import { createClient } from '@supabase/supabase-js';
import './style.css';

const env = import.meta.env;
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;
const root = document.querySelector('#app');

let supabase = null;
let currentUser = null;
let currentProfile = null;
let products = [];
let mode = 'login';

const money = value => new Intl.NumberFormat('id-ID', {
  style: 'currency', currency: 'IDR', maximumFractionDigits: 0
}).format(Number(value || 0));

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, c => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  })[c]);
}

function showConfigError() {
  root.innerHTML = `
    <main class="setup">
      <div class="brand-mark">RA</div>
      <p class="eyebrow">PERSIAPAN APLIKASI</p>
      <h1>Hubungkan database Supabase</h1>
      <p class="muted">Website sudah siap. Isi URL dan anon/publishable key Supabase pada file <code>.env</code>, lalu jalankan ulang aplikasi.</p>
      <div class="steps">
        <b>Yang perlu diisi:</b>
        <code>VITE_SUPABASE_URL=https://project-id.supabase.co</code>
        <code>VITE_SUPABASE_ANON_KEY=key-publik-supabase</code>
      </div>
      <p class="notice">Jangan pernah memasukkan <b>service_role key</b> ke website atau membagikannya ke publik.</p>
    </main>`;
}

function renderAuth() {
  root.innerHTML = `
    <main class="auth-shell">
      <section class="auth-card">
        <div class="brand-mark">RA</div>
        <p class="eyebrow">RUANG APLIKASI</p>
        <h1>${mode === 'login' ? 'Selamat datang' : 'Buat akun baru'}</h1>
        <p class="muted">${mode === 'login' ? 'Masuk untuk melanjutkan ke aplikasi.' : 'Daftar akun untuk mulai menggunakan aplikasi.'}</p>
        <form id="auth-form">
          ${mode === 'signup' ? '<label>Nama lengkap<input name="name" autocomplete="name" required maxlength="80" placeholder="Nama kamu"></label>' : ''}
          <label>Email<input name="email" type="email" autocomplete="email" required placeholder="nama@email.com"></label>
          <label>Password<input name="password" type="password" autocomplete="${mode === 'login' ? 'current-password' : 'new-password'}" minlength="6" required placeholder="Minimal 6 karakter"></label>
          <button class="primary full" type="submit">${mode === 'login' ? 'Masuk' : 'Daftar akun'}</button>
        </form>
        <p id="auth-message" class="form-message" aria-live="polite"></p>
        <button class="link-button" id="switch-mode">${mode === 'login' ? 'Belum punya akun? Daftar' : 'Sudah punya akun? Masuk'}</button>
      </section>
    </main>`;

  document.querySelector('#switch-mode').addEventListener('click', () => {
    mode = mode === 'login' ? 'signup' : 'login';
    renderAuth();
  });

  document.querySelector('#auth-form').addEventListener('submit', async event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get('email')).trim();
    const password = String(form.get('password'));
    const message = document.querySelector('#auth-message');
    const submit = event.currentTarget.querySelector('button[type="submit"]');
    submit.disabled = true;
    submit.textContent = 'Memproses...';
    message.textContent = '';
    try {
      if (mode === 'signup') {
        const name = String(form.get('name')).trim();
        const { data, error } = await supabase.auth.signUp({
          email, password, options: { data: { full_name: name } }
        });
        if (error) throw error;
        if (data.session) {
          await loadApp();
        } else {
          message.textContent = 'Pendaftaran berhasil. Periksa email untuk konfirmasi, lalu masuk.';
          submit.disabled = false;
          submit.textContent = 'Daftar akun';
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await loadApp();
      }
    } catch (error) {
      message.textContent = error.message || 'Terjadi kesalahan.';
      submit.disabled = false;
      submit.textContent = mode === 'login' ? 'Masuk' : 'Daftar akun';
    }
  });
}

async function getProfile() {
  const { data, error } = await supabase
    .from('profiles').select('id, full_name, role').eq('id', currentUser.id).single();
  if (error) throw error;
  return data;
}

async function loadProducts() {
  const { data, error } = await supabase
    .from('products').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  products = data || [];
}

function renderDashboard() {
  const isAdmin = currentProfile?.role === 'admin';
  root.innerHTML = `
    <div class="app-shell">
      <header class="topbar">
        <a class="brand" href="#"><span class="brand-mark small">RA</span><span>Ruang Aplikasi</span></a>
        <div class="user-area"><span class="user-email">${escapeHtml(currentUser.email)}</span><button id="logout" class="outline small-btn">Keluar</button></div>
      </header>
      <main class="dashboard">
        <section class="welcome">
          <div><p class="eyebrow">DASHBOARD</p><h1>Halo, ${escapeHtml(currentProfile.full_name || currentUser.email.split('@')[0])} 👋</h1><p class="muted">Selamat datang di ruang aplikasimu.</p></div>
          <span class="role-pill">${isAdmin ? 'ADMIN' : 'PENGGUNA'}</span>
        </section>
        ${isAdmin ? `
          <section class="admin-panel panel">
            <div class="section-heading"><div><p class="eyebrow">PENGELOLAAN</p><h2>Tambah produk</h2></div><span class="admin-label">ADMIN</span></div>
            <form id="product-form" class="product-form">
              <label>Nama produk<input name="name" required maxlength="120" placeholder="Contoh: Produk A"></label>
              <label>Harga (Rp)<input name="price" type="number" min="0" step="1" required placeholder="50000"></label>
              <label class="wide">Deskripsi<textarea name="description" rows="2" maxlength="1000" placeholder="Keterangan produk (opsional)"></textarea></label>
              <label class="wide">URL gambar<input name="image_url" type="url" placeholder="https://... (opsional)"></label>
              <button class="primary" type="submit">+ Simpan produk</button>
            </form>
            <p id="product-message" class="form-message" aria-live="polite"></p>
          </section>` : `
          <section class="panel user-note"><div class="note-icon">✦</div><div><b>Akun pengguna</b><p class="muted">Kamu bisa melihat daftar produk. Hubungi admin jika ingin mengubah data produk.</p></div></section>`}
        <section class="products-section">
          <div class="section-heading"><div><p class="eyebrow">KATALOG</p><h2>Daftar produk</h2></div><span class="count">${products.length} produk</span></div>
          <div id="product-list" class="product-grid">
            ${products.length ? products.map(product => `
              <article class="product-card">
                ${product.image_url ? `<img src="${escapeHtml(product.image_url)}" alt="${escapeHtml(product.name)}" loading="lazy" onerror="this.style.display='none'">` : '<div class="product-placeholder">✦</div>'}
                <div class="product-info"><h3>${escapeHtml(product.name)}</h3><b class="price">${money(product.price)}</b>
                <p>${escapeHtml(product.description || 'Belum ada deskripsi.')}</p>
                ${isAdmin ? `<button class="danger delete-product" data-id="${escapeHtml(product.id)}">Hapus produk</button>` : ''}</div>
              </article>`).join('') : '<div class="empty">Belum ada produk. Admin dapat menambahkan produk dari panel di atas.</div>'}
          </div>
        </section>
        <footer>Ruang Aplikasi · Data tersimpan di Supabase</footer>
      </main>
    </div>`;

  document.querySelector('#logout').addEventListener('click', async () => {
    await supabase.auth.signOut();
    currentUser = null;
    currentProfile = null;
    mode = 'login';
    renderAuth();
  });

  const productForm = document.querySelector('#product-form');
  if (productForm) {
    productForm.addEventListener('submit', async event => {
      event.preventDefault();
      const form = new FormData(productForm);
      const message = document.querySelector('#product-message');
      const button = productForm.querySelector('button[type="submit"]');
      button.disabled = true;
      message.textContent = 'Menyimpan...';
      try {
        const payload = {
          name: String(form.get('name')).trim(),
          price: Number(form.get('price')),
          description: String(form.get('description')).trim(),
          image_url: String(form.get('image_url')).trim() || null
        };
        const { error } = await supabase.from('products').insert(payload);
        if (error) throw error;
        await loadProducts();
        renderDashboard();
      } catch (error) {
        message.textContent = error.message || 'Gagal menyimpan produk.';
        button.disabled = false;
      }
    });
  }

  document.querySelectorAll('.delete-product').forEach(button => {
    button.addEventListener('click', async () => {
      if (!confirm('Yakin ingin menghapus produk ini?')) return;
      button.disabled = true;
      const { error } = await supabase.from('products').delete().eq('id', button.dataset.id);
      if (error) {
        alert(error.message);
        button.disabled = false;
        return;
      }
      await loadProducts();
      renderDashboard();
    });
  });
}

async function loadApp() {
  const { data } = await supabase.auth.getUser();
  currentUser = data.user;
  if (!currentUser) return renderAuth();
  try {
    currentProfile = await getProfile();
    await loadProducts();
    renderDashboard();
  } catch (error) {
    root.innerHTML = `<main class="setup"><h1>Belum bisa memuat dashboard</h1><p class="muted">${escapeHtml(error.message)}</p><p>Pastikan SQL pada folder <code>supabase/schema.sql</code> sudah dijalankan di Supabase.</p><button class="primary" id="retry">Coba lagi</button></main>`;
    document.querySelector('#retry').addEventListener('click', loadApp);
  }
}

if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('PROJECT_ID')) {
  showConfigError();
} else {
  supabase = createClient(supabaseUrl, supabaseKey);
  supabase.auth.onAuthStateChange((_event, session) => {
    if (!session) {
      currentUser = null;
      currentProfile = null;
      renderAuth();
    }
  });
  loadApp();
}
