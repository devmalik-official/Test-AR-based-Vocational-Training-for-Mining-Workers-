# Industrial Fire Safety Trainer (WebAR Prototype)

This project is a mobile-first, offline-capable WebAR training simulator for industrial safety. The first module focuses on electrical equipment fire response, hazard identification, correct extinguisher selection, and safe evacuation.

## Features

- Real WebXR AR session with rear camera where supported
- Hit-test / plane detection when available
- World-space fire anchored to a selected real surface
- Electrical equipment fire scenario
- Hazard identification, extinguisher selection, and evacuation flow
- Local assessment engine with scoring and critical-error override
- Offline certificate generation with local QR-style pattern
- Service worker caching for offline-first use
- English and Hindi localization with a Santali-ready translations structure

## Local dependencies

This project uses Three.js from a local dependency install. No CDN is used for runtime rendering.

Install dependencies with:

```bash
npm install
```

## Run locally

From the project root:

```bash
python -m http.server 8080
```

Then open:

```text
http://localhost:8080
```

## Deploy on Netlify

This is a static web app and does not need Python in production. In Netlify, set the publish directory to the project root (`.`) and leave the build command empty. Netlify serves `index.html`, JavaScript, CSS, Three.js, and the service worker directly over HTTPS, which is required for camera access.

The `netlify.toml` file contains the publish setting and prevents stale `index.html` and service-worker files from being cached during updates.

The Python command above is only a local development server. If you later add Python backend logic, move it to a separate hosted API or rewrite it as a Netlify Function; Python code cannot run continuously inside the static Netlify site.

## APK camera requirements

If the Netlify URL is wrapped in an Android WebView, the native APK must:

- Declare `android.permission.CAMERA` in `AndroidManifest.xml`.
- Request camera permission at runtime on Android 6 or newer.
- Grant `RESOURCE_VIDEO_CAPTURE` from the WebView permission callback.
- Enable JavaScript, DOM storage, and media playback in the WebView.
- Load the HTTPS Netlify URL, not an HTTP local-development URL.

Basic website-to-APK converters often omit the WebView camera permission callback. In that case the app can show a black camera area even though the same URL works in Chrome. A Trusted Web Activity or a Capacitor Android wrapper with the camera permission configured is a better option. WebXR support is also browser-dependent, so the wrapper should at minimum support `getUserMedia()` for the camera fallback.

## HTTPS / camera requirements

WebXR AR requires a secure context. On a desktop browser it is usually not available. On Android devices, use Chrome or a compatible browser with WebXR AR support, ideally served over `https://` or via local secure hosting. If the device is connected to the same local network, `https` can be configured with a trusted local certificate or a reverse proxy. When testing on a phone, use a local LAN URL that the phone can reach and ensure camera permissions are enabled.

## Testing on Android

1. Connect the Android phone to the same Wi-Fi network as the development machine.
2. Start the local server on the machine.
3. Open the local LAN URL in Chrome on the phone.
4. Grant camera permission when prompted.
5. Use a compatible Android device/browser that supports WebXR AR.

## Supported browsers and devices

AR mode is available only on supported browsers/devices, typically:

- Android Chrome with WebXR AR support
- Android devices with rear camera and browser support for `immersive-ar`
- Browsers that expose `navigator.xr` and support hit-test / world tracking

If `navigator.xr` is unavailable or compatible AR is not supported, the app shows a compatibility message instead of pretending AR is active.

## Offline caching

A service worker caches the app shell and core files so the simulator continues working after the first successful visit. Local storage is used to store training history, assessment results, and generated certificate metadata.

## How the fire is anchored

The app uses the WebXR hit-test system to find a valid real-world surface. After the user confirms a placement point, the fire is positioned in world space using the detected pose. The fire remains anchored to that world position until the scenario ends, which means it stays in the same real-world location even as the camera moves.

## How extinguisher targeting works

The CO₂ extinguisher is spawned in the AR scene with a nozzle object. When the user activates the extinguisher, the engine computes:

- the nozzle world position
- the nozzle direction vector
- the fire world position
- the distance between them
- the angle/dot-product alignment

The fire loses health only when the nozzle is close enough and properly aligned within the configurable aim tolerance and range. If the aim is off, the fire does not receive effective extinguishing.

## How assessment scoring works

The local assessment engine tracks:

- hazard identification accuracy
- time to respond
- extinguisher decision
- aim accuracy
- effective spray duration
- evacuation choice
- critical errors

Scores are combined into an overall percentage. A critical error can override a high score and force a failed result, which matches the safety-training requirement.

## Package into an Android APK later

A later step can package this web application as a WebView-based Android app:

1. Create a minimal Android WebView app in Android Studio.
2. Load the static project files locally or from an asset bundle.
3. Enable camera permission and allow WebXR-capable browser access inside the WebView if supported by the chosen setup.
4. For a production wrapper, use a trusted Android APK packaging pipeline after the web app is stabilized.

This prototype is intentionally web-first and offline-first so it can later be embedded into a native Android shell without changing the training logic.

## Project structure

```text
/
├── index.html
├── manifest.json
├── service-worker.js
├── package.json
├── README.md
├── css/
│   └── styles.css
├── js/
│   ├── app.js
│   ├── ar/
│   │   ├── ARManager.js
│   │   ├── SurfaceDetector.js
│   │   └── PlacementManager.js
│   ├── scenarios/
│   │   └── FireScenario.js
│   ├── objects/
│   │   ├── Fire.js
│   │   ├── Extinguisher.js
│   │   └── SprayEffect.js
│   ├── assessment/
│   │   └── AssessmentEngine.js
│   ├── certificate/
│   │   └── CertificateGenerator.js
│   ├── localization/
│   │   └── translations.js
│   └── storage/
│       └── LocalStorageManager.js
├── data/
│   └── scenarios.js
└── node_modules/
    └── three/
```
