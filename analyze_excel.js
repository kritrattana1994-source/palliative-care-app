const xlsx = require('xlsx');

const filePath = './โค้ด ยืมคืน เครื่องมือแพทย์เก่า/ฐานข้อมูล ยืมคืน เครื่องมือ HHC ระบบ GAS.xlsx';

try {
  const workbook = xlsx.readFile(filePath);
  
  const result = {};
  
  workbook.SheetNames.forEach(sheetName => {
    const worksheet = workbook.Sheets[sheetName];
    // Convert to JSON, get only the first 5 rows for sample
    const json = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
    if (json.length > 0) {
      result[sheetName] = {
        headers: json[0],
        sampleData: json.slice(1, 4),
        totalRows: json.length
      };
    } else {
      result[sheetName] = { empty: true };
    }
  });

  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error("Error reading excel file:", error.message);
}
