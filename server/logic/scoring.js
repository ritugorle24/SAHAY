// ═══════════════════════════════════════════════════════════════
// SAHAYAK — AI Decision Engine: Scoring & Allocation Logic
// ═══════════════════════════════════════════════════════════════

/**
 * Haversine formula — real-world distance in km between two lat/lng points.
 * Much more accurate than Euclidean distance for geographic coordinates.
 */
const haversineDistance = (loc1, loc2) => {
    const R = 6371; // Earth radius in km
    const toRad = (deg) => (deg * Math.PI) / 180;
    const dLat = toRad(loc2.lat - loc1.lat);
    const dLng = toRad(loc2.lng - loc1.lng);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(loc1.lat)) * Math.cos(toRad(loc2.lat)) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

/**
 * Urgency multiplier — higher urgency cases get exponentially stronger weighting.
 */
const URGENCY_WEIGHTS = {
    Critical: 3.0,
    High: 2.0,
    Medium: 1.0,
};

/**
 * Skill matching matrix — how well a resource type matches an SOS type.
 * 1.0 = perfect match, 0.3-0.5 = partial overlap, 0.1 = minimal relevance
 */
const SKILL_MATRIX = {
    Medical: { Medical: 1.0, Rescue: 0.4, Food: 0.1, Shelter: 0.2, Logistics: 0.3 },
    Rescue: { Medical: 0.3, Rescue: 1.0, Food: 0.1, Shelter: 0.3, Logistics: 0.4 },
    Food: { Medical: 0.1, Rescue: 0.1, Food: 1.0, Shelter: 0.5, Logistics: 0.7 },
    Shelter: { Medical: 0.2, Rescue: 0.3, Food: 0.5, Shelter: 1.0, Logistics: 0.6 },
    Logistics: { Medical: 0.2, Rescue: 0.3, Food: 0.6, Shelter: 0.5, Logistics: 1.0 },
};

/**
 * Core scoring function — multi-factor weighted allocation score.
 * 
 * Factors (normalized 0-100 each, then weighted):
 *   - Distance Score (40%): Closer resources score higher
 *   - Skill Match (30%): How well resource type matches SOS need
 *   - Availability (15%): Available > Enroute > Busy
 *   - Resource Capacity (15%): Skill level of the resource
 * 
 * Final score is multiplied by urgency weight.
 */
const computeAllocationScore = (sos, resource) => {
    // 1. Distance Score (max range = 50km, normalize to 0-100)
    const distKm = haversineDistance(sos.location, resource.location);
    const distanceScore = Math.max(0, 100 - (distKm / 50) * 100);

    // 2. Skill Match Score
    const sosType = sos.type || 'Medical';
    const resType = resource.type || 'Medical';
    const skillMatchRaw = (SKILL_MATRIX[sosType] && SKILL_MATRIX[sosType][resType]) || 0.1;
    const skillScore = skillMatchRaw * 100;

    // 3. Availability Score
    const availabilityMap = { Available: 100, Enroute: 40, Busy: 0, Offline: 0 };
    const availScore = availabilityMap[resource.status] || 0;

    // 4. Capacity Score (skill level 1-10 → 10-100)
    const capacityScore = (resource.skillLevel || 5) * 10;

    // Weighted total
    const rawScore =
        distanceScore * 0.40 +
        skillScore * 0.30 +
        availScore * 0.15 +
        capacityScore * 0.15;

    // Apply urgency multiplier
    const urgencyMult = URGENCY_WEIGHTS[sos.urgency] || 1.0;
    const finalScore = rawScore * urgencyMult;

    // Determine match quality
    let matchQuality = 'Low';
    if (rawScore >= 75) matchQuality = 'Excellent';
    else if (rawScore >= 55) matchQuality = 'Good';
    else if (rawScore >= 35) matchQuality = 'Fair';

    return {
        finalScore: Math.round(finalScore * 100) / 100,
        rawScore: Math.round(rawScore * 100) / 100,
        breakdown: {
            distance: { score: Math.round(distanceScore * 100) / 100, weight: 0.40, distanceKm: Math.round(distKm * 100) / 100 },
            skill: { score: Math.round(skillScore * 100) / 100, weight: 0.30, matchLevel: skillMatchRaw },
            availability: { score: availScore, weight: 0.15, status: resource.status },
            capacity: { score: capacityScore, weight: 0.15, level: resource.skillLevel || 5 },
        },
        urgencyMultiplier: urgencyMult,
        matchQuality,
        estimatedResponseMinutes: Math.round((distKm / 30) * 60), // ~30 km/h avg speed
    };
};

/**
 * Find the best resource for a given SOS request.
 * Returns ranked candidates with full scoring breakdown.
 */
