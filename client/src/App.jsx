import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import Header from './components/Header';
import SOSPanel from './components/SOSPanel';
import MapPanel from './components/MapPanel';
import CommandPanel from './components/CommandPanel';
import ActivityLog from './components/ActivityLog';
import ToastContainer from './components/ToastContainer';

const API = 'http://localhost:5000/api';

function App() {
  const [state, setState] = useState({
    sos: [], resources: [], assignments: [], metrics: {
      totalRequests: 0, totalAssigned: 0, totalResolved: 0, totalReallocations: 0,
      avgResponseTime: 0, efficiencyScore: 0, scenariosRun: 0,
    },
    activeScenario: null, simulationRunning: false,
  });
  const [logs, setLogs] = useState([]);
  const [scenarios, setScenarios] = useState([]);
  const [selectedSOS, setSelectedSOS] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [activeTab, setActiveTab] = useState('requests');
  const prevSOSCount = useRef(0);
  const prevAssignCount = useRef(0);

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev.slice(-4), { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500);
  }, []);

  const fetchState = useCallback(async () => {
    try {
      const [stateRes, logsRes] = await Promise.all([
        axios.get(`${API}/state`),
        axios.get(`${API}/logs?limit=80`),
      ]);
      const newState = stateRes.data;

      // Toast on new SOS
      if (newState.sos.length > prevSOSCount.current && prevSOSCount.current > 0) {
        const newSOS = newState.sos[0];
        if (newSOS) addToast(`New SOS: ${newSOS.caseId} [${newSOS.urgency}]`, newSOS.urgency === 'Critical' ? 'critical' : 'warning');
      }
      // Toast on new assignment
      if (newState.metrics.totalAssigned > prevAssignCount.current && prevAssignCount.current > 0) {
        addToast(`AI auto-assigned resource`, 'success');
      }

      prevSOSCount.current = newState.sos.length;
      prevAssignCount.current = newState.metrics.totalAssigned;
      setState(newState);
      setLogs(logsRes.data);
    } catch (err) { /* silent */ }
  }, [addToast]);

  useEffect(() => {
    fetchState();
    axios.get(`${API}/scenarios`).then(r => setScenarios(r.data)).catch(() => {});
    const interval = setInterval(fetchState, 1500);
    return () => clearInterval(interval);
  }, [fetchState]);

  const runScenario = async (key) => {
    try {
      await axios.post(`${API}/simulate`, { scenario: key });
      addToast('Scenario launched!', 'info');
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed to start', 'critical');
    }
  };

  const addManualSOS = async (data) => {
    try {
      await axios.post(`${API}/sos`, data);
    } catch (err) { addToast('Failed to create SOS', 'critical'); }
  };

  const releaseResource = async (id) => {
    try {
      await axios.post(`${API}/resources/release/${id}`);
      addToast('Resource released', 'success');
    } catch (err) { addToast('Failed to release', 'critical'); }
  };

  const toggleOffline = async (id) => {
    try {
      await axios.post(`${API}/resources/toggle-offline/${id}`);
    } catch (err) { addToast('Failed to toggle', 'critical'); }
  };

  const resetSystem = async () => {
    try {
      await axios.post(`${API}/reset`);
      setSelectedSOS(null);
      addToast('System reset complete', 'info');
    } catch (err) { addToast('Reset failed', 'critical'); }
  };

  const { sos, resources, metrics, activeScenario, simulationRunning } = state;
  const pending = sos.filter(s => s.status === 'Pending');
  const assigned = sos.filter(s => s.status === 'Assigned');
  const resolved = sos.filter(s => s.status === 'Resolved');

  return (
    <div style={{ background: 'var(--bg-page)', minHeight: '100vh', padding: '0 20px 20px 20px', fontFamily: "'Inter', sans-serif" }}>
      <ToastContainer toasts={toasts} />

      <Header
        metrics={metrics}
        pending={pending.length}
        assigned={assigned.length}
        resolved={resolved.length}
        simulationRunning={simulationRunning}
        activeScenario={activeScenario}
        onReset={resetSystem}
      />

      <div className="dashboard-grid" style={{ marginTop: 16 }}>
        {/* Left: SOS Feed + Resources */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, overflow: 'hidden' }}>
          <SOSPanel
            sos={sos}
            resources={resources}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            selectedSOS={selectedSOS}
            onSelectSOS={setSelectedSOS}
            onRelease={releaseResource}
            onToggleOffline={toggleOffline}
            onAddSOS={addManualSOS}
          />
        </div>

        {/* Center: Map + Activity Log */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, overflow: 'hidden' }}>
          <MapPanel
            sos={sos}
            resources={resources}
            selectedSOS={selectedSOS}
            onSelectSOS={setSelectedSOS}
            activeScenario={activeScenario}
          />
          <ActivityLog logs={logs} />
        </div>

        {/* Right: Command + Scenarios + Metrics */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, overflow: 'hidden' }}>
          <CommandPanel
            metrics={metrics}
            scenarios={scenarios}
            simulationRunning={simulationRunning}
            onRunScenario={runScenario}
            selectedSOS={selectedSOS}
            resources={resources}
            pending={pending.length}
            assigned={assigned.length}
            resolved={resolved.length}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
