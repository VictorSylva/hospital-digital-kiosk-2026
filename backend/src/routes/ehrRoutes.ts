import express from 'express';
import { getEHR, createEHR, updateEHR, exportAuditLogs } from '../controllers/ehrController.js';

const router = express.Router();

router.get('/:patientId', getEHR);
router.post('/:patientId', createEHR);
router.put('/:id', updateEHR);
router.get('/admin/audit-logs', exportAuditLogs);

export default router;
