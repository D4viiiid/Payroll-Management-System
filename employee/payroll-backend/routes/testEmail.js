// routes/testEmail.js
import express from 'express';
const router = express.Router();

console.log('🆕 TEST EMAIL ROUTES LOADED!');

router.get('/test', (req, res) => {
  console.log('✅ TEST ROUTE CALLED!');
  res.json({ message: 'TEST EMAIL ROUTE WORKING!' });
});

router.post('/test', (req, res) => {
  console.log('✅ TEST POST ROUTE CALLED!');
  res.json({ message: 'TEST POST ROUTE WORKING!', body: req.body });
});

export default router;