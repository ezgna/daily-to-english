# Presentation build

`build-deck.mjs` generates the final PowerPoint file from the tracked content,
SVG sources, and local screenshot assets. It rasterizes every `assets/src/*.svg`
file with `rsvg-convert` before composing the deck.

## Inputs kept in Git

- `deck-content.mjs`: slide copy and speaker notes
- `content-plan.txt`: narrative plan
- `source-notes.txt`: source record
- `../assets/src/*.svg`: editable visual sources
- `build-deck.mjs`: presentation generator

## Local-only inputs and outputs

- `../assets/*.png`: screenshots and rasterized visual assets
- `output/`: rendered slides, layouts, montage, and inspection data
- `../Just-Speak-It-Final-Presentation.pptx`: generated presentation

## Build

Initialize this directory with the presentation runtime, then run the build:

```sh
PRESENTATIONS_SKILL_DIR=/absolute/path/to/presentations/skill
node "$PRESENTATIONS_SKILL_DIR/container_tools/setup_artifact_tool_workspace.mjs" \
  --workspace "$(pwd)/docs/final-presentation/build"
npm --prefix docs/final-presentation/build run build
```

The build requires `rsvg-convert` (provided by Homebrew's `librsvg` package).
Missing screenshot PNGs are represented by the generator's placeholder cards.

The PowerPoint file is written to `docs/final-presentation/`, and QA artifacts
are written to `docs/final-presentation/build/output/`.
