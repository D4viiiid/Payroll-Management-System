/**
 * Middleware to validate that dates are not Sundays
 * Sunday is cutoff day, work week is Monday-Saturday only
 */

export const validateNoSunday = (req, res, next) => {
  const dateFields = ['date', 'requestDate', 'startDate', 'endDate'];
  
  for (const field of dateFields) {
    if (req.body[field]) {
      const date = new Date(req.body[field]);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return res.status(400).json({
          success: false,
          message: `Invalid date format for ${field}`
        });
      }
      
      // Check if date is Sunday (0 = Sunday)
      if (date.getDay() === 0) {
        return res.status(400).json({
          success: false,
          message: `Sunday is not a valid work day. Work week is Monday-Saturday only. Sunday is the cutoff day.`,
          field: field,
          rejectedDate: date.toLocaleDateString()
        });
      }
    }
  }
  
  next();
};

export const validateDateRange = (req, res, next) => {
  const { startDate, endDate } = req.body;
  
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Check if start is Monday
    if (start.getDay() !== 1) {
      return res.status(400).json({
        success: false,
        message: 'Work week must start on Monday',
        startDay: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][start.getDay()]
      });
    }
    
    // Check if end is Saturday
    if (end.getDay() !== 6) {
      return res.status(400).json({
        success: false,
        message: 'Work week must end on Saturday',
        endDay: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][end.getDay()]
      });
    }
    
    // Check if range is exactly 6 days (Mon-Sat)
    const daysDiff = Math.round((end - start) / (1000 * 60 * 60 * 24));
    if (daysDiff !== 5) { // Monday to Saturday = 5 days difference
      return res.status(400).json({
        success: false,
        message: 'Work week must be exactly 6 days (Monday to Saturday)',
        actualDays: daysDiff + 1
      });
    }
  }
  
  next();
};
