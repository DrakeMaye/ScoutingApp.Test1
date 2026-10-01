# Scoutboard

A season adaptable scouting app foundation for FRC. The scouting workflow is driven by `public/game-config.json`, so a new season can change the event label, phases, and fields without rewriting the application.

## Run locally

```sh
npm install
npm run dev
```

## Configure a game

Edit `public/game-config.json`:

- Set `season` and `event`.
- Add or rename entries in `phases`.
- Define fields with `number`, `text`, `counter`, `boolean`, or `select` types.
- Each field's `id` is its stable key in saved records.

Scouting records are saved in the browser on the current device. Use Export data to download a JSON backup. The app currently starts with a practice event and sample fields; match schedules, team lists, and shared sync can be added as later modules.
