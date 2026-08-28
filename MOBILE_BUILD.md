# Building the ATBU AttenScan Android App

The web app has been wrapped with **Capacitor**, so you can build a real
installable **Android APK** from this same codebase.

---

## 1. Install these on your PC (one-time)

| Tool | Why | Download |
|---|---|---|
| **Node.js 20+** | Runs the build | https://nodejs.org |
| **Bun** (recommended) or npm | Package manager | https://bun.sh |
| **Git** | Pull the project from GitHub | https://git-scm.com |
| **Java JDK 17** | Required by Android Gradle | https://adoptium.net |
| **Android Studio** (Hedgehog+) | Compiles the APK, provides SDK & emulator | https://developer.android.com/studio |

After installing Android Studio, open it once and let it install:
- Android SDK Platform 34 (or latest)
- Android SDK Build-Tools
- Android Emulator (optional, for testing without a phone)

Set the `ANDROID_HOME` environment variable to your SDK path
(usually `C:\Users\<you>\AppData\Local\Android\Sdk` on Windows,
`~/Library/Android/sdk` on macOS).

---

## 2. Get the code

1. In Lovable, click **GitHub → Connect** and push the project.
2. On your PC:
   ```bash
   git clone https://github.com/<you>/atten-scan-magic.git
   cd atten-scan-magic
   bun install
   ```

---

## 3. Add the Android platform (one-time)

```bash
bunx cap add android
```

This creates an `android/` folder — the real native Android project.

---

## 4. Build & sync

Every time you pull new changes from Lovable:

```bash
bun run build          # builds the web app into dist/
bunx cap sync android  # copies dist/ into the Android project
```

---

## 5. Open in Android Studio & build the APK

```bash
bunx cap open android
```

In Android Studio:
1. Wait for Gradle sync to finish.
2. Menu **Build → Build Bundle(s) / APK(s) → Build APK(s)**.
3. When done, click **locate** — you get `app-debug.apk`.
4. Transfer to your phone and install (enable "Install unknown apps").

For a signed release APK for Play Store:
**Build → Generate Signed Bundle / APK → APK → Release**.

---

## 6. Permissions already declared

Capacitor plugins used:
- `@capacitor/geolocation` — 50 m GPS check
- `@capacitor/camera` — QR scanning
- `@capacitor/device` — unique device ID (proxy prevention)
- `@capacitor/app`, `@capacitor/status-bar`, `@capacitor/splash-screen`

Android will prompt the user for **Location** and **Camera** the first time.

---

## 7. Live-reload during development (optional)

Uncomment the `server.url` block in `capacitor.config.ts` and point it at
your Lovable preview URL. Then `bunx cap sync android` and reinstall. The
APK now loads the live Lovable preview — every code change on Lovable
shows instantly on the phone.

For production builds, keep that block commented so the app runs offline
from the bundled `dist/`.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `SDK location not found` | Set `ANDROID_HOME` env var |
| `JAVA_HOME` errors | Install JDK 17 and set `JAVA_HOME` |
| White screen after install | Run `bun run build && bunx cap sync android` again |
| Camera/GPS not working | Uninstall & reinstall to re-prompt permissions |
