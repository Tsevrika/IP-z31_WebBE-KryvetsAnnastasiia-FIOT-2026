const logger = require('../utils/logger');

function performanceLogger(req, res, next) {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1_000_000;

    logger.info({
      type: 'performance',
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      responseTimeMs: Number(durationMs.toFixed(2))
    });
  });

  next();
}

module.exports = performanceLogger;
