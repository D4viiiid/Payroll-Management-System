import express from 'express';
import Deduction from '../models/Deduction.model.js';

const router = express.Router();

// GET all deductions
router.get('/', async (req, res) => {
  try {
    const deductions = await Deduction.find().populate('employee', 'firstName lastName email employeeId salary');
    res.json(deductions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST create deduction
router.post('/', async (req, res) => {
  try {
    console.log('=== DEDUCTION CREATION REQUEST ===');
    console.log('Received deduction data:', JSON.stringify(req.body, null, 2));
    
    const { name, type, amount, date, employee } = req.body; // employee is optional ObjectId
    const deduction = new Deduction({ name, type, amount, date, employee });
    await deduction.save();
    const populated = await deduction.populate('employee', 'firstName lastName email employeeId salary');
    res.status(201).json(populated);
  } catch (err) {
    console.error('=== DEDUCTION CREATION ERROR ===');
    console.error('Error creating deduction:', err);
    res.status(400).json({ message: err.message });
  }
});

// PUT update deduction
router.put('/:id', async (req, res) => {
  try {
    const { name, type, amount, date, employee } = req.body; // employee optional
    const deduction = await Deduction.findByIdAndUpdate(
      req.params.id,
      { name, type, amount, date, employee },
      { new: true }
    ).populate('employee', 'firstName lastName email employeeId salary');
    if (!deduction) return res.status(404).json({ message: 'Deduction not found' });
    res.json(deduction);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE deduction
router.delete('/:id', async (req, res) => {
  try {
    const deduction = await Deduction.findByIdAndDelete(req.params.id);
    if (!deduction) return res.status(404).json({ message: 'Deduction not found' });
    res.json({ message: 'Deduction deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
