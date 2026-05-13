import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database.js';

export interface PatientAttributes {
  id: string;
  user_id: string;
  date_of_birth: Date;
  national_id: string | null;
  consent_given_at: Date | null;
  phone: string | null;
  address: string | null;
}

export interface PatientCreationAttributes extends Optional<PatientAttributes, 'id' | 'national_id' | 'consent_given_at' | 'phone' | 'address'> {}
export interface PatientInstance extends Model<PatientAttributes, PatientCreationAttributes>, PatientAttributes {}

const Patient = sequelize.define<PatientInstance>('Patient', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true
  },
  date_of_birth: {
    type: DataTypes.DATE,
    allowNull: false
  },
  national_id: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: true
  },
  consent_given_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'patients',
  timestamps: true
});

export default Patient;
