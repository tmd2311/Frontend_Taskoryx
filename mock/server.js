const jsonServer = require('json-server');
const server = jsonServer.create();
const router = jsonServer.router('mock/db.json');
const middlewares = jsonServer.defaults();

server.use(middlewares);
server.use(jsonServer.bodyParser);

// Mock JWT token generator
function generateToken(user) {
  return `mock-jwt-token-${user.id}-${Date.now()}`;
}

// Mock response wrapper
function apiResponse(data, message = 'Success') {
  return {
    success: true,
    data: data,
    message: message
  };
}

// Custom routes for authentication
server.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const db = router.db; // Access lowdb instance
  const users = db.get('users').value();

  const user = users.find(u => u.username === username && u.password === password);

  if (user) {
    const { password, ...userWithoutPassword } = user;
    const token = generateToken(user);
    const refreshToken = `refresh-${token}`;

    res.status(200).json(apiResponse({
      token: token,
      refreshToken: refreshToken,
      user: userWithoutPassword
    }, 'Login successful'));
  } else {
    res.status(401).json({
      success: false,
      message: 'Invalid username or password'
    });
  }
});

// Register endpoint
server.post('/api/auth/register', (req, res) => {
  const { username, email, password, fullName } = req.body;
  const db = router.db;
  const users = db.get('users').value();

  // Check if user already exists
  const existingUser = users.find(u => u.username === username || u.email === email);

  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: 'Username or email already exists'
    });
  }

  // Create new user
  const newUser = {
    id: users.length + 1,
    username,
    email,
    password,
    fullName: fullName || username,
    avatar: '',
    role: 'user'
  };

  db.get('users').push(newUser).write();

  const { password: _, ...userWithoutPassword } = newUser;
  const token = generateToken(newUser);
  const refreshToken = `refresh-${token}`;

  res.status(201).json(apiResponse({
    token: token,
    refreshToken: refreshToken,
    user: userWithoutPassword
  }, 'Registration successful'));
});

// Logout endpoint
server.post('/api/auth/logout', (req, res) => {
  res.status(200).json(apiResponse(null, 'Logout successful'));
});

// Get current user endpoint
server.get('/api/auth/me', (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      success: false,
      message: 'No token provided'
    });
  }

  // Extract user id from mock token
  const token = authHeader.replace('Bearer ', '');
  const userId = parseInt(token.split('-')[3]);

  const db = router.db;
  const user = db.get('users').find({ id: userId }).value();

  if (user) {
    const { password, ...userWithoutPassword } = user;
    res.status(200).json(apiResponse(userWithoutPassword));
  } else {
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
});

// Refresh token endpoint
server.post('/api/auth/refresh', (req, res) => {
  const { refreshToken } = req.body;

  if (refreshToken && refreshToken.startsWith('refresh-')) {
    const newToken = refreshToken.replace('refresh-', '') + '-refreshed';
    res.status(200).json(apiResponse({
      token: newToken
    }, 'Token refreshed'));
  } else {
    res.status(401).json({
      success: false,
      message: 'Invalid refresh token'
    });
  }
});

// Wrap task responses in API response format
server.use('/api/tasks*', (req, res, next) => {
  const originalSend = res.json;
  res.json = function(data) {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      originalSend.call(this, apiResponse(data));
    } else {
      originalSend.call(this, data);
    }
  };
  next();
});

// Rewrite routes to add /api prefix
server.use(jsonServer.rewriter({
  '/api/tasks': '/tasks',
  '/api/tasks/:id': '/tasks/:id'
}));

// Use default router
server.use(router);

const PORT = 8080;
server.listen(PORT, () => {
  console.log(`\n🚀 Mock API Server is running on http://localhost:${PORT}`);
  console.log(`📚 API Base URL: http://localhost:${PORT}/api\n`);
  console.log('Available endpoints:');
  console.log('  POST   /api/auth/login');
  console.log('  POST   /api/auth/register');
  console.log('  POST   /api/auth/logout');
  console.log('  GET    /api/auth/me');
  console.log('  POST   /api/auth/refresh');
  console.log('  GET    /api/tasks');
  console.log('  GET    /api/tasks/:id');
  console.log('  POST   /api/tasks');
  console.log('  PUT    /api/tasks/:id');
  console.log('  DELETE /api/tasks/:id\n');
  console.log('Test credentials:');
  console.log('  Username: admin | Password: admin123');
  console.log('  Username: user  | Password: user123\n');
});
