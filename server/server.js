// ═══════════════════════════════════════════════════════════════
// SAHAY — AI-Powered Disaster Response Server
// Real-time coordination intelligence platform
// ═══════════════════════════════════════════════════════════════

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { findBestResource, batchAllocate, checkReallocation, computeAllocationScore, generateDecisionReason } = require('./logic/scoring');
const { generateScenario, generateResourcePool, DISASTER_SCENARIOS } = require('./logic/simulation');
const { processIncidentDescription } = require('./logic/gemini');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/sahay';

// ═══════════════════════════════════════════════════════════════
// IN-MEMORY STATE (works without MongoDB for demo)
// ═══════════════════════════════════════════════════════════════
let state = {
    sos: [],
    resources: [],
    assignments: [],       // { sosId, resourceId, score, reason, assignedAt }
    activityLog: [],       // { id, type, message, timestamp, data }
    metrics: {
        totalRequests: 0,
        totalAssigned: 0,
        totalResolved: 0,
        totalReallocations: 0,
        avgResponseTime: 0,
        responseTimes: [],
        scenariosRun: 0,
        efficiencyScore: 0,
        startTime: Date.now(),
    },
    activeScenario: null,
    simulationRunning: false,
};

// Initialize default resources
const initResources = () => {
    state.resources = generateResourcePool();
    addLog('system', 'System initialized with ' + state.resources.length + ' resources', { count: state.resources.length });
};

// ═══════════════════════════════════════════════════════════════
// ACTIVITY LOG
// ═══════════════════════════════════════════════════════════════
const addLog = (type, message, data = {}) => {
    const log = {
        id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        type, // 'sos_received', 'auto_assigned', 'reallocation', 'scenario_start', 'system', 'resolved'
        message,
        timestamp: new Date().toISOString(),
        data,
    };
    state.activityLog.unshift(log);
    if (state.activityLog.length > 200) state.activityLog = state.activityLog.slice(0, 200);
    return log;
};

// ═══════════════════════════════════════════════════════════════
// AUTO-ASSIGNMENT ENGINE
// Automatically assigns the best resource when an SOS arrives
// ═══════════════════════════════════════════════════════════════
const autoAssign = (sos) => {
    const available = state.resources.filter(r => r.status === 'Available');
    if (available.length === 0) {
        addLog('warning', `No resources available for ${sos.caseId}`, { sosId: sos._id });
        return null;
    }

    const result = findBestResource(sos, state.resources);
    if (result.error) {
        addLog('warning', `Cannot assign ${sos.caseId}: ${result.message}`, { sosId: sos._id });
        return null;
    }

    const best = result.bestMatch;
    const resource = best.resource;

    // Perform assignment
    const sosIdx = state.sos.findIndex(s => s._id === sos._id);
    const resIdx = state.resources.findIndex(r => r._id === resource._id);

    if (sosIdx === -1 || resIdx === -1) return null;

    state.sos[sosIdx].status = 'Assigned';
    state.sos[sosIdx].assignedResource = resource;
    state.sos[sosIdx].assignedAt = new Date().toISOString();
    
    state.resources[resIdx].status = 'Busy';
    state.resources[resIdx].assignedTo = sos._id;
    state.resources[resIdx].deployedAt = new Date().toISOString();

    const responseTime = best.score.estimatedResponseMinutes || Math.round(Math.random() * 10 + 2);
    state.metrics.responseTimes.push(responseTime);
    state.metrics.avgResponseTime = Math.round(
        state.metrics.responseTimes.reduce((a, b) => a + b, 0) / state.metrics.responseTimes.length
    );

    const assignment = {
        sosId: sos._id,
        resourceId: resource._id,
        score: best.score,
        reason: result.decisionReason,
        assignedAt: new Date().toISOString(),
        responseTimeMin: responseTime,
    };
    state.assignments.push(assignment);
    state.metrics.totalAssigned++;

    // Update efficiency
    if (state.metrics.totalRequests > 0) {
        state.metrics.efficiencyScore = Math.round((state.metrics.totalAssigned / state.metrics.totalRequests) * 100);
    }

    addLog('auto_assigned', 
        `AI assigned ${resource.name} (${resource.type}) → ${sos.caseId} [${sos.urgency}] | Score: ${best.score.finalScore} | ETA: ${responseTime} min`,
        { sosId: sos._id, resourceId: resource._id, score: best.score, reason: result.decisionReason }
    );

    return assignment;
};

