const swaggerJsdoc = require('swagger-jsdoc');

const PORT = process.env.PORT || 3000;
const publicUrl = process.env.PUBLIC_URL || `http://localhost:${PORT}`;

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Recipe Manager REST API',
    version: '1.0.0',
    description: 'Лабораторна робота №6: REST API з MySQL, CRUD-операціями та Swagger/OpenAPI документацією.'
  },
  servers: [
    { url: publicUrl, description: 'Local / deployed server' }
  ],
  tags: [
    { name: 'Health', description: 'Перевірка стану сервера' },
    { name: 'Auth', description: 'Реєстрація, авторизація та профіль користувача' },
    { name: 'Recipes', description: 'CRUD-операції з рецептами в MySQL' },
    { name: 'Upload', description: 'Завантаження файлів' },
    { name: 'Status', description: 'Системна інформація сервера' }
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: { message: { type: 'string', example: 'Помилка запиту' } }
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          name: { type: 'string', example: 'Ivan' },
          email: { type: 'string', example: 'ivan@example.com' },
          role: { type: 'string', example: 'user' },
          isEmailVerified: { type: 'boolean', example: true },
          provider: { type: 'string', example: 'local' }
        }
      },
      Recipe: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          title: { type: 'string', example: 'Борщ' },
          description: { type: 'string', example: 'Традиційна українська страва' },
          ingredients: { type: 'string', example: 'буряк, капуста, картопля, морква' },
          category: { type: 'string', example: 'Супи' },
          cookingTime: { type: 'integer', example: 60 },
          imagePath: { type: 'string', nullable: true, example: '/uploads/recipes/photo.jpg' },
          userId: { type: 'integer', example: 1 },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      RecipeInput: {
        type: 'object',
        required: ['title', 'description', 'ingredients', 'category', 'cookingTime'],
        properties: {
          title: { type: 'string', example: 'Борщ' },
          description: { type: 'string', example: 'Традиційна українська страва' },
          ingredients: { type: 'string', example: 'буряк, капуста, картопля, морква' },
          category: { type: 'string', example: 'Супи' },
          cookingTime: { type: 'integer', example: 60 },
          images: { type: 'array', items: { type: 'string', format: 'binary' } }
        }
      },
      AuthTokens: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'Вхід успішний' },
          accessToken: { type: 'string', example: 'jwt.access.token' },
          refreshToken: { type: 'string', example: 'jwt.refresh.token' },
          user: { $ref: '#/components/schemas/User' }
        }
      }
    }
  },
  paths: {
    '/api/health': {
      get: {
        tags: ['Health'],
        summary: 'Перевірити працездатність API',
        responses: { 200: { description: 'Сервер працює' } }
      }
    },
    '/api/status': {
      get: {
        tags: ['Status'],
        summary: 'Отримати системний статус Node.js сервера',
        responses: { 200: { description: 'Інформація про uptime, памʼять, CPU та Node.js' } }
      }
    },
    '/api/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Зареєструвати нового користувача',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['name', 'email', 'password', 'confirmPassword'], properties: { name: { type: 'string', example: 'Ivan' }, email: { type: 'string', example: 'ivan@example.com' }, password: { type: 'string', example: 'password123' }, confirmPassword: { type: 'string', example: 'password123' } } } } }
        },
        responses: { 201: { description: 'Користувача створено' }, 400: { description: 'Помилка валідації' } }
      }
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Увійти та отримати JWT токени',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['email', 'password'], properties: { email: { type: 'string', example: 'ivan@example.com' }, password: { type: 'string', example: 'password123' } } } } } },
        responses: { 200: { description: 'Успішний вхід', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthTokens' } } } }, 400: { description: 'Невірні дані' } }
      }
    },
    '/api/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Оновити access token через refresh token',
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['refreshToken'], properties: { refreshToken: { type: 'string' } } } } } },
        responses: { 200: { description: 'Новий accessToken' }, 401: { description: 'Refresh token недійсний' } }
      }
    },
    '/api/auth/profile': {
      get: { tags: ['Auth'], summary: 'Отримати профіль поточного користувача', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Дані користувача' }, 401: { description: 'Потрібна авторизація' } } },
      put: { tags: ['Auth'], summary: 'Оновити профіль користувача', security: [{ bearerAuth: [] }], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string', example: 'Ivan Updated' }, email: { type: 'string', example: 'new@example.com' } } } } } }, responses: { 200: { description: 'Профіль оновлено' } } },
      delete: { tags: ['Auth'], summary: 'Видалити власний профіль', security: [{ bearerAuth: [] }], responses: { 200: { description: 'Користувача видалено' } } }
    },
    '/api/recipes': {
      get: {
        tags: ['Recipes'],
        summary: 'Отримати список рецептів з пагінацією',
        parameters: [
          { in: 'query', name: 'page', schema: { type: 'integer', default: 1 }, description: 'Номер сторінки' },
          { in: 'query', name: 'limit', schema: { type: 'integer', default: 10 }, description: 'Кількість елементів на сторінці' }
        ],
        responses: { 200: { description: 'Список рецептів', content: { 'application/json': { schema: { type: 'object', properties: { total: { type: 'integer' }, page: { type: 'integer' }, totalPages: { type: 'integer' }, recipes: { type: 'array', items: { $ref: '#/components/schemas/Recipe' } } } } } } } }
      },
      post: {
        tags: ['Recipes'],
        summary: 'Створити рецепт',
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { 'multipart/form-data': { schema: { $ref: '#/components/schemas/RecipeInput' } } } },
        responses: { 201: { description: 'Рецепт додано' }, 400: { description: 'Помилка валідації' }, 401: { description: 'Потрібна авторизація' } }
      }
    },
    '/api/recipes/{id}': {
      get: {
        tags: ['Recipes'],
        summary: 'Отримати рецепт за ID',
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Рецепт', content: { 'application/json': { schema: { $ref: '#/components/schemas/Recipe' } } } }, 404: { description: 'Рецепт не знайдено' } }
      },
      put: {
        tags: ['Recipes'],
        summary: 'Оновити рецепт за ID',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
        requestBody: { required: true, content: { 'multipart/form-data': { schema: { $ref: '#/components/schemas/RecipeInput' } } } },
        responses: { 200: { description: 'Рецепт оновлено' }, 403: { description: 'Немає прав' }, 404: { description: 'Рецепт не знайдено' } }
      },
      delete: {
        tags: ['Recipes'],
        summary: 'Видалити рецепт за ID',
        security: [{ bearerAuth: [] }],
        parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Рецепт видалено' }, 403: { description: 'Немає прав' }, 404: { description: 'Рецепт не знайдено' } }
      }
    },
    '/api/upload': {
      post: {
        tags: ['Upload'],
        summary: 'Завантажити один файл',
        requestBody: { required: true, content: { 'multipart/form-data': { schema: { type: 'object', required: ['file'], properties: { file: { type: 'string', format: 'binary' } } } } } },
        responses: { 201: { description: 'Файл завантажено' }, 400: { description: 'Помилка завантаження' } }
      }
    },
    '/api/upload-multiple': {
      post: {
        tags: ['Upload'],
        summary: 'Завантажити кілька файлів',
        requestBody: { required: true, content: { 'multipart/form-data': { schema: { type: 'object', required: ['files'], properties: { files: { type: 'array', items: { type: 'string', format: 'binary' } } } } } } },
        responses: { 201: { description: 'Файли завантажено' }, 400: { description: 'Помилка завантаження' } }
      }
    }
  }
};

module.exports = swaggerJsdoc({
  definition: swaggerDefinition,
  apis: []
});
