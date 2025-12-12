import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import {
  CreateDoctorSchema,
  CreatePatientSchema,
  CreateAppointmentSchema,
  CreateMedicineSchema,
  CreatePrescriptionSchema,
  CreatePaymentSchema,
  CreatePatientHistorySchema,
} from "@/shared/types";

const app = new Hono<{ Bindings: Env }>();

// Doctors endpoints
app.get("/api/doctors", async (c) => {
  const doctors = await c.env.DB.prepare(
    "SELECT * FROM doctors ORDER BY name"
  ).all();
  return c.json(doctors.results);
});

app.get("/api/doctors/:id", async (c) => {
  const id = c.req.param("id");
  const doctor = await c.env.DB.prepare(
    "SELECT * FROM doctors WHERE id = ?"
  ).bind(id).first();
  
  if (!doctor) {
    return c.json({ error: "Doctor not found" }, 404);
  }
  
  return c.json(doctor);
});

app.post("/api/doctors", zValidator("json", CreateDoctorSchema), async (c) => {
  const data = c.req.valid("json");
  
  const result = await c.env.DB.prepare(
    `INSERT INTO doctors (name, specialty, email, phone, qualification, experience_years, consultation_fee, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
  ).bind(
    data.name,
    data.specialty,
    data.email,
    data.phone || null,
    data.qualification || null,
    data.experience_years || null,
    data.consultation_fee || null
  ).run();
  
  const doctor = await c.env.DB.prepare(
    "SELECT * FROM doctors WHERE id = ?"
  ).bind(result.meta.last_row_id).first();
  
  return c.json(doctor, 201);
});

app.put("/api/doctors/:id", zValidator("json", CreateDoctorSchema), async (c) => {
  const id = c.req.param("id");
  const data = c.req.valid("json");
  
  await c.env.DB.prepare(
    `UPDATE doctors SET name = ?, specialty = ?, email = ?, phone = ?, 
     qualification = ?, experience_years = ?, consultation_fee = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  ).bind(
    data.name,
    data.specialty,
    data.email,
    data.phone || null,
    data.qualification || null,
    data.experience_years || null,
    data.consultation_fee || null,
    id
  ).run();
  
  const doctor = await c.env.DB.prepare(
    "SELECT * FROM doctors WHERE id = ?"
  ).bind(id).first();
  
  return c.json(doctor);
});

app.delete("/api/doctors/:id", async (c) => {
  const id = c.req.param("id");
  await c.env.DB.prepare("DELETE FROM doctors WHERE id = ?").bind(id).run();
  return c.json({ success: true });
});

// Patients endpoints
app.get("/api/patients", async (c) => {
  const patients = await c.env.DB.prepare(
    "SELECT * FROM patients ORDER BY name"
  ).all();
  return c.json(patients.results);
});

app.get("/api/patients/:id", async (c) => {
  const id = c.req.param("id");
  const patient = await c.env.DB.prepare(
    "SELECT * FROM patients WHERE id = ?"
  ).bind(id).first();
  
  if (!patient) {
    return c.json({ error: "Patient not found" }, 404);
  }
  
  return c.json(patient);
});

app.post("/api/patients", zValidator("json", CreatePatientSchema), async (c) => {
  const data = c.req.valid("json");
  
  const result = await c.env.DB.prepare(
    `INSERT INTO patients (name, email, phone, date_of_birth, gender, address, blood_group, medical_history, 
     age, patient_type, has_diabetes, has_hypertension, has_sugar_issues, family_medical_history, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
  ).bind(
    data.name,
    data.email,
    data.phone,
    data.date_of_birth || null,
    data.gender || null,
    data.address || null,
    data.blood_group || null,
    data.medical_history || null,
    data.age || null,
    data.patient_type || 'outpatient',
    data.has_diabetes ? 1 : 0,
    data.has_hypertension ? 1 : 0,
    data.has_sugar_issues ? 1 : 0,
    data.family_medical_history || null
  ).run();
  
  const patient = await c.env.DB.prepare(
    "SELECT * FROM patients WHERE id = ?"
  ).bind(result.meta.last_row_id).first();
  
  return c.json(patient, 201);
});

app.put("/api/patients/:id", zValidator("json", CreatePatientSchema), async (c) => {
  const id = c.req.param("id");
  const data = c.req.valid("json");
  
  await c.env.DB.prepare(
    `UPDATE patients SET name = ?, email = ?, phone = ?, date_of_birth = ?, 
     gender = ?, address = ?, blood_group = ?, medical_history = ?, 
     age = ?, patient_type = ?, has_diabetes = ?, has_hypertension = ?, 
     has_sugar_issues = ?, family_medical_history = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  ).bind(
    data.name,
    data.email,
    data.phone,
    data.date_of_birth || null,
    data.gender || null,
    data.address || null,
    data.blood_group || null,
    data.medical_history || null,
    data.age || null,
    data.patient_type || 'outpatient',
    data.has_diabetes ? 1 : 0,
    data.has_hypertension ? 1 : 0,
    data.has_sugar_issues ? 1 : 0,
    data.family_medical_history || null,
    id
  ).run();
  
  const patient = await c.env.DB.prepare(
    "SELECT * FROM patients WHERE id = ?"
  ).bind(id).first();
  
  return c.json(patient);
});

