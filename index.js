import React, { useState } from 'react';
import Papa from 'papaparse';

// Define the structure of Bitcoin Well CSV rows
interface BitcoinWellRow {
  "Transaction ID": string;
  "Order Type": string;
  "Network": string;
  "Order Status": string;
  "Order Date": string;
  "Fiat Amount": string;
  "Fiat Code": string;
  "Crypto Amount": string;
  "Crypto Code": string;
  "Miner Fee": string;
  "Rate": string;
  "Receiving Address": string;
  "Transaction Hash": string;
}

// Define the structure of Koinly-compatible CSV rows
interface KoinlyRow {
  Date: string;
  Type: string;
  "Buy Amount": string;
  "Buy Currency": string;
  "Sell Amount": string;
  "Sell Currency": string;
  Fee: string;
  "Fee Currency": string;
  Exchange: string;
  Group: string;
  Comment: string;
}

const App: React.FC = () => {
  const [koinlyCsv, setKoinlyCsv] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Handles CSV file upload and parsing
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    const file = e.target.files?.[0];
    if (!file) {
      setError('No file selected');
      return;
    }

    Papa.parse<BitcoinWellRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          setError('Error parsing CSV file');
          console.error(results.errors);
          return;
        }
        const data = results.data;
        const convertedRows = data.map(convertRow);
        const csv = generateKoinlyCsv(convertedRows);
        setKoinlyCsv(csv);
      },
    });
  };

  // Converts Bitcoin Well row format to Koinly row format
  const convertRow = (row: BitcoinWellRow): KoinlyRow => {
    const date = row["Order Date"];
    const orderType = row["Order Type"].toLowerCase();

    let koinlyRow: KoinlyRow = {
      Date: date,
      Type: '',
      "Buy Amount": '',
      "Buy Currency": '',
      "Sell Amount": '',
      "Sell Currency": '',
      Fee: row["Miner Fee"] || '',
      "Fee Currency": row["Crypto Code"] || '',
      Exchange: 'Bitcoin Well',
      Group: '',
      Comment: row["Transaction Hash"] || '',
    };

    // Determine transaction type based on order type
    if (orderType.includes('buy')) {
      koinlyRow.Type = 'Deposit';
      koinlyRow["Buy Amount"] = row["Crypto Amount"];
      koinlyRow["Buy Currency"] = row["Crypto Code"];
    } else if (orderType.includes('sell')) {
      koinlyRow.Type = 'Withdrawal';
      koinlyRow["Sell Amount"] = row["Crypto Amount"];
      koinlyRow["Sell Currency"] = row["Crypto Code"];
    } else if (orderType.includes('swap')) {
      koinlyRow.Type = 'Trade';
      koinlyRow["Buy Amount"] = row["Crypto Amount"];
      koinlyRow["Buy Currency"] = row["Crypto Code"];
    }

    return koinlyRow;
  };

  // Generates a CSV string from Koinly rows
  const generateKoinlyCsv = (rows: KoinlyRow[]): string => {
    const headers = [
      'Date', 'Type', 'Buy Amount', 'Buy Currency', 'Sell Amount', 'Sell Currency', 'Fee', 'Fee Currency', 'Exchange', 'Group', 'Comment'
    ];
    const csvRows = [headers.join(',')];

    rows.forEach((row) => {
      const rowValues = headers.map((header) => {
        const value = (row as any)[header] ?? '';
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      csvRows.push(rowValues.join(','));
    });

    return csvRows.join('\n');
  };

  // Triggers a download of the generated Koinly CSV file
  const downloadCsv = () => {
    const blob = new Blob([koinlyCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'koinly_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ maxWidth: '600px', margin: 'auto', padding: '1rem', fontFamily: 'Arial, sans-serif' }}>
      <h1>Koinly CSV Converter</h1>
      <p>Upload your Bitcoin Well CSV file and convert it to a Koinly‑compatible export.</p>
      <input type="file" accept=".csv" onChange={handleFileUpload} />
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {koinlyCsv && (
        <div style={{ marginTop: '1rem' }}>
          <button onClick={downloadCsv}>Download Koinly CSV</button>
          <h2>Preview:</h2>
          <textarea value={koinlyCsv} readOnly rows={10} style={{ width: '100%' }} />
        </div>
      )}
    </div>
  );
};

export default App;

// Ensure Cloudflare Pages compatibility with a static site generator
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const root = document.getElementById('root');
    if (root) {
      ReactDOM.createRoot(root).render(<App />);
    }
  });
}
