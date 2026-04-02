export interface Socio {
  id: string;
  nombre: string;
  email?: string;
  telefono?: string;
  fecha_inicio?: string;
  fecha_vencimiento: string;
  estado: 'Activa' | 'Vencida' | 'Baneado';
  user_id?: string;
  sucursal_id?: string;
  must_change_password?: boolean;
  accepted_terms?: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  role: 'owner' | 'manager' | 'receptionist' | 'trainer';
  sucursal_id?: string;
  organizacion_id?: string;
  accepted_terms?: boolean;
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
  nombre_manual?: string;
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
