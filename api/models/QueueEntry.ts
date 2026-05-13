import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database.js';

export interface QueueEntryAttributes {
  id: string;
  appointment_id: string | null;
  patient_id: string;
  department_id: string;
  token_number: string;
  priority: 'emergency' | 'elderly_disabled' | 'standard';
  status: 'waiting' | 'called' | 'in_progress' | 'completed' | 'no_show';
  called_at: Date | null;
  completed_at: Date | null;
}

export interface QueueEntryCreationAttributes extends Optional<QueueEntryAttributes, 'id' | 'appointment_id' | 'priority' | 'status' | 'called_at' | 'completed_at'> {}
export interface QueueEntryInstance extends Model<QueueEntryAttributes, QueueEntryCreationAttributes>, QueueEntryAttributes {}

const QueueEntry = sequelize.define<QueueEntryInstance>('QueueEntry', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  appointment_id: {
    type: DataTypes.UUID,
    allowNull: true
  },
  patient_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  department_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  token_number: {
    type: DataTypes.STRING,
    allowNull: false
  },
  priority: {
    type: DataTypes.ENUM('emergency', 'elderly_disabled', 'standard'),
    defaultValue: 'standard'
  },
  status: {
    type: DataTypes.ENUM('waiting', 'called', 'in_progress', 'completed', 'no_show'),
    defaultValue: 'waiting'
  },
  called_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  completed_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'queue_entries',
  timestamps: true
});

export default QueueEntry;
