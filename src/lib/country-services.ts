/**
 * src/lib/country-services.ts
 *
 * Comprehensive database of REAL service providers per African country,
 * organized by category. Used by GaexPay's bills/merchant directory so
 * users see the actual providers in their country/city.
 *
 * Categories:
 *   - transport         (ride-hailing, bus, intercity-bus, train, ferry)
 *   - restaurants       (fast-food, restaurant, café, chain)
 *   - supermarkets      (supermarket, hypermarket, convenience)
 *   - hospitals         (public, private, teaching, clinic)
 *   - pharmacies        (pharmacy, drug-store)
 *   - internetProviders (mobile-data, broadband, fiber, satellite)
 *   - universities      (public, private)
 *   - fuelStations      (fuel)
 *   - electricity       (electricity)
 *   - water             (water)
 *   - tv                (satellite-tv, cable-tv, streaming)
 *   - insurance         (insurance)
 *   - government        (tax, social-security, customs)
 *
 * Pricing is approximate (public list prices at time of writing) and is
 * intended for representative display in the GaexPay demo. Always confirm
 * the current price with the provider before paying.
 */

// ----- Shared types -------------------------------------------------------

export interface CityProvider {
  name: string;
  type: string;
  cities: string[];
}

export interface PlanProvider {
  name: string;
  type: string;
  plans: { name: string; price: number; currency: string }[];
}

export interface UniversityProvider {
  name: string;
  type: string;
  city: string;
  tuitionRange: string;
}

export interface CoverageProvider {
  name: string;
  type: string;
  coverage: string;
}

export interface PackageProvider {
  name: string;
  type: string;
  packages: { name: string; price: number; currency: string }[];
}

export interface ServiceListProvider {
  name: string;
  type: string;
  services: string[];
}

export interface CountryServices {
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

export const SERVICE_CATEGORIES = [
  "transport",
  "restaurants",
  "supermarkets",
  "hospitals",
  "pharmacies",
  "internetProviders",
  "universities",
  "fuelStations",
  "electricity",
  "water",
  "tv",
  "insurance",
  "government",
] as const;

export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];

// ----- Country data -------------------------------------------------------

