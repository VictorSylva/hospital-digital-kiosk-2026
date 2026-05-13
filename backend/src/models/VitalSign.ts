import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database.js';

export interface VitalSignAttributes {
  id: string;
  patient_id: string;
  temperature: number | null;
  weight: number | null;
  blood_pressure_systolic: number | null;
  blood_pressure_diastolic: number | null;
  spo2: number | null;
  heart_rate: number | null;
  respiratory_rate: number | null;
  is_abnormal: boolean;
  abnormal_flags: any | null;
  recorded_by: string;
  captured_at: Date;
}

export interface VitalSignCreationAttributes extends Optional<VitalSignAttributes, 'id' | 'temperature' | 'weight' | 'blood_pressure_systolic' | 'blood_pressure_diastolic' | 'spo2' | 'heart_rate' | 'respiratory_rate' | 'is_abnormal' | 'abnormal_flags' | 'captured_at'> {}
export interface VitalSignInstance extends Model<VitalSignAttributes, VitalSignCreationAttributes>, VitalSignAttributes {}

const VitalSign = sequelize.define<VitalSignInstance>('VitalSign', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  patient_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  temperature: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  weight: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  blood_pressure_systolic: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  blood_pressure_diastolic: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  spo2: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  heart_rate: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  respiratory_rate: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  is_abnormal: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  abnormal_flags: {
    type: DataTypes.JSON,
    allowNull: true
  },
  recorded_by: {
    type: DataTypes.UUID,
    allowNull: false
  },
  captured_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'vital_signs',
  timestamps: true
});

export default VitalSign;
