import React from 'react';

// Real-time clock component
function ClockBar() {
  const [now, setNow] = React.useState(new Date());
  React.useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const day = days[now.getDay()];
  const date = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  return (
    <span style={{ fontSize: '1rem', fontWeight: 500, color: 'white' }}>
      {day} | {date} {time}
    </span>
  );
}

const AdminHeader = () => {
  return (
    <div 
      className="d-flex justify-content-between align-items-center px-4 py-3"
      style={{
        background: '#f06a98',
        color: 'white',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}
    >
      <ClockBar />
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontWeight: 600, fontSize: '1.05rem' }}>
          Rae Disenyo Garden and Landscaping Services
        </div>
        <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>
          SUPERADMIN
        </div>
      </div>
    </div>
  );
};

export default AdminHeader;
