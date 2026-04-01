import React from 'react';
import { Dumbbell, Zap, Trophy, Target } from 'lucide-react';

export const EXERCISE_CATALOG = [
  { nombre: 'Press de Banca', musculo: 'Pecho', descripcion: 'Empuje horizontal para pectoral mayor.', videoUrl: 'https://www.youtube.com/watch?v=rT7DgCr-3pg' },
  { nombre: 'Sentadilla', musculo: 'Piernas', descripcion: 'Ejercicio compuesto para cuádriceps y glúteos.', videoUrl: 'https://www.youtube.com/watch?v=gcNh17Ckjgg' },
  { nombre: 'Peso Muerto', musculo: 'Espalda/Piernas', descripcion: 'Levantamiento de potencia para cadena posterior.', videoUrl: 'https://www.youtube.com/watch?v=op9kVnSso6Q' },
  { nombre: 'Press Militar', musculo: 'Hombros', descripcion: 'Empuje vertical para deltoides.', videoUrl: 'https://www.youtube.com/watch?v=2yjwxt_4GzM' },
  { nombre: 'Dominadas', musculo: 'Espalda', descripcion: 'Tracción vertical para dorsales.', videoUrl: 'https://www.youtube.com/watch?v=eGo4IYlbE5g' },
  { nombre: 'Remo con Barra', musculo: 'Espalda', descripcion: 'Tracción horizontal para densidad de espalda.', videoUrl: 'https://www.youtube.com/watch?v=9efgcAjQW7E' },
  { nombre: 'Curl de Bíceps', musculo: 'Bíceps', descripcion: 'Flexión de codo para bíceps braquial.', videoUrl: 'https://www.youtube.com/watch?v=ykJmrZ5v0Oo' },
  { nombre: 'Press Francés', musculo: 'Tríceps', descripcion: 'Extensión de codo para tríceps.', videoUrl: 'https://www.youtube.com/watch?v=nRiJVZDpdL0' },
  { nombre: 'Zancadas', musculo: 'Piernas', descripcion: 'Ejercicio unilateral para piernas y glúteos.', videoUrl: 'https://www.youtube.com/watch?v=D7KaRcUTQeE' },
  { nombre: 'Plancha', musculo: 'Core', descripcion: 'Isométrico para estabilidad abdominal.', videoUrl: 'https://www.youtube.com/watch?v=ASdvN_XEl_c' },
];

export const ROUTINE_TEMPLATES = [
  { 
    id: 'hipertrofia', 
    name: 'Hipertrofia', 
    description: 'Enfocado en ganar masa muscular', 
    icon: 'Dumbbell',
    exercises: ['Press de Banca', 'Sentadilla', 'Remo con Barra', 'Curl de Bíceps']
  },
  { 
    id: 'perdida_peso', 
    name: 'Pérdida de Peso', 
    description: 'Enfocado en quema de grasa y cardio', 
    icon: 'Zap',
    exercises: ['Zancadas', 'Plancha', 'Sentadilla', 'Dominadas']
  },
  { 
    id: 'fuerza', 
    name: 'Fuerza', 
    description: 'Enfocado en ganar fuerza máxima', 
    icon: 'Trophy',
    exercises: ['Peso Muerto', 'Sentadilla', 'Press de Banca', 'Press Militar']
  },
  { 
    id: 'resistencia', 
    name: 'Resistencia', 
    description: 'Enfocado en mejorar la capacidad aeróbica', 
    icon: 'Target',
    exercises: ['Plancha', 'Zancadas', 'Dominadas', 'Sentadilla']
  },
];

export const getTemplateIcon = (iconName: string) => {
  switch (iconName) {
    case 'Dumbbell': return Dumbbell;
    case 'Zap': return Zap;
    case 'Trophy': return Trophy;
    case 'Target': return Target;
    default: return Dumbbell;
  }
};
