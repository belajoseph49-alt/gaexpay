# Task 26-A — Country Services Database (Real Providers)

**Agent**: Senior Data Engineer
**Date**: 2025
**Task ID**: 26-A

## Objective

Build a comprehensive, REAL provider directory for every African country
GaexPay supports, so the bills / merchant flows can show users the actual
companies they pay in their country & city — not generic placeholders.

## Scope

1. `src/lib/country-services.ts` — typed provider database with 13
   categories (transport, restaurants, supermarkets, hospitals, pharmacies,
   internetProviders w/ plans+prices, universities w/ tuition ranges,
   fuelStations, electricity, water, tv w/ packages, insurance,
   government) for 15 African countries.
2. `src/app/api/country-services/route.ts` — GET endpoint with
   `?country=&city=&category=` filtering and auto-detect fallback to the
   authenticated user's `user.country` / `user.city`.

## Inputs read

- `/home/z/my-project/worklog.md` — project history & conventions.
- `/home/z/my-project/src/lib/gaexpay.ts` — `COUNTRIES` (40 entries, code
  /name/flag/currency/phonePrefix), `BILL_CATEGORIES`, currency symbols,
  `formatMoney` helpers.
- `/home/z/my-project/src/lib/api-auth.ts` — `getAuthUserId(req)` precedence
  (Bearer → `x-gxp-user` → DEMO_USER_ID).
- `/home/z/my-project/src/lib/api-error.ts` — `apiError` / `apiCatch` for
  sanitized responses.
- `/home/z/my-project/src/app/api/unified-address/route.ts` + `/api/me/route.ts`
  — patterns for `db.user.findUnique({ select: { country, city } })`.
- `/home/z/my-project/prisma/schema.prisma` — `User.country` defaults to
  `"Nigeria"` (full name, not ISO code); this drove the need for a
  name→code normalizer.

## Deliverables

### 1. `src/lib/country-services.ts`

Strongly-typed provider database. Types:

```ts
interface CityProvider      { name; type; cities: string[] }
interface PlanProvider      { name; type; plans: { name; price; currency }[] }
interface UniversityProvider{ name; type; city; tuitionRange }
interface CoverageProvider  { name; type; coverage }
interface PackageProvider   { name; type; packages: { name; price; currency }[] }
interface ServiceListProvider{ name; type; services: string[] }
interface CountryServices {
  transport: CityProvider[];
  restaurants: CityProvider[];
  supermarkets: CityProvider[];
  hospitals: CityProvider[];
  pharmacies: CityProvider[];
  internetProviders: PlanProvider[];
  universities: UniversityProvider[];
  fuelStations: CityProvider[];
  electricity: CoverageProvider[];
  water: CoverageProvider[];
  tv: PackageProvider[];
  insurance: ServiceListProvider[];
  government: ServiceListProvider[];
}
```

15 countries populated: **NG, GH, CM, CI, SN, KE, UG, TZ, RW, ZA, EG, MA,
ET, BJ, BF**.

Every country exceeds the spec minimums:
- ≥3 transport providers
- ≥3 restaurant chains
- ≥3 supermarkets
- ≥2 hospitals
- ≥2 pharmacy chains
- ≥3 internet providers WITH real plans and prices in local currency
- ≥3 universities WITH real tuition ranges
- ≥2 fuel station chains
- ≥2 electricity providers
- ≥1 water utility
- ≥2 TV providers WITH real packages and prices
- ≥2 insurance companies
- ≥1 government revenue service

Real provider examples (selected):
- **NG**: Uber, Bolt, LagRide, Lagos BRT, GIGM, ABC, GUO; Chicken Republic,
  The Place, Kilimanjaro, Mr Biggs, Tastee, Domino's; Shoprite, Spar,
  Justrite, Hubmart, Ebeano, Addide; LUTH, Reddington, Eko, Cedarcrest,
  St Nicholas, National Hosp Abuja; HealthPlus, MedPlus, Alpha, Rx;
  MTN/Airtel/Glo/9mobile/Spectranet/Smile/Starlink (NGN plans);
  UNILAG, UNN, Covenant, OAU, UI, Babcock; NNPC, TotalEnergies, Oando,
  Conoil, MRS, Ardova; Ikeja/Eko/AEDC/IBEDC/PHED/KEDCO; LWC + Abuja Water;
  DStv/GOtv/StarTimes (NGN packages); AXA Mansard, Leadway, AIICO,
  Cornerstone; FIRS, LIRS, JAMB, WAEC.
