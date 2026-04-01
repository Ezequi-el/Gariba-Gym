import { Timestamp } from 'firebase/firestore';

export interface Socio {
  id: string;
  nombre: string;
  email?: string;
  telefono?: string;
  fechaInicio?: Timestamp;
  fechaVencimiento: Timestamp;
  estado: 'Activa' | 'Vencida' | 'Baneado';
  uid?: string;
  sucursalId?: string;
  mustChangePassword?: boolean;
  password?: string;
  acceptedTerms?: boolean;
}

export interface UserProfile {
  uid: string;
  email: string;
  role: 'owner' | 'manager' | 'receptionist' | 'trainer';
  sucursalId?: string;
  acceptedTerms?: boolean;
}

export interface Ejercicio {
  id?: string;
  nombre: string;
  musculo: string;
  descripcion: string;
  videoUrl?: string;
  equipamiento?: string;
  categoria?: string;
}

export interface EjercicioEnPlantilla {
  ejercicioId: string;
  nombre: string;
  series: string;
  repeticiones: string;
  descanso: string;
  observaciones: string;
  rpe?: string;
  tempo?: string;
  tipo?: 'Normal' | 'Superset' | 'Dropset' | 'Circuito';
}

export interface DiaRutina {
  nombre: string;
  ejercicios: EjercicioEnPlantilla[];
  notas?: string;
}

export interface PlantillaRutina {
  id?: string;
  name: string;
  description: string;
  icon: string;
  dias: DiaRutina[];
}

export interface Sucursal {
  id: string;
  nombre: string;
  direccion: string;
  telefono: string;
}
