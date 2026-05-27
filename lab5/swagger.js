const swaggerJsdoc = require('swagger-jsdoc');
module.exports = swaggerJsdoc({
 definition: {
  openapi: '3.0.0',
  info: {
   title: 'Recipe API',
   version: '1.0.0',
   description: 'API documentation for laboratory work 5'
  },
  servers: [{ url: 'http://localhost:3000' }]
 },
 apis: ['./routes/*.js']
});
