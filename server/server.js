const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Temporary development storage. Data resets whenever the server restarts.
const donors = [];
const requests = [];

const createId = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const now = () => new Date().toISOString();
const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const asDate = (value) => {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
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
  allowCall: Boolean(data.allowCall),
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
  status: 'open',
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
  res.status(201).json(request);
});

app.put('/api/requests/:id', (req, res) => {
  const request = requests.find((item) => item._id === req.params.id);
  if (!request) return res.status(404).json({ error: 'not found' });

  Object.assign(request, req.body, { updatedAt: now() });
  res.json(request);
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`server running on port ${PORT} with in-memory storage`);
});