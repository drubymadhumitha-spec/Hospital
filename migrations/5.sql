
CREATE TABLE prescriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL,
  doctor_id INTEGER NOT NULL,
  medicine_id INTEGER NOT NULL,
  dosage TEXT NOT NULL,
  frequency TEXT NOT NULL,
  duration_days INTEGER NOT NULL,
  instructions TEXT,
  prescribed_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_prescriptions_patient ON prescriptions(patient_id);
CREATE INDEX idx_prescriptions_doctor ON prescriptions(doctor_id);
CREATE INDEX idx_prescriptions_medicine ON prescriptions(medicine_id);
