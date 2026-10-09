Live Site-https://focusmirror.netlify.app/
# FocusMirror

AI-powered focus tracking, study techniques, brain training and a shared leaderboard — all in the browser.

```
focusmirror/
├── index.html          markup
├── css/styles.css      all styling
├── js/
│   ├── config.js       ← Supabase URL + anon key
│   ├── app.js          background, routing, XP, camera tracking, techniques
│   ├── braingym.js     hand-tracked finger exercises
│   ├── games.js        Relax Bar (Sudoku, Memory Match)
│   ├── landing.js      landing-page helpers
│   ├── auth.js         Supabase sign in / sign up
│   └── sync.js         cloud sync + real leaderboard
├── schema.sql          run this in Supabase once
└── serve.py            local dev server
```

---
