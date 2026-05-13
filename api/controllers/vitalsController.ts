import { Request, Response } from 'express';
import { VitalSign, Patient, User } from '../models/index.js';

interface AuthenticatedRequest extends Request {
  user?: any;
  auditLog?: (userId: string, action: string, tableName: string, recordId: string, ip: string) => Promise<void>;
  clientIp?: string;
}

const ABNORMAL_THRESHOLDS = {
  temperature: { min: 36.1, max: 38 },
  spo2: { min: 95 },
  systolic: { max: 140 },
  diastolic: { max: 90 }
};

// Submit vital signs
export const submitVitals = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { patient_id, temperature, weight, blood_pressure_systolic, blood_pressure_diastolic, spo2, heart_rate, respiratory_rate } = req.body;

    if (!patient_id) {
      res.status(400).json({ error: 'Patient ID required' });
      return;
    }

    // Check for abnormal readings
    const abnormalFlags: string[] = [];

    if (temperature && (temperature < ABNORMAL_THRESHOLDS.temperature.min || temperature > ABNORMAL_THRESHOLDS.temperature.max)) {
      abnormalFlags.push('abnormal_temperature');
    }

    if (spo2 && spo2 < ABNORMAL_THRESHOLDS.spo2.min) {
      abnormalFlags.push('low_oxygen');
    }

    if (blood_pressure_systolic && blood_pressure_systolic > ABNORMAL_THRESHOLDS.systolic.max) {
      abnormalFlags.push('high_systolic');
    }

    if (blood_pressure_diastolic && blood_pressure_diastolic > ABNORMAL_THRESHOLDS.diastolic.max) {
      abnormalFlags.push('high_diastolic');
    }

    const vitals: any = await VitalSign.create({
      patient_id,
      temperature,
      weight,
      blood_pressure_systolic,
      blood_pressure_diastolic,
      spo2,
      heart_rate,
      respiratory_rate,
      recorded_by: req.user.userId || req.user.id,
      is_abnormal: abnormalFlags.length > 0,
      abnormal_flags: abnormalFlags.length > 0 ? abnormalFlags : null,
      captured_at: new Date()
    });

    if (req.user && req.auditLog) {
      await req.auditLog(req.user.id || req.user.userId, 'vitals_recorded', 'vital_signs', vitals.id, req.clientIp || '');
    }

    res.status(201).json({
      vitals,
      is_abnormal: abnormalFlags.length > 0,
      abnormal_flags: abnormalFlags
    });
  } catch (error) {
    console.error('Submit vitals error:', error);
    res.status(500).json({ error: 'Failed to record vitals' });
  }
};

// Get vitals history
export const getVitalsHistory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { patientId } = req.params;

    const vitals: any[] = await VitalSign.findAll({
      where: { patient_id: patientId },
      include: [{ model: User, as: 'recorder' }],
      order: [['captured_at', 'DESC']],
      limit: 50
    });

    res.json({ vitals });
  } catch (error) {
    console.error('Get vitals error:', error);
    res.status(500).json({ error: 'Failed to retrieve vitals' });
  }
};

// Get patients with abnormal readings
export const getAbnormalReadings = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const abnormalVitals: any[] = await VitalSign.findAll({
      where: { is_abnormal: true },
      include: [
        { model: Patient, include: [{ model: User }] },
        { model: User, as: 'recorder' }
      ],
      order: [['captured_at', 'DESC']],
      limit: 100
    });

    const patients = abnormalVitals.map(vital => ({
      patient_id: vital.patient_id,
      patient_name: vital.Patient?.User?.name || 'Unknown',
      abnormal_flags: vital.abnormal_flags,
      captured_at: vital.captured_at,
      recorded_by: vital.recorder?.name || 'Unknown'
    }));

    res.json({ patients });
  } catch (error) {
    console.error('Get abnormal readings error:', error);
    res.status(500).json({ error: 'Failed to retrieve abnormal readings' });
  }
};

export default {
  submitVitals,
  getVitalsHistory,
  getAbnormalReadings
};
