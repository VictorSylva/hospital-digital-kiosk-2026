import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database.js';

export interface UserAttributes {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: 'patient' | 'nurse' | 'doctor' | 'pharmacist' | 'admin';
  is_active: boolean;
  failed_login_attempts: number;
  locked_until: Date | null;
  last_login: Date | null;
}

export interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'role' | 'is_active' | 'failed_login_attempts' | 'locked_until' | 'last_login'> {}
export interface UserInstance extends Model<UserAttributes, UserCreationAttributes>, UserAttributes {}

const User = sequelize.define<UserInstance>('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  password_hash: {
    type: DataTypes.STRING,
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('patient', 'nurse', 'doctor', 'pharmacist', 'admin'),
    allowNull: false,
    defaultValue: 'patient'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  failed_login_attempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  locked_until: {
    type: DataTypes.DATE,
    allowNull: true
  },
  last_login: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'users',
  timestamps: true
});

export default User;
