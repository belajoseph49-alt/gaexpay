"use client";

import { useState } from "react";
import {
  Settings as SettingsIcon, User, Shield, Bell, Globe, Smartphone, Fingerprint,
  KeyRound, Mail, MessageSquare, CreditCard, Monitor, Trash2, LogOut,
  Check, ChevronRight, Moon, Sun, Laptop, ScanFace,
  Volume2, Vibrate, BellRing,
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
import { useFetch } from "@/hooks/use-fetch";
import { LANGUAGES, CURRENCIES, timeAgo } from "@/lib/gaexpay";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function SettingsView() {
  const { data } = useFetch<{ user: any }>("/api/me");
  const { data: devData } = useFetch<{ devices: any[] }>("/api/devices");
  const { theme, setTheme } = useTheme();
  const user = data?.user;
  const devices = devData?.devices ?? [];

  const [mfa, setMfa] = useState(user?.mfaEnabled ?? true);
  const [bio, setBio] = useState(user?.biometricEnabled ?? true);
  const [emailNotif, setEmailNotif] = useState(user?.emailNotif ?? true);
  const [pushNotif, setPushNotif] = useState(user?.pushNotif ?? true);
  const [smsNotif, setSmsNotif] = useState(user?.smsNotif ?? false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrateEnabled, setVibrateEnabled] = useState(true);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account, security & preferences</p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="profile"><User className="h-4 w-4 mr-1.5" /> Profile</TabsTrigger>
          <TabsTrigger value="security"><Shield className="h-4 w-4 mr-1.5" /> Security</TabsTrigger>
          <TabsTrigger value="notifications"><Bell className="h-4 w-4 mr-1.5" /> Notifications</TabsTrigger>
          <TabsTrigger value="preferences"><Globe className="h-4 w-4 mr-1.5" /> Preferences</TabsTrigger>
          <TabsTrigger value="devices"><Monitor className="h-4 w-4 mr-1.5" /> Devices</TabsTrigger>
        </TabsList>

        {/* Profile */}
        <TabsContent value="profile" className="mt-4 space-y-4">
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20 ring-4 ring-primary/20">
                <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground text-xl font-bold">
                  {user?.firstName?.[0]}{user?.lastName?.[0] || "AO"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="text-lg font-semibold">{user?.firstName} {user?.lastName}</h3>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
                <div className="mt-2 flex gap-2">
                  <Button size="sm" variant="outline">Change Photo</Button>
                  <Badge className="bg-emerald-500/15 text-emerald-600 border-0">
                    <Check className="h-3 w-3 mr-1" /> Verified
                  </Badge>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold mb-4">Personal Information</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="First Name" defaultValue={user?.firstName} />
              <Field label="Last Name" defaultValue={user?.lastName} />
              <Field label="Email" defaultValue={user?.email} />
              <Field label="Phone" defaultValue={user?.phone} />
              <Field label="Username" defaultValue={user?.username} prefix="@" />
              <Field label="Date of Birth" defaultValue={user?.dob} type="date" />
              <Field label="Country" defaultValue={user?.country} />
              <Field label="City" defaultValue={user?.city} />
              <div className="sm:col-span-2">
                <Field label="Address" defaultValue={user?.address} />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline">Cancel</Button>
              <Button onClick={() => toast.success("Profile updated")}>Save Changes</Button>
            </div>
          </Card>
        </TabsContent>

        {/* Security */}
        <TabsContent value="security" className="mt-4 space-y-4">
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Authentication</h3>
            <div className="space-y-3">
              <ToggleRow
                icon={Fingerprint}
                title="Biometric Login"
                desc="Use Face ID / Touch ID to sign in"
                checked={bio}
                onChange={(v) => { setBio(v); toast.success(v ? "Biometric enabled" : "Biometric disabled"); }}
              />
              <ToggleRow
                icon={KeyRound}
                title="Two-Factor Authentication (2FA)"
                desc="Require a code on every login"
                checked={mfa}
                onChange={(v) => { setMfa(v); toast.success(v ? "2FA enabled" : "2FA disabled"); }}
              />
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                    <ScanFace className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">2FA Method</p>
                    <p className="text-xs text-muted-foreground">How you receive verification codes</p>
                  </div>
                </div>
                <Select defaultValue={user?.twoFactorMethod || "authenticator"}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="authenticator">Authenticator App</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold mb-4">Password & PIN</h3>
            <div className="space-y-3">
              <Field label="Current Password" type="password" placeholder="••••••••" />
              <Field label="New Password" type="password" placeholder="••••••••" />
              <Field label="Confirm New Password" type="password" placeholder="••••••••" />
              <Button onClick={() => toast.success("Password updated")} className="mt-2">Update Password</Button>
            </div>
            <div className="mt-6 border-t pt-4">
              <p className="text-sm font-medium mb-3">Transaction PIN</p>
              <Button variant="outline" onClick={() => toast.info("PIN change requires biometric verification")}>
                <KeyRound className="h-4 w-4 mr-2" /> Change Transaction PIN
              </Button>
            </div>
          </Card>

          <Card className="border-rose-500/30 bg-rose-500/5 p-6">
            <h3 className="font-semibold text-rose-600 mb-2">Danger Zone</h3>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" className="border-rose-500/30 text-rose-600 hover:bg-rose-500/10">
                <LogOut className="h-4 w-4 mr-2" /> Log Out All Devices
              </Button>
              <Button variant="outline" className="border-rose-500/30 text-rose-600 hover:bg-rose-500/10">
                <Trash2 className="h-4 w-4 mr-2" /> Close Account
              </Button>
            </div>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="mt-4 space-y-4">
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Notification Channels</h3>
            <div className="space-y-3">
              <ToggleRow icon={Bell} title="Push Notifications" desc="Real-time alerts on your devices" checked={pushNotif} onChange={(v) => { setPushNotif(v); toast.success("Updated"); }} />
              <ToggleRow icon={Mail} title="Email Notifications" desc="Summary & important updates via email" checked={emailNotif} onChange={(v) => { setEmailNotif(v); toast.success("Updated"); }} />
              <ToggleRow icon={MessageSquare} title="SMS Alerts" desc="Critical alerts via SMS (charges apply)" checked={smsNotif} onChange={(v) => { setSmsNotif(v); toast.success("Updated"); }} />
            </div>
          </Card>
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Notification Types</h3>
            <div className="space-y-3">
              {[
                { label: "Transaction alerts", desc: "Every send, receive & payment", on: true },
                { label: "Security alerts", desc: "Logins, password changes, new devices", on: true },
                { label: "Bill reminders", desc: "Upcoming & due bills", on: true },
                { label: "Exchange rate alerts", desc: "When your target rate hits", on: false },
                { label: "Promotions & offers", desc: "Deals, cashback & rewards", on: false },
                { label: "Referral updates", desc: "When friends sign up", on: true },
              ].map((n) => (
                <div key={n.label} className="flex items-center justify-between border-b pb-3 last:border-0">
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
            <h3 className="font-semibold mb-4">Sound & Haptics</h3>
            <div className="space-y-3">
              <ToggleRow icon={Volume2} title="Notification Sound" desc="Play sound for incoming notifications" checked={soundEnabled} onChange={(v) => { setSoundEnabled(v); toast.success(v ? "Sound enabled" : "Sound disabled"); }} />
              <ToggleRow icon={Vibrate} title="Vibration" desc="Vibrate device on notifications (mobile)" checked={vibrateEnabled} onChange={(v) => { setVibrateEnabled(v); toast.success(v ? "Vibration enabled" : "Vibration disabled"); }} />
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                    <BellRing className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Quiet Hours</p>
                    <p className="text-xs text-muted-foreground">Mute notifications 10 PM – 7 AM</p>
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
                    <p className="text-sm font-medium">Notification Volume</p>
                    <p className="text-xs text-muted-foreground">Adjust sound level</p>
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
            <h3 className="font-semibold mb-4">Appearance & Language</h3>
            <div className="space-y-4">
              <div>
                <Label className="mb-2 block">Theme</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "light", label: "Light", icon: Sun },
                    { id: "dark", label: "Dark", icon: Moon },
                    { id: "system", label: "System", icon: Laptop },
                  ].map((t) => {
                    const Icon = t.icon;
                    return (
                      <button
                        key={t.id}
                        onClick={() => { setTheme(t.id); toast.success(`Theme: ${t.label}`); }}
                        className={cn(
                          "flex flex-col items-center gap-2 rounded-xl border p-4 transition",
                          theme === t.id ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "hover:bg-muted",
                        )}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="text-xs font-medium">{t.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <Label className="mb-2 block">Language</Label>
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
                <Label className="mb-2 block">Default Currency</Label>
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
              <h3 className="font-semibold">Active Devices</h3>
              <Button variant="outline" size="sm" onClick={() => toast.success("Logged out of all other devices")}>
                <LogOut className="h-4 w-4 mr-1.5" /> Log out all
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
                      {d.trusted && <Badge variant="outline" className="text-[10px] text-emerald-600">Trusted</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">{d.os} · {d.browser} · {d.location}</p>
                    <p className="text-[10px] text-muted-foreground">Last active {timeAgo(d.lastActive)} · {d.ip}</p>
                  </div>
                  <Button size="sm" variant="ghost" className="text-rose-600 hover:bg-rose-500/10" onClick={() => toast.success("Device revoked")}>
                    Revoke
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Field({ label, defaultValue, type = "text", placeholder, prefix }: any) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="relative">
        {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{prefix}</span>}
        <Input type={type} defaultValue={defaultValue} placeholder={placeholder} className={prefix ? "pl-7" : ""} />
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
