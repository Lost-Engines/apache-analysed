# Apache Analysed

[Explore the site](https://lost-engines.github.io/apache-analysed/) · [Read the investigation](https://lost-engines.github.io/apache-analysed/story/)

A look inside Digital Integration's Apache Longbow, with interactive models, a mission atlas, cockpit panoramas, working artwork and the animation figure recovered from MANEDIT. Part of [Lost Engines](https://lostengines.com/).

To play the reconstructed game, see [Apache C++](https://github.com/Lost-Engines/apache-cpp) or the enhanced [Apache Redux](https://github.com/Lost-Engines/apache-redux).

## Build locally

Requires Node.js 22 or later.

```sh
npm ci
npm run build
npm run check
npm run serve
```

Open http://127.0.0.1:4173/apache-analysed/ . The site builds from the checked-in display snapshot; it does not need the research repository or game installation.

See [MAINTAINING.md](MAINTAINING.md) for imports, checks and deployment, and [RIGHTS.md](RIGHTS.md) for credits.
