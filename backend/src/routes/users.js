const express = require('express');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get current user profile
router.get('/me', authenticateToken, async (req, res) => {
  try {
    res.json({
      id: req.user.id,
      role: req.user.role,
      name: req.user.name,
      email: req.user.email,
      patientId: req.user.patientId
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

module.exports = router;