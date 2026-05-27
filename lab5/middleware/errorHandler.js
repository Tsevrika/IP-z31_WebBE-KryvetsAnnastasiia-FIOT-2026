const logger = require('../utils/logger');

function notFound(req, res, next) {
  res.status(404).json({ message: 'Маршрут не знайдено' });
}

function errorHandler(err, req, res, next) {
  logger.error({ message: err.message, stack: err.stack, url: req.originalUrl });
  res.status(err.status || 500).json({ message: err.message || 'Помилка сервера' });
}

module.exports = { notFound, errorHandler };
