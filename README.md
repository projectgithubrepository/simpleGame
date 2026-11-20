# Simple Game — Neon Dodge

A mobile-friendly HTML5 arcade game built with vanilla JavaScript. No install, build step, paid service, or external asset required.

## Play locally
Open `index.html` in a local static server, or run:
```bash
npx serve .
``

## Controls
- Desktop: **← / →** or **A / D**
- Mobile: hold the left/right buttons, or touch the left/right side of the playfield
- Sound: toggle with the music-note button

## Tests
Requires Node.js 22 or newer:
```bash
npm test
``

GitHub Actions runs the automated tests on pushes and pull requests to `main`.

## Publishing and monetization
This first build contains no ads and makes no revenue by itself. The repository is private, so public hosting and portal submission are separate next steps. Ad monetization must be added through the SDK and approval process of each distribution platform (for example CrazyGames or GameDistribution). Do not add third-party ad tags to a portal build unless that portal explicitly permits them.

## Next milestones
1. Validate gameplay on real mobile devices.
2. Publish a public demo using a free hosting option.
3. Add platform-specific SDK integration behind a small adapter.
4. Submit the game to HTML5 portals.
5. Add privacy/consent handling and analytics before production monetization.
