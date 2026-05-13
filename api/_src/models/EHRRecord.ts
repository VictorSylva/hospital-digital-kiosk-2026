import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database.js';

export interface EHRRecordAttributes {
  id: string;
  patient_id: string;
  record_type: 'consultation' | 'vital_signs' | 'diagnosis' | 'medication' | 'lab_result' | 'imaging';
  encrypted_content: string;
  iv: string;
  auth_tag: string;
  created_by: string;
  last_modified_by: string | null;
  is_sensitive: boolean;
}

export interface EHRRecordCreationAttributes extends Optional<EHRRecordAttributes, 'id' | 'last_modified_by' | 'is_sensitive'> {}
export interface EHRRecordInstance extends Model<EHRRecordAttributes, EHRRecordCreationAttributes>, EHRRecordAttributes {}

const EHRRecord = sequelize.define<EHRRecordInstance>('EHRRecord', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  patient_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  record_type: {
    type: DataTypes.ENUM('consultation', 'vital_signs', 'diagnosis', 'medication', 'lab_result', 'imaging'),
    allowNull: false
  },
  encrypted_content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  iv: {
    type: DataTypes.STRING,
    allowNull: false
  },
  auth_tag: {
    type: DataTypes.STRING,
    allowNull: false
  },
  created_by: {
    type: DataTypes.UUID,
    allowNull: false
  },
  last_modified_by: {
    type: DataTypes.UUID,
    allowNull: true
  },
  is_sensitive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'ehr_records',
  timestamps: true
});

export default EHRRecord;
