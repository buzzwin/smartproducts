import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Task, Product, Feature, Workstream, Phase, Resource, Module } from '@/types';

interface TaskExportData {
  task: Task;
  productName: string;
  featureName: string;
  workstreamName: string;
  phaseName: string;
  assigneeNames: string;
  dependencyTitles: string;
}

export function prepareTaskDataForExport(
  tasks: Task[],
  products: Product[],
  features: Feature[],
  workstreams: Workstream[],
  phases: Phase[],
  resources: Resource[]
): TaskExportData[] {
  return tasks.map((task) => {
    const product = products.find((p) => p.id === task.product_id);
    const feature = task.feature_id
      ? features.find((f) => f.id === task.feature_id)
      : null;
    const workstream = task.workstream_id
      ? workstreams.find((w) => w.id === task.workstream_id)
      : null;
    const phase = task.phase_id
      ? phases.find((p) => p.id === task.phase_id)
      : null;
    const assigneeNames = task.assignee_ids
      .map((id) => {
        const resource = resources.find((r) => r.id === id);
        return resource?.name || id;
      })
      .join(', ');
    const dependencyTitles = (task.dependencies || task.depends_on_task_ids || [])
      .map((depId) => {
        const depTask = tasks.find((t) => t.id === depId);
        return depTask?.title || depId;
      })
      .join(', ');

    return {
      task,
      productName: product?.name || task.product_id,
      featureName: feature?.name || '-',
      workstreamName: workstream?.name || '-',
      phaseName: phase?.name || '-',
      assigneeNames: assigneeNames || '-',
      dependencyTitles: dependencyTitles || '-',
    };
  });
}

export function exportTasksToExcel(
  exportData: TaskExportData[],
  filename: string = 'tasks-export.xlsx'
) {
  // Prepare data for Excel
  const excelData = exportData.map((data) => ({
    Title: data.task.title,
    Description: data.task.description || '',
    Product: data.productName,
    Feature: data.featureName,
    Workstream: data.workstreamName,
    Phase: data.phaseName,
    Status: data.task.status,
    Priority: data.task.priority,
    Assignees: data.assigneeNames,
    'Depends On': data.dependencyTitles,
    'Due Date': data.task.due_date
      ? new Date(data.task.due_date).toLocaleDateString()
      : '',
    'Estimated Hours': data.task.estimated_hours || '',
    'Actual Hours': data.task.actual_hours || '',
    'Cost Classification': data.task.cost_classification || '',
    'Estimated Cost': data.task.estimated_cost
      ? `$${data.task.estimated_cost.toFixed(2)}`
      : '',
    'Total Cost': data.task.total_cost
      ? `$${data.task.total_cost.toFixed(2)}`
      : '',
    Blockers: data.task.blockers?.join(', ') || '',
  }));

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(excelData);

  // Set column widths
  const colWidths = [
    { wch: 30 }, // Title
    { wch: 40 }, // Description
    { wch: 20 }, // Product
    { wch: 20 }, // Feature
    { wch: 20 }, // Workstream
    { wch: 20 }, // Phase
    { wch: 15 }, // Status
    { wch: 12 }, // Priority
    { wch: 25 }, // Assignees
    { wch: 30 }, // Depends On
    { wch: 12 }, // Due Date
    { wch: 15 }, // Estimated Hours
    { wch: 15 }, // Actual Hours
    { wch: 20 }, // Cost Classification
    { wch: 15 }, // Estimated Cost
    { wch: 15 }, // Total Cost
    { wch: 30 }, // Blockers
  ];
  ws['!cols'] = colWidths;

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Tasks');

  // Write file
  XLSX.writeFile(wb, filename);
}

