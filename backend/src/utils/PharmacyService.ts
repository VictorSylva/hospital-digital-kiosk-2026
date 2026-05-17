import sequelize from '../config/database.js';
import { Prescription, Inventory } from '../models/index.js';
import { QueueService } from './QueueService.js';
import { emitQueueUpdate } from './socket.js';

export class PharmacyService {
  /**
   * Doctor prescribes a drug.
   * Atomically creates prescription and moves patient to pharmacy queue.
   */
  static async issuePrescription(
    patientId: string,
    doctorId: string,
    drugName: string,
    dosage: string,
    frequency: string,
    duration: string,
    route: string
  ): Promise<any> {
    const transaction = await sequelize.transaction();
    try {
      const prescription = await Prescription.create({
        patient_id: patientId,
        doctor_id: doctorId,
        drug_name: drugName,
        dosage,
        frequency,
        duration,
        route,
        status: 'issued'
      }, { transaction });

      // Move patient to pharmacy queue
      await QueueService.advanceState(patientId, 'AWAITING_PHARMACY', transaction);
      
      await transaction.commit();
      emitQueueUpdate();
      return prescription;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Pharmacist dispenses a prescription.
   * Atomically checks inventory, decrements stock, marks dispensed, and moves patient to doctor review.
   */
  static async dispensePrescription(
    prescriptionId: string,
    pharmacistId: string
  ): Promise<any> {
    const transaction = await sequelize.transaction();
    try {
      const prescription: any = await Prescription.findByPk(prescriptionId, { transaction });
      
      if (!prescription) {
        throw new Error('Prescription not found');
      }

      if (prescription.status !== 'issued') {
        throw new Error('Prescription is not in issued state');
      }

      // Find drug in inventory
      const inventory: any = await Inventory.findOne({ 
        where: { drug_name: prescription.drug_name },
        transaction 
      });

      if (!inventory) {
        throw new Error('Drug not found in inventory');
      }

      if (inventory.quantity <= 0) {
        throw new Error('Insufficient inventory stock');
      }

      // Decrement stock
      inventory.quantity -= 1;
      await inventory.save({ transaction });

      // Update prescription
      prescription.status = 'dispensed';
      prescription.pharmacist_id = pharmacistId;
      prescription.dispensed_at = new Date();
      await prescription.save({ transaction });

      // Move patient to AWAITING_DOCTOR_REVIEW
      await QueueService.advanceState(prescription.patient_id, 'AWAITING_DOCTOR_REVIEW', transaction);

      await transaction.commit();
      emitQueueUpdate();
      return prescription;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}
