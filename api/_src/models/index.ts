import User from './User.js';
import Patient from './Patient.js';
import Department from './Department.js';
import Appointment from './Appointment.js';
import QueueEntry from './QueueEntry.js';
import EHRRecord from './EHRRecord.js';
import AuditLog from './AuditLog.js';
import Prescription from './Prescription.js';
import Inventory from './Inventory.js';
import VitalSign from './VitalSign.js';

// Define associations
Patient.belongsTo(User, { foreignKey: 'user_id' });
User.hasOne(Patient, { foreignKey: 'user_id' });

Appointment.belongsTo(Patient, { foreignKey: 'patient_id' });
Appointment.belongsTo(User, { as: 'doctor', foreignKey: 'doctor_id' });
Appointment.belongsTo(Department, { foreignKey: 'department_id' });
Patient.hasMany(Appointment, { foreignKey: 'patient_id' });

QueueEntry.belongsTo(Appointment, { foreignKey: 'appointment_id' });
QueueEntry.belongsTo(Patient, { foreignKey: 'patient_id' });
QueueEntry.belongsTo(Department, { foreignKey: 'department_id' });

EHRRecord.belongsTo(Patient, { foreignKey: 'patient_id' });
EHRRecord.belongsTo(User, { as: 'creator', foreignKey: 'created_by' });
Patient.hasMany(EHRRecord, { foreignKey: 'patient_id' });

AuditLog.belongsTo(User, { foreignKey: 'user_id' });

Prescription.belongsTo(Patient, { foreignKey: 'patient_id' });
Prescription.belongsTo(User, { as: 'doctor', foreignKey: 'doctor_id' });
Prescription.belongsTo(User, { as: 'pharmacist', foreignKey: 'pharmacist_id' });

VitalSign.belongsTo(Patient, { foreignKey: 'patient_id' });
VitalSign.belongsTo(User, { as: 'recorder', foreignKey: 'recorded_by' });
Patient.hasMany(VitalSign, { foreignKey: 'patient_id' });

export {
  User,
  Patient,
  Department,
  Appointment,
  QueueEntry,
  EHRRecord,
  AuditLog,
  Prescription,
  Inventory,
  VitalSign
};
