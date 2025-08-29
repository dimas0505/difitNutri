const mongoose = require('mongoose');

const inviteSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  token: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true
  },
  nutritionistId: {
    type: String,
    required: true
  },
  status: {
    type: String,
    required: true,
    enum: ['active', 'used', 'revoked'],
    default: 'active'
  },
  expiresAt: {
    type: String,
    required: true
  },
  createdAt: {
    type: String,
    required: true
  },
  updatedAt: {
    type: String,
    required: true
  }
}, {
  collection: 'invites'
});

module.exports = mongoose.model('Invite', inviteSchema);