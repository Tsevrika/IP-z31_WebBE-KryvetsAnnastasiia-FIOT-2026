const jwt = require('jsonwebtoken');
const { User } = require('../models');

async function authMiddleware(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Немає токена' });
    }

    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id, { attributes: { exclude: ['password'] } });

    if (!user) return res.status(401).json({ message: 'Користувача не знайдено' });

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Невірний або прострочений токен' });
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ message: 'Недостатньо прав доступу' });
    }
    next();
  };
}

module.exports = { authMiddleware, requireRole };