app.delete("/api/patients/:id", async (c) => {
  const id = c.req.param("id");
  await c.env.DB.prepare("DELETE FROM patients WHERE id = ?").bind(id).run();
  return c.json({ success: true });
});

// Appointments endpoints
app.get("/api/appointments", async (c) => {
  const appointments = await c.env.DB.prepare(
    `SELECT a.*, d.name as doctor_name, d.specialty as doctor_specialty, p.name as patient_name
     FROM appointments a
     LEFT JOIN doctors d ON a.doctor_id = d.id
     LEFT JOIN patients p ON a.patient_id = p.id
     ORDER BY a.appointment_date DESC`
  ).all();
  return c.json(appointments.results);
});

app.get("/api/appointments/:id", async (c) => {
  const id = c.req.param("id");
  const appointment = await c.env.DB.prepare(
    `SELECT a.*, d.name as doctor_name, d.specialty as doctor_specialty, p.name as patient_name
     FROM appointments a
     LEFT JOIN doctors d ON a.doctor_id = d.id
     LEFT JOIN patients p ON a.patient_id = p.id
     WHERE a.id = ?`
  ).bind(id).first();
  
  if (!appointment) {
    return c.json({ error: "Appointment not found" }, 404);
  }
  
  return c.json(appointment);
});

