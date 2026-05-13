import { Request, Response } from 'express';
import { EHRRecord, Patient, User, AuditLog } from '../models/index.js';
import { encrypt, decrypt } from '../utils/encryption.js';

interface AuthenticatedRequest extends Request {
  user?: any;
  auditLog?: (userId: string, action: string, tableName: string, recordId: string, ip: string) => Promise<void>;
  clientIp?: string;
}

// Get decrypted EHR
export const getEHR = async (req: any, res: Response): Promise<void> => {
  try {
    const patientId = req.params.patientId as string;

    // Check permissions
    if (req.user.role === 'patient' && (req.user.userId !== patientId && req.user.id !== patientId)) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const records: any[] = await EHRRecord.findAll({
      where: { patient_id: patientId },
      include: [{ model: User, as: 'creator' }],
      order: [['createdAt', 'DESC']]
    });

    const decryptedRecords = records.map(record => {
      try {
        const plaintext = decrypt(record.encrypted_content, record.iv, record.auth_tag);
        return {
          id: record.id,
          record_type: record.record_type,
          content: JSON.parse(plaintext),
          created_by: record.creator?.name || 'Unknown',
          created_at: record.createdAt
        };
      } catch (error) {
        console.error('Decryption error:', error);
        return null; // Skip records that fail decryption (bad key, corrupted, etc)
      }
    }).filter(r => r !== null);

    if (req.user && req.auditLog) {
      await req.auditLog(req.user.id || req.user.userId, 'ehr_accessed', 'ehr_records', patientId, (req.clientIp as string) || '');
    }

    res.json({ records: decryptedRecords });
  } catch (error) {
    console.error('Get EHR error:', error);
    res.status(500).json({ error: 'Failed to retrieve EHR' });
  }
};

// Create EHR entry
export const createEHR = async (req: any, res: Response): Promise<void> => {
  try {
    const patientId = req.params.patientId as string;
    const { record_type, content } = req.body;

    if (!record_type || !content) {
      res.status(400).json({ error: 'Record type and content required' });
      return;
    }

    const encrypted = encrypt(JSON.stringify(content));

    const record: any = await EHRRecord.create({
      patient_id: patientId,
      record_type,
      encrypted_content: encrypted.encrypted,
      iv: encrypted.iv,
      auth_tag: encrypted.authTag,
      created_by: req.user.userId || req.user.id
    });

    if (req.user && req.auditLog) {
      await req.auditLog(req.user.id || req.user.userId, 'ehr_created', 'ehr_records', record.id, (req.clientIp as string) || '');
    }

    res.status(201).json({ record: { id: record.id, record_type, created_at: record.createdAt } });
  } catch (error) {
    console.error('Create EHR error:', error);
    res.status(500).json({ error: 'Failed to create EHR entry' });
  }
};

// Update EHR entry
export const updateEHR = async (req: any, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { content } = req.body;

    if (!content) {
      res.status(400).json({ error: 'Content required' });
      return;
    }

    const record: any = await EHRRecord.findByPk(id);
    if (!record) {
      res.status(404).json({ error: 'Record not found' });
      return;
    }

    const encrypted = encrypt(JSON.stringify(content));

    record.encrypted_content = encrypted.encrypted;
    record.iv = encrypted.iv;
    record.auth_tag = encrypted.authTag;
    record.last_modified_by = req.user.userId || req.user.id;
    await record.save();

    if (req.user && req.auditLog) {
      await req.auditLog(req.user.id || req.user.userId, 'ehr_updated', 'ehr_records', id, (req.clientIp as string) || '');
    }

    res.json({ message: 'EHR updated' });
  } catch (error) {
    console.error('Update EHR error:', error);
    res.status(500).json({ error: 'Failed to update EHR' });
  }
};

// Export audit logs
export const exportAuditLogs = async (req: any, res: Response): Promise<void> => {
  try {
    const logs: any[] = await AuditLog.findAll({
      include: [{ model: User }],
      order: [['createdAt', 'DESC']]
    });

    // Generate CSV
    const csv = [
      ['ID', 'User', 'Action', 'Table', 'Record ID', 'IP Address', 'Status', 'Timestamp'].join(',')
    ];

    logs.forEach(log => {
      csv.push([
        log.id,
        log.User?.email || 'Unknown',
        log.action,
        log.table_name,
        log.record_id || '',
        log.ip_address || '',
        log.status,
        log.createdAt
      ].join(','));
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="audit-logs.csv"');
    res.send(csv.join('\n'));
  } catch (error) {
    console.error('Export audit logs error:', error);
    res.status(500).json({ error: 'Failed to export logs' });
  }
};

export default { getEHR, createEHR, updateEHR, exportAuditLogs };
