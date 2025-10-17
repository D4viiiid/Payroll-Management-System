import moment from 'moment-timezone';

// Philippines timezone
const TIMEZONE = 'Asia/Manila';

/**
 * Get current date and time in Philippines timezone
 * @returns {Date} Current date/time in Philippines timezone
 */
export const getPhilippinesNow = () => {
  return moment.tz(TIMEZONE).toDate();
};

/**
 * Get start of day (00:00:00) in Philippines timezone
 * @param {Date|String} date - Optional date, defaults to today
 * @returns {Date} Start of day in Philippines timezone
 */
export const getStartOfDay = (date = null) => {
  if (date) {
    return moment.tz(date, TIMEZONE).startOf('day').toDate();
  }
  return moment.tz(TIMEZONE).startOf('day').toDate();
};

/**
 * Get end of day (23:59:59.999) in Philippines timezone
 * @param {Date|String} date - Optional date, defaults to today
 * @returns {Date} End of day in Philippines timezone
 */
export const getEndOfDay = (date = null) => {
  if (date) {
    return moment.tz(date, TIMEZONE).endOf('day').toDate();
  }
  return moment.tz(TIMEZONE).endOf('day').toDate();
};

/**
 * Get date-only string (YYYY-MM-DD) in Philippines timezone
 * @param {Date} date - Optional date, defaults to today
 * @returns {String} Date string in YYYY-MM-DD format
 */
export const getDateOnly = (date = null) => {
  if (date) {
    return moment.tz(date, TIMEZONE).format('YYYY-MM-DD');
  }
  return moment.tz(TIMEZONE).format('YYYY-MM-DD');
};

/**
 * Check if a date is today in Philippines timezone
 * @param {Date} date - Date to check
 * @returns {Boolean} True if date is today
 */
export const isToday = (date) => {
  const today = getDateOnly();
  const checkDate = getDateOnly(date);
  return today === checkDate;
};

/**
 * Format date for display
 * @param {Date} date - Date to format
 * @param {String} format - Optional moment format string
 * @returns {String} Formatted date string
 */
export const formatDate = (date, format = 'MMM DD, YYYY') => {
  return moment.tz(date, TIMEZONE).format(format);
};

/**
 * Format time for display
 * @param {Date} date - Date to format
 * @param {String} format - Optional moment format string
 * @returns {String} Formatted time string
 */
export const formatTime = (date, format = 'h:mm A') => {
  return moment.tz(date, TIMEZONE).format(format);
};

/**
 * Check if time is within a range
 * @param {Date} time - Time to check
 * @param {String} startTime - Start time (HH:mm format)
 * @param {String} endTime - End time (HH:mm format)
 * @returns {Boolean} True if time is within range
 */
export const isTimeInRange = (time, startTime, endTime) => {
  const momentTime = moment.tz(time, TIMEZONE);
  const start = moment.tz(TIMEZONE).set({
    hour: parseInt(startTime.split(':')[0]),
    minute: parseInt(startTime.split(':')[1]),
    second: 0,
    millisecond: 0
  });
  const end = moment.tz(TIMEZONE).set({
    hour: parseInt(endTime.split(':')[0]),
    minute: parseInt(endTime.split(':')[1]),
    second: 0,
    millisecond: 0
  });
  
  return momentTime.isBetween(start, end, null, '[]');
};

/**
 * Get maximum shift hours (for auto-closing shifts)
 */
export const MAX_SHIFT_HOURS = 12;

/**
 * Calculate end time based on start time + max shift hours
 * @param {Date} startTime - Shift start time
 * @returns {Date} Calculated end time (start + MAX_SHIFT_HOURS)
 */
export const calculateAutoCloseTime = (startTime) => {
  return moment.tz(startTime, TIMEZONE).add(MAX_SHIFT_HOURS, 'hours').toDate();
};

/**
 * Check if shift should be auto-closed
 * @param {Date} timeIn - Time in timestamp
 * @returns {Boolean} True if shift exceeded MAX_SHIFT_HOURS
 */
export const shouldAutoCloseShift = (timeIn) => {
  const now = getPhilippinesNow();
  const shiftStart = moment.tz(timeIn, TIMEZONE);
  const hoursSinceStart = moment.tz(now, TIMEZONE).diff(shiftStart, 'hours', true);
  return hoursSinceStart >= MAX_SHIFT_HOURS;
};
