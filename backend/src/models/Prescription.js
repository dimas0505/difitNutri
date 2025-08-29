const mongoose = require('mongoose');

const prescriptionSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  patientId: {
    type: String,
    required: true
  },
  nutritionistId: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  status: {
    type: String,
    required: true,
    enum: ['draft', 'published']
  },
  meals: [{
    id: String,
    name: String,
    items: [{
      id: String,
      description: String,
      amount: String,
      substitutions: [String]
    }],
    notes: String
  }],
  generalNotes: {
    type: String,
    default: ''
  },
  publishedAt: {
    type: String,
    default: null
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
  collection: 'prescriptions'
});

module.exports = mongoose.model('Prescription', prescriptionSchema);