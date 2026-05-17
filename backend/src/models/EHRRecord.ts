import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database.js';
import { encryptText, decryptText } from '../utils/crypto.js';

export interface EHRRecordAttributes {
  id: string;
  patient_id: string;
  record_type: 'consultation' | 'vital_signs' | 'diagnosis' | 'medication' | 'lab_result' | 'imaging' | 'treatment_plan';
  encrypted_content: string;
  iv: string;
  auth_tag: string; // Left for backward compatibility if needed
  created_by: string;
  last_modified_by: string | null;
  is_sensitive: boolean;
  content?: string; // Virtual field for plaintext
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
    type: DataTypes.ENUM('consultation', 'vital_signs', 'diagnosis', 'medication', 'lab_result', 'imaging', 'treatment_plan'),
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
    allowNull: true // changed to true for CBC
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
  },
  content: {
    type: DataTypes.VIRTUAL
  }
}, {
  tableName: 'ehr_records',
  timestamps: true,
  hooks: {
    beforeValidate: (record: EHRRecordInstance) => {
      if (record.content) {
        const { iv, encryptedData } = encryptText(record.content);
        record.encrypted_content = encryptedData;
        record.iv = iv;
        record.auth_tag = 'cbc-mode'; 
      }
    },
    afterFind: (result: any) => {
      if (!result) return;
      if (Array.isArray(result)) {
        result.forEach(record => {
          if (record.encrypted_content && record.iv) {
            try {
              record.content = decryptText(record.encrypted_content, record.iv);
            } catch (e) {
              console.error('Decryption failed for record', record.id);
            }
          }
        });
      } else {
        if (result.encrypted_content && result.iv) {
          try {
            result.content = decryptText(result.encrypted_content, result.iv);
          } catch (e) {
            console.error('Decryption failed for record', result.id);
          }
        }
      }
    }
  }
});

export default EHRRecord;