export const COUNTRY_SERVICES: Record<string, CountryServices> = {
  // ========================================================================
  // NG — Nigeria
  // ========================================================================
  NG: {
    transport: [
      { name: "Uber", type: "ride-hailing", cities: ["Lagos", "Abuja", "Port Harcourt", "Ibadan", "Benin City"] },
      { name: "Bolt", type: "ride-hailing", cities: ["Lagos", "Abuja", "Port Harcourt", "Ibadan", "Kano", "Benin City"] },
      { name: "LagRide", type: "ride-hailing", cities: ["Lagos"] },
      { name: "Lagos BRT", type: "bus", cities: ["Lagos"] },
      { name: "God is Good Motors (GIGM)", type: "intercity-bus", cities: ["Lagos", "Abuja", "Port Harcourt", "Enugu", "Benin City"] },
      { name: "ABC Transport", type: "intercity-bus", cities: ["Lagos", "Abuja", "Port Harcourt", "Enugu"] },
      { name: "GUO Transport", type: "intercity-bus", cities: ["Lagos", "Abuja", "Port Harcourt"] },
    ],
    restaurants: [
      { name: "Chicken Republic", type: "fast-food", cities: ["Lagos", "Abuja", "Port Harcourt", "Ibadan"] },
      { name: "The Place", type: "restaurant", cities: ["Lagos", "Abuja"] },
      { name: "Kilimanjaro", type: "fast-food", cities: ["Lagos", "Abuja", "Port Harcourt"] },
      { name: "Mr Biggs", type: "fast-food", cities: ["Lagos", "Abuja", "Port Harcourt", "Ibadan", "Benin City"] },
      { name: "Tastee Fried Chicken", type: "fast-food", cities: ["Lagos", "Abuja"] },
      { name: "Domino's Pizza Nigeria", type: "fast-food", cities: ["Lagos", "Abuja"] },
    ],
    supermarkets: [
      { name: "Shoprite Nigeria", type: "supermarket", cities: ["Lagos", "Abuja", "Port Harcourt", "Ibadan"] },
      { name: "Spar Nigeria", type: "supermarket", cities: ["Lagos", "Abuja"] },
      { name: "Justrite Superstores", type: "supermarket", cities: ["Lagos"] },
      { name: "Hubmart", type: "supermarket", cities: ["Lagos"] },
      { name: "Ebeano Supermarket", type: "supermarket", cities: ["Lagos"] },
      { name: "Addide", type: "supermarket", cities: ["Lagos"] },
    ],
    hospitals: [
      { name: "Lagos University Teaching Hospital (LUTH)", type: "public", cities: ["Lagos"] },
      { name: "Reddington Hospital", type: "private", cities: ["Lagos", "Abuja"] },
      { name: "Eko Hospital", type: "private", cities: ["Lagos"] },
      { name: "Cedarcrest Hospital", type: "private", cities: ["Abuja"] },
      { name: "St Nicholas Hospital", type: "private", cities: ["Lagos"] },
      { name: "National Hospital Abuja", type: "public", cities: ["Abuja"] },
    ],
    pharmacies: [
      { name: "HealthPlus", type: "pharmacy", cities: ["Lagos", "Abuja", "Port Harcourt"] },
      { name: "MedPlus", type: "pharmacy", cities: ["Lagos", "Abuja"] },
      { name: "Alpha Pharmacy", type: "pharmacy", cities: ["Lagos"] },
      { name: "Rx Pharmacy", type: "pharmacy", cities: ["Lagos", "Abuja"] },
    ],
    internetProviders: [
      {
        name: "MTN Nigeria",
        type: "mobile-data",
        plans: [
          { name: "Daily 100MB", price: 100, currency: "NGN" },
          { name: "Weekly 1GB", price: 500, currency: "NGN" },
          { name: "Monthly 10GB", price: 5000, currency: "NGN" },
          { name: "Monthly 75GB", price: 15000, currency: "NGN" },
          { name: "Monthly 120GB", price: 20000, currency: "NGN" },
        ],
      },
      {
        name: "Airtel Nigeria",
        type: "mobile-data",
        plans: [
          { name: "Daily 100MB", price: 100, currency: "NGN" },
          { name: "Weekly 1.5GB", price: 500, currency: "NGN" },
          { name: "Monthly 10GB", price: 5000, currency: "NGN" },
          { name: "Monthly 40GB", price: 9999, currency: "NGN" },
          { name: "Monthly 120GB", price: 19500, currency: "NGN" },
        ],
      },
      {
        name: "Glo (Globacom)",
        type: "mobile-data",
        plans: [
          { name: "Daily 100MB", price: 100, currency: "NGN" },
          { name: "Weekly 2.7GB", price: 500, currency: "NGN" },
          { name: "Monthly 10GB", price: 4999, currency: "NGN" },
          { name: "Monthly 93.9GB", price: 19900, currency: "NGN" },
        ],
      },
      {
        name: "9mobile",
        type: "mobile-data",
        plans: [
          { name: "Daily 100MB", price: 100, currency: "NGN" },
          { name: "Monthly 11GB", price: 5000, currency: "NGN" },
          { name: "Monthly 75GB", price: 18000, currency: "NGN" },
        ],
      },
      {
        name: "Spectranet",
        type: "broadband",
        plans: [
          { name: "Easy 15GB", price: 7000, currency: "NGN" },
          { name: "Easy 50GB", price: 18500, currency: "NGN" },
          { name: "Unlimited Lite", price: 18000, currency: "NGN" },
          { name: "Unlimited Premium", price: 40000, currency: "NGN" },
        ],
      },
      {
        name: "Smile Communications",
        type: "broadband",
        plans: [
          { name: "Anytime 5GB", price: 4200, currency: "NGN" },
          { name: "Anytime 21GB", price: 12000, currency: "NGN" },
          { name: "Unlimited Premium", price: 27500, currency: "NGN" },
        ],
      },
      {
        name: "Starlink Nigeria",
        type: "satellite",
        plans: [
          { name: "Standard", price: 38000, currency: "NGN" },
          { name: "Standard Lite", price: 29000, currency: "NGN" },
        ],
      },
    ],
    universities: [
      { name: "University of Lagos (UNILAG)", type: "public", city: "Lagos", tuitionRange: "₦50,000 – ₦100,000/yr" },
      { name: "University of Nigeria, Nsukka (UNN)", type: "public", city: "Enugu", tuitionRange: "₦60,000 – ₦120,000/yr" },
      { name: "Covenant University", type: "private", city: "Ota", tuitionRange: "₦900,000 – ₦1,500,000/yr" },
      { name: "Obafemi Awolowo University (OAU)", type: "public", city: "Ile-Ife", tuitionRange: "₦60,000 – ₦120,000/yr" },
      { name: "University of Ibadan (UI)", type: "public", city: "Ibadan", tuitionRange: "₦50,000 – ₦100,000/yr" },
      { name: "Babcock University", type: "private", city: "Ilishan-Remo", tuitionRange: "₦600,000 – ₦1,200,000/yr" },
    ],
    fuelStations: [
      { name: "NNPC Retail", type: "fuel", cities: ["All cities"] },
      { name: "TotalEnergies Nigeria", type: "fuel", cities: ["All cities"] },
      { name: "Oando", type: "fuel", cities: ["All cities"] },
      { name: "Conoil", type: "fuel", cities: ["Lagos", "Abuja", "Port Harcourt"] },
      { name: "MRS Oil Nigeria", type: "fuel", cities: ["Lagos", "Abuja"] },
      { name: "Fort Oil (Ardova)", type: "fuel", cities: ["Lagos", "Abuja"] },
    ],
    electricity: [
      { name: "Ikeja Electric (IKEDC)", type: "electricity", coverage: "Lagos (Ikeja axis)" },
      { name: "Eko Electric (EKEDC)", type: "electricity", coverage: "Lagos (Eko axis)" },
      { name: "Abuja Electricity Distribution (AEDC)", type: "electricity", coverage: "Abuja, Kogi, Nasarawa, Niger" },
      { name: "Ibadan Electricity Distribution (IBEDC)", type: "electricity", coverage: "Ibadan, Oyo, Ogun, Osun" },
      { name: "Port Harcourt Electricity Distribution (PHED)", type: "electricity", coverage: "Port Harcourt, Rivers, Bayelsa" },
      { name: "Kano Electricity Distribution (KEDCO)", type: "electricity", coverage: "Kano, Katsina, Jigawa" },
    ],
    water: [
      { name: "Lagos Water Corporation", type: "water", coverage: "Lagos" },
      { name: "Abuja Water Board", type: "water", coverage: "Abuja" },
    ],
    tv: [
      {
        name: "DStv Nigeria",
        type: "satellite-tv",
        packages: [
          { name: "DStv Padi", price: 4400, currency: "NGN" },
          { name: "DStv Yanga", price: 6000, currency: "NGN" },
          { name: "DStv Compact", price: 12500, currency: "NGN" },
          { name: "DStv Compact Plus", price: 19700, currency: "NGN" },
          { name: "DStv Premium", price: 37500, currency: "NGN" },
        ],
      },
      {
        name: "GOtv Nigeria",
        type: "satellite-tv",
        packages: [
          { name: "GOtv Smallie", price: 1900, currency: "NGN" },
          { name: "GOtv Jinja", price: 3900, currency: "NGN" },
          { name: "GOtv Jolli", price: 5600, currency: "NGN" },
          { name: "GOtv Max", price: 8500, currency: "NGN" },
          { name: "GOtv Supa", price: 11000, currency: "NGN" },
        ],
      },
      {
        name: "StarTimes Nigeria",
        type: "satellite-tv",
        packages: [
          { name: "Nova", price: 1900, currency: "NGN" },
          { name: "Basic", price: 3700, currency: "NGN" },
          { name: "Smart", price: 5800, currency: "NGN" },
          { name: "Super", price: 9300, currency: "NGN" },
        ],
      },
    ],
    insurance: [
      { name: "AXA Mansard", type: "insurance", services: ["Health", "Auto", "Life", "Investments"] },
      { name: "Leadway Assurance", type: "insurance", services: ["Health", "Auto", "Life", "Property", "Travel"] },
      { name: "AIICO Insurance", type: "insurance", services: ["Health", "Auto", "Life", "Annuity"] },
      { name: "Cornerstone Insurance", type: "insurance", services: ["Auto", "Health", "Property"] },
    ],
    government: [
      { name: "FIRS (Federal Inland Revenue Service)", type: "tax", services: ["Income Tax", "VAT", "Withholding Tax", "Company Tax"] },
      { name: "LIRS (Lagos Internal Revenue Service)", type: "tax", services: ["Personal Income Tax", "Land Use Charge", "Withholding Tax"] },
      { name: "JAMB", type: "exam", services: ["UTME", "Direct Entry"] },
      { name: "WAEC", type: "exam", services: ["WASSCE"] },
    ],
  },

  // ========================================================================
  // GH — Ghana
  // ========================================================================
  GH: {
    transport: [
      { name: "Uber", type: "ride-hailing", cities: ["Accra", "Kumasi", "Takoradi"] },
      { name: "Bolt", type: "ride-hailing", cities: ["Accra", "Kumasi", "Takoradi", "Tamale"] },
      { name: "Yango", type: "ride-hailing", cities: ["Accra", "Kumasi"] },
      { name: "Metro Mass Transit", type: "bus", cities: ["Accra", "Kumasi", "Tamale", "Takoradi"] },
      { name: "STC (State Transport Corporation)", type: "intercity-bus", cities: ["Accra", "Kumasi", "Takoradi", "Tamale"] },
      { name: "VIP JEOUN", type: "intercity-bus", cities: ["Accra", "Kumasi", "Takoradi"] },
    ],
    restaurants: [
      { name: "Papaye Fast Food", type: "fast-food", cities: ["Accra"] },
      { name: "KFC Ghana", type: "fast-food", cities: ["Accra", "Kumasi", "Takoradi"] },
      { name: "Barcelos", type: "fast-food", cities: ["Accra", "Kumasi"] },
      { name: "Chicken Inn", type: "fast-food", cities: ["Accra", "Kumasi"] },
      { name: "Pizza Hut Ghana", type: "fast-food", cities: ["Accra"] },
    ],
    supermarkets: [
      { name: "Melcom", type: "supermarket", cities: ["Accra", "Kumasi", "Takoradi", "Tamale"] },
      { name: "MaxMart", type: "supermarket", cities: ["Accra"] },
      { name: "Shoprite Ghana", type: "supermarket", cities: ["Accra", "Kumasi"] },
      { name: "Palace Supermarket", type: "supermarket", cities: ["Accra"] },
      { name: "Koala Supermarket", type: "supermarket", cities: ["Accra"] },
    ],
    hospitals: [
      { name: "Korle Bu Teaching Hospital", type: "public", cities: ["Accra"] },
      { name: "Komfo Anokye Teaching Hospital", type: "public", cities: ["Kumasi"] },
      { name: "37 Military Hospital", type: "public", cities: ["Accra"] },
      { name: "Nyaho Medical Centre", type: "private", cities: ["Accra"] },
      { name: "Trust Hospital", type: "private", cities: ["Accra"] },
    ],
    pharmacies: [
      { name: "Ernest Chemist", type: "pharmacy", cities: ["Accra", "Kumasi", "Takoradi"] },
      { name: "Top Up Pharmacy", type: "pharmacy", cities: ["Accra", "Kumasi"] },
      { name: "Omega Pharmacy", type: "pharmacy", cities: ["Accra"] },
      { name: "Bester Pharmacy", type: "pharmacy", cities: ["Accra", "Kumasi"] },
    ],
    internetProviders: [
      {
        name: "MTN Ghana",
        type: "mobile-data",
        plans: [
          { name: "Daily 1GB", price: 5, currency: "GHS" },
          { name: "Weekly 5GB", price: 25, currency: "GHS" },
          { name: "Monthly 18GB", price: 100, currency: "GHS" },
          { name: "Monthly 50GB", price: 200, currency: "GHS" },
          { name: "Monthly 110GB", price: 350, currency: "GHS" },
        ],
      },
      {
        name: "Telecel Ghana (ex-Vodafone)",
        type: "mobile-data",
        plans: [
          { name: "Daily 1.5GB", price: 5, currency: "GHS" },
          { name: "Weekly 6GB", price: 20, currency: "GHS" },
          { name: "Monthly 30GB", price: 150, currency: "GHS" },
          { name: "Monthly 120GB", price: 350, currency: "GHS" },
        ],
      },
      {
        name: "AirtelTigo",
        type: "mobile-data",
        plans: [
          { name: "Daily 1GB", price: 5, currency: "GHS" },
          { name: "Weekly 6GB", price: 25, currency: "GHS" },
          { name: "Monthly 22GB", price: 100, currency: "GHS" },
        ],
      },
      {
        name: "Surfline Communications",
        type: "broadband",
        plans: [
          { name: "Home 25GB", price: 120, currency: "GHS" },
          { name: "Home 60GB", price: 250, currency: "GHS" },
          { name: "Unlimited", price: 350, currency: "GHS" },
        ],
      },
      {
        name: "Vodafone Fixed Broadband",
        type: "broadband",
        plans: [
          { name: "Fibre 15Mbps", price: 199, currency: "GHS" },
          { name: "Fibre 30Mbps", price: 299, currency: "GHS" },
          { name: "Fibre 60Mbps", price: 449, currency: "GHS" },
        ],
      },
    ],
    universities: [
      { name: "University of Ghana (Legon)", type: "public", city: "Accra", tuitionRange: "GH₵2,000 – GH₵6,000/yr" },
      { name: "Kwame Nkrumah University of Science and Technology (KNUST)", type: "public", city: "Kumasi", tuitionRange: "GH₵2,500 – GH₵7,000/yr" },
      { name: "University of Cape Coast (UCC)", type: "public", city: "Cape Coast", tuitionRange: "GH₵2,000 – GH₵5,500/yr" },
      { name: "Ashesi University", type: "private", city: "Berekuso", tuitionRange: "GH₵35,000 – GH₵50,000/yr" },
      { name: "GIMPA (Ghana Institute of Management and Public Administration)", type: "public", city: "Accra", tuitionRange: "GH₵8,000 – GH₵20,000/yr" },
    ],
    fuelStations: [
      { name: "Goil", type: "fuel", cities: ["All cities"] },
      { name: "TotalEnergies Ghana", type: "fuel", cities: ["All cities"] },
      { name: "Shell Vivo Energy Ghana", type: "fuel", cities: ["All cities"] },
      { name: "Star Oil", type: "fuel", cities: ["Accra", "Kumasi", "Takoradi"] },
      { name: "Allied Oil", type: "fuel", cities: ["Accra", "Kumasi"] },
    ],
    electricity: [
      { name: "Electricity Company of Ghana (ECG)", type: "electricity", coverage: "Southern Ghana (Accra, Kumasi, Takoradi)" },
      { name: "Northern Electricity Distribution Company (NEDCO)", type: "electricity", coverage: "Northern Ghana (Tamale, Bolgatanga, Wa)" },
      { name: "Enclave Power", type: "electricity", coverage: "Industrial enclaves" },
    ],
    water: [
      { name: "Ghana Water Company Limited (GWCL)", type: "water", coverage: "Nationwide urban" },
    ],
    tv: [
      {
        name: "DStv Ghana",
        type: "satellite-tv",
        packages: [
          { name: "DStv Access", price: 25, currency: "GHS" },
          { name: "DStv Family", price: 50, currency: "GHS" },
          { name: "DStv Compact", price: 105, currency: "GHS" },
          { name: "DStv Compact Plus", price: 170, currency: "GHS" },
          { name: "DStv Premium", price: 320, currency: "GHS" },
        ],
      },
      {
        name: "GOtv Ghana",
        type: "satellite-tv",
        packages: [
          { name: "GOtv Lite", price: 15, currency: "GHS" },
          { name: "GOtv Value", price: 32, currency: "GHS" },
          { name: "GOtv Plus", price: 50, currency: "GHS" },
          { name: "GOtv Max", price: 85, currency: "GHS" },
        ],
      },
      {
        name: "Multi TV (SABC)",
        type: "satellite-tv",
        packages: [
          { name: "Free-to-air", price: 0, currency: "GHS" },
        ],
      },
    ],
    insurance: [
      { name: "Enterprise Life", type: "insurance", services: ["Life", "Health", "Investments"] },
      { name: "SIC Insurance", type: "insurance", services: ["Auto", "Health", "Property", "Marine"] },
      { name: "Hollard Ghana", type: "insurance", services: ["Auto", "Life", "Health", "Property"] },
      { name: "Metropolitan Life", type: "insurance", services: ["Life", "Health", "Funeral"] },
    ],
    government: [
      { name: "Ghana Revenue Authority (GRA)", type: "tax", services: ["Income Tax", "VAT", "PAYE", "Customs Duties"] },
      { name: "National Health Insurance Authority (NHIA)", type: "social-security", services: ["NHIS membership"] },
      { name: "SSNIT (Social Security and National Insurance Trust)", type: "social-security", services: ["Pension", "Invalidity", "Survivors"] },
    ],
  },

  // ========================================================================
  // CM — Cameroon
  // ========================================================================
  CM: {
    transport: [
      { name: "Bolt Cameroon", type: "ride-hailing", cities: ["Yaoundé", "Douala", "Bafoussam", "Bamenda"] },
      { name: "Yango", type: "ride-hailing", cities: ["Yaoundé", "Douala"] },
      { name: "Taxi Verts", type: "taxi", cities: ["Yaoundé", "Douala"] },
      { name: "STAO (Société de Transport Automobile d'Ohandja)", type: "bus", cities: ["Yaoundé", "Douala"] },
      { name: "Touristique Express", type: "intercity-bus", cities: ["Yaoundé", "Douala", "Bafoussam", "Bamenda", "Buea"] },
      { name: "Agences de voyage (Binam, Van Van)", type: "intercity-bus", cities: ["Yaoundé", "Douala", "Bafoussam", "Garoua", "Bamenda"] },
    ],
    restaurants: [
      { name: "Biggady", type: "fast-food", cities: ["Yaoundé", "Douala"] },
      { name: "Salon de Thé le Dôme", type: "restaurant", cities: ["Yaoundé"] },
      { name: "Aristocrat Bar Restaurant", type: "restaurant", cities: ["Yaoundé", "Douala"] },
      { name: "Buffalo Grill", type: "restaurant", cities: ["Douala"] },
      { name: "Häagen-Dazs Douala", type: "café", cities: ["Douala"] },
    ],
    supermarkets: [
      { name: "Casino (Groupe Doumbe)", type: "supermarket", cities: ["Yaoundé", "Douala"] },
      { name: "Boulangerie de l'Ouest", type: "supermarket", cities: ["Bafoussam"] },
      { name: "Mahima Supermarché", type: "supermarket", cities: ["Yaoundé", "Douala"] },
      { name: "Score Supermarché", type: "supermarket", cities: ["Yaoundé", "Douala"] },
      { name: "Carrefour Bonanjo", type: "supermarket", cities: ["Douala"] },
    ],
    hospitals: [
      { name: "Centre Hospitalier Universitaire (CHU) Yaoundé", type: "public", cities: ["Yaoundé"] },
      { name: "Hôpital Général de Yaoundé", type: "public", cities: ["Yaoundé"] },
      { name: "Hôpital Laquintinie de Douala", type: "public", cities: ["Douala"] },
      { name: "Clinique de l'Aéroport", type: "private", cities: ["Douala"] },
      { name: "Polyclinique Bastos", type: "private", cities: ["Yaoundé"] },
    ],
    pharmacies: [
      { name: "Pharmacie du Centre", type: "pharmacy", cities: ["Yaoundé"] },
      { name: "Pharmacie de l'Aéroport", type: "pharmacy", cities: ["Douala"] },
      { name: "Pharmacie Étoile", type: "pharmacy", cities: ["Yaoundé", "Douala"] },
      { name: "Pharmacie Bonanjo", type: "pharmacy", cities: ["Douala"] },
    ],
    internetProviders: [
      {
        name: "MTN Cameroon",
        type: "mobile-data",
        plans: [
          { name: "Daily 200MB", price: 200, currency: "XAF" },
          { name: "Weekly 2GB", price: 2000, currency: "XAF" },
          { name: "Monthly 10GB", price: 10000, currency: "XAF" },
          { name: "Monthly 50GB", price: 25000, currency: "XAF" },
        ],
      },
      {
        name: "Orange Cameroun",
        type: "mobile-data",
        plans: [
          { name: "Daily 200MB", price: 200, currency: "XAF" },
          { name: "Weekly 2GB", price: 2000, currency: "XAF" },
          { name: "Monthly 12GB", price: 10000, currency: "XAF" },
          { name: "Monthly 65GB", price: 30000, currency: "XAF" },
        ],
      },
      {
        name: "Camtel (Nexttel)",
        type: "mobile-data",
        plans: [
          { name: "Daily 300MB", price: 200, currency: "XAF" },
          { name: "Weekly 3GB", price: 2500, currency: "XAF" },
          { name: "Monthly 15GB", price: 12000, currency: "XAF" },
          { name: "Monthly 60GB", price: 30000, currency: "XAF" },
        ],
      },
      {
        name: "Yoomee (Camtel fixed)",
        type: "broadband",
        plans: [
          { name: "Home 10Mbps", price: 25000, currency: "XAF" },
          { name: "Home 20Mbps", price: 45000, currency: "XAF" },
        ],
      },
    ],
    universities: [
      { name: "Université de Yaoundé I", type: "public", city: "Yaoundé", tuitionRange: "FCFA 50,000 – FCFA 150,000/yr" },
      { name: "Université de Yaoundé II (Ngoa-Ekellé)", type: "public", city: "Yaoundé", tuitionRange: "FCFA 50,000 – FCFA 200,000/yr" },
      { name: "Université de Douala", type: "public", city: "Douala", tuitionRange: "FCFA 60,000 – FCFA 180,000/yr" },
      { name: "Université de Buea", type: "public", city: "Buea", tuitionRange: "FCFA 50,000 – FCFA 150,000/yr" },
      { name: "Catholic University of Cameroon (CATUC)", type: "private", city: "Bamenda", tuitionRange: "FCFA 600,000 – FCFA 1,200,000/yr" },
    ],
    fuelStations: [
      { name: "TotalEnergies Cameroun", type: "fuel", cities: ["All cities"] },
      { name: "Tradex (SNH group)", type: "fuel", cities: ["Yaoundé", "Douala", "Bafoussam", "Garoua"] },
      { name: "Bolloré Energy Cameroun", type: "fuel", cities: ["Yaoundé", "Douala"] },
      { name: "Goil Cameroun", type: "fuel", cities: ["Yaoundé", "Douala"] },
    ],
    electricity: [
      { name: "ENEO Cameroun", type: "electricity", coverage: "Nationwide (urban)" },
      { name: "EDC (Electricity Development Corporation)", type: "electricity", coverage: "Generation and transmission" },
    ],
    water: [
      { name: "CAMWATER (Cameroon Water Utilities Corporation)", type: "water", coverage: "Nationwide urban" },
    ],
    tv: [
      {
        name: "Canal+ Cameroun",
        type: "satellite-tv",
        packages: [
          { name: "Access", price: 9900, currency: "XAF" },
          { name: "Evolution", price: 14900, currency: "XAF" },
          { name: "Tout-Canal", price: 29900, currency: "XAF" },
        ],
      },
      {
        name: "DStv Cameroun",
        type: "satellite-tv",
        packages: [
          { name: "DStv Access", price: 5500, currency: "XAF" },
          { name: "DStv Family", price: 9900, currency: "XAF" },
          { name: "DStv Compact", price: 17500, currency: "XAF" },
          { name: "DStv Premium", price: 45000, currency: "XAF" },
        ],
      },
      {
        name: "CRTV (national broadcaster)",
        type: "cable-tv",
        packages: [
          { name: "Free-to-air", price: 0, currency: "XAF" },
        ],
      },
    ],
    insurance: [
      { name: "Activa Assurances Cameroun", type: "insurance", services: ["Health", "Auto", "Property", "Life"] },
      { name: "AXA Cameroun", type: "insurance", services: ["Health", "Auto", "Property", "Life"] },
      { name: "Saham Assurances Cameroun", type: "insurance", services: ["Auto", "Health", "Property"] },
    ],
    government: [
      { name: "Direction Générale des Impôts (DGI) Cameroun", type: "tax", services: ["Impôt sur le Revenu", "TVA", "Retenue à la Source"] },
      { name: "CNPS (Caisse Nationale de Prévoyance Sociale)", type: "social-security", services: ["Pensions", "Allocations familiales", "Risques professionnels"] },
      { name: "MINFI (Ministère des Finances)", type: "tax", services: ["Customs", "Land Tax"] },
    ],
  },

  // ========================================================================
  // CI — Côte d'Ivoire
  // ========================================================================
  CI: {
    transport: [
      { name: "Yango", type: "ride-hailing", cities: ["Abidjan", "Yamoussoukro", "Bouaké"] },
      { name: "Heetch", type: "ride-hailing", cities: ["Abidjan"] },
      { name: "SOTRA (Société de Transport Abidjanais)", type: "bus", cities: ["Abidjan"] },
      { name: "UTB (Union des Transports de Bouaké)", type: "intercity-bus", cities: ["Abidjan", "Bouaké", "Yamoussoukro", "Korhogo"] },
      { name: "STC (Société des Transports Communaux)", type: "bus", cities: ["Abidjan"] },
    ],
    restaurants: [
      { name: "KFC Côte d'Ivoire", type: "fast-food", cities: ["Abidjan"] },
      { name: "Pizza Hut Abidjan", type: "fast-food", cities: ["Abidjan"] },
      { name: "La Plage", type: "restaurant", cities: ["Abidjan"] },
      { name: "Le Nid", type: "restaurant", cities: ["Abidjan", "Yamoussoukro"] },
      { name: "Café de Versailles", type: "restaurant", cities: ["Abidjan"] },
    ],
    supermarkets: [
      { name: "Carrefour Côte d'Ivoire (Céfa)", type: "supermarket", cities: ["Abidjan"] },
      { name: "Casino Côte d'Ivoire", type: "supermarket", cities: ["Abidjan", "Bouaké"] },
      { name: "CDCI (Compagnie de Distribution Côte d'Ivoire)", type: "supermarket", cities: ["Abidjan"] },
      { name: "Prosuma", type: "supermarket", cities: ["Abidjan", "Yamoussoukro"] },
      { name: "Super U Côte d'Ivoire", type: "supermarket", cities: ["Abidjan"] },
    ],
    hospitals: [
      { name: "CHU de Cocody", type: "public", cities: ["Abidjan"] },
      { name: "CHU de Treichville", type: "public", cities: ["Abidjan"] },
      { name: "Polyclinique Internationale Sainte-Anne-Marie (PISAM)", type: "private", cities: ["Abidjan"] },
      { name: "Clinique Claude-Antoine", type: "private", cities: ["Bouaké"] },
    ],
    pharmacies: [
      { name: "Pharmacie de la Riviera", type: "pharmacy", cities: ["Abidjan"] },
      { name: "Pharmacie des Deux Plateaux", type: "pharmacy", cities: ["Abidjan"] },
      { name: "Pharmacie du Plateau", type: "pharmacy", cities: ["Abidjan"] },
      { name: "Pharmacie Centrale de Bouaké", type: "pharmacy", cities: ["Bouaké"] },
    ],
    internetProviders: [
      {
        name: "Orange Côte d'Ivoire",
        type: "mobile-data",
        plans: [
          { name: "Journalier 200MB", price: 200, currency: "XOF" },
          { name: "Hebdo 2GB", price: 2000, currency: "XOF" },
          { name: "Mensuel 10GB", price: 10000, currency: "XOF" },
          { name: "Mensuel 70GB", price: 35000, currency: "XOF" },
        ],
      },
      {
        name: "MTN Côte d'Ivoire",
        type: "mobile-data",
        plans: [
          { name: "Journalier 200MB", price: 200, currency: "XOF" },
          { name: "Hebdo 2GB", price: 2000, currency: "XOF" },
          { name: "Mensuel 12GB", price: 11000, currency: "XOF" },
          { name: "Mensuel 80GB", price: 40000, currency: "XOF" },
        ],
      },
      {
        name: "Moov Africa Côte d'Ivoire",
        type: "mobile-data",
        plans: [
          { name: "Journalier 200MB", price: 200, currency: "XOF" },
          { name: "Hebdo 2GB", price: 2000, currency: "XOF" },
          { name: "Mensuel 12GB", price: 10000, currency: "XOF" },
          { name: "Mensuel 60GB", price: 30000, currency: "XOF" },
        ],
      },
      {
        name: "Orange Business Côte d'Ivoire ( fibre)",
        type: "broadband",
        plans: [
          { name: "Fibre 100Mbps", price: 40000, currency: "XOF" },
          { name: "Fibre 200Mbps", price: 65000, currency: "XOF" },
        ],
      },
    ],
    universities: [
      { name: "Université Félix Houphouët-Boigny", type: "public", city: "Abidjan", tuitionRange: "FCFA 50,000 – FCFA 200,000/yr" },
      { name: "Université Alassane Ouattara", type: "public", city: "Bouaké", tuitionRange: "FCFA 50,000 – FCFA 180,000/yr" },
      { name: "INP-HB (Institut National Polytechnique)", type: "public", city: "Yamoussoukro", tuitionRange: "FCFA 800,000 – FCFA 1,200,000/yr" },
      { name: "Université Nangui Abrogoua", type: "public", city: "Abidjan", tuitionRange: "FCFA 60,000 – FCFA 200,000/yr" },
    ],
    fuelStations: [
      { name: "TotalEnergies Côte d'Ivoire", type: "fuel", cities: ["All cities"] },
      { name: "Pétro Ivoire", type: "fuel", cities: ["All cities"] },
      { name: "Shell Vivo CI", type: "fuel", cities: ["Abidjan", "Bouaké", "Yamoussoukro"] },
      { name: "MRS CI", type: "fuel", cities: ["Abidjan", "Bouaké"] },
    ],
    electricity: [
      { name: "CIE (Compagnie Ivoirienne d'Électricité)", type: "electricity", coverage: "Nationwide" },
      { name: "CIPREL (Compagnie Ivoirienne de Production d'Électricité)", type: "electricity", coverage: "Generation" },
    ],
    water: [
      { name: "SODECI (Société de Distribution d'Eau de la Côte d'Ivoire)", type: "water", coverage: "Nationwide urban" },
    ],
    tv: [
      {
        name: "Canal+ Côte d'Ivoire",
        type: "satellite-tv",
        packages: [
          { name: "Access", price: 9900, currency: "XOF" },
          { name: "Evolution", price: 14900, currency: "XOF" },
          { name: "Tout-Canal", price: 29900, currency: "XOF" },
        ],
      },
      {
        name: "DStv Côte d'Ivoire",
        type: "satellite-tv",
        packages: [
          { name: "DStv Access", price: 5500, currency: "XOF" },
          { name: "DStv Family", price: 9900, currency: "XOF" },
          { name: "DStv Compact", price: 17500, currency: "XOF" },
          { name: "DStv Premium", price: 45000, currency: "XOF" },
        ],
      },
      {
        name: "RTI (Radiodiffusion Télévision Ivoirienne)",
        type: "cable-tv",
        packages: [
          { name: "Free-to-air", price: 0, currency: "XOF" },
        ],
      },
    ],
    insurance: [
      { name: "NSIA Assurances Côte d'Ivoire", type: "insurance", services: ["Health", "Auto", "Life", "Property"] },
      { name: "AXA Côte d'Ivoire", type: "insurance", services: ["Health", "Auto", "Property"] },
      { name: "Allianz Côte d'Ivoire", type: "insurance", services: ["Auto", "Health", "Life"] },
    ],
    government: [
      { name: "Direction Générale des Impôts (DGI) CI", type: "tax", services: ["Impôt sur le Revenu", "TVA", "Droits d'enregistrement"] },
      { name: "CNPS Côte d'Ivoire", type: "social-security", services: ["Pensions", "Allocations familiales", "Risques professionnels"] },
      { name: "Douanes Ivoiriennes", type: "customs", services: ["Droits de douane", "TVA import"] },
    ],
  },

  // ========================================================================
  // SN — Senegal
  // ========================================================================
  SN: {
    transport: [
      { name: "Yango Sénégal", type: "ride-hailing", cities: ["Dakar", "Thiès", "Mbour"] },
      { name: "Heetch Sénégal", type: "ride-hailing", cities: ["Dakar"] },
      { name: "Dakar Dem Dikk (DDD)", type: "bus", cities: ["Dakar"] },
      { name: "Tata Sénégal", type: "intercity-bus", cities: ["Dakar", "Thiès", "Saint-Louis", "Touba"] },
      { name: "Taxi Jaune (Tata Bus)", type: "intercity-bus", cities: ["Dakar", "Touba", "Kaolack"] },
    ],
    restaurants: [
      { name: "KFC Dakar", type: "fast-food", cities: ["Dakar"] },
      { name: "Le Mermoz", type: "restaurant", cities: ["Dakar"] },
      { name: "Chez Loutcha", type: "restaurant", cities: ["Dakar"] },
      { name: "La Tabaski", type: "restaurant", cities: ["Dakar"] },
      { name: "Le Khaymandar", type: "restaurant", cities: ["Dakar"] },
    ],
    supermarkets: [
      { name: "Auchan Sénégal", type: "supermarket", cities: ["Dakar", "Thiès"] },
      { name: "Casino Sénégal", type: "supermarket", cities: ["Dakar"] },
      { name: "Leader Price Sénégal", type: "supermarket", cities: ["Dakar"] },
      { name: "Citydia Sénégal", type: "supermarket", cities: ["Dakar", "Thiès"] },
      { name: "Promocash", type: "supermarket", cities: ["Dakar"] },
    ],
    hospitals: [
      { name: "Hôpital Principal de Dakar", type: "public", cities: ["Dakar"] },
      { name: "Hôpital Aristide Le Dantec", type: "public", cities: ["Dakar"] },
      { name: "CHU de Fann", type: "public", cities: ["Dakar"] },
      { name: "Clinique du Cap", type: "private", cities: ["Dakar"] },
    ],
    pharmacies: [
      { name: "Pharmacie de la Médina", type: "pharmacy", cities: ["Dakar"] },
      { name: "Pharmacie du Plateau", type: "pharmacy", cities: ["Dakar"] },
      { name: "Pharmacie de l'Étoile", type: "pharmacy", cities: ["Dakar"] },
      { name: "Pharmacie de Thiès", type: "pharmacy", cities: ["Thiès"] },
    ],
    internetProviders: [
      {
        name: "Orange Sénégal",
        type: "mobile-data",
        plans: [
          { name: "Journalier 200MB", price: 200, currency: "XOF" },
          { name: "Hebdo 2GB", price: 2000, currency: "XOF" },
          { name: "Mensuel 10GB", price: 10000, currency: "XOF" },
          { name: "Mensuel 70GB", price: 35000, currency: "XOF" },
        ],
      },
      {
        name: "Free Sénégal",
        type: "mobile-data",
        plans: [
          { name: "Journalier 200MB", price: 200, currency: "XOF" },
          { name: "Hebdo 2GB", price: 2000, currency: "XOF" },
          { name: "Mensuel 12GB", price: 11000, currency: "XOF" },
          { name: "Mensuel 60GB", price: 30000, currency: "XOF" },
        ],
      },
      {
        name: "Expresso Sénégal",
        type: "mobile-data",
        plans: [
          { name: "Journalier 200MB", price: 200, currency: "XOF" },
          { name: "Mensuel 10GB", price: 10000, currency: "XOF" },
          { name: "Mensuel 50GB", price: 25000, currency: "XOF" },
        ],
      },
      {
        name: "Orange Fixe ( fibre)",
        type: "broadband",
        plans: [
          { name: "Fibre 100Mbps", price: 35000, currency: "XOF" },
          { name: "Fibre 200Mbps", price: 55000, currency: "XOF" },
        ],
      },
    ],
    universities: [
      { name: "Université Cheikh Anta Diop (UCAD)", type: "public", city: "Dakar", tuitionRange: "FCFA 50,000 – FCFA 200,000/yr" },
      { name: "Université Gaston Berger (UGB)", type: "public", city: "Saint-Louis", tuitionRange: "FCFA 60,000 – FCFA 200,000/yr" },
      { name: "Université Virtuelle du Sénégal (UVS)", type: "public", city: "Dakar", tuitionRange: "FCFA 100,000 – FCFA 250,000/yr" },
      { name: "Université Iba Der Thiam (Thiès)", type: "public", city: "Thiès", tuitionRange: "FCFA 50,000 – FCFA 200,000/yr" },
    ],
    fuelStations: [
      { name: "TotalEnergies Sénégal", type: "fuel", cities: ["All cities"] },
      { name: "Pétroline", type: "fuel", cities: ["Dakar", "Thiès", "Touba"] },
      { name: "Oilcom Sénégal", type: "fuel", cities: ["Dakar", "Thiès"] },
      { name: "Elton Oil", type: "fuel", cities: ["Dakar", "Kaolack"] },
    ],
    electricity: [
      { name: "SENELEC (Société Nationale d'Électricité du Sénégal)", type: "electricity", coverage: "Nationwide" },
    ],
    water: [
      { name: "SDE (Sénégalaise des Eaux)", type: "water", coverage: "Nationwide urban" },
    ],
    tv: [
      {
        name: "Canal+ Sénégal",
        type: "satellite-tv",
        packages: [
          { name: "Access", price: 9900, currency: "XOF" },
          { name: "Evolution", price: 14900, currency: "XOF" },
          { name: "Tout-Canal", price: 29900, currency: "XOF" },
        ],
      },
      {
        name: "DStv Sénégal",
        type: "satellite-tv",
        packages: [
          { name: "DStv Access", price: 5500, currency: "XOF" },
          { name: "DStv Family", price: 9900, currency: "XOF" },
          { name: "DStv Compact", price: 17500, currency: "XOF" },
          { name: "DStv Premium", price: 45000, currency: "XOF" },
        ],
      },
      {
        name: "2S TV / TFM (RTS)",
        type: "cable-tv",
        packages: [
          { name: "Free-to-air", price: 0, currency: "XOF" },
        ],
      },
    ],
    insurance: [
      { name: "NSIA Assurances Sénégal", type: "insurance", services: ["Health", "Auto", "Life", "Property"] },
      { name: "Allianz Sénégal", type: "insurance", services: ["Health", "Auto", "Property"] },
      { name: "SUNU Assurances", type: "insurance", services: ["Health", "Auto", "Life", "Education"] },
    ],
    government: [
      { name: "Direction Générale des Impôts et des Domaines (DGID) Sénégal", type: "tax", services: ["Impôt sur le Revenu", "TVA", "Taxe foncière"] },
      { name: "IPM (Impôt et Patente Mensuelle)", type: "tax", services: ["Patente", "Impôt forfaitaire"] },
      { name: "CSS (Caisse de Sécurité Sociale)", type: "social-security", services: ["Pensions", "Allocations familiales", "Risques professionnels"] },
    ],
  },

  // ========================================================================
  // KE — Kenya
  // ========================================================================
  KE: {
    transport: [
      { name: "Uber Kenya", type: "ride-hailing", cities: ["Nairobi", "Mombasa", "Kisumu", "Nakuru"] },
      { name: "Bolt Kenya", type: "ride-hailing", cities: ["Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret"] },
      { name: "Little Cab", type: "ride-hailing", cities: ["Nairobi", "Mombasa"] },
      { name: "Matatu (paratransit)", type: "bus", cities: ["Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret"] },
      { name: "SWVL Kenya", type: "bus", cities: ["Nairobi"] },
      { name: "hAUKenya", type: "ride-hailing", cities: ["Nairobi"] },
    ],
    restaurants: [
      { name: "Java House", type: "restaurant", cities: ["Nairobi", "Mombasa", "Kisumu", "Eldoret"] },
      { name: "KFC Kenya", type: "fast-food", cities: ["Nairobi", "Mombasa", "Kisumu"] },
      { name: "Chicken Inn Kenya", type: "fast-food", cities: ["Nairobi", "Mombasa"] },
      { name: "Steers Kenya", type: "fast-food", cities: ["Nairobi", "Mombasa"] },
      { name: "Wimpy Kenya", type: "fast-food", cities: ["Nairobi"] },
      { name: "CJ's", type: "restaurant", cities: ["Nairobi"] },
    ],
    supermarkets: [
      { name: "Naivas", type: "supermarket", cities: ["Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret"] },
      { name: "Carrefour Kenya", type: "supermarket", cities: ["Nairobi", "Mombasa"] },
      { name: "Quickmart", type: "supermarket", cities: ["Nairobi", "Nakuru", "Eldoret"] },
      { name: "Eastmart", type: "supermarket", cities: ["Nairobi"] },
      { name: "Chandarana Foodplus", type: "supermarket", cities: ["Nairobi", "Mombasa"] },
    ],
    hospitals: [
      { name: "Kenyatta National Hospital (KNH)", type: "public", cities: ["Nairobi"] },
      { name: "Mama Lucy Kibaki Hospital", type: "public", cities: ["Nairobi"] },
      { name: "Aga Khan Hospital Nairobi", type: "private", cities: ["Nairobi", "Kisumu"] },
      { name: "Nairobi Hospital", type: "private", cities: ["Nairobi"] },
      { name: "Karen Hospital", type: "private", cities: ["Nairobi"] },
      { name: "Coast General Hospital", type: "public", cities: ["Mombasa"] },
    ],
    pharmacies: [
      { name: "Goodlife Pharmacy", type: "pharmacy", cities: ["Nairobi", "Mombasa", "Kisumu", "Nakuru"] },
      { name: "Haltons Pharmacy", type: "pharmacy", cities: ["Nairobi", "Mombasa"] },
      { name: "Pharma Plus", type: "pharmacy", cities: ["Nairobi"] },
      { name: "Healthy U", type: "pharmacy", cities: ["Nairobi", "Mombasa"] },
    ],
    internetProviders: [
      {
        name: "Safaricom",
        type: "mobile-data",
        plans: [
          { name: "Daily 500MB", price: 49, currency: "KES" },
          { name: "Weekly 2GB", price: 200, currency: "KES" },
          { name: "Monthly 15GB", price: 1000, currency: "KES" },
          { name: "Monthly 50GB", price: 3000, currency: "KES" },
          { name: "Monthly 200GB", price: 6000, currency: "KES" },
        ],
      },
      {
        name: "Airtel Kenya",
        type: "mobile-data",
        plans: [
          { name: "Daily 500MB", price: 49, currency: "KES" },
          { name: "Weekly 2GB", price: 200, currency: "KES" },
          { name: "Monthly 15GB", price: 1000, currency: "KES" },
          { name: "Monthly 60GB", price: 3000, currency: "KES" },
        ],
      },
      {
        name: "Telkom Kenya",
        type: "mobile-data",
        plans: [
          { name: "Daily 500MB", price: 49, currency: "KES" },
          { name: "Weekly 5GB", price: 250, currency: "KES" },
          { name: "Monthly 20GB", price: 1500, currency: "KES" },
        ],
      },
      {
        name: "Faiba (JTL)",
        type: "broadband",
        plans: [
          { name: "Home 10Mbps", price: 2500, currency: "KES" },
          { name: "Home 20Mbps", price: 3400, currency: "KES" },
          { name: "Home 50Mbps", price: 5400, currency: "KES" },
        ],
      },
      {
        name: "Safaricom Home Internet",
        type: "broadband",
        plans: [
          { name: "Home 10Mbps", price: 2900, currency: "KES" },
          { name: "Home 40Mbps", price: 4100, currency: "KES" },
        ],
      },
    ],
    universities: [
      { name: "University of Nairobi (UoN)", type: "public", city: "Nairobi", tuitionRange: "KSh 70,000 – KSh 250,000/yr" },
      { name: "Kenyatta University (KU)", type: "public", city: "Nairobi", tuitionRange: "KSh 60,000 – KSh 200,000/yr" },
      { name: "Jomo Kenyatta University of Agriculture and Technology (JKUAT)", type: "public", city: "Juja", tuitionRange: "KSh 80,000 – KSh 220,000/yr" },
      { name: "Strathmore University", type: "private", city: "Nairobi", tuitionRange: "KSh 200,000 – KSh 400,000/yr" },
      { name: "United States International University Africa (USIU-A)", type: "private", city: "Nairobi", tuitionRange: "KSh 250,000 – KSh 500,000/yr" },
    ],
    fuelStations: [
      { name: "TotalEnergies Kenya", type: "fuel", cities: ["All cities"] },
      { name: "Shell Vivo Energy Kenya", type: "fuel", cities: ["All cities"] },
      { name: "Rubis Energy Kenya", type: "fuel", cities: ["Nairobi", "Mombasa", "Kisumu", "Nakuru"] },
      { name: "National Oil Corporation of Kenya (NOCK)", type: "fuel", cities: ["Nairobi", "Mombasa"] },
      { name: "Gulf Energy", type: "fuel", cities: ["Nairobi", "Mombasa"] },
    ],
    electricity: [
      { name: "Kenya Power (KPLC)", type: "electricity", coverage: "Nationwide" },
      { name: "Rural Electrification and Renewable Energy Corporation (REREC)", type: "electricity", coverage: "Rural grid" },
    ],
    water: [
      { name: "Nairobi City Water and Sewerage Company (NCWSC)", type: "water", coverage: "Nairobi" },
      { name: "Mombasa Water Supply and Sanitation Company (MWASS)", type: "water", coverage: "Mombasa" },
    ],
    tv: [
      {
        name: "DStv Kenya",
        type: "satellite-tv",
        packages: [
          { name: "DStv Access", price: 1300, currency: "KES" },
          { name: "DStv Family", price: 2100, currency: "KES" },
          { name: "DStv Compact", price: 3300, currency: "KES" },
          { name: "DStv Compact Plus", price: 4700, currency: "KES" },
          { name: "DStv Premium", price: 7900, currency: "KES" },
        ],
      },
      {
        name: "GOtv Kenya",
        type: "satellite-tv",
        packages: [
          { name: "GOtv Lite", price: 720, currency: "KES" },
          { name: "GOtv Value", price: 1100, currency: "KES" },
          { name: "GOtv Plus", price: 1450, currency: "KES" },
          { name: "GOtv Max", price: 1850, currency: "KES" },
        ],
      },
      {
        name: "Zuku TV (Wananchi)",
        type: "cable-tv",
        packages: [
          { name: "Zuku Classic", price: 1500, currency: "KES" },
          { name: "Zuku Premium", price: 2000, currency: "KES" },
        ],
      },
      {
        name: "StarTimes Kenya",
        type: "satellite-tv",
        packages: [
          { name: "Nova", price: 499, currency: "KES" },
          { name: "Basic", price: 999, currency: "KES" },
          { name: "Smart", price: 1499, currency: "KES" },
          { name: "Super", price: 1999, currency: "KES" },
        ],
      },
    ],
    insurance: [
      { name: "Jubilee Insurance Kenya", type: "insurance", services: ["Health", "Auto", "Life", "Travel"] },
      { name: "Britam Holdings", type: "insurance", services: ["Health", "Life", "Property", "Investments"] },
      { name: "CIC Insurance Group", type: "insurance", services: ["Health", "Auto", "Life", "Agriculture"] },
      { name: "UAP Old Mutual", type: "insurance", services: ["Health", "Life", "Auto", "Investments"] },
    ],
    government: [
      { name: "Kenya Revenue Authority (KRA)", type: "tax", services: ["PAYE", "VAT", "Corporate Tax", "Turnover Tax"] },
      { name: "NHIF (National Hospital Insurance Fund)", type: "social-security", services: ["Health insurance"] },
      { name: "NSSF (National Social Security Fund)", type: "social-security", services: ["Pension", "Invalidity", "Survivors"] },
    ],
  },

  // ========================================================================
  // UG — Uganda
  // ========================================================================
  UG: {
    transport: [
      { name: "Uber Uganda", type: "ride-hailing", cities: ["Kampala", "Entebbe", "Jinja"] },
      { name: "Bolt Uganda", type: "ride-hailing", cities: ["Kampala", "Entebbe", "Jinja"] },
      { name: "SafeBoda", type: "ride-hailing", cities: ["Kampala"] },
      { name: "Easy Matatu", type: "ride-hailing", cities: ["Kampala"] },
      { name: "Pioneer Easy Bus", type: "bus", cities: ["Kampala"] },
      { name: "Jaguar Executive Coaches", type: "intercity-bus", cities: ["Kampala", "Jinja", "Mbale", "Gulu"] },
    ],
    restaurants: [
      { name: "Café Javas", type: "restaurant", cities: ["Kampala", "Entebbe"] },
      { name: "Java House Uganda", type: "restaurant", cities: ["Kampala"] },
      { name: "KFC Uganda", type: "fast-food", cities: ["Kampala"] },
      { name: "Café Bourbon", type: "restaurant", cities: ["Kampala"] },
      { name: "The Iron Chef", type: "restaurant", cities: ["Kampala"] },
    ],
    supermarkets: [
      { name: "Carrefour Uganda (Majid Al Futtaim)", type: "supermarket", cities: ["Kampala"] },
      { name: "Capital Shoppers", type: "supermarket", cities: ["Kampala", "Entebbe"] },
      { name: "Quality Supermarket", type: "supermarket", cities: ["Kampala", "Jinja"] },
      { name: "Super Haido", type: "supermarket", cities: ["Kampala"] },
      { name: "Payless Supermarket", type: "supermarket", cities: ["Kampala"] },
    ],
    hospitals: [
      { name: "Mulago National Referral Hospital", type: "public", cities: ["Kampala"] },
      { name: "International Hospital Kampala (IHK)", type: "private", cities: ["Kampala"] },
      { name: "Nakasero Hospital", type: "private", cities: ["Kampala"] },
      { name: "Paragon Hospital", type: "private", cities: ["Kampala"] },
    ],
    pharmacies: [
      { name: "Abacus Pharma", type: "pharmacy", cities: ["Kampala", "Jinja"] },
      { name: "Guardian Pharmacy", type: "pharmacy", cities: ["Kampala"] },
      { name: "Medik Pharmacy", type: "pharmacy", cities: ["Kampala"] },
      { name: "Ridge Pharmacy", type: "pharmacy", cities: ["Kampala"] },
    ],
    internetProviders: [
      {
        name: "MTN Uganda",
        type: "mobile-data",
        plans: [
          { name: "Daily 500MB", price: 1500, currency: "UGX" },
          { name: "Weekly 3GB", price: 8000, currency: "UGX" },
          { name: "Monthly 15GB", price: 30000, currency: "UGX" },
          { name: "Monthly 50GB", price: 100000, currency: "UGX" },
        ],
      },
      {
        name: "Airtel Uganda",
        type: "mobile-data",
        plans: [
          { name: "Daily 500MB", price: 1500, currency: "UGX" },
          { name: "Weekly 3GB", price: 8000, currency: "UGX" },
          { name: "Monthly 15GB", price: 30000, currency: "UGX" },
          { name: "Monthly 60GB", price: 120000, currency: "UGX" },
        ],
      },
      {
        name: "UTL (Uganda Telecom)",
        type: "mobile-data",
        plans: [
          { name: "Daily 500MB", price: 1500, currency: "UGX" },
          { name: "Monthly 10GB", price: 25000, currency: "UGX" },
        ],
      },
      {
        name: "Roke Telkom",
        type: "broadband",
        plans: [
          { name: "Home 10Mbps", price: 110000, currency: "UGX" },
          { name: "Home 30Mbps", price: 220000, currency: "UGX" },
        ],
      },
    ],
    universities: [
      { name: "Makerere University", type: "public", city: "Kampala", tuitionRange: "USh 1.2M – USh 3M/yr" },
      { name: "Mbarara University of Science and Technology (MUST)", type: "public", city: "Mbarara", tuitionRange: "USh 1.5M – USh 3M/yr" },
      { name: "Kyambogo University", type: "public", city: "Kampala", tuitionRange: "USh 1M – USh 2.5M/yr" },
      { name: "Uganda Christian University (UCU)", type: "private", city: "Mukono", tuitionRange: "USh 2.5M – USh 5M/yr" },
      { name: "Uganda Martyrs University", type: "private", city: "Nkozi", tuitionRange: "USh 2M – USh 4M/yr" },
    ],
    fuelStations: [
      { name: "TotalEnergies Uganda", type: "fuel", cities: ["All cities"] },
      { name: "Shell Vivo Energy Uganda", type: "fuel", cities: ["All cities"] },
      { name: "Stabex International", type: "fuel", cities: ["Kampala", "Jinja", "Mbale"] },
      { name: "Hared Petroleum", type: "fuel", cities: ["Kampala"] },
    ],
    electricity: [
      { name: "Umeme Limited", type: "electricity", coverage: "Nationwide distribution" },
      { name: "UETCL (Uganda Electricity Transmission Company)", type: "electricity", coverage: "Transmission" },
    ],
    water: [
      { name: "National Water and Sewerage Corporation (NWSC)", type: "water", coverage: "Nationwide urban" },
    ],
    tv: [
      {
        name: "DStv Uganda",
        type: "satellite-tv",
        packages: [
          { name: "DStv Access", price: 28000, currency: "UGX" },
          { name: "DStv Family", price: 45000, currency: "UGX" },
          { name: "DStv Compact", price: 71000, currency: "UGX" },
          { name: "DStv Premium", price: 169000, currency: "UGX" },
        ],
      },
      {
        name: "GOtv Uganda",
        type: "satellite-tv",
        packages: [
          { name: "GOtv Lite", price: 15000, currency: "UGX" },
          { name: "GOtv Value", price: 24000, currency: "UGX" },
          { name: "GOtv Plus", price: 31000, currency: "UGX" },
          { name: "GOtv Max", price: 40000, currency: "UGX" },
        ],
      },
      {
        name: "StarTimes Uganda",
        type: "satellite-tv",
        packages: [
          { name: "Nova", price: 11000, currency: "UGX" },
          { name: "Basic", price: 22000, currency: "UGX" },
          { name: "Smart", price: 33000, currency: "UGX" },
        ],
      },
    ],
    insurance: [
      { name: "Jubilee Insurance Uganda", type: "insurance", services: ["Health", "Auto", "Life"] },
      { name: "UAP Old Mutual Uganda", type: "insurance", services: ["Health", "Life", "Auto", "Property"] },
      { name: "ICEA Lion Uganda", type: "insurance", services: ["Health", "Auto", "Life", "Property"] },
    ],
    government: [
      { name: "Uganda Revenue Authority (URA)", type: "tax", services: ["PAYE", "VAT", "Corporate Tax", "Withholding Tax"] },
      { name: "NSSF Uganda", type: "social-security", services: ["Pension", "Invalidity", "Survivors", "Age benefit"] },
    ],
  },

  // ========================================================================
  // TZ — Tanzania
  // ========================================================================
  TZ: {
    transport: [
      { name: "Uber Tanzania", type: "ride-hailing", cities: ["Dar es Salaam"] },
      { name: "Bolt Tanzania", type: "ride-hailing", cities: ["Dar es Salaam", "Arusha", "Mwanza", "Dodoma"] },
      { name: "Little Tanzania", type: "ride-hailing", cities: ["Dar es Salaam"] },
      { name: "Dala-dala (paratransit)", type: "bus", cities: ["Dar es Salaam", "Arusha", "Mwanza", "Dodoma"] },
      { name: "UDA (United Dar es Salaam Bus Co.)", type: "bus", cities: ["Dar es Salaam"] },
      { name: "Sumry (intercity coaches)", type: "intercity-bus", cities: ["Dar es Salaam", "Mbeya", "Mwanza", "Arusha"] },
    ],
    restaurants: [
      { name: "KFC Tanzania", type: "fast-food", cities: ["Dar es Salaam"] },
      { name: "Steers Tanzania", type: "fast-food", cities: ["Dar es Salaam", "Arusha"] },
      { name: "Chicken Inn Tanzania", type: "fast-food", cities: ["Dar es Salaam"] },
      { name: "Cape Town Fish Market", type: "restaurant", cities: ["Dar es Salaam"] },
      { name: "Samaki Samaki", type: "restaurant", cities: ["Dar es Salaam", "Arusha"] },
    ],
    supermarkets: [
      { name: "Shoprite Tanzania", type: "supermarket", cities: ["Dar es Salaam", "Arusha"] },
      { name: "Game Stores (Walmart)", type: "supermarket", cities: ["Dar es Salaam"] },
      { name: "Village Supermarket", type: "supermarket", cities: ["Dar es Salaam"] },
      { name: "Shoppers Supermarket", type: "supermarket", cities: ["Dar es Salaam", "Arusha"] },
      { name: "Ushindi Supermarket", type: "supermarket", cities: ["Dar es Salaam"] },
    ],
    hospitals: [
      { name: "Muhimbili National Hospital (MNH)", type: "public", cities: ["Dar es Salaam"] },
      { name: "Aga Khan Hospital Dar es Salaam", type: "private", cities: ["Dar es Salaam"] },
      { name: "TMJ Hospital", type: "private", cities: ["Dar es Salaam"] },
      { name: "Kilimanjaro Christian Medical Centre (KCMC)", type: "public", cities: ["Moshi"] },
    ],
    pharmacies: [
      { name: "AA Pharmacy", type: "pharmacy", cities: ["Dar es Salaam", "Arusha"] },
      { name: "Pharmascope", type: "pharmacy", cities: ["Dar es Salaam"] },
      { name: "Salama Pharmacy", type: "pharmacy", cities: ["Dar es Salaam"] },
      { name: "Sayansi Pharmacy", type: "pharmacy", cities: ["Dar es Salaam"] },
    ],
    internetProviders: [
      {
        name: "Vodacom Tanzania",
        type: "mobile-data",
        plans: [
          { name: "Daily 500MB", price: 1000, currency: "TZS" },
          { name: "Weekly 3GB", price: 5000, currency: "TZS" },
          { name: "Monthly 12GB", price: 15000, currency: "TZS" },
          { name: "Monthly 50GB", price: 50000, currency: "TZS" },
        ],
      },
      {
        name: "Airtel Tanzania",
        type: "mobile-data",
        plans: [
          { name: "Daily 500MB", price: 1000, currency: "TZS" },
          { name: "Weekly 3GB", price: 5000, currency: "TZS" },
          { name: "Monthly 12GB", price: 15000, currency: "TZS" },
          { name: "Monthly 60GB", price: 55000, currency: "TZS" },
        ],
      },
      {
        name: "Tigo Tanzania (Halotel group)",
        type: "mobile-data",
        plans: [
          { name: "Daily 500MB", price: 1000, currency: "TZS" },
          { name: "Weekly 3GB", price: 5000, currency: "TZS" },
          { name: "Monthly 15GB", price: 15000, currency: "TZS" },
        ],
      },
      {
        name: "Halotel",
        type: "mobile-data",
        plans: [
          { name: "Daily 500MB", price: 1000, currency: "TZS" },
          { name: "Monthly 12GB", price: 15000, currency: "TZS" },
        ],
      },
      {
        name: "TTCL (Tanzania Telecommunication Corporation)",
        type: "broadband",
        plans: [
          { name: "Home 10Mbps", price: 50000, currency: "TZS" },
          { name: "Home 30Mbps", price: 100000, currency: "TZS" },
        ],
      },
    ],
    universities: [
      { name: "University of Dar es Salaam (UDSM)", type: "public", city: "Dar es Salaam", tuitionRange: "TSh 1.2M – TSh 3M/yr" },
      { name: "Sokoine University of Agriculture (SUA)", type: "public", city: "Morogoro", tuitionRange: "TSh 1.3M – TSh 2.5M/yr" },
      { name: "Open University of Tanzania (OUT)", type: "public", city: "Dar es Salaam", tuitionRange: "TSh 800K – TSh 1.8M/yr" },
      { name: "University of Dodoma (UDOM)", type: "public", city: "Dodoma", tuitionRange: "TSh 1M – TSh 2.5M/yr" },
      { name: "St. Augustine University of Tanzania (SAUT)", type: "private", city: "Mwanza", tuitionRange: "TSh 1.5M – TSh 3M/yr" },
    ],
    fuelStations: [
      { name: "TotalEnergies Tanzania", type: "fuel", cities: ["All cities"] },
      { name: "Puma Energy Tanzania", type: "fuel", cities: ["All cities"] },
      { name: "Oryx Energies Tanzania", type: "fuel", cities: ["Dar es Salaam", "Mwanza", "Arusha"] },
      { name: "Camel Oil Tanzania", type: "fuel", cities: ["Dar es Salaam", "Mwanza"] },
    ],
    electricity: [
      { name: "TANESCO (Tanzania Electric Supply Company)", type: "electricity", coverage: "Nationwide" },
    ],
    water: [
      { name: "DAWASA (Dar es Salaam Water and Sewerage Authority)", type: "water", coverage: "Dar es Salaam" },
      { name: "DAWASA regional utilities", type: "water", coverage: "Other urban areas" },
    ],
    tv: [
      {
        name: "DStv Tanzania",
        type: "satellite-tv",
        packages: [
          { name: "DStv Access", price: 14000, currency: "TZS" },
          { name: "DStv Family", price: 23000, currency: "TZS" },
          { name: "DStv Compact", price: 36000, currency: "TZS" },
          { name: "DStv Premium", price: 88000, currency: "TZS" },
        ],
      },
      {
        name: "Azam TV",
        type: "satellite-tv",
        packages: [
          { name: "Azam Play", price: 10000, currency: "TZS" },
          { name: "Azam Plus", price: 20000, currency: "TZS" },
          { name: "Azam Premium", price: 30000, currency: "TZS" },
        ],
      },
      {
        name: "StarTimes Tanzania",
        type: "satellite-tv",
        packages: [
          { name: "Nova", price: 6000, currency: "TZS" },
          { name: "Basic", price: 12000, currency: "TZS" },
          { name: "Smart", price: 18000, currency: "TZS" },
        ],
      },
    ],
    insurance: [
      { name: "Jubilee Insurance Tanzania", type: "insurance", services: ["Health", "Auto", "Life"] },
      { name: "AAR Insurance Tanzania", type: "insurance", services: ["Health", "Travel"] },
      { name: "Resolution Insurance Tanzania", type: "insurance", services: ["Health", "Auto", "Property"] },
    ],
    government: [
      { name: "Tanzania Revenue Authority (TRA)", type: "tax", services: ["PAYE", "VAT", "Corporate Tax", "Skills Development Levy"] },
      { name: "NSSF Tanzania", type: "social-security", services: ["Pension", "Health Insurance", "Invalidity"] },
    ],
  },

  // ========================================================================
  // RW — Rwanda
  // ========================================================================
  RW: {
    transport: [
      { name: "Yego (Move)", type: "ride-hailing", cities: ["Kigali", "Musanze", "Huye"] },
      { name: "Volkswagen Move", type: "ride-hailing", cities: ["Kigali"] },
      { name: "Bolt Rwanda", type: "ride-hailing", cities: ["Kigali"] },
      { name: "City Bus Kigali", type: "bus", cities: ["Kigali"] },
      { name: "Royal Express", type: "intercity-bus", cities: ["Kigali", "Musanze", "Huye", "Rubavu"] },
    ],
    restaurants: [
      { name: "KFC Rwanda", type: "fast-food", cities: ["Kigali"] },
      { name: "Bourbon Coffee", type: "café", cities: ["Kigali"] },
      { name: "The Hut", type: "restaurant", cities: ["Kigali"] },
      { name: "Heaven Restaurant", type: "restaurant", cities: ["Kigali"] },
      { name: "Pili Pili", type: "restaurant", cities: ["Kigali"] },
    ],
    supermarkets: [
      { name: "Simba Supermarket", type: "supermarket", cities: ["Kigali", "Musanze"] },
      { name: "Carrefour Rwanda", type: "supermarket", cities: ["Kigali"] },
      { name: "Brussels Supermarket", type: "supermarket", cities: ["Kigali"] },
      { name: "Ndoli Supermarket", type: "supermarket", cities: ["Kigali"] },
      { name: "Suka Supermarket", type: "supermarket", cities: ["Kigali"] },
    ],
    hospitals: [
      { name: "King Faisal Hospital Kigali", type: "private", cities: ["Kigali"] },
      { name: "CHUK (University Teaching Hospital Kigali)", type: "public", cities: ["Kigali"] },
      { name: "Kanombe Military Hospital", type: "public", cities: ["Kigali"] },
      { name: "CHUB (University Teaching Hospital Butare)", type: "public", cities: ["Huye"] },
    ],
    pharmacies: [
      { name: "Pharmacie Conseil Plus", type: "pharmacy", cities: ["Kigali"] },
      { name: "Pharmaplus", type: "pharmacy", cities: ["Kigali"] },
      { name: "Pharmacie de la Paix", type: "pharmacy", cities: ["Kigali"] },
      { name: "Pharmacie du Carrefour", type: "pharmacy", cities: ["Kigali"] },
    ],
    internetProviders: [
      {
        name: "MTN Rwanda",
        type: "mobile-data",
        plans: [
          { name: "Daily 500MB", price: 200, currency: "RWF" },
          { name: "Weekly 3GB", price: 2000, currency: "RWF" },
          { name: "Monthly 15GB", price: 8000, currency: "RWF" },
          { name: "Monthly 50GB", price: 22000, currency: "RWF" },
        ],
      },
      {
        name: "Airtel Rwanda",
        type: "mobile-data",
        plans: [
          { name: "Daily 500MB", price: 200, currency: "RWF" },
          { name: "Weekly 3GB", price: 2000, currency: "RWF" },
          { name: "Monthly 15GB", price: 8000, currency: "RWF" },
          { name: "Monthly 60GB", price: 25000, currency: "RWF" },
        ],
      },
      {
        name: "Canisius (broadband)",
        type: "broadband",
        plans: [
          { name: "Home 10Mbps", price: 25000, currency: "RWF" },
          { name: "Home 30Mbps", price: 50000, currency: "RWF" },
        ],
      },
    ],
    universities: [
      { name: "University of Rwanda (UR)", type: "public", city: "Kigali", tuitionRange: "RF 600,000 – RF 1,200,000/yr" },
      { name: "Carnegie Mellon University Africa", type: "private", city: "Kigali", tuitionRange: "RF 8,000,000 – RF 12,000,000/yr" },
      { name: "Kigali Independent University (ULK)", type: "private", city: "Kigali", tuitionRange: "RF 1,200,000 – RF 2,000,000/yr" },
      { name: "University of Rwanda - College of Science and Technology", type: "public", city: "Kigali", tuitionRange: "RF 700,000 – RF 1,300,000/yr" },
    ],
    fuelStations: [
      { name: "SP Rwanda (Société Pétrolière)", type: "fuel", cities: ["All cities"] },
      { name: "TotalEnergies Rwanda", type: "fuel", cities: ["All cities"] },
      { name: "Hashi Energy Rwanda", type: "fuel", cities: ["Kigali", "Musanze"] },
      { name: "Lake Oil Rwanda", type: "fuel", cities: ["Kigali", "Rubavu"] },
    ],
    electricity: [
      { name: "REG (Rwanda Energy Group) — EUCL", type: "electricity", coverage: "Nationwide" },
    ],
    water: [
      { name: "WASAC (Water and Sanitation Corporation)", type: "water", coverage: "Nationwide urban" },
    ],
    tv: [
      {
        name: "DStv Rwanda",
        type: "satellite-tv",
        packages: [
          { name: "DStv Access", price: 6500, currency: "RWF" },
          { name: "DStv Family", price: 11000, currency: "RWF" },
          { name: "DStv Compact", price: 17000, currency: "RWF" },
          { name: "DStv Premium", price: 42000, currency: "RWF" },
        ],
      },
      {
        name: "StarTimes Rwanda",
        type: "satellite-tv",
        packages: [
          { name: "Nova", price: 3000, currency: "RWF" },
          { name: "Basic", price: 6000, currency: "RWF" },
          { name: "Smart", price: 9000, currency: "RWF" },
        ],
      },
      {
        name: "TVR (Televison Rwanda)",
        type: "cable-tv",
        packages: [
          { name: "Free-to-air", price: 0, currency: "RWF" },
        ],
      },
    ],
    insurance: [
      { name: "Radiant Insurance", type: "insurance", services: ["Health", "Auto", "Life", "Property"] },
      { name: "Soras Assurance", type: "insurance", services: ["Health", "Auto", "Life", "Property"] },
      { name: "BK General Insurance", type: "insurance", services: ["Health", "Auto", "Property"] },
    ],
    government: [
      { name: "Rwanda Revenue Authority (RRA)", type: "tax", services: ["PAYE", "VAT", "Corporate Income Tax", "Withholding Tax"] },
      { name: "RSSB (Rwanda Social Security Board)", type: "social-security", services: ["Pension", "Maternity Leave", "Occupational Hazards"] },
    ],
  },

  // ========================================================================
  // ZA — South Africa
  // ========================================================================
  ZA: {
    transport: [
      { name: "Uber South Africa", type: "ride-hailing", cities: ["Johannesburg", "Cape Town", "Durban", "Pretoria", "Port Elizabeth"] },
      { name: "Bolt South Africa", type: "ride-hailing", cities: ["Johannesburg", "Cape Town", "Durban"] },
      { name: "DiDi South Africa", type: "ride-hailing", cities: ["Cape Town"] },
      { name: "Gautrain", type: "train", cities: ["Johannesburg", "Pretoria"] },
      { name: "Metrorail", type: "train", cities: ["Johannesburg", "Cape Town", "Durban"] },
      { name: "Rea Vaya BRT", type: "bus", cities: ["Johannesburg"] },
      { name: "MyCiTi BRT", type: "bus", cities: ["Cape Town"] },
    ],
    restaurants: [
      { name: "Nando's", type: "fast-food", cities: ["Johannesburg", "Cape Town", "Durban", "Pretoria", "Port Elizabeth", "Bloemfontein"] },
      { name: "Steers", type: "fast-food", cities: ["All cities"] },
      { name: "Wimpy", type: "fast-food", cities: ["All cities"] },
      { name: "KFC South Africa", type: "fast-food", cities: ["All cities"] },
      { name: "Mugg & Bean", type: "restaurant", cities: ["Johannesburg", "Cape Town", "Durban"] },
      { name: "Spur Steak Ranches", type: "restaurant", cities: ["All cities"] },
    ],
    supermarkets: [
      { name: "Shoprite", type: "supermarket", cities: ["All cities"] },
      { name: "Pick n Pay", type: "supermarket", cities: ["All cities"] },
      { name: "Checkers", type: "supermarket", cities: ["All cities"] },
      { name: "Woolworths Food", type: "supermarket", cities: ["Johannesburg", "Cape Town", "Durban", "Pretoria"] },
      { name: "SPAR South Africa", type: "supermarket", cities: ["All cities"] },
      { name: "Boxer Superstores", type: "supermarket", cities: ["All cities"] },
    ],
    hospitals: [
      { name: "Netcare Group", type: "private", cities: ["Johannesburg", "Cape Town", "Durban", "Pretoria"] },
      { name: "Mediclinic", type: "private", cities: ["Johannesburg", "Cape Town", "Stellenbosch", "Pretoria"] },
      { name: "Life Healthcare", type: "private", cities: ["Johannesburg", "Cape Town", "Durban"] },
      { name: "Chris Hani Baragwanath Hospital", type: "public", cities: ["Johannesburg"] },
      { name: "Groote Schuur Hospital", type: "public", cities: ["Cape Town"] },
    ],
    pharmacies: [
      { name: "Clicks Pharmacy", type: "pharmacy", cities: ["All cities"] },
      { name: "Dis-Chem Pharmacies", type: "pharmacy", cities: ["Johannesburg", "Cape Town", "Durban", "Pretoria"] },
      { name: "Alpha Pharm", type: "pharmacy", cities: ["All cities"] },
      { name: "Medirite Pharmacy", type: "pharmacy", cities: ["All cities"] },
    ],
    internetProviders: [
      {
        name: "Vodacom South Africa",
        type: "mobile-data",
        plans: [
          { name: "Monthly 1GB", price: 99, currency: "ZAR" },
          { name: "Monthly 5GB", price: 299, currency: "ZAR" },
          { name: "Monthly 20GB", price: 499, currency: "ZAR" },
          { name: "Monthly 50GB", price: 799, currency: "ZAR" },
        ],
      },
      {
        name: "MTN South Africa",
        type: "mobile-data",
        plans: [
          { name: "Monthly 1GB", price: 99, currency: "ZAR" },
          { name: "Monthly 5GB", price: 279, currency: "ZAR" },
          { name: "Monthly 20GB", price: 469, currency: "ZAR" },
          { name: "Monthly 50GB", price: 749, currency: "ZAR" },
        ],
      },
      {
        name: "Cell C",
        type: "mobile-data",
        plans: [
          { name: "Monthly 1GB", price: 89, currency: "ZAR" },
          { name: "Monthly 5GB", price: 249, currency: "ZAR" },
          { name: "Monthly 20GB", price: 449, currency: "ZAR" },
        ],
      },
      {
        name: "Telkom (Mobile & Fixed)",
        type: "mobile-data",
        plans: [
          { name: "Monthly 2GB", price: 149, currency: "ZAR" },
          { name: "Monthly 10GB", price: 399, currency: "ZAR" },
          { name: "Monthly 40GB", price: 599, currency: "ZAR" },
        ],
      },
      {
        name: "Rain (5G fixed)",
        type: "broadband",
        plans: [
          { name: "Unlimited 19", price: 250, currency: "ZAR" },
          { name: "Unlimited 5G", price: 559, currency: "ZAR" },
        ],
      },
      {
        name: "Vumatel / Openserve fibre",
        type: "broadband",
        plans: [
          { name: "Fibre 20Mbps", price: 599, currency: "ZAR" },
          { name: "Fibre 50Mbps", price: 799, currency: "ZAR" },
          { name: "Fibre 100Mbps", price: 999, currency: "ZAR" },
        ],
      },
    ],
    universities: [
      { name: "University of Cape Town (UCT)", type: "public", city: "Cape Town", tuitionRange: "R 30,000 – R 80,000/yr" },
      { name: "University of the Witwatersrand (Wits)", type: "public", city: "Johannesburg", tuitionRange: "R 35,000 – R 90,000/yr" },
      { name: "Stellenbosch University (SU)", type: "public", city: "Stellenbosch", tuitionRange: "R 35,000 – R 80,000/yr" },
      { name: "University of Pretoria (UP)", type: "public", city: "Pretoria", tuitionRange: "R 35,000 – R 85,000/yr" },
      { name: "University of KwaZulu-Natal (UKZN)", type: "public", city: "Durban", tuitionRange: "R 30,000 – R 80,000/yr" },
    ],
    fuelStations: [
      { name: "Sasol", type: "fuel", cities: ["All cities"] },
      { name: "Engen", type: "fuel", cities: ["All cities"] },
      { name: "Shell South Africa", type: "fuel", cities: ["All cities"] },
      { name: "BP South Africa", type: "fuel", cities: ["All cities"] },
      { name: "TotalEnergies South Africa", type: "fuel", cities: ["All cities"] },
      { name: "Caltex (Astron Energy)", type: "fuel", cities: ["All cities"] },
    ],
    electricity: [
      { name: "Eskom", type: "electricity", coverage: "Nationwide (generation + transmission + many distribution areas)" },
      { name: "City Power Johannesburg", type: "electricity", coverage: "Johannesburg" },
      { name: "City of Cape Town Electricity", type: "electricity", coverage: "Cape Town" },
      { name: "eThekwini Electricity", type: "electricity", coverage: "Durban" },
      { name: "Tshwane Electricity", type: "electricity", coverage: "Pretoria" },
    ],
    water: [
      { name: "Rand Water", type: "water", coverage: "Gauteng (Johannesburg, Pretoria)" },
      { name: "City of Cape Town Water", type: "water", coverage: "Cape Town" },
      { name: "eThekwini Water and Sanitation", type: "water", coverage: "Durban" },
    ],
    tv: [
      {
        name: "DStv South Africa",
        type: "satellite-tv",
        packages: [
          { name: "DStv Access", price: 129, currency: "ZAR" },
          { name: "DStv Family", price: 319, currency: "ZAR" },
          { name: "DStv Compact", price: 549, currency: "ZAR" },
          { name: "DStv Compact Plus", price: 739, currency: "ZAR" },
          { name: "DStv Premium", price: 939, currency: "ZAR" },
        ],
      },
      {
        name: "GOtv South Africa",
        type: "satellite-tv",
        packages: [
          { name: "GOtv Lite", price: 49, currency: "ZAR" },
          { name: "GOtv Value", price: 99, currency: "ZAR" },
          { name: "GOtv Plus", price: 159, currency: "ZAR" },
          { name: "GOtv Max", price: 199, currency: "ZAR" },
        ],
      },
      {
        name: "Showmax (streaming)",
        type: "streaming",
        packages: [
          { name: "Showmax Standard", price: 99, currency: "ZAR" },
          { name: "Showmax Premier", price: 199, currency: "ZAR" },
        ],
      },
      {
        name: "Openview (free-to-air)",
        type: "satellite-tv",
        packages: [
          { name: "Free-to-air", price: 0, currency: "ZAR" },
        ],
      },
    ],
    insurance: [
      { name: "Old Mutual", type: "insurance", services: ["Life", "Health", "Investments", "Annuities"] },
      { name: "Sanlam", type: "insurance", services: ["Life", "Health", "Investments", "Retirement"] },
      { name: "Discovery Health", type: "insurance", services: ["Medical Aid", "Life", "Income Protection"] },
      { name: "Santam", type: "insurance", services: ["Auto", "Property", "Business", "Liability"] },
      { name: "Outsurance", type: "insurance", services: ["Auto", "Home", "Life", "Business"] },
    ],
    government: [
      { name: "SARS (South African Revenue Service)", type: "tax", services: ["Income Tax", "VAT", "PAYE", "Customs", "Corporate Tax"] },
      { name: " UIF (Unemployment Insurance Fund)", type: "social-security", services: ["Unemployment benefits", "Maternity", "Illness"] },
      { name: "SASSA (South African Social Security Agency)", type: "social-security", services: ["Grants (Old Age, Child, Disability)"] },
    ],
  },

  // ========================================================================
  // EG — Egypt
  // ========================================================================
  EG: {
    transport: [
      { name: "Uber Egypt", type: "ride-hailing", cities: ["Cairo", "Alexandria", "Giza", "Mansoura", "Tanta"] },
      { name: "Bolt Egypt", type: "ride-hailing", cities: ["Cairo", "Alexandria"] },
      { name: "inDrive", type: "ride-hailing", cities: ["Cairo", "Alexandria", "Aswan"] },
      { name: "Careem", type: "ride-hailing", cities: ["Cairo", "Alexandria", "Giza"] },
      { name: "Cairo Metro", type: "train", cities: ["Cairo"] },
      { name: "Alexandria Tram", type: "train", cities: ["Alexandria"] },
    ],
    restaurants: [
      { name: "KFC Egypt", type: "fast-food", cities: ["Cairo", "Alexandria", "Giza"] },
      { name: "McDonald's Egypt", type: "fast-food", cities: ["Cairo", "Alexandria", "Giza"] },
      { name: "Mo'men", type: "fast-food", cities: ["Cairo", "Alexandria"] },
      { name: "Abou El Sid", type: "restaurant", cities: ["Cairo"] },
      { name: "Koshary Abou Tarek", type: "restaurant", cities: ["Cairo"] },
    ],
    supermarkets: [
      { name: "Carrefour Egypt", type: "supermarket", cities: ["Cairo", "Alexandria", "Giza"] },
      { name: "Spinneys Egypt", type: "supermarket", cities: ["Cairo", "Alexandria"] },
      { name: "Kheir Zaman", type: "supermarket", cities: ["Cairo", "Giza"] },
      { name: "Gourmet Egypt", type: "supermarket", cities: ["Cairo"] },
      { name: "BIM Egypt", type: "supermarket", cities: ["Cairo", "Alexandria"] },
    ],
    hospitals: [
      { name: "As-Salam International Hospital", type: "private", cities: ["Cairo"] },
      { name: "Saudi German Hospital Cairo", type: "private", cities: ["Cairo"] },
      { name: "Cleopatra Hospital", type: "private", cities: ["Cairo"] },
      { name: "Kasr Al Ainy Hospital (Cairo University)", type: "public", cities: ["Cairo"] },
      { name: "Alexandria Main University Hospital", type: "public", cities: ["Alexandria"] },
    ],
    pharmacies: [
      { name: "El-Ezaby Pharmacy", type: "pharmacy", cities: ["Cairo", "Alexandria", "Giza"] },
      { name: "Eshti Pharmacy", type: "pharmacy", cities: ["Cairo"] },
      { name: "Dr. Nutrition", type: "pharmacy", cities: ["Cairo", "Alexandria"] },
      { name: "Seif Pharmacy", type: "pharmacy", cities: ["Cairo", "Alexandria"] },
    ],
    internetProviders: [
      {
        name: "Vodafone Egypt",
        type: "mobile-data",
        plans: [
          { name: "Daily 500MB", price: 10, currency: "EGP" },
          { name: "Weekly 5GB", price: 60, currency: "EGP" },
          { name: "Monthly 25GB", price: 200, currency: "EGP" },
          { name: "Monthly 80GB", price: 400, currency: "EGP" },
        ],
      },
      {
        name: "Orange Egypt",
        type: "mobile-data",
        plans: [
          { name: "Daily 500MB", price: 10, currency: "EGP" },
          { name: "Weekly 5GB", price: 60, currency: "EGP" },
          { name: "Monthly 30GB", price: 200, currency: "EGP" },
          { name: "Monthly 90GB", price: 400, currency: "EGP" },
        ],
      },
      {
        name: "Etisalat Egypt",
        type: "mobile-data",
        plans: [
          { name: "Daily 500MB", price: 10, currency: "EGP" },
          { name: "Weekly 5GB", price: 60, currency: "EGP" },
          { name: "Monthly 25GB", price: 200, currency: "EGP" },
          { name: "Monthly 100GB", price: 450, currency: "EGP" },
        ],
      },
      {
        name: "WE (Telecom Egypt)",
        type: "broadband",
        plans: [
          { name: "ADSL 30Mbps", price: 250, currency: "EGP" },
          { name: "ADSL 50Mbps", price: 400, currency: "EGP" },
          { name: "Fibre 100Mbps", price: 600, currency: "EGP" },
        ],
      },
    ],
    universities: [
      { name: "Cairo University", type: "public", city: "Giza", tuitionRange: "E£ 3,000 – E£ 12,000/yr (Egyptians)" },
      { name: "American University in Cairo (AUC)", type: "private", city: "Cairo", tuitionRange: "E£ 300,000 – E£ 600,000/yr" },
      { name: "Ain Shams University", type: "public", city: "Cairo", tuitionRange: "E£ 3,000 – E£ 14,000/yr" },
      { name: "Alexandria University", type: "public", city: "Alexandria", tuitionRange: "E£ 3,000 – E£ 12,000/yr" },
      { name: "German University in Cairo (GUC)", type: "private", city: "Cairo", tuitionRange: "E£ 110,000 – E£ 180,000/yr" },
    ],
    fuelStations: [
      { name: "Misr Petroleum", type: "fuel", cities: ["All cities"] },
      { name: "Shell Egypt", type: "fuel", cities: ["All cities"] },
      { name: "TotalEnergies Egypt", type: "fuel", cities: ["Cairo", "Alexandria", "Giza"] },
      { name: "BP Egypt", type: "fuel", cities: ["Cairo", "Alexandria"] },
      { name: "Champion (ENOC)", type: "fuel", cities: ["Cairo"] },
    ],
    electricity: [
      { name: "EEHC (Egyptian Electricity Holding Company)", type: "electricity", coverage: "Nationwide (7 distribution companies)" },
      { name: "North Cairo Electricity Distribution", type: "electricity", coverage: "North Cairo" },
      { name: "South Cairo Electricity Distribution", type: "electricity", coverage: "South Cairo" },
      { name: "Alexandria Electricity Distribution", type: "electricity", coverage: "Alexandria" },
    ],
    water: [
      { name: "HCWW (Holding Company for Water and Wastewater)", type: "water", coverage: "Nationwide urban" },
    ],
    tv: [
      {
        name: "OSN (Orbit Showtime Network)",
        type: "satellite-tv",
        packages: [
          { name: "OSN Starter", price: 75, currency: "EGP" },
          { name: "OSN Plus", price: 130, currency: "EGP" },
          { name: "OSN Premier", price: 200, currency: "EGP" },
        ],
      },
      {
        name: "beIN Sports Connect",
        type: "streaming",
        packages: [
          { name: "Monthly", price: 200, currency: "EGP" },
          { name: "Annual", price: 1800, currency: "EGP" },
        ],
      },
      {
        name: "Nilesat (free-to-air)",
        type: "satellite-tv",
        packages: [
          { name: "Free-to-air", price: 0, currency: "EGP" },
        ],
      },
    ],
    insurance: [
      { name: "Allianz Egypt", type: "insurance", services: ["Life", "Health", "Auto", "Property"] },
      { name: "AXA Egypt", type: "insurance", services: ["Life", "Health", "Savings"] },
      { name: "GIG Egypt (Gulf Insurance Group)", type: "insurance", services: ["Health", "Auto", "Property", "Life"] },
      { name: "MetLife Alico Egypt", type: "insurance", services: ["Life", "Health", "Retirement"] },
    ],
    government: [
      { name: "ETA (Egyptian Tax Authority)", type: "tax", services: ["Income Tax", "VAT", "Stamp Duty", "Payroll Tax"] },
      { name: "NOSI (National Organization for Social Insurance)", type: "social-security", services: ["Pension", "Invalidity", "Survivors"] },
    ],
  },

  // ========================================================================
  // MA — Morocco
  // ========================================================================
  MA: {
    transport: [
      { name: "Careem Maroc", type: "ride-hailing", cities: ["Casablanca", "Rabat", "Marrakech", "Tangier"] },
      { name: "Robo", type: "ride-hailing", cities: ["Casablanca", "Rabat"] },
      { name: "Heetch Maroc", type: "ride-hailing", cities: ["Casablanca", "Rabat", "Marrakech"] },
      { name: "Casa Tramway", type: "train", cities: ["Casablanca"] },
      { name: "Rabat-Salé Tramway", type: "train", cities: ["Rabat", "Salé"] },
      { name: "ONCF (trains) + Al Bidaoui", type: "train", cities: ["Casablanca", "Rabat", "Kenitra", "Tangier", "Fès", "Marrakech"] },
      { name: "CTM (intercity coach)", type: "intercity-bus", cities: ["Casablanca", "Rabat", "Marrakech", "Fès", "Tangier", "Agadir"] },
    ],
    restaurants: [
      { name: "McDonald's Maroc", type: "fast-food", cities: ["Casablanca", "Rabat", "Marrakech", "Fès", "Tangier"] },
      { name: "KFC Maroc", type: "fast-food", cities: ["Casablanca", "Rabat", "Marrakech"] },
      { name: "La Sqala", type: "restaurant", cities: ["Casablanca"] },
      { name: "Café Clock", type: "restaurant", cities: ["Marrakech", "Casablanca"] },
      { name: "Le Riad", type: "restaurant", cities: ["Marrakech"] },
    ],
    supermarkets: [
      { name: "Marjane (Marjane Holdco)", type: "supermarket", cities: ["Casablanca", "Rabat", "Marrakech", "Fès", "Tangier", "Agadir"] },
      { name: "Carrefour Marjane", type: "supermarket", cities: ["Casablanca", "Rabat", "Marrakech"] },
      { name: "Aswak Assalam", type: "supermarket", cities: ["Casablanca", "Rabat", "Fès", "Tangier"] },
      { name: "BIM Maroc", type: "supermarket", cities: ["All cities"] },
      { name: "Atacadao (Auchan)", type: "supermarket", cities: ["Casablanca", "Rabat"] },
    ],
    hospitals: [
      { name: "CHU Ibn Sina (Rabat)", type: "public", cities: ["Rabat", "Salé"] },
      { name: "CHU Ibn Rochd (Casablanca)", type: "public", cities: ["Casablanca"] },
      { name: "Clinique du Souiss", type: "private", cities: ["Rabat"] },
      { name: "Cheikh Zaid Hospital", type: "private", cities: ["Rabat"] },
      { name: "Clinique Chantilly", type: "private", cities: ["Casablanca"] },
    ],
    pharmacies: [
      { name: "Pharmacie de la Poste", type: "pharmacy", cities: ["Casablanca", "Rabat"] },
      { name: "Al Amal Pharmacy", type: "pharmacy", cities: ["Casablanca"] },
      { name: "Pharmacie du Marché", type: "pharmacy", cities: ["Rabat"] },
      { name: "Pharmacie Centrale Marrakech", type: "pharmacy", cities: ["Marrakech"] },
    ],
    internetProviders: [
      {
        name: "Maroc Telecom (IAM)",
        type: "mobile-data",
        plans: [
          { name: "Daily 500MB", price: 5, currency: "MAD" },
          { name: "Weekly 5GB", price: 30, currency: "MAD" },
          { name: "Monthly 20GB", price: 100, currency: "MAD" },
          { name: "Monthly 100GB", price: 300, currency: "MAD" },
        ],
      },
      {
        name: "Orange Maroc",
        type: "mobile-data",
        plans: [
          { name: "Daily 500MB", price: 5, currency: "MAD" },
          { name: "Weekly 5GB", price: 30, currency: "MAD" },
          { name: "Monthly 20GB", price: 100, currency: "MAD" },
          { name: "Monthly 80GB", price: 250, currency: "MAD" },
        ],
      },
      {
        name: "Inwi",
        type: "mobile-data",
        plans: [
          { name: "Daily 500MB", price: 5, currency: "MAD" },
          { name: "Weekly 5GB", price: 25, currency: "MAD" },
          { name: "Monthly 30GB", price: 99, currency: "MAD" },
          { name: "Monthly 100GB", price: 250, currency: "MAD" },
        ],
      },
      {
        name: "Maroc Telecom Fibre",
        type: "broadband",
        plans: [
          { name: "Fibre 50Mbps", price: 299, currency: "MAD" },
          { name: "Fibre 100Mbps", price: 399, currency: "MAD" },
          { name: "Fibre 200Mbps", price: 599, currency: "MAD" },
        ],
      },
    ],
    universities: [
      { name: "University of Al Quaraouiyine", type: "public", city: "Fès", tuitionRange: "DH 3,000 – DH 8,000/yr" },
      { name: "Mohammed V University (Rabat)", type: "public", city: "Rabat", tuitionRange: "DH 4,000 – DH 12,000/yr" },
      { name: "Hassan II University (Casablanca)", type: "public", city: "Casablanca", tuitionRange: "DH 4,000 – DH 12,000/yr" },
      { name: "Al Akhawayn University", type: "private", city: "Ifrane", tuitionRange: "DH 65,000 – DH 90,000/yr" },
      { name: "Université Privée de Marrakech (UPM)", type: "private", city: "Marrakech", tuitionRange: "DH 30,000 – DH 60,000/yr" },
    ],
    fuelStations: [
      { name: "Afriquia (Akwa Group)", type: "fuel", cities: ["All cities"] },
      { name: "TotalEnergies Maroc", type: "fuel", cities: ["All cities"] },
      { name: "Shell Vivo Maroc", type: "fuel", cities: ["All cities"] },
      { name: "BP Maroc (Winxo)", type: "fuel", cities: ["Casablanca", "Rabat", "Marrakech"] },
      { name: "Lasmi", type: "fuel", cities: ["Casablanca", "Marrakech"] },
    ],
    electricity: [
      { name: "ONEE (Office National de l'Électricité et de l'Eau Potable)", type: "electricity", coverage: "Nationwide" },
      { name: "LYDEC (Casablanca concession)", type: "electricity", coverage: "Casablanca" },
      { name: "REDAL (Rabat concession)", type: "electricity", coverage: "Rabat, Salé" },
      { name: "AMENDIS (Tangier, Tetouan concession)", type: "electricity", coverage: "Tangier, Tetouan" },
    ],
    water: [
      { name: "ONEE — Eau", type: "water", coverage: "Nationwide" },
      { name: "LYDEC", type: "water", coverage: "Casablanca" },
      { name: "REDAL", type: "water", coverage: "Rabat, Salé" },
    ],
    tv: [
      {
        name: "OSN Maroc",
        type: "satellite-tv",
        packages: [
          { name: "OSN Starter", price: 99, currency: "MAD" },
          { name: "OSN Plus", price: 169, currency: "MAD" },
          { name: "OSN Premier", price: 259, currency: "MAD" },
        ],
      },
      {
        name: "beIN Sports (Maroc)",
        type: "streaming",
        packages: [
          { name: "beIN Sports Connect", price: 150, currency: "MAD" },
        ],
      },
      {
        name: "Maroc Telecom TV (IPTV)",
        type: "cable-tv",
        packages: [
          { name: "Basic", price: 99, currency: "MAD" },
          { name: "Premium", price: 199, currency: "MAD" },
        ],
      },
      {
        name: "SNRT (free-to-air)",
        type: "satellite-tv",
        packages: [
          { name: "Free-to-air", price: 0, currency: "MAD" },
        ],
      },
    ],
    insurance: [
      { name: "Wafa Assurance", type: "insurance", services: ["Life", "Health", "Auto", "Property", "Retirement"] },
      { name: "RMA Watanya", type: "insurance", services: ["Auto", "Health", "Life", "Property", "Marine"] },
      { name: "Saham Assurance (Sanlam)", type: "insurance", services: ["Health", "Auto", "Life", "Property"] },
      { name: "AXA Assurance Maroc", type: "insurance", services: ["Health", "Auto", "Life", "Property"] },
    ],
    government: [
      { name: "DGI Maroc (Direction Générale des Impôts)", type: "tax", services: ["Impôt sur le Revenu (IR)", "TVA", "Impôt sur les Sociétés (IS)", "Taxes locales"] },
      { name: "CNSS (Caisse Nationale de Sécurité Sociale)", type: "social-security", services: ["Allocations familiales", "Pensions", "Risques professionnels"] },
      { name: "CNOPS (Caisse Nationale des Organismes de Prévoyance Sociale)", type: "social-security", services: ["Health insurance (public sector)"] },
      { name: "Douanes Marocaines (ADII)", type: "customs", services: ["Droits de douane", "TVA import", "Droits de consommation"] },
    ],
  },

  // ========================================================================
  // ET — Ethiopia
  // ========================================================================
  ET: {
    transport: [
      { name: "Ride", type: "ride-hailing", cities: ["Addis Ababa"] },
      { name: "ZayRide", type: "ride-hailing", cities: ["Addis Ababa"] },
      { name: "EseyOr", type: "ride-hailing", cities: ["Addis Ababa"] },
      { name: "Feres", type: "ride-hailing", cities: ["Addis Ababa"] },
      { name: "Addis Ababa Light Rail", type: "train", cities: ["Addis Ababa"] },
      { name: "Selam Bus (intercity)", type: "intercity-bus", cities: ["Addis Ababa", "Adama", "Hawassa", "Bahir Dar", "Mekelle"] },
    ],
    restaurants: [
      { name: "Yod Abyssinia", type: "restaurant", cities: ["Addis Ababa"] },
      { name: "2000 Habesha", type: "restaurant", cities: ["Addis Ababa"] },
      { name: "Cafe Addis", type: "café", cities: ["Addis Ababa"] },
      { name: "KFC Ethiopia", type: "fast-food", cities: ["Addis Ababa"] },
      { name: "Lucy Restaurant", type: "restaurant", cities: ["Addis Ababa"] },
    ],
    supermarkets: [
      { name: "Bambu Supermarket", type: "supermarket", cities: ["Addis Ababa"] },
      { name: "Friendship Supermarket", type: "supermarket", cities: ["Addis Ababa"] },
      { name: "Shoa Supermarket", type: "supermarket", cities: ["Addis Ababa", "Adama"] },
      { name: "Neway Supermarket", type: "supermarket", cities: ["Addis Ababa"] },
      { name: "Fantu Supermarket", type: "supermarket", cities: ["Addis Ababa"] },
    ],
    hospitals: [
      { name: "Tikur Anbessa (Black Lion) Specialized Hospital", type: "public", cities: ["Addis Ababa"] },
      { name: "St. Paul's Hospital Millennium Medical College", type: "public", cities: ["Addis Ababa"] },
      { name: "Bethzatha Hospital", type: "private", cities: ["Addis Ababa"] },
      { name: "Korean Hospital", type: "private", cities: ["Addis Ababa"] },
      { name: "Hayat Hospital", type: "private", cities: ["Addis Ababa"] },
    ],
    pharmacies: [
      { name: "Hasi Pharmacy", type: "pharmacy", cities: ["Addis Ababa"] },
      { name: "Bega Pharmacy", type: "pharmacy", cities: ["Addis Ababa"] },
      { name: "Addis Pharmacy", type: "pharmacy", cities: ["Addis Ababa"] },
      { name: "Bionorica Pharmacy", type: "pharmacy", cities: ["Addis Ababa"] },
    ],
    internetProviders: [
      {
        name: "Ethio Telecom",
        type: "mobile-data",
        plans: [
          { name: "Daily 200MB", price: 8, currency: "ETB" },
          { name: "Weekly 2GB", price: 60, currency: "ETB" },
          { name: "Monthly 10GB", price: 350, currency: "ETB" },
          { name: "Monthly 50GB", price: 1200, currency: "ETB" },
        ],
      },
      {
        name: "Safaricom Ethiopia",
        type: "mobile-data",
        plans: [
          { name: "Daily 200MB", price: 8, currency: "ETB" },
          { name: "Weekly 2GB", price: 60, currency: "ETB" },
          { name: "Monthly 10GB", price: 350, currency: "ETB" },
          { name: "Monthly 60GB", price: 1500, currency: "ETB" },
        ],
      },
      {
        name: "Ethio Telecom Fixed Broadband",
        type: "broadband",
        plans: [
          { name: "ADSL 8Mbps", price: 1500, currency: "ETB" },
          { name: "Fibre 25Mbps", price: 4000, currency: "ETB" },
        ],
      },
    ],
    universities: [
      { name: "Addis Ababa University (AAU)", type: "public", city: "Addis Ababa", tuitionRange: "Br 3,000 – Br 12,000/yr" },
      { name: "Mekelle University", type: "public", city: "Mekelle", tuitionRange: "Br 3,000 – Br 10,000/yr" },
      { name: "Jimma University", type: "public", city: "Jimma", tuitionRange: "Br 3,000 – Br 11,000/yr" },
      { name: "Bahir Dar University", type: "public", city: "Bahir Dar", tuitionRange: "Br 3,000 – Br 10,000/yr" },
      { name: "Unity University", type: "private", city: "Addis Ababa", tuitionRange: "Br 25,000 – Br 60,000/yr" },
    ],
    fuelStations: [
      { name: "TotalEnergies Ethiopia", type: "fuel", cities: ["All cities"] },
      { name: "NOC (National Oil Ethiopia)", type: "fuel", cities: ["All cities"] },
      { name: "Yetebaberut Behbret Sened (YBS)", type: "fuel", cities: ["Addis Ababa", "Adama", "Hawassa"] },
      { name: "Oil Libya Ethiopia", type: "fuel", cities: ["Addis Ababa", "Mekelle", "Bahir Dar"] },
      { name: "Kobil Ethiopia", type: "fuel", cities: ["Addis Ababa"] },
    ],
    electricity: [
      { name: "EEU (Ethiopian Electric Utility)", type: "electricity", coverage: "Nationwide distribution" },
      { name: "EEP (Ethiopian Electric Power)", type: "electricity", coverage: "Generation and transmission" },
    ],
    water: [
      { name: "AAWSA (Addis Ababa Water and Sewerage Authority)", type: "water", coverage: "Addis Ababa" },
      { name: "Regional Water Bureaus", type: "water", coverage: "Other regions" },
    ],
    tv: [
      {
        name: "DStv Ethiopia",
        type: "satellite-tv",
        packages: [
          { name: "DStv Access", price: 350, currency: "ETB" },
          { name: "DStv Family", price: 600, currency: "ETB" },
          { name: "DStv Compact", price: 950, currency: "ETB" },
          { name: "DStv Premium", price: 2300, currency: "ETB" },
        ],
      },
      {
        name: "Ethiosat (free-to-air)",
        type: "satellite-tv",
        packages: [
          { name: "Free-to-air", price: 0, currency: "ETB" },
        ],
      },
      {
        name: "EBC (Ethiopian Broadcasting Corporation)",
        type: "cable-tv",
        packages: [
          { name: "Free-to-air", price: 0, currency: "ETB" },
        ],
      },
    ],
    insurance: [
      { name: "Ethiopian Insurance Corporation (EIC)", type: "insurance", services: ["Auto", "Health", "Property", "Marine", "Aviation"] },
      { name: "Awash Insurance Company", type: "insurance", services: ["Auto", "Health", "Property", "Life"] },
      { name: "Nyala Insurance", type: "insurance", services: ["Auto", "Health", "Property", "Life"] },
      { name: "United Insurance (UNIC)", type: "insurance", services: ["Auto", "Health", "Property"] },
    ],
    government: [
      { name: "ERCA (Ethiopian Revenue and Customs Authority)", type: "tax", services: ["Income Tax", "VAT", "Turnover Tax", "Customs Duties"] },
      { name: "ESSA (Ethiopian Social Security Agency)", type: "social-security", services: ["Pension", "Invalidity", "Survivors"] },
    ],
  },

  // ========================================================================
  // BJ — Bénin
  // ========================================================================
  BJ: {
    transport: [
      { name: "Gozem", type: "ride-hailing", cities: ["Cotonou", "Porto-Novo", "Parakou"] },
      { name: "TMX (Taxi Moto Express)", type: "ride-hailing", cities: ["Cotonou"] },
      { name: "Taxi-brousse (intercity)", type: "intercity-bus", cities: ["Cotonou", "Porto-Novo", "Parakou", "Natitingou"] },
      { name: "Jonquet (moto-taxi)", type: "taxi", cities: ["Cotonou", "Porto-Novo"] },
      { name: "BB-City Bus", type: "bus", cities: ["Cotonou"] },
    ],
    restaurants: [
      { name: "Le Chant d'Oiseau", type: "restaurant", cities: ["Cotonou"] },
      { name: "La Chaumière", type: "restaurant", cities: ["Cotonou"] },
      { name: "Le Livingstone", type: "restaurant", cities: ["Cotonou"] },
      { name: "Maquis du Plateau", type: "restaurant", cities: ["Cotonou"] },
      { name: "La Pirogue", type: "restaurant", cities: ["Cotonou"] },
    ],
    supermarkets: [
      { name: "Erevan Supermarket", type: "supermarket", cities: ["Cotonou"] },
      { name: "Champion (Supermarché)", type: "supermarket", cities: ["Cotonou", "Porto-Novo"] },
      { name: "Casino Bénin", type: "supermarket", cities: ["Cotonou"] },
      { name: "Biocoop Bénin", type: "supermarket", cities: ["Cotonou"] },
      { name: "Le Marché Bénin", type: "supermarket", cities: ["Cotonou", "Parakou"] },
    ],
    hospitals: [
      { name: "CNHU Hubert Maga (National University Hospital)", type: "public", cities: ["Cotonou"] },
      { name: "Hôpital de la Mère et de l'Enfant (HOMEL)", type: "public", cities: ["Cotonou"] },
      { name: "Clinique d'Akpakpa", type: "private", cities: ["Cotonou"] },
      { name: "Clinique Biop icy", type: "private", cities: ["Cotonou"] },
    ],
    pharmacies: [
      { name: "Pharmacie Centrale de Cotonou", type: "pharmacy", cities: ["Cotonou"] },
      { name: "Pharmacie de l'Étoile", type: "pharmacy", cities: ["Cotonou"] },
      { name: "Pharmacie du Plateau", type: "pharmacy", cities: ["Cotonou"] },
      { name: "Pharmacie de Porto-Novo", type: "pharmacy", cities: ["Porto-Novo"] },
    ],
    internetProviders: [
      {
        name: "MTN Bénin",
        type: "mobile-data",
        plans: [
          { name: "Journalier 200MB", price: 200, currency: "XOF" },
          { name: "Hebdo 2GB", price: 2000, currency: "XOF" },
          { name: "Mensuel 10GB", price: 10000, currency: "XOF" },
          { name: "Mensuel 60GB", price: 30000, currency: "XOF" },
        ],
      },
      {
        name: "Moov Africa Bénin",
        type: "mobile-data",
        plans: [
          { name: "Journalier 200MB", price: 200, currency: "XOF" },
          { name: "Hebdo 2GB", price: 2000, currency: "XOF" },
          { name: "Mensuel 12GB", price: 11000, currency: "XOF" },
          { name: "Mensuel 70GB", price: 35000, currency: "XOF" },
        ],
      },
      {
        name: "SBEE (Société Béninoise d'Énergie Électrique - broadband)",
        type: "broadband",
        plans: [
          { name: "Fibre 20Mbps", price: 25000, currency: "XOF" },
          { name: "Fibre 50Mbps", price: 45000, currency: "XOF" },
        ],
      },
    ],
    universities: [
      { name: "Université d'Abomey-Calavi (UAC)", type: "public", city: "Abomey-Calavi", tuitionRange: "FCFA 50,000 – FCFA 250,000/yr" },
      { name: "Université de Parakou (UP)", type: "public", city: "Parakou", tuitionRange: "FCFA 60,000 – FCFA 200,000/yr" },
      { name: "Université Nationale des Sciences, Technologies, Ingénierie et Mathématiques (UNSTIM)", type: "public", city: "Abomey", tuitionRange: "FCFA 80,000 – FCFA 250,000/yr" },
      { name: "Ecole Supérieure de Gestion d'Informatique et des Sciences (ESGIS)", type: "private", city: "Cotonou", tuitionRange: "FCFA 600,000 – FCFA 1,200,000/yr" },
    ],
    fuelStations: [
      { name: "TotalEnergies Bénin", type: "fuel", cities: ["All cities"] },
      { name: "Pétro Bénin", type: "fuel", cities: ["Cotonou", "Porto-Novo", "Parakou"] },
      { name: "MRS Bénin", type: "fuel", cities: ["Cotonou", "Porto-Novo"] },
      { name: "Oilcoin Bénin", type: "fuel", cities: ["Cotonou"] },
    ],
    electricity: [
      { name: "SBEE (Société Béninoise d'Énergie Électrique)", type: "electricity", coverage: "Nationwide urban" },
      { name: "C EB (Communauté Électrique du Bénin)", type: "electricity", coverage: "Regional imports / generation" },
    ],
    water: [
      { name: "SONEB (Société Nationale des Eaux du Bénin)", type: "water", coverage: "Nationwide urban" },
    ],
    tv: [
      {
        name: "Canal+ Bénin",
        type: "satellite-tv",
        packages: [
          { name: "Access", price: 9900, currency: "XOF" },
          { name: "Evolution", price: 14900, currency: "XOF" },
          { name: "Tout-Canal", price: 29900, currency: "XOF" },
        ],
      },
      {
        name: "DStv Bénin",
        type: "satellite-tv",
        packages: [
          { name: "DStv Access", price: 5500, currency: "XOF" },
          { name: "DStv Family", price: 9900, currency: "XOF" },
          { name: "DStv Compact", price: 17500, currency: "XOF" },
          { name: "DStv Premium", price: 45000, currency: "XOF" },
        ],
      },
      {
        name: "ORTB (Office de Radiodiffusion et Télévision du Bénin)",
        type: "cable-tv",
        packages: [
          { name: "Free-to-air", price: 0, currency: "XOF" },
        ],
      },
    ],
    insurance: [
      { name: "NSIA Assurances Bénin", type: "insurance", services: ["Health", "Auto", "Life", "Property"] },
      { name: "SUNU Assurances Bénin", type: "insurance", services: ["Health", "Auto", "Life", "Education"] },
      { name: "Chanas Assurances", type: "insurance", services: ["Health", "Auto", "Property", "Marine"] },
    ],
    government: [
      { name: "Direction Générale des Impôts et des Domaines (DGID) Bénin", type: "tax", services: ["Impôt sur le Revenu", "TVA", "Droits de douane", "Patente"] },
      { name: "CNSS Bénin (Caisse Nationale de Sécurité Sociale)", type: "social-security", services: ["Pensions", "Allocations familiales", "Risques professionnels"] },
    ],
  },

  // ========================================================================
  // BF — Burkina Faso
  // ========================================================================
  BF: {
    transport: [
      { name: "Yango Burkina", type: "ride-hailing", cities: ["Ouagadougou", "Bobo-Dioulasso"] },
      { name: "Taxi Jaune", type: "taxi", cities: ["Ouagadougou", "Bobo-Dioulasso"] },
      { name: "TCO (Transport en Commun de Ouagadougou)", type: "bus", cities: ["Ouagadougou"] },
      { name: "STMB (intercity)", type: "intercity-bus", cities: ["Ouagadougou", "Bobo-Dioulasso", "Koudougou", "Ouahigouya"] },
      { name: "Agences de voyage (Rakieta, Lale)", type: "intercity-bus", cities: ["Ouagadougou", "Bobo-Dioulasso", "Koudougou", "Fada N'gourma"] },
    ],
    restaurants: [
      { name: "Le Paillotte", type: "restaurant", cities: ["Ouagadougou"] },
      { name: "La Table d'Ouaga", type: "restaurant", cities: ["Ouagadougou"] },
      { name: "Café de la Gare", type: "restaurant", cities: ["Ouagadougou"] },
      { name: "Restaurant le Verdoyant", type: "restaurant", cities: ["Ouagadougou"] },
      { name: "Le Sank Bayili", type: "restaurant", cities: ["Bobo-Dioulasso"] },
    ],
    supermarkets: [
      { name: "Sococé BF", type: "supermarket", cities: ["Ouagadougou", "Bobo-Dioulasso"] },
      { name: "Casino BF", type: "supermarket", cities: ["Ouagadougou"] },
      { name: "Marathon Supermarché", type: "supermarket", cities: ["Ouagadougou"] },
      { name: "Supermarché Somgta", type: "supermarket", cities: ["Ouagadougou", "Bobo-Dioulasso"] },
      { name: "Espace Bon Appétit", type: "supermarket", cities: ["Ouagadougou"] },
    ],
    hospitals: [
      { name: "CHU Yalgado Ouédraogo", type: "public", cities: ["Ouagadougou"] },
      { name: "CHU Pédiatrique Charles de Gaulle", type: "public", cities: ["Ouagadougou"] },
      { name: "CHU Sourô Sanou", type: "public", cities: ["Bobo-Dioulasso"] },
      { name: "Clinique Notre Dame de la Paix", type: "private", cities: ["Ouagadougou"] },
      { name: "Clinique Suka", type: "private", cities: ["Ouagadougou"] },
    ],
    pharmacies: [
      { name: "Pharmacie de l'Océan", type: "pharmacy", cities: ["Ouagadougou"] },
      { name: "Pharmacie du Marché Rood Woko", type: "pharmacy", cities: ["Ouagadougou"] },
      { name: "Pharmacie du Centre", type: "pharmacy", cities: ["Ouagadougou"] },
      { name: "Pharmacie de Bobo", type: "pharmacy", cities: ["Bobo-Dioulasso"] },
    ],
    internetProviders: [
      {
        name: "Orange Burkina Faso",
        type: "mobile-data",
        plans: [
          { name: "Journalier 200MB", price: 200, currency: "XOF" },
          { name: "Hebdo 2GB", price: 2000, currency: "XOF" },
          { name: "Mensuel 10GB", price: 10000, currency: "XOF" },
          { name: "Mensuel 60GB", price: 30000, currency: "XOF" },
        ],
      },
      {
        name: "Moov Africa Burkina Faso",
        type: "mobile-data",
        plans: [
          { name: "Journalier 200MB", price: 200, currency: "XOF" },
          { name: "Hebdo 2GB", price: 2000, currency: "XOF" },
          { name: "Mensuel 12GB", price: 11000, currency: "XOF" },
          { name: "Mensuel 70GB", price: 35000, currency: "XOF" },
        ],
      },
      {
        name: "Telecel Faso",
        type: "mobile-data",
        plans: [
          { name: "Journalier 200MB", price: 200, currency: "XOF" },
          { name: "Hebdo 2GB", price: 2000, currency: "XOF" },
          { name: "Mensuel 15GB", price: 12000, currency: "XOF" },
          { name: "Mensuel 60GB", price: 30000, currency: "XOF" },
        ],
      },
      {
        name: "FasoNet (ONATEL fixed)",
        type: "broadband",
        plans: [
          { name: "ADSL 8Mbps", price: 25000, currency: "XOF" },
          { name: "Fibre 20Mbps", price: 45000, currency: "XOF" },
        ],
      },
    ],
    universities: [
      { name: "Université Joseph Ki-Zerbo (Ouaga 1)", type: "public", city: "Ouagadougou", tuitionRange: "FCFA 50,000 – FCFA 200,000/yr" },
      { name: "Université Nazi Boni (UNB)", type: "public", city: "Bobo-Dioulasso", tuitionRange: "FCFA 60,000 – FCFA 200,000/yr" },
      { name: "Université Thomas Sankara (Ouaga 2)", type: "public", city: "Ouagadougou", tuitionRange: "FCFA 50,000 – FCFA 180,000/yr" },
      { name: "Université Nazi Boni — Institut de Développement Rural", type: "public", city: "Bobo-Dioulasso", tuitionRange: "FCFA 60,000 – FCFA 200,000/yr" },
      { name: "Institut Universitaire de Technologie (IUT)", type: "private", city: "Ouagadougou", tuitionRange: "FCFA 500,000 – FCFA 900,000/yr" },
    ],
    fuelStations: [
      { name: "TotalEnergies Burkina Faso", type: "fuel", cities: ["All cities"] },
      { name: "Coris Oil (Coris Bank group)", type: "fuel", cities: ["Ouagadougou", "Bobo-Dioulasso", "Koudougou"] },
      { name: "Pétrofa", type: "fuel", cities: ["Ouagadougou", "Bobo-Dioulasso"] },
      { name: "SBM (Société Burkinabè des Mélanges)", type: "fuel", cities: ["Ouagadougou"] },
      { name: "Oilibya Burkina", type: "fuel", cities: ["Ouagadougou", "Bobo-Dioulasso"] },
    ],
    electricity: [
      { name: "SONABEL (Société Nationale d'Électricité du Burkina Faso)", type: "electricity", coverage: "Nationwide" },
    ],
    water: [
      { name: "ONEA (Office National de l'Eau et de l'Assainissement)", type: "water", coverage: "Nationwide urban" },
    ],
    tv: [
      {
        name: "Canal+ Burkina",
        type: "satellite-tv",
        packages: [
          { name: "Access", price: 9900, currency: "XOF" },
          { name: "Evolution", price: 14900, currency: "XOF" },
          { name: "Tout-Canal", price: 29900, currency: "XOF" },
        ],
      },
      {
        name: "DStv Burkina",
        type: "satellite-tv",
        packages: [
          { name: "DStv Access", price: 5500, currency: "XOF" },
          { name: "DStv Family", price: 9900, currency: "XOF" },
          { name: "DStv Compact", price: 17500, currency: "XOF" },
          { name: "DStv Premium", price: 45000, currency: "XOF" },
        ],
      },
      {
        name: "RTB (Radiodiffusion Télévision du Burkina)",
        type: "cable-tv",
        packages: [
          { name: "Free-to-air", price: 0, currency: "XOF" },
        ],
      },
    ],
    insurance: [
      { name: "NSIA Assurances Burkina Faso", type: "insurance", services: ["Health", "Auto", "Life", "Property"] },
      { name: "SUNU Assurances Burkina", type: "insurance", services: ["Health", "Auto", "Life", "Education"] },
      { name: "ASKIA Assurances Burkina", type: "insurance", services: ["Health", "Auto", "Property"] },
    ],
    government: [
      { name: "DGI Burkina (Direction Générale des Impôts)", type: "tax", services: ["Impôt sur le Revenu", "TVA", "Patente", "Droits d'enregistrement"] },
      { name: "CNSS Burkina (Caisse Nationale de Sécurité Sociale)", type: "social-security", services: ["Pensions", "Allocations familiales", "Risques professionnels"] },
      { name: "CARFO (Caisse Autonome de Retraite des Fonctionnaires)", type: "social-security", services: ["Pensions (civil servants)"] },
    ],
  },
};

