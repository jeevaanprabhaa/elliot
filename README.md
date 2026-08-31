
<!--
  Elliot - README
  Enhanced for Winter of Code Social 2025: banner, badges, setup clarity, contributor focus.
-->

# 🩸 Elliot

A full-stack Blood Donation and Request Management System built with Express, React, and Node.
This project is part of **Winter of Code Social 2025**, promoting open-source collaboration for social good.

---

<div align="center">
  <!-- Red banner -->
  <img src="https://img.shields.io/badge/MERN-Elliot-%23d62828?style=for-the-badge&logo=appveyor" alt="Elliot Banner" />

  <br>

  <!-- Tech badges -->
  <p>
    <img src="https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB" alt="React" />
    <img src="https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white" alt="Node.js" />
    <img src="https://img.shields.io/badge/Express-000000?style=flat&logo=express&logoColor=white" alt="Express" />
    <img src="https://img.shields.io/badge/MongoDB-47A248?style=flat&logo=mongodb&logoColor=white" alt="MongoDB" />
    <img src="https://img.shields.io/badge/Tailwind-CB3837?style=flat&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
    <img src="https://img.shields.io/badge/Vite-646CFF?style=flat&logo=vite&logoColor=white" alt="Vite" />
  </p>

  <p><strong>A community-driven platform to connect blood donors and recipients — saving lives through open source.</strong></p>
</div>

---

## 🌍 About the Project

**Elliot** is a social good project designed to make blood donation more accessible, transparent, and efficient.
By connecting **donors** and **recipients** in real time, the platform helps bridge the gap between blood demand and availability.

This project was initiated as part of **Winter of Code Social 2025**, with the aim of using technology to serve society.  
It provides a practical solution to one of the most critical healthcare challenges — timely access to blood donors.

---

## 🔧 Core Features

- 🩸 **Register as a donor** — share your blood group, contact, and city  
- 🔍 **Search for donors** by **name, phone number, city, or blood group**  
- 🧾 **Request blood** and reach out directly to available donors  
- 🤝 **Connect safely and securely** using verified profiles  
- 📱 **Responsive user interface** for all screen sizes  
- ⚙️ **Lightweight backend** built with Node.js and Express

---

## 💡 Motivation

Every year, thousands of people struggle to find blood donors in emergencies.  
**Elliot** aims to solve this by building a digital bridge between **donors and recipients**, reducing search time and increasing the reach of blood donation drives.

This project aligns with the **Winter of Code Social** mission — *using open source to create real social impact*.

---

## 🧰 Tech Stack

### Frontend ⚛️
- React (Vite)
- Tailwind CSS

### Backend 🧩
- Node.js & Express.js
- MongoDB (Mongoose)
- REST APIs for donor and request management

---

## 🚀 Quick Start

### Prerequisites 🧾
- Node.js (v20+ recommended)
- Git

---

### Clone the Repository ⤵️

```bash
git clone https://github.com/darshan-totagi/blood-donation.git
cd blood-donation
````

---

### Install Dependencies

**Server**

```bash
cd server
npm install
```

**Client**

```bash
cd ../client
npm install
```

---

### Development Storage

The current development backend uses temporary in-memory storage, so no MongoDB
connection or secret is required. Donors and blood requests reset whenever the
server restarts. Add a persistent database before using this app in production.

---

### Run in Development 🧑‍💻

Use two terminals:

```bash
# Terminal 1 - server
cd server
npm start
```

```bash
# Terminal 2 - client
cd client
npm run dev
```

---

### 🌐 Where It Runs

* **Frontend (React + Vite)** runs on 👉 [http://localhost:5000](http://localhost:5000).
* **Backend (Express + Node.js)** runs on 👉 [http://localhost:5001](http://localhost:5001).

> The Vite development server proxies `/api` requests to the backend.

---

## ▲ Deploy Elliot on Vercel

This repository is configured as one Vercel project. The React/Vite client is
built from `client/`, and the existing Express API is exposed through the
serverless entry point at `api/index.js`.

### Vercel dashboard settings

When importing `jeevaanprabhaa/elliot` into Vercel, use:

| Setting | Value |
| --- | --- |
| Root Directory | `.` |
| Framework Preset | `Vite` (or `Other`) |
| Install Command | `npm run vercel-install` |
| Build Command | `npm run vercel-build` |
| Output Directory | `client/dist` |
| Node.js Version | `20.x` |

No `VITE_API_URL` value is required for the combined deployment. The client
uses same-origin `/api` requests, and `vercel.json` routes those requests to
the Express function.

### Vercel CLI

```bash
npm install --global vercel
vercel login
vercel link
vercel --prod
```

Run these commands from the repository root. The production build command is:

```bash
npm run vercel-build
```

The matching dependency install command is:

```bash
npm run vercel-install
```

### Production storage note

The imported app currently uses temporary in-memory storage. This works for
the prototype API, but Vercel serverless instances are not a durable database:
donors, requests, and emergency lifecycle state can reset or differ between
instances. Connect persistent storage before using Elliot with real donor or
hospital records.

---

## 🧠 Future Enhancements

* 📍 Integrate Google Maps for nearby donor search
* 📬 Email/SMS notifications for urgent blood requests
* 🩺 Donation history and eligibility tracking
* 🧾 Role-based access for hospitals and organizations
* 💬 Chat interface for direct communication between donors and recipients

---

## 🤝 Contributing

We welcome contributions from everyone!
To contribute:

1. 🍴 Fork the repository
2. 🌿 Create a new branch (`feature/your-feature-name`)
3. 🧪 Make your changes and test locally
4. 💌 Open a Pull Request with a clear description

For **Winter of Code Social**, please follow the project’s contribution guidelines and mention your assigned issue or mentor in the PR.

---

## 📄 License

<div align="center">
  <strong>MIT License</strong>

  <p>This project is licensed under the MIT License. See the <code>LICENSE</code> file for details.</p>
</div>

---

## 💬 Support

<div align="center">
  <p>If you find this project helpful, please ⭐ star the repository to show your support.</p>
  <p>For quick discussions or collaboration, open an issue and tag the maintainers.</p>
</div>

---

Maintainers: Assigned under Winter of Code Social 2025 — please coordinate via GitHub issues. 🧑‍🔧

```