// ═══════════════════════════════════════════════════════════════
// DYNAMIC REALLOCATION
// When critical SOS arrives, check if resources should be reassigned
// ═══════════════════════════════════════════════════════════════
const tryReallocation = (newSOS) => {
    if (newSOS.urgency !== 'Critical') return null;

    // Find currently assigned medium-priority cases
    const mediumAssignments = state.assignments
        .filter(a => {
            const sos = state.sos.find(s => s._id === a.sosId);
            return sos && sos.status === 'Assigned' && sos.urgency === 'Medium';
        })
        .map(a => ({
            ...a,
            sos: state.sos.find(s => s._id === a.sosId),
            resource: state.resources.find(r => r._id === a.resourceId),
        }))
        .filter(a => a.resource);

    if (mediumAssignments.length === 0) return null;

    // Find the best reallocation candidate
    let bestRealloc = null;
    let bestImprovement = 0;

    for (const assignment of mediumAssignments) {
        const newScore = computeAllocationScore(newSOS, assignment.resource);
        const improvement = newScore.rawScore - (assignment.score?.rawScore || 50);
        
        if (improvement > bestImprovement && improvement > 15) {
            bestImprovement = improvement;
            bestRealloc = {
                fromSOS: assignment.sos,
                resource: assignment.resource,
                newScore,
                oldScore: assignment.score,
                improvement: Math.round(improvement),
            };
        }
    }

    if (!bestRealloc) return null;

    // Execute reallocation
    const { fromSOS, resource } = bestRealloc;
    
    // Unassign from old SOS
    const oldSosIdx = state.sos.findIndex(s => s._id === fromSOS._id);
    if (oldSosIdx !== -1) {
        state.sos[oldSosIdx].status = 'Pending';
        state.sos[oldSosIdx].assignedResource = null;
        state.sos[oldSosIdx].assignedAt = null;
    }

    // Remove old assignment
    state.assignments = state.assignments.filter(a => a.sosId !== fromSOS._id);

    // Assign to new critical SOS
    const resIdx = state.resources.findIndex(r => r._id === resource._id);
    const newSosIdx = state.sos.findIndex(s => s._id === newSOS._id);
    
    if (resIdx !== -1) {
        state.resources[resIdx].assignedTo = newSOS._id;
        state.resources[resIdx].deployedAt = new Date().toISOString();
    }
    if (newSosIdx !== -1) {
        state.sos[newSosIdx].status = 'Assigned';
        state.sos[newSosIdx].assignedResource = resource;
        state.sos[newSosIdx].assignedAt = new Date().toISOString();
    }

    const responseTime = bestRealloc.newScore.estimatedResponseMinutes || 3;
    const assignment = {
        sosId: newSOS._id,
        resourceId: resource._id,
        score: bestRealloc.newScore,
        reason: `REALLOCATION: ${resource.name} reassigned from ${fromSOS.caseId} (Medium) to ${newSOS.caseId} (Critical)`,
        assignedAt: new Date().toISOString(),
        responseTimeMin: responseTime,
        isReallocation: true,
    };
    state.assignments.push(assignment);
    state.metrics.totalReallocations++;

    addLog('reallocation',
        `⚡ REALLOCATION: ${resource.name} pulled from ${fromSOS.caseId} (Medium) → ${newSOS.caseId} (CRITICAL) | Reason: Critical priority override with ${bestRealloc.improvement}% improvement`,
        { fromSOS: fromSOS._id, toSOS: newSOS._id, resourceId: resource._id, improvement: bestRealloc.improvement, reason: `Emergency priority shift from ${fromSOS.caseId} to ${newSOS.caseId}` }
    );

    return bestRealloc;
};

