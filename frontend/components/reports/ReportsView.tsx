"use client";

import { useState, useEffect } from "react";
import {
  productsAPI,
  featuresAPI,
  tasksAPI,
  resourcesAPI,
  phasesAPI,
  workstreamsAPI,
  modulesAPI,
} from "@/lib/api";
import type {
  Product,
  Feature,
  Task,
  Resource,
  Phase,
  Workstream,
  Module,
} from "@/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, FileSpreadsheet, Download } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  exportFeatureReportToPDF,
  exportFeatureReportToExcel,
} from "@/lib/exportUtils";

export default function ReportsView() {
  const [products, setProducts] = useState<Product[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [workstreams, setWorkstreams] = useState<Workstream[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [selectedFeatureId, setSelectedFeatureId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedProductId) {
      loadFeaturesForProduct(selectedProductId);
    } else {
      setFeatures([]);
      setSelectedFeatureId("");
      setTasks([]);
    }
  }, [selectedProductId]);

  useEffect(() => {
    if (selectedFeatureId) {
      loadTasksForFeature(selectedFeatureId);
    } else {
      setTasks([]);
    }
  }, [selectedFeatureId]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [productsData, resourcesData, phasesData, workstreamsData] =
        await Promise.all([
          productsAPI.getAll(),
          resourcesAPI.getAll(),
          phasesAPI.getAll(),
          workstreamsAPI.getAll(),
        ]);
      setProducts(productsData);
      setResources(resourcesData);
      setPhases(phasesData);
      setWorkstreams(workstreamsData);
    } catch (err) {
      console.error("Failed to load initial data:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadFeaturesForProduct = async (productId: string) => {
    try {
      const featuresData = await featuresAPI.getAll({ product_id: productId });
      setFeatures(featuresData);
      // Reset feature selection if current feature is not in the new list
      if (
        selectedFeatureId &&
        !featuresData.some((f) => f.id === selectedFeatureId)
      ) {
        setSelectedFeatureId("");
      }
    } catch (err) {
      console.error("Failed to load features:", err);
      setFeatures([]);
    }
  };

  const loadTasksForFeature = async (featureId: string) => {
    try {
      setLoadingTasks(true);
      const tasksData = await tasksAPI.getAll({ feature_id: featureId });
      setTasks(tasksData);

      // Load modules for tasks
      const moduleIds = new Set(
        tasksData
          .map((t) => t.module_id)
          .filter((id): id is string => !!id)
      );
      if (moduleIds.size > 0) {
        const modulesData = await Promise.all(
          Array.from(moduleIds).map((id) => modulesAPI.getById(id))
        );
        setModules(modulesData.filter((m): m is Module => !!m));
      } else {
        setModules([]);
      }
    } catch (err) {
      console.error("Failed to load tasks:", err);
      setTasks([]);
    } finally {
      setLoadingTasks(false);
    }
  };

  const handleExportPDF = () => {
    if (!selectedFeatureId) return;

    const selectedFeature = features.find((f) => f.id === selectedFeatureId);
    const selectedProduct = products.find((p) => p.id === selectedProductId);

    if (!selectedFeature) return;

    exportFeatureReportToPDF(
      selectedFeature,
      selectedProduct,
      tasks,
      resources,
      phases,
      workstreams,
      modules
    );
  };

  const handleExportExcel = () => {
    if (!selectedFeatureId) return;

    const selectedFeature = features.find((f) => f.id === selectedFeatureId);
    const selectedProduct = products.find((p) => p.id === selectedProductId);

    if (!selectedFeature) return;

    exportFeatureReportToExcel(
      selectedFeature,
      selectedProduct,
      tasks,
      resources,
      phases,
      workstreams,
      modules
    );
  };

  const selectedFeature = features.find((f) => f.id === selectedFeatureId);
  const selectedProduct = products.find((p) => p.id === selectedProductId);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Reports</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Feature Report Generator</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="product-select">Product</Label>
            <Select
              value={selectedProductId}
              onValueChange={(value) => {
                setSelectedProductId(value);
                setSelectedFeatureId("");
              }}
            >
              <SelectTrigger id="product-select">
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

          {selectedProductId && (
            <div className="space-y-2">
              <Label htmlFor="feature-select">Feature</Label>
              <Select
                value={selectedFeatureId}
                onValueChange={setSelectedFeatureId}
                disabled={features.length === 0}
              >
                <SelectTrigger id="feature-select">
                  <SelectValue
                    placeholder={
                      features.length === 0
                        ? "No features available"
                        : "Select a feature"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {features.map((feature) => (
                    <SelectItem key={feature.id} value={feature.id}>
                      {feature.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {selectedFeatureId && (
            <div className="flex gap-2 items-center pt-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <Download style={{ width: "16px", height: "16px" }} />
                    Export Report
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleExportExcel}>
                    <FileSpreadsheet
                      style={{
                        width: "16px",
                        height: "16px",
                        marginRight: "8px",
                      }}
                    />
                    Export to Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportPDF}>
                    <FileText
                      style={{
                        width: "16px",
                        height: "16px",
                        marginRight: "8px",
                      }}
                    />
                    Export to PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedFeatureId && (
        <Card>
          <CardHeader>
            <CardTitle>Report Preview</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingTasks ? (
              <div className="py-8 text-center">Loading tasks...</div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h3 className="mb-2 text-lg font-semibold">
                    Feature Information
                  </h3>
                  <div className="space-y-1 text-sm">
                    <p>
                      <strong>Feature:</strong> {selectedFeature?.name}
                    </p>
                    <p>
                      <strong>Product:</strong> {selectedProduct?.name}
                    </p>
                    {selectedFeature?.description && (
                      <p>
                        <strong>Description:</strong>{" "}
                        {selectedFeature.description}
                      </p>
                    )}
                    {selectedFeature?.status && (
                      <p>
                        <strong>Status:</strong> {selectedFeature.status}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="mb-2 text-lg font-semibold">
                    Associated Tasks ({tasks.length})
                  </h3>
                  {tasks.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No tasks associated with this feature.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr className="border-b">
                            <th className="p-2 text-left">Title</th>
                            <th className="p-2 text-left">Status</th>
                            <th className="p-2 text-left">Priority</th>
                            <th className="p-2 text-left">Phase</th>
                            <th className="p-2 text-left">Due Date</th>
                            <th className="p-2 text-left">Est. Hours</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tasks.map((task) => {
                            const phase = task.phase_id
                              ? phases.find((p) => p.id === task.phase_id)
                              : null;
                            return (
                              <tr key={task.id} className="border-b">
                                <td className="p-2">{task.title}</td>
                                <td className="p-2">
                                  <span
                                    className="px-2 py-1 text-xs rounded"
                                    style={{
                                      backgroundColor:
                                        task.status === "done"
                                          ? "#28a74520"
                                          : task.status === "in_progress"
                                          ? "#007bff20"
                                          : task.status === "blocked"
                                          ? "#dc354520"
                                          : "#6c757d20",
                                      color:
                                        task.status === "done"
                                          ? "#28a745"
                                          : task.status === "in_progress"
                                          ? "#007bff"
                                          : task.status === "blocked"
                                          ? "#dc3545"
                                          : "#6c757d",
                                    }}
                                  >
                                    {task.status.replace("_", " ").toUpperCase()}
                                  </span>
                                </td>
                                <td className="p-2">{task.priority}</td>
                                <td className="p-2">{phase?.name || "-"}</td>
                                <td className="p-2">
                                  {task.due_date
                                    ? new Date(task.due_date).toLocaleDateString()
                                    : "-"}
                                </td>
                                <td className="p-2">
                                  {task.estimated_hours || "-"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

