"use client";

import { useEffect, useState } from "react";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { productsAPI, costsAPI, scenariosAPI } from "@/lib/api";
import type { Product, CostItem, CostScenario } from "@/types";
import ProductList from "@/components/ProductList";
import ResourceList from "@/components/ResourceList";
import TaskList from "@/components/TaskList";
import FeatureList from "@/components/FeatureList";
import ProductWorkspace from "@/components/ProductWorkspace";
import ModuleList from "@/components/modules/ModuleList";
import StakeholderList from "@/components/stakeholders/StakeholderList";
import Modal from "@/components/Modal";
import { UserButton } from "@/components/UserButton";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ThemeToggle } from "@/components/ThemeToggle";
import Link from "next/link";
import { Settings } from "lucide-react";

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [scenarios, setScenarios] = useState<CostScenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"workspace" | "management">(
    "workspace"
  );
  const [managementSubTab, setManagementSubTab] = useState<
    "products" | "modules" | "features" | "resources" | "tasks" | "stakeholders"
  >("products");
  const [selectedProductForStakeholders, setSelectedProductForStakeholders] =
    useState<string | null>(null);
  const [costItems, setCostItems] = useState<CostItem[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  // Listen for navigation events from forms
  useEffect(() => {
    const handleNavigateToModules = (event: Event) => {
      const customEvent = event as CustomEvent<{ productId?: string }>;
      setActiveTab("management");
      setManagementSubTab("modules");
    };

    window.addEventListener("navigateToModules", handleNavigateToModules);
    return () => {
      window.removeEventListener("navigateToModules", handleNavigateToModules);
    };
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [productsData, scenariosData, costsData] = await Promise.all([
        productsAPI.getAll().catch((err) => {
          console.error("Failed to load products:", err);
          return [];
        }),
        scenariosAPI.getAll().catch((err) => {
          console.error("Failed to load scenarios:", err);
          return [];
        }),
        costsAPI.getAll().catch((err) => {
          console.error("Failed to load costs:", err);
          return [];
        }),
      ]);

      setProducts(productsData);
      setScenarios(scenariosData);
      setCostItems(costsData);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load data";
      setError(errorMessage);
      console.error("Error loading data:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div
          className="loading"
          style={{ textAlign: "center", padding: "40px" }}
        >
          <div>Loading...</div>
          <div style={{ marginTop: "20px", fontSize: "14px", color: "#666" }}>
            If this takes too long, check:
            <ul
              style={{
                marginTop: "10px",
                textAlign: "left",
                display: "inline-block",
              }}
            >
              <li>
                Backend server is running at{" "}
                {process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}
              </li>
              <li>MongoDB is running and accessible</li>
              <li>Check browser console (F12) for errors</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="error" style={{ marginBottom: "20px" }}>
          <strong>Error:</strong> {error}
        </div>
        <div className="bg-card border border-border rounded-lg p-5">
          <h3 style={{ marginBottom: "12px" }}>Troubleshooting:</h3>
          <ul style={{ marginLeft: "20px", lineHeight: "1.8" }}>
            <li>
              Make sure the backend server is running at{" "}
              {process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}
            </li>
            <li>Check the browser console (F12) for more details</li>
            <li>Verify CORS settings if you see network errors</li>
          </ul>
          <Button onClick={loadData} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="header flex justify-between items-center mb-5">
        <h1 className="text-foreground">SmartProducts Platform</h1>
        <div className="flex gap-3 items-center">
          <ThemeToggle />
          <SignedIn>
            <Link href="/organization">
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Organization
              </Button>
            </Link>
            <UserButton />
          </SignedIn>
          <SignedOut>
            <SignInButton mode="modal">
              <Button>Sign In</Button>
            </SignInButton>
          </SignedOut>
        </div>
      </div>

      <SignedOut>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <h2 className="text-2xl font-semibold">
            Welcome to SmartProducts Platform
          </h2>
          <p className="text-muted-foreground">
            Please sign in to access the platform
          </p>
          <SignInButton mode="modal">
            <Button size="lg">Sign In</Button>
          </SignInButton>
        </div>
      </SignedOut>

      <SignedIn>
        <>
          {/* Primary Navigation */}
          <div className="flex gap-2 mb-5 border-b-2 border-border">
            <Button
              type="button"
              onClick={() => setActiveTab("workspace")}
              variant={activeTab === "workspace" ? "default" : "ghost"}
              className={`rounded-b-none border-b-2 ${
                activeTab === "workspace"
                  ? "border-primary"
                  : "border-transparent"
              }`}
            >
              Workspace
            </Button>
            <div className="flex-1" />
            <Button
              type="button"
              onClick={() => setActiveTab("management")}
              variant={activeTab === "management" ? "secondary" : "ghost"}
              className={`rounded-b-none border-b-2 ${
                activeTab === "management"
                  ? "border-secondary"
                  : "border-transparent"
              }`}
            >
              Management
            </Button>
          </div>

          {/* Sub-navigation for Management */}
          {activeTab === "management" && (
            <div className="flex gap-2 mb-5 p-2.5 bg-muted rounded-lg flex-wrap">
              <Button
                type="button"
                onClick={() => setManagementSubTab("products")}
                variant={
                  managementSubTab === "products" ? "secondary" : "outline"
                }
                size="sm"
              >
                Products
              </Button>
              <Button
                type="button"
                onClick={() => setManagementSubTab("modules")}
                variant={
                  managementSubTab === "modules" ? "secondary" : "outline"
                }
                size="sm"
              >
                Modules
              </Button>
              <Button
                type="button"
                onClick={() => setManagementSubTab("features")}
                variant={
                  managementSubTab === "features" ? "secondary" : "outline"
                }
                size="sm"
              >
                Features
              </Button>
              <Button
                type="button"
                onClick={() => setManagementSubTab("resources")}
                variant={
                  managementSubTab === "resources" ? "secondary" : "outline"
                }
                size="sm"
              >
                Resources
              </Button>
              <Button
                type="button"
                onClick={() => setManagementSubTab("tasks")}
                variant={managementSubTab === "tasks" ? "secondary" : "outline"}
                size="sm"
              >
                Tasks
              </Button>
              <Button
                type="button"
                onClick={() => setManagementSubTab("stakeholders")}
                variant={
                  managementSubTab === "stakeholders" ? "secondary" : "outline"
                }
                size="sm"
              >
                Stakeholders
              </Button>
            </div>
          )}

          {/* Main Content */}
          {activeTab === "workspace" && (
            <ProductWorkspace onUpdate={loadData} />
          )}

          {activeTab === "management" && (
            <>
              {managementSubTab === "products" && (
                <ProductList products={products} onUpdate={loadData} />
              )}

              {managementSubTab === "modules" && (
                <ModuleList onUpdate={loadData} />
              )}

              {managementSubTab === "features" && (
                <FeatureList onUpdate={loadData} />
              )}

              {managementSubTab === "resources" && (
                <ResourceList onUpdate={loadData} />
              )}

              {managementSubTab === "tasks" && <TaskList onUpdate={loadData} />}

              {managementSubTab === "stakeholders" && (
                <div className="space-y-4">
                  {products.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No products available. Create a product first to manage
                      stakeholders.
                    </div>
                  ) : (
                    <>
                      <div className="mb-4">
                        <Label htmlFor="product-select" className="block mb-2">
                          Select Product
                        </Label>
                        <Select
                          value={selectedProductForStakeholders || ""}
                          onValueChange={(value) =>
                            setSelectedProductForStakeholders(value || null)
                          }
                        >
                          <SelectTrigger
                            id="product-select"
                            className="w-full max-w-md"
                          >
                            <SelectValue placeholder="Select a product to view stakeholders" />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((product) => (
                              <SelectItem key={product.id} value={product.id}>
                                {product.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {selectedProductForStakeholders && (
                        <StakeholderList
                          productId={selectedProductForStakeholders}
                          onUpdate={loadData}
                        />
                      )}
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </>
      </SignedIn>
    </div>
  );
}
