import { useEffect, useState } from "react";
import axios from "axios";
import { useLocation, useNavigate } from "react-router-dom";
import {
  FaArrowRight,
  FaCheckCircle,
  FaHeart,
  FaQuoteLeft,
  FaShieldAlt,
  FaTint,
  FaUsers,
} from "react-icons/fa";

const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const API_URL = `${(import.meta as any).env?.VITE_API_URL || ""}/api/donors`;

const stories = [
  {
    quote: "A few minutes of my time became someone else's second chance.",
    name: "Asha Patel",
    role: "Regular donor",
  },
  {
    quote: "Finding a nearby donor felt simple when every second mattered.",
    name: "Rohit Verma",
    role: "Community member",
  },
  {
    quote: "BloodConnect makes helping feel personal, safe, and immediate.",
    name: "Sana Khan",
    role: "Volunteer",
  },
];

function LandingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!location.hash) return;
    const id = location.hash.replace("#", "");
    const element = document.getElementById(id);
    if (element) {
      setTimeout(() => element.scrollIntoView({ behavior: "smooth" }), 160);
    }
  }, [location]);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const res = await axios.get<Array<{ bloodGroup?: string | null }>>(API_URL);
        const nextCounts = bloodGroups.reduce((acc, group) => {
          acc[group] = (res.data || []).filter((donor) => donor.bloodGroup === group).length;
          return acc;
        }, {} as Record<string, number>);
        setCounts(nextCounts);
      } catch (error) {
        console.error("Failed to fetch donor counts:", error);
      }
    };
    fetchCounts();
  }, []);

  const goToSection = (section: string) => {
    navigate(`/#${section}`);
  };

  return (
    <main className="bc-page overflow-hidden">
      <section className="bc-hero relative">
        <div className="bc-orb bc-orb-one" />
        <div className="bc-orb bc-orb-two" />
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 pb-16 pt-28 lg:grid-cols-[0.92fr_1.08fr] lg:px-10 lg:pb-24 lg:pt-36">
          <div className="relative z-10 max-w-xl">
            <div className="bc-eyebrow mb-6">
              <span className="bc-eyebrow-dot" />
              Community-powered care
            </div>
            <h1 className="bc-display">
              Your blood has the{" "}
              <span className="bc-display-highlight">power</span> to paint a
              smile on someone else's <span className="bc-display-highlight">face.</span>
            </h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-slate-600 md:text-lg">
              One donation can help save up to three lives. Find a donor nearby,
              register to give, and turn a small act into someone&apos;s biggest
              hope.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => navigate("/register")}
                className="bc-button bc-button-primary"
              >
                Become a donor <FaArrowRight className="text-sm" />
              </button>
              <button
                onClick={() => navigate("/search")}
                className="bc-button bc-button-ghost"
              >
                Find a donor
              </button>
            </div>
            <div className="mt-8 flex items-center gap-3 text-sm text-slate-500">
              <div className="flex -space-x-2">
                {["A", "R", "S"].map((letter, index) => (
                  <span
                    key={letter}
                    className={`bc-avatar ${index === 1 ? "bc-avatar-rose" : ""} ${
                      index === 2 ? "bc-avatar-plum" : ""
                    }`}
                  >
                    {letter}
                  </span>
                ))}
              </div>
              <span>
                <strong className="text-slate-800">People like you</strong> are
                already helping their community.
              </span>
            </div>
          </div>

          <div className="relative z-10">
            <div className="bc-hero-image-wrap">
              <img
                src="https://images.unsplash.com/photo-1559757175-0eb30cd8c063?auto=format&fit=crop&w=1400&q=85"
                alt="A patient resting safely in a hospital bed"
                className="bc-hero-image"
              />
              <div className="bc-image-wash" />
              <div className="bc-image-caption">
                <span className="bc-caption-icon">
                  <FaHeart />
                </span>
                <span>
                  <strong>Every drop matters.</strong>
                  <small>Give hope a chance today.</small>
                </span>
              </div>
            </div>
            <div className="bc-hero-badge">
              <span className="bc-badge-icon">
                <FaTint />
              </span>
              <span>
                <strong>Urgent need</strong>
                <small>O+ donors nearby</small>
              </span>
              <FaArrowRight className="ml-auto text-xs text-rose-500" />
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-20 mx-auto -mt-2 max-w-7xl px-6 lg:px-10">
        <div className="bc-action-grid">
          <button className="bc-action-card" onClick={() => navigate("/register")}>
            <span className="bc-action-icon bc-action-icon-dark">
              <FaTint />
            </span>
            <span>
              <strong>Donate now</strong>
              <small>Register in a few minutes</small>
            </span>
            <FaArrowRight className="bc-action-arrow" />
          </button>
          <button className="bc-action-card" onClick={() => navigate("/search")}>
            <span className="bc-action-icon bc-action-icon-rose">
              <FaUsers />
            </span>
            <span>
              <strong>Find a donor</strong>
              <small>Search by group and city</small>
            </span>
            <FaArrowRight className="bc-action-arrow" />
          </button>
          <button className="bc-action-card" onClick={() => navigate("/requests")}>
            <span className="bc-action-icon bc-action-icon-plum">
              <FaHeart />
            </span>
            <span>
              <strong>Ask for help</strong>
              <small>Post an urgent request</small>
            </span>
            <FaArrowRight className="bc-action-arrow" />
          </button>
        </div>
      </section>

      <section className="bc-section bg-white" id="why-donate">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-10">
          <div>
            <div className="bc-section-kicker">Why it matters</div>
            <h2 className="bc-section-title">
              A little time can mean <span>everything.</span>
            </h2>
            <p className="mt-5 max-w-md leading-7 text-slate-600">
              Blood cannot be manufactured. It comes from people who choose to
              show up for one another, especially when a family needs help most.
            </p>
            <button
              onClick={() => navigate("/register")}
              className="bc-text-link mt-7"
            >
              Start your donor journey <FaArrowRight />
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="bc-feature-card bc-feature-card-tall">
              <span className="bc-feature-icon">
                <FaHeart />
              </span>
              <h3>Give with purpose</h3>
              <p>
                Your donation reaches a real person in your own community when
                they need it most.
              </p>
            </div>
            <div className="bc-feature-card bc-feature-card-soft">
              <span className="bc-feature-icon">
                <FaShieldAlt />
              </span>
              <h3>Simple and safe</h3>
              <p>
                Share only what helps recipients connect with the right donor.
              </p>
            </div>
            <div className="bc-feature-card bc-feature-card-wide sm:col-span-2">
              <span className="bc-feature-icon">
                <FaCheckCircle />
              </span>
              <div>
                <h3>Stay ready to help</h3>
                <p>
                  Keep your availability and donation history in one place, so
                  the next opportunity to help is easy to find.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bc-section bc-availability-section" id="availability">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <div className="bc-section-kicker">Our community</div>
              <h2 className="bc-section-title max-w-xl">
                Help is closer than you think.
              </h2>
              <p className="mt-4 max-w-lg leading-7 text-slate-600">
                Browse the blood groups our community is currently supporting.
                Every new donor makes the network stronger.
              </p>
            </div>
            <button
              onClick={() => navigate("/search")}
              className="bc-button bc-button-dark self-start md:self-auto"
            >
              Explore donors <FaArrowRight />
            </button>
          </div>
          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {bloodGroups.map((group) => (
              <button
                key={group}
                onClick={() => navigate(`/search?bloodGroup=${encodeURIComponent(group)}`)}
                className="bc-blood-card"
              >
                <span className="bc-blood-drop">
                  <FaTint />
                </span>
                <strong>{group}</strong>
                <small>{counts[group] || 0} listed</small>
              </button>
            ))}
          </div>
          <div className="mt-8 grid grid-cols-2 gap-4 border-t border-rose-100 pt-8 md:grid-cols-4">
            {[
              ["90+", "days between donations"],
              ["8", "blood groups supported"],
              ["200", "recent donor records"],
              ["24/7", "community availability"],
            ].map(([value, label]) => (
              <div key={label}>
                <div className="text-3xl font-bold tracking-tight text-slate-900">{value}</div>
                <div className="mt-1 text-sm text-slate-500">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bc-section bg-white" id="how-it-works">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <div className="text-center">
            <div className="bc-section-kicker justify-center">How it works</div>
            <h2 className="bc-section-title">Three steps. One meaningful act.</h2>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {[
              ["01", "Register", "Tell us a little about yourself and your blood group."],
              ["02", "Connect", "Find a nearby donor or let someone know you are ready to help."],
              ["03", "Make an impact", "Show up safely and give someone more time with the people they love."],
            ].map(([number, title, description]) => (
              <div key={number} className="bc-step-card">
                <span className="bc-step-number">{number}</span>
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bc-stories-section" id="stories">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <div className="bc-section-kicker">From the community</div>
              <h2 className="bc-section-title">Real people. Real hope.</h2>
            </div>
            <button onClick={() => goToSection("why-donate")} className="bc-text-link">
              Why donate <FaArrowRight />
            </button>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {stories.map((story) => (
              <article key={story.name} className="bc-story-card">
                <FaQuoteLeft className="text-2xl text-rose-300" />
                <p className="mt-5 text-lg leading-8 text-slate-800">“{story.quote}”</p>
                <div className="mt-7 border-t border-rose-100 pt-4">
                  <strong className="block text-sm text-slate-900">{story.name}</strong>
                  <span className="text-xs text-slate-500">{story.role}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bc-cta-section">
        <div className="bc-cta-inner">
          <div>
            <div className="bc-section-kicker text-rose-200">Your next step</div>
            <h2>Someone out there is waiting for a reason to hope.</h2>
            <p>Be that reason. Register today and make your kindness count.</p>
          </div>
          <button onClick={() => navigate("/register")} className="bc-button bc-button-light">
            Register as a donor <FaArrowRight />
          </button>
        </div>
      </section>

      <footer className="bc-footer" id="contact">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 md:grid-cols-[1.4fr_1fr_1fr] lg:px-10">
          <div>
            <div className="bc-footer-brand">
              <span className="bc-brand-mark">
                <FaHeart />
              </span>
              BloodConnect
            </div>
            <p className="mt-4 max-w-xs text-sm leading-6 text-rose-100/70">
              Connecting donors and recipients with speed, care, and trust.
            </p>
          </div>
          <div>
            <h3>Explore</h3>
            <button onClick={() => navigate("/search")}>Find donors</button>
            <button onClick={() => navigate("/requests")}>Blood requests</button>
            <button onClick={() => goToSection("how-it-works")}>How it works</button>
          </div>
          <div>
            <h3>Get in touch</h3>
            <a href="mailto:support@bloodconnect.org">support@bloodconnect.org</a>
            <a href="tel:+919876543210">+91 98765 43210</a>
            <span>Bengaluru, India</span>
          </div>
        </div>
        <div className="border-t border-white/10 py-5 text-center text-xs text-rose-100/50">
          © 2025 BloodConnect. Every drop counts.
        </div>
      </footer>
    </main>
  );
}

export default LandingPage;