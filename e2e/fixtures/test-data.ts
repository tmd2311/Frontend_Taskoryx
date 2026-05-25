// Test credentials — match your backend seed data
export const TEST_USERS = {
  admin: {
    email: 'admin@taskoryx.com',
    password: 'Admin@123456',
    fullName: 'Admin User',
  },
  manager: {
    email: 'manager@taskoryx.com',
    password: 'Manager@123456',
    fullName: 'Project Manager',
  },
  developer: {
    email: 'dev@taskoryx.com',
    password: 'Dev@123456',
    fullName: 'Developer User',
  },
  viewer: {
    email: 'viewer@taskoryx.com',
    password: 'Viewer@123456',
    fullName: 'Viewer User',
  },
};

export const TEST_PROJECT = {
  name: 'E2E Test Project',
  key: 'E2E',
  description: 'Automated E2E test project — do not edit manually',
};

export const TEST_TASK = {
  title: 'E2E Test Task',
  description: 'Task created by automated E2E tests',
  priority: 'HIGH',
};

export const TEST_SPRINT = {
  name: 'E2E Sprint 1',
  goal: 'Complete all E2E test stories',
};

export const AUTH_FILE = 'e2e/.auth/user.json';
export const ADMIN_AUTH_FILE = 'e2e/.auth/admin.json';
