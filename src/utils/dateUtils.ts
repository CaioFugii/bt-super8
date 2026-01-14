/**
 * Formata uma data para DD/MM/YYYY
 */
export function formatDateToDDMMYYYY(date: Date | number): string {
  const d = typeof date === 'number' ? new Date(date) : date;
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Converte uma string DD/MM/YYYY para Date
 */
export function parseDDMMYYYY(dateString: string): Date {
  const [day, month, year] = dateString.split('/').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Aplica máscara de data DD/MM/YYYY removendo caracteres não numéricos
 */
export function maskDateInput(value: string): string {
  // Remove tudo exceto números
  const numbers = value.replace(/\D/g, '');
  
  if (numbers.length === 0) return '';
  if (numbers.length <= 2) return numbers;
  if (numbers.length <= 4) return `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
  return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`;
}

/**
 * Aplica máscara de hora HH:MM removendo caracteres não numéricos
 */
export function maskTimeInput(value: string): string {
  // Remove tudo exceto números
  const numbers = value.replace(/\D/g, '');
  
  if (numbers.length === 0) return '';
  if (numbers.length <= 2) return numbers;
  return `${numbers.slice(0, 2)}:${numbers.slice(2, 4)}`;
}

/**
 * Valida se a data é válida e não é anterior a hoje
 */
export function validateDateNotPast(dateString: string): {
  isValid: boolean;
  error?: string;
} {
  if (!dateString || dateString.length !== 10) {
    return { isValid: false, error: 'Data inválida. Use o formato DD/MM/YYYY' };
  }

  // Valida formato DD/MM/YYYY
  const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  if (!dateRegex.test(dateString)) {
    return { isValid: false, error: 'Formato inválido. Use DD/MM/YYYY' };
  }

  try {
    const [day, month, year] = dateString.split('/').map(Number);
    
    // Valida se os números fazem sentido
    if (month < 1 || month > 12) {
      return { isValid: false, error: 'Mês inválido' };
    }
    if (day < 1 || day > 31) {
      return { isValid: false, error: 'Dia inválido' };
    }

    const date = new Date(year, month - 1, day);
    
    // Valida se a data é válida (ex: 31-02 não é válido)
    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return { isValid: false, error: 'Data inválida' };
    }

    // Valida se não é anterior a hoje
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    
    if (date < today) {
      return { isValid: false, error: 'A data não pode ser anterior a hoje' };
    }

    return { isValid: true };
  } catch (error) {
    return { isValid: false, error: 'Data inválida' };
  }
}

/**
 * Valida formato de hora HH:MM
 */
export function validateTimeFormat(timeString: string): {
  isValid: boolean;
  error?: string;
} {
  if (!timeString) {
    return { isValid: true }; // Hora é opcional
  }

  const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/;
  if (!timeRegex.test(timeString)) {
    return { isValid: false, error: 'Formato de hora inválido. Use HH:MM' };
  }

  return { isValid: true };
}

/**
 * Obtém a data atual no formato DD/MM/YYYY
 */
export function getTodayDDMMYYYY(): string {
  return formatDateToDDMMYYYY(new Date());
}
