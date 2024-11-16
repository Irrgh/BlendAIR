# BlendAIR
Blender inspired 3D Rendering Web SPA.

# Installation

After cloning the project:

```
npm install
npm run bundle
npm run server
```

The current state of the project will be available on http://127.0.0.1:8080 and is automatically recompiled on file change.





# Features
- loader for triangulated `.obj` models
- interactive 3d viewport:
    - view based translation of selected objects
    - camera: panning, zoom, orbit


# Todo
- [] (WIP) implement render graphs to reduce manual configuration when creating render passes.
- [] (WIP) setup github actions to automatically build the demo site on commit to main branch.
- [] complete a raytracing pipeline to use actual geometry.
- [] implement a proper material system.
- [] use WASM and WebWorkers in performance critical parts:
    - construction of acceleration structures
    - preparation of render data
    - material compilation
    - asset loaders
- [] improve and add a lot of UI elements.
