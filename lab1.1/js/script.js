const burger = document.getElementById("burger");
const nav = document.getElementById("nav");
const recipeForm = document.getElementById("recipeForm");
const recipesList = document.getElementById("recipesList");

burger.addEventListener("click", () => {
    nav.classList.toggle("active");
});

recipeForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const title = document.getElementById("title").value;
    const description = document.getElementById("description").value;
    const ingredients = document.getElementById("ingredients").value;
    const category = document.getElementById("category").value;
    const cookingTime = document.getElementById("cookingTime").value;

    const card = document.createElement("div");
    card.classList.add("recipe-card");

    card.innerHTML = `
        <h3>${title}</h3>
        <p>${description}</p>
        <p><strong>Інгредієнти:</strong> ${ingredients}</p>
        <p><strong>Категорія:</strong> ${category}</p>
        <p><strong>Час:</strong> ${cookingTime} хв</p>
    `;

    recipesList.appendChild(card);

    recipeForm.reset();
});