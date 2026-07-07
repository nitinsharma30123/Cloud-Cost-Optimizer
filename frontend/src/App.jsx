import React, { useState, useEffect } from 'react';
import './App.css';

const API_BASE =
  import.meta.env.VITE_API_BASE ||
  "https://cloud-cost-optimizer-2-ia6j.onrender.com/api";


// Predefined cloud budget items
const DEFAULT_BUDGET_ITEMS = [
  { id: 1, name: "RDS Database (Multi-AZ)", cost: 450, performance: 180, desc: "High availability PostgreSQL database cluster" },
  { id: 2, name: "ElastiCache Redis Grid", cost: 200, performance: 75, desc: "In-memory caching layer for rapid page loads" },
  { id: 3, name: "GPU Node (p3.2xlarge)", cost: 800, performance: 350, desc: "NVIDIA V100 GPU instance for deep learning jobs" },
  { id: 4, name: "Lambda Serverless Tier", cost: 120, performance: 50, desc: "Event-driven edge APIs with auto scaling" },
  { id: 5, name: "S3 Storage Tier (Premium)", cost: 100, performance: 30, desc: "Object storage with global replication" },
  { id: 6, name: "CloudFront CDN Edge", cost: 150, performance: 65, desc: "Global content delivery network caching" },
  { id: 7, name: "EKS Kubernetes Master", cost: 300, performance: 110, desc: "Managed Kubernetes orchestrator control plane" },
  { id: 8, name: "DynamoDB Global Table", cost: 400, performance: 160, desc: "NoSQL DB with multi-region active-active replicas" },
  { id: 9, name: "Route53 DNS Failover", cost: 80, performance: 25, desc: "Global traffic manager & active DNS health checks" },
  { id: 10, name: "EC2 Auto-scaling Group", cost: 350, performance: 140, desc: "Standard Linux worker pools with CPU scaling" },
];

// Predefined multi-region graph structure
const REGION_NODES = {
  "us-west-2": { name: "Oregon (us-west-2)", x: 80, y: 120 },
  "us-east-1": { name: "Virginia (us-east-1)", x: 190, y: 130 },
  "sa-east-1": { name: "São Paulo (sa-east-1)", x: 230, y: 290 },
  "eu-west-1": { name: "Ireland (eu-west-1)", x: 350, y: 110 },
  "eu-central-1": { name: "Frankfurt (eu-central-1)", x: 410, y: 130 },
  "ap-southeast-1": { name: "Singapore (ap-southeast-1)", x: 520, y: 240 },
  "ap-northeast-1": { name: "Tokyo (ap-northeast-1)", x: 590, y: 130 }
};

const REGION_EDGES = [
  { source: "us-west-2", target: "us-east-1", latencyMs: 70, costPerGB: 0.01 },
  { source: "us-west-2", target: "ap-northeast-1", latencyMs: 110, costPerGB: 0.03 },
  { source: "us-west-2", target: "ap-southeast-1", latencyMs: 170, costPerGB: 0.05 },
  { source: "us-east-1", target: "sa-east-1", latencyMs: 120, costPerGB: 0.04 },
  { source: "us-east-1", target: "eu-west-1", latencyMs: 80, costPerGB: 0.02 },
  { source: "eu-west-1", target: "eu-central-1", latencyMs: 15, costPerGB: 0.005 },
  { source: "eu-central-1", target: "ap-southeast-1", latencyMs: 160, costPerGB: 0.06 },
  { source: "eu-central-1", target: "ap-northeast-1", latencyMs: 210, costPerGB: 0.07 },
  { source: "ap-southeast-1", target: "ap-northeast-1", latencyMs: 60, costPerGB: 0.02 },
  { source: "sa-east-1", target: "ap-southeast-1", latencyMs: 280, costPerGB: 0.09 },
];

