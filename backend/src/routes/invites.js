const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { nowISO, hashPassword } = require('../utils/auth');
const Invite = require('../models/Invite');
const User = require('../models/User');
const Patient = require('../models/Patient');

const router = express.Router();

// Create invite (nutritionist only)
router.post('/', authenticateToken, requireRole('nutritionist'), async (req, res) => {
  try {
    const { email, expiresInHours } = req.body;
    
    if (!email) {
      return res.status(400).json({ detail: 'Email is required' });
    }

    // Check if user already exists
    let existingUser;
    if (global.isMemoryMode) {
      existingUser = await global.db.findUser({ email: email.toLowerCase() });
    } else {
      existingUser = await User.findOne({ email: email.toLowerCase() });
    }

    if (existingUser) {
      return res.status(400).json({ detail: 'User with this email already exists' });
    }

    const now = nowISO();
    const expiresAt = new Date(Date.now() + (expiresInHours || 24) * 60 * 60 * 1000).toISOString();
    
    const inviteData = {
      id: uuidv4(),
      token: uuidv4(),
      email: email.toLowerCase(),
      nutritionistId: req.user.id,
      status: 'active',
      expiresAt,
      createdAt: now,
      updatedAt: now
    };

    // Handle both MongoDB and memory store
    if (global.isMemoryMode) {
      await global.db.createInvite(inviteData);
    } else {
      const invite = new Invite(inviteData);
      await invite.save();
    }

    res.json(inviteData);
  } catch (error) {
    console.error('Create invite error:', error);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

// List invites (nutritionist only)
router.get('/', authenticateToken, requireRole('nutritionist'), async (req, res) => {
  try {
    const invites = await Invite.find({ nutritionistId: req.user.id }).select('-_id -__v');
    res.json(invites);
  } catch (error) {
    console.error('List invites error:', error);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

// Get invite by token (public)
router.get('/:token', async (req, res) => {
  try {
    const { token } = req.params;
    let invite;

    // Handle both MongoDB and memory store
    if (global.isMemoryMode) {
      invite = await global.db.findInvite({ token });
    } else {
      invite = await Invite.findOne({ token }).select('-_id -__v');
    }
    
    if (!invite) {
      return res.status(404).json({ detail: 'Invite not found' });
    }

    // Check if expired
    if (new Date() > new Date(invite.expiresAt)) {
      return res.status(400).json({ detail: 'Invite has expired' });
    }

    res.json(invite);
  } catch (error) {
    console.error('Get invite error:', error);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

// Accept invite (public)
router.post('/:token/accept', async (req, res) => {
  try {
    const { token } = req.params;
    const { name, password } = req.body;
    
    if (!name || !password) {
      return res.status(400).json({ detail: 'Name and password are required' });
    }

    let invite;
    if (global.isMemoryMode) {
      invite = await global.db.findInvite({ token });
    } else {
      invite = await Invite.findOne({ token });
    }
    
    if (!invite) {
      return res.status(404).json({ detail: 'Invite not found' });
    }

    if (invite.status !== 'active') {
      return res.status(400).json({ detail: 'Invite is no longer active' });
    }

    // Check if expired
    if (new Date() > new Date(invite.expiresAt)) {
      return res.status(400).json({ detail: 'Invite has expired' });
    }

    // Check if user already exists
    let existingUser;
    if (global.isMemoryMode) {
      existingUser = await global.db.findUser({ email: invite.email });
    } else {
      existingUser = await User.findOne({ email: invite.email });
    }

    if (existingUser) {
      return res.status(400).json({ detail: 'User with this email already exists' });
    }

    const now = nowISO();
    const hashedPassword = await hashPassword(password);
    
    // Create patient record first
    const patientData = {
      id: uuidv4(),
      ownerId: invite.nutritionistId,
      name,
      email: invite.email,
      createdAt: now,
      updatedAt: now
    };

    // Create user account
    const userData = {
      id: uuidv4(),
      role: 'patient',
      name,
      email: invite.email,
      passwordHash: hashedPassword,
      patientId: patientData.id,
      createdAt: now,
      updatedAt: now
    };

    // Handle both MongoDB and memory store
    if (global.isMemoryMode) {
      await global.db.createPatient(patientData);
      await global.db.createUser(userData);
      await global.db.updateInvite(invite.id, { status: 'used', updatedAt: now });
    } else {
      const patient = new Patient(patientData);
      await patient.save();

      const user = new User(userData);
      await user.save();

      await Invite.updateOne({ token }, { status: 'used', updatedAt: now });
    }

    res.json({
      id: userData.id,
      role: userData.role,
      name: userData.name,
      email: userData.email,
      patientId: userData.patientId
    });
  } catch (error) {
    console.error('Accept invite error:', error);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

// Revoke invite (nutritionist only)
router.post('/:inviteId/revoke', authenticateToken, requireRole('nutritionist'), async (req, res) => {
  try {
    const { inviteId } = req.params;
    const invite = await Invite.findOne({ id: inviteId });
    
    if (!invite) {
      return res.status(404).json({ detail: 'Invite not found' });
    }

    // Authorization check
    if (invite.nutritionistId !== req.user.id) {
      return res.status(403).json({ detail: 'Forbidden' });
    }

    await Invite.updateOne({ id: inviteId }, { status: 'revoked', updatedAt: nowISO() });

    res.json({ success: true });
  } catch (error) {
    console.error('Revoke invite error:', error);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

module.exports = router;