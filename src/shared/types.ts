import z from "zod";

// Doctor schema and type
export const DoctorSchema = z.object({
  id: z.number(),
  name: z.string(),
  specialty: z.string(),
  email: z.string().email(),
  phone: z.string().nullable(),
  qualification: z.string().nullable(),
  experience_years: z.number().nullable(),
  consultation_fee: z.number().nullable(),
  is_available: z.number().int(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Doctor = z.infer<typeof DoctorSchema>;

export const CreateDoctorSchema = z.object({
  name: z.string().min(1),
  specialty: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  qualification: z.string().optional(),
  experience_years: z.number().optional(),
  consultation_fee: z.number().optional(),
});

// Patient schema and type
export const PatientSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
  phone: z.string(),
  date_of_birth: z.string().nullable(),
  gender: z.string().nullable(),
  address: z.string().nullable(),
  blood_group: z.string().nullable(),
  medical_history: z.string().nullable(),
  age: z.number().nullable(),
  patient_type: z.string().nullable(),
  has_diabetes: z.number().int().nullable(),
  has_hypertension: z.number().int().nullable(),
  has_sugar_issues: z.number().int().nullable(),
  family_medical_history: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Patient = z.infer<typeof PatientSchema>;

export const CreatePatientSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(1),
  date_of_birth: z.string().optional(),
  gender: z.string().optional(),
  address: z.string().optional(),
  blood_group: z.string().optional(),
  medical_history: z.string().optional(),
  age: z.number().optional(),
  patient_type: z.string().optional(),
  has_diabetes: z.boolean().optional(),
  has_hypertension: z.boolean().optional(),
  has_sugar_issues: z.boolean().optional(),
  family_medical_history: z.string().optional(),
});

// Appointment schema and type
export const AppointmentSchema = z.object({
  id: z.number(),
  doctor_id: z.number(),
  patient_id: z.number(),
  appointment_date: z.string(),
  status: z.string(),
  reason: z.string().nullable(),
  diagnosis: z.string().nullable(),
  notes: z.string().nullable(),
  symptoms: z.string().nullable(),
  is_emergency: z.number().int().nullable(),
  appointment_day: z.string().nullable(),
  appointment_time: z.string().nullable(),
  reminder_date: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Appointment = z.infer<typeof AppointmentSchema>;

export const CreateAppointmentSchema = z.object({
  doctor_id: z.number(),
  patient_id: z.number(),
  appointment_date: z.string(),
  reason: z.string().optional(),
  symptoms: z.string().optional(),
  is_emergency: z.boolean().optional(),
  appointment_day: z.string().optional(),
  appointment_time: z.string().optional(),
  reminder_date: z.string().optional(),
});

// Medicine schema and type
export const MedicineSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().nullable(),
  manufacturer: z.string().nullable(),
  category: z.string().nullable(),
  stock_quantity: z.number(),
  unit_price: z.number().nullable(),
  expiry_date: z.string().nullable(),
  is_available: z.number().int(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Medicine = z.infer<typeof MedicineSchema>;

export const CreateMedicineSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  manufacturer: z.string().optional(),
  category: z.string().optional(),
  stock_quantity: z.number().default(0),
  unit_price: z.number().optional(),
  expiry_date: z.string().optional(),
});

// Prescription schema and type
export const PrescriptionSchema = z.object({
  id: z.number(),
  patient_id: z.number(),
  doctor_id: z.number(),
  medicine_id: z.number(),
  dosage: z.string(),
  frequency: z.string(),
  duration_days: z.number(),
  instructions: z.string().nullable(),
  prescribed_date: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Prescription = z.infer<typeof PrescriptionSchema>;

export const CreatePrescriptionSchema = z.object({
  patient_id: z.number(),
  doctor_id: z.number(),
  medicine_id: z.number(),
  dosage: z.string().min(1),
  frequency: z.string().min(1),
  duration_days: z.number(),
  instructions: z.string().optional(),
});

// Payment schema and type
export const PaymentSchema = z.object({
  id: z.number(),
  patient_id: z.number(),
  appointment_id: z.number().nullable(),
  amount: z.number(),
  payment_method: z.string().nullable(),
  payment_status: z.string(),
  payment_date: z.string(),
  description: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Payment = z.infer<typeof PaymentSchema>;

export const CreatePaymentSchema = z.object({
  patient_id: z.number(),
  appointment_id: z.number().optional(),
  amount: z.number(),
  payment_method: z.string().optional(),
  payment_status: z.string().optional(),
  description: z.string().optional(),
});

// Patient History schema and type
export const PatientHistorySchema = z.object({
  id: z.number(),
  patient_id: z.number(),
  visit_date: z.string(),
  symptoms: z.string().nullable(),
  diagnosis: z.string().nullable(),
  treatment: z.string().nullable(),
  notes: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type PatientHistory = z.infer<typeof PatientHistorySchema>;

export const CreatePatientHistorySchema = z.object({
  patient_id: z.number(),
  visit_date: z.string(),
  symptoms: z.string().optional(),
  diagnosis: z.string().optional(),
  treatment: z.string().optional(),
  notes: z.string().optional(),
});

// Extended types with relations
export type AppointmentWithDetails = Appointment & {
  doctor_name: string;
  patient_name: string;
  doctor_specialty?: string;

};

export type PrescriptionWithDetails = Prescription & {
  patient_name: string;
  doctor_name: string;
  medicine_name: string;
  doctor_specialty?: string;
};

export type PaymentWithDetails = Payment & {
  patient_name: string;
};

export type PatientHistoryWithDetails = PatientHistory & {
  patient_name: string;
};
