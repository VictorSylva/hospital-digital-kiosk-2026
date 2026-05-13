import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database.js';

export interface PrescriptionAttributes {
  id: string;
  ehr_record_id: string | null;
  patient_id: string;
  doctor_id: string;
  drug_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  route: string;
  status: 'issued' | 'pending_review' | 'approved' | 'rejected' | 'dispensed' | 'flagged';
  rejection_reason: string | null;
  pharmacist_id: string | null;
  dispensed_at: Date | null;
  issued_at: Date;
}

export interface PrescriptionCreationAttributes extends Optional<PrescriptionAttributes, 'id' | 'ehr_record_id' | 'status' | 'rejection_reason' | 'pharmacist_id' | 'dispensed_at' | 'issued_at'> {}
export interface PrescriptionInstance extends Model<PrescriptionAttributes, PrescriptionCreationAttributes>, PrescriptionAttributes {}

const Prescription = sequelize.define<PrescriptionInstance>('Prescription', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  ehr_record_id: {
    type: DataTypes.UUID,
    allowNull: true
  },
  patient_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  doctor_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  drug_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  dosage: {
    type: DataTypes.STRING,
    allowNull: false
  },
  frequency: {
    type: DataTypes.STRING,
    allowNull: false
  },
  duration: {
    type: DataTypes.STRING,
    allowNull: false
  },
  route: {
    type: DataTypes.STRING,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('issued', 'pending_review', 'approved', 'rejected', 'dispensed', 'flagged'),
    defaultValue: 'issued'
  },
  rejection_reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  pharmacist_id: {
    type: DataTypes.UUID,
    allowNull: true
  },
  dispensed_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  issued_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'prescriptions',
  timestamps: true
});

export default Prescription;
