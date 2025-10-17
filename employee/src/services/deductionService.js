import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Cash Advance API endpoints (using cash-advance routes, not deductions)
export const getAllDeductions = async () => {
  const response = await axios.get(`${API_URL}/cash-advance`);
  
  // ✅ FIX: Handle paginated API response correctly
  // API returns: { success: true, data: [...], pagination: {...} }
  const advances = response.data.data || response.data.advances || response.data || [];
  
  // Ensure we have an array
  if (!Array.isArray(advances)) {
    console.error('❌ Cash advance API did not return an array:', advances);
    return [];
  }
  
  // Transform cash advance data to match deduction format expected by UI
  return advances.map(advance => {
    const employeeName = advance.employee ? 
      `${advance.employee.firstName} ${advance.employee.lastName}` : 
      advance.employeeName || 'Unknown';
    
    return {
      _id: advance._id,
      employee: advance.employee, // Keep full employee object for filters
      employeeId: advance.employee?.employeeId || advance.employeeId,
      employeeName: employeeName,
      name: employeeName, // Component expects 'name' property
      amount: advance.amount,
      status: advance.status,
      date: advance.requestDate || advance.date,
      reason: advance.purpose || advance.reason || 'Cash Advance',
      type: 'Cash Advance'
    };
  });
};

export const createDeduction = async (deductionData) => {
  // Create cash advance request
  // Note: The API expects 'employee' (MongoDB ObjectId), not 'employeeId'
  // If we have employeeId, we need to look up the employee ObjectId first
  const cashAdvanceData = {
    employee: deductionData.employee || deductionData.employeeId, // Should be MongoDB _id
    amount: parseFloat(deductionData.amount),
    purpose: deductionData.reason || 'Cash Advance',
    notes: deductionData.notes || ''
  };
  
  const response = await axios.post(`${API_URL}/cash-advance`, cashAdvanceData);
  return response.data;
};

export const updateDeduction = async (id, deductionData) => {
  // Cash advance system doesn't support direct updates
  // Only approve/reject operations are supported
  // For now, we'll delete and recreate
  await deleteDeduction(id);
  return createDeduction(deductionData);
};

export const deleteDeduction = async (id) => {
  const response = await axios.delete(`${API_URL}/cash-advance/${id}`);
  return response.data;
};