app.post("/api/appointments", zValidator("json", CreateAppointmentSchema), async (c) => {
  const data = c.req.valid("json");
  
  const result = await c.env.DB.prepare(
    `INSERT INTO appointments (doctor_id, patient_id, appointment_date, reason, symptoms, 
     is_emergency, appointment_day, appointment_time, reminder_date, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
  ).bind(
    data.doctor_id,
    data.patient_id,
    data.appointment_date,
    data.reason || null,
    data.symptoms || null,
    data.is_emergency ? 1 : 0,
    data.appointment_day || null,
    data.appointment_time || null,
    data.reminder_date || null
  ).run();
  
  const appointment = await c.env.DB.prepare(
    `SELECT a.*, d.name as doctor_name, d.specialty as doctor_specialty, p.name as patient_name
     FROM appointments a
     LEFT JOIN doctors d ON a.doctor_id = d.id
     LEFT JOIN patients p ON a.patient_id = p.id
     WHERE a.id = ?`
  ).bind(result.meta.last_row_id).first();
  
  return c.json(appointment, 201);
});

app.put("/api/appointments/:id/status", async (c) => {
  const id = c.req.param("id");
  const { status } = await c.req.json();
  
  await c.env.DB.prepare(
    "UPDATE appointments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
  ).bind(status, id).run();
  
  const appointment = await c.env.DB.prepare(
    "SELECT * FROM appointments WHERE id = ?"
  ).bind(id).first();
  
  return c.json(appointment);
});

app.delete("/api/appointments/:id", async (c) => {
  const id = c.req.param("id");
  await c.env.DB.prepare("DELETE FROM appointments WHERE id = ?").bind(id).run();
  return c.json({ success: true });
});

// Medicines endpoints
app.get("/api/medicines", async (c) => {
  const medicines = await c.env.DB.prepare(
    "SELECT * FROM medicines ORDER BY name"
  ).all();
  return c.json(medicines.results);
});

app.get("/api/medicines/:id", async (c) => {
  const id = c.req.param("id");
  const medicine = await c.env.DB.prepare(
    "SELECT * FROM medicines WHERE id = ?"
  ).bind(id).first();
  
  if (!medicine) {
    return c.json({ error: "Medicine not found" }, 404);
  }
  
  return c.json(medicine);
});

app.post("/api/medicines", zValidator("json", CreateMedicineSchema), async (c) => {
  const data = c.req.valid("json");
  
  const result = await c.env.DB.prepare(
    `INSERT INTO medicines (name, description, manufacturer, category, stock_quantity, unit_price, expiry_date, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
  ).bind(
    data.name,
    data.description || null,
    data.manufacturer || null,
    data.category || null,
    data.stock_quantity || 0,
    data.unit_price || null,
    data.expiry_date || null
  ).run();
  
  const medicine = await c.env.DB.prepare(
    "SELECT * FROM medicines WHERE id = ?"
  ).bind(result.meta.last_row_id).first();
  
  return c.json(medicine, 201);
});

app.put("/api/medicines/:id", zValidator("json", CreateMedicineSchema), async (c) => {
  const id = c.req.param("id");
  const data = c.req.valid("json");
  
  await c.env.DB.prepare(
    `UPDATE medicines SET name = ?, description = ?, manufacturer = ?, category = ?, 
     stock_quantity = ?, unit_price = ?, expiry_date = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  ).bind(
    data.name,
    data.description || null,
    data.manufacturer || null,
    data.category || null,
    data.stock_quantity || 0,
    data.unit_price || null,
    data.expiry_date || null,
    id
  ).run();
  
  const medicine = await c.env.DB.prepare(
    "SELECT * FROM medicines WHERE id = ?"
  ).bind(id).first();
  
  return c.json(medicine);
});

app.delete("/api/medicines/:id", async (c) => {
  const id = c.req.param("id");
  await c.env.DB.prepare("DELETE FROM medicines WHERE id = ?").bind(id).run();
  return c.json({ success: true });
});

// Prescriptions endpoints
app.get("/api/prescriptions", async (c) => {
  const prescriptions = await c.env.DB.prepare(
    `SELECT pr.*, p.name as patient_name, d.name as doctor_name, m.name as medicine_name
     FROM prescriptions pr
     LEFT JOIN patients p ON pr.patient_id = p.id
     LEFT JOIN doctors d ON pr.doctor_id = d.id
     LEFT JOIN medicines m ON pr.medicine_id = m.id
     ORDER BY pr.prescribed_date DESC`
  ).all();
  return c.json(prescriptions.results);
});

app.post("/api/prescriptions", zValidator("json", CreatePrescriptionSchema), async (c) => {
  const data = c.req.valid("json");
  
  const result = await c.env.DB.prepare(
    `INSERT INTO prescriptions (patient_id, doctor_id, medicine_id, dosage, frequency, duration_days, instructions, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
  ).bind(
    data.patient_id,
    data.doctor_id,
    data.medicine_id,
    data.dosage,
    data.frequency,
    data.duration_days,
    data.instructions || null
  ).run();
  
  const prescription = await c.env.DB.prepare(
    `SELECT pr.*, p.name as patient_name, d.name as doctor_name, m.name as medicine_name
     FROM prescriptions pr
     LEFT JOIN patients p ON pr.patient_id = p.id
     LEFT JOIN doctors d ON pr.doctor_id = d.id
     LEFT JOIN medicines m ON pr.medicine_id = m.id
     WHERE pr.id = ?`
  ).bind(result.meta.last_row_id).first();
  
  return c.json(prescription, 201);
});

app.delete("/api/prescriptions/:id", async (c) => {
  const id = c.req.param("id");
  await c.env.DB.prepare("DELETE FROM prescriptions WHERE id = ?").bind(id).run();
  return c.json({ success: true });
});

// Payments endpoints
app.get("/api/payments", async (c) => {
  const payments = await c.env.DB.prepare(
    `SELECT py.*, p.name as patient_name
     FROM payments py
     LEFT JOIN patients p ON py.patient_id = p.id
     ORDER BY py.payment_date DESC`
  ).all();
  return c.json(payments.results);
});

app.get("/api/payments/patient/:patientId", async (c) => {
  const patientId = c.req.param("patientId");
  const payments = await c.env.DB.prepare(
    `SELECT py.*, p.name as patient_name
     FROM payments py
     LEFT JOIN patients p ON py.patient_id = p.id
     WHERE py.patient_id = ?
     ORDER BY py.payment_date DESC`
  ).bind(patientId).all();
  return c.json(payments.results);
});

app.post("/api/payments", zValidator("json", CreatePaymentSchema), async (c) => {
  const data = c.req.valid("json");
  
  const result = await c.env.DB.prepare(
    `INSERT INTO payments (patient_id, appointment_id, amount, payment_method, payment_status, description, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
  ).bind(
    data.patient_id,
    data.appointment_id || null,
    data.amount,
    data.payment_method || null,
    data.payment_status || 'pending',
    data.description || null
  ).run();
  
  const payment = await c.env.DB.prepare(
    `SELECT py.*, p.name as patient_name
     FROM payments py
     LEFT JOIN patients p ON py.patient_id = p.id
     WHERE py.id = ?`
  ).bind(result.meta.last_row_id).first();
  
  return c.json(payment, 201);
});

app.put("/api/payments/:id/status", async (c) => {
  const id = c.req.param("id");
  const { payment_status } = await c.req.json();
  
  await c.env.DB.prepare(
    "UPDATE payments SET payment_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
  ).bind(payment_status, id).run();
  
  const payment = await c.env.DB.prepare(
    "SELECT * FROM payments WHERE id = ?"
  ).bind(id).first();
  
  return c.json(payment);
});

app.delete("/api/payments/:id", async (c) => {
  const id = c.req.param("id");
  await c.env.DB.prepare("DELETE FROM payments WHERE id = ?").bind(id).run();
  return c.json({ success: true });
});

// Patient History endpoints
app.get("/api/patient-history", async (c) => {
  const history = await c.env.DB.prepare(
    `SELECT ph.*, p.name as patient_name
     FROM patient_history ph
     LEFT JOIN patients p ON ph.patient_id = p.id
     ORDER BY ph.visit_date DESC`
  ).all();
  return c.json(history.results);
});

app.get("/api/patient-history/patient/:patientId", async (c) => {
  const patientId = c.req.param("patientId");
  const history = await c.env.DB.prepare(
    `SELECT ph.*, p.name as patient_name
     FROM patient_history ph
     LEFT JOIN patients p ON ph.patient_id = p.id
     WHERE ph.patient_id = ?
     ORDER BY ph.visit_date DESC`
  ).bind(patientId).all();
  return c.json(history.results);
});

app.post("/api/patient-history", zValidator("json", CreatePatientHistorySchema), async (c) => {
  const data = c.req.valid("json");
  
  const result = await c.env.DB.prepare(
    `INSERT INTO patient_history (patient_id, visit_date, symptoms, diagnosis, treatment, notes, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
  ).bind(
    data.patient_id,
    data.visit_date,
    data.symptoms || null,
    data.diagnosis || null,
    data.treatment || null,
    data.notes || null
  ).run();
  
  const historyRecord = await c.env.DB.prepare(
    `SELECT ph.*, p.name as patient_name
     FROM patient_history ph
     LEFT JOIN patients p ON ph.patient_id = p.id
     WHERE ph.id = ?`
  ).bind(result.meta.last_row_id).first();
  
  return c.json(historyRecord, 201);
});

app.delete("/api/patient-history/:id", async (c) => {
  const id = c.req.param("id");
  await c.env.DB.prepare("DELETE FROM patient_history WHERE id = ?").bind(id).run();
  return c.json({ success: true });
});

// Dashboard stats
app.get("/api/stats", async (c) => {
  const [doctors, patients, appointments, medicines, payments, outpatients, inpatients] = await Promise.all([
    c.env.DB.prepare("SELECT COUNT(*) as count FROM doctors").first(),
    c.env.DB.prepare("SELECT COUNT(*) as count FROM patients").first(),
    c.env.DB.prepare("SELECT COUNT(*) as count FROM appointments WHERE status = 'scheduled'").first(),
    c.env.DB.prepare("SELECT COUNT(*) as count FROM medicines").first(),
    c.env.DB.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE payment_status = 'completed'").first(),
    c.env.DB.prepare("SELECT COUNT(*) as count FROM patients WHERE patient_type = 'outpatient'").first(),
    c.env.DB.prepare("SELECT COUNT(*) as count FROM patients WHERE patient_type = 'inpatient'").first(),
  ]);
  
  return c.json({
    total_doctors: doctors?.count || 0,
    total_patients: patients?.count || 0,
    scheduled_appointments: appointments?.count || 0,
    total_medicines: medicines?.count || 0,
    total_revenue: payments?.total || 0,
    outpatients: outpatients?.count || 0,
    inpatients: inpatients?.count || 0,
  });
});

export default app;
