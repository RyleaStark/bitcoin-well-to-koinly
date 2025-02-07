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

/**
 * Helper function to convert a date string from Mountain Time (assumed MST, UTC-7) 
 * to a UTC formatted string.
 * 
 * Assumes the input is in the format "YYYY-MM-DD HH:mm:ss".
 * Output is formatted as "YYYY-MM-DD HH:mm UTC" (without seconds).
 */
const convertMountainTimeToUTC = (dateStr: string): string => {
  // Replace the space with 'T' and append the Mountain Time offset (-07:00)
  const isoDateStr = dateStr.replace(' ', 'T') + "-07:00";
  const date = new Date(isoDateStr);
  
  // Format the UTC date components
  const year = date.getUTCFullYear();
  const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = date.getUTCDate().toString().padStart(2, '0');
  const hours = date.getUTCHours().toString().padStart(2, '0');
  const minutes = date.getUTCMinutes().toString().padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes} UTC`;
};

const App: React.FC = () => {
  // State for the generated CSV and any error messages
  const [koinlyCsv, setKoinlyCsv] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Handles CSV file upload and parsing using PapaParse
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
        // Ignore rows with swap orders
        const filteredData = data.filter(
          (row) => !row["Order Type"].toLowerCase().includes("swap")
        );
        // Convert each remaining Bitcoin Well row to a Koinly row
        const convertedRows = filteredData.map(convertRow);
        // Generate the CSV string from the converted rows
        const csv = generateKoinlyCsv(convertedRows);
        setKoinlyCsv(csv);
      },
    });
  };

  // Converts a single Bitcoin Well row to a Koinly row,
  // converting the date from Mountain Time to UTC.
  const convertRow = (row: BitcoinWellRow): KoinlyRow => {
    // Convert date from Mountain Time to UTC format
    const date = convertMountainTimeToUTC(row["Order Date"]);
    const orderType = row["Order Type"].toLowerCase();
    const txHash = row["Transaction Hash"] || "";
    // Use the Miner Fee if provided and not "-", else leave blank
    const feeAmount = (row["Miner Fee"] && row["Miner Fee"] !== "-") ? row["Miner Fee"] : "";

    // For buy orders: fiat is sent and crypto is received
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
    // For sell orders: crypto is sent and fiat is received
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
    // Default mapping (should rarely occur)
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

  // Generates a CSV string from an array of Koinly rows, ensuring proper escaping
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
        // Escape commas and quotes as needed
        if (typeof value === "string" && (value.includes(",") || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      csvRows.push(rowValues.join(","));
    });

    return csvRows.join("\n");
  };

  // Triggers download of the generated CSV file
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
      <p style={{ marginTop: "1rem", fontSize: "smaller" }}>Converter by <a href="https://bitcoinwell.com/referral/bones" target="_blank">Bitcoin Bones 🦴</a> | <a href="https://github.com/RyleaStark/bitcoin-well-to-koinly" target="_blank">GitHub Repo</a><br/><span style={{ color: "gray" }}>Did I save you some time? Tip Lightning bones@zapme.ca</span></p>
    </div>
  );
};

export default App;
