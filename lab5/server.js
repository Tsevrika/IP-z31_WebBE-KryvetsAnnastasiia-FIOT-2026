require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const passport = require('passport');
const bcrypt = require('bcryptjs');
const { User } = require('./models');
const { sequelize } = require('./models');
const authRoutes = require('./routes/authRoutes');
const recipeRoutes = require('./routes/recipeRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const statusRoutes = require('./routes/statusRoutes');
const performanceLogger = require('./middleware/performanceLogger');
const logger = require('./utils/logger');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(morgan('combined'));
app.use(performanceLogger);
app.use(passport.initialize());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  message: { message: 'Забагато запитів. Спробуйте пізніше.' }
});

app.use('/api/auth/login', loginLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/recipes', recipeRoutes);
app.use('/api', uploadRoutes);
app.use('/api', statusRoutes);
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get('/api/health', (req, res) => res.json({ message: 'Backend працює' }));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'public', 'register.html')));
app.get('/profile', (req, res) => res.sendFile(path.join(__dirname, 'public', 'profile.html')));
app.get('/reset-password', (req, res) => res.sendFile(path.join(__dirname, 'public', 'reset-password.html')));

app.use('/api', notFound);
app.use(errorHandler);


async function createDefaultAdmin() {
  const adminExists = await User.findOne({ where: { role: 'admin' } });
  if (adminExists) {
    console.log('Admin already exists');
    return;
  }

  const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 10);
  await User.create({
    name: process.env.ADMIN_NAME || 'Admin',
    email: process.env.ADMIN_EMAIL || 'admin@example.com',
    password: hashedPassword,
    role: 'admin',
    isEmailVerified: true
  });
  console.log('Default admin created');
}

async function start() {
  try {
    await sequelize.authenticate();
    console.log('MySQL connected');
    await sequelize.sync({ alter: true });
    await createDefaultAdmin();
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error({ message: 'Server startup error', error: error.message, stack: error.stack });
    console.error('Server error:', error);
  }
}

start();