export function exportTasksToPDF(
  exportData: TaskExportData[],
  filename: string = 'tasks-export.pdf'
) {
  const doc = new jsPDF('landscape', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;

  // Add title
  doc.setFontSize(16);
  doc.text('Tasks Export', margin, margin + 10);
  doc.setFontSize(10);
  doc.text(
    `Generated on: ${new Date().toLocaleString()}`,
    margin,
    margin + 17
  );
  doc.text(
    `Total Tasks: ${exportData.length}`,
    margin,
    margin + 22
  );

  // Prepare table data
  const tableData = exportData.map((data) => [
    data.task.title.substring(0, 30) + (data.task.title.length > 30 ? '...' : ''),
    data.productName.substring(0, 15) + (data.productName.length > 15 ? '...' : ''),
    data.featureName.substring(0, 15) + (data.featureName.length > 15 ? '...' : ''),
    data.workstreamName.substring(0, 15) + (data.workstreamName.length > 15 ? '...' : ''),
    data.phaseName.substring(0, 15) + (data.phaseName.length > 15 ? '...' : ''),
    data.task.status,
    data.task.priority,
    data.assigneeNames.substring(0, 20) + (data.assigneeNames.length > 20 ? '...' : ''),
    data.task.due_date
      ? new Date(data.task.due_date).toLocaleDateString()
      : '-',
    data.task.estimated_hours?.toString() || '-',
  ]);

  // Add table
  autoTable(doc, {
    head: [
      [
        'Title',
        'Product',
        'Feature',
        'Workstream',
        'Phase',
        'Status',
        'Priority',
        'Assignees',
        'Due Date',
        'Est. Hours',
      ],
    ],
    body: tableData,
    startY: margin + 28,
    styles: { fontSize: 7 },
    headStyles: { fillColor: [66, 139, 202], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    margin: { top: margin + 28 },
    tableWidth: 'wrap',
  });

  // Save PDF
  doc.save(filename);
}

// Feature Report Export Functions
export function exportFeatureReportToExcel(
  feature: Feature,
  product: Product | undefined,
  tasks: Task[],
  resources: Resource[],
  phases: Phase[],
  workstreams: Workstream[],
  modules: Module[]
) {
  const wb = XLSX.utils.book_new();

  // Feature Information Sheet
  const featureData = [
    ['Feature Report'],
    [''],
    ['Feature Information'],
    ['Feature Name', feature.name],
    ['Product', product?.name || feature.product_id || 'N/A'],
    ['Description', feature.description || ''],
    ['Status', feature.status || ''],
    [''],
    ['Summary'],
    ['Total Tasks', tasks.length],
    [
      'Tasks by Status',
      tasks.filter((t) => t.status === 'todo').length + ' To Do',
      tasks.filter((t) => t.status === 'in_progress').length + ' In Progress',
      tasks.filter((t) => t.status === 'blocked').length + ' Blocked',
      tasks.filter((t) => t.status === 'done').length + ' Done',
    ],
    [
      'Total Estimated Hours',
      tasks.reduce((sum, t) => sum + (t.estimated_hours || 0), 0),
    ],
    [
      'Total Actual Hours',
      tasks.reduce((sum, t) => sum + (t.actual_hours || 0), 0),
    ],
  ];

  const featureWs = XLSX.utils.aoa_to_sheet(featureData);
  featureWs['!cols'] = [{ wch: 25 }, { wch: 40 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, featureWs, 'Feature Info');

  // Tasks Sheet
  const tasksData = tasks.map((task) => {
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
      .join(', ');
    const dependencyTitles = (task.depends_on_task_ids || [])
      .map((depId) => {
        const depTask = tasks.find((t) => t.id === depId);
        return depTask?.title || depId;
      })
      .join(', ');

    return {
      Title: task.title,
      Description: task.description || '',
      Module: module?.name || '-',
      Workstream: workstream?.name || '-',
      Phase: phase?.name || '-',
      Status: task.status,
      Priority: task.priority,
      Assignees: assigneeNames || '-',
      'Depends On': dependencyTitles || '-',
      'Due Date': task.due_date
        ? new Date(task.due_date).toLocaleDateString()
        : '',
      'Estimated Hours': task.estimated_hours || '',
      'Actual Hours': task.actual_hours || '',
      'Cost Classification': task.cost_classification || '',
      'Estimated Cost': task.estimated_cost
        ? `$${task.estimated_cost.toFixed(2)}`
        : '',
      'Total Cost': task.total_cost
        ? `$${task.total_cost.toFixed(2)}`
        : '',
      Blockers: task.blockers?.join(', ') || '',
    };
  });

  const tasksWs = XLSX.utils.json_to_sheet(tasksData);
  tasksWs['!cols'] = [
    { wch: 30 }, // Title
    { wch: 40 }, // Description
    { wch: 20 }, // Module
    { wch: 20 }, // Workstream
    { wch: 20 }, // Phase
    { wch: 15 }, // Status
    { wch: 12 }, // Priority
    { wch: 25 }, // Assignees
    { wch: 30 }, // Depends On
    { wch: 12 }, // Due Date
    { wch: 15 }, // Estimated Hours
    { wch: 15 }, // Actual Hours
    { wch: 20 }, // Cost Classification
    { wch: 15 }, // Estimated Cost
    { wch: 15 }, // Total Cost
    { wch: 30 }, // Blockers
  ];
  XLSX.utils.book_append_sheet(wb, tasksWs, 'Tasks');

  // Generate filename
  const safeFeatureName = feature.name.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  const filename = `feature-report-${safeFeatureName}-${new Date().toISOString().split('T')[0]}.xlsx`;

  // Write file
  XLSX.writeFile(wb, filename);
}

export function exportFeatureReportToPDF(
  feature: Feature,
  product: Product | undefined,
  tasks: Task[],
  resources: Resource[],
  phases: Phase[],
  workstreams: Workstream[],
  modules: Module[]
) {
  const doc = new jsPDF('portrait', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let yPos = margin;

  // Title
  doc.setFontSize(18);
  doc.text('Feature Report', margin, yPos);
  yPos += 10;

  // Generation date
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(
    `Generated on: ${new Date().toLocaleString()}`,
    margin,
    yPos
  );
  yPos += 8;

  // Feature Information Section
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text('Feature Information', margin, yPos);
  yPos += 8;

  doc.setFontSize(10);
  const featureInfo = [
    ['Feature Name:', feature.name],
    ['Product:', product?.name || feature.product_id || 'N/A'],
    ['Description:', feature.description || 'N/A'],
    ['Status:', feature.status || 'N/A'],
  ];

  featureInfo.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, margin, yPos);
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(value || '', pageWidth - margin * 2 - 40);
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
  doc.setFont('helvetica', 'bold');
  doc.text('Summary', margin, yPos);
  yPos += 8;

  doc.setFontSize(10);
  const totalTasks = tasks.length;
  const tasksByStatus = {
    todo: tasks.filter((t) => t.status === 'todo').length,
    in_progress: tasks.filter((t) => t.status === 'in_progress').length,
    blocked: tasks.filter((t) => t.status === 'blocked').length,
    done: tasks.filter((t) => t.status === 'done').length,
  };
  const totalEstimatedHours = tasks.reduce(
    (sum, t) => sum + (t.estimated_hours || 0),
    0
  );
  const totalActualHours = tasks.reduce(
    (sum, t) => sum + (t.actual_hours || 0),
    0
  );

  doc.setFont('helvetica', 'normal');
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
    doc.setFont('helvetica', 'bold');
    doc.text('Associated Tasks', margin, yPos);
    yPos += 8;

    // Prepare table data
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
        .join(', ');

      return [
        task.title.substring(0, 40) + (task.title.length > 40 ? '...' : ''),
        module?.name?.substring(0, 15) || '-',
        phase?.name?.substring(0, 15) || '-',
        task.status,
        task.priority,
        assigneeNames.substring(0, 20) + (assigneeNames.length > 20 ? '...' : ''),
        task.due_date
          ? new Date(task.due_date).toLocaleDateString()
          : '-',
        task.estimated_hours?.toString() || '-',
      ];
    });

    autoTable(doc, {
      head: [
        [
          'Title',
          'Module',
          'Phase',
          'Status',
          'Priority',
          'Assignees',
          'Due Date',
          'Est. Hours',
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

  // Generate filename
  const safeFeatureName = feature.name.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  const filename = `feature-report-${safeFeatureName}-${new Date().toISOString().split('T')[0]}.pdf`;

  // Save PDF
  doc.save(filename);
}

