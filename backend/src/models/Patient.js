const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  ownerId: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  email: {
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
  collection: 'patients'
});

module.exports = mongoose.model('Patient', patientSchema);