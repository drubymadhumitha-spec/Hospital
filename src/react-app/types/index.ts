// types/index.ts
export interface User {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  dateOfBirth?: string;
}

export type UserRole = 'patient' | 'doctor' | 'admin' | 'guest';

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  date: string;
  time: string;
  reason: string;
  status: 'scheduled' | 'completed' | 'cancelled';
}

export interface Prescription {
  id: string;
  patientId: string;
  doctorId: string;
  medicines: Array<{
    name: string;
    dosage: string;
    duration: string;
  }>;
  instructions: string;
  date: string;
}

export interface Payment {
  id: string;
  patientId: string;
  amount: number;
  method: string;
  status: 'pending' | 'completed' | 'failed';
  date: string;
}