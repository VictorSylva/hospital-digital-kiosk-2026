import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import sequelize from "./_src/config/database.js";
import { User, Patient } from "./_src/models/index.js";
import { hashPassword } from "./_src/utils/authUtils.js";
import { auditLogMiddleware } from "./_src/middleware/auditLog.js";
import authRoutes from "./_src/routes/authRoutes.js";
import departmentRoutes from "./_src/routes/departmentRoutes.js";
import queueRoutes from "./_src/routes/queueRoutes.js";
import ehrRoutes from "./_src/routes/ehrRoutes.js";
import pharmacyRoutes from "./_src/routes/pharmacyRoutes.js";
import vitalsRoutes from "./_src/routes/vitalsRoutes.js";

dotenv.config();

const app = express();

// Middleware
app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:5173" }));
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
  res.json({ status: "ok" });
});

// Sync database and start server
const PORT = process.env.PORT || 5000;

const HARDCODED_ADMIN = {
  name: "System Admin",
  email: "admin@telemed.com",
  password: "AdminPassword123!",
};

const cleanupSqliteBackupTables = async (): Promise<void> => {
  if (sequelize.getDialect() !== "sqlite") {
    return;
  }

  const [results] = await sequelize.query(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE '%_backup'",
  );

  const backupTableNames = (results as Array<{ name: string }>).map(
    (row) => row.name,
  );

  for (const tableName of backupTableNames) {
    await sequelize.query(`DROP TABLE IF EXISTS \`${tableName}\``);
    console.warn(`Dropped stale SQLite backup table: ${tableName}`);
  }
};

const ensurePatientProfiles = async (): Promise<void> => {
  const patientUsers: any[] = await User.findAll({
    where: { role: "patient" },
  });
  let createdCount = 0;

  for (const user of patientUsers) {
    const existingProfile = await Patient.findOne({
      where: { user_id: user.id },
    });
    if (!existingProfile) {
      await Patient.create({
        user_id: user.id,
        date_of_birth: new Date("1970-01-01"),
      });
      createdCount += 1;
    }
  }

  if (createdCount > 0) {
    console.log(`Backfilled ${createdCount} missing patient profile(s)`);
  }
};

const ensureHardcodedAdmin = async (): Promise<void> => {
  const existingAdmin: any = await User.findOne({
    where: { email: HARDCODED_ADMIN.email },
  });

  if (existingAdmin) {
    return;
  }

  const passwordHash = await hashPassword(HARDCODED_ADMIN.password);

  await User.create({
    name: HARDCODED_ADMIN.name,
    email: HARDCODED_ADMIN.email,
    password_hash: passwordHash,
    role: "admin",
  });

  console.warn(
    `Hardcoded admin created: ${HARDCODED_ADMIN.email} / ${HARDCODED_ADMIN.password}`,
  );
};

const startServer = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    console.log("Database connection successful");

    const syncAlterEnabled = process.env.DB_SYNC_ALTER !== "false";

    if (sequelize.getDialect() === "sqlite") {
      await cleanupSqliteBackupTables();

      // SQLite + Sequelize alter can fail due to stale *_backup tables;
      // use safe sync by default in local/dev.
      await sequelize.sync();
      if (syncAlterEnabled) {
        console.warn(
          "DB_SYNC_ALTER is ignored for sqlite to prevent startup failures.",
        );
      }
    } else {
      // Force sync in production if tables are missing
      await sequelize.sync({ alter: true });
    }

    console.log("Database synchronized");

    await ensureHardcodedAdmin();
    await ensurePatientProfiles();

    if (!process.env.VERCEL) {
      app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
      });
    }
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();

export default app;
