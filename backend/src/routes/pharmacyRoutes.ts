import express from 'express';
import {
  issuePrescription,
  getPendingPrescriptions,
  approvePrescription,
  rejectPrescription,
  dispensePrescription,
  getInventory,
  updateInventory,
  addInventoryItem
} from '../controllers/pharmacyController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.post('/', authenticate, authorize('doctor', 'admin'), issuePrescription);
router.get('/queue', authenticate, authorize('pharmacist', 'doctor', 'admin'), getPendingPrescriptions);
router.put('/:id/approve', authenticate, authorize('pharmacist', 'admin'), approvePrescription);
router.put('/:id/reject', authenticate, authorize('pharmacist', 'admin'), rejectPrescription);
router.put('/:id/dispense', authenticate, authorize('pharmacist', 'admin'), dispensePrescription);
router.get('/inventory', authenticate, authorize('pharmacist', 'doctor', 'admin'), getInventory);
router.post('/inventory', authenticate, authorize('pharmacist', 'admin'), addInventoryItem);
router.put('/inventory/:id', authenticate, authorize('pharmacist', 'admin'), updateInventory);

export default router;
