# Deployment

Live site:

https://baditaflorin.github.io/physics-experiment-recorder/

Repository:

https://github.com/baditaflorin/physics-experiment-recorder

## Publish

GitHub Pages serves the `main` branch from `/docs`.

```sh
npm install
npm run build
git add docs package.json package-lock.json
git commit -m "chore: publish pages build"
git push
```

## Rollback

Revert the commit that changed `docs/`, then push `main`.

## Custom Domain

No custom domain is configured. If one is added, commit `docs/CNAME` and point
DNS to GitHub Pages according to:

https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site

## Pages Notes

GitHub Pages does not use `_headers` or `_redirects`. The build copies
`index.html` to `404.html` for SPA fallback. The service worker scope and Vite
base path are both `/physics-experiment-recorder/`.
