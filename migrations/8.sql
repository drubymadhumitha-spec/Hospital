
CREATE TABLE payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL,
  appointment_id INTEGER,
  amount REAL NOT NULL,
  payment_method TEXT,
  payment_status TEXT DEFAULT 'pending',
  payment_date DATE DEFAULT CURRENT_DATE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_payments_patient ON payments(patient_id);
CREATE INDEX idx_payments_appointment ON payments(appointment_id);
CREATE INDEX idx_payments_status ON payments(payment_status);