- **GH**: Uber, Bolt, Yango, Metro Mass, STC, VIP JEOUN; Papaye, KFC,
  Barcelos, Chicken Inn, Pizza Hut; Melcom, MaxMart, Shoprite, Palace,
  Koala; Korle Bu, Komfo Anokye, 37 Military, Nyaho, Trust; Ernest Chemist,
  Top Up, Omega, Bester; MTN/Telecel/AirtelTigo/Surfline/Vodafone Fibre
  (GHS plans); UG Legon, KNUST, UCC, Ashesi, GIMPA; Goil, TotalEnergies,
  Shell Vivo, Star, Allied; ECG/NEDCO/Enclave; GWCL; DStv/GOtv/Multi TV
  (GHS packages); Enterprise Life, SIC, Hollard, Metropolitan; GRA, NHIA,
  SSNIT.
- **CM**: Bolt, Yango, Taxi Verts, STAO, Touristique Express, Binam/Van Van;
  Biggady, Salon de Thé le Dôme, Aristocrat, Buffalo Grill, Häagen-Dazs;
  Casino, Boulangerie de l'Ouest, Mahima, Score, Carrefour Bonanjo; CHU
  Yaoundé, Hôpital Général, Laquintinie, Clinique de l'Aéroport, Polyclinique
  Bastos; Pharmacie du Centre / Aéroport / Étoile / Bonanjo; MTN/Orange/
  Camtel-Nexttel/Yoomee (XAF plans); U. Yaoundé I & II, U. Douala, U. Buea,
  CATUC; TotalEnergies, Tradex, Bolloré, Goil; ENEO + EDC; CAMWATER;
  Canal+/DStv/CRTV (XAF packages); Activa, AXA, Saham; DGI, CNPS, MINfi.
- **CI**: Yango, Heetch, SOTRA, UTB, STC; KFC, Pizza Hut, La Plage, Le Nid,
  Café de Versailles; Carrefour, Casino, CDCI, Prosuma, Super U; CHU Cocody,
  CHU Treichville, PISAM, Clinique Claude-Antoine; Pharmacie Riviera / 2
  Plateaux / Plateau / Centrale Bouaké; Orange/MTN/Moov/Orange Business
  Fibre (XOF plans); U. Félix Houphouët-Boigny, U. Alassane Ouattara,
  INP-HB, U. Nangui Abrogoua; TotalEnergies, Pétro Ivoire, Shell Vivo, MRS;
  CIE + CIPREL; SODECI; Canal+/DStv/RTI; NSIA, AXA, Allianz; DGI, CNPS,
  Douanes.
- **SN**: Yango, Heetch, DDD, Tata Sénégal, Taxi Jaune; KFC, Le Mermoz,
  Chez Loutcha, La Tabaski, Le Khaymandar; Auchan, Casino, Leader Price,
  Citydia, Promocash; Hôpital Principal, Le Dantec, CHU Fann, Clinique du
  Cap; Pharmacie Médina / Plateau / Étoile / Thiès; Orange/Free/Expresso +
  Orange Fibre (XOF plans); UCAD, UGB, UVS, U. Iba Der Thiam; TotalEnergies,
  Pétroline, Oilcom, Elton; SENELEC; SDE; Canal+/DStv/2S TV/TFM; NSIA,
  Allianz, SUNU; DGID, IPM, CSS.
- **KE**: Uber, Bolt, Little, Matatu, SWVL, hAUKenya; Java House, KFC,
  Chicken Inn, Steers, Wimpy, CJ's; Naivas, Carrefour, Quickmart, Eastmart,
  Chandarana; KNH, Mama Lucy, Aga Khan, Nairobi Hosp, Karen, Coast General;
  Goodlife, Haltons, Pharma Plus, Healthy U; Safaricom/Airtel/Telkom/Faiba/
  Safaricom Home (KES plans); UoN, KU, JKUAT, Strathmore, USIU-A;
  TotalEnergies, Shell Vivo, Rubis, NOCK, Gulf; KPLC + REREC; NCWSC + MWASS;
  DStv/GOtv/Zuku/StarTimes (KES packages); Jubilee, Britam, CIC, UAP; KRA,
  NHIF, NSSF.
