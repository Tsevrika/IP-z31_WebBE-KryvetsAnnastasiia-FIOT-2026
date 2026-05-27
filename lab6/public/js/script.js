const burger = document.getElementById('burger');
const nav = document.getElementById('nav');
const recipesList = document.getElementById('recipesList');
const recipeForm = document.getElementById('recipeForm');
const recipeMessage = document.getElementById('recipeMessage');
const authMessage = document.getElementById('authMessage');
const profileMessage = document.getElementById('profileMessage');
const currentUser = document.getElementById('currentUser');
const searchInput = document.getElementById('searchInput');

let allRecipes = [];

function getRecipeImages(recipe) {
  if (!recipe) return [];
  let images = [];
  if (recipe.imagePaths) {
    try {
      const parsed = JSON.parse(recipe.imagePaths);
      if (Array.isArray(parsed)) images = parsed.filter(Boolean);
    } catch (e) {}
  }
  if (!images.length && recipe.imagePath) images = [recipe.imagePath];
  return images;
}

function renderRecipeImages(recipe) {
  const images = getRecipeImages(recipe);
  if (!images.length) return '<div class="recipe-image placeholder">Немає фото</div>';
  return `
    <div class="recipe-gallery">
      <img class="recipe-image" src="${images[0]}" alt="${recipe.title}">
      ${images.length > 1 ? `<div class="recipe-thumbs">${images.slice(1).map((img) => `<img src="${img}" alt="${recipe.title}">`).join('')}</div>` : ''}
    </div>
  `;
}


if (burger && nav) {
  burger.addEventListener('click', () => nav.classList.toggle('active'));
}

function getAccessToken() { return localStorage.getItem('accessToken'); }
function getRefreshToken() { return localStorage.getItem('refreshToken'); }

function setMessage(el, text, ok = true) {
  if (!el) return;
  el.textContent = text;
  el.style.color = ok ? 'green' : 'red';
}

