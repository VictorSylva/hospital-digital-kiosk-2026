import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import sequelize from "./config/database.js";
import { User, Patient } from "./models/index.js";
import { hashPassword } from "./utils/authUtils.js";
import { auditLogMiddleware } from "./middleware/auditLog.js";
import authRoutes from "./routes/authRoutes.js";
import departmentRoutes from "./routes/departmentRoutes.js";
import queueRoutes from "./routes/queueRoutes.js";
import ehrRoutes from "./routes/ehrRoutes.js";
import pharmacyRoutes from "./routes/pharmacyRoutes.js";
import vitalsRoutes from "./routes/vitalsRoutes.js";
import { createServer } from "http";
import { initSocket } from "./utils/socket.js";

dotenv.config();

const app = express();
const httpServer = createServer(app);
initSocket(httpServer);

// Middleware
app.use(cors({ origin: "*" })); // Allow all for Render-to-Vercel communication
app.use(express.json());
app.use(auditLogMiddleware);

// Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/departments", departmentRoutes);
app.use("/api/v1/queue", queueRoutes);
app.use("/api/v1/ehr", ehrRoutes);
app.use("/api/v1/prescriptions", pharmacyRoutes);
app.use("/api/v1/vitals", vitalsRoutes);

// Health check
app.get("/api/v1/health", (req: Request, res: Response) => {
  res.json({ status: "ok", environment: process.env.NODE_ENV });
});

// Sync database and start server
const PORT = process.env.PORT || 5000;

const HARDCODED_ADMIN = {
  name: "System Admin",
  email: "admin@telemed.com",
  password: "AdminPassword123!",
};

const ensurePatientProfiles = async (): Promise<void> => {
  try {
    const patientUsers: any[] = await User.findAll({
      where: { role: "patient" },
    });
    for (const user of patientUsers) {
      const existingProfile = await Patient.findOne({
        where: { user_id: user.id },
      });
      if (!existingProfile) {
        await Patient.create({
          user_id: user.id,
          date_of_birth: new Date("1970-01-01"),
        });
      }
    }
  } catch (e) {
    console.error("Patient backfill skipped:", e.message);
  }
};

const ensureHardcodedAdmin = async (): Promise<void> => {
  try {
    const existingAdmin: any = await User.findOne({
      where: { email: HARDCODED_ADMIN.email },
    });

    if (existingAdmin) return;

    const passwordHash = await hashPassword(HARDCODED_ADMIN.password);
    await User.create({
      name: HARDCODED_ADMIN.name,
      email: HARDCODED_ADMIN.email,
      password_hash: passwordHash,
      role: "admin",
    });
    console.log("Admin created successfully");
  } catch (e) {
    console.error("Admin creation skipped:", e.message);
  }
};

const startServer = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    console.log("Database connection successful");

    // Sync tables (Safe for Render)
    await sequelize.sync();
    console.log("Database synchronized");

    await ensureHardcodedAdmin();
    await ensurePatientProfiles();

    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

// Global error handler
app.use((err: any, req: Request, res: Response, next: any) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({ 
    error: err.message || 'An unexpected error occurred' 
  });
});

startServer();

export default app;