function App() {
  const [engine, setEngine] = useState('cpp'); // 'cpp' or 'js'
  const [activeTab, setActiveTab] = useState('placement');
  const [loading, setLoading] = useState(false);
  const [executionLog, setExecutionLog] = useState({ timeMs: 0, engineUsed: 'none' });

  // 1. VM Placement State
  const [hostCpu, setHostCpu] = useState(64);
  const [hostRam, setHostRam] = useState(256);
  const [hostCost, setHostCost] = useState(3.5);
  const [vmCountInput, setVmCountInput] = useState(20);
  const [vms, setVms] = useState([]);
  const [placementResults, setPlacementResults] = useState(null);

  // 2. Scheduler State
  const [vmCount, setVmCount] = useState(4);
  const [slaThreshold, setSlaThreshold] = useState(5.0);
  const [taskCountInput, setTaskCountInput] = useState(25);
  const [tasks, setTasks] = useState([]);
  const [scheduleResult, setScheduleResult] = useState(null);

  // 3. Budget Allocator State
  const [budgetLimit, setBudgetLimit] = useState(1200);
  const [budgetItems, setBudgetItems] = useState(DEFAULT_BUDGET_ITEMS);
  const [enabledBudgetIds, setEnabledBudgetIds] = useState(DEFAULT_BUDGET_ITEMS.map(i => i.id));
  const [budgetResult, setBudgetResult] = useState(null);

  // 4. Graph Router State
  const [startRegion, setStartRegion] = useState('us-west-2');
  const [targetRegion, setTargetRegion] = useState('ap-northeast-1');
  const [routeMode, setRouteMode] = useState('cost'); // 'cost' or 'latency'
  const [routeResult, setRouteResult] = useState(null);

  // Initial generation
  useEffect(() => {
    generateRandomVMs();
    generateRandomTasks();
  }, []);

  // Recalculate routing when inputs change
  useEffect(() => {
    if (activeTab === 'route') {
      runRoutingOptimization();
    }
  }, [startRegion, targetRegion, routeMode, engine]);

  // Recalculate budgeting when toggle list or limit changes
  useEffect(() => {
    if (activeTab === 'budget') {
      runBudgetOptimization();
    }
  }, [enabledBudgetIds, budgetLimit, engine]);

  // --- VM Placement Helpers ---
  const generateRandomVMs = () => {
    const list = [];
    const cpuTiers = [1, 2, 4, 8, 16];
    const ramTiers = [2, 4, 8, 16, 32, 64];
    
    for (let i = 1; i <= vmCountInput; i++) {
      const cpu = cpuTiers[Math.floor(Math.random() * cpuTiers.length)];
      // Ram is typically 2x to 8x CPU cores
      const ramMult = [2, 4, 8][Math.floor(Math.random() * 3)];
      const ram = Math.min(ramTiers[ramTiers.length - 1], cpu * ramMult);
      const costPerHour = parseFloat(((cpu * 0.05) + (ram * 0.01)).toFixed(2));
      list.push({ id: i, cpu, ram, costPerHour });
    }
    setVms(list);
    setPlacementResults(null);
  };

  const runPlacement = async () => {
    setLoading(true);
    const start = performance.now();
    try {
      const response = await fetch(`${API_BASE}/placement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hostCpu: parseInt(hostCpu),
          hostRam: parseInt(hostRam),
          hostCostPerHour: parseFloat(hostCost),
          vms,
          engine
        })
      });
      if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
}

const res = await response.json();
      setPlacementResults(res.data);
      setExecutionLog({
        timeMs: parseFloat((performance.now() - start).toFixed(2)),
        engineUsed: res.engineUsed
      });
    } catch (err) {
  console.error("Fetch Error:", err);

  if (err instanceof Error) {
    alert(err.message);
  } else {
    alert(JSON.stringify(err));
  }
}
    setLoading(false);
  };

  // --- Task Scheduler Helpers ---
  const generateRandomTasks = () => {
    const list = [];
    let curArrival = 0.0;
    for (let i = 1; i <= taskCountInput; i++) {
      // Random arrival time stream
      curArrival += parseFloat((Math.random() * 1.5).toFixed(1));
      const burstTime = parseFloat((1.0 + Math.random() * 7.0).toFixed(1));
      const priority = Math.floor(Math.random() * 4); // 0 (critical), 1, 2, 3 (batch)
      list.push({
        id: i,
        arrivalTime: parseFloat(curArrival.toFixed(1)),
        burstTime,
        priority
      });
    }
    setTasks(list);
    setScheduleResult(null);
  };

  const runScheduling = async () => {
    setLoading(true);
    const start = performance.now();
    try {
      const response = await fetch(`${API_BASE}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vmCount: parseInt(vmCount),
          slaThreshold: parseFloat(slaThreshold),
          tasks,
          engine
        })
      });
      const res = await response.json();
      setScheduleResult(res.data);
      setExecutionLog({
        timeMs: parseFloat((performance.now() - start).toFixed(2)),
        engineUsed: res.engineUsed
      });
    } catch (err) {
      console.error(err);
      alert("Error contacting optimizer server.");
    }
    setLoading(false);
  };

  // --- Budget Allocator Helpers ---
  const toggleBudgetItem = (id) => {
    if (enabledBudgetIds.includes(id)) {
      setEnabledBudgetIds(enabledBudgetIds.filter(i => i !== id));
    } else {
      setEnabledBudgetIds([...enabledBudgetIds, id]);
    }
  };

  const runBudgetOptimization = async () => {
    const filtered = budgetItems.filter(item => enabledBudgetIds.includes(item.id));
    if (filtered.length === 0) return;

    setLoading(true);
    const start = performance.now();
    try {
      const response = await fetch(`${API_BASE}/budget`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          budgetLimit: parseInt(budgetLimit),
          items: filtered,
          engine
        })
      });
      const res = await response.json();
      setBudgetResult(res.data);
      setExecutionLog({
        timeMs: parseFloat((performance.now() - start).toFixed(2)),
        engineUsed: res.engineUsed
      });
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  // --- Routing Optimization ---
  const runRoutingOptimization = async () => {
    if (startRegion === targetRegion) {
      setRouteResult({ pathFound: true, path: [startRegion], totalLatency: 0, totalCostPerGB: 0 });
      return;
    }

    setLoading(true);
    const start = performance.now();
    try {
      const response = await fetch(`${API_BASE}/route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startRegion,
          targetRegion,
          mode: routeMode,
          edges: REGION_EDGES,
          engine
        })
      });
      const res = await response.json();
      setRouteResult(res.data);
      setExecutionLog({
        timeMs: parseFloat((performance.now() - start).toFixed(2)),
        engineUsed: res.engineUsed
      });
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  // Render CPU/RAM usage representation
  const renderHostVisualization = (host, cpuCap, ramCap) => {
    const cpuPct = (host.cpuUsed / cpuCap) * 100;
    const ramPct = (host.ramUsed / ramCap) * 100;
    const avgPct = (cpuPct + ramPct) / 2;
    
    let boxClass = "host-box active";
    if (avgPct >= 90) boxClass += " host-box-full";

    return (
      <div key={host.id} className={boxClass}>
        <div className="host-title">H-{host.id}</div>
        <div className="fill-bar-container" title={`CPU: ${host.cpuUsed}/${cpuCap} Cores`}>
          <div className="fill-bar" style={{ width: `${cpuPct}%` }}></div>
        </div>
        <div className="fill-bar-container" title={`RAM: ${host.ramUsed}/${ramCap} GB`}>
          <div className="fill-bar high" style={{ width: `${ramPct}%` }}></div>
        </div>
        
        <div className="host-tooltip">
          <strong>Host Server {host.id}</strong><br />
          CPU: {host.cpuUsed} / {cpuCap} cores ({cpuPct.toFixed(0)}%)<br />
          RAM: {host.ramUsed} / {ramCap} GB ({ramPct.toFixed(0)}%)<br />
          VMs Packed: {host.hostedVmIds.length} <br />
          (ID: {host.hostedVmIds.join(', ')})
        </div>
      </div>
    );
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="brand-section">
          <div className="brand-icon">Ω</div>
          <div>
            <h1>CloudCostOptimizer</h1>
            <p>High-Performance C++ DSA Resource Allocation & Cost Simulation Engine</p>
          </div>
        </div>
        
        <div className="controls-section">
          <div className="engine-toggle-container">
            <button 
              className={`engine-btn ${engine === 'cpp' ? 'active' : ''}`}
              onClick={() => setEngine('cpp')}
            >
              C++ Core
            </button>
            <button 
              className={`engine-btn ${engine === 'js' ? 'active js-mode' : ''}`}
              onClick={() => setEngine('js')}
            >
              JavaScript Fallback
            </button>
          </div>
          <span className={`status-badge ${executionLog.engineUsed.startsWith('cpp') ? 'cpp' : 'js'}`}>
            Engine: {executionLog.engineUsed}
          </span>
        </div>
      </header>

      {/* Tabs */}
      <nav className="tabs-nav">
        <button 
          className={`tab-btn ${activeTab === 'placement' ? 'active' : ''}`}
          onClick={() => { setActiveTab('placement'); setExecutionLog({ timeMs: 0, engineUsed: 'none' }); }}
        >
          📦 VM Placement (Bin Packing)
        </button>
        <button 
          className={`tab-btn ${activeTab === 'schedule' ? 'active' : ''}`}
          onClick={() => { setActiveTab('schedule'); setExecutionLog({ timeMs: 0, engineUsed: 'none' }); }}
        >
          🕒 Event Scheduler (Priority Queue)
        </button>
        <button 
          className={`tab-btn ${activeTab === 'budget' ? 'active' : ''}`}
          onClick={() => { setActiveTab('budget'); setExecutionLog({ timeMs: 0, engineUsed: 'none' }); }}
        >
          💰 Profile Budgeting (DP Knapsack)
        </button>
        <button 
          className={`tab-btn ${activeTab === 'route' ? 'active' : ''}`}
          onClick={() => { setActiveTab('route'); setExecutionLog({ timeMs: 0, engineUsed: 'none' }); }}
        >
          🗺️ Regional Routing (Graph Dijkstra)
        </button>
      </nav>

      {/* Workspace */}
      <main className="workspace-content">
        
        {/* Sidebar Controls */}
        <section className="sidebar-panel">
          
          {activeTab === 'placement' && (
            <>
              <div className="panel-title">Placement Config</div>
              
              <div className="form-group">
                <label>Physical Host CPU Capacity</label>
                <select value={hostCpu} onChange={e => setHostCpu(e.target.value)}>
                  <option value="16">16 Cores</option>
                  <option value="32">32 Cores</option>
                  <option value="64">64 Cores (Std)</option>
                  <option value="128">128 Cores</option>
                </select>
              </div>

              <div className="form-group">
                <label>Physical Host RAM Capacity</label>
                <select value={hostRam} onChange={e => setHostRam(e.target.value)}>
                  <option value="64">64 GB</option>
                  <option value="128">128 GB</option>
                  <option value="256">256 GB (Std)</option>
                  <option value="512">512 GB</option>
                </select>
              </div>

              <div className="form-group">
                <label>Active Host Rental Cost ($/hr)</label>
                <input type="number" step="0.5" value={hostCost} onChange={e => setHostCost(e.target.value)} />
              </div>

              <div className="form-group">
                <label>Number of VMs to place</label>
                <input type="number" value={vmCountInput} onChange={e => setVmCountInput(e.target.value)} />
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <button className="btn-secondary" onClick={generateRandomVMs} style={{ flexGrow: 1 }}>Regen VMs</button>
                <button className="btn-primary" onClick={runPlacement} style={{ flexGrow: 1 }} disabled={loading}>
                  {loading ? 'Optimizing...' : 'Run DSA Placement'}
                </button>
              </div>
            </>
          )}

          {activeTab === 'schedule' && (
            <>
              <div className="panel-title">Scheduling Config</div>
              
              <div className="form-group">
                <label>Active VMs Cluster Size</label>
                <select value={vmCount} onChange={e => setVmCount(e.target.value)}>
                  <option value="2">2 Instance Cluster</option>
                  <option value="4">4 Instance Cluster (Std)</option>
                  <option value="8">8 Instance Cluster</option>
                </select>
              </div>

              <div className="form-group">
                <label>SLA Wait Delay Limit (sec)</label>
                <input type="number" step="0.5" value={slaThreshold} onChange={e => setSlaThreshold(e.target.value)} />
              </div>

              <div className="form-group">
                <label>Queue Batch Jobs Count</label>
                <input type="number" value={taskCountInput} onChange={e => setTaskCountInput(e.target.value)} />
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <button className="btn-secondary" onClick={generateRandomTasks} style={{ flexGrow: 1 }}>Regen Jobs</button>
                <button className="btn-primary" onClick={runScheduling} style={{ flexGrow: 1 }} disabled={loading}>
                  {loading ? 'Simulating...' : 'Run Simulation'}
                </button>
              </div>
            </>
          )}

          {activeTab === 'budget' && (
            <>
              <div className="panel-title">Budget Config</div>
              
              <div className="form-group">
                <label>Total Infrastructure Budget ($/mo)</label>
                <input 
                  type="range" 
                  min="300" 
                  max="3000" 
                  step="50"
                  value={budgetLimit} 
                  onChange={e => setBudgetLimit(parseInt(e.target.value))} 
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>
                  <span>$300</span>
                  <span style={{ color: 'var(--accent-purple)', fontWeight: 'bold' }}>${budgetLimit} Limit</span>
                  <span>$3000</span>
                </div>
              </div>

              <div className="alert-box" style={{ background: 'rgba(168, 85, 247, 0.05)', padding: '10px', borderRadius: '6px', fontSize: '0.8rem', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
                <strong>Dynamic Programming:</strong> Maximize infrastructure performance capability without breaching the budget limit (Classical Knapsack solver).
              </div>
            </>
          )}

          {activeTab === 'route' && (
            <>
              <div className="panel-title">Routing Nodes</div>
              
              <div className="form-group">
                <label>Source Node Region</label>
                <select value={startRegion} onChange={e => setStartRegion(e.target.value)}>
                  {Object.keys(REGION_NODES).map(key => (
                    <option key={key} value={key}>{key}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Target Destination Region</label>
                <select value={targetRegion} onChange={e => setTargetRegion(e.target.value)}>
                  {Object.keys(REGION_NODES).map(key => (
                    <option key={key} value={key}>{key}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Dijkstra Optimization Metric</label>
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <button 
                    className={`btn-secondary ${routeMode === 'cost' ? 'active' : ''}`}
                    onClick={() => setRouteMode('cost')}
                    style={{ flexGrow: 1, borderColor: routeMode === 'cost' ? 'var(--accent-cyan)' : 'var(--bg-card-border)' }}
                  >
                    Minimize Cost
                  </button>
                  <button 
                    className={`btn-secondary ${routeMode === 'latency' ? 'active' : ''}`}
                    onClick={() => setRouteMode('latency')}
                    style={{ flexGrow: 1, borderColor: routeMode === 'latency' ? 'var(--accent-cyan)' : 'var(--bg-card-border)' }}
                  >
                    Minimize Latency
                  </button>
                </div>
              </div>
            </>
          )}

          {/* VM List snippet under sidebar when relevant */}
          {activeTab === 'placement' && vms.length > 0 && (
            <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minHeight: '150px' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '4px', borderTop: '1px solid var(--bg-card-border)', paddingTop: '10px' }}>
                Generated VM Inventory ({vms.length})
              </div>
              <div style={{ flexGrow: 1, overflowY: 'auto', maxHeight: '200px', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                      <th>ID</th>
                      <th>CPU</th>
                      <th>RAM</th>
                      <th>Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vms.map(vm => (
                      <tr key={vm.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td>VM-{vm.id}</td>
                        <td>{vm.cpu}c</td>
                        <td>{vm.ram}G</td>
                        <td>${vm.costPerHour}/hr</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </section>

        {/* Display Panel */}
        <section className="display-panel">
          
          {/* TAB 1: VM Placement Dashboard */}
          {activeTab === 'placement' && (
            <>
              {/* Placement Metrics Row */}
              {placementResults ? (
                <div className="metrics-row">
                  <div className="metric-card">
                    <span className="metric-title">Optimal Host Count</span>
                    <span className="metric-value">{placementResults.firstFitDecreasing.hostsUsed} Active</span>
                    <span className="metric-sub">Using First Fit Decreasing</span>
                  </div>
                  <div className="metric-card purple">
                    <span className="metric-title">FFD Cost / Hour</span>
                    <span className="metric-value">${placementResults.firstFitDecreasing.totalCostPerHour.toFixed(2)}</span>
                    <span className="metric-sub">Saves money vs FF (${placementResults.firstFit.totalCostPerHour.toFixed(2)})</span>
                  </div>
                  <div className="metric-card emerald">
                    <span className="metric-title">CPU Utilization (FFD)</span>
                    <span className="metric-value">{placementResults.firstFitDecreasing.averageCpuUtilization.toFixed(1)}%</span>
                    <span className="metric-sub">Tight bin allocation</span>
                  </div>
                  <div className="metric-card amber">
                    <span className="metric-title">RAM Utilization (FFD)</span>
                    <span className="metric-value">{placementResults.firstFitDecreasing.averageRamUtilization.toFixed(1)}%</span>
                    <span className="metric-sub">Minimal capacity waste</span>
                  </div>
                </div>
              ) : (
                <div className="alert-box" style={{ background: 'rgba(6, 182, 212, 0.05)', padding: '2rem', textAlign: 'center', border: '1px solid var(--bg-card-border)', borderRadius: '12px' }}>
                  <h3>No Placement Optimizations Run Yet</h3>
                  <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>Adjust options in the sidebar and click "Run DSA Placement" to run the bin-packing comparison.</p>
                </div>
              )}

              {/* Placement Visualizer Grid */}
              {placementResults && (
                <div className="visual-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '1.1rem' }}>Host Allocation Visual Comparison</h3>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Blue bar = CPU load, Green bar = RAM load</span>
                  </div>

                  <div className="algorithms-comparison-grid">
                    
                    {/* First Fit */}
                    <div className="algo-block">
                      <div className="algo-header">
                        <span>First Fit (Greedy FF)</span>
                        <span className="algo-badge" style={{ background: 'rgba(244, 63, 94, 0.1)', color: 'var(--accent-rose)', borderColor: 'rgba(244,63,94,0.2)' }}>
                          {placementResults.firstFit.hostsUsed} Hosts
                        </span>
                      </div>
                      <div className="host-grid">
                        {placementResults.firstFit.hosts.map(h => renderHostVisualization(h, hostCpu, hostRam))}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                        Cost: <strong>${placementResults.firstFit.totalCostPerHour.toFixed(2)}/hr</strong>
                      </div>
                    </div>

                    {/* Best Fit */}
                    <div className="algo-block">
                      <div className="algo-header">
                        <span>Best Fit (Greedy BF)</span>
                        <span className="algo-badge" style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--accent-amber)', borderColor: 'rgba(245,158,11,0.2)' }}>
                          {placementResults.bestFit.hostsUsed} Hosts
                        </span>
                      </div>
                      <div className="host-grid">
                        {placementResults.bestFit.hosts.map(h => renderHostVisualization(h, hostCpu, hostRam))}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                        Cost: <strong>${placementResults.bestFit.totalCostPerHour.toFixed(2)}/hr</strong>
                      </div>
                    </div>

                    {/* First Fit Decreasing */}
                    <div className="algo-block highlight">
                      <div className="algo-header">
                        <span>First Fit Decreasing (FFD)</span>
                        <span className="algo-badge">
                          {placementResults.firstFitDecreasing.hostsUsed} Hosts
                        </span>
                      </div>
                      <div className="host-grid">
                        {placementResults.firstFitDecreasing.hosts.map(h => renderHostVisualization(h, hostCpu, hostRam))}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-emerald)', textAlign: 'center' }}>
                        Cost: <strong>${placementResults.firstFitDecreasing.totalCostPerHour.toFixed(2)}/hr</strong> (Optimized)
                      </div>
                    </div>

                  </div>
                </div>
              )}
            </>
          )}

          {/* TAB 2: Task Scheduler Dashboard */}
          {activeTab === 'schedule' && (
            <>
              {scheduleResult ? (
                <div className="metrics-row">
                  <div className="metric-card">
                    <span className="metric-title">Simulated Jobs</span>
                    <span className="metric-value">{scheduleResult.tasksCompleted} Completed</span>
                    <span className="metric-sub">Event simulation completed</span>
                  </div>
                  <div className="metric-card purple">
                    <span className="metric-title">Avg Waiting Queue Latency</span>
                    <span className="metric-value">{scheduleResult.averageWaitTime.toFixed(2)}s</span>
                    <span className="metric-sub">Time waiting for free VM</span>
                  </div>
                  <div className="metric-card emerald">
                    <span className="metric-title">Avg Job Turnaround</span>
                    <span className="metric-value">{scheduleResult.averageTurnaroundTime.toFixed(2)}s</span>
                    <span className="metric-sub">Total time in system (Wait + Exec)</span>
                  </div>
                  <div className="metric-card rose">
                    <span className="metric-title">SLA Violations</span>
                    <span className="metric-value">{scheduleResult.tasksSlaViolated} Jobs</span>
                    <span className="metric-sub">Delayed past SLA threshold ({slaThreshold}s)</span>
                  </div>
                </div>
              ) : (
                <div className="alert-box" style={{ background: 'rgba(168, 85, 247, 0.05)', padding: '2rem', textAlign: 'center', border: '1px solid var(--bg-card-border)', borderRadius: '12px' }}>
                  <h3>No Event Scheduling Simulations Run Yet</h3>
                  <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>Set cluster size and SLA limits in the sidebar, and hit "Run Simulation" to execute the Min-Heap priority scheduler.</p>
                </div>
              )}

              {/* Gantt Timeline */}
              {scheduleResult && (
                <div className="visual-card">
                  <div style={{ display: 'flex', justifySelf: 'stretch', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: '1.1rem' }}>VM Instance Scheduling Timeline</h3>
                    <div style={{ display: 'flex', gap: '8px', fontSize: '0.75rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div className="gantt-block p0" style={{ width: '12px', height: '12px', position: 'static' }}></div> P0 (Critical)</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div className="gantt-block p1" style={{ width: '12px', height: '12px', position: 'static' }}></div> P1 (High)</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div className="gantt-block p2" style={{ width: '12px', height: '12px', position: 'static' }}></div> P2 (Medium)</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><div className="gantt-block p3" style={{ width: '12px', height: '12px', position: 'static' }}></div> P3 (Batch)</span>
                    </div>
                  </div>

                  <div className="scheduler-timeline-container">
                    <div className="gantt-chart">
                      {Array.from({ length: vmCount }).map((_, vmIdx) => {
                        // Find all tasks assigned to this VM
                        const vmTasks = scheduleResult.taskHistory.filter(t => t.assignedVmId === vmIdx);
                        const timelineMax = Math.max(...scheduleResult.taskHistory.map(t => t.endTime), 10.0);

                        return (
                          <div className="gantt-row" key={vmIdx}>
                            <div className="gantt-label">VM Instance {vmIdx}</div>
                            <div className="gantt-track">
                              {vmTasks.map(task => {
                                const leftPct = (task.startTime / timelineMax) * 100;
                                const widthPct = (task.burstTime / timelineMax) * 100;
                                return (
                                  <div 
                                    className={`gantt-block p${task.priority}`} 
                                    key={task.id} 
                                    style={{ 
                                      left: `${leftPct}%`, 
                                      width: `${widthPct}%` 
                                    }}
                                    title={`Job-${task.id}\nPriority: P${task.priority}\nArrival: ${task.arrivalTime}s\nStart: ${task.startTime}s\nEnd: ${task.endTime}s\nWait: ${(task.startTime - task.arrivalTime).toFixed(1)}s`}
                                  >
                                    J-{task.id}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                      {/* X axis times */}
                      <div className="time-axis">
                        <span>0.0s</span>
                        <span>{(Math.max(...scheduleResult.taskHistory.map(t => t.endTime)) / 4 * 1).toFixed(1)}s</span>
                        <span>{(Math.max(...scheduleResult.taskHistory.map(t => t.endTime)) / 4 * 2).toFixed(1)}s</span>
                        <span>{(Math.max(...scheduleResult.taskHistory.map(t => t.endTime)) / 4 * 3).toFixed(1)}s</span>
                        <span>{Math.max(...scheduleResult.taskHistory.map(t => t.endTime)).toFixed(1)}s (Total Time)</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* TAB 3: Profile Budgeting Dashboard */}
          {activeTab === 'budget' && (
            <>
              {budgetResult ? (
                <div className="metrics-row">
                  <div className="metric-card">
                    <span className="metric-title">Optimal Budget Expense</span>
                    <span className="metric-value">${budgetResult.totalCost} / mo</span>
                    <span className="metric-sub">Budget limit: ${budgetLimit}</span>
                  </div>
                  <div className="metric-card purple">
                    <span className="metric-title">Target Performance Value</span>
                    <span className="metric-value">{budgetResult.totalPerformance} pts</span>
                    <span className="metric-sub">Maximum utility achieved</span>
                  </div>
                  <div className="metric-card emerald">
                    <span className="metric-title">Selected Profiles Count</span>
                    <span className="metric-value">{budgetResult.selectedItems.length} Services</span>
                    <span className="metric-sub">Out of {enabledBudgetIds.length} enabled</span>
                  </div>
                  <div className="metric-card amber">
                    <span className="metric-title">Budget Yield Efficiency</span>
                    <span className="metric-value">{((budgetResult.totalCost / budgetLimit) * 100).toFixed(1)}%</span>
                    <span className="metric-sub">Optimal resource selection</span>
                  </div>
                </div>
              ) : (
                <div className="alert-box" style={{ background: 'rgba(16, 185, 129, 0.05)', padding: '2rem', textAlign: 'center', border: '1px solid var(--bg-card-border)', borderRadius: '12px' }}>
                  <h3>Initializing Dynamic Programming Budget Optimizer...</h3>
                </div>
              )}

              {/* Budget allocation lists */}
              <div className="visual-card">
                <div className="budget-comparison-container">
                  
                  {/* Left: Interactive list of items */}
                  <div>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '10px' }}>Available Cloud Services</h3>
                    <div className="items-list-container">
                      {budgetItems.map(item => {
                        const isSelected = enabledBudgetIds.includes(item.id);
                        return (
                          <div 
                            key={item.id}
                            className={`budget-item-card ${isSelected ? 'selected' : ''}`}
                            onClick={() => toggleBudgetItem(item.id)}
                          >
                            <div className="item-info">
                              <div className="item-check"></div>
                              <div>
                                <div className="item-name">{item.name}</div>
                                <div className="item-desc">{item.desc}</div>
                              </div>
                            </div>
                            <div className="item-metrics">
                              <span className="item-cost">${item.cost}/mo</span>
                              <span className="item-perf">+{item.performance} Performance</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right: DP allocations result */}
                  <div>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '10px' }}>Optimal Infrastructure Allocation Map</h3>
                    {budgetResult && (
                      <div className="results-allocation-block">
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '6px' }}>
                            <span>Budget Consumption</span>
                            <strong>${budgetResult.totalCost} / ${budgetLimit}</strong>
                          </div>
                          <div className="progress-bar-budget">
                            <div 
                              className="progress-fill-budget" 
                              style={{ width: `${(budgetResult.totalCost / budgetLimit) * 100}%` }}
                            ></div>
                            <div className="progress-label-budget">
                              {((budgetResult.totalCost / budgetLimit) * 100).toFixed(0)}% Used
                            </div>
                          </div>
                        </div>

                        <div>
                          <h4 style={{ fontSize: '0.9rem', marginBottom: '8px', color: 'var(--text-secondary)' }}>Selected Cloud Services Profile:</h4>
                          {budgetResult.selectedItems.length === 0 ? (
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                              Budget too low or no services selected.
                            </div>
                          ) : (
                            <div className="selected-badge-grid">
                              {budgetResult.selectedItems.map(item => (
                                <div className="selected-item-tag" key={item.id}>
                                  ⭐ {item.name} <span>(+{item.performance} pts)</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div style={{ borderTop: '1px solid var(--bg-card-border)', paddingTop: '10px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          <strong>DSA Mechanics:</strong> The 0/1 Knapsack algorithm constructs a 2D Dynamic Programming table to evaluate exact item cost-vs-benefit allocations. It selects profiles that yield the absolute highest total performance scores without ever exceeding the budget limit boundary.
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            </>
          )}

          {/* TAB 4: Regional Router Dashboard */}
          {activeTab === 'route' && (
            <>
              {routeResult ? (
                <div className="metrics-row">
                  <div className="metric-card">
                    <span className="metric-title">Optimal Latency</span>
                    <span className="metric-value">{routeResult.totalLatency.toFixed(0)} ms</span>
                    <span className="metric-sub">Sum of link latencies</span>
                  </div>
                  <div className="metric-card purple">
                    <span className="metric-title">Data Transit Cost</span>
                    <span className="metric-value">${routeResult.totalCostPerGB.toFixed(4)} / GB</span>
                    <span className="metric-sub">Sum of transit fees</span>
                  </div>
                  <div className="metric-card emerald">
                    <span className="metric-title">Computed Shortest Path</span>
                    <span className="metric-value" style={{ fontSize: '1.1rem', fontFamily: 'var(--font-sans)', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {routeResult.pathFound ? routeResult.path.join(' ➔ ') : 'No Path'}
                    </span>
                    <span className="metric-sub">Dijkstra node traversal order</span>
                  </div>
                  <div className="metric-card amber">
                    <span className="metric-title">Optimization Metric</span>
                    <span className="metric-value" style={{ textTransform: 'capitalize' }}>{routeMode}</span>
                    <span className="metric-sub">Minimizing for {routeMode} first</span>
                  </div>
                </div>
              ) : (
                <div className="alert-box" style={{ background: 'rgba(6, 182, 212, 0.05)', padding: '2rem', textAlign: 'center', border: '1px solid var(--bg-card-border)', borderRadius: '12px' }}>
                  <h3>Initializing Graph Multi-Region Shortest Path Solver...</h3>
                </div>
              )}

              {/* Network Graph Interactive Panel */}
              <div className="visual-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '1.1rem' }}>Global Cloud Network Node Map</h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Select source and target endpoints in the sidebar. Active route highlights in {routeMode === 'cost' ? 'green (cost)' : 'blue (latency)'}.
                  </span>
                </div>

                <div className="routing-svg-container">
                  <svg className="routing-svg" viewBox="0 0 700 380">
                    <defs>
                      <marker id="arrow" viewBox="0 0 10 10" refX="20" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                        <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(255,255,255,0.3)" />
                      </marker>
                    </defs>
                    
                    {/* Render Links / Edges */}
                    {REGION_EDGES.map((edge, idx) => {
                      const sourceNode = REGION_NODES[edge.source];
                      const targetNode = REGION_NODES[edge.target];
                      if (!sourceNode || !targetNode) return null;

                      // Check if this link is part of the active shortest path
                      let isActive = false;
                      if (routeResult && routeResult.pathFound) {
                        const path = routeResult.path;
                        for (let i = 0; i < path.length - 1; i++) {
                          if (
                            (path[i] === edge.source && path[i + 1] === edge.target) ||
                            (path[i] === edge.target && path[i + 1] === edge.source)
                          ) {
                            isActive = true;
                            break;
                          }
                        }
                      }

                      // Label midpoint
                      const midX = (sourceNode.x + targetNode.x) / 2;
                      const midY = (sourceNode.y + targetNode.y) / 2;

                      return (
                        <g key={idx}>
                          <line
                            x1={sourceNode.x * 1.1}
                            y1={sourceNode.y * 1.1}
                            x2={targetNode.x * 1.1}
                            y2={targetNode.y * 1.1}
                            className={`link-line ${isActive ? 'active-path' : ''} ${isActive && routeMode === 'latency' ? 'latency' : ''}`}
                          />
                          <text
                            x={midX * 1.1}
                            y={midY * 1.1 - 6}
                            className={`link-label ${isActive ? 'active-path' : ''}`}
                          >
                            {routeMode === 'cost' ? `$${edge.costPerGB.toFixed(3)}` : `${edge.latencyMs}ms`}
                          </text>
                        </g>
                      );
                    })}

                    {/* Render Nodes */}
                    {Object.entries(REGION_NODES).map(([key, node]) => {
                      const isSource = key === startRegion;
                      const isTarget = key === targetRegion;
                      const isEndpoint = isSource || isTarget;

                      // Check if node is part of the path
                      const isPathNode = routeResult && routeResult.pathFound && routeResult.path.includes(key);

                      return (
                        <g key={key}>
                          <circle
                            cx={node.x * 1.1}
                            cy={node.y * 1.1}
                            r={isEndpoint ? 14 : 9}
                            className={`node-circle ${isEndpoint ? 'selected-endpoint' : ''} ${isPathNode && !isEndpoint ? 'active' : ''}`}
                            onClick={() => {
                              // Custom quick selection behavior: click sets source/target
                              if (startRegion === key) return;
                              setTargetRegion(key);
                            }}
                            title={node.name}
                          />
                          <text
                            x={node.x * 1.1}
                            y={node.y * 1.1 + 25}
                            className="node-text"
                          >
                            {key}
                          </text>
                          {isSource && (
                            <text x={node.x * 1.1} y={node.y * 1.1 - 20} fill="var(--accent-purple)" fontSize="10" fontWeight="bold" textAnchor="middle">
                              SRC
                            </text>
                          )}
                          {isTarget && (
                            <text x={node.x * 1.1} y={node.y * 1.1 - 20} fill="var(--accent-cyan)" fontSize="10" fontWeight="bold" textAnchor="middle">
                              DST
                            </text>
                          )}
                        </g>
                      );
                    })}
                  </svg>

                  <div className="routing-legend">
                    <div className="legend-item">
                      <div className="legend-dot" style={{ background: 'var(--accent-purple)' }}></div>
                      <span>Selected Source Region</span>
                    </div>
                    <div className="legend-item">
                      <div className="legend-dot" style={{ background: 'var(--accent-cyan)' }}></div>
                      <span>Selected Target Destination</span>
                    </div>
                    <div className="legend-item">
                      <div className="legend-dot" style={{ background: routeMode === 'cost' ? 'var(--accent-emerald)' : 'var(--accent-cyan)' }}></div>
                      <span>Optimal Path Links</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Footer Execution Stats bar */}
          <footer className="execution-log">
            <div>
              Status: <span style={{ color: 'var(--accent-emerald)', fontWeight: 'bold' }}>Ready</span>
            </div>
            <div>
              Solver Performance: <span className="engine-pill">{executionLog.timeMs} ms</span>
            </div>
            <div>
              Core Processor Engine: <span className={`engine-pill ${executionLog.engineUsed.startsWith('js') ? 'js' : ''}`}>{executionLog.engineUsed}</span>
            </div>
          </footer>

        </section>

      </main>
    </div>
  );
}

export default App;
