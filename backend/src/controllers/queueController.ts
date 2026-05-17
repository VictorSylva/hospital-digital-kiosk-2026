import { Request, Response } from "express";
import {
  Appointment,
  Patient,
  Department,
  QueueEntry,
  User,
} from "../models/index.js";
import sequelize from "../config/database.js";
import { Op, ValidationError, ForeignKeyConstraintError } from "sequelize";

// Extended request interface for custom auth and auditLog properties
interface AuthenticatedRequest extends Request {
  user?: any;
  auditLog?: (
    userId: string,
    action: string,
    tableName: string,
    recordId: string,
    ip: string,
  ) => Promise<void>;
  clientIp?: string;
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isUuid = (value: string): boolean => UUID_REGEX.test(value);

// Get live queue
export const getLiveQueue = async (
  req: any,
  res: Response,
): Promise<void> => {
  try {
    const queueEntries: any[] = await QueueEntry.findAll({
      where: { status: { [Op.in]: ["waiting", "called", "in_progress"] } },
      include: [
        { model: Patient, include: [{ model: User }] },
        { model: Department },
      ],
      order: [
        [
          sequelize.literal(
            "CASE WHEN priority = 'emergency' THEN 0 WHEN priority = 'elderly_disabled' THEN 1 ELSE 2 END",
          ),
          "ASC",
        ],
        ["createdAt", "ASC"], // Sequelize standard timestamp name
      ],
    });

    const queue = queueEntries.map((entry) => ({
      id: entry.id,
      token_number: entry.token_number,
      patient_name: entry.Patient?.User?.name || "Unknown",
      department: entry.Department?.name || "Unknown",
      priority: entry.priority,
      status: entry.status,
      // Handle Date correctly in TS
      wait_time_minutes: Math.floor(
        (new Date().getTime() - new Date(entry.createdAt).getTime()) / 60000,
      ),
    }));

    res.json({ queue });
  } catch (error) {
    console.error("Get queue error:", error);
    res.status(500).json({ error: "Failed to retrieve queue" });
  }
};

// Book appointment
export const bookAppointment = async (
  req: any,
  res: Response,
): Promise<void> => {
  try {
    const {
      patient_id,
      doctor_id,
      department_id,
      scheduled_at,
      reason_for_visit,
    } = req.body;

    if (!patient_id || !department_id || !scheduled_at) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    const patientIdentifier = String(patient_id).trim();
    const departmentIdentifier = String(department_id).trim();

    let patient: any = null;
    if (isUuid(patientIdentifier)) {
      patient = await Patient.findByPk(patientIdentifier);
      if (!patient) {
        patient = await Patient.findOne({
          where: { user_id: patientIdentifier },
        });
      }
    } else if (patientIdentifier.includes("@")) {
      patient = await Patient.findOne({
        include: [
          { model: User, where: { email: patientIdentifier.toLowerCase() } },
        ],
      });
    } else {
      patient = await Patient.findOne({
        where: { national_id: patientIdentifier },
      });
    }

    if (!patient) {
      res.status(404).json({
        error:
          "Patient not found. Use patient UUID, user UUID, or patient email tied to a registered account.",
      });
      return;
    }

    let department: any = null;
    if (isUuid(departmentIdentifier)) {
      department = await Department.findByPk(departmentIdentifier);
    } else {
      const normalized = departmentIdentifier.toLowerCase();
      department = await Department.findOne({
        where: {
          [Op.or]: [
            sequelize.where(
              sequelize.fn("lower", sequelize.col("code")),
              normalized,
            ),
            sequelize.where(
              sequelize.fn("lower", sequelize.col("name")),
              normalized,
            ),
          ],
        },
      });
    }

    if (!department) {
      res.status(404).json({
        error:
          "Department not found. Use department UUID, code, or exact name.",
      });
      return;
    }

    if (doctor_id && !isUuid(String(doctor_id).trim())) {
      res
        .status(400)
        .json({ error: "doctor_id must be a valid UUID when provided" });
      return;
    }

    const scheduledAt = new Date(scheduled_at);
    if (Number.isNaN(scheduledAt.getTime())) {
      res.status(400).json({ error: "scheduled_at must be a valid date/time" });
      return;
    }

    const appointment: any = await Appointment.create({
      patient_id: patient.id,
      doctor_id: doctor_id || null,
      department_id: department.id,
      scheduled_at: scheduledAt,
      reason_for_visit,
      status: "booked",
    });

    if (req.user && req.auditLog) {
      await req.auditLog(
        req.user.id || req.user.userId,
        "appointment_booked",
        "appointments",
        appointment.id,
        req.clientIp || "",
      );
    }

    res.status(201).json({ appointment });
  } catch (error) {
    console.error("Book appointment error:", error);
    if (
      error instanceof ValidationError ||
      error instanceof ForeignKeyConstraintError
    ) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: "Failed to book appointment" });
  }
};

