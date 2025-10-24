import axios from 'axios';

// Gamitin ang proxy path sa halip na full URL
const API_BASE = '/api';

const getAuthConfig = () => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

export const getAllPayrolls = async () => {
  const response = await axios.get(`${API_BASE}/payrolls`, getAuthConfig());
  return response.data;
};

export const createPayroll = async (payrollData) => {
  const response = await axios.post(`${API_BASE}/payrolls`, payrollData, getAuthConfig());
  return response.data;
};

export const updatePayroll = async (id, payrollData) => {
  const response = await axios.put(`${API_BASE}/payrolls/${id}`, payrollData, getAuthConfig());
  return response.data;
};

// ✅ CRITICAL FIX ISSUE #2: Add dedicated archive/restore methods
export const archivePayroll = async (id) => {
  const response = await axios.put(`${API_BASE}/payrolls/${id}/archive`, {}, getAuthConfig());
  return response.data;
};

export const restorePayroll = async (id) => {
  const response = await axios.put(`${API_BASE}/payrolls/${id}/restore`, {}, getAuthConfig());
  return response.data;
};

export const deletePayroll = async (id) => {
  const response = await axios.delete(`${API_BASE}/payrolls/${id}`, getAuthConfig());
  return response.data;
};