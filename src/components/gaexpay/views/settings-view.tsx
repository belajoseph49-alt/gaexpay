// @ts-nocheck
"use client";

import { useState } from "react";
import {
  Settings as SettingsIcon, User, Shield, Bell, Globe, Smartphone, Fingerprint,
  KeyRound, Mail, MessageSquare, CreditCard, Monitor, Trash2, LogOut,
  Check, ChevronRight, Moon, Sun, Laptop, ScanFace,
  Volume2, Vibrate, BellRing, Loader2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useFetch } from "@/hooks/use-fetch";
import { LANGUAGES, CURRENCIES, timeAgo } from "@/lib/gaexpay";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useFormatMoney } from "@/hooks/use-format-money";
import { useTranslation } from "@/hooks/use-translation";


export function SettingsView() {
  const { t } = useTranslation();
  const { data, refetch } = useFetch<{ user: any }>("/api/me");
  const { data: devData, refetch: refetchDevices } = useFetch<{ devices: any[] }>("/api/devices");
  const { theme, setTheme } = useTheme();
  const user = data?.user;
  const devices = devData?.devices ?? [];

  const [mfa, setMfa] = useState(user?.mfaEnabled ?? true);
  const { fmt, symbol, currency: userCur } = useFormatMoney();
  const [bio, setBio] = useState(user?.biometricEnabled ?? true);
  const [emailNotif, setEmailNotif] = useState(user?.emailNotif ?? true);
  const [pushNotif, setPushNotif] = useState(user?.pushNotif ?? true);
  const [smsNotif, setSmsNotif] = useState(user?.smsNotif ?? false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrateEnabled, setVibrateEnabled] = useState(true);
  
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleProfileUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsUpdating(true);
    const formData = new FormData(e.currentTarget);
    const payload = Object.fromEntries(formData.entries());
    
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to update profile");
      toast.success("Profile updated");
      refetch();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be less than 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result;
      if (!base64) return;
      
      try {
        const res = await fetch("/api/me", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ avatar: base64 }),
        });
        if (!res.ok) throw new Error("Failed to upload avatar");
        toast.success("Avatar updated");
        refetch();
      } catch (err: any) {
        toast.error(err.message);
      }
    };
    reader.readAsDataURL(file);
  };

  const handle2FAUpdate = async (key: string, value: any) => {
    try {
      const res = await fetch("/api/security/2fa", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });
      if (!res.ok) throw new Error("Failed to update security settings");
      toast.success("Security settings updated");
      refetch();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleRevokeDevice = async (id: string) => {
    try {
      const res = await fetch(`/api/devices?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to revoke device");
      toast.success(id === "all" ? "Logged out of all other devices" : "Device revoked");
      refetchDevices();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsUpdating(true);
    const formData = new FormData(e.currentTarget);
    const currentPassword = formData.get("currentPassword");
    const newPassword = formData.get("newPassword");
    const confirmPassword = formData.get("confirmPassword");

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      setIsUpdating(false);
      return;
    }

    try {
      const res = await fetch("/api/security/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to update password");
      }
      toast.success("Password updated");
      e.currentTarget.reset();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleBusinessUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsUpdating(true);
    const formData = new FormData(e.currentTarget);
    const payload = Object.fromEntries(formData.entries());
    
    try {
      const res = await fetch("/api/business-pro/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to update business profile");
      toast.success("Business profile updated");
      // Could refetch business data if we had a dedicated query for it here
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("settings.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("settings.subtitle")}</p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="profile"><User className="h-4 w-4 mr-1.5" /> {t("settings.tabs.profile", { defaultValue: "Profile" })}</TabsTrigger>
          <TabsTrigger value="security"><Shield className="h-4 w-4 mr-1.5" /> {t("settings.tabs.security", { defaultValue: "Security" })}</TabsTrigger>
          <TabsTrigger value="notifications"><Bell className="h-4 w-4 mr-1.5" /> {t("settings.tabs.notifications", { defaultValue: "Notifications" })}</TabsTrigger>
          <TabsTrigger value="preferences"><Globe className="h-4 w-4 mr-1.5" /> {t("settings.tabs.preferences", { defaultValue: "Preferences" })}</TabsTrigger>
          <TabsTrigger value="devices"><Monitor className="h-4 w-4 mr-1.5" /> {t("settings.tabs.devices", { defaultValue: "Devices" })}</TabsTrigger>
          {user?.role === "business" && (
            <TabsTrigger value="business"><CreditCard className="h-4 w-4 mr-1.5" /> {t("settings.tabs.business", { defaultValue: "Business Profile" })}</TabsTrigger>
          )}
        </TabsList>

        {/* Profile */}
        <TabsContent value="profile" className="mt-4 space-y-4">
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20 ring-4 ring-primary/20">
                {user?.avatar ? (
                  <img src={user.avatar} alt="Avatar" className="h-full w-full object-cover rounded-full" />
                ) : (
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground text-xl font-bold" suppressHydrationWarning>
                    {user ? `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}` : "AO"}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="flex-1">
                <h3 className="text-lg font-semibold">{user?.firstName} {user?.lastName}</h3>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
                <div className="mt-2 flex gap-2">
                  <div className="relative">
                    <Button size="sm" variant="outline" className="relative z-10 pointer-events-none">{t("settings.profile.changePhoto", { defaultValue: "Change Photo" })}</Button>
                    <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer z-20" onChange={handleAvatarUpload} title={t("settings.profile.uploadPhoto", { defaultValue: "Upload new photo" })} />
                  </div>
                  {user?.kycStatus === "verified" && (
                    <Badge className="bg-violet-500/15 text-violet-600 border-0">
                      <Check className="h-3 w-3 mr-1" /> {t("settings.profile.verified", { defaultValue: "Verified" })}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold mb-4">{t("settings.profile.personalInfo", { defaultValue: "Personal Information" })}</h3>
            <form onSubmit={handleProfileUpdate}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field name="firstName" label={t("settings.profile.firstName", { defaultValue: "First Name" })} defaultValue={user?.firstName} />
                <Field name="lastName" label={t("settings.profile.lastName", { defaultValue: "Last Name" })} defaultValue={user?.lastName} />
                <Field name="email" label={t("settings.profile.email", { defaultValue: "Email" })} defaultValue={user?.email} disabled />
                <Field name="phone" label={t("settings.profile.phone", { defaultValue: "Phone" })} defaultValue={user?.phone} />
                <Field name="username" label={t("settings.profile.username", { defaultValue: "Username" })} defaultValue={user?.username} prefix="@" />
                <Field name="dob" label={t("settings.profile.dob", { defaultValue: "Date of Birth" })} defaultValue={user?.dob} type="date" />
                <Field name="country" label={t("settings.profile.country", { defaultValue: "Country" })} defaultValue={user?.country} />
                <Field name="city" label={t("settings.profile.city", { defaultValue: "City" })} defaultValue={user?.city} />
                <div className="sm:col-span-2">
                  <Field name="address" label={t("settings.profile.address", { defaultValue: "Address" })} defaultValue={user?.address} />
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <Button type="button" variant="outline">{t("common.cancel", { defaultValue: "Cancel" })}</Button>
                <Button type="submit" disabled={isUpdating}>{isUpdating ? t("common.saving", { defaultValue: "Saving..." }) : t("common.save", { defaultValue: "Save Changes" })}</Button>
              </div>
            </form>
          </Card>
        </TabsContent>

        {/* Security */}
        <TabsContent value="security" className="mt-4 space-y-4">
          <Card className="p-6">
            <h3 className="font-semibold mb-4">{t("settings.security.auth", { defaultValue: "Authentication" })}</h3>
            <div className="space-y-3">
              <ToggleRow
                icon={Fingerprint}
                title={t("settings.security.biometric", { defaultValue: "Biometric Login" })}
                desc={t("settings.security.biometricDesc", { defaultValue: "Use Face ID / Touch ID to sign in" })}
                checked={bio}
                onChange={(v) => { setBio(v); handle2FAUpdate('biometricEnabled', v); }}
              />
              <ToggleRow
                icon={KeyRound}
                title={t("settings.security.twoFactor", { defaultValue: "Two-Factor Authentication (2FA)" })}
                desc={t("settings.security.twoFactorDesc", { defaultValue: "Require a code on every login" })}
                checked={mfa}
                onChange={(v) => { setMfa(v); handle2FAUpdate('mfaEnabled', v); }}
              />
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                    <ScanFace className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{t("settings.security.twoFactorMethod", { defaultValue: "2FA Method" })}</p>
                    <p className="text-xs text-muted-foreground">{t("settings.security.twoFactorMethodDesc", { defaultValue: "How you receive verification codes" })}</p>
                  </div>
                </div>
                <Select defaultValue={user?.twoFactorMethod || "authenticator"} onValueChange={(v) => handle2FAUpdate('twoFactorMethod', v)}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="authenticator">{t("settings.security.authenticator", { defaultValue: "Authenticator App" })}</SelectItem>
                    <SelectItem value="sms">{t("settings.security.sms", { defaultValue: "SMS" })}</SelectItem>
                    <SelectItem value="email">{t("settings.security.email", { defaultValue: "Email" })}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold mb-4">{t("settings.security.passwordPin", { defaultValue: "Password & PIN" })}</h3>
            <form onSubmit={handlePasswordUpdate}>
              <div className="space-y-3">
                <Field name="currentPassword" label={t("settings.security.currentPassword", { defaultValue: "Current Password" })} type="password" placeholder="••••••••" />
                <Field name="newPassword" label={t("settings.security.newPassword", { defaultValue: "New Password" })} type="password" placeholder="••••••••" />
                <Field name="confirmPassword" label={t("settings.security.confirmPassword", { defaultValue: "Confirm New Password" })} type="password" placeholder="••••••••" />
                <Button type="submit" disabled={isUpdating} className="mt-2">{isUpdating ? t("common.saving", { defaultValue: "Updating..." }) : t("settings.security.updatePassword", { defaultValue: "Update Password" })}</Button>
              </div>
            </form>
            <div className="mt-6 border-t pt-4">
              <p className="text-sm font-medium mb-3">{t("settings.security.transactionPin", { defaultValue: "Transaction PIN" })}</p>
              <Button variant="outline" onClick={() => setPinModalOpen(true)}>
                <KeyRound className="h-4 w-4 mr-2" /> {t("settings.security.changePin", { defaultValue: "Change Transaction PIN" })}
              </Button>
            </div>
          </Card>

          <Card className="border-rose-500/30 bg-rose-500/5 p-6">
            <h3 className="font-semibold text-rose-600 mb-2">{t("settings.security.dangerZone", { defaultValue: "Danger Zone" })}</h3>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" className="border-rose-500/30 text-rose-600 hover:bg-rose-500/10" onClick={() => handleRevokeDevice('all')}>
                <LogOut className="h-4 w-4 mr-2" /> {t("settings.security.logoutAll", { defaultValue: "Log Out All Devices" })}
              </Button>
              <Button variant="outline" className="border-rose-500/30 text-rose-600 hover:bg-rose-500/10">
                <Trash2 className="h-4 w-4 mr-2" /> {t("settings.security.closeAccount", { defaultValue: "Close Account" })}
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="mt-4 space-y-4">
          <Card className="p-6">
            <h3 className="font-semibold mb-4">{t("settings.notifications.channels", { defaultValue: "Notification Channels" })}</h3>
            <div className="space-y-3">
              <ToggleRow icon={Bell} title={t("settings.notifications.push", { defaultValue: "Push Notifications" })} desc={t("settings.notifications.pushDesc", { defaultValue: "Real-time alerts on your devices" })} checked={pushNotif} onChange={(v) => { setPushNotif(v); toast.success("Updated"); }} />
              <ToggleRow icon={Mail} title={t("settings.notifications.email", { defaultValue: "Email Notifications" })} desc={t("settings.notifications.emailDesc", { defaultValue: "Summary & important updates via email" })} checked={emailNotif} onChange={(v) => { setEmailNotif(v); toast.success("Updated"); }} />
              <ToggleRow icon={MessageSquare} title={t("settings.notifications.sms", { defaultValue: "SMS Alerts" })} desc={t("settings.notifications.smsDesc", { defaultValue: "Critical alerts via SMS (charges apply)" })} checked={smsNotif} onChange={(v) => { setSmsNotif(v); toast.success("Updated"); }} />
            </div>
          </Card>
          <Card className="p-6">
            <h3 className="font-semibold mb-4">{t("settings.notifications.types", { defaultValue: "Notification Types" })}</h3>
            <div className="space-y-3">
              {[
                { label: t("settings.notifications.txAlerts", { defaultValue: "Transaction alerts" }), desc: t("settings.notifications.txAlertsDesc", { defaultValue: "Every send, receive & payment" }), on: true },
                { label: t("settings.notifications.secAlerts", { defaultValue: "Security alerts" }), desc: t("settings.notifications.secAlertsDesc", { defaultValue: "Logins, password changes, new devices" }), on: true },
                { label: t("settings.notifications.billReminders", { defaultValue: "Bill reminders" }), desc: t("settings.notifications.billRemindersDesc", { defaultValue: "Upcoming & due bills" }), on: true },
                { label: t("settings.notifications.rateAlerts", { defaultValue: "Exchange rate alerts" }), desc: t("settings.notifications.rateAlertsDesc", { defaultValue: "When your target rate hits" }), on: false },
                { label: t("settings.notifications.promos", { defaultValue: "Promotions & offers" }), desc: t("settings.notifications.promosDesc", { defaultValue: "Deals, cashback & rewards" }), on: false },
                { label: t("settings.notifications.referrals", { defaultValue: "Referral updates" }), desc: t("settings.notifications.referralsDesc", { defaultValue: "When friends sign up" }), on: true },
              ].map((n, i) => (
                <div key={i} className="flex items-center justify-between border-b pb-3 last:border-0">
                  <div>
                    <p className="text-sm font-medium">{n.label}</p>
                    <p className="text-xs text-muted-foreground">{n.desc}</p>
                  </div>
                  <Switch defaultChecked={n.on} />
                </div>
              ))}
            </div>
          </Card>

          {/* Sound & Haptics */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4">{t("settings.notifications.soundHaptics", { defaultValue: "Sound & Haptics" })}</h3>
            <div className="space-y-3">
              <ToggleRow icon={Volume2} title={t("settings.notifications.sound", { defaultValue: "Notification Sound" })} desc={t("settings.notifications.soundDesc", { defaultValue: "Play sound for incoming notifications" })} checked={soundEnabled} onChange={(v) => { setSoundEnabled(v); toast.success(v ? "Sound enabled" : "Sound disabled"); }} />
              <ToggleRow icon={Vibrate} title={t("settings.notifications.vibration", { defaultValue: "Vibration" })} desc={t("settings.notifications.vibrationDesc", { defaultValue: "Vibrate device on notifications (mobile)" })} checked={vibrateEnabled} onChange={(v) => { setVibrateEnabled(v); toast.success(v ? "Vibration enabled" : "Vibration disabled"); }} />
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                    <BellRing className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{t("settings.notifications.quietHours", { defaultValue: "Quiet Hours" })}</p>
                    <p className="text-xs text-muted-foreground">{t("settings.notifications.quietHoursDesc", { defaultValue: "Mute notifications 10 PM – 7 AM" })}</p>
                  </div>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-amber-500/15 text-amber-500">
                    <Volume2 className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{t("settings.notifications.volume", { defaultValue: "Notification Volume" })}</p>
                    <p className="text-xs text-muted-foreground">{t("settings.notifications.volumeDesc", { defaultValue: "Adjust sound level" })}</p>
                  </div>
                </div>
                <input type="range" min="0" max="100" defaultValue="70" className="w-24 accent-primary" />
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Preferences */}
        <TabsContent value="preferences" className="mt-4 space-y-4">
          <Card className="p-6">
            <h3 className="font-semibold mb-4">{t("settings.preferences.appearance", { defaultValue: "Appearance & Language" })}</h3>
            <div className="space-y-4">
              <div>
                <Label className="mb-2 block">{t("settings.preferences.theme", { defaultValue: "Theme" })}</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "light", label: t("settings.preferences.light", { defaultValue: "Light" }), icon: Sun },
                    { id: "dark", label: t("settings.preferences.dark", { defaultValue: "Dark" }), icon: Moon },
                    { id: "system", label: t("settings.preferences.system", { defaultValue: "System" }), icon: Laptop },
                  ].map((tItem) => {
                    const Icon = tItem.icon;
                    return (
                      <button
                        key={tItem.id}
                        onClick={() => { setTheme(tItem.id); toast.success(`Theme: ${tItem.label}`); }}
                        className={cn(
                          "flex flex-col items-center gap-2 rounded-xl border p-4 transition",
                          theme === tItem.id ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "hover:bg-muted",
                        )}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="text-xs font-medium">{tItem.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <Label className="mb-2 block">{t("settings.preferences.language", { defaultValue: "Language" })}</Label>
                <Select defaultValue={user?.language || "en"}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((l) => (
                      <SelectItem key={l.code} value={l.code}>{l.flag} {l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-2 block">{t("settings.preferences.currency", { defaultValue: "Default Currency" })}</Label>
                <Select defaultValue={user?.currency || "NGN"}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>{c.flag} {c.code} — {c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Devices */}
        <TabsContent value="devices" className="mt-4 space-y-4">
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold">{t("settings.devices.active", { defaultValue: "Active Devices" })}</h3>
              <Button variant="outline" size="sm" onClick={() => handleRevokeDevice('all')}>
                <LogOut className="h-4 w-4 mr-1.5" /> {t("settings.devices.logoutAll", { defaultValue: "Log out all" })}
              </Button>
            </div>
            <div className="space-y-2">
              {devices.map((d) => (
                <div key={d.id} className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                    {d.type === "mobile" ? <Smartphone className="h-5 w-5" /> : d.type === "tablet" ? <Smartphone className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{d.name}</p>
                      {d.trusted && <Badge variant="outline" className="text-[10px] text-violet-600">{t("settings.devices.trusted", { defaultValue: "Trusted" })}</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">{d.os} · {d.browser} · {d.location}</p>
                    <p className="text-[10px] text-muted-foreground">{t("settings.devices.lastActive", { defaultValue: "Last active" })} {timeAgo(d.lastActive)} · {d.ip}</p>
                  </div>
                  <Button size="sm" variant="ghost" className="text-rose-600 hover:bg-rose-500/10" onClick={() => handleRevokeDevice(d.id)}>
                    {t("settings.devices.revoke", { defaultValue: "Revoke" })}
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        {/* Business */}
        {user?.role === "business" && (
          <TabsContent value="business" className="mt-4 space-y-4">
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Business Profile</h3>
              <form onSubmit={handleBusinessUpdate}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field name="companyName" label="Business Name" defaultValue={user?.businessProfile?.companyName} placeholder="Your Business Name" />
                  <Field name="industry" label="Industry" defaultValue={user?.businessProfile?.industry} placeholder="e.g. Retail, Software" />
                  <Field name="companyType" label="Company Type" defaultValue={user?.businessProfile?.companyType} placeholder="e.g. LLC, Corporation" />
                  <Field name="website" label="Website URL" defaultValue={user?.businessProfile?.website} placeholder="https://" />
                  <div className="sm:col-span-2">
                    <Field name="legalAddress" label="Legal Address" defaultValue={user?.businessProfile?.legalAddress} placeholder="Official business address" />
                  </div>
                  <Field name="legalCity" label="Legal City" defaultValue={user?.businessProfile?.legalCity} placeholder="City" />
                  <Field name="legalCountry" label="Legal Country" defaultValue={user?.businessProfile?.legalCountry} placeholder="Country" />
                  <Field name="taxId" label="Tax ID" defaultValue={user?.businessProfile?.taxId} placeholder="TIN or equivalent" />
                  <Field name="registrationNumber" label="Registration Number" defaultValue={user?.businessProfile?.registrationNumber} placeholder="RC Number" />
                  <Field name="commercialRegistry" label="Commercial Registry" defaultValue={user?.businessProfile?.commercialRegistry} placeholder="Registry Info" />
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <Button type="button" variant="outline">Cancel</Button>
                  <Button type="submit" disabled={isUpdating}>{isUpdating ? "Saving..." : "Save Changes"}</Button>
                </div>
              </form>
            </Card>
          </TabsContent>
        )}
      </Tabs>
      <PinModal open={pinModalOpen} onOpenChange={setPinModalOpen} />
    </div>
  );
}

function Field({ label, name, defaultValue, type = "text", placeholder, prefix, disabled }: any) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="relative">
        {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{prefix}</span>}
        <Input name={name} type={type} defaultValue={defaultValue} placeholder={placeholder} className={prefix ? "pl-7" : ""} disabled={disabled} />
      </div>
    </div>
  );
}

function ToggleRow({ icon: Icon, title, desc, checked, onChange }: any) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-4">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">{desc}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function PinModal({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newPin || newPin.length < 4 || newPin.length > 6) {
      return toast.error("New PIN must be 4 to 6 digits");
    }
    if (newPin !== confirmPin) {
      return toast.error("New PIN and confirmation do not match");
    }

    setLoading(true);
    try {
      const res = await fetch("/api/security/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPin, newPin }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to update PIN");
      toast.success("Transaction PIN updated successfully!");
      setCurrentPin("");
      setNewPin("");
      setConfirmPin("");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to update PIN");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-emerald-500" />
            Change Transaction PIN
          </DialogTitle>
          <DialogDescription>
            Update the PIN code used to authorize wallet transfers and withdrawals.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Current PIN (leave blank if first time)</Label>
            <Input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={currentPin}
              onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ""))}
              placeholder="••••••"
              className="h-10 rounded-xl tracking-widest text-center text-lg"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">New PIN (4-6 digits)</Label>
            <Input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
              placeholder="••••"
              className="h-10 rounded-xl tracking-widest text-center text-lg"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Confirm New PIN</Label>
            <Input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
              placeholder="••••"
              className="h-10 rounded-xl tracking-widest text-center text-lg"
              required
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600"
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
              Update PIN
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
