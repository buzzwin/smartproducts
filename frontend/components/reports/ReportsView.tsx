"use client";

import { useState, useEffect, useRef } from "react";
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
import { FileText, FileSpreadsheet, Download, Mail } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import {
  exportFeatureReportToPDF,
  exportFeatureReportToExcel,
} from "@/lib/exportUtils";
import AIAssistant from "../AIAssistant";
import DrawIOViewer from "../diagrams/DrawIOViewer";
import DrawIOEditor from "../diagrams/DrawIOEditor";
import {
  Eye,
  Edit,
  Save,
  History,
  Trash2,
  Image as ImageIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function ReportsView() {
  const [products, setProducts] = useState<Product[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [workstreams, setWorkstreams] = useState<Workstream[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [selectedModuleId, setSelectedModuleId] = useState<string>("");
  const [selectedFeatureId, setSelectedFeatureId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [generatedDiagramXml, setGeneratedDiagramXml] = useState<string>("");
  const [diagramPngData, setDiagramPngData] = useState<string | null>(null);
  const [includeDiagramInReport, setIncludeDiagramInReport] = useState(false);
  const [diagramViewMode, setDiagramViewMode] = useState<"preview" | "editor">(
    "preview"
  );
  const [exportingPng, setExportingPng] = useState(false);
  const [savedReports, setSavedReports] = useState<any[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [reportName, setReportName] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [loadingReports, setLoadingReports] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailRecipients, setEmailRecipients] = useState<string>("");
  const [emailSubject, setEmailSubject] = useState<string>("");
  const [emailMessage, setEmailMessage] = useState<string>("");
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedProductId) {
      loadModulesForProduct(selectedProductId);
      loadFeaturesForProduct(selectedProductId);
    } else {
      setModules([]);
      setFeatures([]);
      setSelectedModuleId("");
      setSelectedFeatureId("");
      setTasks([]);
    }
  }, [selectedProductId]);

  useEffect(() => {
    if (selectedModuleId) {
      // Optionally filter features by module if needed
      // For now, we'll just track the selection
    }
  }, [selectedModuleId]);

  useEffect(() => {
    if (selectedFeatureId) {
      loadTasksForFeature(selectedFeatureId);
      loadSavedReports();
    } else {
      setTasks([]);
      setSavedReports([]);
    }
  }, [selectedFeatureId, selectedModuleId]);

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

  const loadModulesForProduct = async (productId: string) => {
    try {
      const modulesData = await modulesAPI.getByProduct(productId);
      setModules(modulesData);
      // Reset module selection if current module is not in the new list
      if (
        selectedModuleId &&
        !modulesData.some((m) => m.id === selectedModuleId)
      ) {
        setSelectedModuleId("");
      }
    } catch (err) {
      console.error("Failed to load modules:", err);
      setModules([]);
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

      // Filter tasks by selected module if module is selected
      let filteredTasks = tasksData;
      if (selectedModuleId) {
        filteredTasks = tasksData.filter(
          (t) => t.module_id === selectedModuleId
        );
      }

      setTasks(filteredTasks);
    } catch (err) {
      console.error("Failed to load tasks:", err);
      setTasks([]);
    } finally {
      setLoadingTasks(false);
    }
  };

  const handleGenerateDiagram = (diagramXml: string) => {
    setGeneratedDiagramXml(diagramXml);
    setIncludeDiagramInReport(true); // Auto-enable inclusion
  };

  const loadSavedReports = async () => {
    if (!selectedFeatureId) return;

    try {
      setLoadingReports(true);
      const response = await fetch(
        `/api/feature-reports?feature_id=${selectedFeatureId}`
      );
      if (response.ok) {
        const reports = await response.json();
        setSavedReports(reports);
      }
    } catch (err) {
      console.error("Failed to load saved reports:", err);
    } finally {
      setLoadingReports(false);
    }
  };

  const handleSaveReport = async () => {
    if (!reportName.trim() || !selectedFeatureId) return;

    try {
      const response = await fetch("/api/feature-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: selectedProductId,
          feature_id: selectedFeatureId,
          name: reportName,
          description: reportDescription,
          diagram_xml: generatedDiagramXml,
          include_diagram: includeDiagramInReport,
        }),
      });

      if (response.ok) {
        await loadSavedReports();
        setShowSaveDialog(false);
        setReportName("");
        setReportDescription("");
      } else {
        const error = await response.json();
        console.error("Failed to save report:", error);
      }
    } catch (err) {
      console.error("Failed to save report:", err);
    }
  };

  const handleLoadReport = (report: any) => {
    setGeneratedDiagramXml(report.diagram_xml || "");
    setIncludeDiagramInReport(report.include_diagram || false);
    setShowHistoryDialog(false);
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!confirm("Are you sure you want to delete this report?")) return;

    try {
      const response = await fetch(`/api/feature-reports/${reportId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await loadSavedReports();
      }
    } catch (err) {
      console.error("Failed to delete report:", err);
    }
  };

  // Build comprehensive prompt from report preview data
  const buildDiagramPrompt = (): string => {
    const selectedFeature = features.find((f) => f.id === selectedFeatureId);
    const selectedProduct = products.find((p) => p.id === selectedProductId);
    const selectedModule = modules.find((m) => m.id === selectedModuleId);

    if (!selectedFeature || !selectedProduct) return "";

    let prompt = `Create a visual diagram for the following feature report:\n\n`;

    // Feature Information
    prompt += `FEATURE INFORMATION:\n`;
    prompt += `- Feature Name: ${selectedFeature.name}\n`;
    prompt += `- Product: ${selectedProduct.name}\n`;
    if (selectedModule) {
      prompt += `- Module: ${selectedModule.name}\n`;
    }
    if (selectedFeature.description) {
      prompt += `- Description: ${selectedFeature.description}\n`;
    }
    if (selectedFeature.status) {
      prompt += `- Status: ${selectedFeature.status}\n`;
    }
    prompt += `\n`;

    // Tasks Summary
    prompt += `TASKS SUMMARY:\n`;
    prompt += `- Total Tasks: ${tasks.length}\n`;
    const tasksByStatus = {
      todo: tasks.filter((t) => t.status === "todo").length,
      in_progress: tasks.filter((t) => t.status === "in_progress").length,
      blocked: tasks.filter((t) => t.status === "blocked").length,
      done: tasks.filter((t) => t.status === "done").length,
    };
    prompt += `- Tasks by Status: ${tasksByStatus.todo} To Do, ${tasksByStatus.in_progress} In Progress, ${tasksByStatus.blocked} Blocked, ${tasksByStatus.done} Done\n`;
    prompt += `\n`;

    // Detailed Tasks
    if (tasks.length > 0) {
      prompt += `DETAILED TASKS:\n`;
      tasks.forEach((task, index) => {
        const phase = task.phase_id
          ? phases.find((p) => p.id === task.phase_id)
          : null;
        const module = task.module_id
          ? modules.find((m) => m.id === task.module_id)
          : null;
        const workstream = task.workstream_id
          ? workstreams.find((w) => w.id === task.workstream_id)
          : null;
        const assigneeNames = task.assignee_ids
          .map((id) => {
            const resource = resources.find((r) => r.id === id);
            return resource?.name || id;
          })
          .join(", ");
        const dependencies = (task.depends_on_task_ids || [])
          .map((depId) => {
            const depTask = tasks.find((t) => t.id === depId);
            return depTask?.title || depId;
          })
          .join(", ");

        prompt += `\nTask ${index + 1}: ${task.title}\n`;
        if (task.description) {
          prompt += `  Description: ${task.description}\n`;
        }
        prompt += `  Status: ${task.status}\n`;
        prompt += `  Priority: ${task.priority}\n`;
        if (module) {
          prompt += `  Module: ${module.name}\n`;
        }
        if (phase) {
          prompt += `  Phase: ${phase.name}\n`;
        }
        if (workstream) {
          prompt += `  Workstream: ${workstream.name}\n`;
        }
        if (assigneeNames) {
          prompt += `  Assignees: ${assigneeNames}\n`;
        }
        if (task.due_date) {
          prompt += `  Due Date: ${new Date(
            task.due_date
          ).toLocaleDateString()}\n`;
        }
        if (task.estimated_hours) {
          prompt += `  Estimated Hours: ${task.estimated_hours}\n`;
        }
        if (dependencies) {
          prompt += `  Depends On: ${dependencies}\n`;
        }
        if (task.blockers && task.blockers.length > 0) {
          prompt += `  Blockers: ${task.blockers.join(", ")}\n`;
        }
      });
      prompt += `\n`;
    }

    // Phases Information
    if (phases.length > 0) {
      prompt += `PHASES:\n`;
      phases.forEach((phase) => {
        prompt += `- ${phase.name}`;
        if (phase.description) {
          prompt += `: ${phase.description}`;
        }
        prompt += `\n`;
      });
      prompt += `\n`;
    }

    // Modules Information
    if (modules.length > 0) {
      prompt += `MODULES:\n`;
      modules.forEach((module) => {
        prompt += `- ${module.name}`;
        if (module.description) {
          prompt += `: ${module.description}`;
        }
        prompt += `\n`;
      });
      prompt += `\n`;
    }

    // Workstreams Information
    if (workstreams.length > 0) {
      prompt += `WORKSTREAMS:\n`;
      workstreams.forEach((workstream) => {
        prompt += `- ${workstream.name}`;
        if (workstream.description) {
          prompt += `: ${workstream.description}`;
        }
        prompt += `\n`;
      });
      prompt += `\n`;
    }

    prompt += `\nPlease create a comprehensive Draw.io diagram that visualizes:\n`;
    prompt += `1. The feature as the central element\n`;
    prompt += `2. All tasks connected to the feature\n`;
    prompt += `3. Task dependencies and relationships\n`;
    prompt += `4. Task grouping by phase, module, or workstream where applicable\n`;
    prompt += `5. Status indicators (color-coded by task status)\n`;
    prompt += `6. Priority levels\n`;
    prompt += `7. Assignees if available\n`;

    return prompt;
  };

  const handleExportPDF = async () => {
    if (!selectedFeatureId) return;

    const selectedFeature = features.find((f) => f.id === selectedFeatureId);
    const selectedProduct = products.find((p) => p.id === selectedProductId);

    if (!selectedFeature) return;

    await exportFeatureReportToPDF(
      selectedFeature,
      selectedProduct,
      tasks,
      resources,
      phases,
      workstreams,
      modules,
      includeDiagramInReport ? generatedDiagramXml : undefined,
      includeDiagramInReport && diagramPngData ? diagramPngData : undefined
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
      modules,
      includeDiagramInReport ? generatedDiagramXml : undefined,
      includeDiagramInReport && diagramPngData ? diagramPngData : undefined
    );
  };

  const handleSendEmail = async () => {
    if (!selectedFeatureId || !emailRecipients.trim()) return;

    const selectedFeature = features.find((f) => f.id === selectedFeatureId);
    const selectedProduct = products.find((p) => p.id === selectedProductId);

    if (!selectedFeature) return;

    setSendingEmail(true);
    try {
      // Generate PDF as blob
      const pdfBlob = await generatePDFBlob(
        selectedFeature,
        selectedProduct,
        tasks,
        resources,
        phases,
        workstreams,
        modules,
        includeDiagramInReport ? generatedDiagramXml : undefined,
        includeDiagramInReport && diagramPngData ? diagramPngData : undefined
      );

      // Convert blob to base64
      const base64Pdf = await blobToBase64(pdfBlob);

      // Send email
      const response = await fetch("/api/reports/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipients: emailRecipients.split(",").map((e) => e.trim()),
          subject: emailSubject || `Feature Report: ${selectedFeature.name}`,
          message:
            emailMessage ||
            `Please find attached the feature report for ${selectedFeature.name}.`,
          pdfBase64: base64Pdf,
          pdfFilename: `feature-report-${selectedFeature.name
            .replace(/[^a-z0-9]/gi, "-")
            .toLowerCase()}-${new Date().toISOString().split("T")[0]}.pdf`,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to send email");
      }

      alert("Email sent successfully!");
      setShowEmailDialog(false);
      setEmailRecipients("");
      setEmailSubject("");
      setEmailMessage("");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to send email");
    } finally {
      setSendingEmail(false);
    }
  };

  // Helper function to generate PDF as blob
  const generatePDFBlob = async (
    feature: Feature,
    product: Product | undefined,
    tasks: Task[],
    resources: Resource[],
    phases: Phase[],
    workstreams: Workstream[],
    modules: Module[],
    diagramXml?: string,
    diagramPng?: string
  ): Promise<Blob> => {
    // Import jsPDF dynamically
    const { default: jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;

    const doc = new jsPDF("portrait", "mm", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let yPos = margin;

    // Title
    doc.setFontSize(18);
    doc.text("Feature Report", margin, yPos);
    yPos += 10;

    // Generation date
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, margin, yPos);
    yPos += 8;

    // Feature Information Section
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text("Feature Information", margin, yPos);
    yPos += 8;

    doc.setFontSize(10);
    const featureInfo = [
      ["Feature Name:", feature.name],
      ["Product:", product?.name || feature.product_id || "N/A"],
      ["Description:", feature.description || "N/A"],
      ["Status:", feature.status || "N/A"],
    ];

    featureInfo.forEach(([label, value]) => {
      doc.setFont("helvetica", "bold");
      doc.text(label, margin, yPos);
      doc.setFont("helvetica", "normal");
      const lines = doc.splitTextToSize(
        value || "",
        pageWidth - margin * 2 - 40
      );
      doc.text(lines, margin + 40, yPos);
      yPos += lines.length * 5 + 2;
      if (yPos > pageHeight - 40) {
        doc.addPage();
        yPos = margin;
      }
    });

    yPos += 5;

    // Summary Section
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Summary", margin, yPos);
    yPos += 8;

    doc.setFontSize(10);
    const totalTasks = tasks.length;
    const tasksByStatus = {
      todo: tasks.filter((t) => t.status === "todo").length,
      in_progress: tasks.filter((t) => t.status === "in_progress").length,
      blocked: tasks.filter((t) => t.status === "blocked").length,
      done: tasks.filter((t) => t.status === "done").length,
    };
    const totalEstimatedHours = tasks.reduce(
      (sum, t) => sum + (t.estimated_hours || 0),
      0
    );
    const totalActualHours = tasks.reduce(
      (sum, t) => sum + (t.actual_hours || 0),
      0
    );

    doc.setFont("helvetica", "normal");
    doc.text(`Total Tasks: ${totalTasks}`, margin, yPos);
    yPos += 6;
    doc.text(
      `Tasks by Status: ${tasksByStatus.todo} To Do, ${tasksByStatus.in_progress} In Progress, ${tasksByStatus.blocked} Blocked, ${tasksByStatus.done} Done`,
      margin,
      yPos
    );
    yPos += 6;
    doc.text(`Total Estimated Hours: ${totalEstimatedHours}`, margin, yPos);
    yPos += 6;
    doc.text(`Total Actual Hours: ${totalActualHours}`, margin, yPos);
    yPos += 10;

    // Tasks Table
    if (tasks.length > 0) {
      if (yPos > pageHeight - 60) {
        doc.addPage();
        yPos = margin;
      }

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Associated Tasks", margin, yPos);
      yPos += 8;

      const tableData = tasks.map((task) => {
        const phase = task.phase_id
          ? phases.find((p) => p.id === task.phase_id)
          : null;
        const workstream = task.workstream_id
          ? workstreams.find((w) => w.id === task.workstream_id)
          : null;
        const module = task.module_id
          ? modules.find((m) => m.id === task.module_id)
          : null;
        const assigneeNames = task.assignee_ids
          .map((id) => {
            const resource = resources.find((r) => r.id === id);
            return resource?.name || id;
          })
          .join(", ");

        return [
          task.title.substring(0, 40) + (task.title.length > 40 ? "..." : ""),
          module?.name?.substring(0, 15) || "-",
          phase?.name?.substring(0, 15) || "-",
          task.status,
          task.priority,
          assigneeNames.substring(0, 20) +
            (assigneeNames.length > 20 ? "..." : ""),
          task.due_date ? new Date(task.due_date).toLocaleDateString() : "-",
          task.estimated_hours?.toString() || "-",
        ];
      });

      autoTable(doc, {
        head: [
          [
            "Title",
            "Module",
            "Phase",
            "Status",
            "Priority",
            "Assignees",
            "Due Date",
            "Est. Hours",
          ],
        ],
        body: tableData,
        startY: yPos,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [66, 139, 202], textColor: 255 },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        margin: { left: margin, right: margin },
      });
    }

    // Add diagram section if provided
    if (diagramPng || diagramXml) {
      const finalY = (doc as any).lastAutoTable?.finalY || yPos;
      yPos = finalY + 10;

      if (yPos > pageHeight - 40) {
        doc.addPage();
        yPos = margin;
      }

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Feature Diagram", margin, yPos);
      yPos += 8;

      if (diagramPng) {
        try {
          doc.setFontSize(10);
          doc.setFont("helvetica", "normal");
          doc.text(
            "A visual diagram representing the feature structure and task relationships:",
            margin,
            yPos
          );
          yPos += 8;

          const imgData = diagramPng;
          const imgWidth = pageWidth - margin * 2;
          const maxImgHeight = pageHeight - yPos - margin - 20;

          const img = new Image();
          img.src = imgData;

          await new Promise<void>((resolve) => {
            if (img.complete) {
              const aspectRatio = img.width / img.height;
              let imgHeight = imgWidth / aspectRatio;

              if (imgHeight > maxImgHeight) {
                imgHeight = maxImgHeight;
                const scaledWidth = imgHeight * aspectRatio;
                doc.addImage(
                  imgData,
                  "PNG",
                  margin,
                  yPos,
                  scaledWidth,
                  imgHeight
                );
              } else {
                doc.addImage(imgData, "PNG", margin, yPos, imgWidth, imgHeight);
              }

              yPos += imgHeight + 10;
              resolve();
            } else {
              img.onload = () => {
                const aspectRatio = img.width / img.height;
                let imgHeight = imgWidth / aspectRatio;

                if (imgHeight > maxImgHeight) {
                  imgHeight = maxImgHeight;
                  const scaledWidth = imgHeight * aspectRatio;
                  doc.addImage(
                    imgData,
                    "PNG",
                    margin,
                    yPos,
                    scaledWidth,
                    imgHeight
                  );
                } else {
                  doc.addImage(
                    imgData,
                    "PNG",
                    margin,
                    yPos,
                    imgWidth,
                    imgHeight
                  );
                }

                yPos += imgHeight + 10;
                resolve();
              };
              img.onerror = () => {
                doc.setFontSize(10);
                doc.text(
                  "Note: Diagram image could not be loaded.",
                  margin,
                  yPos
                );
                yPos += 8;
                resolve();
              };
            }
          });
        } catch (err) {
          console.error("Error adding diagram image to PDF:", err);
          doc.setFontSize(10);
          doc.text("Note: Diagram image could not be added.", margin, yPos);
          yPos += 8;
        }
      }
    }

    // Generate blob from PDF
    return doc.output("blob");
  };

  // Helper function to convert blob to base64
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
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
                setSelectedModuleId("");
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
              <Label htmlFor="module-select">Module (Optional)</Label>
              <Select
                value={selectedModuleId}
                onValueChange={(value) => {
                  setSelectedModuleId(value === "none" ? "" : value);
                }}
                disabled={modules.length === 0}
              >
                <SelectTrigger id="module-select">
                  <SelectValue
                    placeholder={
                      modules.length === 0
                        ? "No modules available"
                        : "Select a module (optional)"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">All Modules</SelectItem>
                  {modules.map((module) => (
                    <SelectItem key={module.id} value={module.id}>
                      {module.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

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
            <>
              <div className="flex gap-2 items-center pt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowHistoryDialog(true)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <History style={{ width: "16px", height: "16px" }} />
                  History
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSaveDialog(true)}
                  disabled={!generatedDiagramXml}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <Save style={{ width: "16px", height: "16px" }} />
                  Save Report
                </Button>
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
                    <DropdownMenuItem
                      onClick={() => {
                        const selectedFeature = features.find(
                          (f) => f.id === selectedFeatureId
                        );
                        setEmailSubject(
                          selectedFeature
                            ? `Feature Report: ${selectedFeature.name}`
                            : ""
                        );
                        setShowEmailDialog(true);
                      }}
                    >
                      <Mail
                        style={{
                          width: "16px",
                          height: "16px",
                          marginRight: "8px",
                        }}
                      />
                      Send via Email
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold">
                      AI Diagram Generator
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Generate a visual diagram based on the feature and tasks
                      data
                    </p>
                  </div>
                  <AIAssistant
                    formType="diagram"
                    context={{
                      feature: features.find((f) => f.id === selectedFeatureId),
                      product: products.find((p) => p.id === selectedProductId),
                      module: modules.find((m) => m.id === selectedModuleId),
                      tasks: tasks,
                      phases: phases,
                      modules: modules,
                      workstreams: workstreams,
                    }}
                    initialPrompt={buildDiagramPrompt()}
                    onFillFields={(fields) => {
                      if (fields.diagram_xml || fields.xml) {
                        handleGenerateDiagram(fields.diagram_xml || fields.xml);
                      }
                    }}
                    className="flex items-center gap-2"
                  />
                </div>

                {generatedDiagramXml && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="include-diagram"
                          checked={includeDiagramInReport}
                          onChange={(e) =>
                            setIncludeDiagramInReport(e.target.checked)
                          }
                        />
                        <Label
                          htmlFor="include-diagram"
                          className="text-sm font-medium cursor-pointer"
                        >
                          Include diagram in report exports
                        </Label>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setDiagramViewMode("preview");
                            setDiagramPngData(null); // Clear PNG when switching to preview
                          }}
                          className={
                            diagramViewMode === "preview" ? "bg-gray-100" : ""
                          }
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Preview
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setDiagramViewMode("editor")}
                          className={
                            diagramViewMode === "editor" ? "bg-gray-100" : ""
                          }
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                        {diagramViewMode === "preview" &&
                          generatedDiagramXml && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                setExportingPng(true);
                                // Trigger PNG export via Draw.io viewer
                                const exportFn = (window as any)
                                  .__drawioViewerExportPng;
                                if (exportFn) {
                                  exportFn();
                                } else {
                                  // Fallback: use Draw.io export API directly
                                  try {
                                    const response = await fetch(
                                      `https://embed.diagrams.net/?export=png&format=png&xml=${encodeURIComponent(
                                        generatedDiagramXml
                                      )}`
                                    );
                                    if (response.ok) {
                                      const blob = await response.blob();
                                      const reader = new FileReader();
                                      reader.onloadend = () => {
                                        const dataUrl = reader.result as string;
                                        setDiagramPngData(dataUrl);
                                        setExportingPng(false);
                                      };
                                      reader.readAsDataURL(blob);
                                    } else {
                                      setExportingPng(false);
                                    }
                                  } catch (err) {
                                    console.error("Failed to export PNG:", err);
                                    setExportingPng(false);
                                  }
                                }
                              }}
                              disabled={exportingPng || !generatedDiagramXml}
                            >
                              <ImageIcon className="h-4 w-4 mr-2" />
                              {exportingPng ? "Exporting..." : "Export PNG"}
                            </Button>
                          )}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setGeneratedDiagramXml("");
                            setDiagramPngData(null);
                            setIncludeDiagramInReport(false);
                            setDiagramViewMode("preview");
                          }}
                        >
                          Clear
                        </Button>
                      </div>
                    </div>

                    <div className="border rounded-lg overflow-hidden">
                      {diagramViewMode === "preview" ? (
                        <div className="space-y-2">
                          <div className="px-4 py-2 bg-blue-50 border-b flex items-center gap-2">
                            <Eye className="h-4 w-4 text-blue-600" />
                            <span className="text-sm font-medium text-blue-900">
                              Preview Mode (Read-Only)
                            </span>
                            {diagramPngData && (
                              <span className="ml-auto text-xs text-green-600">
                                ✓ PNG exported
                              </span>
                            )}
                          </div>
                          <div
                            className="p-4 bg-gray-50"
                            style={{ minHeight: "600px" }}
                          >
                            <DrawIOViewer
                              xmlContent={generatedDiagramXml}
                              width={800}
                              height={600}
                              onExportPng={(pngDataUrl) => {
                                setDiagramPngData(pngDataUrl);
                                setExportingPng(false);
                              }}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="px-4 py-2 bg-orange-50 border-b flex items-center gap-2">
                            <Edit className="h-4 w-4 text-orange-600" />
                            <span className="text-sm font-medium text-orange-900">
                              Edit Mode
                            </span>
                          </div>
                          <div
                            className="bg-white"
                            style={{ minHeight: "600px" }}
                          >
                            <DrawIOEditor
                              xmlContent={generatedDiagramXml}
                              onXmlChange={(xml) => {
                                setGeneratedDiagramXml(xml);
                                setDiagramPngData(null); // Clear PNG when diagram changes
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
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
                                    {task.status
                                      .replace("_", " ")
                                      .toUpperCase()}
                                  </span>
                                </td>
                                <td className="p-2">{task.priority}</td>
                                <td className="p-2">{phase?.name || "-"}</td>
                                <td className="p-2">
                                  {task.due_date
                                    ? new Date(
                                        task.due_date
                                      ).toLocaleDateString()
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

      {/* Save Report Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Report</DialogTitle>
            <DialogDescription>
              Save this report configuration with the generated diagram for
              future use.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="report-name">Report Name *</Label>
              <Input
                id="report-name"
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
                placeholder="e.g., Q1 Feature Report"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="report-description">Description</Label>
              <Textarea
                id="report-description"
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                placeholder="Optional description..."
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowSaveDialog(false);
                  setReportName("");
                  setReportDescription("");
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSaveReport}
                disabled={!reportName.trim()}
              >
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Report History Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Report History</DialogTitle>
            <DialogDescription>
              Load a previously saved report configuration.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {loadingReports ? (
              <div className="py-8 text-center">Loading reports...</div>
            ) : savedReports.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                No saved reports found for this feature.
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {savedReports.map((report) => (
                  <div
                    key={report.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <h4 className="font-semibold">{report.name}</h4>
                      {report.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {report.description}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        Saved {new Date(report.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleLoadReport(report)}
                      >
                        Load
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteReport(report.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Email Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send Feature Report via Email</DialogTitle>
            <DialogDescription>
              Send the feature report as a PDF attachment via email.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email-recipients">Recipients *</Label>
              <Input
                id="email-recipients"
                type="text"
                placeholder="email1@example.com, email2@example.com"
                value={emailRecipients}
                onChange={(e) => setEmailRecipients(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Separate multiple emails with commas
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email-subject">Subject</Label>
              <Input
                id="email-subject"
                placeholder="Feature Report: [Feature Name]"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email-message">Message</Label>
              <Textarea
                id="email-message"
                placeholder="Please find attached the feature report..."
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowEmailDialog(false);
                  setEmailRecipients("");
                  setEmailSubject("");
                  setEmailMessage("");
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSendEmail}
                disabled={
                  sendingEmail || !emailRecipients.trim() || !selectedFeatureId
                }
              >
                {sendingEmail ? "Sending..." : "Send Email"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
