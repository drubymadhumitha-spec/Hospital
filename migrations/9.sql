
CREATE TABLE patient_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id INTEGER NOT NULL,
  visit_date DATETIME NOT NULL,
  symptoms TEXT,
  diagnosis TEXT,
  treatment TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_patient_history_patient ON patient_history(patient_id);
CREATE INDEX idx_patient_history_date ON patient_history(visit_date);
