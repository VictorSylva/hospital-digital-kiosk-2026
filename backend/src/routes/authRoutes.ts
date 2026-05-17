import express from "express";
import {
  login,
  signup,
  register,
  listUsers,
  updateUser,
  deleteUser,
  refreshToken,
  logout,
} from "../controllers/authController.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = express.Router();

router.post("/login", login);
router.post("/signup", signup); // Public signup for initial user creation
router.post("/register", authenticate, authorize("admin"), register); // Admin only
router.get("/users", authenticate, authorize("admin"), listUsers);
router.put("/users/:id", authenticate, authorize("admin"), updateUser);
router.delete("/users/:id", authenticate, authorize("admin"), deleteUser);
router.post("/refresh", refreshToken);
router.post("/logout", logout);

export default router;
