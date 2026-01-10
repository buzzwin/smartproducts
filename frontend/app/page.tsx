"use client";

import { useEffect, useState } from "react";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import {
  productsAPI,
  costsAPI,
  scenariosAPI,
  modulesAPI,
  phasesAPI,
  featuresAPI,
} from "@/lib/api";
import type { Product, CostItem, CostScenario, Module, Phase } from "@/types";
import ProductList from "@/components/ProductList";
import ResourceList from "@/components/ResourceList";
import TaskList from "@/components/TaskList";
import FeatureList from "@/components/FeatureList";
import ProductWorkspace from "@/components/ProductWorkspace";
import ModuleList from "@/components/modules/ModuleList";
import StakeholderList from "@/components/stakeholders/StakeholderList";
import PhaseList from "@/components/PhaseList";
import StrategyList from "@/components/strategy/StrategyList";
import CostList from "@/components/economics/CostList";
import ProblemListManagement from "@/components/discovery/ProblemListManagement";
import ReportsView from "@/components/reports/ReportsView";
import Modal from "@/components/Modal";
import VendorList from "@/components/VendorList";
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
import Chatbot from "@/components/Chatbot";
import EmailControlStation from "@/components/email-agent/EmailControlStation";
import CostTotalsSummary from "@/components/CostTotalsSummary";

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [scenarios, setScenarios] = useState<CostScenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "workspace" | "management" | "reports"
  >("workspace");
  const [managementSubTab, setManagementSubTab] = useState<
    | "products"
    | "modules"
    | "features"
    | "resources"
    | "vendors"
    | "tasks"
    | "stakeholders"
    | "phases"
    | "strategies"
    | "costs"
    | "problems"
    | "email-control"
  >("products");
  const [selectedProductForStakeholders, setSelectedProductForStakeholders] =
    useState<string | null>(null);
  const [selectedModuleForStakeholders, setSelectedModuleForStakeholders] =
    useState<string | null>(null);
  const [selectedProductForFeatures, setSelectedProductForFeatures] = useState<
    string | null
  >(null);
  const [selectedModuleForFeatures, setSelectedModuleForFeatures] = useState<
    string | null
  >(null);
  const [selectedProductForTasks, setSelectedProductForTasks] = useState<
    string | null
  >(null);
  const [selectedModuleForTasks, setSelectedModuleForTasks] = useState<
    string | null
  >(null);
  const [selectedPhaseForTasks, setSelectedPhaseForTasks] = useState<
    string | null
  >(null);
  const [selectedFeatureForTasks, setSelectedFeatureForTasks] = useState<
    string | null
  >(null);
  const [modulesForFeatures, setModulesForFeatures] = useState<Module[]>([]);
  const [modulesForStakeholders, setModulesForStakeholders] = useState<
    Module[]
  >([]);
  const [modulesForTasks, setModulesForTasks] = useState<Module[]>([]);
  const [phasesForTasks, setPhasesForTasks] = useState<any[]>([]);
  const [featuresForTasks, setFeaturesForTasks] = useState<any[]>([]);
  const [costItems, setCostItems] = useState<CostItem[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  // Load modules for features when product is selected
  useEffect(() => {
    const loadModulesForFeatures = async () => {
      if (selectedProductForFeatures) {
        try {
          const data = await modulesAPI.getByProduct(
            selectedProductForFeatures
          );
          setModulesForFeatures(data);
        } catch (err) {
          console.error("Failed to load modules for features:", err);
          setModulesForFeatures([]);
        }
      } else {
        setModulesForFeatures([]);
      }
    };
    loadModulesForFeatures();
  }, [selectedProductForFeatures]);

  // Load modules for stakeholders when product is selected
  useEffect(() => {
    const loadModulesForStakeholders = async () => {
      if (selectedProductForStakeholders) {
        try {
          const data = await modulesAPI.getByProduct(
            selectedProductForStakeholders
          );
          setModulesForStakeholders(data);
        } catch (err) {
          console.error("Failed to load modules for stakeholders:", err);
          setModulesForStakeholders([]);
        }
      } else {
        setModulesForStakeholders([]);
      }
    };
    loadModulesForStakeholders();
  }, [selectedProductForStakeholders]);

  // Load modules for tasks when product is selected
  useEffect(() => {
    const loadModulesForTasks = async () => {
      if (selectedProductForTasks) {
        try {
          const data = await modulesAPI.getByProduct(selectedProductForTasks);
          setModulesForTasks(data);
        } catch (err) {
          console.error("Failed to load modules for tasks:", err);
          setModulesForTasks([]);
        }
      } else {
        setModulesForTasks([]);
      }
    };
    loadModulesForTasks();
  }, [selectedProductForTasks]);

  // Load features for tasks when product is selected
  useEffect(() => {
    const loadFeaturesForTasks = async () => {
      if (selectedProductForTasks) {
        try {
          const data = await featuresAPI.getAll({
            product_id: selectedProductForTasks,
            module_id: selectedModuleForTasks || undefined,
          });
          setFeaturesForTasks(data);
        } catch (err) {
          console.error("Failed to load features for tasks:", err);
          setFeaturesForTasks([]);
        }
      } else {
        setFeaturesForTasks([]);
      }
    };
    loadFeaturesForTasks();
  }, [selectedProductForTasks, selectedModuleForTasks]);

  // Load phases for tasks
  useEffect(() => {
    const loadPhases = async () => {
      try {
        const phasesData = await phasesAPI.getAll();
        setPhasesForTasks(phasesData);
      } catch (err) {
        console.error("Failed to load phases for tasks:", err);
        setPhasesForTasks([]);
      }
    };
    loadPhases();
  }, []);

  // Listen for navigation events from forms
  useEffect(() => {
    const handleNavigateToModules = (event: Event) => {
      const customEvent = event as CustomEvent<{ productId?: string }>;
      setActiveTab("management");
      setManagementSubTab("modules");
    };

    const handleNavigateToPhases = (event: Event) => {
      setActiveTab("management");
      setManagementSubTab("phases");
    };

    window.addEventListener("navigateToModules", handleNavigateToModules);
    window.addEventListener("navigateToPhases", handleNavigateToPhases);
    return () => {
      window.removeEventListener("navigateToModules", handleNavigateToModules);
      window.removeEventListener("navigateToPhases", handleNavigateToPhases);
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
                Backend server should be accessible via API proxy
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
              Make sure the backend server is running and accessible via the API proxy
            </li>
            <li>Check the browser console (F12) for more details</li>
            <li>Verify API proxy routes are working if you see network errors</li>
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
            <Button
              type="button"
              onClick={() => setActiveTab("reports")}
              variant={activeTab === "reports" ? "default" : "ghost"}
              className={`rounded-b-none border-b-2 ${
                activeTab === "reports"
                  ? "border-primary"
                  : "border-transparent"
              }`}
            >
              Reports
            </Button>
            <div className="flex-1" />
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
                onClick={() => setManagementSubTab("vendors")}
                variant={
                  managementSubTab === "vendors" ? "secondary" : "outline"
                }
                size="sm"
              >
                Vendors
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
              <Button
                type="button"
                onClick={() => setManagementSubTab("phases")}
                variant={
                  managementSubTab === "phases" ? "secondary" : "outline"
                }
                size="sm"
              >
                Phases
              </Button>
              <Button
                type="button"
                onClick={() => setManagementSubTab("strategies")}
                variant={
                  managementSubTab === "strategies" ? "secondary" : "outline"
                }
                size="sm"
              >
                Strategies
              </Button>
              <Button
                type="button"
                onClick={() => setManagementSubTab("costs")}
                variant={managementSubTab === "costs" ? "secondary" : "outline"}
                size="sm"
              >
                Costs
              </Button>
              <Button
                type="button"
                onClick={() => setManagementSubTab("problems")}
                variant={
                  managementSubTab === "problems" ? "secondary" : "outline"
                }
                size="sm"
              >
                Problems
              </Button>
              <Button
                type="button"
                onClick={() => setManagementSubTab("email-control")}
                variant={
                  managementSubTab === "email-control" ? "secondary" : "outline"
                }
                size="sm"
              >
                Email Control
              </Button>
            </div>
          )}

          {/* Main Content */}
          {activeTab === "workspace" && (
            <div className="space-y-4">
              <CostTotalsSummary />
              <ProductWorkspace onUpdate={loadData} />
            </div>
          )}

          {activeTab === "reports" && <ReportsView />}

          {activeTab === "management" && (
            <>
              {managementSubTab === "products" && (
                <ProductList products={products} onUpdate={loadData} />
              )}

              {managementSubTab === "modules" && (
                <ModuleList onUpdate={loadData} />
              )}

              {managementSubTab === "features" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="feature-product-select">Product:</Label>
                      <Select
                        value={selectedProductForFeatures || ""}
                        onValueChange={(value) => {
                          setSelectedProductForFeatures(value || null);
                          setSelectedModuleForFeatures(null);
                        }}
                      >
                        <SelectTrigger
                          id="feature-product-select"
                          className="w-[200px]"
                        >
                          <SelectValue placeholder="Select a product" />
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
                    {selectedProductForFeatures && (
                      <div className="flex items-center gap-2">
                        <Label htmlFor="feature-module-select">Module:</Label>
                        <Select
                          value={selectedModuleForFeatures || "all"}
                          onValueChange={(value) =>
                            setSelectedModuleForFeatures(
                              value === "all" ? null : value
                            )
                          }
                        >
                          <SelectTrigger
                            id="feature-module-select"
                            className="w-[200px]"
                          >
                            <SelectValue placeholder="Select a module" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Modules</SelectItem>
                            {modulesForFeatures.map((module) => (
                              <SelectItem key={module.id} value={module.id}>
                                {module.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                  <FeatureList
                    productId={selectedProductForFeatures || undefined}
                    moduleId={selectedModuleForFeatures || undefined}
                    onUpdate={loadData}
                  />
                </div>
              )}

              {managementSubTab === "resources" && (
                <ResourceList onUpdate={loadData} />
              )}

              {managementSubTab === "vendors" && (
                <VendorList onUpdate={loadData} />
              )}

              {managementSubTab === "tasks" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="task-product-select">Product:</Label>
                      <Select
                        value={selectedProductForTasks || ""}
                        onValueChange={(value) => {
                          setSelectedProductForTasks(value || null);
                          setSelectedModuleForTasks(null);
                        }}
                      >
                        <SelectTrigger
                          id="task-product-select"
                          className="w-[200px]"
                        >
                          <SelectValue placeholder="Select a product" />
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
                    {selectedProductForTasks && (
                      <div className="flex items-center gap-2">
                        <Label htmlFor="task-module-select">Module:</Label>
                        <Select
                          value={selectedModuleForTasks || "all"}
                          onValueChange={(value) => {
                            setSelectedModuleForTasks(
                              value === "all" ? null : value
                            );
                            setSelectedFeatureForTasks(null); // Reset feature when module changes
                          }}
                        >
                          <SelectTrigger
                            id="task-module-select"
                            className="w-[200px]"
                          >
                            <SelectValue placeholder="Select a module" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Modules</SelectItem>
                            {modulesForTasks.map((module) => (
                              <SelectItem key={module.id} value={module.id}>
                                {module.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Label htmlFor="task-phase-select">Phase:</Label>
                      <Select
                        value={selectedPhaseForTasks || "all"}
                        onValueChange={(value) =>
                          setSelectedPhaseForTasks(
                            value === "all" ? null : value
                          )
                        }
                      >
                        <SelectTrigger
                          id="task-phase-select"
                          className="w-[200px]"
                        >
                          <SelectValue placeholder="Select a phase" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Phases</SelectItem>
                          {phasesForTasks.map((phase) => (
                            <SelectItem key={phase.id} value={phase.id}>
                              {phase.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {selectedProductForTasks && (
                      <div className="flex items-center gap-2">
                        <Label htmlFor="task-feature-select">Feature:</Label>
                        <Select
                          value={selectedFeatureForTasks || "all"}
                          onValueChange={(value) =>
                            setSelectedFeatureForTasks(
                              value === "all" ? null : value
                            )
                          }
                        >
                          <SelectTrigger
                            id="task-feature-select"
                            className="w-[200px]"
                          >
                            <SelectValue placeholder="Select a feature" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Features</SelectItem>
                            {featuresForTasks.map((feature) => (
                              <SelectItem key={feature.id} value={feature.id}>
                                {feature.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                  <TaskList
                    productId={selectedProductForTasks || undefined}
                    moduleId={selectedModuleForTasks || undefined}
                    initialFilterModuleId={selectedModuleForTasks || ""}
                    initialFilterPhaseId={selectedPhaseForTasks || ""}
                    initialFilterFeatureId={selectedFeatureForTasks || ""}
                    hideFilters={true}
                    onUpdate={loadData}
                  />
                </div>
              )}

              {managementSubTab === "phases" && (
                <PhaseList onUpdate={loadData} />
              )}

              {managementSubTab === "stakeholders" && (
                <div className="space-y-4">
                  {products.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No products available. Create a product first to manage
                      stakeholders.
                    </div>
                  ) : (
                    <>
                      <div className="mb-4 space-y-4">
                        <div>
                          <Label
                            htmlFor="product-select"
                            className="block mb-2"
                          >
                            Select Product
                          </Label>
                          <Select
                            value={selectedProductForStakeholders || ""}
                            onValueChange={(value) => {
                              setSelectedProductForStakeholders(value || null);
                              setSelectedModuleForStakeholders(null);
                            }}
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
                          <div>
                            <Label
                              htmlFor="stakeholder-module-select"
                              className="block mb-2"
                            >
                              Select Module (Optional)
                            </Label>
                            <Select
                              value={
                                selectedModuleForStakeholders || "product-level"
                              }
                              onValueChange={(value) =>
                                setSelectedModuleForStakeholders(
                                  value === "product-level" ? null : value
                                )
                              }
                            >
                              <SelectTrigger
                                id="stakeholder-module-select"
                                className="w-full max-w-md"
                              >
                                <SelectValue placeholder="Select a module" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="product-level">
                                  Product Level
                                </SelectItem>
                                {modulesForStakeholders.map((module) => (
                                  <SelectItem key={module.id} value={module.id}>
                                    {module.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                      {selectedProductForStakeholders && (
                        <StakeholderList
                          productId={selectedProductForStakeholders}
                          moduleId={selectedModuleForStakeholders || undefined}
                          onUpdate={loadData}
                        />
                      )}
                    </>
                  )}
                </div>
              )}

              {managementSubTab === "strategies" && (
                <StrategyList onUpdate={loadData} />
              )}

              {managementSubTab === "costs" && <CostList onUpdate={loadData} />}

              {managementSubTab === "problems" && (
                <ProblemListManagement onUpdate={loadData} />
              )}
              {managementSubTab === "email-control" && (
                <EmailControlStation />
              )}
            </>
          )}
        </>
      </SignedIn>

      {/* AI Chatbot - Available everywhere */}
      <SignedIn>
        <Chatbot />
      </SignedIn>
    </div>
  );
}
