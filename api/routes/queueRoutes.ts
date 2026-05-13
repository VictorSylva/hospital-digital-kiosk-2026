import express from 'express';
import { 
  getLiveQueue, 
  bookAppointment, 
  checkInPatient, 
  updateQueueStatus, 
  rescheduleAppointment, 
  cancelAppointment 
} from '../controllers/queueController.js';

const router = express.Router();

router.get('/', getLiveQueue);
router.post('/appointments', bookAppointment);
router.put('/appointments/:id', rescheduleAppointment);
router.delete('/appointments/:id', cancelAppointment);
router.post('/checkin', checkInPatient);
router.put('/:id/status', updateQueueStatus);

export default router;
