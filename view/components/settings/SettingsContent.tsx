'use client';

import { GeneralSettingsContent } from './GeneralSettingsContent';
import { NotificationsSettingsContent } from './NotificationsSettingsContent';
import { TeamsSettingsContent } from './TeamsSettingsContent';
import { DomainsSettingsContent } from './DomainsSettingsContent';
import { FeatureFlagsSettingsContent } from './FeatureFlagsSettingsContent';
import { KeyboardShortcutsSettingsContent } from './KeyboardShortcutsSettingsContent';
import { NetworkSettingsContent } from './NetworkSettingsContent';
import { TerminalSettingsContent } from './TerminalSettingsContent';
import { ContainerSettingsContent } from './ContainerSettingsContent';
import { TroubleshootingSettingsContent } from './TroubleshootingSettingsContent';
import { useSettingsCategories } from '@/hooks/use-settings-categories';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { useTranslation } from '@/hooks/use-translation';
import { cn } from '@/lib/utils';

interface SettingsContentProps {
  activeCategory: string;
  isMobile?: boolean;
  onCategoryChange?: (category: string) => void;
}

export function SettingsContent({
  activeCategory,
  isMobile = false,
  onCategoryChange
}: SettingsContentProps) {
  const { t } = useTranslation();
  const categories = useSettingsCategories();
  const visibleCategories = categories.filter((cat) => cat.visible !== false);
  const activeCategoryData = visibleCategories.find((cat) => cat.id === activeCategory);

  const accountCategories = visibleCategories.filter((cat) => cat.scope === 'account');
  const orgCategories = visibleCategories.filter((cat) => cat.scope === 'organization');

  const handleCategoryChange = (value: string) => {
    if (onCategoryChange) {
      onCategoryChange(value);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {isMobile && (
        <div className="p-4 border-b bg-background">
          {activeCategoryData && (
            <Select value={activeCategory} onValueChange={handleCategoryChange}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {accountCategories.length > 0 && (
                  <SelectGroup>
                    <SelectLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {t('settings.sidebar.account')}
                    </SelectLabel>
                    {accountCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
                {accountCategories.length > 0 && orgCategories.length > 0 && <SelectSeparator />}
                {orgCategories.length > 0 && (
                  <SelectGroup>
                    <SelectLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {t('settings.sidebar.organization')}
                    </SelectLabel>
                    {orgCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
              </SelectContent>
            </Select>
          )}
        </div>
      )}
      <div className={cn('flex-1 flex flex-col overflow-hidden', isMobile ? 'p-4' : 'p-6')}>
        {activeCategory === 'general' && <GeneralSettingsContent />}
        {activeCategory === 'notifications' && <NotificationsSettingsContent />}
        {activeCategory === 'teams' && <TeamsSettingsContent />}
        {activeCategory === 'domains' && <DomainsSettingsContent />}
        {activeCategory === 'feature-flags' && <FeatureFlagsSettingsContent />}
        {activeCategory === 'keyboard-shortcuts' && <KeyboardShortcutsSettingsContent />}
        {activeCategory === 'network' && <NetworkSettingsContent />}
        {activeCategory === 'terminal' && <TerminalSettingsContent />}
        {activeCategory === 'container' && <ContainerSettingsContent />}
        {activeCategory === 'troubleshooting' && <TroubleshootingSettingsContent />}
      </div>
    </div>
  );
}
