const express = require('express');
const router = express.Router();
const { Recipe, User } = require('../models');

router.get('/', async (req, res) => {
    const recipes = await Recipe.findAll({ include: User, order: [['id', 'DESC']] });
    res.json(recipes);
});

router.get('/:id', async (req, res) => {
    const recipe = await Recipe.findByPk(req.params.id, { include: User });
    if (!recipe) return res.status(404).json({ message: 'Рецепт не знайдено' });
    res.json(recipe);
});

router.post('/', async (req, res) => {
    const recipe = await Recipe.create(req.body);
    res.status(201).json(recipe);
});

router.put('/:id', async (req, res) => {
    const recipe = await Recipe.findByPk(req.params.id);
    if (!recipe) return res.status(404).json({ message: 'Рецепт не знайдено' });
    await recipe.update(req.body);
    res.json(recipe);
});

router.delete('/:id', async (req, res) => {
    const deleted = await Recipe.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ message: 'Рецепт не знайдено' });
    res.json({ message: 'Рецепт видалено' });
});

module.exports = router;
