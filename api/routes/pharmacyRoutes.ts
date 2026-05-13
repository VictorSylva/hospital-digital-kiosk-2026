import express from 'express';
import {
  issuePrescription,
  getPendingPrescriptions,
  approvePrescription,
  rejectPrescription,
  dispensePrescription,
  getInventory,
  updateInventory
} from '../controllers/pharmacyController.js';

const router = express.Router();

router.post('/', issuePrescription);
router.get('/queue', getPendingPrescriptions);
router.put('/:id/approve', approvePrescription);
router.put('/:id/reject', rejectPrescription);
router.put('/:id/dispense', dispensePrescription);
router.get('/inventory', getInventory);
router.put('/inventory/:id', updateInventory);

export default router;
