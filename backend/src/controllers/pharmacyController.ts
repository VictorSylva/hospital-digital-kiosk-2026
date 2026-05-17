import { Request, Response } from 'express';
import { Prescription, Inventory, Patient, User } from '../models/index.js';
import { PharmacyService } from '../utils/PharmacyService.js';
import sequelize from '../config/database.js';

interface AuthenticatedRequest extends Request {
  user?: any;
  auditLog?: (userId: string, action: string, tableName: string, recordId: string, ip: string) => Promise<void>;
  clientIp?: string;
}

// Issue prescription
export const issuePrescription = async (req: any, res: Response): Promise<void> => {
  try {
    const { patient_id, drug_name, dosage, frequency, duration, route } = req.body;

    if (!patient_id || !drug_name || !dosage || !frequency || !duration || !route) {
      res.status(400).json({ error: 'All fields required' });
      return;
    }

    // Resolve Patient ID (UUID vs Kiosk ID / Email)
    let targetPatientId: string | null = null;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(patient_id);

    if (isUuid) {
      let patient = await Patient.findByPk(patient_id);
      if (patient) {
        targetPatientId = patient.id;
      } else {
        patient = await Patient.findOne({ where: { user_id: patient_id } });
        if (patient) {
          targetPatientId = patient.id;
        }
      }
    } else {
      let patient = await Patient.findOne({ where: { national_id: patient_id } });
      if (patient) {
        targetPatientId = patient.id;
      } else {
        const user = await User.findOne({ where: { email: patient_id } });
        if (user) {
          patient = await Patient.findOne({ where: { user_id: user.id } });
          if (patient) {
            targetPatientId = patient.id;
          }
        }
      }
    }

    if (!targetPatientId) {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }

    const doctorId = req.user.userId || req.user.id;
    const prescription = await PharmacyService.issuePrescription(
      targetPatientId,
      doctorId,
      drug_name,
      dosage,
      frequency,
      duration,
      route
    );

    if (req.user && req.auditLog) {
      await req.auditLog(req.user.id || req.user.userId, 'prescription_issued', 'prescriptions', prescription.id, req.clientIp || '');
    }

    res.status(201).json({ prescription });
  } catch (error) {
    console.error('Issue prescription error:', error);
    res.status(500).json({ error: error.message || 'Failed to issue prescription' });
  }
};

// Get pending prescriptions (pharmacist worklist)
export const getPendingPrescriptions = async (req: any, res: Response): Promise<void> => {
  try {
    const prescriptions: any[] = await Prescription.findAll({
      where: { status: ['issued', 'pending_review', 'flagged'] },
      include: [
        { model: Patient, include: [{ model: User }] },
        { model: User, as: 'doctor' }
      ],
      order: [['issued_at', 'ASC']]
    });

    res.json({ 
      prescriptions,
      pending: prescriptions
    });
  } catch (error) {
    console.error('Get prescriptions error:', error);
    res.status(500).json({ error: 'Failed to retrieve prescriptions' });
  }
};

// Approve prescription
export const approvePrescription = async (req: any, res: Response): Promise<void> => {
  try {
    const { prescription_id } = req.body;

    const prescription: any = await Prescription.findByPk(prescription_id);
    if (!prescription) {
      res.status(404).json({ error: 'Prescription not found' });
      return;
    }

    prescription.status = 'approved';
    prescription.pharmacist_id = req.user.userId || req.user.id;
    await prescription.save();

    if (req.user && req.auditLog) {
      await req.auditLog(req.user.id || req.user.userId, 'prescription_approved', 'prescriptions', prescription_id, req.clientIp || '');
    }

    res.json({ prescription });
  } catch (error) {
    console.error('Approve prescription error:', error);
    res.status(500).json({ error: 'Failed to approve prescription' });
  }
};

// Reject prescription
export const rejectPrescription = async (req: any, res: Response): Promise<void> => {
  try {
    const { prescription_id, reason } = req.body;

    if (!prescription_id || !reason) {
      res.status(400).json({ error: 'Prescription ID and reason required' });
      return;
    }

    const prescription: any = await Prescription.findByPk(prescription_id);
    if (!prescription) {
      res.status(404).json({ error: 'Prescription not found' });
      return;
    }

    prescription.status = 'rejected';
    prescription.rejection_reason = reason;
    prescription.pharmacist_id = req.user.userId || req.user.id;
    await prescription.save();

    if (req.user && req.auditLog) {
      await req.auditLog(req.user.id || req.user.userId, 'prescription_rejected', 'prescriptions', prescription_id, req.clientIp || '');
    }

    res.json({ prescription });
  } catch (error) {
    console.error('Reject prescription error:', error);
    res.status(500).json({ error: 'Failed to reject prescription' });
  }
};

