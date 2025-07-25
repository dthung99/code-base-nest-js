// test/auth.e2e-spec.ts
import { INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import {
  ACCESS_TOKEN_COOKIE_NAME,
  REFRESH_TOKEN_COOKIE_NAME,
} from 'src/common/constants/cookie-names.constant';
import { Action, Privilege } from 'src/common/enums/permission.enum';
import { PermissionsService } from 'src/modules/permissions/services/permissions.service';
import { RolesService } from 'src/modules/roles/services/roles.service';
import * as request from 'supertest';
import { testINestApp } from 'test/setup/test-setup';
import { normalizeCookies } from 'test/utils/test-helpers';

describe('Auth & Users (e2e)', () => {
  let app: INestApplication;
  let moduleFixture: TestingModule;
  let permissionsService: PermissionsService;
  let rolesService: RolesService;

  // Test data
  let userPermissionId: string;
  let adminRoleId: string;
  let regularUserData: {
    email: string;
    password: string;
  };
  let adminUserData: {
    email: string;
    password: string;
    roleIds: string[];
  };

  beforeAll(async () => {
    app = testINestApp.getApp();
    moduleFixture = testINestApp.getModuleFixture();
    permissionsService =
      moduleFixture.get<PermissionsService>(PermissionsService);
    rolesService = moduleFixture.get<RolesService>(RolesService);

    return;
  });

  beforeEach(async () => {
    // Create test permissions and roles
    const userPermission = await permissionsService.create({
      privilege: Privilege.USER,
      action: Action.READ,
    });
    userPermissionId = userPermission._id.toString();

    const adminRole = await rolesService.create({
      roleName: 'Admin',
      permissionIds: [userPermissionId],
    });
    adminRoleId = adminRole._id.toString();

    // Test user data
    regularUserData = {
      email: 'regular@example.com',
      password: 'password123',
    };

    adminUserData = {
      email: 'admin@example.com',
      password: 'password123',
      roleIds: [adminRoleId],
    };
  });

  afterEach(async () => {
    await testINestApp.clearTestDatabase();
  });

  afterAll(async () => {
    // Template
    return;
  });

  describe('/api/users (POST)', () => {
    it('should create a new user successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/users')
        .send(regularUserData)
        .expect(201);

      expect(response.body).toMatchObject({
        statusCode: 201,
        timestamp: expect.any(String),
        data: {
          _id: expect.any(String),
          email: regularUserData.email,
          roles: [],
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        },
      });

      // Password should not be returned
      expect(response.body?.data?.hashPassword).toBeUndefined();
      expect(response.body?.data?.password).toBeUndefined();
    });

    it('should create a user with roles', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/users')
        .send(adminUserData)
        .expect(201);

      expect(response.body?.data?.roles).toEqual([adminRoleId]);
    });

    it('should return 400 for invalid email', async () => {
      const invalidUserData = {
        email: 'invalid-email',
        password: 'password123',
      };

      await request(app.getHttpServer())
        .post('/api/users')
        .send(invalidUserData)
        .expect(400);
    });

    it('should return 400 for short password', async () => {
      const invalidUserData = {
        email: 'test@example.com',
        password: '123',
      };

      await request(app.getHttpServer())
        .post('/api/users')
        .send(invalidUserData)
        .expect(400);
    });

    it('should return 400 for duplicate email', async () => {
      // Create first user
      await request(app.getHttpServer())
        .post('/api/users')
        .send(regularUserData)
        .expect(201);

      // Try to create second user with same email
      await request(app.getHttpServer())
        .post('/api/users')
        .send(regularUserData)
        .expect(400);
    });

    it('should return 400 for invalid role IDs', async () => {
      const userWithInvalidRole = {
        email: 'test@example.com',
        password: 'password123',
        roleIds: ['invalid-role-id'],
      };

      await request(app.getHttpServer())
        .post('/api/users')
        .send(userWithInvalidRole)
        .expect(400);
    });
  });

  describe('/api/auth/login (POST)', () => {
    beforeEach(async () => {
      // Create a user for login tests
      await request(app.getHttpServer())
        .post('/api/users')
        .send(adminUserData)
        .expect(201);
    });

    it('should login successfully with valid credentials', async () => {
      const loginData = {
        email: adminUserData.email,
        password: adminUserData.password,
      };

      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body).toMatchObject({
        statusCode: 200,
        timestamp: expect.any(String),
        data: {
          accessToken: expect.any(String),
          refreshToken: expect.any(String),
          accessTokenExpiresAt: expect.any(String),
          refreshTokenExpiresAt: expect.any(String),
        },
      });

      // Handle both string and string[] cases
      const cookies = normalizeCookies(response.headers['set-cookie']);

      expect(cookies).toBeDefined();
      expect(
        cookies.some((cookie: string) =>
          cookie.includes(ACCESS_TOKEN_COOKIE_NAME),
        ),
      ).toBe(true);
      expect(
        cookies.some((cookie: string) =>
          cookie.includes(REFRESH_TOKEN_COOKIE_NAME),
        ),
      ).toBe(true);
    });

    it('should return 401 for invalid email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: adminUserData.password,
      };

      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);
    });

    it('should return 401 for invalid password', async () => {
      const loginData = {
        email: adminUserData.email,
        password: 'wrongpassword',
      };

      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);
    });

    it('should return 401 for missing credentials', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({})
        .expect(401);
    });

    it('should return 400 for invalid email format', async () => {
      const loginData = {
        email: 'invalid-email',
        password: 'password123',
      };

      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);
    });
  });

  describe('/api/auth/refresh (POST)', () => {
    let refreshToken: string;

    beforeEach(async () => {
      // Create user and login to get refresh token
      await request(app.getHttpServer())
        .post('/api/users')
        .send(adminUserData)
        .expect(201);

      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: adminUserData.email,
          password: adminUserData.password,
        })
        .expect(200);

      refreshToken = loginResponse.body?.data?.refreshToken;
    });

    it('should refresh token successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body).toMatchObject({
        statusCode: 200,
        data: {
          accessToken: expect.any(String),
          refreshToken: expect.any(String),
          accessTokenExpiresAt: expect.any(String),
          refreshTokenExpiresAt: expect.any(String),
        },
      });
    });

    it('should return 401 for invalid refresh token', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);
    });

    it('should return 401 for missing refresh token', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({})
        .expect(401);
    });
  });

  describe('/api/auth/logout (POST)', () => {
    it('should logout successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/logout')
        .expect(200);

      // Check that cookies are cleared
      const cookies = normalizeCookies(response.headers['set-cookie']);
      expect(
        cookies.some(
          (cookie: string) =>
            cookie.includes(ACCESS_TOKEN_COOKIE_NAME) ||
            cookie.includes(REFRESH_TOKEN_COOKIE_NAME),
        ),
      ).toBe(true);
    });
  });

  describe('Integration: User creation -> Login -> Access protected resource', () => {
    it('should create user, login, and access protected endpoint', async () => {
      // 1. Create user
      await request(app.getHttpServer())
        .post('/api/users')
        .send(adminUserData)
        .expect(201);

      // 2. Login
      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: adminUserData.email,
          password: adminUserData.password,
        })
        .expect(200);

      const accessToken = loginResponse.body?.data?.accessToken;

      // 3. Access protected resource (get user details)
      await request(app.getHttpServer()).get(`/api/users`).expect(401);

      // 4. Access protected resource (get user details)
      await request(app.getHttpServer())
        .get(`/api/users`)
        .set('Cookie', [`${ACCESS_TOKEN_COOKIE_NAME}=${accessToken}`])
        .expect(200);
    });
  });
});
