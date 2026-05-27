const User = require('./User');
const Recipe = require('./Recipe');

User.hasMany(Recipe, { foreignKey: 'userId', onDelete: 'CASCADE' });
Recipe.belongsTo(User, { foreignKey: 'userId' });

module.exports = { User, Recipe };