// ═══════════════════════════════════════════════════════════════
// API ROUTES
// ═══════════════════════════════════════════════════════════════

// --- State ---
app.get('/api/state', (req, res) => {
    res.json({
        sos: state.sos,
        resources: state.resources,
        assignments: state.assignments,
        metrics: state.metrics,
        activeScenario: state.activeScenario,
        simulationRunning: state.simulationRunning,
    });
});

// --- SOS ---
app.get('/api/sos', (req, res) => res.json(state.sos));

app.post('/api/sos', async (req, res) => {
    // 1. AI Pre-processing (Intelligence Layer)
    const aiIntelligence = await processIncidentDescription(req.body.description || req.body.type || "Unknown incident", req.body.type);
    
    const newSOS = {
        ...req.body,
        _id: `sos-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        status: 'Pending',
        createdAt: new Date().toISOString(),
        assignedResource: null,
        assignedAt: null,
        // AI Layer Additions
        aiIntelligence, 
        urgency: aiIntelligence?.urgency || req.body.urgency || 'Medium',
        summary: aiIntelligence?.summary || req.body.summary || 'Analyzing incident...',
    };
    
    state.sos.unshift(newSOS);
    state.metrics.totalRequests++;

    addLog('sos_received', `New SOS: ${newSOS.caseId} [${newSOS.urgency}] — AI reasoning: ${aiIntelligence?.reasoning || 'Default allocation'}`, { sos: newSOS });

    // Try reallocation for critical cases first
    const realloc = tryReallocation(newSOS);
    
    // If not reallocated, auto-assign
    if (!realloc) {
        const updatedSOS = state.sos.find(s => s._id === newSOS._id);
        if (updatedSOS && updatedSOS.status === 'Pending') {
            autoAssign(updatedSOS);
        }
    }

    res.status(201).json(state.sos.find(s => s._id === newSOS._id));
});

// --- Resources ---
app.get('/api/resources', (req, res) => res.json(state.resources));

app.post('/api/resources/release/:id', (req, res) => {
    const idx = state.resources.findIndex(r => r._id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Resource not found' });

    const resource = state.resources[idx];
    const oldAssignment = resource.assignedTo;

    state.resources[idx].status = 'Available';
    state.resources[idx].assignedTo = null;
    state.resources[idx].deployedAt = null;

    // Mark the SOS as resolved
    if (oldAssignment) {
        const sosIdx = state.sos.findIndex(s => s._id === oldAssignment);
        if (sosIdx !== -1) {
            state.sos[sosIdx].status = 'Resolved';
            state.sos[sosIdx].resolvedAt = new Date().toISOString();
            state.metrics.totalResolved++;
        }
    }

    addLog('resolved', `${resource.name} released and available. Case resolved.`, { resourceId: resource._id });

    // Auto-assign to any pending SOS
    const pendingSOS = state.sos
        .filter(s => s.status === 'Pending')
        .sort((a, b) => {
            const urg = { Critical: 0, High: 1, Medium: 2 };
            return (urg[a.urgency] || 2) - (urg[b.urgency] || 2);
        });

    if (pendingSOS.length > 0) {
        autoAssign(pendingSOS[0]);
    }

    res.json({ success: true, resource: state.resources[idx] });
});

app.post('/api/resources/toggle-offline/:id', (req, res) => {
    const idx = state.resources.findIndex(r => r._id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Resource not found' });

    const resource = state.resources[idx];
    if (resource.status === 'Offline') {
        state.resources[idx].status = 'Available';
        addLog('system', `${resource.name} back online`, { resourceId: resource._id });
    } else if (resource.status === 'Available') {
        state.resources[idx].status = 'Offline';
        addLog('system', `${resource.name} went offline`, { resourceId: resource._id });
    }

    res.json({ success: true, resource: state.resources[idx] });
});

// --- Assignments ---
app.get('/api/assignments', (req, res) => res.json(state.assignments));

// --- Activity Log ---
app.get('/api/logs', (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    res.json(state.activityLog.slice(0, limit));
});

// --- Metrics ---
app.get('/api/metrics', (req, res) => {
    const uptime = Math.round((Date.now() - state.metrics.startTime) / 1000);
    res.json({
        ...state.metrics,
        uptimeSeconds: uptime,
        pendingCount: state.sos.filter(s => s.status === 'Pending').length,
        assignedCount: state.sos.filter(s => s.status === 'Assigned').length,
        resolvedCount: state.sos.filter(s => s.status === 'Resolved').length,
        availableResources: state.resources.filter(r => r.status === 'Available').length,
        busyResources: state.resources.filter(r => r.status === 'Busy').length,
        offlineResources: state.resources.filter(r => r.status === 'Offline').length,
        totalResources: state.resources.length,
    });
});

// --- AI Decision Preview ---
app.post('/api/ai/preview', (req, res) => {
    const { sosId } = req.body;
    const sos = state.sos.find(s => s._id === sosId);
    if (!sos) return res.status(404).json({ error: 'SOS not found' });

    const result = findBestResource(sos, state.resources);
    res.json(result);
});

// --- Batch Auto-Assign All Pending ---
app.post('/api/ai/batch-assign', (req, res) => {
    const result = batchAllocate(state.sos, state.resources);

    for (const assignment of result.assignments) {
        const sosIdx = state.sos.findIndex(s => s._id === assignment.sos._id);
        const resIdx = state.resources.findIndex(r => r._id === assignment.resource._id);

        if (sosIdx !== -1) {
            state.sos[sosIdx].status = 'Assigned';
            state.sos[sosIdx].assignedResource = assignment.resource;
            state.sos[sosIdx].assignedAt = new Date().toISOString();
        }
        if (resIdx !== -1) {
            state.resources[resIdx].status = 'Busy';
            state.resources[resIdx].assignedTo = assignment.sos._id;
            state.resources[resIdx].deployedAt = new Date().toISOString();
        }

        const responseTime = assignment.score.estimatedResponseMinutes || 5;
        state.metrics.responseTimes.push(responseTime);
        state.assignments.push({
            sosId: assignment.sos._id,
            resourceId: assignment.resource._id,
            score: assignment.score,
            reason: assignment.reason,
            assignedAt: new Date().toISOString(),
            responseTimeMin: responseTime,
        });
        state.metrics.totalAssigned++;

        addLog('auto_assigned',
            `Batch: ${assignment.resource.name} → ${assignment.sos.caseId} [${assignment.sos.urgency}]`,
            { sosId: assignment.sos._id, resourceId: assignment.resource._id }
        );
    }

    if (state.metrics.responseTimes.length > 0) {
        state.metrics.avgResponseTime = Math.round(
            state.metrics.responseTimes.reduce((a, b) => a + b, 0) / state.metrics.responseTimes.length
        );
    }
    if (state.metrics.totalRequests > 0) {
        state.metrics.efficiencyScore = Math.round((state.metrics.totalAssigned / state.metrics.totalRequests) * 100);
    }

    res.json(result);
});

// ═══════════════════════════════════════════════════════════════
// SIMULATION ENGINE
// ═══════════════════════════════════════════════════════════════
app.get('/api/scenarios', (req, res) => {
    const scenarios = Object.entries(DISASTER_SCENARIOS).map(([key, val]) => ({
        key,
        name: val.name,
        icon: val.icon,
        description: val.description,
        totalWaves: val.waveCount,
        totalSOS: val.sosPerWave.reduce((a, b) => a + b, 0),
    }));
    res.json(scenarios);
});

app.post('/api/simulate', async (req, res) => {
    const { scenario: scenarioKey } = req.body;
    if (state.simulationRunning) {
        return res.status(400).json({ error: 'Simulation already running' });
    }

    const scenarioData = generateScenario(scenarioKey);
    if (!scenarioData) {
        return res.status(400).json({ error: 'Invalid scenario' });
    }

    state.simulationRunning = true;
    state.activeScenario = scenarioData.scenario;
    state.metrics.scenariosRun++;

    addLog('scenario_start',
        `🚨 SCENARIO: ${scenarioData.scenario.name} — ${scenarioData.scenario.description}`,
        { scenario: scenarioData.scenario, totalSOS: scenarioData.totalSOS }
    );

    // Impact some resources (simulate damage)
    const offlineCount = Math.floor(state.resources.length * scenarioData.resourceImpact.percentOffline);
    const availableRes = state.resources.filter(r => r.status === 'Available');
    for (let i = 0; i < Math.min(offlineCount, availableRes.length); i++) {
        const idx = state.resources.findIndex(r => r._id === availableRes[i]._id);
        if (idx !== -1) {
            state.resources[idx].status = 'Offline';
            addLog('system', `${state.resources[idx].name} went offline due to ${scenarioData.scenario.name}`, {});
        }
    }

    res.json({ message: 'Simulation started', scenario: scenarioData.scenario, totalWaves: scenarioData.waves.length });

    // Process waves asynchronously
    for (let w = 0; w < scenarioData.waves.length; w++) {
        if (w > 0) {
            await new Promise(resolve => setTimeout(resolve, scenarioData.waveDelayMs));
        }

        addLog('system', `Wave ${w + 1}/${scenarioData.waves.length} incoming — ${scenarioData.waves[w].length} SOS requests`, {});

        for (const sosData of scenarioData.waves[w]) {
            // Process wave items with AI intelligence
            const aiIntelligence = await processIncidentDescription(sosData.type + " emergency at " + sosData.location.address, sosData.type);
            
            const processedSOS = {
                ...sosData,
                _id: `sos-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                aiIntelligence,
                urgency: aiIntelligence?.urgency || sosData.urgency,
                summary: aiIntelligence?.summary || sosData.summary
            };

            state.sos.unshift(processedSOS);
            state.metrics.totalRequests++;

            addLog('sos_received', `SOS: ${processedSOS.caseId} [${processedSOS.urgency}] — ${processedSOS.location.address}`, { sos: processedSOS });

            // Small delay between individual SOS for realism
            await new Promise(resolve => setTimeout(resolve, 600));

            // Auto-assign with reallocation check
            const realloc = tryReallocation(processedSOS);
            if (!realloc) {
                const updated = state.sos.find(s => s._id === processedSOS._id);
                if (updated && updated.status === 'Pending') {
                    autoAssign(updated);
                }
            }
        }
    }

    // Simulation complete
    state.simulationRunning = false;
    addLog('system', `✅ Scenario complete: ${scenarioData.scenario.name} — ${state.metrics.totalAssigned}/${state.metrics.totalRequests} assigned`, {});
});

// --- Reset ---
app.post('/api/reset', (req, res) => {
    state.sos = [];
    state.assignments = [];
    state.activityLog = [];
    state.activeScenario = null;
    state.simulationRunning = false;
    state.metrics = {
        totalRequests: 0,
        totalAssigned: 0,
        totalResolved: 0,
        totalReallocations: 0,
        avgResponseTime: 0,
        responseTimes: [],
        scenariosRun: 0,
        efficiencyScore: 0,
        startTime: Date.now(),
    };
    initResources();
    res.json({ success: true, message: 'System reset complete' });
});

// ═══════════════════════════════════════════════════════════════
// START
// ═══════════════════════════════════════════════════════════════
initResources();

app.listen(PORT, () => {
    console.log(`\n═══════════════════════════════════════════`);
    console.log(`  SAHAY Server running on port ${PORT}`);
    console.log(`  Mode: In-Memory (no MongoDB required)`);
    console.log(`  Resources: ${state.resources.length} initialized`);
    console.log(`═══════════════════════════════════════════\n`);
});
