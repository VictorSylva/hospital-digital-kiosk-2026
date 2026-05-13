# Hospital Digital Health Management System — MVP PRD
**Version:** MVP 1.0 | **Date:** March 2026 | **Status:** Draft

---

## 1. Overview

The HDMS MVP is a focused, deployable healthcare platform covering the four core workflows:
**Queue Management**, **EHR with Encryption**, **Tele-Pharmacy**, and **Vital-Sign Capture** (manual entry).

**Stack:** Express.js (backend) · React.js + Vite + Tailwind (frontend) · SQLite + Sequelize ORM

---

## 2. Scope

### In Scope
- Patient appointment booking and queue management
- AES-256 encrypted Electronic Health Records with RBAC
- Tele-Pharmacy: prescription issuance, validation, and inventory tracking
- Vital-sign capture via **manual entry** (no hardware peripherals in MVP)
- RESTful API consumed by the React frontend
- JWT authentication with role-based access

### Out of Scope (MVP)
- Hardware peripheral integration (Bluetooth/USB sensors, barcode scanners)
- Native mobile apps
- Insurance/billing integrations
- Multi-hospital federation
- Drug interaction checks (deferred to v1.1)
- VPN / VLAN infrastructure setup

---

## 3. User Roles

| Role | Key Capabilities |
|---|---|
| **Patient** | Book appointments, check in, view own records and vitals |
| **Nurse** | View queue, record/review vitals, read EHR |
| **Doctor** | Full EHR read/write, issue prescriptions |
| **Pharmacist** | Validate and dispense prescriptions, manage inventory |
| **Admin** | Manage users/roles, export audit logs |

---

## 4. Functional Requirements

### 4.1 Queue Management

| ID | Requirement |
|---|---|
| FR-Q01 | Patients can book, reschedule, and cancel appointments via web portal |
| FR-Q02 | System sends email/SMS confirmation on booking |
| FR-Q03 | Patient checks in via web portal or receptionist terminal; system assigns queue token |
| FR-Q04 | Live queue dashboard shows name, department, wait time, and status; refreshes every 10 seconds |
| FR-Q05 | Clinicians update status: In Consultation / Complete / No Show |
| FR-Q06 | Priority levels supported: Emergency > Elderly/Disabled > Standard |

### 4.2 EHR + Encryption

| ID | Requirement |
|---|---|
| FR-E01 | All PII fields encrypted at rest using AES-256-GCM; keys stored in environment variables only |
| FR-E02 | All API traffic over HTTPS (TLS 1.2 minimum) |
| FR-E03 | RBAC enforced server-side: Doctors read/write; Nurses read; Patients read own records only |
| FR-E04 | Every EHR read/write/update logs: timestamp, user ID, action, record ID, IP address |
| FR-E05 | Audit logs are append-only; exportable as CSV by Admin |

### 4.3 Tele-Pharmacy

| ID | Requirement |
|---|---|
| FR-P01 | Doctors issue prescriptions with: drug name, dosage, frequency, duration, route |
| FR-P02 | Issued prescriptions appear in pharmacist worklist immediately |
| FR-P03 | Pharmacists approve, reject (with reason), or flag prescriptions for clarification |
| FR-P04 | Dispensing updates patient EHR medication history and deducts from inventory atomically |
| FR-P05 | Inventory tracks quantity, expiry date, and reorder threshold |
| FR-P06 | Low-stock and expiry alerts shown as in-app notifications to pharmacist |

### 4.4 Vital-Sign Capture (Manual Entry)

| ID | Requirement |
|---|---|
| FR-V01 | Nurse or patient enters vitals manually: temperature, weight, blood pressure, SpO2 |
| FR-V02 | Abnormal readings (e.g. temp > 38°C) flag the patient record for urgent triage |
| FR-V03 | Submitted vitals are saved to patient EHR and visible to clinical staff |
| FR-V04 | Walk-in patients can be registered and have vitals recorded without a prior appointment |

---

## 5. Non-Functional Requirements

| ID | Requirement | Target |
|---|---|---|
| NFR-P01 | API response time (p95) | < 300 ms |
| NFR-P02 | Queue dashboard refresh latency | < 2 seconds |
| NFR-P03 | Concurrent users | Up to 200 sessions (Phase 1) |
| NFR-S01 | Encryption at rest | AES-256-GCM for all PII |
| NFR-S02 | Authentication | JWT (15-min access token + 7-day refresh in HTTP-only cookie) |
| NFR-S03 | Password policy | Bcrypt cost 12, min 10 chars |
| NFR-S04 | Session timeout | Auto-logout after 30 mins inactivity |
| NFR-S05 | Brute-force protection | Account lock after 5 failed logins for 15 minutes |
| NFR-A01 | System uptime | 99.5% monthly |
| NFR-A02 | Data backup | SQLite backup every 6 hours; retained 30 days |
| NFR-M01 | Test coverage | ≥ 80% unit test coverage (Jest / Vitest) |
| NFR-M02 | API documentation | OpenAPI 3.0 at `/api/docs` |
| NFR-C01 | Compliance | NDPR 2019 — explicit consent at registration |

