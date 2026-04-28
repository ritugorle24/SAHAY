// ═══════════════════════════════════════════════════════════════
// SAHAYAK — Disaster Simulation Engine
// Generates realistic disaster scenarios with cascading events
// ═══════════════════════════════════════════════════════════════

const DISASTER_SCENARIOS = {
    earthquake: {
        name: 'Earthquake',
        icon: '🔴',
        description: 'Seismic event detected — multiple structures compromised',
        epicenter: { lat: 28.6139, lng: 77.2090 },
        radiusKm: 5,
        sosPatterns: [
            { type: 'Rescue', urgency: 'Critical', weight: 0.35, addressPrefix: 'Collapsed Structure' },
            { type: 'Medical', urgency: 'Critical', weight: 0.25, addressPrefix: 'Trauma Center' },
            { type: 'Medical', urgency: 'High', weight: 0.15, addressPrefix: 'Injury Report' },
            { type: 'Shelter', urgency: 'High', weight: 0.10, addressPrefix: 'Displaced Family' },
            { type: 'Food', urgency: 'Medium', weight: 0.10, addressPrefix: 'Supply Request' },
            { type: 'Logistics', urgency: 'Medium', weight: 0.05, addressPrefix: 'Road Clearance' },
        ],
        resourceImpact: { percentOffline: 0.2 }, // 20% resources go offline
        waveCount: 3,
        waveDelayMs: 4000,
        sosPerWave: [5, 3, 2],
    },
    flood: {
        name: 'Flash Flood',
        icon: '🔵',
        description: 'Severe flooding — water levels rising rapidly in low-lying areas',
        epicenter: { lat: 28.6200, lng: 77.2150 },
        radiusKm: 4,
        sosPatterns: [
            { type: 'Rescue', urgency: 'Critical', weight: 0.30, addressPrefix: 'Water Rescue' },
            { type: 'Shelter', urgency: 'Critical', weight: 0.20, addressPrefix: 'Evacuation Zone' },
            { type: 'Medical', urgency: 'High', weight: 0.15, addressPrefix: 'Medical Emergency' },
            { type: 'Food', urgency: 'High', weight: 0.15, addressPrefix: 'Food Distribution' },
            { type: 'Logistics', urgency: 'Medium', weight: 0.10, addressPrefix: 'Route Blockage' },
            { type: 'Shelter', urgency: 'Medium', weight: 0.10, addressPrefix: 'Temporary Shelter' },
        ],
        resourceImpact: { percentOffline: 0.15 },
        waveCount: 3,
        waveDelayMs: 5000,
        sosPerWave: [4, 4, 2],
    },
    industrial_fire: {
        name: 'Industrial Fire',
        icon: '🟠',
        description: 'Major fire at industrial complex — hazmat risk detected',
        epicenter: { lat: 28.6080, lng: 77.2020 },
        radiusKm: 2,
        sosPatterns: [
            { type: 'Rescue', urgency: 'Critical', weight: 0.30, addressPrefix: 'Fire Rescue' },
            { type: 'Medical', urgency: 'Critical', weight: 0.30, addressPrefix: 'Burn Ward' },
            { type: 'Medical', urgency: 'High', weight: 0.15, addressPrefix: 'Smoke Inhalation' },
            { type: 'Shelter', urgency: 'High', weight: 0.10, addressPrefix: 'Evacuated Workers' },
            { type: 'Logistics', urgency: 'Medium', weight: 0.15, addressPrefix: 'Perimeter Setup' },
        ],
        resourceImpact: { percentOffline: 0.10 },
        waveCount: 2,
        waveDelayMs: 3000,
        sosPerWave: [5, 3],
    },
    building_collapse: {
        name: 'Building Collapse',
        icon: '⚫',
        description: 'Multi-story building collapse — search and rescue initiated',
        epicenter: { lat: 28.6160, lng: 77.2060 },
        radiusKm: 1.5,
        sosPatterns: [
            { type: 'Rescue', urgency: 'Critical', weight: 0.40, addressPrefix: 'Trapped Persons' },
            { type: 'Medical', urgency: 'Critical', weight: 0.25, addressPrefix: 'Crush Injuries' },
            { type: 'Medical', urgency: 'High', weight: 0.15, addressPrefix: 'Walking Wounded' },
            { type: 'Logistics', urgency: 'High', weight: 0.10, addressPrefix: 'Heavy Machinery' },
            { type: 'Shelter', urgency: 'Medium', weight: 0.10, addressPrefix: 'Displaced Residents' },
        ],
        resourceImpact: { percentOffline: 0.05 },
        waveCount: 2,
        waveDelayMs: 3500,
        sosPerWave: [4, 3],
    },
};

const DELHI_LOCATIONS = [
    { area: 'Connaught Place', lat: 28.6315, lng: 77.2167 },
    { area: 'India Gate', lat: 28.6129, lng: 77.2295 },
    { area: 'Karol Bagh', lat: 28.6514, lng: 77.1907 },
    { area: 'Chandni Chowk', lat: 28.6506, lng: 77.2300 },
    { area: 'Lajpat Nagar', lat: 28.5677, lng: 77.2433 },
    { area: 'Dwarka Sector 12', lat: 28.5921, lng: 77.0400 },
    { area: 'Vasant Kunj', lat: 28.5203, lng: 77.1568 },
    { area: 'Rohini Sector 3', lat: 28.7141, lng: 77.1025 },
    { area: 'Saket', lat: 28.5244, lng: 77.2066 },
    { area: 'Janakpuri', lat: 28.6219, lng: 77.0878 },
    { area: 'Rajouri Garden', lat: 28.6468, lng: 77.1214 },
    { area: 'Preet Vihar', lat: 28.6388, lng: 77.2960 },
    { area: 'Mayur Vihar Phase 1', lat: 28.5946, lng: 77.2971 },
    { area: 'Hauz Khas', lat: 28.5494, lng: 77.2001 },
    { area: 'Nehru Place', lat: 28.5491, lng: 77.2533 },
];

