# HDMS Quick Start Guide

## Installation & Running the Project

### 1. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env` to configure:
- `JWT_SECRET` - Change to a strong secret
- `ENCRYPTION_KEY` - Must be exactly 32 characters
- Other settings as needed

Then run:
```bash
npm run dev
```

Server will start on `http://localhost:5000`

### 2. Frontend Setup (in another terminal)

```bash
cd frontend
npm install
npm run dev
```

Frontend will start on `http://localhost:5173`

### 3. Access the Application

Open your browser and go to: `http://localhost:5173`

**Login Page** will redirect you to authentication

## Default Admin Login (Development)

The backend bootstraps a hardcoded admin account on startup (if it does not already exist).

- Email: `admin@hdms.local`
- Password: `AdminPassword123`

Login via the frontend at `http://localhost:5173/login`, or via API:

```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
   -H "Content-Type: application/json" \
   -d '{"email":"admin@hdms.local","password":"AdminPassword123"}'
```

Note: this hardcoded account is for development/testing only and must be removed before production.

## Project Structure

```
PROJECT/
├── backend/
│   ├── src/
│   │   ├── config/          # Database configuration
│   │   ├── models/          # Sequelize models
│   │   ├── controllers/     # Route handlers
│   │   ├── routes/          # API routes
│   │   ├── middleware/      # Auth, audit, error handlers
│   │   ├── utils/           # Encryption, JWT, helpers
│   │   └── server.js        # Express app entry point
│   ├── package.json
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Page components
│   │   ├── utils/           # API client, auth context
│   │   ├── App.jsx          # Main app
│   │   └── main.jsx         # React entry point
│   ├── index.html
│   ├── package.json
│   └── tailwind.config.js
│
├── PRD.md                   # Project requirements
└── README.md
```

## Key Features Implemented

✅ **Authentication**
- JWT tokens with refresh rotation
- Bcrypt password hashing
- Role-based access control (RBAC)
- Account lockout after 5 failed attempts

✅ **Database**
- SQLite with Sequelize ORM
- 10 interconnected tables
- Automatic schema sync on startup

✅ **Security**
- AES-256-GCM encryption for EHR data
- HTTPS-ready (TLS configuration)
- Audit logging for all operations
- Server-side RBAC enforcement

✅ **Queue Management**
- Appointment booking/cancellation
- Patient check-in with tokens
- Live queue dashboard
- Priority levels (Emergency, Elderly/Disabled, Standard)

✅ **EHR System**
- Encrypted record storage
- Granular access control
- Full audit trail
- Support for multiple record types

✅ **Pharmacy**
- Prescription issuance
- Medication inventory tracking
- Low-stock and expiry alerts
- Dispensing workflow

✅ **Vitals**
- Manual vital sign entry
- Abnormal reading detection
- Patient history tracking
- Urgent triage flags

## API Endpoints Summary

All endpoints prefixed with `/api/v1`

### Auth
- `POST /auth/login` (public)
- `POST /auth/register` (admin only)
- `POST /auth/refresh`
- `POST /auth/logout`

### Queue
- `GET /queue`
- `POST /appointments`
- `PUT /appointments/:id`
- `DELETE /appointments/:id`
- `POST /queue/checkin`
- `PUT /queue/:id/status`

### EHR
- `GET /ehr/:patientId`
- `POST /ehr/:patientId`
- `PUT /ehr/:id`
- `GET /ehr/admin/audit-logs`

### Pharmacy
- `POST /prescriptions`
- `GET /prescriptions/queue`
- `PUT /prescriptions/:id/approve`
- `PUT /prescriptions/:id/reject`
- `PUT /prescriptions/:id/dispense`
- `GET /inventory`
- `PUT /inventory/:id`

### Vitals
- `POST /vitals`
- `GET /vitals/:patientId`
- `GET /vitals/alerts`

## User Roles

| Role | Default Permissions |
|------|---|
| **Patient** | View own records, book appointments, record vitals |
| **Nurse** | View queue, record vitals, read EHR |
| **Doctor** | Full EHR access, issue prescriptions |
| **Pharmacist** | Manage prescriptions, inventory |
| **Admin** | All permissions, user management |

## Development Notes

- **Database**: SQLite file created automatically at `backend/database.sqlite`
- **Encryption Key**: Store securely in production (use environment variables)
- **CORS**: Configured for `http://localhost:5173` - update for production
- **Timestamps**: All tables include `createdAt` and `updatedAt`

## Next Steps for Production

1. **Environment Setup**
   - Change all secrets and keys
   - Set `NODE_ENV=production`
   - Configure real SMTP for emails

2. **Database**
   - Migrate from SQLite to PostgreSQL/MySQL
   - Implement database backups
   - Set up replication if needed

3. **Deployment**
   - Set up CI/CD pipeline
   - Configure HTTPS/TLS
   - Deploy to cloud provider (AWS, GCP, Azure)
   - Set up monitoring and logging

4. **Security Hardening**
   - Rate limiting on API endpoints
   - Input validation on all endpoints
   - Security headers (HELMET.js)
   - Database encryption at rest

5. **Testing**
   - Unit tests with Jest
   - Integration tests
   - End-to-end tests with Cypress

6. **Compliance**
   - NDPR audit compliance checks
   - Data residency requirements
   - Regular security audits

## Troubleshooting

**Backend won't start:**
- Check if port 5000 is in use: `lsof -i :5000`
- Verify Node.js version: `node --version` (need 16+)
- Check `.env` file exists and has required variables

**Frontend won't connect to backend:**
- Ensure backend is running on port 5000
- Check CORS origin in `.env`
- Check browser console for errors

**Encryption errors:**
- Verify `ENCRYPTION_KEY` length is exactly 32 characters
- Check that IV and authTag are properly stored and retrieved

---

For more details, see README.md and PRD.md
