/// <reference types="jest" />
jest.setTimeout(60000);
import sequelize from '../config/database.js';
import { User, Patient, PatientFlow, EHRRecord, Prescription, Inventory } from '../models/index.js';
import { QueueService } from '../utils/QueueService.js';
import { PharmacyService } from '../utils/PharmacyService.js';
import { encryptText, decryptText } from '../utils/crypto.js';
import { hashPassword } from '../utils/authUtils.js';

describe('Healthcare Ecosystem Integration Tests', () => {
  let testDoctor: any;
  let testPatient: any;

  beforeAll(async () => {
    // Force sync database to a fresh state for testing
    await sequelize.sync({ force: true });

    // Seed test doctor
    testDoctor = await User.create({
      name: 'Test Doctor',
      email: 'doctor_test@telemed.com',
      password_hash: await hashPassword('password123'),
      role: 'doctor'
    });

    // Seed test patient user
    const patientUser = await User.create({
      name: 'Test Patient',
      email: 'patient_test@telemed.com',
      password_hash: await hashPassword('password123'),
      role: 'patient'
    });

    testPatient = await Patient.create({
      user_id: patientUser.id,
      national_id: 'PT-999',
      date_of_birth: new Date('1995-05-05')
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('1. Encryption & Decryption', () => {
    test('Should encrypt and decrypt text consistently', () => {
      const plainText = 'Patient exhibits symptoms of mild fever.';
      const { iv, encryptedData } = encryptText(plainText);

      expect(encryptedData).not.toBe(plainText);
      expect(iv).toBeDefined();

      const decrypted = decryptText(encryptedData, iv);
      expect(decrypted).toBe(plainText);
    });

    test('Transparent EHRRecord Encryption Hooks', async () => {
      const noteText = 'Highly confidential doctor consultation note.';
      
      const record = await EHRRecord.create({
        patient_id: testPatient.id,
        record_type: 'consultation',
        created_by: testDoctor.id,
        content: noteText
      } as any);

      // Verify that plain text is NOT stored directly in the database
      const rawRecord: any = await EHRRecord.findByPk(record.id);
      expect(rawRecord.encrypted_content).not.toBe(noteText);
      expect(rawRecord.iv).toBeDefined();

      // Retrieve via Sequelize and check if decrypted transparently via afterFind hook
      const retrievedRecord: any = await EHRRecord.findByPk(record.id);
      expect(retrievedRecord.content).toBe(noteText);
    });
  });

  describe('2. Queue State Machine Transitions', () => {
    let patientId: string;

    beforeAll(() => {
      patientId = testPatient.id;
    });

    test('Should transition successfully through valid flow states', async () => {
      // Initial bootstrap to AWAITING_TRIAGE
      await QueueService.advanceState(patientId, 'AWAITING_TRIAGE');
      let flow: any = await PatientFlow.findOne({ where: { patient_id: patientId } });
      expect(flow.current_state).toBe('AWAITING_TRIAGE');

      // Triage to Doctor
      await QueueService.advanceState(patientId, 'AWAITING_DOCTOR');
      flow = await PatientFlow.findOne({ where: { patient_id: patientId } });
      expect(flow.current_state).toBe('AWAITING_DOCTOR');

      // Doctor to Pharmacy
      await QueueService.advanceState(patientId, 'AWAITING_PHARMACY');
      flow = await PatientFlow.findOne({ where: { patient_id: patientId } });
      expect(flow.current_state).toBe('AWAITING_PHARMACY');

      // Pharmacy to Discharged
      await QueueService.advanceState(patientId, 'DISCHARGED');
      flow = await PatientFlow.findOne({ where: { patient_id: patientId } });
      expect(flow.current_state).toBe('DISCHARGED');
    });

    test('Should throw error on invalid transitions', async () => {
      // Current state is DISCHARGED (from previous test), DISCHARGED has only AWAITING_TRIAGE as allowed
      await expect(
        QueueService.advanceState(patientId, 'AWAITING_DOCTOR')
      ).rejects.toThrow();
    });
  });

  describe('3. Tele-Pharmacy Transactions', () => {
    let doctorId: string;
    let patientId: string;
    let pharmacistId: string;
    let inventoryItemId: string;

    beforeAll(async () => {
      doctorId = testDoctor.id;
      patientId = testPatient.id;

      // Reset PatientFlow to AWAITING_DOCTOR to allow valid transition to AWAITING_PHARMACY
      const flow = await PatientFlow.findOne({ where: { patient_id: patientId } });
      if (flow) {
        flow.current_state = 'AWAITING_DOCTOR';
        await flow.save();
      }

      const pharmacistUser = await User.create({
        name: 'Test Pharmacist',
        email: 'pharmacist_test@telemed.com',
        password_hash: await hashPassword('password123'),
        role: 'pharmacist'
      });
      pharmacistId = pharmacistUser.id;

      // Seed Inventory
      const inv: any = await Inventory.create({
        drug_name: 'Paracetamol 500mg',
        quantity: 5,
        unit: 'Tablets',
        expiry_date: new Date('2028-12-31')
      });
      inventoryItemId = inv.id;
    });

    test('Should atomically create prescription and advance queue to AWAITING_PHARMACY', async () => {
      const prescription = await PharmacyService.issuePrescription(
        patientId,
        doctorId,
        'Paracetamol 500mg',
        '1 tablet',
        'Three times daily',
        '5 days',
        'Oral'
      );

      expect(prescription.status).toBe('issued');

      // Verify patient queue state advanced to AWAITING_PHARMACY
      const flow: any = await PatientFlow.findOne({ where: { patient_id: patientId } });
      expect(flow.current_state).toBe('AWAITING_PHARMACY');
    });

    test('Should atomically dispense prescription, decrement stock, and advance state to AWAITING_DOCTOR_REVIEW', async () => {
      const prescription = await Prescription.findOne({ where: { patient_id: patientId, status: 'issued' } });
      
      const dispensed = await PharmacyService.dispensePrescription(prescription!.id, pharmacistId);
      expect(dispensed.status).toBe('dispensed');

      // Verify stock decremented
      const inv: any = await Inventory.findByPk(inventoryItemId);
      expect(inv.quantity).toBe(4);

      // Verify queue advanced to AWAITING_DOCTOR_REVIEW
      const flow: any = await PatientFlow.findOne({ where: { patient_id: patientId } });
      expect(flow.current_state).toBe('AWAITING_DOCTOR_REVIEW');
    });

    test('Should reject dispensing when stock is zero', async () => {
      // Set stock to 0
      const inv: any = await Inventory.findByPk(inventoryItemId);
      inv.quantity = 0;
      await inv.save();

      // Put state back to AWAITING_DOCTOR to allow next pharmacy issuance
      const flow = await PatientFlow.findOne({ where: { patient_id: patientId } });
      flow!.current_state = 'AWAITING_DOCTOR';
      await flow!.save();

      // Issue another prescription
      const prescription = await PharmacyService.issuePrescription(
        patientId,
        doctorId,
        'Paracetamol 500mg',
        '1 tablet',
        'Daily',
        '3 days',
        'Oral'
      );

      // Attempt dispensing
      await expect(
        PharmacyService.dispensePrescription(prescription.id, pharmacistId)
      ).rejects.toThrow('Insufficient inventory stock');
    });
  });
});
