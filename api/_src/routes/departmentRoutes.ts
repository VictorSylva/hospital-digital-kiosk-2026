import express from "express";
import {
  createDepartment,
  listDepartments,
} from "../controllers/departmentController.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = express.Router();

router.get("/", listDepartments);
router.post("/", authenticate, authorize("admin"), createDepartment);

export default router;
