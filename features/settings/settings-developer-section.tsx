import { Link } from 'expo-router';

import { SettingsSection } from '@/features/settings/settings-section';
import { SettingsColors } from '@/features/settings/settings-theme';
import { GlideButton } from '@/shared/legacy/ui/glide-button';

export function SettingsDeveloperSection() {
  if (!__DEV__) {
    return null;
  }

  return (
    <SettingsSection
      accentColor={SettingsColors.purple}
      accentTextColor={SettingsColors.white}
      badge="DEV"
      description="表示や操作を試すための開発用メニューです。"
      title="開発者向け"
    >
      <Link asChild href="../experiment-lab">
        <GlideButton
          accessibilityLabel="UI実験室を開く"
          caption="EXPO UI PLAYGROUND"
          icon={{ ios: 'flask.fill', android: 'science', web: 'science' }}
          label="UI実験室を開く"
          size="medium"
          tone="violet"
        />
      </Link>
    </SettingsSection>
  );
}
