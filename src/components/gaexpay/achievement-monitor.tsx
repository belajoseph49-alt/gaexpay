"use client";

import { useEffect, useRef } from "react";
import { useFetch } from "@/hooks/use-fetch";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface Achievement {
  id: string;
  icon: string;
  title: string;
  description: string;
  unlocked: boolean;
}

/**
 * Monitors achievements and fires a celebratory toast
 * when a new achievement is unlocked during the session.
 */
export function AchievementMonitor() {
  const { data } = useFetch<{ achievements: Achievement[]; unlockedCount: number; level: number }>("/api/achievements");
  const prevUnlockedRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!data?.achievements) return;

    const currentUnlocked = new Set(
      data.achievements.filter((a) => a.unlocked).map((a) => a.id)
    );

    // Skip on first load (don't toast for already-unlocked achievements)
    if (prevUnlockedRef.current === null) {
      prevUnlockedRef.current = currentUnlocked;
      return;
    }

    // Find newly unlocked achievements
    const newlyUnlocked = data.achievements.filter(
      (a) => a.unlocked && !prevUnlockedRef.current!.has(a.id)
    );

    // Fire toast for each newly unlocked achievement
    newlyUnlocked.forEach((a, i) => {
      setTimeout(() => {
        toast.custom(
          () => (
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="relative overflow-hidden rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-orange-500/10 p-4 shadow-lg"
            >
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-2xl shadow-lg">
                  {a.icon}
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">
                    Achievement Unlocked!
                  </p>
                  <p className="text-sm font-bold">{a.title}</p>
                  <p className="text-xs text-muted-foreground">{a.description}</p>
                </div>
              </div>
            </motion.div>
          ),
          { duration: 5000, position: "top-center" }
        );
      }, i * 800); // Stagger multiple unlocks
    });

    prevUnlockedRef.current = currentUnlocked;
  }, [data]);

  return null;
}
