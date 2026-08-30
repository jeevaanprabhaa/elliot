// d:\blood-donation\client\src\components\RequestBoard.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { FiAlertTriangle, FiCheck, FiCheckCircle, FiClock, FiDroplet, FiPhone, FiTarget, FiUsers, FiX } from "react-icons/fi";

const API_URL = import.meta.env.VITE_API_URL || "";
const bloodGroups = ["A+","A-","B+","B-","AB+","AB-","O+","O-"];
const componentTypes = [
  { value: "whole_blood", label: "Whole blood" },
  { value: "platelets", label: "Platelets" },
];

function RequestBoard() {
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState({ city: "", bloodGroup: "", status: "open" });
  const [form, setForm] = useState({ patientName: "", bloodGroup: "A+", componentType: "whole_blood", urgency: "routine", city: "", hospital: "", units: 1, contactPhone: "", neededBy: "", notes: "" });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");
  const [matchingRequest, setMatchingRequest] = useState(null);
  const [matches, setMatches] = useState([]);
  const [matching, setMatching] = useState(false);
  const [matchError, setMatchError] = useState("");

  const fetchRequests = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(`${API_URL}/api/requests`, { params: filter });
      setRequests(res.data);
    } catch (e) {
      setError(e?.response?.data?.error || e.message || "Failed to load requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRequests(); }, [filter]);

  const topCities = Object.entries(requests.reduce((acc, r) => { if (r.city) acc[r.city] = (acc[r.city] || 0) + 1; return acc; }, {}))
    .sort((a,b)=>b[1]-a[1]).slice(0,6).map(([name])=>name);

  const formatComponent = (componentType) => componentType === "platelets" ? "Platelets" : "Whole blood";

  const timeLeft = (neededBy) => {
    const now = new Date();
    const by = new Date(neededBy);
    const diff = by.getTime() - now.getTime();
    const days = Math.floor(diff / (1000*60*60*24));
    const hours = Math.floor((diff % (1000*60*60*24)) / (1000*60*60));
    return diff <= 0 ? "Past due" : `${days}d ${hours}h`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setToast("");
    try {
      const payload = { ...form, contactPhone: String(form.contactPhone).replace(/\D/g, "") };
      const response = await axios.post(`${API_URL}/api/requests`, payload);
      setToast("Request posted");
      setForm({ patientName: "", bloodGroup: "A+", componentType: "whole_blood", urgency: "routine", city: "", hospital: "", units: 1, contactPhone: "", neededBy: "", notes: "" });
      fetchRequests();
      findDonors(response.data);
      setTimeout(() => setToast(""), 1500);
    } catch (e) {
      setToast(e?.response?.data?.error || e.message || "Failed to post request");
      setTimeout(() => setToast(""), 2000);
    } finally {
      setSubmitting(false);
    }
  };

  const findDonors = async (request) => {
    if (!request?._id) return;
    setMatchingRequest(request);
    setMatches([]);
    setMatchError("");
    setMatching(true);
    try {
      const response = await axios.get(`${API_URL}/api/requests/${request._id}/matches`);
      setMatches(response.data.matches || []);
    } catch (matchRequestError) {
      setMatchError(matchRequestError?.response?.data?.error || matchRequestError.message || "Failed to find matching donors");
    } finally {
      setMatching(false);
    }
  };

  const markFulfilled = async (id) => {
    try {
      const res = await axios.put(`${API_URL}/api/requests/${id}`, { status: "fulfilled" });
      setRequests((prev) => prev.map((r) => r._id === res.data._id ? res.data : r));
    } catch (e) {
      setToast("Failed to update request");
      setTimeout(() => setToast(""), 1500);
    }
  };

  const final = [...requests].sort((a, b) => new Date(a.neededBy) - new Date(b.neededBy));

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-rose-100 p-6 pt-24">
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-8">
        <div className="bg-white rounded-3xl shadow-lg border border-rose-200 p-6 space-y-4">
          <div>
            <h2 className="text-2xl font-bold text-rose-700">Hospital emergency request</h2>
            <p className="text-sm text-zinc-500 mt-1">Post a need and Elliott will find the best donors from the existing database.</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input className="border rounded-2xl px-4 py-3 w-full" placeholder="Patient name" value={form.patientName} onChange={(e)=>setForm({...form, patientName:e.target.value})} />
            <div className="flex gap-2">
              <select className="border rounded-2xl px-4 py-3" value={form.bloodGroup} onChange={(e)=>setForm({...form,bloodGroup:e.target.value})}>
                {bloodGroups.map(g => <option key={g}>{g}</option>)}
              </select>
              <select className="border rounded-2xl px-4 py-3 flex-1" value={form.componentType} onChange={(e)=>setForm({...form,componentType:e.target.value})}>
                {componentTypes.map((component) => <option key={component.value} value={component.value}>{component.label}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <input className="border rounded-2xl px-4 py-3 flex-1" placeholder="City" value={form.city} onChange={(e)=>setForm({...form, city:e.target.value})} />
              <select className="border rounded-2xl px-4 py-3" value={form.urgency} onChange={(e)=>setForm({...form,urgency:e.target.value})}>
                <option value="routine">Routine</option>
                <option value="urgent">Urgent</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div className="flex gap-2">
              <input className="border rounded-2xl px-4 py-3 flex-1" placeholder="Hospital" value={form.hospital} onChange={(e)=>setForm({...form, hospital:e.target.value})} />
              <input type="number" min="1" className="border rounded-2xl px-4 py-3 w-28" placeholder="Units" value={form.units} onChange={(e)=>setForm({...form, units:Number(e.target.value)})} />
            </div>
            <div className="flex gap-2">
              <input className="border rounded-2xl px-4 py-3 flex-1" placeholder="Contact phone" value={form.contactPhone} onChange={(e)=>setForm({...form, contactPhone:e.target.value})} />
              <input type="datetime-local" className="border rounded-2xl px-4 py-3" value={form.neededBy} onChange={(e)=>setForm({...form, neededBy:e.target.value})} />
            </div>
            <input className="border rounded-2xl px-4 py-3 w-full" placeholder="Notes (optional)" value={form.notes} onChange={(e)=>setForm({...form, notes:e.target.value})} />
            {toast && <div className="px-4 py-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700">{toast}</div>}
            <button type="submit" disabled={submitting} className={`w-full px-5 py-3 rounded-2xl bg-red-600 text-white font-semibold shadow-lg transition ${submitting ? 'opacity-60 cursor-not-allowed' : 'hover:bg-red-700 hover:scale-[1.01]'}`}>
              {submitting ? 'Posting…' : 'Post Request'}
            </button>
          </form>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-3xl shadow-lg border border-rose-200 p-6 space-y-3">
            <h2 className="text-2xl font-bold text-rose-700">Urgent Requests</h2>
            <div className="flex flex-wrap gap-2">
              {bloodGroups.map((g) => (
                <button key={g} onClick={()=>setFilter({ ...filter, bloodGroup: g })} className={`px-3 py-1 rounded-full border text-sm ${filter.bloodGroup===g? 'bg-rose-600 text-white border-rose-600':'bg-rose-50 text-rose-700 border-rose-200'}`}>{g}</button>
              ))}
              {topCities.map((c) => (
                <button key={c} onClick={()=>setFilter({ ...filter, city: c })} className={`px-3 py-1 rounded-full border text-sm ${filter.city.toLowerCase()===c.toLowerCase()? 'bg-emerald-600 text-white border-emerald-600':'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>{c}</button>
              ))}
              <button onClick={()=>setFilter({ city:"", bloodGroup:"", status: "open" })} className="px-3 py-1 rounded-full border text-sm bg-zinc-50 text-zinc-700 border-zinc-200">Reset</button>
              <div className="ml-auto flex items-center gap-2 text-sm">
                <label>Status</label>
                <select className="border rounded-2xl px-3 py-1" value={filter.status} onChange={(e)=>setFilter({ ...filter, status: e.target.value })}>
                  <option value="open">Open</option>
                  <option value="fulfilled">Fulfilled</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-lg border border-rose-200 p-6">
            {error && <div className="px-4 py-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700">{error}</div>}
            {loading ? (
              <div className="space-y-3">{[...Array(4)].map((_,i)=>(<div key={i} className="p-5 border rounded-2xl animate-pulse bg-zinc-50" />))}</div>
            ) : requests.length === 0 ? (
              <p className="text-zinc-500 text-sm">No requests found.</p>
            ) : (
              [...requests].sort((a,b)=>new Date(a.neededBy)-new Date(b.neededBy)).map((r) => (
                <div key={r._id} className="group p-5 border rounded-3xl bg-white shadow-sm hover:shadow-xl transition hover:border-rose-300 mb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FiDroplet className="w-5 h-5 text-red-600" />
                      <div className="font-semibold text-lg text-rose-800">{r.bloodGroup}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full border text-xs bg-amber-100 text-amber-700 border-amber-200 flex items-center gap-1">
                      <FiClock className="w-4 h-4" /> {timeLeft(r.neededBy)}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                    <span className="px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 border border-zinc-200">{r.city}</span>
                    {r.hospital && <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">{r.hospital}</span>}
                    <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200">{formatComponent(r.componentType)}</span>
                    {r.units ? <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200">{r.units} unit(s)</span> : null}
                    {r.urgency && r.urgency !== "routine" && <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-200">{r.urgency}</span>}
                  </div>
                  <div className="mt-2 text-sm text-zinc-700">Patient: {r.patientName}</div>
                  {r.notes && <div className="text-xs text-zinc-500 mt-1">Notes: {r.notes}</div>}
                  <div className="mt-3 flex items-center gap-2">
                    <a href={`tel:${r.contactPhone}`} className="px-3 py-2 rounded-2xl bg-red-500 text-white hover:bg-red-600 text-sm flex items-center gap-2"><FiPhone className="w-4 h-4" /> Call</a>
                    {r.status === "open" ? (
                      <>
                        <button onClick={()=>findDonors(r)} className="px-3 py-2 rounded-2xl bg-rose-600 text-white hover:bg-rose-700 text-sm flex items-center gap-2">
                          <FiUsers className="w-4 h-4" /> Find Donors
                        </button>
                        <button onClick={()=>markFulfilled(r._id)} className="px-3 py-2 rounded-2xl bg-emerald-100 text-emerald-700 border border-emerald-200 text-sm flex items-center gap-2">
                          <FiCheckCircle className="w-4 h-4" /> Mark Fulfilled
                        </button>
                      </>
                    ) : (
                      <span className="px-3 py-2 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-sm flex items-center gap-2">
                        <FiCheckCircle className="w-4 h-4" /> Fulfilled
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {matchingRequest && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm p-4 flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="donor-matches-title">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden">
            <div className="p-6 border-b border-rose-100 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-rose-600 text-sm font-semibold uppercase tracking-wide">
                  <FiTarget /> Elliott Smart Donor Matching
                </div>
                <h2 id="donor-matches-title" className="text-2xl font-bold text-slate-900 mt-1">
                  Best donors for {matchingRequest.bloodGroup} {formatComponent(matchingRequest.componentType)}
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  {matchingRequest.hospital || "Hospital request"} · {matchingRequest.city} · {matchingRequest.units || 1} unit(s)
                </p>
              </div>
              <button onClick={() => setMatchingRequest(null)} className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center" aria-label="Close donor matches">
                <FiX />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(92vh-124px)]">
              <div className="rounded-2xl bg-rose-50 border border-rose-100 p-4 flex items-start gap-3 mb-5">
                <FiAlertTriangle className="text-rose-600 mt-0.5 shrink-0" />
                <div className="text-sm text-rose-800">
                  <strong>Ranked from the existing donor database.</strong>
                  <span className="block text-rose-700 mt-0.5">Match Score weights compatibility, donation eligibility, distance, availability, and previous response reliability.</span>
                </div>
              </div>

              {matching ? (
                <div className="py-16 text-center text-slate-500">
                  <FiUsers className="mx-auto text-rose-500 w-8 h-8 animate-pulse mb-3" />
                  Finding eligible donors…
                </div>
              ) : matchError ? (
                <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-red-700">{matchError}</div>
              ) : matches.length === 0 ? (
                <div className="py-12 text-center border border-dashed border-slate-300 rounded-2xl">
                  <FiUsers className="mx-auto text-slate-400 w-8 h-8 mb-3" />
                  <h3 className="font-semibold text-slate-700">No compatible, eligible donors found</h3>
                  <p className="text-sm text-slate-500 mt-1">Try widening the request time or adding more donors to the existing database.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {matches.map((match) => (
                    <div key={match.donor._id} className="border border-slate-200 rounded-2xl p-5 hover:border-rose-300 hover:shadow-md transition">
                      <div className="flex flex-col lg:flex-row lg:items-start gap-5">
                        <div className="flex items-start gap-3 min-w-0 lg:w-56">
                          <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 font-bold flex items-center justify-center shrink-0">#{match.rank}</div>
                          <div className="min-w-0">
                            <h3 className="font-bold text-slate-900 truncate">{match.donor.name || "Unnamed donor"}</h3>
                            <p className="text-sm text-slate-500">{match.donor.bloodGroup} · {match.donor.city || "Location unknown"}</p>
                            <div className="mt-2 flex items-center gap-2">
                              <span className="text-xs uppercase tracking-wide text-slate-500">Match Score</span>
                              <strong className="text-lg text-rose-600">{match.matchScore}/100</strong>
                            </div>
                          </div>
                        </div>

                        <div className="flex-1 grid sm:grid-cols-2 lg:grid-cols-5 gap-2">
                          {match.reasons.map((reason) => (
                            <div key={reason.key} className={`rounded-xl px-3 py-2 border ${reason.passed ? "bg-emerald-50 border-emerald-200" : "bg-amber-50 border-amber-200"}`} title={reason.detail}>
                              <div className={`flex items-center gap-1.5 text-sm font-semibold ${reason.passed ? "text-emerald-700" : "text-amber-700"}`}>
                                {reason.passed ? <FiCheck /> : <span aria-hidden="true">•</span>} {reason.label}
                              </div>
                              <p className={`text-[11px] mt-1 leading-snug ${reason.passed ? "text-emerald-700/80" : "text-amber-700/80"}`}>{reason.detail}</p>
                            </div>
                          ))}
                        </div>

                        <div className="flex lg:flex-col items-center lg:items-stretch gap-2 lg:w-28">
                          {match.donor.allowCall && match.donor.phone ? (
                            <a href={`tel:${match.donor.phone}`} className="px-3 py-2 rounded-xl bg-rose-600 text-white hover:bg-rose-700 text-sm flex items-center justify-center gap-2">
                              <FiPhone /> Call
                            </a>
                          ) : (
                            <span className="px-3 py-2 rounded-xl bg-slate-100 text-slate-500 text-xs text-center">Contact restricted</span>
                          )}
                          <span className="text-xs text-center text-slate-500">{match.reliability.label} reliability</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RequestBoard;