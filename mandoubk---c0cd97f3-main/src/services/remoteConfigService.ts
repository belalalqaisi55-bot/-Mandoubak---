import { getRemoteConfig, fetchAndActivate, getValue } from "firebase/remote-config";
import { app, isFirebaseConfigured } from "../firebase";

export type OnboardingFlowType = "new_design" | "standard";

/**
 * Service to fetch and manage Firebase Remote Config values
 * Supports A/B testing onboarding flows and dynamic feature toggling
 */
export async function fetchOnboardingFlow(): Promise<OnboardingFlowType> {
  // Check if user manually tested or forced a variant in localStorage (for quick testing/preview)
  const manualOverride = localStorage.getItem("mandoubak_override_onboarding");
  if (manualOverride === "new_design" || manualOverride === "standard") {
    return manualOverride;
  }

  if (!isFirebaseConfigured || !app) {
    return "standard";
  }

  try {
    const remoteConfig = getRemoteConfig(app);

    // In dev / preview set minimumFetchInterval to 0 for instant changes; in production 1 hour
    remoteConfig.settings.minimumFetchIntervalMillis = 0;
    remoteConfig.defaultConfig = {
      onboarding_flow: "standard"
    };

    // Fetch and activate values from Firebase Remote Config server
    await fetchAndActivate(remoteConfig);
    const flowValue = getValue(remoteConfig, "onboarding_flow").asString();

    return flowValue === "new_design" ? "new_design" : "standard";
  } catch (err) {
    console.warn("Firebase Remote Config note: using standard onboarding fallback.", err);
    return "standard";
  }
}

/**
 * Allows manual override during testing (e.g. from developer switcher)
 */
export function setManualOnboardingOverride(variant: OnboardingFlowType | "auto") {
  if (variant === "auto") {
    localStorage.removeItem("mandoubak_override_onboarding");
  } else {
    localStorage.setItem("mandoubak_override_onboarding", variant);
  }
}
