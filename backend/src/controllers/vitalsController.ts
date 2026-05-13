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
export const submitVitals = async (req: any, res: Response): Promise<void> => {
  try {
    const { patient_id, temperature, weight, blood_pressure_systolic, blood_pressure_diastolic, spo2, heart_rate, respiratory_rate } = req.body;

    if (!patient_id) {
      res.status(400).json({ error: 'Patient ID required' });
      return;
    }

    // Resolve Patient (UUID vs Kiosk ID)
    let patient: any = null;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(patient_id);

    if (isUuid) {
      patient = await Patient.findByPk(patient_id);
    } else {
      // Try to find by custom ID or just use the first available patient for demo
      patient = await Patient.findOne({ where: { national_id: patient_id } });
      if (!patient) {
        patient = await Patient.findOne();
      }
    }

    if (!patient) {
      try {
        // Create a unique email based on the patient_id to prevent collisions
        const safeEmail = `kiosk_${patient_id.toLowerCase()}_${Math.floor(Math.random() * 10000)}@telemed.com`;
        
        const dummyUser = await User.create({
          name: `Patient ${patient_id}`,
          email: safeEmail,
          password_hash: 'no_password_needed',
          role: 'patient'
        });

        patient = await Patient.create({
          user_id: dummyUser.id,
          national_id: patient_id,
          date_of_birth: new Date('1990-01-01')
        });
        console.log(`Successfully auto-created patient: ${patient_id}`);
      } catch (createErr) {
        // If creation fails (e.g. someone else created it at the same microsecond), try one last find
        patient = await Patient.findOne({ where: { national_id: patient_id } });
        if (!patient) throw createErr;
      }
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

    // Resolve Recorder (User who is submitting the data)
    let recorderId = req.user?.id || req.user?.userId;
    
    if (!recorderId) {
      // If submitted by ESP32 (no user login), find the Admin or create a Kiosk Bot
      let recorder = await User.findOne({ where: { email: 'admin@telemed.com' } });
      
      if (!recorder) {
        // Create a permanent Bot user if even the Admin is missing
        recorder = await User.findOne({ where: { role: 'admin' } });
        if (!recorder) {
          recorder = await User.create({
            name: 'Kiosk Hardware',
            email: 'kiosk_hardware@telemed.com',
            password_hash: 'no_password',
            role: 'admin'
          });
        }
      }
      recorderId = recorder.id;
    }

    const vitals: any = await VitalSign.create({
      patient_id: patient.id,
      temperature,
      weight,
      blood_pressure_systolic,
      blood_pressure_diastolic,
      spo2,
      heart_rate,
      respiratory_rate,
      recorded_by: recorderId,
      is_abnormal: abnormalFlags.length > 0,
      abnormal_flags: abnormalFlags.length > 0 ? abnormalFlags : null,
      captured_at: new Date()
    });

    if (req.auditLog) {
      await req.auditLog(recorderId, 'vitals_recorded', 'vital_signs', vitals.id, req.clientIp || '');
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
export const getVitalsHistory = async (req: any, res: Response): Promise<void> => {
  try {
    const { patientId } = req.params;

    // Resolve Patient ID (UUID vs Kiosk ID)
    let targetPatientId = patientId;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(patientId);

    if (!isUuid) {
      const patient = await Patient.findOne({ where: { national_id: patientId } });
      if (patient) {
        targetPatientId = patient.id;
      }
    }

    const vitals: any[] = await VitalSign.findAll({
      where: { patient_id: targetPatientId },
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
export const getAbnormalReadings = async (req: any, res: Response): Promise<void> => {
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
