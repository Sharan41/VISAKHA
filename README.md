# Visakha Constructions & Architects — website

Static website (plain HTML/CSS/JS, no build step).

Pages: `index.html` (Home), `services.html`, `projects.html`, `project-detail.html`, `connect.html`.
`dc-lite.js` is a tiny runtime shared by all pages. Images are in `assets/`.

## Host on Render
1. Render dashboard -> New -> **Static Site** -> connect this repo.
2. Build command: leave empty. Publish directory: `.`
3. Deploy. (A `render.yaml` blueprint is included.)

## Note
The enquiry / careers / supplier forms are front-end only for now; they need a backend or form service to deliver submissions.
