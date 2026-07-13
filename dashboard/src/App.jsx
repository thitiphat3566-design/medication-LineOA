import React, { useState, useEffect } from 'react';
import { Activity, Pill, Users, AlertCircle, HeartPulse, Clock } from 'lucide-react';
import './index.css';

const API_BASE = 'http://localhost:3000/api/dashboard';

function App() {
  const [stats, setStats] = useState({ totalActivePatients: 0, patientsTakenMedsToday: 0, patientsMissedMedsToday: 0 });
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, alertsRes] = await Promise.all([
          fetch(`${API_BASE}/stats`),
          fetch(`${API_BASE}/alerts`)
        ]);
        
        if (statsRes.ok) setStats(await statsRes.json());
        if (alertsRes.ok) setAlerts(await alertsRes.json());
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    // Poll every 5 seconds for real-time updates
    const intervalId = setInterval(fetchData, 5000);
    
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="dashboard-container">
      <header className="header">
        <h1>Medication Monitor</h1>
        <div className="status-indicator">
          <div className="dot"></div>
          {loading ? 'Connecting...' : 'Live Data Active'}
        </div>
      </header>

      <div className="stats-grid">
        <div className="glass-card stat-box">
          <div className="stat-icon-wrapper primary">
            <Users size={32} strokeWidth={2.5} />
          </div>
          <div className="stat-title">ผู้ป่วยในระบบทั้งหมด</div>
          <div className="stat-value primary">{stats.totalActivePatients}</div>
        </div>
        
        <div className="glass-card stat-box">
          <div className="stat-icon-wrapper success">
            <Pill size={32} strokeWidth={2.5} />
          </div>
          <div className="stat-title">ทานยาครบวันนี้</div>
          <div className="stat-value success">{stats.patientsTakenMedsToday}</div>
        </div>
        
        <div className="glass-card stat-box">
          <div className="stat-icon-wrapper danger">
            <AlertCircle size={32} strokeWidth={2.5} />
          </div>
          <div className="stat-title">ลืมทานยาวันนี้</div>
          <div className="stat-value danger">{stats.patientsMissedMedsToday}</div>
        </div>
      </div>

      <div className="glass-card alerts-section">
        <div className="alerts-header">
          <div className="icon-badge primary">
            <Activity size={24} strokeWidth={2.5} />
          </div>
          <h2>การแจ้งเตือนฉุกเฉิน (Alerts)</h2>
        </div>
        
        {alerts.length === 0 ? (
          <div className="empty-state">
            <HeartPulse size={48} className="empty-icon" />
            <p className="empty-title">ไม่มีการแจ้งเตือนผิดปกติในขณะนี้</p>
            <p className="empty-subtitle">ผู้ป่วยทุกคนมีสถานะปกติ</p>
          </div>
        ) : (
          <div className="alerts-list">
            {alerts.map((alert, index) => (
              <div key={index} className={`alert-card ${alert.type}`}>
                <div className="alert-time">
                  <Clock size={16} />
                  <span>{new Date(alert.time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                
                <div className="alert-details">
                  <div className="alert-user">
                    <span className="label">UserID:</span>
                    <span className="user-id-mono">{alert.userId}</span>
                  </div>
                  <div className="alert-message">
                    {alert.type === 'abnormal_symptom' 
                      ? 'มีอาการผิดปกติ (ต้องการความช่วยเหลือ)' 
                      : 'ขาดประวัติการทานยา'}
                  </div>
                </div>
                
                <div className="alert-action">
                  <span className={`status-badge ${alert.type === 'abnormal_symptom' ? 'danger' : 'warning'}`}>
                    <span className="pulse-dot"></span>
                    {alert.type === 'abnormal_symptom' ? 'วิกฤต' : 'ติดตาม'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
