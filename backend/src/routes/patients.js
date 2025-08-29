const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { nowISO } = require('../utils/auth');
const Patient = require('../models/Patient');
const Prescription = require('../models/Prescription');

const router = express.Router();

// Create patient (nutritionist only)
router.post('/', authenticateToken, requireRole('nutritionist'), async (req, res) => {
  try {
    const { name, email } = req.body;
    
    if (!name || !email) {
      return res.status(400).json({ detail: 'Name and email are required' });
    }

    const now = nowISO();
    const patientData = {
      id: uuidv4(),
      ownerId: req.user.id,
      name,
      email: email.toLowerCase(),
      createdAt: now,
      updatedAt: now
    };

    // Handle both MongoDB and memory store
    if (global.isMemoryMode) {
      await global.db.createPatient(patientData);
    } else {
      const patient = new Patient(patientData);
      await patient.save();
    }

    res.json(patientData);
  } catch (error) {
    console.error('Create patient error:', error);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

// List patients (nutritionist only)
router.get('/', authenticateToken, requireRole('nutritionist'), async (req, res) => {
  try {
    let patients;
    
    // Handle both MongoDB and memory store
    if (global.isMemoryMode) {
      patients = await global.db.findPatients({ ownerId: req.user.id });
    } else {
      patients = await Patient.find({ ownerId: req.user.id }).select('-_id -__v');
    }
    
    res.json(patients);
  } catch (error) {
    console.error('List patients error:', error);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

// Get specific patient
router.get('/:patientId', authenticateToken, async (req, res) => {
  try {
    const { patientId } = req.params;
    let patient;

    // Handle both MongoDB and memory store
    if (global.isMemoryMode) {
      patient = await global.db.findPatient({ id: patientId });
    } else {
      patient = await Patient.findOne({ id: patientId }).select('-_id -__v');
    }
    
    if (!patient) {
      return res.status(404).json({ detail: 'Patient not found' });
    }

    // Authorization check
    if (req.user.role === 'nutritionist' && patient.ownerId !== req.user.id) {
      return res.status(403).json({ detail: 'Forbidden' });
    } else if (req.user.role === 'patient' && req.user.patientId !== patientId) {
      return res.status(403).json({ detail: 'Forbidden' });
    }

    res.json(patient);
  } catch (error) {
    console.error('Get patient error:', error);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

// Update patient (nutritionist only)
router.put('/:patientId', authenticateToken, requireRole('nutritionist'), async (req, res) => {
  try {
    const { patientId } = req.params;
    const { name, email } = req.body;
    
    const patient = await Patient.findOne({ id: patientId });
    
    if (!patient) {
      return res.status(404).json({ detail: 'Patient not found' });
    }

    // Authorization check
    if (patient.ownerId !== req.user.id) {
      return res.status(403).json({ detail: 'Forbidden' });
    }

    const updateData = {
      ...(name && { name }),
      ...(email && { email: email.toLowerCase() }),
      updatedAt: nowISO()
    };

    await Patient.updateOne({ id: patientId }, updateData);
    
    const updatedPatient = await Patient.findOne({ id: patientId }).select('-_id -__v');
    res.json(updatedPatient);
  } catch (error) {
    console.error('Update patient error:', error);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

// Get latest prescription for patient
router.get('/:patientId/latest', authenticateToken, async (req, res) => {
  try {
    const { patientId } = req.params;
    
    // Verify patient exists and user has access
    let patient;
    if (global.isMemoryMode) {
      patient = await global.db.findPatient({ id: patientId });
    } else {
      patient = await Patient.findOne({ id: patientId });
    }

    if (!patient) {
      return res.status(404).json({ detail: 'Patient not found' });
    }

    // Authorization check
    if (req.user.role === 'nutritionist' && patient.ownerId !== req.user.id) {
      return res.status(403).json({ detail: 'Forbidden' });
    } else if (req.user.role === 'patient' && req.user.patientId !== patientId) {
      return res.status(403).json({ detail: 'Forbidden' });
    }

    // Find latest published prescription
    let prescription;
    if (global.isMemoryMode) {
      prescription = await global.db.findLatestPrescription(patientId, 'published');
    } else {
      prescription = await Prescription.findOne({ 
        patientId, 
        status: 'published' 
      })
      .sort({ publishedAt: -1 })
      .select('-_id -__v');
    }

    res.json(prescription);
  } catch (error) {
    console.error('Get latest prescription error:', error);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

module.exports = router;