// Check in patient
export const checkInPatient = async (
  req: any,
  res: Response,
): Promise<void> => {
  try {
    const { appointment_id, department_id, priority } = req.body;

    if (!appointment_id) {
      res.status(400).json({ error: "Appointment ID required" });
      return;
    }

    const appointment: any = await Appointment.findByPk(appointment_id);
    if (!appointment) {
      res.status(404).json({ error: "Appointment not found" });
      return;
    }

    const existingActiveEntry: any = await QueueEntry.findOne({
      where: {
        appointment_id,
        status: { [Op.in]: ["waiting", "called", "in_progress"] },
      },
    });

    if (existingActiveEntry) {
      res.json({
        queue_entry: {
          id: existingActiveEntry.id,
          token_number: existingActiveEntry.token_number,
          position: 1,
        },
      });
      return;
    }

    appointment.status = "checked_in";
    await appointment.save();

    const resolvedDepartmentId = department_id || appointment.department_id;
    if (!resolvedDepartmentId) {
      res.status(400).json({ error: "Department ID required for check-in" });
      return;
    }

    const tokenNumber = `Q${Date.now().toString().slice(-6)}`;

    const queueEntry: any = await QueueEntry.create({
      appointment_id,
      patient_id: appointment.patient_id,
      department_id: resolvedDepartmentId,
      token_number: tokenNumber,
      priority: priority || "standard",
      status: "waiting",
    });

    if (req.user && req.auditLog) {
      await req.auditLog(
        req.user.id || req.user.userId,
        "patient_checked_in",
        "queue_entries",
        queueEntry.id,
        req.clientIp || "",
      );
    }

    const payload = {
      queue_entry: {
        id: queueEntry.id,
        token_number: queueEntry.token_number,
        position: 1,
      },
    };

    // Keep temporary compatibility with old frontend shape.
    res.json({
      ...payload,
      entry: payload.queue_entry,
    });
  } catch (error) {
    console.error("Check-in error:", error);
    res.status(500).json({ error: "Check-in failed" });
  }
};

// Update queue status
export const updateQueueStatus = async (
  req: any,
  res: Response,
): Promise<void> => {
  try {
    const { queue_id, status } = req.body;
    const resolvedQueueId = req.params.id || queue_id;

    if (!resolvedQueueId || !status) {
      res.status(400).json({ error: "Queue ID and status required" });
      return;
    }

    const queueEntry: any = await QueueEntry.findByPk(resolvedQueueId);
    if (!queueEntry) {
      res.status(404).json({ error: "Queue entry not found" });
      return;
    }

    queueEntry.status = status;
    if (status === "called") {
      queueEntry.called_at = new Date();
    } else if (status === "completed") {
      queueEntry.completed_at = new Date();
    }
    await queueEntry.save();

    if (req.user && req.auditLog) {
      await req.auditLog(
        req.user.id || req.user.userId,
        "queue_status_updated",
        "queue_entries",
        resolvedQueueId,
        req.clientIp || "",
      );
    }

    res.json({ queueEntry });
  } catch (error) {
    console.error("Update queue error:", error);
    res.status(500).json({ error: "Failed to update queue" });
  }
};

// Reschedule appointment
export const rescheduleAppointment = async (
  req: any,
  res: Response,
): Promise<void> => {
  try {
    const { appointment_id, new_scheduled_at } = req.body;

    if (!appointment_id || !new_scheduled_at) {
      res.status(400).json({ error: "Appointment ID and new date required" });
      return;
    }

    const appointment: any = await Appointment.findByPk(appointment_id);
    if (!appointment) {
      res.status(404).json({ error: "Appointment not found" });
      return;
    }

    appointment.scheduled_at = new Date(new_scheduled_at);
    await appointment.save();

    if (req.user && req.auditLog) {
      await req.auditLog(
        req.user.id || req.user.userId,
        "appointment_rescheduled",
        "appointments",
        appointment_id,
        req.clientIp || "",
      );
    }

    res.json({ appointment });
  } catch (error) {
    console.error("Reschedule error:", error);
    res.status(500).json({ error: "Failed to reschedule appointment" });
  }
};

// Cancel appointment
export const cancelAppointment = async (
  req: any,
  res: Response,
): Promise<void> => {
  try {
    const { appointment_id } = req.body;

    const appointment: any = await Appointment.findByPk(appointment_id);
    if (!appointment) {
      res.status(404).json({ error: "Appointment not found" });
      return;
    }

    appointment.status = "cancelled";
    await appointment.save();

    if (req.user && req.auditLog) {
      await req.auditLog(
        req.user.id || req.user.userId,
        "appointment_cancelled",
        "appointments",
        appointment_id,
        req.clientIp || "",
      );
    }

    res.json({ message: "Appointment cancelled" });
  } catch (error) {
    console.error("Cancel error:", error);
    res.status(500).json({ error: "Failed to cancel appointment" });
  }
};

export default {
  getLiveQueue,
  bookAppointment,
  checkInPatient,
  updateQueueStatus,
  rescheduleAppointment,
  cancelAppointment,
};
