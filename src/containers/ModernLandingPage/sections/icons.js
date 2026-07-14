import React from 'react';
import {
  ArrowRight,
  Camera,
  Check,
  ChevronRight,
  Disc,
  Gamepad2,
  Handshake,
  HardDrive,
  Headphones,
  Laptop,
  Lock,
  LockOpen,
  Smartphone,
  Truck,
  Watch,
} from 'lucide-react';

/**
 * Icon set for the ModernLandingPage sections — thin wrappers around
 * lucide-react so every section draws from one consistent 24x24 / 1.5-stroke
 * family. Sized and tinted via CSS (currentColor).
 */

/* fill must be an inline style: something in the app's cascade overrides the
   SVG fill="none" presentation attribute and paints the outlines as solid
   silhouettes. Inline style wins over any stylesheet rule. */
const withStroke = LucideIcon => {
  const Icon = ({ className }) => (
    <LucideIcon
      className={className}
      strokeWidth={1.5}
      style={{ fill: 'none' }}
      aria-hidden="true"
    />
  );
  return Icon;
};

export const IconPhone = withStroke(Smartphone);
export const IconLaptop = withStroke(Laptop);
export const IconHeadphones = withStroke(Headphones);
/* The console deck itself (lucide has no dedicated console icon; the drive
   slab reads as the machine) — the controller belongs to accessories. */
export const IconConsole = withStroke(HardDrive);
export const IconController = withStroke(Gamepad2);
export const IconDisc = withStroke(Disc);
export const IconWatch = withStroke(Watch);
export const IconCamera = withStroke(Camera);
export const IconArrow = withStroke(ArrowRight);
export const IconChevron = withStroke(ChevronRight);
export const IconCheck = withStroke(Check);
export const IconLock = withStroke(Lock);
export const IconLockOpen = withStroke(LockOpen);
export const IconHandshake = withStroke(Handshake);
export const IconTruck = withStroke(Truck);
