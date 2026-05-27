const request = require('supertest');
const express = require('express');

describe('API testing', () => {
  test('GET /api/health', async () => {
    const app = express();
    app.get('/api/health', (req, res) => res.json({ message: 'Backend працює' }));

    const response = await request(app).get('/api/health');
    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe('Backend працює');
  });
});
