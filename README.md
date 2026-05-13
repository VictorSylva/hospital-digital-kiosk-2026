# Hospital Digital Health Management System (HDMS)

A comprehensive healthcare platform for managing patient appointments, electronic health records, prescriptions, and vital signs.

## 📋 Features

- **Queue Management**: Patient appointments, check-in, live queue dashboard
- **Electronic Health Records (EHR)**: AES-256 encrypted patient records with audit trails
- **Tele-Pharmacy**: Prescription issuance, validation, and inventory tracking
- **Vital Signs**: Manual vital sign entry with abnormal reading detection
- **Authentication & RBAC**: JWT-based auth with role-based access control
- **Audit Logging**: Comprehensive audit trail for compliance

## 🏗️ Architecture

### Backend
- **Framework**: Express.js
- **Database**: SQLite + Sequelize ORM
- **Security**: JWT, AES-256 encryption, bcrypt hashing
- **API**: RESTful with OpenAPI documentation

### Frontend
- **Framework**: React 18 + Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router v6
- **HTTP Client**: Axios

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ and npm
- Git

### Installation

1. **Clone/Initialize Project**
```bash
cd PROJECT
npm install
```

2. **Backend Setup**
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
npm run dev
```

3. **Frontend Setup** (in a new terminal)
```bash
cd frontend
npm install
npm run dev
```

The application will be available at `http://localhost:5173`

## 📚 API Documentation

### Authentication
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/register` - Register user (admin only)
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - Logout

### Queue Management
- `GET /api/v1/queue` - Get live queue
- `POST /api/v1/appointments` - Book appointment
- `PUT /api/v1/appointments/:id` - Reschedule appointment
- `DELETE /api/v1/appointments/:id` - Cancel appointment
- `POST /api/v1/queue/checkin` - Check in patient

### EHR
- `GET /api/v1/ehr/:patientId` - Get patient records
- `POST /api/v1/ehr/:patientId` - Create EHR entry
- `PUT /api/v1/ehr/:id` - Update EHR entry
- `GET /api/v1/ehr/admin/audit-logs` - Export audit logs (admin)

### Pharmacy
- `POST /api/v1/prescriptions` - Issue prescription
- `GET /api/v1/prescriptions/queue` - Get pending prescriptions
- `PUT /api/v1/prescriptions/:id/approve` - Approve prescription
- `PUT /api/v1/prescriptions/:id/reject` - Reject prescription
- `PUT /api/v1/prescriptions/:id/dispense` - Dispense prescription

### Vitals
- `POST /api/v1/vitals` - Submit vital signs
- `GET /api/v1/vitals/:patientId` - Get vital signs history
- `GET /api/v1/vitals/alerts` - Get abnormal readings

## 👥 User Roles

| Role | Capabilities |
|------|--------------|
| **Patient** | Book appointments, view own records and vitals |
| **Nurse** | Record vitals, view queue, read EHR |
| **Doctor** | Full EHR access, issue prescriptions |
| **Pharmacist** | Manage prescriptions, inventory, alerts |
| **Admin** | Manage users, export audit logs |

## 🔐 Security Features

- **AES-256-GCM encryption** for EHR data at rest
- **TLS 1.2+ HTTPS** for all API traffic
- **JWT tokens** with 15-min expiry and refresh rotation
- **Bcrypt hashing** (cost 12) for passwords
- **RBAC** enforced server-side
- **Brute-force protection** with account lockout
- **Comprehensive audit logging** of all data access
- **NDPR compliance** with explicit consent tracking

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

## 📦 Deployment

### Backend
```bash
cd backend
npm run build
npm start
```

### Frontend
```bash
cd frontend
npm run build
# Serve dist/ folder with any web server
```

## 📝 Environment Variables

See `.env.example` files in backend and frontend directories for complete configuration options.

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Ensure tests pass
4. Submit a pull request

## 📄 License

ISC

## 📞 Support

For issues or questions, please refer to the PRD.md file for project specifications.

---

**HDMS MVP v1.0** - Confidential - Internal Use Only
