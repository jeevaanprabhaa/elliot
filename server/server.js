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
  city: String(data.city || '').trim(),
  hospital: String(data.hospital || '').trim(),
  units: Number(data.units) > 0 ? Number(data.units) : 1,
  contactPhone: String(data.contactPhone || '').replace(/\D/g, ''),
  neededBy: asDate(data.neededBy),
  notes: data.notes || '',
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