import { body, validationResult } from 'express-validator';

export const validatePayroll = [
  body('employeeName')
    .trim()
    .notEmpty()
    .withMessage('Employee name is required')
    .isLength({ min: 2 })
    .withMessage('Employee name must be at least 2 characters long'),
  
  body('salary')
    .notEmpty()
    .withMessage('Salary is required')
    .isFloat({ min: 0 })
    .withMessage('Salary must be a positive number'),
  
  body('deductions')
    .notEmpty()
    .withMessage('Deductions is required')
    .isFloat({ min: 0 })
    .withMessage('Deductions must be a positive number'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

export const validateDeduction = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Deduction name is required'),
  
  body('type')
    .trim()
    .notEmpty()
    .withMessage('Deduction type is required')
    .isIn(['Advance', 'Absent'])
    .withMessage('Invalid deduction type'),
  
  body('amount')
    .notEmpty()
    .withMessage('Amount is required')
    .isFloat({ min: 0 })
    .withMessage('Amount must be a positive number'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
]; 