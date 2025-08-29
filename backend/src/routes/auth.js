const express = require('express');
const jwt = require('jsonwebtoken');
const { verifyPassword } = require('../utils/auth');
const User = require('../models/User');

const router = express.Router();

// Login endpoint - expects form data like the Python version
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ detail: 'Username and password required' });
    }

    const email = username.toLowerCase();
    let user;

    // Handle both MongoDB and memory store
    if (global.isMemoryMode) {
      user = await global.db.findUser({ email });
    } else {
      user = await User.findOne({ email });
    }
    
    if (!user) {
      return res.status(400).json({ detail: 'Invalid credentials' });
    }

    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(400).json({ detail: 'Invalid credentials' });
    }

    // Create JWT token
    const token = jwt.sign(
      { 
        sub: user.id,
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      access_token: token,
      token_type: 'bearer'
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

module.exports = router;