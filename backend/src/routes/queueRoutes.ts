import express from 'express';
import { 
  getLiveQueue, 
  bookAppointment, 
  checkInPatient, 
  updateQueueStatus, 
  rescheduleAppointment, 
  cancelAppointment 
} from '../controllers/queueController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticate, getLiveQueue);
router.post('/appointments', authenticate, authorize('patient', 'admin', 'nurse'), bookAppointment);
router.put('/appointments/:id', authenticate, authorize('patient', 'admin', 'nurse'), rescheduleAppointment);
router.delete('/appointments/:id', authenticate, authorize('patient', 'admin', 'nurse'), cancelAppointment);
router.post('/checkin', authenticate, authorize('patient', 'nurse', 'admin'), checkInPatient);
router.put('/:id/status', authenticate, authorize('nurse', 'doctor', 'pharmacist', 'lab_tech', 'admin'), updateQueueStatus);

export default router;
