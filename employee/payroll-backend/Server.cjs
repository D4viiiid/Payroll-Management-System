// server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './connect.cjs'; // if it uses export default, else adjust
import Employee from './models/EmployeeModel.js';

dotenv.config({ path: './config.env' });

const app = express();
const PORT = 5000;

connectDB();

app.use(cors());
app.use(express.json());
app.use('/api/employees', employeeRoutes);

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
