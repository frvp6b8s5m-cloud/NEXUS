# NEXUS

NEXUS is a modular digital operating environment. This first implementation establishes a real web service, persistent project/module/event models, a workspace UI, builder surface, automation/AI/infrastructure layers, and a deployable Railway target.

## Run

Set DATABASE_URL to a PostgreSQL connection string for persistence, then:

npm install
npm start

Without DATABASE_URL the UI still runs, while persistence endpoints report that the database is not configured.

## Architecture

- public/ — futuristic workspace UI
- server.js — HTTP/API/event layer
- PostgreSQL — projects, modules, events, users
- future layers — authentication, realtime, workers, AI agents, media, marketplace, integrations
