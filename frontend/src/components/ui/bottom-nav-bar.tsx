import { useState } from 'react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const MOBILE_LABEL_WIDTH = 72;

export type BottomNavBarItem = {
  label: string;
  icon: LucideIcon;
};

export type BottomNavBarProps = {
  className?: string;
  items: BottomNavBarItem[];
  /** Controlled active tab index */
  activeIndex?: number;
  /** Uncontrolled initial index */
  defaultIndex?: number;
  onActiveIndexChange?: (index: number) => void;
  stickyBottom?: boolean;
};

export function BottomNavBar({
  className,
  items,
  activeIndex: activeIndexProp,
  defaultIndex = 0,
  onActiveIndexChange,
  stickyBottom = false,
}: BottomNavBarProps) {
  const [internalIndex, setInternalIndex] = useState(defaultIndex);
  const activeIndex = activeIndexProp ?? internalIndex;

  const setActive = (idx: number) => {
    if (activeIndexProp === undefined) setInternalIndex(idx);
    onActiveIndexChange?.(idx);
  };

  return (
    <motion.nav
      initial={{ scale: 0.96, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 26 }}
      role="navigation"
      aria-label="Bottom Navigation"
      className={cn(
        'bg-card/95 backdrop-blur-lg border border-border rounded-full flex items-center p-1.5 shadow-xl gap-0.5',
        'min-w-[min(100%,320px)] max-w-[95vw] h-[52px]',
        stickyBottom &&
          'fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] mx-auto z-40 w-fit',
        className
      )}
    >
      {items.map((item, idx) => {
        const Icon = item.icon;
        const isActive = activeIndex === idx;

        return (
          <motion.button
            key={item.label}
            whileTap={{ scale: 0.97 }}
            className={cn(
              'flex items-center gap-0 px-2 sm:px-3 py-2 rounded-full transition-colors duration-200 relative h-10 min-w-[40px] min-h-[40px] max-h-[44px]',
              isActive
                ? 'bg-primary/10 text-primary gap-2'
                : 'bg-transparent text-muted-foreground hover:bg-muted/80',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40'
            )}
            onClick={() => setActive(idx)}
            aria-label={item.label}
            aria-current={isActive ? 'page' : undefined}
            type="button"
          >
            <Icon size={20} strokeWidth={2} aria-hidden className="shrink-0 transition-colors duration-200" />

            <motion.div
              initial={false}
              animate={{
                width: isActive ? `${MOBILE_LABEL_WIDTH}px` : '0px',
                opacity: isActive ? 1 : 0,
                marginLeft: isActive ? '6px' : '0px',
              }}
              transition={{
                width: { type: 'spring', stiffness: 350, damping: 32 },
                opacity: { duration: 0.19 },
                marginLeft: { duration: 0.19 },
              }}
              className="overflow-hidden flex items-center max-w-[72px]"
            >
              <span
                className={cn(
                  'font-medium text-xs whitespace-nowrap select-none transition-opacity duration-200 overflow-hidden text-ellipsis',
                  isActive ? 'text-primary' : 'opacity-0'
                )}
                title={item.label}
              >
                {item.label}
              </span>
            </motion.div>
          </motion.button>
        );
      })}
    </motion.nav>
  );
}

export default BottomNavBar;
