import React, { useState, useRef, useEffect } from 'react';
import './PinInput.css';

/**
 * 6-digit PIN input component with visual feedback
 * Features:
 * - 6 separate digit boxes
 * - Auto-focus next box on input
 * - Auto-focus previous box on backspace
 * - Paste support for all 6 digits
 * - Visual feedback for filled/empty states
 */
const PinInput = ({ onComplete, onCancel, loading = false }) => {
  const [pins, setPins] = useState(['', '', '', '', '', '']);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const inputRefs = useRef([]);

  // Auto-focus first input on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  // Check if PIN is complete and call onComplete (ONLY ONCE)
  useEffect(() => {
    const isComplete = pins.every(pin => pin !== '');
    if (isComplete && !hasSubmitted) {
      const fullPin = pins.join('');
      if (fullPin.length === 6) {
        setHasSubmitted(true); // Prevent multiple calls
        onComplete(fullPin);
      }
    }
  }, [pins, onComplete, hasSubmitted]);

  const handleChange = (index, value) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) {
      return;
    }

    const newPins = [...pins];
    newPins[index] = value;
    setPins(newPins);

    // Auto-focus next input if value entered
    if (value && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (index, e) => {
    // Handle backspace - move to previous input if current is empty
    if (e.key === 'Backspace' && !pins[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }

    // Handle left arrow - move to previous input
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1].focus();
    }

    // Handle right arrow - move to next input
    if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    
    // Only process if it's 6 digits
    if (/^\d{6}$/.test(pastedData)) {
      const newPins = pastedData.split('');
      setPins(newPins);
      // Focus last input
      inputRefs.current[5].focus();
    }
  };

  const handleClear = () => {
    setPins(['', '', '', '', '', '']);
    setHasSubmitted(false); // Reset submission flag
    inputRefs.current[0].focus();
  };

  return (
    <div className="pin-input-container">
      <div className="pin-input-header">
        <h3 className="pin-input-title">Enter 6-Digit PIN</h3>
        <p className="pin-input-subtitle">
          Please enter your administrator PIN to continue
        </p>
      </div>

      <div className="pin-input-boxes" onPaste={handlePaste}>
        {pins.map((pin, index) => (
          <input
            key={index}
            ref={el => inputRefs.current[index] = el}
            type="password"
            inputMode="numeric"
            maxLength={1}
            value={pin}
            onChange={(e) => handleChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            className={`pin-input-box ${pin ? 'filled' : ''}`}
            disabled={loading}
            autoComplete="off"
          />
        ))}
      </div>

      <div className="pin-input-actions">
        <button 
          type="button"
          onClick={handleClear}
          className="pin-input-btn pin-input-btn-clear"
          disabled={loading}
        >
          Clear
        </button>
        <button 
          type="button"
          onClick={onCancel}
          className="pin-input-btn pin-input-btn-cancel"
          disabled={loading}
        >
          Cancel
        </button>
      </div>

      {loading && (
        <div className="pin-input-loading">
          <div className="spinner-border spinner-border-sm text-primary" role="status">
            <span className="visually-hidden">Verifying...</span>
          </div>
          <span className="ms-2">Verifying PIN...</span>
        </div>
      )}
    </div>
  );
};

export default PinInput;
