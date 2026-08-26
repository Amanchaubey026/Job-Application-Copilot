export interface CountryInfo {
  name: string;
  aliases: string[];
  iso2: string;
  callingCode: string;
}

export const COUNTRIES: CountryInfo[] = [
  { name: "India", aliases: ["bharat", "hindustan", "republic of india"], iso2: "IN", callingCode: "91" },
  { name: "United States", aliases: ["usa", "us", "united states of america", "u.s.", "u.s.a.", "america"], iso2: "US", callingCode: "1" },
  { name: "United Kingdom", aliases: ["uk", "great britain", "britain", "england", "gb"], iso2: "GB", callingCode: "44" },
  { name: "Canada", aliases: ["ca"], iso2: "CA", callingCode: "1" },
  { name: "Australia", aliases: ["au"], iso2: "AU", callingCode: "61" },
  { name: "Germany", aliases: ["deutschland", "de"], iso2: "DE", callingCode: "49" },
  { name: "France", aliases: ["fr"], iso2: "FR", callingCode: "33" },
  { name: "Singapore", aliases: ["sg"], iso2: "SG", callingCode: "65" },
  { name: "United Arab Emirates", aliases: ["uae", "dubai"], iso2: "AE", callingCode: "971" },
  { name: "Netherlands", aliases: ["holland", "the netherlands", "nl"], iso2: "NL", callingCode: "31" },
  { name: "Ireland", aliases: ["republic of ireland", "ie"], iso2: "IE", callingCode: "353" },
  { name: "New Zealand", aliases: ["nz"], iso2: "NZ", callingCode: "64" },
  { name: "Japan", aliases: ["jp"], iso2: "JP", callingCode: "81" },
  { name: "Brazil", aliases: ["brasil", "br"], iso2: "BR", callingCode: "55" },
  { name: "Mexico", aliases: ["mx"], iso2: "MX", callingCode: "52" },
  { name: "Spain", aliases: ["espana", "es"], iso2: "ES", callingCode: "34" },
  { name: "Italy", aliases: ["italia", "it"], iso2: "IT", callingCode: "39" },
  { name: "Poland", aliases: ["pl"], iso2: "PL", callingCode: "48" },
  { name: "Sweden", aliases: ["se"], iso2: "SE", callingCode: "46" },
  { name: "Switzerland", aliases: ["ch"], iso2: "CH", callingCode: "41" },
  { name: "Pakistan", aliases: ["pk"], iso2: "PK", callingCode: "92" },
  { name: "Bangladesh", aliases: ["bd"], iso2: "BD", callingCode: "880" },
  { name: "Nigeria", aliases: ["ng"], iso2: "NG", callingCode: "234" },
  { name: "South Africa", aliases: ["za", "rsa"], iso2: "ZA", callingCode: "27" },
  { name: "Philippines", aliases: ["ph"], iso2: "PH", callingCode: "63" },
  { name: "Indonesia", aliases: ["id"], iso2: "ID", callingCode: "62" },
  { name: "China", aliases: ["prc", "cn"], iso2: "CN", callingCode: "86" },
  { name: "South Korea", aliases: ["korea", "republic of korea", "kr"], iso2: "KR", callingCode: "82" }
];

function normalizeCountryToken(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9+]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function findCountry(value?: string | null): CountryInfo | undefined {
  if (!value) return undefined;
  const needle = normalizeCountryToken(value);
  if (!needle) return undefined;
  return COUNTRIES.find((country) => {
    if (normalizeCountryToken(country.name) === needle) return true;
    if (country.iso2.toLowerCase() === needle) return true;
    if (country.callingCode === needle.replace(/^\+/, "")) return true;
    return country.aliases.some((alias) => normalizeCountryToken(alias) === needle);
  });
}

export function countryKeys(value: string): string[] {
  const country = findCountry(value);
  if (!country) return [normalizeCountryToken(value)].filter(Boolean);
  return [
    country.name,
    country.iso2,
    `+${country.callingCode}`,
    country.callingCode,
    ...country.aliases
  ].map(normalizeCountryToken);
}

export function inferCountryFromPhone(phone?: string | null): CountryInfo | undefined {
  if (!phone) return undefined;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return undefined;
  const ranked = [...COUNTRIES].sort((a, b) => b.callingCode.length - a.callingCode.length);
  return ranked.find((country) => digits.startsWith(country.callingCode));
}

export function inferCountryFromLocation(location?: string | null): CountryInfo | undefined {
  if (!location) return undefined;
  const parts = location
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  for (let index = parts.length - 1; index >= 0; index -= 1) {
    const hit = findCountry(parts[index]);
    if (hit) return hit;
  }
  return undefined;
}

export function inferCountryName(input: {
  country?: string;
  location?: string;
  city?: string;
  state?: string;
  phone?: string;
}): string | undefined {
  const direct = findCountry(input.country);
  if (direct) return direct.name;
  const fromLocation = inferCountryFromLocation(
    input.location || [input.city, input.state, input.country].filter(Boolean).join(", ")
  );
  if (fromLocation) return fromLocation.name;
  return inferCountryFromPhone(input.phone)?.name;
}
