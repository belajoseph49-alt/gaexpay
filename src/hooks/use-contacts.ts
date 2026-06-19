"use client";

import { useState, useCallback } from "react";

export interface DeviceContact {
  name: string;
  phone?: string;
  email?: string;
}

export interface ContactCheckResult {
  members: Array<{
    contactName: string;
    phone?: string;
    email?: string;
    gaexpayUser: {
      id: string;
      firstName: string;
      lastName: string;
      username: string | null;
      email: string;
      phone: string;
      kycStatus: string;
    };
  }>;
  nonMembers: Array<{
    name: string;
    phone?: string;
    email?: string;
  }>;
  totalChecked: number;
  memberCount: number;
}

/**
 * Hook to access device contacts and check GaexPay membership.
 *
 * Uses the Contact Picker API (Chrome/Android) when available.
 * Falls back to manual entry on unsupported browsers (iOS Safari, Firefox).
 */
export function useContacts() {
  const [deviceContacts, setDeviceContacts] = useState<DeviceContact[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [supported, setSupported] = useState(false);

  // Check if Contact Picker API is supported
  useState(() => {
    if (typeof window !== "undefined" && "contacts" in navigator && "ContactsManager" in window) {
      setSupported(true);
    }
  });

  /**
   * Request access to device contacts (Chrome/Android only).
   * Opens the native contact picker.
   */
  const pickContacts = useCallback(async () => {
    setLoading(true);
    try {
      // @ts-expect-error - Contact Picker API types not in TS yet
      const contacts = await navigator.contacts.select(
        ["name", "tel", "email"],
        { multiple: true }
      );

      if (contacts && contacts.length > 0) {
        const formatted: DeviceContact[] = contacts.map((c: any) => ({
          name: c.name?.[0] || "Unknown",
          phone: c.tel?.[0] || undefined,
          email: c.email?.[0] || undefined,
        }));
        setDeviceContacts(formatted);
        setHasPermission(true);
        return formatted;
      }
      setHasPermission(false);
      return [];
    } catch (e) {
      // User denied or API not available
      setHasPermission(false);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Check which contacts are GaexPay members.
   * Sends the contacts to the API for membership lookup.
   */
  const checkMembership = useCallback(async (contacts: DeviceContact[]): Promise<ContactCheckResult> => {
    try {
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contacts }),
      });
      if (!res.ok) throw new Error("Failed to check contacts");
      return await res.json();
    } catch {
      return { members: [], nonMembers: [], totalChecked: 0, memberCount: 0 };
    }
  }, []);

  /**
   * Manually add a contact (when Contact Picker API not available).
   */
  const addManualContact = useCallback((contact: DeviceContact) => {
    setDeviceContacts((prev) => {
      // Avoid duplicates
      if (prev.some((c) => c.phone === contact.phone || c.email === contact.email)) {
        return prev;
      }
      return [...prev, contact];
    });
  }, []);

  return {
    deviceContacts,
    loading,
    hasPermission,
    supported,
    pickContacts,
    checkMembership,
    addManualContact,
  };
}
