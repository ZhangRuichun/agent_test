import { describe, it, expect, beforeEach } from 'vitest';
import express from 'express';
import { setupAuth } from '../auth';
import request from 'supertest';
import { db } from '../../db';
import { users } from '../../db/schema';

const app = express();
app.use(express.json());
setupAuth(app);

describe('Authentication API', () => {
  beforeEach(async () => {
    // Clear users table before each test
    await db.delete(users);
  });

  describe('POST /api/register', () => {
    it('should register a new user successfully', async () => {
      const res = await request(app)
        .post('/api/register')
        .send({
          username: 'test@example.com',
          password: 'password123'
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'Registration successful');
      expect(res.body.user).toHaveProperty('username', 'test@example.com');
      expect(res.body.user).not.toHaveProperty('password');
    });

    it('should not allow duplicate usernames', async () => {
      // First registration
      await request(app)
        .post('/api/register')
        .send({
          username: 'test@example.com',
          password: 'password123'
        });

      // Attempt duplicate registration
      const res = await request(app)
        .post('/api/register')
        .send({
          username: 'test@example.com',
          password: 'different123'
        });

      expect(res.status).toBe(400);
      expect(res.text).toBe('Email already exists');
    });
  });

  describe('POST /api/login', () => {
    beforeEach(async () => {
      // Create a test user before each login test
      await request(app)
        .post('/api/register')
        .send({
          username: 'test@example.com',
          password: 'password123'
        });
    });

    it('should login successfully with correct credentials', async () => {
      const res = await request(app)
        .post('/api/login')
        .send({
          username: 'test@example.com',
          password: 'password123'
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'Login successful');
      expect(res.body.user).toHaveProperty('username', 'test@example.com');
    });

    it('should fail with incorrect password', async () => {
      const res = await request(app)
        .post('/api/login')
        .send({
          username: 'test@example.com',
          password: 'wrongpassword'
        });

      expect(res.status).toBe(400);
      expect(res.text).toBe('Incorrect password.');
    });

    it('should fail with non-existent user', async () => {
      const res = await request(app)
        .post('/api/login')
        .send({
          username: 'nonexistent@example.com',
          password: 'password123'
        });

      expect(res.status).toBe(400);
      expect(res.text).toBe('Incorrect email.');
    });
  });

  describe('GET /api/user', () => {
    it('should return 401 when not authenticated', async () => {
      const res = await request(app).get('/api/user');
      expect(res.status).toBe(401);
      expect(res.text).toBe('Not logged in');
    });
  });
});