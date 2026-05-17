import { Transaction } from 'sequelize';
import { PatientFlow } from '../models/index.js';
import { PatientState } from '../models/PatientFlow.js';
import { emitQueueUpdate } from './socket.js';

const validTransitions: Record<PatientState, PatientState[]> = {
  'AWAITING_TRIAGE': ['AWAITING_DOCTOR', 'DISCHARGED'],
  'AWAITING_DOCTOR': ['AWAITING_LAB', 'AWAITING_PHARMACY', 'DISCHARGED'],
  'AWAITING_LAB': ['AWAITING_DOCTOR_REVIEW'],
  'AWAITING_DOCTOR_REVIEW': ['AWAITING_PHARMACY', 'DISCHARGED'],
  'AWAITING_PHARMACY': ['DISCHARGED', 'AWAITING_DOCTOR_REVIEW'],
  'DISCHARGED': ['AWAITING_TRIAGE'] // Allow returning patient to check in again
};

export class QueueService {
  /**
   * Advances a patient's state in the queue.
   * Ensures the transition is valid according to the finite state machine.
   * Broadcasts a WebSocket event upon successful state change.
   */
  static async advanceState(patientId: string, targetState: PatientState, transaction?: Transaction): Promise<void> {
    let flow: any = await PatientFlow.findOne({ 
      where: { patient_id: patientId },
      transaction
    });

    if (!flow) {
      // If no flow exists, they must start at triage (or we allow bootstrapping for testing)
      if (targetState !== 'AWAITING_TRIAGE') {
        // Bootstrap flow to AWAITING_TRIAGE first
        flow = await PatientFlow.create({ patient_id: patientId, current_state: 'AWAITING_TRIAGE' }, { transaction });
      } else {
        flow = await PatientFlow.create({ patient_id: patientId, current_state: targetState }, { transaction });
        emitQueueUpdate();
        return;
      }
    }

    const currentState = flow.current_state as PatientState;

    if (currentState === targetState) {
      return; // Already in this state
    }

    const allowedNextStates = validTransitions[currentState] || [];
    if (!allowedNextStates.includes(targetState)) {
      throw new Error(`Invalid state transition from ${currentState} to ${targetState}`);
    }

    flow.current_state = targetState;
    await flow.save({ transaction });
    
    // Broadcast real-time update
    emitQueueUpdate();
  }
}
