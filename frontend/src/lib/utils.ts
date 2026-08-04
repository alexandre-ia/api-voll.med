import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Formatting utilities
export const formatters = {
  cpf: (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  },

  phone: (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  },

  cep: (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    return cleaned.replace(/(\d{5})(\d{3})/, '$1-$2');
  },

  crm: (value: string) => {
    const cleaned = value.replace(/\D/g, '').toUpperCase();
    return cleaned;
  },

  date: (date: string) => {
    const d = new Date(date + 'T00:00:00');
    return d.toLocaleDateString('pt-BR');
  },

  dateTime: (date: string, time: string) => {
    const d = new Date(date + 'T' + time);
    return d.toLocaleString('pt-BR');
  },

  time: (time: string) => {
    return time;
  },

  currency: (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  },
};

// Unformatting utilities (for sending to API)
export const unformatters = {
  cpf: (value: string) => value.replace(/\D/g, ''),
  phone: (value: string) => value.replace(/\D/g, ''),
  cep: (value: string) => value.replace(/\D/g, ''),
  crm: (value: string) => value.replace(/\D/g, ''),
};

// Error handling
export function getApiErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const axiosError = error as any;
    if (axiosError.response?.data?.message) {
      return axiosError.response.data.message;
    }
    if (axiosError.response?.data?.error) {
      return axiosError.response.data.error;
    }
    if (axiosError.response?.data?.detail) {
      return axiosError.response.data.detail;
    }
    return error.message || 'Não foi possível concluir a operação.';
  }

  return 'Não foi possível concluir a operação.';
}

export function extractApiError(err: any, fallback: string): string {
  const data = err?.response?.data;
  if (!data) return fallback;
  if (Array.isArray(data)) {
    return data.map((e: any) => {
      const message = e.mensagem ?? e.message ?? String(e);
      return e.campo ? `${e.campo}: ${message}` : message;
    }).join(' | ');
  }
  if (typeof data === 'string') return data;
  return data.mensagem ?? data.message ?? fallback;
}

// Validation utilities
export const validators = {
  cpf: (cpf: string): boolean => {
    const cleaned = cpf.replace(/\D/g, '');
    if (cleaned.length !== 11) return false;
    
    if (/(\d)\1{10}/.test(cleaned)) return false;

    let sum = 0;
    let remainder;
    for (let i = 1; i <= 9; i++) {
      sum += parseInt(cleaned.substring(i - 1, i)) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cleaned.substring(9, 10))) return false;

    sum = 0;
    for (let i = 1; i <= 10; i++) {
      sum += parseInt(cleaned.substring(i - 1, i)) * (12 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cleaned.substring(10, 11))) return false;

    return true;
  },

  email: (email: string): boolean => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  },

  phone: (phone: string): boolean => {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length === 10 || cleaned.length === 11;
  },

  cep: (cep: string): boolean => {
    const cleaned = cep.replace(/\D/g, '');
    return cleaned.length === 8;
  },
};

// Search/filter utilities
export function searchInArray<T>(
  array: T[],
  query: string,
  fields: (keyof T)[]
): T[] {
  if (!query.trim()) return array;

  const lowerQuery = query.toLowerCase();
  return array.filter((item) =>
    fields.some((field) => {
      const value = item[field];
      if (typeof value === 'string') {
        return value.toLowerCase().includes(lowerQuery);
      }
      return false;
    })
  );
}

// Status badge colors
export const statusColors = {
  scheduled: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  confirmed: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  cancelled: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  completed: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' },
  routine: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  medium: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
  high: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  active: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  inactive: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' },
  open: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  closed: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' },
  consultation: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  return: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  teleconsultation: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
};

// Status labels
export const statusLabels = {
  scheduled: 'Agendada',
  confirmed: 'Confirmada',
  cancelled: 'Cancelada',
  completed: 'Finalizada',
  routine: 'Rotina',
  medium: 'Média',
  high: 'Alta',
  active: 'Ativa',
  inactive: 'Inativa',
  open: 'Aberto',
  closed: 'Fechado',
  consultation: 'Consulta',
  return: 'Retorno',
  teleconsultation: 'Teleconsulta',
};
