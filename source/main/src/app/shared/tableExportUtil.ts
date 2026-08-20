import * as XLSX from 'xlsx';
import { TableElement } from './TableElement';

const getFileName = (name: string) => {
  const timeSpan = new Date().toISOString();
  const sheetName = name || 'ExportResult';
  const fileName = `${sheetName}-${timeSpan}`;
  return {
    sheetName,
    fileName,
  };
};
export class TableExportUtil {
  static exportToExcel(arr: Partial<TableElement>[], name: string) {
    const { sheetName, fileName } = getFileName(name);

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(arr);

    // Auto-width for columns
    const colWidths = Object.keys(arr[0] || {}).map((key) => ({
      wch: Math.max(
        key.length,
        ...arr.map((row) => (row[key] ? row[key]!.toString().length : 0))
      ) + 2, // padding
    }));
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `${fileName}.xlsx`);
  }



}
