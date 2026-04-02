import { toast } from 'sonner';

export enum OperationType {
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}

export const handleSupabaseError = (error: any, operation: OperationType, context: string) => {
  console.error(`Error during ${operation} in ${context}:`, error);
  const message = error.message || 'Error inesperado en la base de datos';
  toast.error(`${message} (${context})`);
};
