import {getRequestConfig} from 'next-intl/server';
import {routing} from './routing';
import {translations, type LanguageCode} from '@/lib/i18n/translations';

function unflatten(obj: Record<string, string>) {
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const keys = key.split('.');
    let current = result;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) current[keys[i]] = {};
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
  }
  return result;
}

export default getRequestConfig(async ({requestLocale}) => {
  // This typically corresponds to the `[locale]` segment
  let locale = await requestLocale;
 
  // Ensure that a valid locale is used
  if (!locale || !routing.locales.includes(locale as any)) {
    locale = routing.defaultLocale;
  }
 
  return {
    locale,
    // Provide the unflattened dictionary for the requested locale
    messages: unflatten(translations[locale as LanguageCode])
  };
});
