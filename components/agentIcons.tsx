"use client";

import {
  User,
  Brain,
  UserSearch,
  Cpu,
  GitCompareArrows,
  MessageCircleQuestion,
  SearchCheck,
  ShieldCheck,
  Ban,
  Mic,
  Gauge,
  Fingerprint,
  Database,
  Network,
  type LucideIcon,
} from "lucide-react";
import type { AgentId } from "@/lib/types";

// Visual identity per agent — gives each node/card a distinct glyph.
export const AGENT_ICON: Record<AgentId, LucideIcon> = {
  "human-logger": User,
  "thinking-logger": Brain,
  "human-profiler": UserSearch,
  "engine-profiler": Cpu,
  "alignment-checker": GitCompareArrows,
  "question-generator": MessageCircleQuestion,
  "gap-analyzer": SearchCheck,
  constraints: ShieldCheck,
  antipatterns: Ban,
  voice: Mic,
  quality: Gauge,
  identity: Fingerprint,
  "harness-logger": Database,
  coordinator: Network,
};