const findBestResource = (sos, resources) => {
    const availableResources = resources.filter(r => r.status === 'Available');
    
    if (availableResources.length === 0) {
        return { error: 'NO_RESOURCE', message: 'No available resources at the moment.', candidates: [] };
    }

    const candidates = availableResources.map(resource => {
        const scoring = computeAllocationScore(sos, resource);
        return {
            resource,
            score: scoring,
        };
    });

    // Sort by final score descending
    candidates.sort((a, b) => b.score.finalScore - a.score.finalScore);

    return {
        bestMatch: candidates[0],
        alternates: candidates.slice(1, 3), // top 2 alternates
        totalCandidates: candidates.length,
        decisionReason: generateDecisionReason(sos, candidates[0]),
    };
};

/**
 * Generate human-readable reason for the AI decision.
 */
const generateDecisionReason = (sos, bestCandidate) => {
    if (!bestCandidate) return 'No suitable candidate found.';
    
    const { resource, score } = bestCandidate;
    const parts = [];

    if (score.breakdown.skill.matchLevel >= 0.8) {
        parts.push(`${resource.name} is a direct ${resource.type} specialist`);
    } else if (score.breakdown.skill.matchLevel >= 0.4) {
        parts.push(`${resource.name} has cross-functional ${resource.type} capability`);
    } else {
        parts.push(`${resource.name} assigned as nearest available unit`);
    }

    parts.push(`at ${score.breakdown.distance.distanceKm} km distance`);
    parts.push(`with an estimated ${score.estimatedResponseMinutes} min response time`);

    if (sos.urgency === 'Critical') {
        parts.push('— CRITICAL urgency prioritized');
    }

    return parts.join(' ') + '.';
};

/**
 * Batch allocation — assign best resources to ALL pending SOS requests.
 * Uses a greedy algorithm with priority ordering:
 *   1. Sort SOS by urgency (Critical first) then by creation time
 *   2. For each SOS, find best available resource
 *   3. Mark that resource as "claimed" so it's not reused
 */
const batchAllocate = (sosList, resources) => {
    const urgencyOrder = { Critical: 0, High: 1, Medium: 2 };
    const pendingSOS = sosList
        .filter(s => s.status === 'Pending')
        .sort((a, b) => {
            const urgDiff = (urgencyOrder[a.urgency] || 2) - (urgencyOrder[b.urgency] || 2);
            if (urgDiff !== 0) return urgDiff;
            return new Date(a.createdAt) - new Date(b.createdAt);
        });

    const availablePool = resources.filter(r => r.status === 'Available').map(r => ({ ...r }));
    const assignments = [];
    const unassigned = [];

    for (const sos of pendingSOS) {
        if (availablePool.length === 0) {
            unassigned.push({ sos, reason: 'No available resources remaining' });
            continue;
        }

        const candidates = availablePool.map(resource => ({
            resource,
            score: computeAllocationScore(sos, resource),
        }));

        candidates.sort((a, b) => b.score.finalScore - a.score.finalScore);

        const best = candidates[0];
        if (best.score.rawScore < 10) {
            unassigned.push({ sos, reason: 'No suitable resource match found' });
            continue;
        }

        // Remove from available pool
        const idx = availablePool.findIndex(r => r._id === best.resource._id || r._id.toString() === best.resource._id.toString());
        if (idx !== -1) availablePool.splice(idx, 1);

        assignments.push({
            sos,
            resource: best.resource,
            score: best.score,
            reason: generateDecisionReason(sos, best),
        });
    }

    return {
        assignments,
        unassigned,
        totalProcessed: pendingSOS.length,
        totalAssigned: assignments.length,
        totalUnassigned: unassigned.length,
    };
};

/**
 * Dynamic reallocation — when a new critical SOS arrives, check if any
 * already-assigned resource should be reassigned.
 * Only preempts if:
 *   - New SOS is Critical
 *   - Currently assigned SOS is Medium
 *   - The resource would score significantly higher for the new SOS
 */
const checkReallocation = (newSOS, currentAssignments, resources) => {
    if (newSOS.urgency !== 'Critical') return null;

    const reassignmentCandidates = [];

    for (const assignment of currentAssignments) {
        if (assignment.sos.urgency === 'Medium' && assignment.resource) {
            const newScore = computeAllocationScore(newSOS, assignment.resource);
            if (newScore.rawScore > assignment.score.rawScore * 1.3) {
                reassignmentCandidates.push({
                    fromSOS: assignment.sos,
                    resource: assignment.resource,
                    newScore,
                    oldScore: assignment.score,
                    improvement: Math.round(((newScore.rawScore - assignment.score.rawScore) / assignment.score.rawScore) * 100),
                });
            }
        }
    }

    if (reassignmentCandidates.length === 0) return null;

    reassignmentCandidates.sort((a, b) => b.improvement - a.improvement);
    return reassignmentCandidates[0];
};

module.exports = {
    haversineDistance,
    computeAllocationScore,
    findBestResource,
    batchAllocate,
    checkReallocation,
    generateDecisionReason,
    URGENCY_WEIGHTS,
    SKILL_MATRIX,
};
