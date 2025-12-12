
ALTER TABLE appointments ADD COLUMN symptoms TEXT;
ALTER TABLE appointments ADD COLUMN is_emergency BOOLEAN DEFAULT 0;
ALTER TABLE appointments ADD COLUMN appointment_day TEXT;
ALTER TABLE appointments ADD COLUMN appointment_time TEXT;
ALTER TABLE appointments ADD COLUMN reminder_date DATETIME;
