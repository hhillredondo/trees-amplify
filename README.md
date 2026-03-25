# Trees (Amplify + React)

Family tree frontend built with React 19, Vite 7, TanStack Router/Query, Tailwind CSS 4, and AWS Amplify.

## Development

```
yarn install
yarn dev
```

## Tests

```
yarn test          # single run
yarn test:watch    # watch mode
yarn test:coverage # with coverage
```

## Lint

```
yarn lint
```

## Build

```
yarn build
```

## CI/CD

- **`.github/workflows/test.yml`** — Runs lint + tests + build on every PR and push to `main`/`master`.
- **`amplify.yml`** — Amplify Hosting pipeline; runs lint + tests before building for deploy.

### Branch protection (manual setup)

Enable these rules on `main`/`master` in GitHub repo Settings > Branches:

1. **Require status checks to pass before merging** — select the `test` workflow job.
2. **Require branches to be up to date before merging**.
