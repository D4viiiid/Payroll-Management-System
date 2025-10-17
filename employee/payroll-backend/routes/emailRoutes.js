// routes/emailRoutes.js
import express from 'express';

const router = express.Router();

// Simple GET test route
router.get('/test', (req, res) => {
  console.log('Email GET test route called');
  res.json({ message: 'Email GET route is working!' });
});

// Simple POST test route  
router.post('/test', (req, res) => {
  console.log('Email POST test route called');
  console.log('Request body:', req.body);
  res.json({ 
    success: true, 
    message: 'Email POST route is working!',
    receivedData: req.body 
  });
});

// Simple POST send-credentials
router.post('/send-credentials', (req, res) => {
  console.log('Send credentials route called');
  console.log('Request body:', req.body);
  res.json({ 
    success: true, 
    message: 'Send credentials route is working!',
    receivedData: req.body 
  });
});

export default router;