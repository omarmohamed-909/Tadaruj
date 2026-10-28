# Tadaruj API

The Express API runs locally with `npm run dev` and as a production process with `npm start`. Use Node 22 and a dedicated MongoDB replica set for enrollment transactions.

Vercel project `tadaruj-api` builds this `server/` directory and imports the default application handler from `index.js`. Its public endpoint is [tadaruj-api.vercel.app](https://tadaruj-api.vercel.app/health/live).

The project is connected to `omarmohamed-909/Tadaruj`, with `main` as its production branch. Private service settings are backend environment secrets on Vercel. The frontend receives only public configuration.

See [DEPLOYMENT.md](../DEPLOYMENT.md) for configuration, health probes, the explicitly restricted demo email mode, and manual release commands; [TESTING.md](../TESTING.md) describes the isolated database and browser checks.
