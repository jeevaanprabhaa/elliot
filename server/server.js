const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Older cached Vercel bundles could resolve an unset API base URL to
// "/undefined/api/...". Normalize that legacy path so open tabs can still
// register donors while they receive the refreshed client bundle.
app.use((req, res, next) => {
  const normalizedUrl = req.url.replace(/^\/undefined(?=\/api(?:\/|$))/, '');
  if (normalizedUrl !== req.url) req.url = normalizedUrl;
  next();
});

// Temporary development storage. Data resets whenever the server restarts.
const donors = [];
const requests = [];
const EMERGENCY_STATUSES = [
  'CREATED',
  'SEARCHING',
  'DONOR_MATCHED',
  'DONOR_ACCEPTED',
  'DONOR_TRAVELLING',
  'DONOR_ARRIVED',
  'DONATION_IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
];

const createId = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const now = () => new Date().toISOString();
const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const asDate = (value) => {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const cityCoordinates = {
  ahmedabad: { lat: 23.0225, lng: 72.5714 },
  mumbai: { lat: 19.076, lng: 72.8777 },
  delhi: { lat: 28.6139, lng: 77.209 },
  bengaluru: { lat: 12.9716, lng: 77.5946 },
  pune: { lat: 18.5204, lng: 73.8567 },
  chennai: { lat: 13.0827, lng: 80.2707 },
  kolkata: { lat: 22.5726, lng: 88.3639 },
};

const normaliseDonor = (data) => ({
  _id: createId('donor'),
  name: String(data.name || '').trim(),
  phone: String(data.phone || '').replace(/\D/g, ''),
  bloodGroup: data.bloodGroup,
  city: String(data.city || '').trim(),
  notes: data.notes || '',
  availability: data.availability || 'Available',
  availabilitySlots: Array.isArray(data.availabilitySlots) ? data.availabilitySlots : [],
  lastDonatedAt: data.lastDonatedAt ? asDate(data.lastDonatedAt) : undefined,
  donationHistory: Array.isArray(data.donationHistory) ? data.donationHistory : [],
  responseHistory: Array.isArray(data.responseHistory) ? data.responseHistory : [],
  responseRate: Number.isFinite(Number(data.responseRate)) ? Number(data.responseRate) : undefined,
  successfulResponses: Number.isFinite(Number(data.successfulResponses)) ? Number(data.successfulResponses) : undefined,
  allowCall: Boolean(data.allowCall),
  coordinates: data.coordinates || undefined,
  createdAt: now(),
  updatedAt: now(),
});

const normaliseRequest = (data) => ({
  _id: createId('request'),
  patientName: String(data.patientName || '').trim(),
  bloodGroup: data.bloodGroup,
  componentType: data.componentType || 'whole_blood',
  city: String(data.city || '').trim(),
  hospital: String(data.hospital || '').trim(),
  units: Number(data.units) > 0 ? Number(data.units) : 1,
  contactPhone: String(data.contactPhone || '').replace(/\D/g, ''),
  neededBy: asDate(data.neededBy),
  notes: data.notes || '',
  urgency: data.urgency || 'routine',
  coordinates: data.coordinates || undefined,
  status: 'open',
  requestType: data.requestType || 'standard',
  emergencyStatus: data.requestType === 'emergency' ? (data.emergencyStatus || 'CREATED') : undefined,
  matchedDonorId: data.matchedDonorId || null,
  matchSnapshot: data.matchSnapshot || null,
  distanceKm: toFiniteNumber(data.distanceKm),
  etaMinutes: toFiniteNumber(data.etaMinutes),
  alertSentAt: data.alertSentAt || null,
  donorResponse: data.donorResponse || null,
  donorResponseAt: data.donorResponseAt || null,
  donorArrivedAt: data.donorArrivedAt || null,
  donationStartedAt: data.donationStartedAt || null,
  completedAt: data.completedAt || null,
  timeline: data.requestType === 'emergency'
    ? [{ status: data.emergencyStatus || 'CREATED', at: now() }]
    : [],
  createdAt: now(),
  updatedAt: now(),
});

// Basic health
app.get('/', (req, res) => res.json({ status: 'ok', storage: 'in-memory' }));
app.get('/api/health', (req, res) => res.json({ status: 'ok', storage: 'in-memory' }));

/**
 * GET /api/donors
 * optional query:
 *  q - name or phone partial
 *  bloodGroup - exact blood group
 *  city - partial city
 */
app.get('/api/donors', (req, res) => {
  const { q, bloodGroup, city } = req.query;
  const search = q ? new RegExp(escapeRegExp(q), 'i') : null;
  const citySearch = city ? new RegExp(escapeRegExp(city), 'i') : null;

  const result = donors
    .filter((donor) => {
      if (bloodGroup && donor.bloodGroup !== bloodGroup) return false;
      if (search && !search.test(donor.name) && !search.test(donor.phone)) return false;
      if (citySearch && !citySearch.test(donor.city)) return false;
      return true;
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 200);

  res.json(result);
});

app.get('/api/donors/:id', (req, res) => {
  const donor = donors.find((item) => item._id === req.params.id);
  if (!donor) return res.status(404).json({ error: 'not found' });
  res.json(donor);
});

app.post('/api/donors', (req, res) => {
  const data = { ...req.body };
  data.name = String(data.name || '').trim();
  data.city = String(data.city || '').trim();
  data.phone = String(data.phone || '').replace(/\D/g, '');

  if (!data.name || data.name.length < 2) return res.status(400).json({ error: 'invalid name' });
  if (!data.city) return res.status(400).json({ error: 'invalid city' });
  if (!data.bloodGroup) return res.status(400).json({ error: 'invalid blood group' });
  if (!data.phone || data.phone.length < 10 || data.phone.length > 15) {
    return res.status(400).json({ error: 'invalid phone' });
  }
  if (donors.some((donor) => donor.phone === data.phone)) {
    return res.status(409).json({ error: 'duplicate phone' });
  }

  const donor = normaliseDonor(data);
  donors.push(donor);
  res.status(201).json(donor);
});

app.put('/api/donors/:id', (req, res) => {
  const donor = donors.find((item) => item._id === req.params.id);
  if (!donor) return res.status(404).json({ error: 'not found' });

  Object.assign(donor, req.body, { updatedAt: now() });
  res.json(donor);
});

app.post('/api/donors/:id/donations', (req, res) => {
  const donor = donors.find((item) => item._id === req.params.id);
  if (!donor) return res.status(404).json({ error: 'not found' });

  const date = asDate(req.body.date);
  if (!date) return res.status(400).json({ error: 'invalid date' });

  donor.donationHistory.push({
    date,
    location: req.body.location,
    notes: req.body.notes,
  });
  donor.lastDonatedAt = date;
  donor.updatedAt = now();
  res.status(201).json(donor);
});

app.delete('/api/donors/:id', (req, res) => {
  const index = donors.findIndex((item) => item._id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'not found' });

  donors.splice(index, 1);
  res.json({ success: true });
});

const recipientCompatibility = {
  'O-': ['O-'],
  'O+': ['O-', 'O+'],
  'A-': ['O-', 'A-'],
  'A+': ['O-', 'O+', 'A-', 'A+'],
  'B-': ['O-', 'B-'],
  'B+': ['O-', 'O+', 'B-', 'B+'],
  'AB-': ['O-', 'A-', 'B-', 'AB-'],
  'AB+': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'],
};

const clampScore = (value) => Math.min(Math.max(value, 0), 1);
const toFiniteNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const getRecordCoordinates = (record) => {
  const coordinates = record?.coordinates;
  if (toFiniteNumber(coordinates?.lat) !== null && toFiniteNumber(coordinates?.lng) !== null) {
    return { lat: Number(coordinates.lat), lng: Number(coordinates.lng) };
  }
  const city = String(record?.city || '').trim().toLowerCase();
  return cityCoordinates[city] || null;
};

const haversineKm = (from, to) => {
  if (!from || !to) return null;
  const toRadians = (value) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const latitudeDelta = toRadians(to.lat - from.lat);
  const longitudeDelta = toRadians(to.lng - from.lng);
  const fromLatitude = toRadians(from.lat);
  const toLatitude = toRadians(to.lat);
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(fromLatitude) * Math.cos(toLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  return Math.round(earthRadiusKm * 2 * Math.asin(Math.min(1, Math.sqrt(a))) * 10) / 10;
};

const getDonationGapDays = (componentType) => componentType === 'platelets' ? 7 : 90;

const getEligibility = (donor, request) => {
  if (!donor.lastDonatedAt) {
    return { eligibleNow: true, daysSinceLastDonation: null, nextEligibleAt: null };
  }

  const lastDonation = new Date(donor.lastDonatedAt);
  if (Number.isNaN(lastDonation.getTime())) {
    return { eligibleNow: true, daysSinceLastDonation: null, nextEligibleAt: null };
  }

  const neededAt = new Date(request.neededBy);
  const comparisonTime = Number.isNaN(neededAt.getTime()) ? new Date() : neededAt;
  const nextEligibleAt = new Date(lastDonation);
  nextEligibleAt.setDate(nextEligibleAt.getDate() + getDonationGapDays(request.componentType));
  const daysSinceLastDonation = Math.floor((comparisonTime.getTime() - lastDonation.getTime()) / (1000 * 60 * 60 * 24));

  return {
    eligibleNow: nextEligibleAt <= comparisonTime,
    daysSinceLastDonation: Math.max(daysSinceLastDonation, 0),
    nextEligibleAt: nextEligibleAt.toISOString(),
  };
};

const getAvailability = (donor, request) => {
  const availability = String(donor.availability || 'Available').trim().toLowerCase();
  const requestTime = new Date(request.neededBy);
  const targetTime = Number.isNaN(requestTime.getTime()) ? new Date() : requestTime;
  const unavailable = ['unavailable', 'not available', 'paused', 'offline', 'busy'].some((value) => availability.includes(value));

  if (unavailable) {
    return { availableAtRequest: false, score: 0.05, label: 'Unavailable', detail: 'Marked unavailable in donor profile' };
  }

  if (Array.isArray(donor.availabilitySlots) && donor.availabilitySlots.length > 0) {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const day = dayNames[targetTime.getDay()];
    const minutes = targetTime.getHours() * 60 + targetTime.getMinutes();
    const matchesSlot = donor.availabilitySlots.some((slot) => {
      if (slot.day !== day) return false;
      const [startHour, startMinute] = String(slot.startTime || '00:00').split(':').map(Number);
      const [endHour, endMinute] = String(slot.endTime || '23:59').split(':').map(Number);
      const start = startHour * 60 + startMinute;
      const end = endHour * 60 + endMinute;
      return Number.isFinite(start) && Number.isFinite(end) && minutes >= start && minutes <= end;
    });

    return matchesSlot
      ? { availableAtRequest: true, score: 1, label: 'Available', detail: `Scheduled for ${day} at the requested time` }
      : { availableAtRequest: false, score: 0.35, label: 'Scheduled', detail: 'No matching availability slot for the requested time' };
  }

  if (availability.includes('on-call') || availability.includes('on call')) {
    return { availableAtRequest: true, score: 0.85, label: 'On-call', detail: 'Donor is marked on-call' };
  }
  if (availability.includes('available') || availability.includes('ready') || availability.includes('always')) {
    return { availableAtRequest: true, score: 1, label: 'Available', detail: 'Donor is marked available' };
  }
  return { availableAtRequest: false, score: 0.5, label: 'Confirm', detail: 'Availability needs confirmation' };
};

const getReliability = (donor) => {
  const history = Array.isArray(donor.responseHistory) ? donor.responseHistory : [];
  const explicitRate = toFiniteNumber(donor.responseRate);
  if (explicitRate !== null) {
    const score = explicitRate > 1 ? explicitRate / 100 : explicitRate;
    const boundedScore = clampScore(score);
    return {
      score: boundedScore,
      percent: Math.round(boundedScore * 100),
      label: boundedScore >= 0.75 ? 'High' : boundedScore >= 0.5 ? 'Moderate' : 'Low',
      detail: 'Based on recorded response rate',
    };
  }

  if (history.length > 0) {
    const responded = history.filter((entry) => entry?.responded === true || entry?.accepted === true || entry?.status === 'responded' || entry?.status === 'accepted').length;
    const score = responded / history.length;
    return {
      score,
      percent: Math.round(score * 100),
      label: score >= 0.75 ? 'High' : score >= 0.5 ? 'Moderate' : 'Low',
      detail: `${responded} of ${history.length} previous requests received a response`,
    };
  }

  const successfulResponses = toFiniteNumber(donor.successfulResponses);
  if (successfulResponses !== null) {
    const score = clampScore(successfulResponses / Math.max(successfulResponses + 1, 1));
    return {
      score,
      percent: Math.round(score * 100),
      label: score >= 0.75 ? 'High' : score >= 0.5 ? 'Moderate' : 'Low',
      detail: `${successfulResponses} successful previous response(s) recorded`,
    };
  }

  return {
    score: 0.5,
    percent: 50,
    label: 'New',
    detail: 'No previous response history recorded yet',
  };
};

const buildDonorMatches = (request) => {
  const compatibleGroups = recipientCompatibility[request.bloodGroup] || [];
  const requestCoordinates = getRecordCoordinates(request);

  const matches = donors
    .map((donor) => {
      const isExactGroup = donor.bloodGroup === request.bloodGroup;
      const isCompatible = compatibleGroups.includes(donor.bloodGroup);
      const eligibility = getEligibility(donor, request);
      const availability = getAvailability(donor, request);
      const distanceKm = haversineKm(requestCoordinates, getRecordCoordinates(donor));
      const distanceScore = distanceKm === null ? 0.5 : clampScore(1 - distanceKm / 50);
      const reliability = getReliability(donor);
      const compatibilityScore = isExactGroup ? 1 : isCompatible ? 0.8 : 0;
      const matchScore = Math.round(
        compatibilityScore * 30
        + (eligibility.eligibleNow ? 1 : 0) * 25
        + distanceScore * 20
        + availability.score * 15
        + reliability.score * 10,
      );

      return {
        donor: {
          _id: donor._id,
          name: donor.name,
          bloodGroup: donor.bloodGroup,
          city: donor.city,
          phone: donor.allowCall ? donor.phone : undefined,
          allowCall: donor.allowCall,
        },
        matchScore,
        distanceKm,
        eligibility,
        availability,
        reliability,
        reasons: [
          {
            key: 'compatible',
            label: 'Compatible',
            passed: isCompatible,
            detail: isExactGroup
              ? `Exact ${request.bloodGroup} match`
              : isCompatible
                ? `${donor.bloodGroup} is compatible with ${request.bloodGroup}`
                : `${donor.bloodGroup} is not compatible with ${request.bloodGroup}`,
          },
          {
            key: 'eligible',
            label: 'Eligible',
            passed: eligibility.eligibleNow,
            detail: eligibility.eligibleNow
              ? `Donation gap met (${getDonationGapDays(request.componentType)} days)`
              : `Next eligible ${new Date(eligibility.nextEligibleAt).toLocaleDateString()}`,
          },
          {
            key: 'nearby',
            label: 'Nearby',
            passed: distanceKm !== null && distanceKm <= 50,
            detail: distanceKm === null ? 'Distance unavailable; confirm location' : `${distanceKm} km from ${request.city}`,
          },
          {
            key: 'available',
            label: 'Available',
            passed: availability.availableAtRequest,
            detail: availability.detail,
          },
          {
            key: 'reliable',
            label: 'Reliable',
            passed: reliability.score >= 0.6,
            detail: reliability.detail,
          },
        ],
      };
    })
    .filter((match) => (
      match.reasons.find((reason) => reason.key === 'compatible')?.passed
      && match.eligibility.eligibleNow
      && match.availability.availableAtRequest
    ))
    .sort((a, b) => b.matchScore - a.matchScore || (a.distanceKm ?? 1e9) - (b.distanceKm ?? 1e9))
    .map((match, index) => ({ ...match, rank: index + 1 }));

  return matches;
};

// Elliott prototype prediction engine.
// These inventory, consumption, and scheduled-demand values intentionally act as
// a realistic hospital demo baseline until persistent hospital data is connected.
const ELLIOT_DEMO_INVENTORY = [
  ['A+', 'whole_blood', 24, 3, 7.5, 7.1, 11],
  ['A-', 'whole_blood', 8, 1, 2.2, 2.4, 5],
  ['B+', 'whole_blood', 17, 2, 5.5, 5.0, 6],
  ['B-', 'whole_blood', 4, 1, 1.2, 1.0, 3],
  ['AB+', 'whole_blood', 9, 1, 2.0, 1.8, 2],
  ['AB-', 'whole_blood', 2, 0, 0.6, 0.5, 1.5],
  ['O+', 'whole_blood', 32, 5, 9.0, 8.2, 12],
  ['O-', 'whole_blood', 7, 2, 2.5, 2.2, 6],
  ['A+', 'platelets', 6, 2, 2.3, 2.1, 5],
  ['A-', 'platelets', 3, 1, 0.8, 0.9, 2],
  ['B+', 'platelets', 5, 1, 1.8, 1.6, 4],
  ['B-', 'platelets', 1, 0, 0.5, 0.4, 1.5],
  ['AB+', 'platelets', 2, 1, 0.7, 0.6, 1],
  ['AB-', 'platelets', 1, 0, 0.2, 0.2, 0.7],
  ['O+', 'platelets', 8, 2, 2.8, 2.5, 6],
  ['O-', 'platelets', 1, 1, 0.7, 0.6, 2],
].map(([bloodGroup, componentType, unitsAvailable, reservedUnits, recentDailyUse, historicalDailyUse, scheduledDemand]) => ({
  bloodGroup,
  componentType,
  unitsAvailable,
  reservedUnits,
  recentDailyUse,
  historicalDailyUse,
  scheduledDemand,
}));

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const roundTo = (value, places = 1) => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

const getRequest = (id) => requests.find((request) => request._id === id);
const isEmergencyRequest = (request) => request?.requestType === 'emergency';
const estimateEtaMinutes = (distanceKm) => {
  if (distanceKm === null || distanceKm === undefined) return 18;
  return Math.max(6, Math.round((Number(distanceKm) * 3.5) + 7));
};
const addEmergencyTimelineEvent = (request, status) => {
  if (!isEmergencyRequest(request)) return;
  if (!Array.isArray(request.timeline)) request.timeline = [];
  if (request.timeline[request.timeline.length - 1]?.status !== status) {
    request.timeline.push({ status, at: now() });
  }
};
const setEmergencyStatus = (request, status) => {
  request.emergencyStatus = status;
  request.updatedAt = now();
  addEmergencyTimelineEvent(request, status);
};
const emergencyResponse = (request) => ({
  ...request,
  matchedDonor: request.matchedDonorId
    ? donors.find((donor) => donor._id === request.matchedDonorId) || request.matchSnapshot?.donor || null
    : null,
});

const getSeasonalProfile = () => {
  const month = new Date().getMonth();
  if ([5, 6, 7, 8].includes(month)) {
    return { factor: 1.12, label: 'monsoon-season demand uplift' };
  }
  if ([10, 11, 0].includes(month)) {
    return { factor: 1.08, label: 'holiday-season demand uplift' };
  }
  return { factor: 1.03, label: 'normal seasonal demand uplift' };
};

const buildElliotPrediction = (horizonHours = 72) => {
  const horizon = clamp(Number(horizonHours) || 72, 24, 72);
  const seasonal = getSeasonalProfile();
  const currentTime = Date.now();
  const liveDemand = {};
  let liveRequestCount = 0;

  requests.forEach((request) => {
    if (request.status !== 'open') return;
    const neededAt = new Date(request.neededBy).getTime();
    if (!Number.isFinite(neededAt) || neededAt < currentTime || neededAt > currentTime + horizon * 60 * 60 * 1000) return;
    const componentType = request.componentType || 'whole_blood';
    const key = `${request.bloodGroup}:${componentType}`;
    liveDemand[key] = (liveDemand[key] || 0) + (Number(request.units) || 1);
    liveRequestCount += 1;
  });

  const items = ELLIOT_DEMO_INVENTORY.map((entry) => {
    const key = `${entry.bloodGroup}:${entry.componentType}`;
    const liveScheduledDemand = liveDemand[key] || 0;
    const scheduledDemand = entry.scheduledDemand + liveScheduledDemand;
    const trendMultiplier = entry.recentDailyUse >= entry.historicalDailyUse ? 1.05 : 0.98;
    const blendedDailyUse = (
      entry.recentDailyUse * 0.55
      + entry.historicalDailyUse * 0.3
      + entry.recentDailyUse * trendMultiplier * 0.15
    ) * seasonal.factor;
    const predictedDemand = blendedDailyUse * (horizon / 24) + scheduledDemand;
    const usableStock = Math.max(entry.unitsAvailable - entry.reservedUnits, 0);
    const gapRatio = Math.max(0, (predictedDemand - usableStock) / Math.max(predictedDemand, 1));
    const trendPressure = entry.recentDailyUse > entry.historicalDailyUse * 1.08 ? 0.07 : 0.02;
    const shortageProbability = clamp(0.06 + gapRatio * 0.82 + trendPressure, 0.03, 0.99);
    const risk = shortageProbability >= 0.85
      ? 'Critical'
      : shortageProbability >= 0.65
        ? 'High'
        : shortageProbability >= 0.35
          ? 'Medium'
          : 'Low';
    const hourlyDemand = predictedDemand / horizon;
    const shortageHours = usableStock < predictedDemand ? usableStock / Math.max(hourlyDemand, 0.01) : null;
    const predictedShortageTime = shortageHours == null
      ? null
      : shortageHours <= 24
        ? `Within ${Math.max(6, Math.round(shortageHours / 6) * 6)} hours`
        : `In approximately ${Math.round(shortageHours / 12) * 12} hours`;
    const forecast = [0, 12, 24, 36, 48, 60, 72].map((hours) => {
      const boundedHours = Math.min(hours, horizon);
      const demandAt = blendedDailyUse * (boundedHours / 24) + scheduledDemand * (boundedHours / horizon);
      return {
        hours: boundedHours,
        demand: roundTo(demandAt),
        stock: roundTo(Math.max(usableStock - demandAt, 0)),
      };
    }).filter((point, index, list) => index === 0 || point.hours !== list[index - 1].hours);

    return {
      bloodGroup: entry.bloodGroup,
      componentType: entry.componentType,
      currentStock: entry.unitsAvailable,
      reservedStock: entry.reservedUnits,
      usableStock,
      predictedDemand: roundTo(predictedDemand),
      shortageProbability: roundTo(shortageProbability * 100),
      risk,
      predictedShortageTime,
      forecast,
      explainableFactors: [
        `${usableStock} usable units remain after ${entry.reservedUnits} reserved unit(s).`,
        `Recent consumption is about ${entry.recentDailyUse} unit(s)/day versus a historical baseline of ${entry.historicalDailyUse}.`,
        `${roundTo(scheduledDemand)} unit(s) of scheduled demand are expected within ${horizon} hours.`,
        `${seasonal.label} is adding approximately ${Math.round((seasonal.factor - 1) * 100)}% to the baseline.`,
        ...(liveScheduledDemand > 0
          ? [`${liveScheduledDemand} unit(s) came from live open requests in the current prototype store.`]
          : []),
      ],
      inputs: {
        recentDailyConsumption: entry.recentDailyUse,
        historicalDailyConsumption: entry.historicalDailyUse,
        scheduledDemand: roundTo(scheduledDemand),
        seasonalFactor: seasonal.factor,
        liveRequestDemand: liveScheduledDemand,
      },
    };
  });

  const atRisk = items.filter((item) => item.risk !== 'Low');
  const criticalCount = items.filter((item) => item.risk === 'Critical').length;
  const highCount = items.filter((item) => item.risk === 'High').length;

  return {
    demo: true,
    label: 'DEMO / PROTOTYPE',
    generatedAt: now(),
    horizonHours: horizon,
    hospital: 'Community General Hospital (demo)',
    summary: {
      trackedSignals: items.length,
      atRiskSignals: atRisk.length,
      criticalCount,
      highCount,
      liveOpenRequestsIncluded: liveRequestCount,
    },
    dataSources: {
      currentInventory: 'Demo hospital inventory baseline',
      recentConsumption: 'Simulated recent usage baseline',
      historicalUsage: 'Simulated historical usage baseline; persistent history is not connected',
      scheduledDemand: 'Demo scheduled demand plus live open requests due within the forecast window',
      seasonalTrends: 'Heuristic seasonal demand factor',
    },
    assumptions: [
      'One unit represents one usable blood or platelet unit.',
      'Reserved units are excluded from usable stock.',
      'This prototype is for product demonstration and is not a clinical or inventory decision system.',
    ],
    items,
  };
};

app.get('/api/elliot/shortage-prediction', (req, res) => {
  res.json(buildElliotPrediction(req.query.horizon));
});

// Requests
app.get('/api/requests', (req, res) => {
  const { status = 'open', bloodGroup, city } = req.query;
  const citySearch = city ? new RegExp(escapeRegExp(city), 'i') : null;

  const result = requests
    .filter((request) => {
      if (request.status !== status) return false;
      if (bloodGroup && request.bloodGroup !== bloodGroup) return false;
      if (citySearch && !citySearch.test(request.city)) return false;
      return true;
    })
    .sort((a, b) => new Date(a.neededBy) - new Date(b.neededBy) || new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 200);

  res.json(result);
});

app.get('/api/requests/:id', (req, res) => {
  const request = getRequest(req.params.id);
  if (!request) return res.status(404).json({ error: 'request not found' });
  res.json(isEmergencyRequest(request) ? emergencyResponse(request) : request);
});

app.get('/api/requests/:id/matches', (req, res) => {
  const request = requests.find((item) => item._id === req.params.id);
  if (!request) return res.status(404).json({ error: 'request not found' });

  const matches = buildDonorMatches(request);
  res.json({
    label: 'ELLIOT SMART DONOR MATCHING',
    demo: true,
    generatedAt: now(),
    request: {
      _id: request._id,
      bloodGroup: request.bloodGroup,
      componentType: request.componentType,
      city: request.city,
      hospital: request.hospital,
      units: request.units,
      neededBy: request.neededBy,
      urgency: request.urgency,
    },
    summary: {
      donorsChecked: donors.length,
      compatibleEligible: matches.length,
      availableNow: matches.filter((match) => match.availability.availableAtRequest).length,
      exactGroupMatches: matches.filter((match) => match.donor.bloodGroup === request.bloodGroup).length,
    },
    scoring: {
      compatibleBloodGroup: '30%',
      eligibilityAndDonationGap: '25%',
      distance: '20%',
      availability: '15%',
      reliabilityAndPreviousResponse: '10%',
    },
    matches,
  });
});

app.post('/api/requests', (req, res) => {
  const data = { ...req.body };
  data.patientName = String(data.patientName || '').trim();
  data.city = String(data.city || '').trim();
  data.contactPhone = String(data.contactPhone || '').replace(/\D/g, '');

  if (!data.patientName || data.patientName.length < 2) {
    return res.status(400).json({ error: 'invalid patient name' });
  }
  if (!data.city) return res.status(400).json({ error: 'invalid city' });
  if (!data.bloodGroup) return res.status(400).json({ error: 'invalid blood group' });
  if (!data.contactPhone || data.contactPhone.length < 10 || data.contactPhone.length > 15) {
    return res.status(400).json({ error: 'invalid contact phone' });
  }
  if (!data.neededBy || !asDate(data.neededBy)) {
    return res.status(400).json({ error: 'invalid needed by date' });
  }

  const request = normaliseRequest(data);
  requests.push(request);
  res.status(201).json(isEmergencyRequest(request) ? emergencyResponse(request) : request);
});

app.post('/api/requests/:id/emergency/match', (req, res) => {
  const request = getRequest(req.params.id);
  if (!request) return res.status(404).json({ error: 'request not found' });
  if (!isEmergencyRequest(request)) return res.status(400).json({ error: 'request is not an emergency request' });
  if (!['CREATED', 'SEARCHING', 'DONOR_MATCHED'].includes(request.emergencyStatus)) {
    return res.status(409).json({ error: `cannot match a request in ${request.emergencyStatus} state` });
  }

  setEmergencyStatus(request, 'SEARCHING');
  const matches = buildDonorMatches(request);
  const selected = matches.find((match) => !req.body?.donorId || match.donor._id === req.body.donorId);
  if (!selected) {
    request.updatedAt = now();
    return res.status(404).json({ error: 'no compatible, eligible, and available donor found', matches });
  }

  request.matchedDonorId = selected.donor._id;
  request.matchSnapshot = selected;
  request.distanceKm = selected.distanceKm;
  request.etaMinutes = estimateEtaMinutes(selected.distanceKm);
  setEmergencyStatus(request, 'DONOR_MATCHED');
  res.json({ request: emergencyResponse(request), match: selected, matches });
});

app.post('/api/requests/:id/emergency/alert', (req, res) => {
  const request = getRequest(req.params.id);
  if (!request) return res.status(404).json({ error: 'request not found' });
  if (!isEmergencyRequest(request) || request.emergencyStatus !== 'DONOR_MATCHED' || !request.matchedDonorId) {
    return res.status(409).json({ error: 'match a donor before sending an emergency alert' });
  }

  request.alertSentAt = now();
  request.updatedAt = now();
  res.json(emergencyResponse(request));
});

app.get('/api/donors/:id/emergency-alerts', (req, res) => {
  const alerts = requests
    .filter((request) => isEmergencyRequest(request) && request.matchedDonorId === req.params.id)
    .filter((request) => !['COMPLETED', 'CANCELLED'].includes(request.emergencyStatus))
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .map(emergencyResponse);
  res.json(alerts);
});

app.post('/api/requests/:id/emergency/respond', (req, res) => {
  const request = getRequest(req.params.id);
  if (!request) return res.status(404).json({ error: 'request not found' });
  if (!isEmergencyRequest(request) || !request.alertSentAt) {
    return res.status(409).json({ error: 'emergency alert has not been sent' });
  }
  if (req.body?.donorId && req.body.donorId !== request.matchedDonorId) {
    return res.status(403).json({ error: 'donor is not the matched recipient of this alert' });
  }
  if (!['accept', 'decline'].includes(req.body?.action)) {
    return res.status(400).json({ error: 'action must be accept or decline' });
  }
  if (request.emergencyStatus !== 'DONOR_MATCHED') {
    return res.status(409).json({ error: `request is already ${request.emergencyStatus}` });
  }

  request.donorResponse = req.body.action === 'accept' ? 'accepted' : 'declined';
  request.donorResponseAt = now();
  const donor = donors.find((item) => item._id === request.matchedDonorId);
  if (donor) {
    donor.responseHistory = Array.isArray(donor.responseHistory) ? donor.responseHistory : [];
    donor.responseHistory.push({
      requestId: request._id,
      responded: true,
      accepted: req.body.action === 'accept',
      status: req.body.action === 'accept' ? 'accepted' : 'declined',
      at: request.donorResponseAt,
    });
    donor.updatedAt = now();
  }

  setEmergencyStatus(request, req.body.action === 'accept' ? 'DONOR_ACCEPTED' : 'CANCELLED');
  res.json(emergencyResponse(request));
});

app.post('/api/requests/:id/emergency/status', (req, res) => {
  const request = getRequest(req.params.id);
  if (!request) return res.status(404).json({ error: 'request not found' });
  if (!isEmergencyRequest(request)) return res.status(400).json({ error: 'request is not an emergency request' });
  if (req.body?.donorId && req.body.donorId !== request.matchedDonorId) {
    return res.status(403).json({ error: 'donor is not assigned to this request' });
  }

  const nextStatusByAction = {
    start_journey: { from: ['DONOR_ACCEPTED'], to: 'DONOR_TRAVELLING' },
    arrived: { from: ['DONOR_TRAVELLING'], to: 'DONOR_ARRIVED' },
    start_donation: { from: ['DONOR_ARRIVED'], to: 'DONATION_IN_PROGRESS' },
    complete: { from: ['DONATION_IN_PROGRESS'], to: 'COMPLETED' },
  };
  const transition = nextStatusByAction[req.body?.action];
  if (!transition) return res.status(400).json({ error: 'action must be start_journey, arrived, start_donation, or complete' });
  if (!transition.from.includes(request.emergencyStatus)) {
    return res.status(409).json({ error: `cannot ${req.body.action} while request is ${request.emergencyStatus}` });
  }

  if (transition.to === 'DONOR_ARRIVED') request.donorArrivedAt = now();
  if (transition.to === 'DONATION_IN_PROGRESS') request.donationStartedAt = now();
  if (transition.to === 'COMPLETED') {
    request.completedAt = now();
    request.status = 'fulfilled';
    const donor = donors.find((item) => item._id === request.matchedDonorId);
    if (donor) {
      donor.donationHistory = Array.isArray(donor.donationHistory) ? donor.donationHistory : [];
      donor.donationHistory.push({
        date: request.completedAt,
        location: request.hospital,
        notes: `Emergency ${request.componentType === 'platelets' ? 'platelet' : 'whole blood'} donation · ${request.units} unit(s)`,
        requestId: request._id,
        componentType: request.componentType,
        units: request.units,
      });
      donor.lastDonatedAt = request.completedAt;
      donor.updatedAt = now();
    }
    const inventoryItem = ELLIOT_DEMO_INVENTORY.find(
      (item) => item.bloodGroup === request.bloodGroup && item.componentType === request.componentType,
    );
    if (inventoryItem) inventoryItem.unitsAvailable += request.units;
    request.inventoryUpdated = Boolean(inventoryItem);
  }

  setEmergencyStatus(request, transition.to);
  res.json(emergencyResponse(request));
});

app.post('/api/demo/emergency', (req, res) => {
  let donor = donors.find((item) => item.phone === '919812345678');
  if (!donor) {
    donor = normaliseDonor({
      name: 'Rohit Verma',
      phone: '919812345678',
      bloodGroup: 'O+',
      city: 'Mumbai',
      availability: 'Available',
      allowCall: false,
      coordinates: { lat: 19.0586, lng: 72.8656 },
    });
    donors.push(donor);
  }

  const request = normaliseRequest({
    patientName: 'Demo patient',
    bloodGroup: 'O+',
    componentType: 'platelets',
    city: 'Mumbai',
    hospital: 'City Care Hospital',
    units: 2,
    contactPhone: '919876543210',
    neededBy: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    urgency: 'critical',
    requestType: 'emergency',
    coordinates: { lat: 19.076, lng: 72.8777 },
  });
  requests.push(request);
  res.status(201).json({ request: emergencyResponse(request), donor });
});

app.put('/api/requests/:id', (req, res) => {
  const request = requests.find((item) => item._id === req.params.id);
  if (!request) return res.status(404).json({ error: 'not found' });

  Object.assign(request, req.body, { updatedAt: now() });
  res.json(isEmergencyRequest(request) ? emergencyResponse(request) : request);
});

if (require.main === module) {
  const PORT = process.env.PORT || 5001;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`server running on port ${PORT} with in-memory storage`);
  });
}

module.exports = app;