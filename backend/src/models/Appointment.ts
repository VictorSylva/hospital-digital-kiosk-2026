import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database.js';

export interface AppointmentAttributes {
  id: string;
  patient_id: string;
  doctor_id: string | null;
  department_id: string;
  scheduled_at: Date;
  status: 'booked' | 'checked_in' | 'in_consultation' | 'completed' | 'no_show' | 'cancelled';
  notes: string | null;
  reason_for_visit: string | null;
}

export interface AppointmentCreationAttributes extends Optional<AppointmentAttributes, 'id' | 'doctor_id' | 'status' | 'notes' | 'reason_for_visit'> {}
export interface AppointmentInstance extends Model<AppointmentAttributes, AppointmentCreationAttributes>, AppointmentAttributes {}

const Appointment = sequelize.define<AppointmentInstance>('Appointment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  patient_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  doctor_id: {
    type: DataTypes.UUID,
    allowNull: true
  },
  department_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  scheduled_at: {
    type: DataTypes.DATE,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('booked', 'checked_in', 'in_consultation', 'completed', 'no_show', 'cancelled'),
    defaultValue: 'booked'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  reason_for_visit: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'appointments',
  timestamps: true
});

export default Appointment;
