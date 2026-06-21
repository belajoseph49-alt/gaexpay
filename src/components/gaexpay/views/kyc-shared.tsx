"use client";

/**
 * Shared utilities for KYC and KYB verification flows:
 *  - ImageUpload: drag-and-drop / click file picker with preview
 *  - WebcamCapture: getUserMedia selfie capture with mirrored preview
 *  - fileToDataUrl: File → base64 data URL
 *  - detectGpsAddress: navigator.geolocation wrapper
 *
 * Used by:
 *  - src/components/gaexpay/views/kyc-view.tsx
 *  - src/components/gaexpay/views/kyb-view.tsx
 */

import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const MAX_FILE_BYTES = 2_000_000; // 2 MB cap per uploaded image

/** Convert a File to a base64 data URL (so it can ship in JSON). */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("File read failed"));
    reader.readAsDataURL(file);
  });
}

/** Try to read the device's GPS position. Returns null on failure. */
export function detectGpsAddress(): Promise<{ lat: number; lon: number } | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 },
    );
  });
}

// ---- ImageUpload -----------------------------------------------------------

export function ImageUpload({
  label,
  value,
  onChange,
  hint,
  aspect = "4/3",
}: {
  label: string;
  value: string;
  onChange: (dataUrl: string) => void;
  hint?: string;
  aspect?: string;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);

  const handleFile = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      toast.error("Image too large. Max 2 MB.");
      return;
    }
    setBusy(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      onChange(dataUrl);
    } catch {
      toast.error("Could not read file");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFile(e.dataTransfer.files?.[0] ?? null);
        }}
        className={cn(
          "group relative flex cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-border bg-muted/30 transition hover:border-primary/40 hover:bg-muted/50",
          value && "border-solid border-primary/30",
        )}
        style={{ aspectRatio: aspect }}
      >
        {value ? (
          <>
            <img
              src={value}
              alt={label}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-black/0 transition group-hover:bg-black/40">
              <div className="absolute inset-0 grid place-items-center opacity-0 transition group-hover:opacity-100">
                <Button size="sm" variant="secondary" type="button">
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Replace
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-1.5 px-4 text-center">
            {busy ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
              <ImagePlus className="h-6 w-6 text-muted-foreground" />
            )}
            <span className="text-xs text-muted-foreground">
              {busy ? "Reading…" : "Click or drop image"}
            </span>
            {hint && (
              <span className="text-[10px] text-muted-foreground/70">{hint}</span>
            )}
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}

// ---- WebcamCapture ---------------------------------------------------------

export function WebcamCapture({
  onCapture,
}: {
  onCapture: (dataUrl: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<"idle" | "starting" | "live" | "error">(
    "idle",
  );
  const [errorMsg, setErrorMsg] = useState<string>("");

  const start = async () => {
    setStatus("starting");
    setErrorMsg("");
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera API not supported in this browser");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      setStatus("live");
    } catch (e: any) {
      setStatus("error");
      setErrorMsg(
        e?.name === "NotAllowedError"
          ? "Camera permission denied. Please allow camera access or upload a photo instead."
          : (e?.message ?? "Unable to access camera"),
      );
    }
  };

  const stop = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setStatus("idle");
  };

  const capture = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Mirror to match the live preview
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    onCapture(dataUrl);
    stop();
  };

  useEffect(() => () => stop(), []);

  return (
    <div className="space-y-3">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-black ring-1 ring-border">
        <video
          ref={videoRef}
          playsInline
          muted
          className={cn(
            "h-full w-full -scale-x-100 object-cover transition-opacity",
            status === "live" ? "opacity-100" : "opacity-0",
          )}
        />
        {status !== "live" && (
          <div className="absolute inset-0 grid place-items-center text-center text-white/80">
            {status === "starting" ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="text-xs">Starting camera…</span>
              </div>
            ) : status === "error" ? (
              <div className="flex flex-col items-center gap-2 p-4">
                <AlertCircle className="h-6 w-6 text-rose-400" />
                <span className="text-xs">{errorMsg}</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Camera className="h-8 w-8" />
                <span className="text-xs">Tap "Start Camera" to begin</span>
              </div>
            )}
          </div>
        )}
        {status === "live" && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="h-48 w-48 rounded-full border-2 border-dashed border-white/60" />
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {status !== "live" ? (
          <Button
            type="button"
            onClick={start}
            size="sm"
            disabled={status === "starting"}
          >
            <Camera className="mr-1.5 h-4 w-4" /> Start Camera
          </Button>
        ) : (
          <>
            <Button type="button" onClick={capture} size="sm">
              <Camera className="mr-1.5 h-4 w-4" /> Capture Photo
            </Button>
            <Button type="button" onClick={stop} size="sm" variant="outline">
              Cancel
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
