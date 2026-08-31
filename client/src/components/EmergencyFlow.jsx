import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
  FiAlertTriangle,
  FiArrowRight,
  FiCheck,
  FiCheckCircle,
  FiClock,
  FiDroplet,
  FiMapPin,
  FiRefreshCw,
  FiShield,
  FiTruck,
  FiUser,
  FiUsers,
  FiX,
} from "react-icons/fi";

const API_URL = import.meta.env.VITE_API_URL || "";
const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const componentTypes = [
  { value: "whole_blood", label: "Whole blood" },
  { value: "platelets", label: "Platelets" },
];
const emergencySteps = [
  "CREATED",
  "DONOR_MATCHED",
  "DONOR_ACCEPTED",
  "DONOR_TRAVELLING",
  "DONOR_ARRIVED",
  "DONATION_IN_PROGRESS",
  "COMPLETED",
];
const stepLabels = {
  CREATED: "Request created",
  DONOR_MATCHED: "Donor matched",
  DONOR_ACCEPTED: "Donor accepted",
  DONOR_TRAVELLING: "Donor travelling",
  DONOR_ARRIVED: "Donor arrived",
  DONATION_IN_PROGRESS: "Donation",
  COMPLETED: "Completed",
};

const futureDateInput = () => {
  const date = new Date(Date.now() + 2 * 60 * 60 * 1000);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60 * 1000).toISOString().slice(0, 16);
};

const formatComponent = (componentType) =>
  componentType === "platelets" ? "Platelets" : "Whole blood";

const formatDistance = (distance) =>
  distance === null || distance === undefined ? "Location pending" : `${distance} km`;

const formatStatus = (status) =>
  status === "CANCELLED" ? "Request cancelled" : stepLabels[status] || status;

