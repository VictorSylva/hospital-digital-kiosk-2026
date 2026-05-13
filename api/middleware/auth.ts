import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/authUtils.js';

interface AuthenticatedRequest extends Request {
  user?: any;
}

export const authenticate = (req: any, res: Response, next: NextFunction): void => {
  // Check for ESP32 Secret Header first
  const esp32Secret = req.headers['x-esp32-secret'];
  if (esp32Secret && esp32Secret === process.env.ESP32_SECRET) {
    // Populate a mock "System Admin" user for the device
    req.user = { id: '00000000-0000-0000-0000-000000000000', role: 'admin', name: 'ESP32 Kiosk' };
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: No token provided' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

export const authorize = (...roles: string[]) => {
  return (req: any, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
      return;
    }
    next();
  };
};

export default { authenticate, authorize };
