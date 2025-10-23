// Test backend syntax errors
import('./employee/payroll-backend/server.js')
  .then(() => {
    console.log('✅ Backend syntax OK - no compile errors');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Backend syntax errors found:');
    console.error(err);
    process.exit(1);
  });
