const express = require('express');
const { body, validationResult } = require('express-validator');
const { Recipe, User } = require('../models');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

const recipeValidation = [
  body('title').trim().notEmpty().withMessage('Назва обов’язкова'),
  body('description').trim().notEmpty().withMessage('Опис обов’язковий'),
  body('ingredients').trim().notEmpty().withMessage('Інгредієнти обов’язкові'),
  body('category').trim().notEmpty().withMessage('Категорія обов’язкова'),
  body('cookingTime').isInt({ min: 1 }).withMessage('Час має бути числом більше 0')
];

router.get('/', async (req, res, next) => {
  try {
    const recipes = await Recipe.findAll({
      include: [{ model: User, attributes: ['id', 'name', 'email'] }],
      order: [['createdAt', 'DESC']]
    });
    res.json(recipes);
  } catch (error) { next(error); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const recipe = await Recipe.findByPk(req.params.id, { include: [{ model: User, attributes: ['id', 'name'] }] });
    if (!recipe) return res.status(404).json({ message: 'Рецепт не знайдено' });
    res.json(recipe);
  } catch (error) { next(error); }
});

router.post('/', authMiddleware, recipeValidation, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: 'Помилка валідації', errors: errors.array() });
    const recipe = await Recipe.create({ ...req.body, userId: req.user.id });
    res.status(201).json({ message: 'Рецепт додано', recipe });
  } catch (error) { next(error); }
});

router.put('/:id', authMiddleware, recipeValidation, async (req, res, next) => {
  try {
    const recipe = await Recipe.findByPk(req.params.id);
    if (!recipe) return res.status(404).json({ message: 'Рецепт не знайдено' });
    if (recipe.userId !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ message: 'Можна редагувати лише свої рецепти' });
    await recipe.update(req.body);
    res.json({ message: 'Рецепт оновлено', recipe });
  } catch (error) { next(error); }
});

router.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    const recipe = await Recipe.findByPk(req.params.id);
    if (!recipe) return res.status(404).json({ message: 'Рецепт не знайдено' });
    if (recipe.userId !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ message: 'Можна видаляти лише свої рецепти' });
    await recipe.destroy();
    res.json({ message: 'Рецепт видалено' });
  } catch (error) { next(error); }
});

module.exports = router;
