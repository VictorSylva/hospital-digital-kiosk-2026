import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database.js';

export type PatientState = 
  | 'AWAITING_TRIAGE'
  | 'AWAITING_DOCTOR'
  | 'AWAITING_LAB'
  | 'AWAITING_DOCTOR_REVIEW'
  | 'AWAITING_PHARMACY'
  | 'DISCHARGED';

export interface PatientFlowAttributes {
  id: string;
  patient_id: string;
  current_state: PatientState;
}

export interface PatientFlowCreationAttributes extends Optional<PatientFlowAttributes, 'id' | 'current_state'> {}
export interface PatientFlowInstance extends Model<PatientFlowAttributes, PatientFlowCreationAttributes>, PatientFlowAttributes {}

const PatientFlow = sequelize.define<PatientFlowInstance>('PatientFlow', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  patient_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  current_state: {
    type: DataTypes.ENUM(
      'AWAITING_TRIAGE',
      'AWAITING_DOCTOR',
      'AWAITING_LAB',
      'AWAITING_DOCTOR_REVIEW',
      'AWAITING_PHARMACY',
      'DISCHARGED'
    ),
    defaultValue: 'AWAITING_TRIAGE'
  }
}, {
  tableName: 'patient_flows',
  timestamps: true
});

export default PatientFlow;