async function api(url, options = {}) {
  const headers = options.headers || {};
  headers['Content-Type'] = 'application/json';
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(url, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Помилка запиту');
  return data;
}

function saveAuth(data) {
  localStorage.setItem('accessToken', data.accessToken);
  localStorage.setItem('refreshToken', data.refreshToken);
  localStorage.setItem('user', JSON.stringify(data.user));
  renderUser();
}

function updateMenu() {
  const isAuth = Boolean(getAccessToken());

  document.querySelectorAll('.auth-only').forEach((item) => {
    item.style.display = isAuth ? 'inline-block' : 'none';
  });

  document.querySelectorAll('.guest-only').forEach((item) => {
    item.style.display = isAuth ? 'none' : 'inline-block';
  });
}

function renderUser() {
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  if (currentUser) {
    currentUser.innerHTML = user
      ? `Авторизовано: <b>${user.name}</b> (${user.email}) <span class="badge">${user.role}</span>`
      : 'Користувач не авторизований';
  }

  updateMenu();
}

async function loadProfile() {
  if (!getAccessToken()) return renderUser();
  try {
    const data = await api('/api/auth/profile');
    localStorage.setItem('user', JSON.stringify(data.user));
  } catch (e) {}
  renderUser();
}

async function loadRecipes() {
  if (!recipesList) return;
  try {
    allRecipes = await api('/api/recipes', { method: 'GET' });
    renderRecipes();
  } catch (error) {
    recipesList.innerHTML = `<p class="message" style="color:red">${error.message}</p>`;
  }
}

function canChangeRecipe(recipe) {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  if (!user) return false;
  return user.role === 'admin' || recipe.userId === user.id;
}

function renderRecipes() {
  if (!recipesList) return;
  const q = searchInput ? searchInput.value.toLowerCase() : '';
  const recipes = allRecipes.filter(r =>
    r.title.toLowerCase().includes(q) || r.category.toLowerCase().includes(q)
  );

  recipesList.innerHTML = recipes.map(recipe => `
    <div class="recipe-card">
      ${renderRecipeImages(recipe)}
      <h3>${recipe.title}</h3>
      <p>${recipe.description}</p>
      <div class="recipe-meta">
        <span>${recipe.category}</span>
        <span>${recipe.cookingTime} хв</span>
      </div>
      <p><strong>Інгредієнти:</strong> ${recipe.ingredients}</p>
      <p><strong>Автор:</strong> ${recipe.User ? recipe.User.name : 'невідомо'}</p>
      ${canChangeRecipe(recipe) ? `
      <div class="card-actions">
        <button onclick="startEditRecipe(${recipe.id})" class="secondary">Редагувати</button>
        <button onclick="deleteRecipe(${recipe.id})" class="danger">Видалити</button>
      </div>` : ''}
    </div>
  `).join('') || '<p>Рецептів ще немає.</p>';
}

window.startEditRecipe = function(id) {
  const recipe = allRecipes.find(item => item.id === id);
  if (!recipe || !recipeForm) return;
  document.getElementById('recipeId').value = recipe.id;
  document.getElementById('title').value = recipe.title;
  document.getElementById('description').value = recipe.description;
  document.getElementById('ingredients').value = recipe.ingredients;
  document.getElementById('category').value = recipe.category;
  document.getElementById('cookingTime').value = recipe.cookingTime;
  const currentRecipeImage = document.getElementById('currentRecipeImage');
  if (currentRecipeImage) {
    const images = getRecipeImages(recipe);
    currentRecipeImage.innerHTML = images.length
      ? `<p>Поточні фото:</p><div class="current-images-list">${images.map((img) => `<img src="${img}" alt="${recipe.title}">`).join('')}</div>`
      : '<p>У рецепта ще немає фото.</p>';
  }
  document.getElementById('formTitle').textContent = 'Редагувати рецепт';
  document.getElementById('submitBtn').textContent = 'Зберегти';
  document.getElementById('cancelEdit').hidden = false;
  location.hash = '#add';
};

function resetRecipeForm() {
  if (!recipeForm) return;
  recipeForm.reset();
  document.getElementById('recipeId').value = '';
  document.getElementById('formTitle').textContent = 'Додати рецепт';
  document.getElementById('submitBtn').textContent = 'Додати';
  document.getElementById('cancelEdit').hidden = true;
  const currentRecipeImage = document.getElementById('currentRecipeImage');
  if (currentRecipeImage) currentRecipeImage.innerHTML = '';
}

window.deleteRecipe = async function(id) {
  try {
    await api(`/api/recipes/${id}`, { method: 'DELETE' });
    setMessage(recipeMessage, 'Рецепт видалено');
    await loadRecipes();
  } catch (error) {
    setMessage(recipeMessage, error.message, false);
  }
};

const registerForm = document.getElementById('registerForm');
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const data = await api('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: document.getElementById('regName').value,
          email: document.getElementById('regEmail').value,
          password: document.getElementById('regPassword').value,
          confirmPassword: document.getElementById('regConfirmPassword').value
        })
      });
      const link = data.devVerifyEmailUrl ? ` <a href="${data.devVerifyEmailUrl}">Підтвердити email</a>` : '';
      setMessage(authMessage, data.message, true);
      authMessage.innerHTML = `${data.message}${link}`;
      e.target.reset();
    } catch (error) {
      setMessage(authMessage, error.message, false);
    }
  });
}

async function resendVerification() {
  try {
    const email = document.getElementById('loginEmail')?.value || document.getElementById('regEmail')?.value;
    if (!email) return setMessage(authMessage, 'Вкажіть email', false);
    const data = await api('/api/auth/resend-verification', { method: 'POST', body: JSON.stringify({ email }) });
    setMessage(authMessage, data.message, true);
    if (data.devVerifyEmailUrl) authMessage.innerHTML = `${data.message}: <a href="${data.devVerifyEmailUrl}">підтвердити email</a>`;
  } catch (error) {
    setMessage(authMessage, error.message, false);
  }
}

