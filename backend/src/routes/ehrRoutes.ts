import express from 'express';
import { getEHR, createEHR, updateEHR, exportAuditLogs } from '../controllers/ehrController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/:patientId', authenticate, authorize('doctor', 'nurse', 'admin', 'patient'), getEHR);
router.post('/:patientId', authenticate, authorize('doctor', 'admin'), createEHR);
router.put('/:id', authenticate, authorize('doctor', 'admin'), updateEHR);
router.get('/admin/audit-logs', authenticate, authorize('admin'), exportAuditLogs);

export default router;
