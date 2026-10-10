const fs = require('fs');
const path = require('path');

const imgPath = path.join(__dirname, '..', 'public', 'assets', 'pesantren-aerial-bg.jpg');
const b64 = fs.readFileSync(imgPath).toString('base64');
const tsContent = `export const PESANTREN_AERIAL_BG_DATA_URL = 'data:image/jpeg;base64,${b64}'\n`;

fs.writeFileSync(path.join(__dirname, '..', 'src', 'lib', 'pesantrenBgBase64.ts'), tsContent);

const xlsxPath = path.join(__dirname, '..', 'public', 'format-excel-keuangan.xlsx');
const xlsxB64 = fs.readFileSync(xlsxPath).toString('base64');
const xlsxTsContent = `export const FORMAT_EXCEL_KEUANGAN_BASE64 = '${xlsxB64}'\n`;

fs.writeFileSync(path.join(__dirname, '..', 'src', 'lib', 'excelTemplateBase64.ts'), xlsxTsContent);

console.log('Successfully embedded assets as base64 TypeScript modules');
