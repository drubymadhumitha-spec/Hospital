
ALTER TABLE patients ADD COLUMN age INTEGER;
ALTER TABLE patients ADD COLUMN patient_type TEXT DEFAULT 'outpatient';
ALTER TABLE patients ADD COLUMN has_diabetes BOOLEAN DEFAULT 0;
ALTER TABLE patients ADD COLUMN has_hypertension BOOLEAN DEFAULT 0;
ALTER TABLE patients ADD COLUMN has_sugar_issues BOOLEAN DEFAULT 0;
ALTER TABLE patients ADD COLUMN family_medical_history TEXT;
