import { Request, Response } from "express";
import { User, Patient } from "../models/index.js";
import sequelize from "../config/database.js";
import {
  hashPassword,
  comparePassword,
  validatePasswordPolicy,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../utils/authUtils.js";
import validator from "email-validator";

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

// Login
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "Email and password required" });
      return;
    }

    const user: any = await User.findOne({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    // Check if account is locked
    if (user.locked_until && new Date() < new Date(user.locked_until)) {
      res.status(429).json({ error: "Account locked. Try again later." });
      return;
    }

    const passwordMatch = await comparePassword(password, user.password_hash);

    if (!passwordMatch) {
      user.failed_login_attempts += 1;
      if (user.failed_login_attempts >= 5) {
        user.locked_until = new Date(Date.now() + 15 * 60 * 1000); // 15 min lock
      }
      await user.save();
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    user.failed_login_attempts = 0;
    user.locked_until = null;
    user.last_login = new Date();
    await user.save();

    const accessToken = generateAccessToken(user.id, user.role);
    const refreshToken = generateRefreshToken(user.id);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
};

// Public Signup (For initial user creation)
export const signup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ error: "All fields required" });
      return;
    }

    if (!validator.validate(email)) {
      res.status(400).json({ error: "Invalid email format" });
      return;
    }

    if (!validatePasswordPolicy(password)) {
      res
        .status(400)
        .json({ error: "Password must be at least 10 characters" });
      return;
    }

    const existingUser = await User.findOne({
      where: { email: email.toLowerCase() },
    });
    if (existingUser) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }

    const passwordHash = await hashPassword(password);

    const newUser: any = await sequelize.transaction(async (transaction) => {
      const createdUser: any = await User.create(
        {
          name,
          email: email.toLowerCase(),
          password_hash: passwordHash,
          role: "patient", // Default role
        },
        { transaction },
      );

      // Create a minimal patient profile so downstream workflows (appointments, vitals, EHR)
      // can reference patient_id immediately after signup.
      await Patient.create(
        {
          user_id: createdUser.id,
          date_of_birth: new Date("1970-01-01"),
        },
        { transaction },
      );

      return createdUser;
    });

    res.status(201).json({
      message: "User created successfully. Please log in.",
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
      },
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ error: "Signup failed" });
  }
};

// Register (Admin only)
export const register = async (
  req: any,
  res: Response,
): Promise<void> => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      res.status(400).json({ error: "All fields required" });
      return;
    }

    if (!validator.validate(email)) {
      res.status(400).json({ error: "Invalid email format" });
      return;
    }

    if (!validatePasswordPolicy(password)) {
      res
        .status(400)
        .json({ error: "Password must be at least 10 characters" });
      return;
    }

    const existingUser = await User.findOne({
      where: { email: email.toLowerCase() },
    });
    if (existingUser) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }

    const passwordHash = await hashPassword(password);

    const newUser: any = await sequelize.transaction(async (transaction) => {
      const createdUser: any = await User.create(
        {
          name,
          email: email.toLowerCase(),
          password_hash: passwordHash,
          role,
        },
        { transaction },
      );

      if (role === "patient") {
        await Patient.create(
          {
            user_id: createdUser.id,
            date_of_birth: new Date("1970-01-01"),
          },
          { transaction },
        );
      }

      return createdUser;
    });

    if (req.user && req.auditLog) {
      await req.auditLog(
        req.user.id || req.user.userId,
        "user_created",
        "users",
        newUser.id,
        req.clientIp || "",
      );
    }

    res.status(201).json({
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ error: "Registration failed" });
  }
};

// List users (Admin only)
export const listUsers = async (
  req: any,
  res: Response,
): Promise<void> => {
  try {
    const users: any[] = await User.findAll({
      attributes: ["id", "name", "email", "role", "is_active", "createdAt"],
      order: [["createdAt", "DESC"]],
    });

    res.json({ users });
  } catch (error) {
    console.error("List users error:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
};

// Refresh token
export const refreshToken = (req: Request, res: Response): void => {
  try {
    const token = req.cookies?.refreshToken;

    if (!token) {
      res.status(401).json({ error: "No refresh token provided" });
      return;
    }

    const decoded = verifyRefreshToken(token);
    const accessToken = generateAccessToken(decoded.userId, decoded.role);

    res.json({ accessToken });
  } catch (error) {
    res.status(401).json({ error: "Invalid refresh token" });
  }
};

// Logout
export const logout = (req: Request, res: Response): void => {
  res.clearCookie("refreshToken");
  res.json({ message: "Logged out successfully" });
};

export default { login, signup, register, listUsers, refreshToken, logout };
