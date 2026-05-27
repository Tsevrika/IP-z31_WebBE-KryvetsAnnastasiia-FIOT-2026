const API_URL = 'http://localhost:3000/api/recipes';
const burger = document.getElementById('burger');
const nav = document.getElementById('nav');
const form = document.getElementById('recipeForm');
const recipesList = document.getElementById('recipesList');
const message = document.getElementById('message');
const searchInput = document.getElementById('searchInput');
const reloadBtn = document.getElementById('reloadBtn');
const cancelEdit = document.getElementById('cancelEdit');
const submitBtn = document.getElementById('submitBtn');
const formTitle = document.getElementById('formTitle');

burger.addEventListener('click', () => nav.classList.toggle('active'));

const showMessage = (text, isError = false) => {
    message.textContent = text;
    message.style.color = isError ? '#b94a3a' : '#2a7a4b';
};

async function loadRecipes() {
    try {
        const response = await fetch(API_URL);
        const recipes = await response.json();
        renderRecipes(recipes);
        showMessage(`Завантажено рецептів: ${recipes.length}`);
    } catch (error) {
        showMessage('Backend не запущено. Запустіть npm install та npm start.', true);
    }
}

function renderRecipes(recipes) {
    const query = searchInput.value.toLowerCase().trim();
    const filtered = recipes.filter(recipe =>
        recipe.title.toLowerCase().includes(query) ||
        recipe.category.toLowerCase().includes(query)
    );

    recipesList.innerHTML = filtered.map(recipe => `
        <article class="recipe-card">
            <h3>${recipe.title}</h3>
            <p>${recipe.description}</p>
            <p><b>Інгредієнти:</b> ${recipe.ingredients}</p>
            <div class="recipe-meta">
                <span>${recipe.category}</span>
                <span>${recipe.cookingTime} хв</span>
                <span>User ID: ${recipe.userId || 1}</span>
            </div>
            <div class="card-actions">
                <button type="button" onclick='editRecipe(${JSON.stringify(recipe)})'>Редагувати</button>
                <button type="button" class="danger" onclick="deleteRecipe(${recipe.id})">Видалити</button>
            </div>
        </article>
    `).join('') || '<p>Рецептів не знайдено.</p>';
}

form.addEventListener('submit', async event => {
    event.preventDefault();
    const id = document.getElementById('recipeId').value;
    const recipe = {
        title: document.getElementById('title').value.trim(),
        description: document.getElementById('description').value.trim(),
        ingredients: document.getElementById('ingredients').value.trim(),
        category: document.getElementById('category').value.trim(),
        cookingTime: Number(document.getElementById('cookingTime').value),
        userId: 1
    };

    try {
        await fetch(id ? `${API_URL}/${id}` : API_URL, {
            method: id ? 'PUT' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(recipe)
        });
        resetForm();
        await loadRecipes();
        showMessage(id ? 'Рецепт оновлено.' : 'Рецепт додано.');
    } catch (error) {
        showMessage('Помилка збереження рецепта.', true);
    }
});

window.editRecipe = recipe => {
    document.getElementById('recipeId').value = recipe.id;
    document.getElementById('title').value = recipe.title;
    document.getElementById('description').value = recipe.description;
    document.getElementById('ingredients').value = recipe.ingredients;
    document.getElementById('category').value = recipe.category;
    document.getElementById('cookingTime').value = recipe.cookingTime;
    submitBtn.textContent = 'Оновити';
    formTitle.textContent = 'Редагувати рецепт';
    cancelEdit.hidden = false;
    location.hash = '#add';
};

window.deleteRecipe = async id => {
    try {
        await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
        await loadRecipes();
        showMessage('Рецепт видалено.');
    } catch (error) {
        showMessage('Помилка видалення рецепта.', true);
    }
};

function resetForm() {
    form.reset();
    document.getElementById('recipeId').value = '';
    submitBtn.textContent = 'Додати';
    formTitle.textContent = 'Додати рецепт';
    cancelEdit.hidden = true;
}

cancelEdit.addEventListener('click', resetForm);
reloadBtn.addEventListener('click', loadRecipes);
searchInput.addEventListener('input', loadRecipes);
loadRecipes();