const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const data = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: document.getElementById('loginEmail').value,
          password: document.getElementById('loginPassword').value
        })
      });
      saveAuth(data);
      setMessage(authMessage, 'Вхід успішний. Перенаправлення у профіль...');
      setTimeout(() => window.location.href = '/profile', 700);
    } catch (error) {
      setMessage(authMessage, error.message, false);
      if (error.message.includes('Email не підтверджено')) {
        authMessage.innerHTML += '<br><button type="button" id="resendVerifyBtn">Надіслати підтвердження ще раз</button>';
        document.getElementById('resendVerifyBtn').addEventListener('click', resendVerification);
      }
    }
  });
}


const resetPasswordForm = document.getElementById('resetPasswordForm');
if (resetPasswordForm) {
  resetPasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const token = new URLSearchParams(window.location.search).get('token');
      if (!token) throw new Error('Токен відновлення не знайдено');
      const data = await api(`/api/auth/reset-password/${token}`, {
        method: 'POST',
        body: JSON.stringify({
          password: document.getElementById('resetPassword').value,
          confirmPassword: document.getElementById('resetConfirmPassword').value
        })
      });
      setMessage(authMessage, data.message, true);
      e.target.reset();
    } catch (error) {
      setMessage(authMessage, error.message, false);
    }
  });
}

const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      if (getAccessToken()) {
        await api('/api/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken: getRefreshToken() }) });
      }
    } catch (e) {}
    localStorage.clear();
    renderUser();
    window.location.href = '/login';
  });
}

const googleBtn = document.getElementById('googleBtn');
if (googleBtn) googleBtn.addEventListener('click', () => { window.location.href = '/api/auth/google'; });

if (recipeForm) {
  recipeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const id = document.getElementById('recipeId').value;
      const method = id ? 'PUT' : 'POST';
      const url = id ? `/api/recipes/${id}` : '/api/recipes';

      const formData = new FormData();
      formData.append('title', document.getElementById('title').value);
      formData.append('description', document.getElementById('description').value);
      formData.append('ingredients', document.getElementById('ingredients').value);
      formData.append('category', document.getElementById('category').value);
      formData.append('cookingTime', document.getElementById('cookingTime').value);

      const imageInput = document.getElementById('recipeImages');
      if (imageInput && imageInput.files.length) {
        Array.from(imageInput.files).forEach((file) => formData.append('images', file));
      }

      const headers = {};
      const token = getAccessToken();
      if (token) headers.Authorization = `Bearer ${token}`;

      const response = await fetch(url, { method, headers, body: formData });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Помилка збереження рецепту');

      setMessage(recipeMessage, id ? 'Рецепт оновлено' : 'Рецепт додано');
      resetRecipeForm();
      await loadRecipes();
    } catch (error) {
      setMessage(recipeMessage, error.message + '. Додавати рецепти може лише авторизований користувач.', false);
    }
  });
}

const cancelEdit = document.getElementById('cancelEdit');
if (cancelEdit) cancelEdit.addEventListener('click', resetRecipeForm);

const profileForm = document.getElementById('profileForm');
if (profileForm) {
  profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const data = await api('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({
          name: document.getElementById('profileName').value || undefined,
          email: document.getElementById('profileEmail').value || undefined
        })
      });
      localStorage.setItem('user', JSON.stringify(data.user));
      renderUser();
      const verifyLink = data.devVerifyEmailUrl ? ` Підтвердіть новий email: <a href="${data.devVerifyEmailUrl}">посилання</a>` : '';
      setMessage(profileMessage, 'Профіль оновлено', true);
      profileMessage.innerHTML = `Профіль оновлено.${verifyLink}`;
    } catch (error) { setMessage(profileMessage, error.message, false); }
  });
}

const passwordForm = document.getElementById('passwordForm');
if (passwordForm) {
  passwordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await api('/api/auth/change-password', {
        method: 'PUT',
        body: JSON.stringify({ oldPassword: document.getElementById('oldPassword').value, newPassword: document.getElementById('newPassword').value })
      });
      setMessage(profileMessage, 'Пароль змінено');
      e.target.reset();
    } catch (error) { setMessage(profileMessage, error.message, false); }
  });
}