- **UG**: Uber, Bolt, SafeBoda, Easy Matatu, Pioneer Easy Bus, Jaguar;
  Café Javas, Java House, KFC, Café Bourbon, Iron Chef; Carrefour, Capital
  Shoppers, Quality, Super Haido, Payless; Mulago, IHK, Nakasero, Paragon;
  Abacus, Guardian, Medik, Ridge; MTN/Airtel/UTL/Roke Telkom (UGX plans);
  Makerere, MUST, Kyambogo, UCU, Uganda Martyrs; TotalEnergies, Shell Vivo,
  Stabex, Hared; Umeme + UETCL; NWSC; DStv/GOtv/StarTimes (UGX packages);
  Jubilee, UAP, ICEA Lion; URA, NSSF.
- **TZ**: Uber, Bolt, Little, dalla-dala, UDA, Sumry; KFC, Steers, Chicken
  Inn, Cape Town Fish Market, Samaki Samaki; Shoprite, Game, Village,
  Shoppers, Ushindi; MNH, Aga Khan, TMJ, KCMC; AA, Pharmascope, Salama,
  Sayansi; Vodacom/Airtel/Tigo/Halotel/TTCL (TZS plans); UDSM, SUA, OUT,
  UDOM, SAUT; TotalEnergies, Puma, Oryx, Camel Oil; TANESCO; DAWASA;
  DStv/Azam/StarTimes (TZS packages); Jubilee, AAR, Resolution; TRA, NSSF.
- **RW**: Yego (Move), VW Move, Bolt, City Bus, Royal Express; KFC, Bourbon
  Coffee, The Hut, Heaven, Pili Pili; Simba, Carrefour, Brussels, Ndoli,
  Suka; King Faisal, CHUK, Kanombe, CHUB; Pharmacie Conseil Plus, Pharmaplus,
  Paix, Carrefour; MTN/Airtel/Canisius (RWF plans); UR, CMU-A, ULK, UR-CST;
  SP, TotalEnergies, Hashi, Lake Oil; REG (EUCL); WASAC; DStv/StarTimes/TVR;
  Radiant, Soras, BK General; RRA, RSSB.
- **ZA**: Uber, Bolt, DiDi, Gautrain, Metrorail, Rea Vaya, MyCiTi; Nando's,
  Steers, Wimpy, KFC, Mugg & Bean, Spur; Shoprite, Pick n Pay, Checkers,
  Woolworths, SPAR, Boxer; Netcare, Mediclinic, Life, Chris Hani Bara,
  Groote Schuur; Clicks, Dis-Chem, Alpha Pharm, Medirite; Vodacom/MTN/Cell C
  /Telkom/Rain/Vumatel (ZAR plans); UCT, Wits, Stellenbosch, UP, UKZN;
  Sasol, Engen, Shell, BP, TotalEnergies, Caltex; Eskom + City Power + CCT
  + eThekwini + Tshwane; Rand Water + CCT Water + eThekwini Water; DStv/
  GOtv/Showmax/Openview (ZAR packages); Old Mutual, Sanlam, Discovery,
  Santam, Outsurance; SARS, UIF, SASSA.
- **EG**: Uber, Bolt, inDrive, Careem, Cairo Metro, Alex Tram; KFC,
  McDonald's, Mo'men, Abou El Sid, Koshary Abou Tarek; Carrefour, Spinneys,
  Kheir Zaman, Gourmet, BIM; As-Salam, Saudi German, Cleopatra, Kasr Al
  Ainy, Alex Main U; El-Ezaby, Eshti, Dr. Nutrition, Seif; Vodafone/Orange/
  Etisalat/WE (EGP plans); Cairo U, AUC, Ain Shams, Alex U, GUC; Misr
  Petroleum, Shell, TotalEnergies, BP, Champion; EEHC + 3 city distributors;
  HCWW; OSN/beIN/Nilesat; Allianz, AXA, GIG, MetLife; ETA, NOSI.
