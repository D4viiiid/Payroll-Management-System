import mongoose from 'mongoose';

const employeeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  position: String,
  Date: {
    type: Date,
    required: true,
    validate: {
      validator: function(value) {
        return value <= new Date();                       // Ensure date is not in the future
      },
      message: 'Date cannot be in the future'
    }
  }
});

const Employee = mongoose.model('Employee', employeeSchema);

export default Employee;
