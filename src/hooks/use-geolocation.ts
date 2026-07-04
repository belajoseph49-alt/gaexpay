"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * useGeolocation — ask the browser for the user's GPS position, then
 * reverse-geocode the lat/lng into a { country, city, countryCode } triple
 * using BigDataCloud's free, no-API-key reverse-geocode endpoint.
 *
 * Returns:
 *   - latitude, longitude, accuracy — last known coordinates (or null)
 *   - loading                       — true while a request is in-flight
 *   - error                         — human-readable error string
 *   - request()                     — ask for permission & fetch position
 *   - location                      — { country, city, countryCode, source } | null
 *
 * Behaviour:
 *   - On mount we hydrate from localStorage (`gxp_last_location`) so the UI
 *     can render instantly before asking for permission again.
 *   - `request()` is explicit — it calls `getCurrentPosition`, so the
 *     browser prompt only appears when the user clicks "Use GPS".
 *   - On success we reverse-geocode, store the result in localStorage,
 *     and return the resolved location via `setLocation`.
 *   - "Permission denied" / unsupported / timeout all collapse to a
 *     friendly `error` string and leave `location` untouched.
 */

const LS_KEY = "gxp_last_location";

export type ResolvedLocation = {
  country: string;       // full country name, e.g. "Nigeria"
  countryCode: string;   // ISO-3166 alpha-2, e.g. "NG"
  city: string | null;   // city / locality name, e.g. "Lagos"
  source: "gps" | "cache";
  latitude: number;
  longitude: number;
  accuracy?: number;
};

type BigDataCloudResp = {
  countryName?: string;
  countryCode?: string;
  city?: string;
  locality?: string;
  principalSubdivision?: string;
};

type CachedLocation = {
  country: string;
  countryCode: string;
  city: string | null;
  latitude: number;
  longitude: number;
  accuracy?: number;
  ts: number;
};

function readCache(): CachedLocation | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedLocation;
    if (
      typeof parsed.country !== "string" ||
      typeof parsed.countryCode !== "string" ||
      typeof parsed.latitude !== "number" ||
      typeof parsed.longitude !== "number"
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(loc: CachedLocation) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(loc));
  } catch {
    /* localStorage might be unavailable (private mode) — ignore. */
  }
}

function prettyError(err: GeolocationPositionError | null, fallback: string): string {
  if (!err) return fallback;
  switch (err.code) {
    case err.PERMISSION_DENIED:
      return "Location permission denied. You can still pick your country & city manually.";
    case err.POSITION_UNAVAILABLE:
      return "Your location is unavailable right now. Try again or pick manually.";
    case err.TIMEOUT:
      return "Location request timed out. Try again or pick manually.";
    default:
      return fallback;
  }
}

async function reverseGeocode(lat: number, lng: number): Promise<{
  country: string;
  countryCode: string;
  city: string | null;
}> {
  const url =
    `https://api.bigdatacloud.net/data/reverse-geocode-client` +
    `?latitude=${lat}&longitude=${lng}&localityLanguage=en`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Reverse geocode failed (${res.status})`);
  const json = (await res.json()) as BigDataCloudResp;
  const country = (json.countryName || "").trim();
  const countryCode = (json.countryCode || "").trim().toUpperCase();
  const city =
    (json.city || json.locality || json.principalSubdivision || "").trim() || null;
  if (!country || !countryCode) {
    throw new Error("Reverse geocode returned an incomplete address.");
  }
  return { country, countryCode, city };
}

export function useGeolocation() {
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState<ResolvedLocation | null>(null);

  // Hydrate from localStorage on mount so we can render instantly without
  // re-prompting the user for permission.
  useEffect(() => {
    const cached = readCache();
    if (cached) {
      setLatitude(cached.latitude);
      setLongitude(cached.longitude);
      setAccuracy(cached.accuracy ?? null);
      setLocation({
        country: cached.country,
        countryCode: cached.countryCode,
        city: cached.city,
        source: "cache",
        latitude: cached.latitude,
        longitude: cached.longitude,
        accuracy: cached.accuracy,
      });
    }
  }, []);

  const request = useCallback(async (): Promise<ResolvedLocation | null> => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("Geolocation is not supported on this device.");
      return null;
    }
    setLoading(true);
    setError(null);
    return new Promise<ResolvedLocation | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude: lat, longitude: lng, accuracy: acc } = pos.coords;
          setLatitude(lat);
          setLongitude(lng);
          setAccuracy(acc);
          try {
            const geo = await reverseGeocode(lat, lng);
            const resolved: ResolvedLocation = {
              country: geo.country,
              countryCode: geo.countryCode,
              city: geo.city,
              source: "gps",
              latitude: lat,
              longitude: lng,
              accuracy: acc,
            };
            writeCache({
              country: resolved.country,
              countryCode: resolved.countryCode,
              city: resolved.city,
              latitude: lat,
              longitude: lng,
              accuracy: acc,
              ts: Date.now(),
            });
            setLocation(resolved);
            setLoading(false);
            resolve(resolved);
          } catch (e: any) {
            setError(e?.message || "Could not resolve your address from GPS.");
            setLoading(false);
            resolve(null);
          }
        },
        (err) => {
          setError(prettyError(err, "Could not get your location."));
          setLoading(false);
          resolve(null);
        },
        {
          enableHighAccuracy: false,
          maximumAge: 5 * 60 * 1000, // accept a cached fix up to 5 min old
          timeout: 12_000,
        },
      );
    });
  }, []);

  return { latitude, longitude, accuracy, loading, error, request, location };
}
