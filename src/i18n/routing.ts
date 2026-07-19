import {defineRouting} from 'next-intl/routing';
import {createNavigation} from 'next-intl/navigation';

export const routing = defineRouting({
  // A list of all locales that are supported
  locales: ['en', 'fr', 'ru', 'zh', 'ar', 'es', 'de', 'ew', 'ff', 'sw', 'ln', 'ha', 'ja', 'pcm', 'dua'],
  
  // Used when no locale matches
  defaultLocale: 'fr'
});

// Lightweight wrappers around Next.js' navigation APIs
// that will consider the routing configuration
export const {Link, redirect, usePathname, useRouter} =
  createNavigation(routing);
