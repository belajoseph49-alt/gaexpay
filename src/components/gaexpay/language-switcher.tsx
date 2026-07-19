"use client";

import { usePathname, useRouter } from "@/i18n/routing";
import { useLocale } from "next-intl";
import { useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Globe } from "lucide-react";

const languages = [
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "ru", name: "Русский", flag: "🇷🇺" },
  { code: "zh", name: "中文", flag: "🇨🇳" },
  { code: "ar", name: "العربية", flag: "🇸🇦" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "ew", name: "Ewondo", flag: "🇨🇲" },
  { code: "ff", name: "Fulfulde", flag: "🇨🇲" },
  { code: "sw", name: "Kiswahili", flag: "🇰🇪" },
  { code: "ln", name: "Lingála", flag: "🇨🇩" },
  { code: "ha", name: "Hausa", flag: "🇳🇬" },
  { code: "ja", name: "日本語", flag: "🇯🇵" },
  { code: "pcm", name: "Pidgin", flag: "🇨🇲" },
  { code: "dua", name: "Duala", flag: "🇨🇲" }
];

export function LanguageSwitcher() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();

  const onSelectChange = (nextLocale: string) => {
    startTransition(() => {
      router.replace(pathname, { locale: nextLocale });
    });
  };

  return (
    <Select defaultValue={locale} onValueChange={onSelectChange} disabled={isPending}>
      <SelectTrigger className="w-[140px] bg-background/50 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4" />
          <SelectValue placeholder="Language" />
        </div>
      </SelectTrigger>
      <SelectContent>
        {languages.map((lang) => (
          <SelectItem key={lang.code} value={lang.code}>
            <span className="flex items-center gap-2">
              <span className="text-base">{lang.flag}</span>
              <span>{lang.name}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
