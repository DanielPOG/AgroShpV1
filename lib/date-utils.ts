/**
 * Utilidades para manejo de fechas con zona horaria de Colombia
 * 
 * ESTRATEGIA CORRECTA: 
 * - Backend guarda la hora ACTUAL de Colombia como si fuera UTC
 * - PostgreSQL la almacena tal cual
 * - Frontend la lee y muestra correctamente
 */

/**
 * Obtiene la fecha y hora actual
 * PostgreSQL ya está configurado en timezone America/Bogota,
 * así que simplemente retornamos new Date() que será guardado correctamente
 * @returns Date objeto
 */
export function getColombiaDate(): Date {
  // PostgreSQL server ya está en America/Bogota
  // Solo retornar la hora actual
  return new Date()
}

/**
 * Convierte una fecha UTC a zona horaria de Colombia
 * @param date Fecha a convertir
 * @returns Date objeto ajustado a hora de Colombia
 */
export function toColombiaDate(date: Date): Date {
  const colombiaTimeString = date.toLocaleString('en-US', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
  
  const [datePart, timePart] = colombiaTimeString.split(', ')
  const [month, day, year] = datePart.split('/')
  const [hour, minute, second] = timePart.split(':')
  
  return new Date(
    parseInt(year),
    parseInt(month) - 1,
    parseInt(day),
    parseInt(hour),
    parseInt(minute),
    parseInt(second)
  )
}

/**
 * Convierte una fecha UTC a string formateado en zona horaria de Colombia
 * @param date Fecha en UTC (como viene de la BD)
 * @param includeTime Si incluir hora (default: true)
 * @returns String formateado en hora de Colombia
 */
export function formatColombiaDate(date: Date | string, includeTime: boolean = true): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    ...(includeTime && {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })
  }
  
  return dateObj.toLocaleString('es-CO', options)
}

/**
 * Obtiene solo la fecha (sin hora) en zona horaria de Colombia
 * @returns Date objeto con hora 00:00:00 en Colombia
 */
export function getColombiaTodayStart(): Date {
  const now = getColombiaDate()
  now.setHours(0, 0, 0, 0)
  return now
}

/**
 * Obtiene el final del día (23:59:59) en zona horaria de Colombia
 * @returns Date objeto con hora 23:59:59 en Colombia
 */
export function getColombiaTodayEnd(): Date {
  const now = getColombiaDate()
  now.setHours(23, 59, 59, 999)
  return now
}
