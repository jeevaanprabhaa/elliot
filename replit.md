# Elliot on Replit

## Development setup

This project uses a Vite React client and an Express server. The Replit preview
workflow serves the client on port 5000 and proxies `/api` requests to the
Express server on port 5001.

The current server uses temporary in-memory storage. No MongoDB connection is
needed while the app is being edited; donors and blood requests reset whenever
the server restarts. A persistent database should be added before production
use.

To run the two services manually:

```bash
npm --prefix server start
npm --prefix client run dev
```

## Emergency donation demo

Open `/emergency` (also available from the **Emergency** navigation link or
the Hospital AI page) to run the shared emergency request flow. **Try demo
scenario** creates a sample O+ platelet request and an eligible donor in the
current prototype store. The hospital view can match and alert the donor; use
the Donor dashboard tab to accept, start the simulated journey, and mark
arrival. The hospital view then starts and completes the donation.

Emergency lifecycle state is stored on the backend request and synchronized
between the two views by polling. The prototype uses simulated ETA/location
only; it does not collect continuous real-world location.

## Vercel deployment

The repository includes `vercel.json` and `api/index.js` for a combined Vercel
deployment. Configure the Vercel project with:

- Root Directory: `.`
- Install Command: `npm run vercel-install`
- Build Command: `npm run vercel-build`
- Output Directory: `client/dist`
- Node.js: `20.x`

`VITE_API_URL` can remain unset because the deployed client uses same-origin
`/api` requests. From the repository root, the CLI flow is:

```bash
npm install --global vercel
vercel login
vercel link
vercel --prod
```

The current API uses in-memory storage, which is not durable across Vercel
serverless instances. Add persistent storage before production use.