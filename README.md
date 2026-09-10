# Trees

The web frontend for a shared family tree. You create a tree, add people and the
relationships between them, and invite others to view or edit it. Editing is
locked to one person at a time so two people cannot overwrite each other, and
each tree has its own access list.

React and Vite, with TanStack Router and Query, Tailwind for styling, and AWS
Amplify for sign-in and the tree list. The graph itself lives behind a separate
Flask API, in the `flask-tree-endpoints` repo.

## Running it locally

You need Node 20 or newer and Yarn.

```bash
yarn install
yarn dev
```

The app comes up on http://localhost:5173.

Amplify's generated config (`amplify_outputs.json`) is gitignored, since it only
exists once you have deployed a backend. Without it Vite quietly falls back to
`amplify_outputs.stub.json`, so a fresh clone builds and the UI renders. Sign-in
will not work against the stub. To point at a real backend, deploy one with
`npx ampx sandbox`, which writes the real `amplify_outputs.json` for you.

By default the app talks to the Flask API at `http://localhost:5000` in
development. If yours is somewhere else, set it in `.env.local`:

```
VITE_FLASK_API_URL=http://localhost:5000
```

## Tests

```bash
yarn test
```
