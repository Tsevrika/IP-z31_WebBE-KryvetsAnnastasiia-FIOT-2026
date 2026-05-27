const sequelize = require('../config/database');
const User = require('./User');
const Recipe = require('./Recipe');
const RefreshToken = require('./RefreshToken');

User.hasMany(Recipe, { foreignKey: 'userId', onDelete: 'CASCADE' });
Recipe.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(RefreshToken, { foreignKey: 'userId', onDelete: 'CASCADE' });
RefreshToken.belongsTo(User, { foreignKey: 'userId' });

module.exports = { sequelize, User, Recipe, RefreshToken };
