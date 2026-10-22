"use client";

import { useState, useTransition } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { saveUserPreferences } from "@/lib/actions/account-settings";
import {
  COMMON_TIMEZONES,
  SETTINGS_LANGUAGES,
  isValidTimeZone,
} from "@/lib/settings/preferences";
import { useSettingsCenter } from "./settings-center-context";
import {
  SettingsButton,
  SettingsCard,
  SettingsField,
  SettingsPageHeader,
  SettingsStatus,
  settingsInputClass,
} from "./settings-ui";

export function SettingsLanguageForm({
  language,
  timezone,
  preferredCurrency,
}: {
  language: string;
  timezone: string;
  preferredCurrency: string;
}) {
  const { menuButton } = useSettingsCenter();
  const [nextLanguage, setNextLanguage] = useState(language || "en");
  const [nextTimezone, setNextTimezone] = useState(timezone || "UTC");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const timezoneOptions = COMMON_TIMEZONES.includes(nextTimezone as (typeof COMMON_TIMEZONES)[number])
    ? COMMON_TIMEZONES
    : ([nextTimezone, ...COMMON_TIMEZONES] as string[]);

  return (
    <div>
      <SettingsPageHeader
        title="Language & Region"
        description="Choose the languages Jimvio actually translates and the timezone stored on your profile."
        menuButton={menuButton}
      />

      <SettingsCard title="Preferences" description="These values are saved to your profile and, for English, French, and Kinyarwanda, to UGC locale.">
        <div className="space-y-4">
          <SettingsField label="Language" htmlFor="settings-language">
            <select
              id="settings-language"
              className={settingsInputClass}
              value={nextLanguage}
              onChange={(event) => setNextLanguage(event.target.value)}
            >
              {SETTINGS_LANGUAGES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label} — {item.note}
                </option>
              ))}
            </select>
          </SettingsField>

          <SettingsField
            label="Timezone"
            htmlFor="settings-timezone"
            hint="Used for quiet hours, dates, and account records."
          >
            <select
              id="settings-timezone"
              className={settingsInputClass}
              value={nextTimezone}
              onChange={(event) => setNextTimezone(event.target.value)}
            >
              {timezoneOptions.map((zone) => (
                <option key={zone} value={zone}>
                  {zone}
                </option>
              ))}
            </select>
          </SettingsField>

          <SettingsField
            label="Currency"
            htmlFor="settings-currency"
            hint="Checkout and marketplace prices currently display in USD."
          >
            <input
              id="settings-currency"
              className={settingsInputClass}
              value={preferredCurrency || "USD"}
              disabled
              readOnly
            />
          </SettingsField>

          {error ? <SettingsStatus tone="error">{error}</SettingsStatus> : null}

          <SettingsButton
            loading={pending}
            onClick={() => {
              setError(null);
              if (!isValidTimeZone(nextTimezone)) {
                setError("Choose a valid timezone.");
                return;
              }
              startTransition(async () => {
                const result = await saveUserPreferences({
                  language: nextLanguage,
                  timezone: nextTimezone,
                  preferred_currency: "USD",
                });
                if (!result.success) {
                  setError(result.error || "Could not save preferences");
                  toast.error(result.error || "Could not save preferences");
                  return;
                }
                toast.success("Language and region saved");
              });
            }}
          >
            <Save className="h-4 w-4" />
            Save preferences
          </SettingsButton>
        </div>
      </SettingsCard>
    </div>
  );
}