const forgotForm = document.getElementById('forgotForm');
if (forgotForm) {
  forgotForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const data = await api('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email: document.getElementById('forgotEmail').value }) });
      const targetMessage = profileMessage || authMessage;
      setMessage(targetMessage, data.message, true);
      targetMessage.innerHTML = data.devResetUrl ? `${data.message}: <a href="${data.devResetUrl}">відкрити форму нового пароля</a>` : data.message;
    } catch (error) { setMessage(profileMessage || authMessage, error.message, false); }
  });
}

const deleteProfileBtn = document.getElementById('deleteProfileBtn');
if (deleteProfileBtn) {
  deleteProfileBtn.addEventListener('click', async () => {
    try {
      await api('/api/auth/profile', { method: 'DELETE' });
      localStorage.clear();
      renderUser();
      setMessage(profileMessage, 'Користувача видалено');
    } catch (error) { setMessage(profileMessage, error.message, false); }
  });
}


const singleUploadForm = document.getElementById('singleUploadForm');
const multipleUploadForm = document.getElementById('multipleUploadForm');
const singleUploadMessage = document.getElementById('singleUploadMessage');
const multipleUploadMessage = document.getElementById('multipleUploadMessage');
const singleUploadResult = document.getElementById('singleUploadResult');
const multipleUploadResult = document.getElementById('multipleUploadResult');

function renderUploadedFiles(container, files) {
  if (!container) return;
  container.innerHTML = files.map((file) => {
    const isImage = file.mimetype && file.mimetype.startsWith('image/');
    const preview = isImage
      ? `<img src="${file.path}" alt="${file.originalName}">`
      : `<div class="file-icon">PDF</div>`;

    return `
      <div class="uploaded-file-card">
        ${preview}
        <div>
          <strong>${file.originalName}</strong>
          <p>${Math.round(file.size / 1024)} KB</p>
          <a href="${file.path}" target="_blank" rel="noopener">Відкрити файл</a>
        </div>
      </div>
    `;
  }).join('');
}

async function uploadFormData(url, formData) {
  const headers = {};
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(url, { method: 'POST', headers, body: formData });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Помилка завантаження файлу');
  return data;
}

if (singleUploadForm) {
  singleUploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const fileInput = document.getElementById('singleFile');
      if (!fileInput.files.length) throw new Error('Оберіть файл');

      const formData = new FormData();
      formData.append('file', fileInput.files[0]);

      const data = await uploadFormData('/api/upload', formData);
      setMessage(singleUploadMessage, data.message, true);
      renderUploadedFiles(singleUploadResult, [data.file]);
      singleUploadForm.reset();
    } catch (error) {
      setMessage(singleUploadMessage, error.message, false);
    }
  });
}

if (multipleUploadForm) {
  multipleUploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const fileInput = document.getElementById('multipleFiles');
      if (!fileInput.files.length) throw new Error('Оберіть хоча б один файл');

      const formData = new FormData();
      Array.from(fileInput.files).forEach((file) => formData.append('files', file));

      const data = await uploadFormData('/api/upload-multiple', formData);
      setMessage(multipleUploadMessage, data.message, true);
      renderUploadedFiles(multipleUploadResult, data.files);
      multipleUploadForm.reset();
    } catch (error) {
      setMessage(multipleUploadMessage, error.message, false);
    }
  });
}

const refreshRecipes = document.getElementById('refreshRecipes');
if (refreshRecipes) refreshRecipes.addEventListener('click', loadRecipes);
if (searchInput) searchInput.addEventListener('input', renderRecipes);

const params = new URLSearchParams(window.location.search);
if (params.get('accessToken')) {
  localStorage.setItem('accessToken', params.get('accessToken'));
  localStorage.setItem('refreshToken', params.get('refreshToken'));
  if (params.get('user')) localStorage.setItem('user', decodeURIComponent(params.get('user')));
  window.history.replaceState({}, '', '/');
  loadProfile();
}

renderUser();

if (window.location.pathname === '/profile' && !getAccessToken()) {
  window.location.href = '/login';
}

loadProfile();
loadRecipes();
