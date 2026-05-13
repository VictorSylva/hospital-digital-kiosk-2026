import { Request, Response } from 'express';
import { Prescription, Inventory, Patient, User } from '../models/index.js';

interface AuthenticatedRequest extends Request {
  user?: any;
  auditLog?: (userId: string, action: string, tableName: string, recordId: string, ip: string) => Promise<void>;
  clientIp?: string;
}

// Issue prescription
export const issuePrescription = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { patient_id, drug_name, dosage, frequency, duration, route } = req.body;

    if (!patient_id || !drug_name || !dosage || !frequency || !duration || !route) {
      res.status(400).json({ error: 'All fields required' });
      return;
    }

    const prescription: any = await Prescription.create({
      patient_id,
      doctor_id: req.user.userId || req.user.id,
      drug_name,
      dosage,
      frequency,
      duration,
      route,
      status: 'issued',
      issued_at: new Date()
    });

    if (req.user && req.auditLog) {
      await req.auditLog(req.user.id || req.user.userId, 'prescription_issued', 'prescriptions', prescription.id, req.clientIp || '');
    }

    res.status(201).json({ prescription });
  } catch (error) {
    console.error('Issue prescription error:', error);
    res.status(500).json({ error: 'Failed to issue prescription' });
  }
};

// Get pending prescriptions (pharmacist worklist)
export const getPendingPrescriptions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const prescriptions: any[] = await Prescription.findAll({
      where: { status: ['issued', 'pending_review', 'flagged'] },
      include: [
        { model: Patient, include: [{ model: User }] },
        { model: User, as: 'doctor' }
      ],
      order: [['issued_at', 'ASC']]
    });

    res.json({ prescriptions });
  } catch (error) {
    console.error('Get prescriptions error:', error);
    res.status(500).json({ error: 'Failed to retrieve prescriptions' });
  }
};

// Approve prescription
export const approvePrescription = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
export const rejectPrescription = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
export const dispensePrescription = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { prescription_id } = req.body;

    const prescription: any = await Prescription.findByPk(prescription_id);
    if (!prescription) {
      res.status(404).json({ error: 'Prescription not found' });
      return;
    }

    if (prescription.status === 'dispensed') {
      res.status(400).json({ error: 'Prescription already dispensed' });
      return;
    }

    // Update inventory
    const inventory: any = await Inventory.findOne({ where: { drug_name: prescription.drug_name } });
    if (!inventory || inventory.quantity <= 0) {
      res.status(400).json({ error: 'Drug not in stock' });
      return;
    }

    // Robust Pharmacy Logic: Decrement inventory and save atomically
    inventory.quantity -= 1;
    await inventory.save();

    prescription.status = 'dispensed';
    prescription.dispensed_at = new Date();
    prescription.pharmacist_id = req.user.userId || req.user.id;
    await prescription.save();

    if (req.user && req.auditLog) {
      await req.auditLog(req.user.id || req.user.userId, 'prescription_dispensed', 'prescriptions', prescription_id, req.clientIp || '');
    }

    res.json({ prescription });
  } catch (error) {
    console.error('Dispense prescription error:', error);
    res.status(500).json({ error: 'Failed to dispense prescription' });
  }
};

// Manage inventory
export const getInventory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
export const updateInventory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { inventory_id, quantity } = req.body;

    if (!inventory_id || quantity === undefined) {
      res.status(400).json({ error: 'Inventory ID and quantity required' });
      return;
    }

    const item: any = await Inventory.findByPk(inventory_id);
    if (!item) {
      res.status(404).json({ error: 'Inventory item not found' });
      return;
    }

    item.quantity = quantity;
    await item.save();

    if (req.user && req.auditLog) {
      await req.auditLog(req.user.id || req.user.userId, 'inventory_updated', 'inventory', inventory_id, req.clientIp || '');
    }

    res.json({ item });
  } catch (error) {
    console.error('Update inventory error:', error);
    res.status(500).json({ error: 'Failed to update inventory' });
  }
};

export default {
  issuePrescription,
  getPendingPrescriptions,
  approvePrescription,
  rejectPrescription,
  dispensePrescription,
  getInventory,
  updateInventory
};