// Dispense prescription
export const dispensePrescription = async (req: any, res: Response): Promise<void> => {
  try {
    const prescriptionId = req.params.id || req.body.prescription_id || req.body.prescriptionId;

    if (!prescriptionId) {
      res.status(400).json({ error: 'Prescription ID required' });
      return;
    }

    const pharmacistId = req.user?.userId || req.user?.id;
    const prescription = await PharmacyService.dispensePrescription(prescriptionId, pharmacistId);

    if (req.user && req.auditLog) {
      await req.auditLog(req.user.id || req.user.userId, 'prescription_dispensed', 'prescriptions', prescriptionId, req.clientIp || '');
    }

    res.json({ prescription });
  } catch (error) {
    console.error('Dispense prescription error:', error);
    res.status(400).json({ error: error.message || 'Failed to dispense prescription' });
  }
};

// Manage inventory
export const getInventory = async (req: any, res: Response): Promise<void> => {
  try {
    const inventory: any[] = await Inventory.findAll({
      order: [['drug_name', 'ASC']]
    });

    const withAlerts = inventory.map(item => ({
      ...item.toJSON(),
      has_low_stock: item.quantity <= item.reorder_threshold,
      is_expired: new Date(item.expiry_date) < new Date()
    }));

    res.json({ inventory: withAlerts });
  } catch (error) {
    console.error('Get inventory error:', error);
    res.status(500).json({ error: 'Failed to retrieve inventory' });
  }
};

// Update inventory
export const updateInventory = async (req: any, res: Response): Promise<void> => {
  try {
    const { inventory_id, quantity } = req.body;
    const resolvedInventoryId = req.params.id || inventory_id;

    if (!resolvedInventoryId || quantity === undefined) {
      res.status(400).json({ error: 'Inventory ID and quantity required' });
      return;
    }

    const item: any = await Inventory.findByPk(resolvedInventoryId);
    if (!item) {
      res.status(404).json({ error: 'Inventory item not found' });
      return;
    }

    item.quantity = quantity;
    await item.save();

    if (req.user && req.auditLog) {
      await req.auditLog(req.user.id || req.user.userId, 'inventory_updated', 'inventory', resolvedInventoryId, req.clientIp || '');
    }

    res.json({ item });
  } catch (error) {
    console.error('Update inventory error:', error);
    res.status(500).json({ error: 'Failed to update inventory' });
  }
};

// Add inventory item
export const addInventoryItem = async (req: any, res: Response): Promise<void> => {
  try {
    const { drug_name, quantity, unit, expiry_date, reorder_threshold, batch_number, supplier } = req.body;

    if (!drug_name || !unit || !expiry_date) {
      res.status(400).json({ error: 'Drug name, unit, and expiry date are required' });
      return;
    }

    // Check if drug already exists (case insensitive match)
    const existing = await Inventory.findOne({ where: sequelize.where(sequelize.fn('lower', sequelize.col('drug_name')), drug_name.toLowerCase()) });
    if (existing) {
      res.status(400).json({ error: 'Drug already exists in inventory. Restock it instead.' });
      return;
    }

    const item = await Inventory.create({
      drug_name,
      quantity: quantity || 0,
      unit,
      expiry_date: new Date(expiry_date),
      reorder_threshold: reorder_threshold || 10,
      batch_number: batch_number || null,
      supplier: supplier || null
    });

    if (req.user && req.auditLog) {
      await req.auditLog(req.user.id || req.user.userId, 'inventory_created', 'inventory', item.id, req.clientIp || '');
    }

    res.status(201).json({ item });
  } catch (error) {
    console.error('Add inventory item error:', error);
    res.status(500).json({ error: 'Failed to create inventory item' });
  }
};

export default {
  issuePrescription,
  getPendingPrescriptions,
  approvePrescription,
  rejectPrescription,
  dispensePrescription,
  getInventory,
  updateInventory,
  addInventoryItem
};
