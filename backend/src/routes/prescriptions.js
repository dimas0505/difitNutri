const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { nowISO } = require('../utils/auth');
const Prescription = require('../models/Prescription');
const Patient = require('../models/Patient');

const router = express.Router();

// Create prescription (nutritionist only)
router.post('/', authenticateToken, requireRole('nutritionist'), async (req, res) => {
  try {
    const { patientId, title, status, meals, generalNotes } = req.body;
    
    if (!patientId || !title) {
      return res.status(400).json({ detail: 'PatientId and title are required' });
    }

    // Verify patient exists and belongs to nutritionist
    const patient = await Patient.findOne({ id: patientId, ownerId: req.user.id });
    if (!patient) {
      return res.status(404).json({ detail: 'Patient not found' });
    }

    const now = nowISO();
    const prescriptionData = {
      id: uuidv4(),
      patientId,
      nutritionistId: req.user.id,
      title,
      status: status || 'draft',
      meals: meals || [],
      generalNotes: generalNotes || '',
      publishedAt: status === 'published' ? now : null,
      createdAt: now,
      updatedAt: now
    };

    const prescription = new Prescription(prescriptionData);
    await prescription.save();

    res.json(prescriptionData);
  } catch (error) {
    console.error('Create prescription error:', error);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

// List prescriptions for a patient (nutritionist only)
router.get('/', authenticateToken, requireRole('nutritionist'), async (req, res) => {
  try {
    const { patientId } = req.query;
    
    if (!patientId) {
      return res.status(400).json({ detail: 'PatientId query parameter is required' });
    }

    // Verify patient belongs to nutritionist
    const patient = await Patient.findOne({ id: patientId, ownerId: req.user.id });
    if (!patient) {
      return res.status(404).json({ detail: 'Patient not found' });
    }

    const prescriptions = await Prescription.find({ 
      patientId,
      nutritionistId: req.user.id 
    }).select('-_id -__v');
    
    res.json(prescriptions);
  } catch (error) {
    console.error('List prescriptions error:', error);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

// Get specific prescription
router.get('/:prescriptionId', authenticateToken, async (req, res) => {
  try {
    const { prescriptionId } = req.params;
    const prescription = await Prescription.findOne({ id: prescriptionId }).select('-_id -__v');
    
    if (!prescription) {
      return res.status(404).json({ detail: 'Prescription not found' });
    }

    // Authorization check
    if (req.user.role === 'nutritionist' && prescription.nutritionistId !== req.user.id) {
      return res.status(403).json({ detail: 'Forbidden' });
    } else if (req.user.role === 'patient') {
      // Patient can only access published prescriptions for their own patient record
      const patient = await Patient.findOne({ id: prescription.patientId });
      if (!patient || req.user.patientId !== prescription.patientId || prescription.status !== 'published') {
        return res.status(403).json({ detail: 'Forbidden' });
      }
    }

    res.json(prescription);
  } catch (error) {
    console.error('Get prescription error:', error);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

// Update prescription (nutritionist only)
router.put('/:prescriptionId', authenticateToken, requireRole('nutritionist'), async (req, res) => {
  try {
    const { prescriptionId } = req.params;
    const { title, status, meals, generalNotes } = req.body;
    
    const prescription = await Prescription.findOne({ id: prescriptionId });
    
    if (!prescription) {
      return res.status(404).json({ detail: 'Prescription not found' });
    }

    // Authorization check
    if (prescription.nutritionistId !== req.user.id) {
      return res.status(403).json({ detail: 'Forbidden' });
    }

    const now = nowISO();
    const updateData = {
      ...(title && { title }),
      ...(status && { status }),
      ...(meals && { meals }),
      ...(generalNotes !== undefined && { generalNotes }),
      updatedAt: now
    };

    // Set publishedAt if status is being changed to published
    if (status === 'published' && prescription.status !== 'published') {
      updateData.publishedAt = now;
    }

    await Prescription.updateOne({ id: prescriptionId }, updateData);
    
    const updatedPrescription = await Prescription.findOne({ id: prescriptionId }).select('-_id -__v');
    res.json(updatedPrescription);
  } catch (error) {
    console.error('Update prescription error:', error);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

// Duplicate prescription (nutritionist only)
router.post('/:prescriptionId/duplicate', authenticateToken, requireRole('nutritionist'), async (req, res) => {
  try {
    const { prescriptionId } = req.params;
    const prescription = await Prescription.findOne({ id: prescriptionId });
    
    if (!prescription) {
      return res.status(404).json({ detail: 'Prescription not found' });
    }

    // Authorization check
    if (prescription.nutritionistId !== req.user.id) {
      return res.status(403).json({ detail: 'Forbidden' });
    }

    const now = nowISO();
    const duplicatedData = {
      id: uuidv4(),
      patientId: prescription.patientId,
      nutritionistId: prescription.nutritionistId,
      title: prescription.title,
      status: 'draft',
      meals: prescription.meals,
      generalNotes: prescription.generalNotes,
      publishedAt: null,
      createdAt: now,
      updatedAt: now
    };

    const duplicatedPrescription = new Prescription(duplicatedData);
    await duplicatedPrescription.save();

    res.json(duplicatedData);
  } catch (error) {
    console.error('Duplicate prescription error:', error);
    res.status(500).json({ detail: 'Internal server error' });
  }
});

module.exports = router;