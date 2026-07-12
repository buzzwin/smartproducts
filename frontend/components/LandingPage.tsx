"use client";

import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Boxes,
  Compass,
  Search,
  ListChecks,
  Wallet,
  Cloud,
  Sparkles,
  Mail,
  BarChart3,
  Target,
  Users,
  GitBranch,
  ArrowRight,
  ShieldCheck,
  Layers,
} from "lucide-react";

const features = [
  {
    icon: Boxes,
    title: "Product Management",
    description:
      "Full CRUD for products, modules, and hierarchical features with a unified workspace spanning Overview, Strategy, Discovery, Execution, Stakeholders, Metrics, and Cost.",
  },
  {
    icon: Compass,
    title: "Strategy & Planning",
    description:
      "Capture vision, goals, OKRs, and risks. Build Now/Next/Later, timeline, and quarter roadmaps, then prioritize with RICE, ICE, Value/Effort, and Kano models.",
  },
  {
    icon: Search,
    title: "Discovery & Research",
    description:
      "Track problems and evidence, log customer insights with sentiment and voting, run interviews, and manage stakeholders in one place.",
  },
  {
    icon: ListChecks,
    title: "Execution & Delivery",
    description:
      "Plan releases, organize workstreams and phases, and manage tasks with dependencies, priority, effort, and visual progress tracking.",
  },
  {
    icon: Wallet,
    title: "Cost & TCO Analysis",
    description:
      "A unified cost model with automatic Total Cost of Ownership breakdowns by category, scope, and cost type — plus revenue models, pricing tiers, and scenario comparison.",
  },
  {
    icon: Cloud,
    title: "Cloud Cost Sync",
    description:
      "Securely connect AWS, Azure, and GCP to sync monthly spend automatically. Credentials are encrypted at rest with AES-256 and mapped to your cost categories.",
  },
  {
    icon: Sparkles,
    title: "AI Assistant",
    description:
      "AI-powered form filling and content generation, plus a context-aware chatbot to help you move faster across the entire product lifecycle.",
  },
  {
    icon: Mail,
    title: "Email Agent",
    description:
      "An integrated email control station to connect accounts and automate product-related communication workflows.",
  },
  {
    icon: BarChart3,
    title: "Metrics & Reports",
    description:
      "Track outcome, output, and health metrics against targets, capture outcomes, and generate status reports with highlights, risks, and next steps.",
  },
];

const lifecycle = [
  { icon: Compass, label: "Strategy" },
  { icon: Search, label: "Discovery" },
  { icon: GitBranch, label: "Roadmap" },
  { icon: ListChecks, label: "Execution" },
  { icon: Wallet, label: "Cost / TCO" },
  { icon: BarChart3, label: "Metrics" },
];

const highlights = [
  { icon: Layers, value: "20+", label: "Integrated modules" },
  { icon: Target, value: "5", label: "Prioritization models" },
  { icon: Cloud, value: "AWS · Azure · GCP", label: "Cloud cost sync" },
  { icon: ShieldCheck, value: "AES-256", label: "Encrypted credentials" },
];

export default function LandingPage() {
  return (
    <div className="flex flex-col gap-20 py-8 md:py-12">
      {/* Hero */}
      <section className="flex flex-col items-center text-center gap-6">
        <Badge variant="secondary" className="gap-1.5 px-3 py-1">
          <Sparkles className="h-3.5 w-3.5" />
          Product lifecycle, cost, and AI in one platform
        </Badge>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight max-w-4xl leading-[1.1]">
          Build better products with{" "}
          <span className="text-primary">full-cost clarity</span>
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl">
          SmartProducts unifies strategy, discovery, execution, and Total Cost
          of Ownership tracking — with cloud cost sync and an AI assistant — so
          your team can plan, ship, and account for every product decision.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 mt-2">
          <SignUpButton mode="modal">
            <Button size="lg" className="gap-2">
              Get started
              <ArrowRight className="h-4 w-4" />
            </Button>
          </SignUpButton>
          <SignInButton mode="modal">
            <Button size="lg" variant="outline">
              Sign in
            </Button>
          </SignInButton>
        </div>

        {/* Lifecycle strip */}
        <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3 mt-8">
          {lifecycle.map((step, i) => (
            <div key={step.label} className="flex items-center gap-2 md:gap-3">
              <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-medium">
                <step.icon className="h-4 w-4 text-primary" />
                {step.label}
              </div>
              {i < lifecycle.length - 1 && (
                <ArrowRight className="h-4 w-4 text-muted-foreground hidden sm:block" />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Highlights */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {highlights.map((h) => (
          <div
            key={h.label}
            className="flex flex-col items-center text-center gap-2 rounded-lg border border-border bg-card p-6"
          >
            <h.icon className="h-6 w-6 text-primary" />
            <div className="text-xl md:text-2xl font-bold">{h.value}</div>
            <div className="text-sm text-muted-foreground">{h.label}</div>
          </div>
        ))}
      </section>

      {/* Features */}
      <section className="flex flex-col gap-8">
        <div className="flex flex-col items-center text-center gap-3">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            Everything for the product lifecycle
          </h2>
          <p className="text-muted-foreground max-w-2xl">
            From the first insight to the final invoice, SmartProducts brings
            your entire practice into a single, integrated workspace.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group flex flex-col gap-3 rounded-lg border border-border bg-card p-6 transition-base hover:shadow-md hover:border-primary/40"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <feature.icon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-semibold">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Callout: cost + resources */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-gradient-to-br from-primary/5 to-transparent p-8">
          <Wallet className="h-7 w-7 text-primary" />
          <h3 className="text-2xl font-semibold">Know the true cost</h3>
          <p className="text-muted-foreground">
            Model labor, infrastructure, licenses, and vendors across build,
            run, maintain, scale, and overhead. Compare scenarios, split Run
            (KTLO) from Change (Growth), and see automatic TCO roll-ups per
            product and module.
          </p>
        </div>
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-gradient-to-br from-primary/5 to-transparent p-8">
          <Users className="h-7 w-7 text-primary" />
          <h3 className="text-2xl font-semibold">Plan with your team</h3>
          <p className="text-muted-foreground">
            Manage resources, skills, and cost rates, align stakeholders with
            communication preferences, and keep multiple organizations organized
            with built-in authentication and access control.
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="flex flex-col items-center text-center gap-5 rounded-2xl border border-border bg-card p-10 md:p-14">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight max-w-2xl">
          Ready to bring clarity to your products?
        </h2>
        <p className="text-muted-foreground max-w-xl">
          Sign in to access your workspace, or create an account to start
          planning, tracking, and costing your products today.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <SignUpButton mode="modal">
            <Button size="lg" className="gap-2">
              Get started free
              <ArrowRight className="h-4 w-4" />
            </Button>
          </SignUpButton>
          <SignInButton mode="modal">
            <Button size="lg" variant="outline">
              Sign in
            </Button>
          </SignInButton>
        </div>
      </section>
    </div>
  );
}
