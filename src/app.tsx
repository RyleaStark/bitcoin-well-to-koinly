import React, { useState } from 'react';
import Papa from 'papaparse';

// Define the structure for Bitcoin Well CSV rows
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
  "Fail reason"?: string;
}

// Define the structure for Koinly CSV rows (using the new template)
interface KoinlyRow {
  "Date": string;
  "Sent Amount": string;
  "Sent Currency": string;
  "Received Amount": string;
  "Received Currency": string;
  "Fee Amount": string;
  "Fee Currency": string;
  "Net Worth Amount": string;
  "Net Worth Currency": string;
  "Label": string;
  "Description": string;
  "TxHash": string;
}

const App: React.FC = () => {
  // State to hold the generated CSV and any errors encountered
  const [koinlyCsv, setKoinlyCsv] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Called when the user selects a CSV file for upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    const file = e.target.files?.[0];
    if (!file) {
      setError('No file selected');
      return;
    }

    // Use PapaParse to parse the uploaded CSV file
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
        // Filter out swap orders (ignore rows where Order Type includes "swap")
        const filteredData = data.filter(
          (row) => !row["Order Type"].toLowerCase().includes("swap")
        );
        // Convert each Bitcoin Well row into a Koinly row
        const convertedRows = filteredData.map(convertRow);
        // Generate the CSV string from the converted rows
        const csv = generateKoinlyCsv(convertedRows);
        setKoinlyCsv(csv);
      },
    });
  };

  // Converts a single Bitcoin Well row to a Koinly row based on order type
  const convertRow = (row: BitcoinWellRow): KoinlyRow => {
    const orderType = row["Order Type"].toLowerCase();
    const date = row["Order Date"];
    const txHash = row["Transaction Hash"] || "";
    // Use Miner Fee if provided and not "-", otherwise leave blank
    const feeAmount = (row["Miner Fee"] && row["Miner Fee"] !== "-") ? row["Miner Fee"] : "";

    // Map Buy orders: spend fiat to receive crypto
    if (orderType.includes("buy")) {
      return {
        "Date": date,
        "Sent Amount": (row["Fiat Amount"] && row["Fiat Amount"] !== "-") ? row["Fiat Amount"] : "",
        "Sent Currency": row["Fiat Code"] || "",
        "Received Amount": row["Crypto Amount"],
        "Received Currency": row["Crypto Code"],
        "Fee Amount": feeAmount,
        "Fee Currency": row["Crypto Code"] || "",
        "Net Worth Amount": "",
        "Net Worth Currency": "",
        "Label": "Buy",
        "Description": "",
        "TxHash": txHash
      };
    }
    // Map Sell orders: send crypto to receive fiat
    else if (orderType.includes("sell")) {
      return {
        "Date": date,
        "Sent Amount": row["Crypto Amount"],
        "Sent Currency": row["Crypto Code"],
        "Received Amount": (row["Fiat Amount"] && row["Fiat Amount"] !== "-") ? row["Fiat Amount"] : "",
        "Received Currency": row["Fiat Code"] || "",
        "Fee Amount": feeAmount,
        "Fee Currency": row["Crypto Code"] || "",
        "Net Worth Amount": "",
        "Net Worth Currency": "",
        "Label": "Sell",
        "Description": "",
        "TxHash": txHash
      };
    }
    // Default mapping: similar to a Buy order (should rarely be hit)
    else {
      return {
        "Date": date,
        "Sent Amount": (row["Fiat Amount"] && row["Fiat Amount"] !== "-") ? row["Fiat Amount"] : "",
        "Sent Currency": row["Fiat Code"] || "",
        "Received Amount": row["Crypto Amount"],
        "Received Currency": row["Crypto Code"],
        "Fee Amount": feeAmount,
        "Fee Currency": row["Crypto Code"] || "",
        "Net Worth Amount": "",
        "Net Worth Currency": "",
        "Label": row["Order Type"],
        "Description": "",
        "TxHash": txHash
      };
    }
  };

  // Generates a CSV string from the array of Koinly rows using the correct header order
  const generateKoinlyCsv = (rows: KoinlyRow[]): string => {
    const headers = [
      "Date",
      "Sent Amount",
      "Sent Currency",
      "Received Amount",
      "Received Currency",
      "Fee Amount",
      "Fee Currency",
      "Net Worth Amount",
      "Net Worth Currency",
      "Label",
      "Description",
      "TxHash"
    ];
    const csvRows = [headers.join(",")];

    rows.forEach((row) => {
      const rowValues = headers.map((header) => {
        const value = (row as any)[header] ?? "";
        // Escape commas and quotes in values
        if (typeof value === "string" && (value.includes(",") || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      csvRows.push(rowValues.join(","));
    });

    return csvRows.join("\n");
  };

  // Initiates download of the generated CSV file
  const downloadCsv = () => {
    const blob = new Blob([koinlyCsv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "koinly_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ maxWidth: "600px", margin: "auto", padding: "1rem", fontFamily: "Arial, sans-serif" }}>
      <h1>Bitcoin Well to Koinly CSV Converter</h1>
      <p>Upload your Bitcoin Well CSV file and convert it to a Koinly‑compatible export.</p>
      <input type="file" accept=".csv" onChange={handleFileUpload} />
      {error && <p style={{ color: "red" }}>{error}</p>}
      {koinlyCsv && (
        <div style={{ marginTop: "1rem" }}>
          <button onClick={downloadCsv}>Download Koinly CSV</button>
          <h2>Preview:</h2>
          <textarea value={koinlyCsv} readOnly rows={10} style={{ width: "100%" }} />
        </div>
      )}
    </div>
  );
};

export default App;
