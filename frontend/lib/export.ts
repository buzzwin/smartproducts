/** Export functionality for reports and dashboards */

export interface ExportOptions {
  filename?: string;
  headers?: string[];
  dateFormat?: (date: Date | string) => string;
}

/**
 * Export data array to CSV format
 */
export function exportToCSV(data: any[], filename: string = 'export', options?: ExportOptions) {
  if (data.length === 0) {
    alert('No data to export');
    return;
  }

  const headers = options?.headers || Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        if (value === null || value === undefined) return '';
        if (value instanceof Date) {
          return `"${options?.dateFormat ? options.dateFormat(value) : value.toISOString()}"`;
        }
        if (typeof value === 'object') return JSON.stringify(value);
        return `"${String(value).replace(/"/g, '""')}"`;
      }).join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export HTML content to PDF using browser print functionality
 */
export function exportToPDF(title: string, content: string | HTMLElement) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to export PDF');
    return;
  }

  let htmlContent = '';
  if (typeof content === 'string') {
    htmlContent = content;
  } else {
    htmlContent = content.innerHTML;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>
        <meta charset="utf-8">
        <style>
          @media print {
            @page { margin: 1cm; }
            body { margin: 0; }
          }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
            padding: 20px; 
            color: #333;
            line-height: 1.6;
          }
          h1 { 
            color: #333; 
            border-bottom: 2px solid #007bff;
            padding-bottom: 10px;
            margin-bottom: 20px;
          }
          h2 { color: #555; margin-top: 24px; margin-bottom: 12px; }
          h3 { color: #666; margin-top: 20px; margin-bottom: 10px; }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-top: 20px; 
            margin-bottom: 20px;
          }
          th, td { 
            border: 1px solid #ddd; 
            padding: 12px; 
            text-align: left; 
          }
          th { 
            background-color: #f8f9fa; 
            font-weight: 600;
          }
          tr:nth-child(even) { background-color: #f8f9fa; }
          .card {
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 16px;
            background-color: #fff;
          }
          .metric {
            display: inline-block;
            margin: 8px;
            padding: 12px;
            background-color: #f0f0f0;
            border-radius: 6px;
          }
          .badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 500;
          }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <div style="color: #666; margin-bottom: 20px; font-size: 14px;">
          Generated on ${new Date().toLocaleString()}
        </div>
        ${htmlContent}
      </body>
    </html>
  `);
  printWindow.document.close();
  
  // Wait for content to load before printing
  setTimeout(() => {
    printWindow.print();
  }, 250);
}

/**
 * Export table data to CSV with custom formatting
 */
export function exportTableToCSV(tableElement: HTMLTableElement, filename: string = 'table-export') {
  const rows: string[] = [];
  const tableRows = tableElement.querySelectorAll('tr');
  
  tableRows.forEach((row) => {
    const cells: string[] = [];
    row.querySelectorAll('th, td').forEach((cell) => {
      cells.push(`"${cell.textContent?.trim().replace(/"/g, '""') || ''}"`);
    });
    if (cells.length > 0) {
      rows.push(cells.join(','));
    }
  });
  
  const csvContent = rows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Format data for dashboard export
 */
export function formatDashboardData(products: any[], tasks: any[], costs: any[]) {
  return products.map(product => {
    const productTasks = tasks.filter(t => t.product_id === product.id);
    const productCosts = costs.filter(c => c.product_id === product.id);
    const totalCost = productCosts.reduce((sum, c) => sum + (c.amount || 0), 0);
    
    return {
      'Product Name': product.name,
      'Product Description': product.description || '',
      'Total Tasks': productTasks.length,
      'Tasks To Do': productTasks.filter(t => t.status === 'todo').length,
      'Tasks In Progress': productTasks.filter(t => t.status === 'in_progress').length,
      'Tasks Completed': productTasks.filter(t => t.status === 'completed').length,
      'Total Cost': totalCost.toFixed(2),
      'Created': product.created_at ? new Date(product.created_at).toLocaleDateString() : '',
    };
  });
}

/**
 * Format roadmap data for export
 */
export function formatRoadmapData(products: any[], features: any[], tasks: any[]) {
  const roadmapData: any[] = [];
  
  products.forEach(product => {
    const productFeatures = features.filter(f => f.product_id === product.id);
    
    productFeatures.forEach(feature => {
      const featureTasks = tasks.filter(t => t.feature_id === feature.id);
      
      if (featureTasks.length === 0) {
        roadmapData.push({
          'Product': product.name,
          'Feature': feature.name,
          'Task': '',
          'Status': '',
          'Priority': '',
          'Due Date': '',
        });
      } else {
        featureTasks.forEach(task => {
          roadmapData.push({
            'Product': product.name,
            'Feature': feature.name,
            'Task': task.title,
            'Status': task.status,
            'Priority': task.priority,
            'Due Date': task.due_date ? new Date(task.due_date).toLocaleDateString() : '',
          });
        });
      }
    });
  });
  
  return roadmapData;
}