function Timeline({ status }) {
  const activeIndex = emergencySteps.indexOf(status);
  return (
    <div className="grid gap-3 sm:grid-cols-7" aria-label="Emergency request progress">
      {emergencySteps.map((step, index) => {
        const complete = activeIndex >= 0 && index < activeIndex;
        const active = step === status;
        return (
          <div key={step} className="relative">
            {index < emergencySteps.length - 1 && (
              <span className={`absolute left-7 right-[-12px] top-3 hidden h-0.5 sm:block ${complete ? "bg-rose-500" : "bg-slate-200"}`} />
            )}
            <div className="relative flex items-center gap-2 sm:block">
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold ${
                complete ? "border-rose-500 bg-rose-500 text-white" :
                  active ? "border-rose-500 bg-white text-rose-600" :
                    "border-slate-200 bg-white text-slate-400"
              }`}>
                {complete ? <FiCheck /> : index + 1}
              </span>
              <span className={`mt-2 block text-xs font-semibold sm:pr-2 ${active ? "text-rose-700" : complete ? "text-slate-700" : "text-slate-400"}`}>
                {stepLabels[step]}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StatusPill({ status }) {
  const isDanger = status === "CANCELLED";
  const isComplete = status === "COMPLETED";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${
      isDanger ? "bg-slate-100 text-slate-600" :
        isComplete ? "bg-emerald-100 text-emerald-700" :
          "bg-rose-100 text-rose-700"
    }`}>
      {isComplete ? <FiCheckCircle /> : <FiDroplet />}
      {formatStatus(status)}
    </span>
  );
}

function EmergencyFlow() {
  const navigate = useNavigate();
  const [role, setRole] = useState("hospital");
  const [form, setForm] = useState({
    patientName: "Demo patient",
    bloodGroup: "O+",
    componentType: "platelets",
    units: 2,
    urgency: "critical",
    city: "Mumbai",
    hospital: "City Care Hospital",
    contactPhone: "",
    neededBy: futureDateInput(),
    notes: "",
  });
  const [request, setRequest] = useState(null);
  const [matches, setMatches] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [donorId, setDonorId] = useState("");
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const status = request?.emergencyStatus || "CREATED";
  const matchedDonor = request?.matchedDonor || selectedMatch?.donor;
  const donorIsAssigned = donorId && request?.matchedDonorId === donorId;
  const canSendAlert = selectedMatch && ["CREATED", "SEARCHING", "DONOR_MATCHED"].includes(status);
  const displayMatches = useMemo(() => matches.slice(0, 5), [matches]);

  const showError = (requestError, fallback) => {
    setError(requestError?.response?.data?.error || requestError.message || fallback);
  };

  const loadMatches = async (nextRequest) => {
    if (!nextRequest?._id) return [];
    const response = await axios.get(`${API_URL}/api/requests/${nextRequest._id}/matches`);
    const nextMatches = response.data.matches || [];
    setMatches(nextMatches);
    setSelectedMatch((current) => current || nextMatches[0] || null);
    if (!donorId && nextMatches[0]?.donor?._id) setDonorId(nextMatches[0].donor._id);
    return nextMatches;
  };

  const createRequest = async (event) => {
    event.preventDefault();
    setWorking(true);
    setError("");
    setNotice("");
    try {
      const response = await axios.post(`${API_URL}/api/requests`, {
        ...form,
        requestType: "emergency",
        contactPhone: String(form.contactPhone || "9999999999").replace(/\D/g, ""),
        units: Number(form.units) || 1,
      });
      setRequest(response.data);
      const nextMatches = await loadMatches(response.data);
      setNotice(nextMatches.length ? "Elliott found compatible donors. Review the best match below." : "The request is live, but no available donor matched yet.");
    } catch (requestError) {
      showError(requestError, "Unable to create emergency request");
    } finally {
      setWorking(false);
    }
  };

  const loadDemo = async () => {
    setWorking(true);
    setError("");
    setNotice("");
    try {
      const response = await axios.post(`${API_URL}/api/demo/emergency`);
      setRequest(response.data.request);
      setDonorId(response.data.donor._id);
      setRole("hospital");
      const nextMatches = await loadMatches(response.data.request);
      setSelectedMatch(nextMatches.find((match) => match.donor._id === response.data.donor._id) || nextMatches[0] || null);
      setNotice("Demo scenario loaded. Send the alert, then switch to Donor view to continue.");
    } catch (requestError) {
      showError(requestError, "Unable to load the demo scenario");
    } finally {
      setWorking(false);
    }
  };

  const sendEmergencyAlert = async () => {
    if (!request?._id || !selectedMatch?.donor?._id) return;
    setWorking(true);
    setError("");
    try {
      const matchResponse = await axios.post(`${API_URL}/api/requests/${request._id}/emergency/match`, {
        donorId: selectedMatch.donor._id,
      });
      const alertResponse = await axios.post(`${API_URL}/api/requests/${request._id}/emergency/alert`);
      setRequest(alertResponse.data);
      setSelectedMatch(matchResponse.data.match);
      setDonorId(matchResponse.data.match.donor._id);
      setNotice("Emergency alert sent instantly to the matched donor dashboard.");
    } catch (requestError) {
      showError(requestError, "Unable to send emergency alert");
    } finally {
      setWorking(false);
    }
  };

  const respondToAlert = async (action) => {
    if (!request?._id || !donorId) return;
    setWorking(true);
    setError("");
    try {
      const response = await axios.post(`${API_URL}/api/requests/${request._id}/emergency/respond`, {
        donorId,
        action,
      });
      setRequest(response.data);
      setNotice(action === "accept" ? "You accepted the emergency request. Start the simulated journey when ready." : "The emergency request was declined.");
    } catch (requestError) {
      showError(requestError, "Unable to respond to this alert");
    } finally {
      setWorking(false);
    }
  };

  const advanceRequest = async (action) => {
    if (!request?._id) return;
    setWorking(true);
    setError("");
    try {
      const response = await axios.post(`${API_URL}/api/requests/${request._id}/emergency/status`, {
        action,
        donorId: action === "start_journey" || action === "arrived" ? donorId : undefined,
      });
      setRequest(response.data);
      setNotice(action === "complete" ? "Donation completed. Request fulfilled and donor history updated." : "");
    } catch (requestError) {
      showError(requestError, "Unable to update the emergency request");
    } finally {
      setWorking(false);
    }
  };

  useEffect(() => {
    if (!request?._id || ["COMPLETED", "CANCELLED"].includes(status)) return undefined;
    const interval = setInterval(async () => {
      try {
        const response = await axios.get(`${API_URL}/api/requests/${request._id}`);
        setRequest(response.data);
      } catch {
        // The current view remains usable during a transient polling failure.
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [request?._id, status]);

  useEffect(() => {
    if (!request?._id || !donorId || role !== "donor") return undefined;
    const interval = setInterval(async () => {
      try {
        const response = await axios.get(`${API_URL}/api/donors/${donorId}/emergency-alerts`);
        const current = response.data.find((item) => item._id === request._id);
        if (current) setRequest(current);
      } catch {
        // Polling is only demo synchronization; the last known state stays visible.
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [request?._id, donorId, role]);

  const renderHospitalActions = () => {
    if (!request) return null;
    if (status === "DONOR_ARRIVED") {
      return (
        <button onClick={() => advanceRequest("start_donation")} disabled={working} className="inline-flex items-center justify-center gap-2 rounded-full bg-rose-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-rose-200 hover:bg-rose-700 disabled:opacity-60">
          <FiDroplet /> Start donation
        </button>
      );
    }
    if (status === "DONATION_IN_PROGRESS") {
      return (
        <button onClick={() => advanceRequest("complete")} disabled={working} className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-200 hover:bg-emerald-700 disabled:opacity-60">
          <FiCheckCircle /> Complete donation
        </button>
      );
    }
    return null;
  };

  const renderDonorActions = () => {
    if (!request?.alertSentAt || !donorIsAssigned) {
      return (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <FiShield className="mx-auto h-10 w-10 text-slate-300" />
          <h3 className="mt-3 text-lg font-bold text-slate-800">No emergency alert yet</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
            When a hospital sends an alert, it will appear here instantly. Use the hospital view to start the demo flow.
          </p>
          <button onClick={() => setRole("hospital")} className="mt-5 rounded-full border border-rose-200 px-4 py-2 text-sm font-bold text-rose-700 hover:bg-rose-50">
            Open hospital view
          </button>
        </div>
      );
    }

    if (status === "DONOR_MATCHED") {
      return (
        <div className="rounded-3xl border border-rose-200 bg-white p-6 shadow-xl shadow-rose-100/60">
          <div className="flex items-start gap-3">
            <span className="rounded-2xl bg-rose-100 p-3 text-rose-600"><FiAlertTriangle /></span>
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[.16em] text-rose-600">Emergency blood request</p>
              <h2 className="mt-2 text-2xl font-extrabold text-slate-900">{request.bloodGroup} {formatComponent(request.componentType)} needed</h2>
              <p className="mt-2 text-sm text-slate-500">{request.hospital} · {formatDistance(request.distanceKm)} · {request.units} unit(s)</p>
            </div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-rose-50 p-4"><small className="text-xs text-rose-600">Urgency</small><strong className="mt-1 block capitalize text-slate-800">{request.urgency}</strong></div>
            <div className="rounded-2xl bg-slate-50 p-4"><small className="text-xs text-slate-500">ETA after accepting</small><strong className="mt-1 block text-slate-800">{request.etaMinutes || 18} min</strong></div>
            <div className="rounded-2xl bg-slate-50 p-4"><small className="text-xs text-slate-500">Required at</small><strong className="mt-1 block text-slate-800">{new Date(request.neededBy).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</strong></div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <button onClick={() => respondToAlert("accept")} disabled={working} className="inline-flex items-center gap-2 rounded-full bg-rose-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-rose-200 hover:bg-rose-700 disabled:opacity-60"><FiCheck /> Accept</button>
            <button onClick={() => respondToAlert("decline")} disabled={working} className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-60"><FiX /> Decline</button>
          </div>
        </div>
      );
    }

    if (status === "DONOR_ACCEPTED") {
      return (
        <ActionCard icon={<FiCheck />} title="Donation request accepted" detail={`${request.hospital} · ${formatDistance(request.distanceKm)} · ETA ${request.etaMinutes || 18} min`}>
          <button onClick={() => advanceRequest("start_journey")} disabled={working} className="rounded-full bg-rose-600 px-5 py-3 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-60">Start journey <FiArrowRight className="ml-1 inline" /></button>
        </ActionCard>
      );
    }
    if (status === "DONOR_TRAVELLING") {
      return (
        <ActionCard icon={<FiTruck />} title="You are on the way" detail={`Simulated live tracking · ${request.hospital} · ETA ${request.etaMinutes || 18} min`}>
          <button onClick={() => advanceRequest("arrived")} disabled={working} className="rounded-full bg-rose-600 px-5 py-3 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-60">I've arrived</button>
        </ActionCard>
      );
    }
    if (status === "DONOR_ARRIVED") return <ActionCard icon={<FiMapPin />} title="Arrived at hospital" detail="The hospital has been notified that the matched donor has arrived." />;
    if (status === "DONATION_IN_PROGRESS") return <ActionCard icon={<FiDroplet />} title="Donation in progress" detail="Donor arrived ✓ · Eligibility verified ✓ · Donation started ●" />;
    if (status === "COMPLETED") return <SuccessCard request={request} />;
    if (status === "CANCELLED") return <ActionCard icon={<FiX />} title="Request closed" detail="This alert is no longer active." />;
    return null;
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#fffafa] via-white to-[#f5eef4] px-4 pb-16 pt-28 text-slate-800 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[.18em] text-rose-600"><FiDroplet /> Elliott emergency response</div>
            <h1 className="mt-3 max-w-3xl font-['Manrope'] text-4xl font-extrabold tracking-[-.06em] text-slate-900 sm:text-6xl">Predict → match → donate.</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-500">A shared, Rapido-style emergency blood flow for hospitals and donors. This prototype uses simulated ETA and polling, never continuous real-world location tracking.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={loadDemo} disabled={working} className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-700 disabled:opacity-60"><FiRefreshCw /> Try demo scenario</button>
            <button onClick={() => navigate("/hospital-dashboard")} className="rounded-full border border-rose-200 bg-white px-4 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-50">Back to Elliott AI</button>
          </div>
        </header>

        <div className="mt-8 flex w-fit rounded-full border border-rose-100 bg-white p-1 shadow-sm">
          <button onClick={() => setRole("hospital")} className={`rounded-full px-5 py-2 text-sm font-bold ${role === "hospital" ? "bg-rose-600 text-white" : "text-slate-500 hover:text-rose-700"}`}>Hospital view</button>
          <button onClick={() => setRole("donor")} className={`rounded-full px-5 py-2 text-sm font-bold ${role === "donor" ? "bg-rose-600 text-white" : "text-slate-500 hover:text-rose-700"}`}>Donor dashboard</button>
        </div>

        {error && <div className="mt-5 flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"><FiAlertTriangle /> {error}</div>}
        {notice && <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div>}

        {role === "hospital" ? (
          <div className="mt-6 grid gap-6 lg:grid-cols-[.82fr_1.18fr]">
            {!request ? (
              <form onSubmit={createRequest} className="rounded-3xl border border-rose-100 bg-white p-6 shadow-xl shadow-rose-100/40 lg:col-span-2">
                <div className="mb-6 flex items-start gap-3">
                  <span className="rounded-2xl bg-rose-100 p-3 text-rose-600"><FiAlertTriangle /></span>
                  <div><h2 className="text-2xl font-extrabold text-slate-900">Emergency Blood Request</h2><p className="mt-1 text-sm text-slate-500">Tell Elliott what the hospital needs. It will search the existing donor database.</p></div>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <Field label="Blood group"><select value={form.bloodGroup} onChange={(event) => setForm({ ...form, bloodGroup: event.target.value })} className="field">{bloodGroups.map((group) => <option key={group}>{group}</option>)}</select></Field>
                  <Field label="Blood component"><select value={form.componentType} onChange={(event) => setForm({ ...form, componentType: event.target.value })} className="field">{componentTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></Field>
                  <Field label="Units required"><input type="number" min="1" value={form.units} onChange={(event) => setForm({ ...form, units: event.target.value })} className="field" /></Field>
                  <Field label="Urgency"><select value={form.urgency} onChange={(event) => setForm({ ...form, urgency: event.target.value })} className="field"><option value="critical">Critical</option><option value="urgent">Urgent</option><option value="routine">Routine</option></select></Field>
                  <Field label="Hospital location"><input required value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} placeholder="City" className="field" /></Field>
                  <Field label="Required time"><input required type="datetime-local" value={form.neededBy} onChange={(event) => setForm({ ...form, neededBy: event.target.value })} className="field" /></Field>
                  <Field label="Hospital name"><input required value={form.hospital} onChange={(event) => setForm({ ...form, hospital: event.target.value })} className="field" /></Field>
                  <Field label="Patient name"><input required value={form.patientName} onChange={(event) => setForm({ ...form, patientName: event.target.value })} className="field" /></Field>
                  <Field label="Contact phone"><input value={form.contactPhone} onChange={(event) => setForm({ ...form, contactPhone: event.target.value })} placeholder="Optional in demo" className="field" /></Field>
                </div>
                <button type="submit" disabled={working} className="mt-6 inline-flex items-center gap-2 rounded-full bg-rose-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-rose-200 hover:bg-rose-700 disabled:opacity-60">{working ? "Finding donors…" : "Find donor"} <FiArrowRight /></button>
              </form>
            ) : (
              <>
                <section className="space-y-6">
                  <div className="rounded-3xl border border-rose-100 bg-white p-6 shadow-xl shadow-rose-100/40">
                    <div className="flex items-start justify-between gap-3"><div><span className="text-xs font-extrabold uppercase tracking-[.16em] text-rose-600">Hospital command center</span><h2 className="mt-2 text-2xl font-extrabold text-slate-900">{request.bloodGroup} {formatComponent(request.componentType)}</h2></div><StatusPill status={status} /></div>
                    <div className="mt-5 grid grid-cols-2 gap-3 text-sm"><Metric label="Units" value={request.units} /><Metric label="Urgency" value={request.urgency} /><Metric label="Hospital" value={request.hospital} /><Metric label="ETA" value={request.etaMinutes ? `${request.etaMinutes} min` : "Pending"} /></div>
                    <div className="mt-5 flex items-center gap-2 text-xs text-slate-500"><FiClock /> Required {new Date(request.neededBy).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</div>
                  </div>
                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><div className="mb-5 flex items-center justify-between"><h3 className="font-extrabold text-slate-900">Request tracking</h3><span className="text-xs font-semibold text-slate-400">#{request._id.slice(-8)}</span></div><Timeline status={status} /></div>
                  {matchedDonor && <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5"><div className="flex items-start gap-3"><span className="rounded-xl bg-white p-2.5 text-emerald-600"><FiUser /></span><div><strong className="text-emerald-800">Matched donor: {matchedDonor.name}</strong><p className="mt-1 text-sm text-emerald-700">{matchedDonor.bloodGroup} · {formatDistance(request.distanceKm)} · {status === "DONOR_ARRIVED" ? "Matched donor has arrived." : status === "DONOR_TRAVELLING" ? `On the way · ETA ${request.etaMinutes || 18} min` : "Donor status is synchronized live."}</p></div></div>{renderHospitalActions() && <div className="mt-4">{renderHospitalActions()}</div>}</div>}
                  {status === "COMPLETED" && <SuccessCard request={request} />}
                </section>
                <section className="space-y-6">
                  {["CREATED", "SEARCHING", "DONOR_MATCHED"].includes(status) && (
                    <div className="rounded-3xl border border-rose-100 bg-white p-6 shadow-xl shadow-rose-100/40">
                      <div className="flex items-start justify-between gap-3"><div><span className="text-xs font-extrabold uppercase tracking-[.16em] text-rose-600">Elliott match radar</span><h2 className="mt-2 text-2xl font-extrabold text-slate-900">Best available donors</h2></div><FiUsers className="text-rose-500" /></div>
                      {displayMatches.length === 0 ? <div className="mt-6 rounded-2xl bg-slate-50 p-5 text-sm text-slate-500">No compatible, eligible, and available donors found. Register more donors, then refresh matches.</div> : <div className="mt-5 space-y-3">{displayMatches.map((match) => <button type="button" key={match.donor._id} onClick={() => setSelectedMatch(match)} className={`w-full rounded-2xl border p-4 text-left transition ${selectedMatch?.donor?._id === match.donor._id ? "border-rose-400 bg-rose-50 shadow-sm" : "border-slate-200 hover:border-rose-200"}`}><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100 font-bold text-rose-700">#{match.rank}</span><span className="min-w-0 flex-1"><strong className="block truncate text-slate-900">{match.donor.name}</strong><small className="text-slate-500">{match.donor.bloodGroup} · {match.donor.city}</small></span><strong className="text-lg text-rose-600">{match.matchScore}%</strong></div><div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500"><span>{formatDistance(match.distanceKm)}</span><span>·</span><span className="text-emerald-700">{match.eligibility.eligibleNow ? "Eligible" : "Not eligible"}</span><span>·</span><span className="text-emerald-700">{match.availability.label}</span></div></button>)}</div>}
                      <button onClick={sendEmergencyAlert} disabled={!canSendAlert || working} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-rose-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-rose-200 hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"><FiAlertTriangle /> Send emergency alert</button>
                    </div>
                  )}
                  {status === "DONOR_ACCEPTED" && <ActionCard icon={<FiCheck />} title="Donor accepted" detail={`${matchedDonor?.name || "Matched donor"} is ready to travel. Waiting for the donor to start the journey.`} />}
                  {status === "DONOR_TRAVELLING" && <ActionCard icon={<FiTruck />} title="Donor is travelling" detail={`Simulated live tracking · ETA ${request.etaMinutes || 18} minutes · ${formatDistance(request.distanceKm)}`} />}
                  {status === "DONOR_ARRIVED" && <ActionCard icon={<FiMapPin />} title="Matched donor has arrived" detail="Verify eligibility, then start the donation." />}
                  {status === "DONATION_IN_PROGRESS" && <ActionCard icon={<FiDroplet />} title="Donation in progress" detail="Donor arrived ✓ · Eligibility verified ✓ · Donation started ●" />}
                  <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800"><div className="flex items-start gap-3"><FiShield className="mt-0.5 shrink-0" /><span><strong>Simulated live tracking.</strong> ETA and journey states are shared through the backend for this prototype; no continuous real-world location is collected.</span></div></div>
                </section>
              </>
            )}
          </div>
        ) : (
          <div className="mt-6 max-w-3xl">
            <div className="mb-5 flex items-center gap-2 text-xs font-extrabold uppercase tracking-[.16em] text-rose-600"><FiUser /> Donor dashboard · instant alerts</div>
            {renderDonorActions()}
            {request && <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><div className="mb-5 flex items-center justify-between"><h3 className="font-extrabold text-slate-900">Your request timeline</h3><StatusPill status={status} /></div><Timeline status={status} /></div>}
          </div>
        )}
      </div>
    </main>
  );
}

function Field({ label, children }) {
  return <label className="block text-sm font-semibold text-slate-700"><span className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">{label}</span>{children}</label>;
}

function Metric({ label, value }) {
  return <div className="rounded-2xl bg-slate-50 p-3"><small className="block text-xs text-slate-400">{label}</small><strong className="mt-1 block truncate text-sm capitalize text-slate-800">{value}</strong></div>;
}

function ActionCard({ icon, title, detail, children }) {
  return <div className="rounded-3xl border border-rose-100 bg-white p-6 shadow-xl shadow-rose-100/40"><div className="flex items-start gap-3"><span className="rounded-2xl bg-rose-100 p-3 text-rose-600">{icon}</span><div><h2 className="text-xl font-extrabold text-slate-900">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{detail}</p></div></div>{children && <div className="mt-5">{children}</div>}</div>;
}

function SuccessCard({ request }) {
  return <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6"><div className="flex items-start gap-3"><span className="rounded-2xl bg-white p-3 text-emerald-600"><FiCheckCircle /></span><div><span className="text-xs font-extrabold uppercase tracking-[.16em] text-emerald-700">Donation completed</span><h2 className="mt-2 text-2xl font-extrabold text-emerald-900">Thank you for helping save lives.</h2><p className="mt-2 text-sm text-emerald-700">{request.hospital} · {request.bloodGroup} {formatComponent(request.componentType)} · {request.units} unit(s)</p><strong className="mt-3 block text-sm text-emerald-800">Request fulfilled ✓ · Donor history updated ✓ · Hospital inventory updated ✓</strong></div></div></div>;
}

export default EmergencyFlow;