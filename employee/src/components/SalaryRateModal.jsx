import React, { useState, useEffect } from 'react';
import { getCurrentSalaryRate, getSalaryRateHistory, createSalaryRate } from '../services/salaryRateService';
import { logger } from '../utils/logger';

const SalaryRateModal = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [currentRate, setCurrentRate] = useState(null);
  const [rateHistory, setRateHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  
  const [formData, setFormData] = useState({
    dailyRate: '',
    effectiveDate: new Date().toISOString().split('T')[0],
    reason: '',
    notes: ''
  });
  
  const [calculatedRates, setCalculatedRates] = useState({
    hourlyRate: 0,
    overtimeRate: 0
  });
  
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      fetchCurrentRate();
      fetchRateHistory();
    }
  }, [isOpen]);

  useEffect(() => {
    // Auto-calculate rates when daily rate changes
    const daily = parseFloat(formData.dailyRate) || 0;
    setCalculatedRates({
      hourlyRate: (daily / 8).toFixed(2),
      overtimeRate: ((daily / 8) * 1.25).toFixed(2)
    });
  }, [formData.dailyRate]);

  const fetchCurrentRate = async () => {
    try {
      const rate = await getCurrentSalaryRate();
      setCurrentRate(rate);
      logger.info('✅ Current rate fetched:', rate);
    } catch (error) {
      logger.error('❌ Error fetching current rate:', error);
    }
  };

  const fetchRateHistory = async () => {
    try {
      const history = await getSalaryRateHistory(5);
      setRateHistory(history);
      logger.info(`✅ Fetched ${history.length} rate history records`);
    } catch (error) {
      logger.error('❌ Error fetching rate history:', error);
      
      // ✅ CRITICAL FIX: Rate history is OPTIONAL - don't block modal opening
      // Just set empty history and continue
      // Modal can still be used to create new salary rates even without history
      setRateHistory([]);
      
      logger.warn('⚠️ Rate history unavailable, but modal will remain functional');
      // Don't show alert or redirect - history is not essential for modal functionality
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    const daily = parseFloat(formData.dailyRate);
    if (!formData.dailyRate || isNaN(daily) || daily <= 0) {
      newErrors.dailyRate = 'Valid daily rate is required (must be greater than 0)';
    }
    
    if (!formData.reason || formData.reason.trim().length < 3) {
      newErrors.reason = 'Reason is required (minimum 3 characters)';
    }
    
    if (!formData.effectiveDate) {
      newErrors.effectiveDate = 'Effective date is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    if (!window.confirm(`Are you sure you want to change the salary rate from ₱${currentRate?.dailyRate || 550} to ₱${formData.dailyRate}?\n\nThis will affect all future salary calculations.`)) {
      return;
    }
    
    try {
      setLoading(true);
      
      // ✅ FIX: Get admin info from localStorage (correct key is 'currentEmployee')
      const adminInfo = JSON.parse(localStorage.getItem('currentEmployee') || '{}');
      const adminId = adminInfo._id || adminInfo.id;
      const adminName = `${adminInfo.firstName || ''} ${adminInfo.lastName || ''}`.trim() || 'Admin';
      
      const rateData = {
        dailyRate: parseFloat(formData.dailyRate),
        effectiveDate: formData.effectiveDate,
        reason: formData.reason.trim(),
        notes: formData.notes.trim(),
        createdBy: adminId,
        createdByName: adminName
      };
      
      const response = await createSalaryRate(rateData);
      
      logger.info('✅ Salary rate updated successfully:', response);
      
      alert(`✅ Salary rate updated successfully!\n\nNew Rate: ₱${formData.dailyRate} daily\nHourly: ₱${calculatedRates.hourlyRate}/hr\nOvertime: ₱${calculatedRates.overtimeRate}/hr`);
      
      // Reset form
      setFormData({
        dailyRate: '',
        effectiveDate: new Date().toISOString().split('T')[0],
        reason: '',
        notes: ''
      });
      
      // Refresh data
      await fetchCurrentRate();
      await fetchRateHistory();
      
      // Call success callback
      if (onSuccess) {
        onSuccess(response.rate);
      }
      
      // Close modal
      onClose();
      
    } catch (error) {
      logger.error('❌ Error updating salary rate:', error);
      alert(`Error updating salary rate: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-4 rounded-t-lg">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <i className="fas fa-money-bill-wave"></i>
              Adjust Salary Rate
            </h2>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 text-2xl font-bold"
              disabled={loading}
            >
              ×
            </button>
          </div>
          <p className="text-green-100 text-sm mt-1">Update global salary rates for all employees</p>
        </div>

        <div className="p-6">
          {/* ✅ NEW: Important Notice about Effective Dates */}
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-6 rounded">
            <h3 className="font-semibold text-yellow-900 mb-2 flex items-center gap-2">
              <i className="fas fa-exclamation-triangle"></i>
              Important: Salary Rate Effective Date Behavior
            </h3>
            <div className="text-sm text-gray-700 space-y-2">
              <p>
                <strong>⏰ Immediate Effect Through Saturday:</strong> New salary rates take effect <strong>immediately from the creation date</strong> until the end of the current work week (Saturday 11:59 PM).
              </p>
              <p>
                <strong>📅 Monday Activation:</strong> After Saturday, the next salary rate becomes active starting Monday of the new week.
              </p>
              <p className="text-xs text-yellow-800 bg-yellow-100 p-2 rounded mt-2">
                <i className="fas fa-lightbulb mr-1"></i>
                <strong>Example:</strong> If you create a new rate on Wednesday, it applies immediately to Wednesday, Thursday, Friday, and Saturday. On Monday, the next rate (if any) will take effect.
              </p>
            </div>
          </div>

          {/* Current Rate Display */}
          {currentRate && (
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 rounded">
              <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                <i className="fas fa-info-circle"></i>
                Current Active Rate
              </h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Daily Rate:</span>
                  <p className="text-lg font-bold text-blue-900">₱{currentRate.dailyRate}</p>
                </div>
                <div>
                  <span className="text-gray-600">Hourly Rate:</span>
                  <p className="text-lg font-bold text-blue-900">₱{currentRate.hourlyRate.toFixed(2)}</p>
                </div>
                <div>
                  <span className="text-gray-600">Overtime Rate:</span>
                  <p className="text-lg font-bold text-blue-900">₱{currentRate.overtimeRate.toFixed(2)}</p>
                </div>
              </div>
              <p className="text-xs text-gray-600 mt-2">
                Effective since: {new Date(currentRate.effectiveDate).toLocaleDateString()}
              </p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Daily Rate Input */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Daily Rate <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-gray-500">₱</span>
                  <input
                    type="number"
                    name="dailyRate"
                    value={formData.dailyRate}
                    onChange={handleChange}
                    className={`w-full pl-8 pr-3 py-2 border ${errors.dailyRate ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent`}
                    placeholder="550.00"
                    step="0.01"
                    min="0"
                    disabled={loading}
                  />
                </div>
                {errors.dailyRate && (
                  <p className="text-red-500 text-xs mt-1">{errors.dailyRate}</p>
                )}
              </div>

              {/* Hourly Rate (Auto-calculated) */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Hourly Rate (Auto-calculated)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-gray-500">₱</span>
                  <input
                    type="text"
                    value={calculatedRates.hourlyRate}
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                    readOnly
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Daily Rate ÷ 8</p>
              </div>

              {/* Overtime Rate (Auto-calculated) */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Overtime Rate (Auto-calculated)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-gray-500">₱</span>
                  <input
                    type="text"
                    value={calculatedRates.overtimeRate}
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                    readOnly
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Hourly Rate × 1.25</p>
              </div>
            </div>

            {/* Effective Date and Reason */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Effective Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="effectiveDate"
                  value={formData.effectiveDate}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border ${errors.effectiveDate ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-green-500`}
                  disabled={loading}
                />
                {errors.effectiveDate && (
                  <p className="text-red-500 text-xs mt-1">{errors.effectiveDate}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Reason <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="reason"
                  value={formData.reason}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border ${errors.reason ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-green-500`}
                  placeholder="e.g., Annual rate adjustment, Minimum wage increase"
                  disabled={loading}
                />
                {errors.reason && (
                  <p className="text-red-500 text-xs mt-1">{errors.reason}</p>
                )}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                rows="3"
                placeholder="Additional details about this rate change..."
                disabled={loading}
              />
            </div>

            {/* Rate History Section */}
            <div className="border-t pt-4">
              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-2 text-green-700 font-semibold hover:text-green-800 mb-3"
              >
                <i className={`fas fa-chevron-${showHistory ? 'up' : 'down'}`}></i>
                Rate History ({rateHistory.length} records)
              </button>
              
              {showHistory && (
                <div className="bg-gray-50 rounded-lg p-4">
                  {rateHistory.length > 0 ? (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-300">
                          <th className="text-left py-2">Date</th>
                          <th className="text-left py-2">Daily Rate</th>
                          <th className="text-left py-2">Hourly</th>
                          <th className="text-left py-2">OT</th>
                          <th className="text-left py-2">Created By</th>
                          <th className="text-left py-2">Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rateHistory.map((rate, index) => (
                          <tr key={rate._id} className={`border-b border-gray-200 ${index === 0 ? 'bg-green-50' : ''}`}>
                            <td className="py-2">
                              {new Date(rate.effectiveDate).toLocaleDateString()}
                              {index === 0 && <span className="ml-2 text-xs text-green-600 font-semibold">(Current)</span>}
                            </td>
                            <td className="py-2">₱{rate.dailyRate}</td>
                            <td className="py-2">₱{rate.hourlyRate.toFixed(2)}</td>
                            <td className="py-2">₱{rate.overtimeRate.toFixed(2)}</td>
                            <td className="py-2">{rate.createdByName}</td>
                            <td className="py-2 text-xs text-gray-600">{rate.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-gray-500 text-center py-4">No rate history available</p>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition duration-200"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition duration-200 flex items-center gap-2"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    Updating...
                  </>
                ) : (
                  <>
                    <i className="fas fa-save"></i>
                    Update Salary Rate
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SalaryRateModal;
