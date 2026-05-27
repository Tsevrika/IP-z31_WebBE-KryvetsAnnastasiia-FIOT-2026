const express = require('express');
const { body, validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Recipe, User } = require('../models');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

const uploadDir = path.join(__dirname, '..', 'uploads', 'recipes');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
const maxImageSize = 2 * 1024 * 1024;

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const safeOriginalName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${safeOriginalName}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (allowedImageTypes.includes(file.mimetype)) return cb(null, true);
  cb(new Error('Фото рецепту має бути JPG, PNG або WEBP'));
};

const uploadRecipeImage = multer({
  storage,
  fileFilter,
  limits: { fileSize: maxImageSize }
}).array('images', 5);

function recipeUploadMiddleware(req, res, next) {
  uploadRecipeImage(req, res, (error) => {
    if (!error) return next();
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'Фото рецепту має бути не більше 2 МБ' });
    }
    return res.status(400).json({ message: error.message || 'Помилка завантаження фото' });
  });
}

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

router.post('/', authMiddleware, recipeUploadMiddleware, recipeValidation, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: 'Помилка валідації', errors: errors.array() });

    const recipe = await Recipe.create({
      title: req.body.title,
      description: req.body.description,
      ingredients: req.body.ingredients,
      category: req.body.category,
      cookingTime: Number(req.body.cookingTime),
      imagePath: req.files && req.files.length ? `/uploads/recipes/${req.files[0].filename}` : null,
      imagePaths: req.files && req.files.length
        ? JSON.stringify(req.files.map(file => `/uploads/recipes/${file.filename}`))
        : null,
      userId: req.user.id
    });

    res.status(201).json({ message: 'Рецепт додано', recipe });
  } catch (error) { next(error); }
});

router.put('/:id', authMiddleware, recipeUploadMiddleware, recipeValidation, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: 'Помилка валідації', errors: errors.array() });

    const recipe = await Recipe.findByPk(req.params.id);
    if (!recipe) return res.status(404).json({ message: 'Рецепт не знайдено' });
    if (recipe.userId !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ message: 'Можна редагувати лише свої рецепти' });

    const updatedData = {
      title: req.body.title,
      description: req.body.description,
      ingredients: req.body.ingredients,
      category: req.body.category,
      cookingTime: Number(req.body.cookingTime)
    };

    if (req.files && req.files.length) {
      const paths = req.files.map(file => `/uploads/recipes/${file.filename}`);
      updatedData.imagePath = paths[0];
      updatedData.imagePaths = JSON.stringify(paths);
    }

    await recipe.update(updatedData);
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