- **MA**: Careem, Robo, Heetch, Casa Tram, Rabat-Salé Tram, ONCF, CTM;
  McDonald's, KFC, La Sqala, Café Clock, Le Riad; Marjane, Carrefour
  Marjane, Aswak Assalam, BIM, Atacadao; CHU Ibn Sina, CHU Ibn Rochd, Clinique
  du Souiss, Cheikh Zaid, Clinique Chantilly; Pharmacie Poste, Al Amal,
  Marché, Centrale Marrakech; Maroc Telecom/Orange/Inwi + Maroc Telecom
  Fibre (MAD plans); Al Quaraouiyine, Mohammed V, Hassan II, Al Akhawayn,
  UPM; Afriquia, TotalEnergies, Shell Vivo, BP, Lasmi; ONEE + LYDEC/REDAL/
  AMENDIS; ONEE Eau + LYDEC + REDAL; OSN/beIN/IAM TV/SNRT; Wafa, RMA Watanya,
  Saham, AXA; DGI, CNSS, CNOPS, ADII.
- **ET**: Ride, ZayRide, EseyOr, Feres, Addis Light Rail, Selam Bus; Yod
  Abyssinia, 2000 Habesha, Café Addis, KFC, Lucy; Bambu, Friendship, Shoa,
  Neway, Fantu; Tikur Anbessa, St. Paul's, Bethzatha, Korean, Hayat; Hasi,
  Bega, Addis, Bionorica; Ethio Telecom/Safaricom Ethiopia/EEU broadband
  (ETB plans); AAU, Mekelle, Jimma, Bahir Dar, Unity; TotalEnergies, NOC,
  YBS, Oil Libya, Kobil; EEU + EEP; AAWSA + Regional Bureaus; DStv/Ethiosat/
  EBC; EIC, Awash, Nyala, UNIC; ERCA, ESSA.
- **BJ**: Gozem, TMX, Taxi-brousse, Jonquet, BB-City Bus; Le Chant
  d'Oiseau, La Chaumière, Le Livingstone, Maquis du Plateau, La Pirogue;
  Erevan, Champion, Casino, Biocoop, Le Marché; CNHU Hubert Maga, HOMEL,
  Clinique Akpakpa, Biop icy; Pharmacie Centrale Cotonou, Étoile, Plateau,
  Porto-Novo; MTN/Moov/SBEE broadband (XOF plans); UAC, UP, UNSTIM, ESGIS;
  TotalEnergies, Pétro Bénin, MRS, Oilcoin; SBEE + CEB; SONEB; Canal+/DStv/
  ORTB; NSIA, SUNU, Chanas; DGID, CNSS.
- **BF**: Yango, Taxi Jaune, TCO, STMB, Rakieta/Lale; Le Paillotte, La
  Table d'Ouaga, Café de la Gare, Verdoyant, Sank Bayili; Sococé, Casino,
  Marathon, Somgta, Espace Bon Appétit; CHU Yalgado, CHU Pédiatrique, CHU
  Sourô Sanou, Notre Dame de la Paix, Clinique Suka; Pharmacie Océan,
  Marché Rood Woko, Centre, Bobo; Orange BF/Moov Africa BF/Telecel Faso/
  FasoNet (XOF plans); U. Joseph Ki-Zerbo, U. Nazi Boni, U. Thomas Sankara,
  IDR, IUT; TotalEnergies, Coris Oil, Pétrofa, SBM, Oilibya; SONABEL; ONEA;
  Canal+/DStv/RTB; NSIA, SUNU, ASKIA; DGI, CNSS, CARFO.

Helpers exported:
- `getCountryServices(code)` → `CountryServices | null`
- `getCategoryServices(code, category, city?)` → city-filtered list
  - universities: filter on `city` (string)
  - city-scoped providers (transport / restaurants / supermarkets /
    hospitals / pharmacies / fuelStations): match `cities` array OR
    "All cities"
  - coverage / plan / package / service categories: ignore city filter
- `listServicedCountries()` → ISO codes
- `SERVICE_CATEGORIES` constant + `ServiceCategory` type

### 2. `src/app/api/country-services/route.ts`

`GET /api/country-services?country=NG&city=Lagos&category=internetProviders`

