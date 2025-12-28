'use client';

import { useState } from 'react';

interface CSVImportProps {
  onImportSuccess?: () => void;
}

interface ImportResult {
  success: boolean;
  message: string;
  imported_products?: number;
  imported_cost_items?: number;
  total_products?: number;
  products?: Array<{ name: string; cost_items: number }>;
}

export default function CSVImport({ onImportSuccess }: CSVImportProps = {}) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv')) {
        setFile(selectedFile);
        setError(null);
        setResult(null);
      } else {
        setError('Please select a CSV file');
        setFile(null);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_URL}/api/import/csv`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Import failed' }));
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setResult(data);
      setFile(null);
      
      // Reset file input
      const fileInput = document.getElementById('csv-file') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
      
      // Notify parent component to reload data
      if (onImportSuccess) {
        onImportSuccess();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import CSV file');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2 style={{ marginBottom: '20px', fontSize: '24px' }}>Import CSV File</h2>
      
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '20px' }}>
          <label 
            htmlFor="csv-file" 
            style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontWeight: 500,
              fontSize: '14px'
            }}
          >
            Select CSV File:
          </label>
          <input
            id="csv-file"
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            disabled={loading}
            style={{
              padding: '8px',
              fontSize: '14px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              width: '100%',
              maxWidth: '400px',
            }}
          />
        </div>

        <button
          type="submit"
          disabled={!file || loading}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: loading ? '#ccc' : '#007bff',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: loading || !file ? 'not-allowed' : 'pointer',
            fontWeight: 500,
          }}
        >
          {loading ? 'Importing...' : 'Import CSV'}
        </button>
      </form>

      {error && (
        <div className="error" style={{ marginTop: '20px' }}>
          Error: {error}
        </div>
      )}

      {result && result.success && (
        <div style={{
          marginTop: '20px',
          padding: '16px',
          backgroundColor: '#d4edda',
          border: '1px solid #c3e6cb',
          borderRadius: '4px',
          color: '#155724',
        }}>
          <h3 style={{ marginBottom: '12px', fontSize: '18px' }}>Import Successful!</h3>
          <p style={{ marginBottom: '8px' }}>{result.message}</p>
          <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
            <li>Imported Products: {result.imported_products || 0}</li>
            <li>Imported Cost Items: {result.imported_cost_items || 0}</li>
            <li>Total Products: {result.total_products || 0}</li>
          </ul>
          {result.products && result.products.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <strong>Products:</strong>
              <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
                {result.products.map((product, idx) => (
                  <li key={idx}>
                    {product.name}: {product.cost_items} cost items
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

