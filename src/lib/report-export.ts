/**
 * Advanced Reporting System for DASHMON
 * Features: PDF Export, Excel Export, Scheduled Reports, Custom Templates
 */

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

export interface ReportData {
  title: string;
  period: string;
  generatedAt: string;
  data: any[];
  summary?: any;
  charts?: any[];
}

export interface ExportOptions {
  format: 'pdf' | 'excel' | 'csv';
  includeCharts?: boolean;
  includeSummary?: boolean;
  customTemplate?: string;
  fileName?: string;
}

/**
 * PDF EXPORT FUNCTIONS
 */
export const exportToPDF = async (
  element: HTMLElement, 
  options: ExportOptions,
  reportData: ReportData
): Promise<void> => {
  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    const imgWidth = 210;
    const pageHeight = 295;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;

    let position = 0;

    // Add header
    pdf.setFontSize(16);
    pdf.text(reportData.title, 20, 20);
    pdf.setFontSize(12);
    pdf.text(`Periode: ${reportData.period}`, 20, 30);
    pdf.text(`Dibuat: ${reportData.generatedAt}`, 20, 40);

    // Add content
    pdf.addImage(imgData, 'PNG', 0, 50, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    const fileName = options.fileName || `report-${Date.now()}.pdf`;
    pdf.save(fileName);
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    throw error;
  }
};

/**
 * EXCEL EXPORT FUNCTIONS
 */
export const exportToExcel = (
  data: any[], 
  options: ExportOptions,
  reportData: ReportData
): void => {
  try {
    const workbook = XLSX.utils.book_new();
    
    // Main data sheet
    const worksheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');

    // Summary sheet if requested
    if (options.includeSummary && reportData.summary) {
      const summarySheet = XLSX.utils.json_to_sheet([reportData.summary]);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
    }

    // Metadata sheet
    const metadata = [
      { 'Field': 'Title', 'Value': reportData.title },
      { 'Field': 'Period', 'Value': reportData.period },
      { 'Field': 'Generated At', 'Value': reportData.generatedAt },
      { 'Field': 'Total Records', 'Value': data.length }
    ];
    const metadataSheet = XLSX.utils.json_to_sheet(metadata);
    XLSX.utils.book_append_sheet(workbook, metadataSheet, 'Metadata');

    const fileName = options.fileName || `report-${Date.now()}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    throw error;
  }
};

/**
 * CSV EXPORT FUNCTIONS
 */
export const exportToCSV = (
  data: any[], 
  options: ExportOptions,
  reportData: ReportData
): void => {
  try {
    if (data.length === 0) {
      throw new Error('No data to export');
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          return typeof value === 'string' && value.includes(',') 
            ? `"${value}"` 
            : value;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const fileName = options.fileName || `report-${Date.now()}.csv`;
    saveAs(blob, fileName);
  } catch (error) {
    console.error('Error exporting to CSV:', error);
    throw error;
  }
};

/**
 * UNIFIED EXPORT FUNCTION
 */
export const exportReport = async (
  data: any[],
  options: ExportOptions,
  reportData: ReportData,
  element?: HTMLElement
): Promise<void> => {
  switch (options.format) {
    case 'pdf':
      if (!element) {
        throw new Error('HTML element required for PDF export');
      }
      await exportToPDF(element, options, reportData);
      break;
    case 'excel':
      exportToExcel(data, options, reportData);
      break;
    case 'csv':
      exportToCSV(data, options, reportData);
      break;
    default:
      throw new Error(`Unsupported export format: ${options.format}`);
  }
};

/**
 * SCHEDULED REPORTS FUNCTIONS
 */
export interface ScheduledReport {
  id: string;
  name: string;
  description: string;
  schedule: 'daily' | 'weekly' | 'monthly';
  scheduleTime: string; // HH:mm format
  scheduleDay?: number; // Day of week (0-6) or month (1-31)
  recipients: string[];
  format: 'pdf' | 'excel' | 'csv';
  isActive: boolean;
  lastRun?: string;
  nextRun?: string;
  createdAt: string;
  updatedAt: string;
}

export const createScheduledReport = async (report: Omit<ScheduledReport, 'id' | 'createdAt' | 'updatedAt'>): Promise<ScheduledReport> => {
  // This would integrate with a backend service or database
  // For now, we'll store in localStorage as a placeholder
  const newReport: ScheduledReport = {
    ...report,
    id: `sr_${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const existing = JSON.parse(localStorage.getItem('scheduled_reports') || '[]');
  existing.push(newReport);
  localStorage.setItem('scheduled_reports', JSON.stringify(existing));

  return newReport;
};

export const getScheduledReports = (): ScheduledReport[] => {
  return JSON.parse(localStorage.getItem('scheduled_reports') || '[]');
};

export const updateScheduledReport = async (id: string, updates: Partial<ScheduledReport>): Promise<ScheduledReport> => {
  const reports = getScheduledReports();
  const index = reports.findIndex(r => r.id === id);
  
  if (index === -1) {
    throw new Error('Scheduled report not found');
  }

  reports[index] = {
    ...reports[index],
    ...updates,
    updatedAt: new Date().toISOString()
  };

  localStorage.setItem('scheduled_reports', JSON.stringify(reports));
  return reports[index];
};

export const deleteScheduledReport = async (id: string): Promise<void> => {
  const reports = getScheduledReports();
  const filtered = reports.filter(r => r.id !== id);
  localStorage.setItem('scheduled_reports', JSON.stringify(filtered));
};

/**
 * REPORT TEMPLATES
 */
export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: 'dashboard' | 'analytics' | 'kpi' | 'custom';
  layout: any;
  filters: any[];
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export const getReportTemplates = (): ReportTemplate[] => {
  return JSON.parse(localStorage.getItem('report_templates') || '[]');
};

export const createReportTemplate = async (template: Omit<ReportTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<ReportTemplate> => {
  const newTemplate: ReportTemplate = {
    ...template,
    id: `rt_${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const existing = getReportTemplates();
  existing.push(newTemplate);
  localStorage.setItem('report_templates', JSON.stringify(existing));

  return newTemplate;
};

/**
 * UTILITY FUNCTIONS
 */
export const generateReportFileName = (title: string, format: string): string => {
  const timestamp = new Date().toISOString().split('T')[0];
  const sanitizedTitle = title.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  return `${sanitizedTitle}_${timestamp}.${format}`;
};

export const formatReportData = (rawData: any[]): any[] => {
  return rawData.map(item => ({
    ...item,
    created_at: new Date(item.created_at).toLocaleDateString('id-ID'),
    updated_at: new Date(item.updated_at).toLocaleDateString('id-ID')
  }));
};