---

## 6. Database Tables (MVP)

| Table | Key Fields |
|---|---|
| `users` | id, name, email, password_hash, role, is_active |
| `patients` | id, user_id, date_of_birth, national_id, consent_given_at |
| `appointments` | id, patient_id, doctor_id, department_id, scheduled_at, status |
| `queue_entries` | id, appointment_id, token_number, priority, status, called_at |
| `ehr_records` | id, patient_id, record_type, encrypted_content, iv, created_by, created_at |
| `audit_logs` | id, user_id, action, table_name, record_id, ip_address, timestamp |
| `prescriptions` | id, ehr_record_id, doctor_id, status, drug_hash, issued_at |
| `inventory` | id, drug_name, quantity, unit, expiry_date, reorder_threshold |
| `vital_signs` | id, patient_id, temperature, weight, blood_pressure, spo2, captured_at |
| `departments` | id, name, code, daily_capacity |

---

## 7. API Endpoints (MVP)

All routes prefixed with `/api/v1`. Auth required unless marked **[PUBLIC]**.

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/login` | Login, receive JWT tokens **[PUBLIC]** |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/logout` | Invalidate refresh token |
| POST | `/auth/register` | Register user (Admin only) |

### Queue
| Method | Endpoint | Description |
|---|---|---|
| GET | `/queue` | Live queue for today (Staff) |
| POST | `/appointments` | Book appointment (Patient/Admin) |
| PUT | `/appointments/:id` | Reschedule (Patient/Admin) |
| DELETE | `/appointments/:id` | Cancel (Patient/Admin) |
| POST | `/queue/checkin` | Check in, receive queue token |
| PUT | `/queue/:id/status` | Update queue status (Staff) |

### EHR
| Method | Endpoint | Description |
|---|---|---|
| GET | `/ehr/:patientId` | Get decrypted EHR (Doctor/Nurse) |
| POST | `/ehr/:patientId` | Create EHR entry (Doctor) |
| PUT | `/ehr/:id` | Update EHR entry (Doctor) |
| GET | `/audit-logs` | Export audit log CSV (Admin) |

### Tele-Pharmacy
| Method | Endpoint | Description |
|---|---|---|
| POST | `/prescriptions` | Issue prescription (Doctor) |
| GET | `/prescriptions/queue` | Pending prescriptions (Pharmacist) |
| PUT | `/prescriptions/:id/dispense` | Dispense and update EHR (Pharmacist) |
| PUT | `/prescriptions/:id/reject` | Reject with reason (Pharmacist) |
| GET | `/inventory` | List inventory (Pharmacist/Admin) |
| PUT | `/inventory/:id` | Update stock (Pharmacist) |
| GET | `/inventory/alerts` | Low-stock / expiry alerts |

### Vitals
| Method | Endpoint | Description |
|---|---|---|
| POST | `/vitals` | Submit manual vitals reading (Nurse/Patient) |
| GET | `/vitals/:patientId` | Vitals history (Doctor/Nurse) |
| GET | `/vitals/alerts` | Patients with abnormal readings (Staff) |

---

## 8. MVP Milestones

| Phase | Deliverable | Target |
|---|---|---|
| 0 | Repo setup, CI/CD, DB schema, auth scaffold | Wk 1–2 |
| 1 | Queue Management (booking, check-in, dashboard) | Wk 3–5 |
| 2 | EHR encryption, RBAC, audit trail | Wk 6–8 |
| 3 | Tele-Pharmacy (prescriptions, inventory, alerts) | Wk 9–11 |
| 4 | Vital-sign manual entry + triage flags | Wk 12–13 |
| 5 | Integration, QA, accessibility, UAT | Wk 14–16 |

---

## 9. Definition of Done

A feature is **DONE** when:
- [ ] Code reviewed and approved by ≥ 1 peer
- [ ] Unit tests passing with ≥ 80% coverage
- [ ] OpenAPI spec updated for new/modified endpoints
- [ ] No new HIGH/CRITICAL vulnerabilities (`npm audit`)
- [ ] Product Owner sign-off
- [ ] Deployed to staging and smoke-tested

---

*HDMS MVP PRD v1.0 — Confidential — Internal Use Only*