import { Request, Response, NextFunction } from 'express';
import { AuditLog } from '../models/index.js';

interface AuthenticatedRequest extends Request {
  auditLog?: (userId: string, action: string, tableName: string, recordId: string, ipAddress: string, status?: 'success' | 'failure', details?: any) => Promise<void>;
  clientIp?: string;
}

export const auditLog = async (
  userId: string, 
  action: string, 
  tableName: string, 
  recordId: string, 
  ipAddress: string, 
  status: 'success' | 'failure' = 'success', 
  details: any = null
): Promise<void> => {
  try {
    await AuditLog.create({
      user_id: userId,
      action,
      table_name: tableName,
      record_id: recordId,
      ip_address: ipAddress,
      status,
      details
    });
  } catch (error) {
    console.error('Audit log error:', error);
  }
};

export const auditLogMiddleware = (req: any, res: Response, next: NextFunction): void => {
  req.auditLog = auditLog;
  req.clientIp = req.ip || (req.socket ? req.socket.remoteAddress : '');
  next();
};

export default { auditLog, auditLogMiddleware };
