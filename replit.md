# BloodConnect on Replit

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