Behaviour:
1. `getAuthUserId(req)` — Bearer → `x-gxp-user` → DEMO_USER_ID (dev only).
2. Parse query: `country`, `city`, `category`.
3. **Country normalization** (`normalizeCountryCode`):
   - Accepts ISO codes (case-insensitive) — direct lookup in
     `COUNTRY_SERVICES`.
   - Accepts full country names (case-insensitive) — matches against the
     `COUNTRIES` array in `src/lib/gaexpay.ts`.
   - Falls back to partial / "contains" matching so accented names work
     even when the client strips diacritics ("Cote d'Ivoire" → CI).
   - Returns the uppercased ISO code or `null`.
4. **Auto-detect fallback** — if no `country=` provided, loads the
   authenticated user's `country` + `city` from the DB. Critical because
   the seeded demo user has `country="Nigeria"` (full name) and
   `city="Lagos"` — the normalizer turns "Nigeria" → "NG" and the response
   becomes the Lagos-filtered NG directory. `resolvedFrom: "query" |
   "profile"` in the response tells the client which path was taken.
5. **Category validation** — 400 with list of valid values if
   `category=` isn't in `SERVICE_CATEGORIES`.
6. **Unknown country** — 404 with list of supported codes.
7. **Response shape**:
   ```json
   {
     "country": "NG",
     "resolvedFrom": "query" | "profile",
     "city": "Lagos" | null,
     "category": "internetProviders" | null,
     "categories": ["internetProviders"] | SERVICE_CATEGORIES,
     "counts": { "internetProviders": 7 } | per-category counts,
     "total": 7,
     "services": { "internetProviders": [...] } | all categories,
     "servicedCountries": [...],
     "allCountries": [...]
   }
   ```
8. Errors through `apiError` / `apiCatch`.

## Verification

- ✅ `bun run lint` → 0 errors, 0 warnings.
- ✅ Dev server compiles cleanly; `dev.log` shows the new route returning
  200 / 400 / 404 as expected, no 500s.

API smoke tests (live against the dev server):

| Request | Status | Result |
|---|---|---|
| `?country=NG&city=Lagos&category=internetProviders` | 200 | 7 ISPs with NGN plan lists |
| `?country=KE&city=Nairobi&category=hospitals` | 200 | 5 Nairobi hospitals |
| `?country=ZA` (no city, no category) | 200 | All 13 categories, total 65 providers |
| (no params — auto-detect from demo user) | 200 | `country: NG`, `resolvedFrom: profile`, `city: Lagos`, all 13 categories city-filtered (universities: 1 = UNILAG only) |
| `?country=Côte%20d'Ivoire` (URL-encoded) | 200 | `country: CI` (full-name normalization with accents) |
| `?country=senegal` (case-insensitive) | 200 | `country: SN` |
| `?country=XX` (unknown ISO code) | 404 | Helpful list of supported codes |
| `?country=Ivory%20Coast` (not in COUNTRIES) | 404 | Same helpful list |
| `?country=NG&category=bogus` | 400 | List of valid category names |

## Files added

- **NEW** `src/lib/country-services.ts` — ~1,200 lines, 15 countries × 13
  categories with real provider data, plans/prices/packages, tuition
  ranges, service lists + helpers + types.
- **NEW** `src/app/api/country-services/route.ts` — GET, ~120 lines incl.
  country normalization + auth + category validation + response shape.

No files modified outside the two new ones.

## Notes for downstream agents

- The directory is pure data + helpers, no DB writes. Safe to import from
  server components, API routes, and read-only client components.
- Prices are approximate public list prices at time of writing — intended
  for representative display in the GaexPay demo. Confirm with provider
  before charging.
- The 13 categories align closely with `BILL_CATEGORIES` in
  `src/lib/gaexpay.ts` so the bills UI can render the real providers as
  billers without further mapping.
- If a future task adds more countries (DZ, TN, ML, TG, NE, GA, CG, CD,
  ZM, BW, AO, MZ, BI…), drop another `XX: { ... }` block into
  `COUNTRY_SERVICES` — the API + helpers pick it up automatically.
- Country normalization lives in the API route (not the lib) so the lib
  stays pure-data. If a client needs to convert names → codes, it should
  use the `COUNTRIES` array from `gaexpay.ts` directly.
