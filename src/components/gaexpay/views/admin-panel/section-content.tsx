"use client";

import { useState } from "react";
import { useFetch } from "@/hooks/use-fetch";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FileText, Save, Mail, MessageSquare, FileEdit } from "lucide-react";
import { SectionHeader, LoadingTable, apiAction, showError } from "./shared";
import { toast } from "sonner";

export function ContentSection() {
  const { data, loading, reload } = useFetch<any>("/api/admin/content");
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [tab, setTab] = useState("landing");

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <SectionHeader title="Content Management" description="Landing, email & SMS templates" icon={FileText} />
        <LoadingTable rows={5} />
      </div>
    );
  }

  const content = data.content;

  function save(group: string, keys: string[]) {
    const updates: Record<string, string> = {};
    for (const k of keys) {
      if (edits[k] !== undefined && edits[k] !== content[k]) {
        updates[k] = edits[k];
      }
    }
    if (Object.keys(updates).length === 0) {
      toast.success("Content saved");
      return;
    }
    apiAction(`/api/admin/content`, "PATCH", { updates }, "Content saved").then((r) => {
      if (!r.ok) showError(r.error || "Failed"); else { reload(); setEdits({}); }
    });
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Content Management"
        description="Landing page, email templates, SMS templates & legal content"
        icon={FileText}
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="landing"><FileEdit className="h-4 w-4 mr-1.5" /> Landing</TabsTrigger>
          <TabsTrigger value="email"><Mail className="h-4 w-4 mr-1.5" /> Email</TabsTrigger>
          <TabsTrigger value="sms"><MessageSquare className="h-4 w-4 mr-1.5" /> SMS</TabsTrigger>
          <TabsTrigger value="legal"><FileText className="h-4 w-4 mr-1.5" /> Legal</TabsTrigger>
        </TabsList>

        {/* Landing content */}
        <TabsContent value="landing" className="mt-4">
          <Card className="p-5 space-y-4 max-w-3xl">
            <div>
              <Label>Hero Title</Label>
              <Input defaultValue={content.hero_title} onChange={(e) => setEdits({ ...edits, hero_title: e.target.value })} />
            </div>
            <div>
              <Label>Hero Subtitle</Label>
              <Textarea defaultValue={content.hero_subtitle} onChange={(e) => setEdits({ ...edits, hero_subtitle: e.target.value })} rows={3} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Hero CTA</Label>
                <Input defaultValue={content.hero_cta} onChange={(e) => setEdits({ ...edits, hero_cta: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3].map((n) => (
                <div key={n}>
                  <Label>Feature {n} Title</Label>
                  <Input defaultValue={content[`feature_${n}_title`]} onChange={(e) => setEdits({ ...edits, [`feature_${n}_title`]: e.target.value })} />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3].map((n) => (
                <div key={n}>
                  <Label>Feature {n} Description</Label>
                  <Textarea defaultValue={content[`feature_${n}_desc`]} onChange={(e) => setEdits({ ...edits, [`feature_${n}_desc`]: e.target.value })} rows={3} />
                </div>
              ))}
            </div>
            <Button onClick={() => save("landing", ["hero_title", "hero_subtitle", "hero_cta", "feature_1_title", "feature_2_title", "feature_3_title", "feature_1_desc", "feature_2_desc", "feature_3_desc"])}>
              <Save className="h-4 w-4 mr-1.5" /> Save landing content
            </Button>
          </Card>
        </TabsContent>

        {/* Email templates */}
        <TabsContent value="email" className="mt-4">
          <Card className="p-5 space-y-4 max-w-3xl">
            {[
              { key: "email_template_welcome", label: "Welcome Email" },
              { key: "email_template_transaction", label: "Transaction Notification" },
              { key: "email_template_kyc_approved", label: "KYC Approved" },
              { key: "email_template_kyc_rejected", label: "KYC Rejected" },
            ].map((t) => (
              <div key={t.key}>
                <Label>{t.label}</Label>
                <Textarea defaultValue={content[t.key]} onChange={(e) => setEdits({ ...edits, [t.key]: e.target.value })} rows={3} />
              </div>
            ))}
            <Button onClick={() => save("email", ["email_template_welcome", "email_template_transaction", "email_template_kyc_approved", "email_template_kyc_rejected"])}>
              <Save className="h-4 w-4 mr-1.5" /> Save email templates
            </Button>
          </Card>
        </TabsContent>

        {/* SMS templates */}
        <TabsContent value="sms" className="mt-4">
          <Card className="p-5 space-y-4 max-w-3xl">
            {[
              { key: "sms_template_otp", label: "OTP / Verification Code" },
              { key: "sms_template_transaction", label: "Transaction Alert" },
            ].map((t) => (
              <div key={t.key}>
                <Label>{t.label}</Label>
                <Textarea defaultValue={content[t.key]} onChange={(e) => setEdits({ ...edits, [t.key]: e.target.value })} rows={2} />
                <p className="text-xs text-muted-foreground mt-1">Use placeholders: {`{code}, {amount}, {currency}, {recipient}`}</p>
              </div>
            ))}
            <Button onClick={() => save("sms", ["sms_template_otp", "sms_template_transaction"])}>
              <Save className="h-4 w-4 mr-1.5" /> Save SMS templates
            </Button>
          </Card>
        </TabsContent>

        {/* Legal */}
        <TabsContent value="legal" className="mt-4">
          <Card className="p-5 space-y-4 max-w-3xl">
            <div>
              <Label>FAQ Content</Label>
              <Textarea defaultValue={content.faq_content} onChange={(e) => setEdits({ ...edits, faq_content: e.target.value })} rows={6} />
            </div>
            <div>
              <Label>Terms & Conditions</Label>
              <Textarea defaultValue={content.terms_content} onChange={(e) => setEdits({ ...edits, terms_content: e.target.value })} rows={6} />
            </div>
            <div>
              <Label>Privacy Policy</Label>
              <Textarea defaultValue={content.privacy_content} onChange={(e) => setEdits({ ...edits, privacy_content: e.target.value })} rows={6} />
            </div>
            <Button onClick={() => save("legal", ["faq_content", "terms_content", "privacy_content"])}>
              <Save className="h-4 w-4 mr-1.5" /> Save legal content
            </Button>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
