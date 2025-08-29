// In-memory data store for development/testing when MongoDB is not available
class MemoryStore {
  constructor() {
    this.users = [];
    this.patients = [];
    this.prescriptions = [];
    this.invites = [];
    this.isConnected = false;
  }

  async connect() {
    console.log('📦 Using in-memory storage (development mode)');
    this.isConnected = true;
    
    // Seed default nutritionist
    await this.seedDefaultUser();
    return this;
  }

  async seedDefaultUser() {
    const { hashPassword, nowISO } = require('../utils/auth');
    const { v4: uuidv4 } = require('uuid');
    
    const existingUser = this.users.find(u => u.email === 'pro@dinutri.app');
    if (existingUser) {
      console.log('✅ Default nutritionist already exists');
      return;
    }

    const hashedPassword = await hashPassword('password123');
    const now = nowISO();
    
    const userData = {
      id: uuidv4(),
      role: 'nutritionist',
      name: 'Pro Nutritionist',
      email: 'pro@dinutri.app',
      passwordHash: hashedPassword,
      createdAt: now,
      updatedAt: now
    };

    this.users.push(userData);
    console.log('✅ Default nutritionist created: pro@dinutri.app / password123');
  }

  // User operations
  async findUser(query) {
    return this.users.find(user => {
      if (query.id) return user.id === query.id;
      if (query.email) return user.email === query.email;
      return false;
    });
  }

  async createUser(userData) {
    this.users.push(userData);
    return userData;
  }

  // Patient operations
  async findPatients(query) {
    return this.patients.filter(patient => {
      if (query.ownerId) return patient.ownerId === query.ownerId;
      if (query.id) return patient.id === query.id;
      return true;
    });
  }

  async findPatient(query) {
    return this.patients.find(patient => {
      if (query.id) return patient.id === query.id;
      return false;
    });
  }

  async createPatient(patientData) {
    this.patients.push(patientData);
    return patientData;
  }

  async updatePatient(id, updateData) {
    const patientIndex = this.patients.findIndex(p => p.id === id);
    if (patientIndex >= 0) {
      this.patients[patientIndex] = { ...this.patients[patientIndex], ...updateData };
      return this.patients[patientIndex];
    }
    return null;
  }

  // Prescription operations
  async findPrescriptions(query) {
    return this.prescriptions.filter(prescription => {
      if (query.patientId) return prescription.patientId === query.patientId;
      if (query.nutritionistId) return prescription.nutritionistId === query.nutritionistId;
      if (query.id) return prescription.id === query.id;
      if (query.status) return prescription.status === query.status;
      return true;
    });
  }

  async findPrescription(query) {
    return this.prescriptions.find(prescription => {
      if (query.id) return prescription.id === query.id;
      return false;
    });
  }

  async findLatestPrescription(patientId, status = 'published') {
    const prescriptions = this.prescriptions
      .filter(p => p.patientId === patientId && p.status === status)
      .sort((a, b) => new Date(b.publishedAt || b.createdAt) - new Date(a.publishedAt || a.createdAt));
    
    return prescriptions[0] || null;
  }

  async createPrescription(prescriptionData) {
    this.prescriptions.push(prescriptionData);
    return prescriptionData;
  }

  async updatePrescription(id, updateData) {
    const prescriptionIndex = this.prescriptions.findIndex(p => p.id === id);
    if (prescriptionIndex >= 0) {
      this.prescriptions[prescriptionIndex] = { ...this.prescriptions[prescriptionIndex], ...updateData };
      return this.prescriptions[prescriptionIndex];
    }
    return null;
  }

  // Invite operations
  async findInvites(query) {
    return this.invites.filter(invite => {
      if (query.nutritionistId) return invite.nutritionistId === query.nutritionistId;
      if (query.token) return invite.token === query.token;
      if (query.id) return invite.id === query.id;
      return true;
    });
  }

  async findInvite(query) {
    return this.invites.find(invite => {
      if (query.token) return invite.token === query.token;
      if (query.id) return invite.id === query.id;
      return false;
    });
  }

  async createInvite(inviteData) {
    this.invites.push(inviteData);
    return inviteData;
  }

  async updateInvite(id, updateData) {
    const inviteIndex = this.invites.findIndex(i => i.id === id);
    if (inviteIndex >= 0) {
      this.invites[inviteIndex] = { ...this.invites[inviteIndex], ...updateData };
      return this.invites[inviteIndex];
    }
    return null;
  }
}

module.exports = MemoryStore;