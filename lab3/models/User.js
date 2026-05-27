const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: true },
  role: { type: DataTypes.ENUM('user', 'admin'), defaultValue: 'user' },

  isEmailVerified: { type: DataTypes.BOOLEAN, defaultValue: false },
  emailVerificationToken: { type: DataTypes.STRING, allowNull: true },
  emailVerificationExpires: { type: DataTypes.DATE, allowNull: true },

  resetPasswordToken: { type: DataTypes.STRING, allowNull: true },
  resetPasswordExpires: { type: DataTypes.DATE, allowNull: true },

  googleId: { type: DataTypes.STRING, allowNull: true },
  provider: { type: DataTypes.ENUM('local', 'google'), defaultValue: 'local' },

  loginAttempts: { type: DataTypes.INTEGER, defaultValue: 0 },
  lockUntil: { type: DataTypes.DATE, allowNull: true },
});

module.exports = User;