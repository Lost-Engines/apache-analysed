# Maintaining the showcase

The deployed tree is **only `dist/`**, built from `public/`, the selected HTML/CSS/JS sources and `content/story.md`. Never publish the research workspace or a game installation.

## Refreshing viewer data

```sh
npm run import -- ../apache-reverse/analysis
npm run build
npm run check
```

The importer has an explicit list of display files and data directories. It minifies JSON, selects cockpit images by their metadata, imports seven named terrain files per zone and two palette versions. The model gallery and atlas share one model collection. `content/data-provenance.json` records original paths and SHA-256 hashes. Only the 104 pose sequences accepted by the supplied editor are offered in this exhibit.

The imported viewer modules are preserved except for public-facing CSS and HTML adaptations in the importer. The simpler pose UI is maintained here. Recheck the page templates and browser interactions after importing changes. Source notes for article claims are listed in `content/research-sources.md`.

## Checks and screenshots

`npm run check` verifies page links and anchors, duplicate IDs, image text, dataset dependencies and publication file types. It rejects raw binaries, archives, unexpected directories, symlinks and download controls.

`node scripts/browser-check.mjs` runs the interactive smoke checks against `npm run serve`. It needs Playwright and Chromium; set `PLAYWRIGHT_MODULE` to the installed Playwright module and `CHROMIUM` to its executable if they are not installed locally. Screenshots made for verification go to ignored `work/`. `scripts/capture-exhibits.mjs` and `scripts/capture-social.mjs` regenerate the selected illustrations from the local site. They use the same browser environment variables. Build again afterwards to include the new images. Selected exhibit captures under `public/images` are used by the home page and article.

## Publishing

Pushes to `master` run the Pages workflow, which builds, checks and uploads **`dist/` only**. Pull requests build and check without deploying. GitHub repository Settings → Pages must use GitHub Actions. All runners use `ubuntu-latest`.

No game binaries, install media, raw archives, ROMs or validation caches belong in this repository or the Pages artifact. Links to research files outside the exhibits should point to their GitHub locations.
