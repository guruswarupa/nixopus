'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { SettingsSidebar } from './SettingsSidebar';
import { useSettingsModal } from '@/hooks/use-settings-modal';
import { useSettingsCategories } from '@/hooks/use-settings-categories';
import { SettingsContent } from './SettingsContent';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent } from '@/components/ui/sheet';

export function SettingsModal() {
  const { open, closeSettings, activeCategory, setActiveCategory } = useSettingsModal();
  const categories = useSettingsCategories();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleCategoryChange = (category: string) => {
    setActiveCategory(category);
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={closeSettings}>
      <DialogContent
        className={`!max-w-[1200px] w-[90vw] max-h-[90vh] h-[90vh] p-0 flex overflow-hidden ${
          isMobile ? '!max-w-full w-full h-full max-h-full rounded-none' : ''
        }`}
      >
        <DialogTitle className="sr-only">Settings</DialogTitle>
        {isMobile ? (
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetContent side="left" className="w-[240px] p-0">
              <SettingsSidebar
                categories={categories}
                activeCategory={activeCategory}
                onCategoryChange={handleCategoryChange}
              />
            </SheetContent>
          </Sheet>
        ) : (
          <SettingsSidebar
            categories={categories}
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
          />
        )}
        <SettingsContent
          activeCategory={activeCategory}
          isMobile={isMobile}
          onCategoryChange={handleCategoryChange}
        />
      </DialogContent>
    </Dialog>
  );
}
