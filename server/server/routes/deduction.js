import express from 'express';
import Deduction from '../models/Deduction.model.js';

const router = express.Router();

// Get all deductions
router.get('/', async (req, res) => {
  try {
    const deductions = await Deduction.find();
    res.json(deductions);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add a deduction
router.post('/', async (req, res) => {
  try {
    const { name, type, amount, date } = req.body;
    const deduction = new Deduction({ name, type, amount, date });
    await deduction.save();
    res.status(201).json(deduction);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update a deduction
router.put('/:id', async (req, res) => {
  try {
    const { name, type, amount, date } = req.body;
    const deduction = await Deduction.findByIdAndUpdate(
      req.params.id,
      { name, type, amount, date },
      { new: true }
    );
    if (!deduction) return res.status(404).json({ message: 'Deduction not found' });
    res.json(deduction);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete a deduction
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