// ----- Helpers ------------------------------------------------------------

/**
 * Get all services for a single country. Returns `null` if the country code
 * is not present in the database.
 */
export function getCountryServices(countryCode: string): CountryServices | null {
  return COUNTRY_SERVICES[countryCode.toUpperCase()] ?? null;
}

/**
 * Return only the providers of a single category for a country, optionally
 * filtered to a specific city.
 *
 * - For city-scoped categories (transport, restaurants, supermarkets,
 *   hospitals, pharmacies, fuelStations), a provider is included if its
 *   `cities` array either contains the requested city (case-insensitive) OR
 *   contains the literal "All cities".
 * - For coverage-scoped categories (electricity, water), no city filter is
 *   applied (coverage strings are free text).
 * - For plan / package / service categories (internetProviders, tv,
 *   insurance, government), no city filter is applied.
 * - For universities, the filter is applied to the `city` field instead.
 */
export function getCategoryServices(
  countryCode: string,
  category: string,
  city?: string,
): unknown[] | null {
  const country = getCountryServices(countryCode);
  if (!country) return null;
  const key = category as keyof CountryServices;
  if (!SERVICE_CATEGORIES.includes(key as ServiceCategory)) return null;
  const list = country[key];
  if (!Array.isArray(list)) return null;

  if (!city) return list as unknown[];

  const c = city.trim().toLowerCase();
  if (!c) return list as unknown[];

  return (list as unknown[]).filter((item) => {
    if (!item || typeof item !== "object") return false;
    const obj = item as Record<string, unknown>;
    // Universities use `city` (string)
    if (typeof obj.city === "string") {
      return obj.city.toLowerCase() === c;
    }
    // City-scoped providers use `cities` (string[])
    if (Array.isArray(obj.cities)) {
      const cities = obj.cities as string[];
      return (
        cities.some((x) => x.toLowerCase() === c) ||
        cities.some((x) => x.toLowerCase() === "all cities")
      );
    }
    // Coverage / plan / package / service providers — no city filter
    return true;
  });
}

/**
 * List the country codes that have a populated service database.
 */
export function listServicedCountries(): string[] {
  return Object.keys(COUNTRY_SERVICES);
}
