const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { User, RefreshToken } = require('../models');
const { authMiddleware } = require('../middleware/authMiddleware');
const { sendEmail } = require('../utils/mailer');

const router = express.Router();
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_TIME_MS = 10 * 60 * 1000;
const RESET_TOKEN_MINUTES = 30;
const VERIFY_TOKEN_HOURS = 24;
const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';

function makeAccessToken(user) {
  return jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '15m' });
}

async function makeRefreshToken(user) {
  const token = jwt.sign({ id: user.id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
  await RefreshToken.create({ token, userId: user.id, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) });
  return token;
}

function safeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isEmailVerified: user.isEmailVerified,
    provider: user.provider
  };
}

function validationError(req, res) {
  return res.status(400).json({ message: 'Помилка валідації', errors: validationResult(req).array() });
}

function createPublicToken() {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  return { rawToken, hashedToken };
}

function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

function makeVerifyLink(token) {
  return `${clientUrl}/api/auth/verify-email/${token}`;
}

function makeResetLink(token) {
  return `${clientUrl}/reset-password?token=${token}`;
}

function sendDevEmail(to, subject, url) {
  console.log('\n================ DEV EMAIL ================');
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Link: ${url}`);
  console.log('===========================================\n');
}

async function createVerificationForUser(user) {
  const { rawToken, hashedToken } = createPublicToken();
  user.emailVerificationToken = hashedToken;
  user.emailVerificationExpires = new Date(Date.now() + VERIFY_TOKEN_HOURS * 60 * 60 * 1000);
  await user.save();

  const verifyEmailUrl = makeVerifyLink(rawToken);

  await sendEmail({
    to: user.email,
    subject: 'Підтвердження email',
    html: `
      <h2>Підтвердіть email</h2>
      <p>Для завершення реєстрації натисніть посилання:</p>
      <a href="${verifyEmailUrl}">Підтвердити email</a>
    `,
  });

  sendDevEmail(user.email, 'Підтвердження email', verifyEmailUrl);
  return verifyEmailUrl;
}

async function issueAuthResponse(res, user, message = 'Вхід успішний') {
  const accessToken = makeAccessToken(user);
  const refreshToken = await makeRefreshToken(user);
  return res.json({ message, accessToken, refreshToken, user: safeUser(user) });
}

router.post('/register',
  body('name').trim().notEmpty().withMessage("Ім'я обов'язкове"),
  body('email').normalizeEmail().isEmail().withMessage('Некоректний email'),
  body('password').isLength({ min: 6 }).withMessage('Пароль мінімум 6 символів'),
  body('confirmPassword').custom((value, { req }) => value === req.body.password).withMessage('Паролі не співпадають'),
  async (req, res, next) => {
    try {
      if (!validationResult(req).isEmpty()) return validationError(req, res);

      const { name, email, password } = req.body;
      const exists = await User.findOne({ where: { email } });
      if (exists) return res.status(400).json({ message: 'Користувач вже існує' });

      const hashedPassword = await bcrypt.hash(password, 12);
      const user = await User.create({ name, email, password: hashedPassword, role: 'user', provider: 'local', isEmailVerified: false });
      const verifyEmailUrl = await createVerificationForUser(user);

      res.status(201).json({
        message: 'Користувача створено. Підтвердіть email за посиланням з листа.',
        user: safeUser(user),
        devVerifyEmailUrl: process.env.NODE_ENV === 'production' ? undefined : verifyEmailUrl
      });
    } catch (error) { next(error); }
  }
);

router.post('/login',
  body('email').normalizeEmail().isEmail().withMessage('Некоректний email'),
  body('password').notEmpty().withMessage('Пароль обов’язковий'),
  async (req, res, next) => {
    try {
      if (!validationResult(req).isEmpty()) return validationError(req, res);

      const { email, password } = req.body;
      const user = await User.findOne({ where: { email } });
      if (!user || !user.password) return res.status(400).json({ message: 'Невірний email або пароль' });

      if (user.lockUntil && user.lockUntil > new Date()) {
        return res.status(429).json({ message: 'Забагато спроб входу. Спробуйте пізніше.' });
      }

      const ok = await bcrypt.compare(password, user.password);
      if (!ok) {
        user.loginAttempts += 1;
        if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
          user.lockUntil = new Date(Date.now() + LOCK_TIME_MS);
          user.loginAttempts = 0;
        }
        await user.save();
        return res.status(400).json({ message: 'Невірний email або пароль' });
      }

      if (!user.isEmailVerified) {
        return res.status(403).json({
          message: 'Email не підтверджено. Натисніть “Надіслати підтвердження ще раз”.',
          canResendVerification: true
        });
      }

      user.loginAttempts = 0;
      user.lockUntil = null;
      await user.save();
      return issueAuthResponse(res, user);
    } catch (error) { next(error); }
  }
);

router.post('/resend-verification', body('email').normalizeEmail().isEmail(), async (req, res, next) => {
  try {
    if (!validationResult(req).isEmpty()) return validationError(req, res);
    const user = await User.findOne({ where: { email: req.body.email } });

    if (user && !user.isEmailVerified) {
      const verifyEmailUrl = await createVerificationForUser(user);
      return res.json({
        message: 'Якщо email існує і ще не підтверджений, нове посилання надіслано.',
        devVerifyEmailUrl: process.env.NODE_ENV === 'production' ? undefined : verifyEmailUrl
      });
    }

    return res.json({ message: 'Якщо email існує і ще не підтверджений, нове посилання надіслано.' });
  } catch (error) { next(error); }
});

router.get('/verify-email/:token', async (req, res, next) => {
  try {
    const hashedToken = hashToken(req.params.token);
    const user = await User.findOne({ where: { emailVerificationToken: hashedToken } });

    if (!user || !user.emailVerificationExpires || user.emailVerificationExpires < new Date()) {
      return res.status(400).send('<h1>Посилання підтвердження недійсне або прострочене</h1><a href="/login">На сторінку входу</a>');
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    await user.save();
    res.send('<h1>Email підтверджено</h1><p>Тепер можна увійти в акаунт.</p><a href="/login">Увійти</a>');
  } catch (error) { next(error); }
});

router.post('/forgot-password', body('email').normalizeEmail().isEmail(), async (req, res, next) => {
  try {
    if (!validationResult(req).isEmpty()) return validationError(req, res);
    const user = await User.findOne({ where: { email: req.body.email } });

    let resetUrl = null;
    if (user) {
      const { rawToken, hashedToken } = createPublicToken();

      user.resetPasswordToken = hashedToken;
      user.resetPasswordExpires = new Date(
        Date.now() + RESET_TOKEN_MINUTES * 60 * 1000
      );

      await user.save();

      resetUrl = makeResetLink(rawToken);

      await sendEmail({
        to: user.email,
        subject: 'Відновлення пароля',
        html: `
          <h2>Відновлення пароля</h2>

          <a href="${resetUrl}">
            Змінити пароль
          </a>
        `,
      });
    }

    res.json({
      message: 'Якщо такий email існує, посилання для відновлення пароля надіслано. Воно діє 30 хвилин.',
      devResetUrl: process.env.NODE_ENV === 'production' ? undefined : resetUrl
    });
  } catch (error) { next(error); }
});

router.post('/reset-password/:token',
  body('password').isLength({ min: 6 }).withMessage('Пароль мінімум 6 символів'),
  body('confirmPassword').custom((value, { req }) => value === req.body.password).withMessage('Паролі не співпадають'),
  async (req, res, next) => {
    try {
      if (!validationResult(req).isEmpty()) return validationError(req, res);

      const hashedToken = hashToken(req.params.token);

      const user = await User.findOne({
        where: { resetPasswordToken: hashedToken }
      });

      if (!user || !user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
        return res.status(400).json({ message: 'Посилання недійсне або прострочене' });
      }

      user.password = await bcrypt.hash(req.body.password, 12);
      user.provider = user.googleId ? user.provider : 'local';
      user.resetPasswordToken = null;
      user.resetPasswordExpires = null;
      user.loginAttempts = 0;
      user.lockUntil = null;

      await user.save();

      await RefreshToken.update(
        { revoked: true },
        { where: { userId: user.id, revoked: false } }
      );

      res.json({ message: 'Пароль відновлено. Увійдіть з новим паролем.' });
    } catch (error) {
      next(error);
    }
  }
);

router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ message: 'Refresh token обов’язковий' });

    const stored = await RefreshToken.findOne({ where: { token: refreshToken, revoked: false } });
    if (!stored || stored.expiresAt < new Date()) return res.status(401).json({ message: 'Refresh token недійсний' });

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findByPk(decoded.id);
    if (!user) return res.status(401).json({ message: 'Користувача не знайдено' });

    res.json({ accessToken: makeAccessToken(user) });
  } catch (error) { next(error); }
});

router.post('/logout', authMiddleware, async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) await RefreshToken.update({ revoked: true }, { where: { token: refreshToken, userId: req.user.id } });
    res.json({ message: 'Вихід виконано' });
  } catch (error) { next(error); }
});

router.get('/profile', authMiddleware, (req, res) => res.json({ user: req.user }));

router.put('/profile', authMiddleware,
  body('name').optional().trim().notEmpty().withMessage("Ім'я не може бути порожнім"),
  body('email').optional().normalizeEmail().isEmail().withMessage('Некоректний email'),
  async (req, res, next) => {
    try {
      if (!validationResult(req).isEmpty()) return validationError(req, res);
      const user = await User.findByPk(req.user.id);
      if (req.body.name) user.name = req.body.name;

      let verifyEmailUrl = null;
      if (req.body.email && req.body.email !== user.email) {
        const exists = await User.findOne({ where: { email: req.body.email } });
        if (exists) return res.status(400).json({ message: 'Цей email вже використовується' });
        user.email = req.body.email;
        user.isEmailVerified = false;
        verifyEmailUrl = await createVerificationForUser(user);
      } else {
        await user.save();
      }

      res.json({
        message: 'Профіль оновлено',
        user: safeUser(user),
        devVerifyEmailUrl: process.env.NODE_ENV === 'production' ? undefined : verifyEmailUrl
      });
    } catch (error) { next(error); }
  }
);

router.put('/change-password', authMiddleware,
  body('oldPassword').notEmpty().withMessage('Старий пароль обов’язковий'),
  body('newPassword').isLength({ min: 6 }).withMessage('Новий пароль мінімум 6 символів'),
  async (req, res, next) => {
    try {
      if (!validationResult(req).isEmpty()) return validationError(req, res);
      const user = await User.findByPk(req.user.id);
      if (!user.password) return res.status(400).json({ message: 'Цей акаунт створено через Google. Створіть пароль через відновлення.' });
      const ok = await bcrypt.compare(req.body.oldPassword, user.password);
      if (!ok) return res.status(400).json({ message: 'Старий пароль неправильний' });
      user.password = await bcrypt.hash(req.body.newPassword, 12);
      await user.save();
      await RefreshToken.update({ revoked: true }, { where: { userId: user.id, revoked: false } });
      res.json({ message: 'Пароль змінено. Увійдіть повторно.' });
    } catch (error) { next(error); }
  }
);

router.delete('/profile', authMiddleware, async (req, res, next) => {
  try {
    await User.destroy({ where: { id: req.user.id } });
    res.json({ message: 'Користувача видалено' });
  } catch (error) { next(error); }
});

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || `${clientUrl}/api/auth/google/callback`
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails?.[0]?.value;
      const emailVerified = profile.emails?.[0]?.verified !== false;
      if (!email) return done(new Error('Google не повернув email'));

      let user = await User.findOne({ where: { email } });
      if (!user) {
        user = await User.create({
          name: profile.displayName || email,
          email,
          googleId: profile.id,
          provider: 'google',
          isEmailVerified: emailVerified,
          role: 'user'
        });
      } else {
        user.googleId = user.googleId || profile.id;
        user.provider = user.provider === 'local' ? 'local' : 'google';
        if (emailVerified) {
          user.isEmailVerified = true;
          user.emailVerificationToken = null;
          user.emailVerificationExpires = null;
        }
        await user.save();
      }
      return done(null, user);
    } catch (e) { return done(e); }
  }));

  router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));
  router.get('/google/callback', passport.authenticate('google', { session: false, failureRedirect: '/login?oauth=failed' }), async (req, res, next) => {
    try {
      const accessToken = makeAccessToken(req.user);
      const refreshToken = await makeRefreshToken(req.user);
      const user = encodeURIComponent(JSON.stringify(safeUser(req.user)));
      res.redirect(`/?accessToken=${encodeURIComponent(accessToken)}&refreshToken=${encodeURIComponent(refreshToken)}&user=${user}`);
    } catch (error) { next(error); }
  });
} else {
  router.get('/google', (req, res) => res.status(501).json({ message: 'Google OAuth готовий у коді, але треба заповнити GOOGLE_CLIENT_ID та GOOGLE_CLIENT_SECRET у .env' }));
}

router.get('/verify-email/:token', async (req, res) => {
  const user = await User.findOne({
    where: {
      emailVerificationToken: req.params.token
    }
  });

  if (!user) {
    return res.status(400).send('Invalid token');
  }

  user.emailVerified = true;
  user.emailVerificationToken = null;

  await user.save();

  res.send('Email verified successfully');
});

router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;

  const user = await User.findOne({
    where: {
      passwordResetToken: token
    }
  });

  if (!user) {
    return res.status(400).json({
      message: 'Invalid token'
    });
  }

  user.password = await bcrypt.hash(password, 10);
  user.passwordResetToken = null;

  await user.save();

  res.json({
    message: 'Password updated'
  });
});
module.exports = router;
