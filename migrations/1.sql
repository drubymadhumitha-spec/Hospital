
CREATE TABLE doctors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  specialty TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  qualification TEXT,
  experience_years INTEGER,
  consultation_fee REAL,
  is_available BOOLEAN DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_doctors_specialty ON doctors(specialty);
CREATE INDEX idx_doctors_email ON doctors(email);
