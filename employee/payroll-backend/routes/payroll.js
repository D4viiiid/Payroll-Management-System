const express = require('express');
const router = express.Router();
const Payroll = require('../models/Payroll.model');

// Get all payrolls
router.get('/', async (req, res) => {
  const payrolls = await Payroll.find();
  res.json(payrolls);
});

// Add a payroll
router.post('/', async (req, res) => {
  const { employeeName, salary, deductions, netSalary } = req.body;
  const payroll = new Payroll({ employeeName, salary, deductions, netSalary });
  await payroll.save();
  res.json(payroll);
});

// Update a payroll
router.put('/:id', async (req, res) => {
  const { employeeName, salary, deductions, netSalary } = req.body;
  const payroll = await Payroll.findByIdAndUpdate(
    req.params.id,
    { employeeName, salary, deductions, netSalary },
    { new: true }
  );
  res.json(payroll);
});

// Delete a payroll
router.delete('/:id', async (req, res) => {
  await Payroll.findByIdAndDelete(req.params.id);
  res.json({ message: 'Payroll deleted' });
});

module.exports = router;
