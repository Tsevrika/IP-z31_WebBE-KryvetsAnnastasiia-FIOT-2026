const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const sequelize = require('./config/database');
const { User, Recipe } = require('./models');
const recipeRoutes = require('./routes/recipeRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));
app.use('/api/recipes', recipeRoutes);

app.get('/api', (req, res) => {
    res.json({ message: 'Recipe Manager API працює' });
});

async function startServer() {
    try {
        await sequelize.authenticate();
        console.log('MySQL connected');
        await sequelize.sync();

        const [user] = await User.findOrCreate({
            where: { email: 'student@example.com' },
            defaults: { name: 'Student' }
        });

        const count = await Recipe.count();
        if (count === 0) {
            await Recipe.bulkCreate([
                { title: 'Паста з томатами', description: 'Смачна паста з томатним соусом.', ingredients: 'паста, томати, сир', category: 'Основна страва', cookingTime: 25, userId: user.id },
                { title: 'Овочевий салат', description: 'Легкий салат зі свіжих овочів.', ingredients: 'огірки, помідори, зелень', category: 'Салат', cookingTime: 10, userId: user.id },
                { title: 'Млинці', description: 'Домашні млинці до сніданку.', ingredients: 'молоко, яйця, борошно', category: 'Десерт', cookingTime: 30, userId: user.id }
            ]);
        }

        app.listen(PORT, () => console.log(`Server started: http://localhost:${PORT}`));
    } catch (error) {
        console.error('Database connection error:', error.message);
    }
}

startServer();