/**
 * Generate a random location near an epicenter within a given radius.
 */
const randomLocationNear = (epicenter, radiusKm) => {
    const kmToDeg = 1 / 111; // rough conversion
    const angle = Math.random() * 2 * Math.PI;
    const dist = Math.random() * radiusKm * kmToDeg;
    return {
        lat: epicenter.lat + dist * Math.cos(angle),
        lng: epicenter.lng + dist * Math.sin(angle),
    };
};

/**
 * Pick a weighted random SOS pattern.
 */
const pickWeightedPattern = (patterns) => {
    const total = patterns.reduce((sum, p) => sum + p.weight, 0);
    let rand = Math.random() * total;
    for (const pattern of patterns) {
        rand -= pattern.weight;
        if (rand <= 0) return pattern;
    }
    return patterns[0];
};

/**
 * Generate a single SOS event for a scenario.
 */
const generateSOS = (scenario, waveIndex) => {
    const pattern = pickWeightedPattern(scenario.sosPatterns);
    const loc = randomLocationNear(scenario.epicenter, scenario.radiusKm);
    const nearestArea = DELHI_LOCATIONS.reduce((closest, area) => {
        const dist = Math.sqrt((area.lat - loc.lat) ** 2 + (area.lng - loc.lng) ** 2);
        return dist < closest.dist ? { ...area, dist } : closest;
    }, { dist: Infinity });

    return {
        caseId: `SOS-${Math.floor(1000 + Math.random() * 9000)}`,
        type: pattern.type,
        urgency: pattern.urgency,
        status: 'Pending',
        location: {
            lat: Math.round(loc.lat * 10000) / 10000,
            lng: Math.round(loc.lng * 10000) / 10000,
            address: `${pattern.addressPrefix}, ${nearestArea.area || 'Central Delhi'}`,
        },
        disasterType: scenario.name,
        waveIndex: waveIndex + 1,
        createdAt: new Date(),
    };
};

/**
 * Generate a complete disaster scenario with all waves.
 * Returns an object with waves of SOS events.
 */
const generateScenario = (scenarioKey) => {
    const scenario = DISASTER_SCENARIOS[scenarioKey];
    if (!scenario) return null;

    const waves = [];
    for (let w = 0; w < scenario.waveCount; w++) {
        const count = scenario.sosPerWave[w] || 2;
        const wave = [];
        for (let i = 0; i < count; i++) {
            wave.push(generateSOS(scenario, w));
        }
        waves.push(wave);
    }

    return {
        scenarioKey,
        scenario: {
            name: scenario.name,
            icon: scenario.icon,
            description: scenario.description,
            epicenter: scenario.epicenter,
            radiusKm: scenario.radiusKm,
        },
        waves,
        totalSOS: waves.reduce((sum, w) => sum + w.length, 0),
        waveDelayMs: scenario.waveDelayMs,
        resourceImpact: scenario.resourceImpact,
    };
};

/**
 * Generate a pool of resources for the simulation.
 */
const generateResourcePool = () => {
    const resourceTemplates = [
        { name: 'Dr. Sharma', type: 'Medical', skillLevel: 9 },
        { name: 'Dr. Khanna', type: 'Medical', skillLevel: 8 },
        { name: 'Dr. Patel', type: 'Medical', skillLevel: 7 },
        { name: 'Paramedic Unit Alpha', type: 'Medical', skillLevel: 6 },
        { name: 'Paramedic Unit Beta', type: 'Medical', skillLevel: 6 },
        { name: 'Rescue Team Alpha', type: 'Rescue', skillLevel: 9 },
        { name: 'Rescue Team Bravo', type: 'Rescue', skillLevel: 8 },
        { name: 'Rescue Team Charlie', type: 'Rescue', skillLevel: 7 },
        { name: 'K9 Search Unit', type: 'Rescue', skillLevel: 8 },
        { name: 'Food Relief Unit 1', type: 'Food', skillLevel: 7 },
        { name: 'Food Relief Unit 2', type: 'Food', skillLevel: 6 },
        { name: 'Community Kitchen', type: 'Food', skillLevel: 8 },
        { name: 'Shelter Hub North', type: 'Shelter', skillLevel: 7 },
        { name: 'Shelter Hub South', type: 'Shelter', skillLevel: 8 },
        { name: 'Mobile Shelter Unit', type: 'Shelter', skillLevel: 6 },
        { name: 'Transport Fleet A', type: 'Logistics', skillLevel: 7 },
        { name: 'Heavy Equipment Crew', type: 'Logistics', skillLevel: 9 },
        { name: 'Communications Relay', type: 'Logistics', skillLevel: 6 },
    ];

    return resourceTemplates.map((r, i) => ({
        _id: `res-${i + 1}`,
        ...r,
        status: 'Available',
        location: {
            lat: 28.6139 + (Math.random() - 0.5) * 0.06,
            lng: 77.2090 + (Math.random() - 0.5) * 0.06,
        },
        assignedTo: null,
        deployedAt: null,
    }));
};

module.exports = {
    DISASTER_SCENARIOS,
    generateScenario,
    generateResourcePool,
    generateSOS,
};
