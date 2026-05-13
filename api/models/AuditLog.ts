import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database.js';

export interface AuditLogAttributes {
  id: string;
  user_id: string;
  action: string;
  table_name: string;
  record_id: string | null;
  ip_address: string | null;
  status: 'success' | 'failure';
  details: any | null;
}

export interface AuditLogCreationAttributes extends Optional<AuditLogAttributes, 'id' | 'record_id' | 'ip_address' | 'status' | 'details'> {}
export interface AuditLogInstance extends Model<AuditLogAttributes, AuditLogCreationAttributes>, AuditLogAttributes {}

const AuditLog = sequelize.define<AuditLogInstance>('AuditLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  action: {
    type: DataTypes.STRING,
    allowNull: false
  },
  table_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  record_id: {
    type: DataTypes.UUID,
    allowNull: true
  },
  ip_address: {
    type: DataTypes.STRING,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('success', 'failure'),
    defaultValue: 'success'
  },
  details: {
    type: DataTypes.JSON,
    allowNull: true
  }
}, {
  tableName: 'audit_logs',
  timestamps: true,
  indexes: [
    { fields: ['user_id'] },
    { fields: ['created_at'] },
    { fields: ['table_name', 'record_id'] }
  ]
});

export default AuditLog;
