import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database.js';

export interface DepartmentAttributes {
  id: string;
  name: string;
  code: string;
  daily_capacity: number;
  description: string | null;
}

export interface DepartmentCreationAttributes extends Optional<DepartmentAttributes, 'id' | 'daily_capacity' | 'description'> {}
export interface DepartmentInstance extends Model<DepartmentAttributes, DepartmentCreationAttributes>, DepartmentAttributes {}

const Department = sequelize.define<DepartmentInstance>('Department', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  code: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  daily_capacity: {
    type: DataTypes.INTEGER,
    defaultValue: 50
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'departments',
  timestamps: true
});

export default Department;
