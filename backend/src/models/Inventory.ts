import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database.js';

export interface InventoryAttributes {
  id: string;
  drug_name: string;
  quantity: number;
  unit: string;
  expiry_date: Date;
  reorder_threshold: number;
  batch_number: string | null;
  supplier: string | null;
}

export interface InventoryCreationAttributes extends Optional<InventoryAttributes, 'id' | 'quantity' | 'reorder_threshold' | 'batch_number' | 'supplier'> {}
export interface InventoryInstance extends Model<InventoryAttributes, InventoryCreationAttributes>, InventoryAttributes {}

const Inventory = sequelize.define<InventoryInstance>('Inventory', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  drug_name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  unit: {
    type: DataTypes.STRING,
    allowNull: false
  },
  expiry_date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  reorder_threshold: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 10
  },
  batch_number: {
    type: DataTypes.STRING,
    allowNull: true
  },
  supplier: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'inventory',
  timestamps: true
});

export default Inventory;
