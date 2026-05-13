import { Request, Response } from "express";
import { Department } from "../models/index.js";
import { Op } from "sequelize";

interface AuthenticatedRequest extends Request {
  user?: any;
}

export const listDepartments = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const departments: any[] = await Department.findAll({
      order: [["name", "ASC"]],
    });

    res.json({ departments });
  } catch (error) {
    console.error("List departments error:", error);
    res.status(500).json({ error: "Failed to fetch departments" });
  }
};

export const createDepartment = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const { name, code, daily_capacity, description } = req.body;

    if (!name || !code) {
      res.status(400).json({ error: "name and code are required" });
      return;
    }

    const normalizedCode = String(code).trim().toUpperCase();

    const existing = await Department.findOne({
      where: {
        [Op.or]: [{ code: normalizedCode }, { name: String(name).trim() }],
      },
    });

    if (existing) {
      res
        .status(409)
        .json({ error: "Department with this name or code already exists" });
      return;
    }

    const department: any = await Department.create({
      name: String(name).trim(),
      code: normalizedCode,
      daily_capacity: daily_capacity ?? 50,
      description: description ?? null,
    });

    res.status(201).json({ department });
  } catch (error) {
    console.error("Create department error:", error);
    res.status(500).json({ error: "Failed to create department" });
  }
};

export default {
  listDepartments,
  createDepartment,
};
