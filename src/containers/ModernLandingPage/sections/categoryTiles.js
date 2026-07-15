import {
  IconPhone,
  IconLaptop,
  IconHeadphones,
  IconConsole,
  IconController,
  IconDisc,
  IconWatch,
  IconCamera,
} from './icons';

// Top-level Console category ids, in display order. Single source of truth
// shared by SectionCategories (tile rendering) and ModernLandingPage.duck
// (live per-category listing counts) so the two never drift. Tiles deep-link
// into SearchPage filters via `?pub_categoryLevel1=<id>`.
export const CATEGORY_TILES = [
  {
    id: 'phonesaccessories',
    fallback: 'Phones & Accessories',
    icon: IconPhone,
    tileClass: 'tileFeature',
  },
  { id: 'computerstablets', fallback: 'Computers & Tablets', icon: IconLaptop },
  { id: 'audiodevices', fallback: 'Audio Devices', icon: IconHeadphones },
  { id: 'gameconsoles', fallback: 'Game Consoles', icon: IconConsole },
  { id: 'wearablessmartdevices', fallback: 'Wearables & Smart Devices', icon: IconWatch },
  { id: 'camerasvideo', fallback: 'Cameras & Video', icon: IconCamera, tileClass: 'tileWide' },
  { id: 'videogames', fallback: 'Video Games', icon: IconDisc },
  { id: 'consoleaccessories', fallback: 'Console Accessories', icon: IconController },
];
