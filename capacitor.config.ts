import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "ng.edu.atbu.attenscan",
  appName: "ATBU AttenScan",
  webDir: ".output/public",
  server: {
    androidScheme: "https",
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: "#0A2540",
      showSpinner: false,
    },
  },
};

export default config;