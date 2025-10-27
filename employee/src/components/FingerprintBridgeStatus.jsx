import React, { useState, useEffect } from 'react';
import { showSuccess, showError, showInfo } from '../utils/toast';

/**
 * Fingerprint Bridge Status Component
 * 
 * Displays:
 * 1. Connection status of local fingerprint bridge (localhost:3003)
 * 2. Download button for installer if not connected
 * 3. Real-time status updates
 * 4. Installation instructions
 * 
 * ✅ NEW: HTTPS support - works from Vercel production!
 */
const FingerprintBridgeStatus = () => {
  const [bridgeConnected, setBridgeConnected] = useState(false);
  const [deviceConnected, setDeviceConnected] = useState(false);
  const [checking, setChecking] = useState(true);
  const [lastCheck, setLastCheck] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [bridgeProtocol, setBridgeProtocol] = useState(null); // 'https' or 'http'

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const BRIDGE_URLS = {
    https: 'https://localhost:3003',
    http: 'http://localhost:3003'
  };

  /**
   * Find which bridge URL works (HTTPS or HTTP)
   */
  const findWorkingBridgeUrl = async () => {
    // Try HTTPS first (required for Vercel production)
    for (const protocol of ['https', 'http']) {
      const url = BRIDGE_URLS[protocol];
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);

        const response = await fetch(`${url}/api/health`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          return { url, protocol };
        }
      } catch (error) {
        // Try next protocol
      }
    }
    return null;
  };

  /**
   * Check if local fingerprint bridge is running
   * ✅ NEW: Works in production with HTTPS bridge
   */
  const checkBridgeStatus = async () => {
    try {
      setChecking(true);
      
      const result = await findWorkingBridgeUrl();
      
      if (result) {
        const { url, protocol } = result;
        setBridgeProtocol(protocol);
        
        const response = await fetch(`${url}/api/health`);
        const data = await response.json();
        
        setBridgeConnected(true);
        setDeviceConnected(data.deviceConnected || false);
        setLastCheck(new Date());
      } else {
        setBridgeConnected(false);
        setDeviceConnected(false);
        setBridgeProtocol(null);
      }
    } catch (error) {
      // Bridge not running or not installed
      setBridgeConnected(false);
      setDeviceConnected(false);
      setBridgeProtocol(null);
    } finally {
      setChecking(false);
    }
  };

  /**
   * Download fingerprint bridge installer
   */
  const handleDownload = async () => {
    try {
      setDownloading(true);
      showInfo('📦 Preparing download...');

      // ✅ CRITICAL FIX: Download from static public file instead of API
      // This works in production (Vercel) because public files are served as static assets
      const downloadUrl = '/downloads/fingerprint-bridge-installer.zip';
      console.log('📥 Download URL:', downloadUrl);
      
      const response = await fetch(downloadUrl);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Download failed:', response.status, errorText);
        throw new Error(`Download failed (HTTP ${response.status})`);
      }

      // Create blob from response
      const blob = await response.blob();
      console.log('✅ Downloaded blob size:', blob.size, 'bytes');
      
      // Validate blob size
      if (blob.size < 100) {
        throw new Error('Downloaded file is too small, may be corrupted');
      }
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'fingerprint-bridge-installer.zip';
      document.body.appendChild(a);
      
      console.log('🎯 Triggering download...');
      a.click();
      
      // Cleanup
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        console.log('🧹 Cleaned up download resources');
      }, 100);

      showSuccess('✅ Download complete! Check your Downloads folder', {
        autoClose: 5000
      });
      setShowInstructions(true);

    } catch (error) {
      console.error('❌ Download error:', error);
      showError(`❌ Download failed: ${error.message}`, {
        autoClose: 10000
      });
    } finally {
      setDownloading(false);
    }
  };

  // Check status on mount and every 10 seconds
  // ✅ FIX: Disable auto-refresh in production to prevent console spam
  useEffect(() => {
    checkBridgeStatus();
    
    // Only auto-refresh in development environment
    // Use Vite's built-in environment variable
    const isDevelopment = import.meta.env.MODE === 'development';
    
    if (isDevelopment) {
      const interval = setInterval(() => {
        checkBridgeStatus();
      }, 10000); // Check every 10 seconds

      return () => clearInterval(interval);
    }
  }, []);

  return (
    <div style={{
      background: 'white',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      marginBottom: '20px'
    }}>
      {/* Status Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <i className="fas fa-fingerprint" style={{ 
            fontSize: '24px', 
            color: bridgeConnected ? '#10b981' : '#ef4444'
          }}></i>
          <div>
            <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>
              Fingerprint Scanner Status
            </h4>
            <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>
              {checking ? 'Checking...' : lastCheck ? `Last checked: ${lastCheck.toLocaleTimeString()}` : ''}
            </p>
          </div>
        </div>
        
        <button
          onClick={checkBridgeStatus}
          disabled={checking}
          style={{
            background: 'transparent',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '8px 16px',
            cursor: checking ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            color: '#6b7280',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            if (!checking) {
              e.currentTarget.style.background = '#f3f4f6';
              e.currentTarget.style.borderColor = '#d1d5db';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.borderColor = '#e5e7eb';
          }}
        >
          <i className={`fas fa-sync-alt ${checking ? 'fa-spin' : ''}`}></i>
          Refresh
        </button>
      </div>

      {/* Status Indicators */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '15px' }}>
        {/* Bridge Status */}
        <div style={{
          background: bridgeConnected ? '#f0fdf4' : '#fef2f2',
          border: `2px solid ${bridgeConnected ? '#10b981' : '#ef4444'}`,
          borderRadius: '8px',
          padding: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <div style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: bridgeConnected ? '#10b981' : '#ef4444',
            animation: bridgeConnected ? 'pulse 2s infinite' : 'none'
          }}></div>
          <div>
            <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>Bridge Software</div>
            <div style={{ 
              fontSize: '14px', 
              fontWeight: 'bold', 
              color: bridgeConnected ? '#10b981' : '#ef4444'
            }}>
              {bridgeConnected ? '✅ Connected' : '❌ Not Installed'}
            </div>
          </div>
        </div>

        {/* Device Status */}
        <div style={{
          background: deviceConnected ? '#f0fdf4' : '#fef2f2',
          border: `2px solid ${deviceConnected ? '#10b981' : '#ef4444'}`,
          borderRadius: '8px',
          padding: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <div style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: deviceConnected ? '#10b981' : '#ef4444',
            animation: deviceConnected ? 'pulse 2s infinite' : 'none'
          }}></div>
          <div>
            <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>USB Scanner</div>
            <div style={{ 
              fontSize: '14px', 
              fontWeight: 'bold', 
              color: deviceConnected ? '#10b981' : '#ef4444'
            }}>
              {deviceConnected ? '✅ Connected' : '❌ Not Detected'}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {!bridgeConnected && (
        <div style={{
          background: '#fef3c7',
          border: '2px solid #f59e0b',
          borderRadius: '8px',
          padding: '15px',
          marginBottom: '15px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <i className="fas fa-exclamation-triangle" style={{ color: '#f59e0b', fontSize: '20px' }}></i>
            <strong style={{ color: '#92400e' }}>Bridge software not installed</strong>
          </div>
          <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#92400e' }}>
            To use fingerprint scanner features (attendance & enrollment), you need to install the bridge software on this computer.
          </p>
          <button
            onClick={handleDownload}
            disabled={downloading}
            style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: downloading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              opacity: downloading ? 0.7 : 1,
              transition: 'all 0.3s'
            }}
            onMouseEnter={(e) => {
              if (!downloading) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {downloading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                Downloading...
              </>
            ) : (
              <>
                <i className="fas fa-download"></i>
                Download Bridge Installer
              </>
            )}
          </button>
          <button
            onClick={() => setShowInstructions(!showInstructions)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#92400e',
              fontSize: '13px',
              cursor: 'pointer',
              marginTop: '8px',
              textDecoration: 'underline',
              padding: 0
            }}
          >
            {showInstructions ? '▼ Hide' : '▶'} Installation Instructions
          </button>
        </div>
      )}

      {/* Installation Instructions */}
      {showInstructions && (
        <div style={{
          background: '#f9fafb',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '15px',
          fontSize: '14px',
          lineHeight: '1.6'
        }}>
          <h5 style={{ margin: '0 0 10px 0', fontSize: '16px', fontWeight: 'bold' }}>
            📋 Installation Steps:
          </h5>
          <ol style={{ margin: 0, paddingLeft: '20px' }}>
            <li>Click "Download Bridge Installer" button above</li>
            <li>Extract the downloaded ZIP file to a permanent location (e.g., C:\fingerprint-bridge)</li>
            <li>Connect your ZKTeco fingerprint scanner via USB</li>
            <li><strong>Right-click "INSTALL_AUTO_SERVICE.bat"</strong> and select <strong>"Run as Administrator"</strong></li>
            <li>Wait for installation to complete (the service will start automatically)</li>
            <li>Refresh this page - you should see "Bridge Software: ✅ Connected"</li>
          </ol>
          <div style={{
            background: '#fef3c7',
            borderLeft: '4px solid #f59e0b',
            padding: '10px',
            marginTop: '12px',
            fontSize: '13px'
          }}>
            <strong>⚠️ Important:</strong> Make sure Node.js and Python with pyzkfp library are installed first!
          </div>
        </div>
      )}

      {/* Success Message */}
      {bridgeConnected && deviceConnected && (
        <div style={{
          background: '#f0fdf4',
          border: '2px solid #10b981',
          borderRadius: '8px',
          padding: '15px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <i className="fas fa-check-circle" style={{ color: '#10b981', fontSize: '24px' }}></i>
          <div>
            <strong style={{ color: '#065f46', fontSize: '15px' }}>
              ✅ Fingerprint scanner ready!
            </strong>
            <p style={{ margin: '5px 0 0 0', fontSize: '13px', color: '#065f46' }}>
              You can now use fingerprint attendance and enrollment features.
            </p>
          </div>
        </div>
      )}

      {bridgeConnected && !deviceConnected && (
        <div style={{
          background: '#fef3c7',
          border: '2px solid #f59e0b',
          borderRadius: '8px',
          padding: '15px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <i className="fas fa-usb" style={{ color: '#f59e0b', fontSize: '24px' }}></i>
          <div>
            <strong style={{ color: '#92400e', fontSize: '15px' }}>
              USB scanner not detected
            </strong>
            <p style={{ margin: '5px 0 0 0', fontSize: '13px', color: '#92400e' }}>
              Please connect your ZKTeco fingerprint scanner via USB and wait a few seconds.
            </p>
          </div>
        </div>
      )}

      {/* CSS for pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
};

export default FingerprintBridgeStatus;
