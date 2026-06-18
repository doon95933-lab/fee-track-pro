import React, { useState } from 'react';
import api from '../api';
import Topbar from '../components/Topbar';
import { Card, Btn, Alert } from '../components/UI';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const STEPS = ['Download template', 'Fill student data', 'Upload & verify', 'Live in system'];

export default function Upload() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [year, setYear] = useState('2026-27');
  const [uploading, setUploading] = useState(false);

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setStep(2);
    // Simulate preview
    setPreview({ file: f.name, rowCount: '—', totalFee: '—', note: 'Upload to see preview' });
  };

  const handleUpload = async () => {
    if (!file) return toast.error('Please select a file first');
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('academic_year', year);
      const { data } = await api.post('/students/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success(`✅ ${data.inserted} students loaded successfully!`);
      setStep(3);
      setTimeout(() => navigate('/ledger'), 2000);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <Topbar title="Upload Fee Due List" />
      <div className="p-6 max-w-3xl">
        <Alert type="info">
          📋 Do this once at the start of every academic year. All concession tracking, payment recording, and defaulter reports will be based on this data.
        </Alert>

        {/* Step indicators */}
        <div className="flex mb-6 overflow-hidden rounded-lg border border-gray-200">
          {STEPS.map((s, i) => (
            <div key={s} className={`flex-1 flex items-center gap-2 px-4 py-3 text-xs
              ${i < step ? 'bg-forest-50 border-r border-forest-200' :
                i === step ? 'bg-blue-50 border-r border-blue-200' : 'bg-gray-50 border-r border-gray-200'}`}>
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0
                ${i < step ? 'bg-forest-600 text-white' : i === step ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-500'}`}>
                {i < step ? '✓' : i + 1}
              </div>
              <div>
                <div className="font-medium text-gray-700">{s}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Step 1 — Template */}
        <Card title="Step 1 — Download the Excel template">
          <p className="text-sm text-gray-500 mb-4">Fill one row per student. All classes in one file.</p>
          <div className="overflow-x-auto mb-4">
            <table className="text-xs border border-gray-200 rounded-lg overflow-hidden">
              <thead className="bg-gray-50">
                <tr>
                  {['Student Name*', 'Class*', 'Section*', 'Roll No', 'Parent Name*', 'Phone*', 'Total Fee*', 'Amount Paid', 'Balance Due'].map(h => (
                    <th key={h} className={`px-3 py-2 text-left font-medium ${h.includes('*') ? 'text-red-600' : 'text-gray-500'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="text-gray-400 italic">
                  <td className="px-3 py-2">Aryan Mehta</td><td className="px-3 py-2">10</td><td className="px-3 py-2">A</td>
                  <td className="px-3 py-2">1042</td><td className="px-3 py-2">Suresh Mehta</td><td className="px-3 py-2">9876543210</td>
                  <td className="px-3 py-2">42000</td><td className="px-3 py-2">23500</td><td className="px-3 py-2">18500</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="flex gap-3 items-center">
            <Btn variant="primary" onClick={() => { toast.success('Template downloaded!'); setStep(1); }}>
              ⬇ Download Excel template
            </Btn>
            <div>
              <label className="text-xs font-medium text-gray-500 mr-2">Academic year:</label>
              <select value={year} onChange={e => setYear(e.target.value)}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs">
                <option>2025-26</option>
                <option>2026-27</option>
                <option>2027-28</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Step 2 — Upload */}
        <Card title="Step 2 — Upload filled file">
          <label className="block border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:bg-gray-50 transition-colors mb-4">
            <div className="text-4xl mb-2">📊</div>
            <div className="text-sm font-medium text-gray-700 mb-1">
              {file ? `✅ ${file.name}` : 'Click to upload Excel / CSV file'}
            </div>
            <div className="text-xs text-gray-400">.xlsx or .csv · Max 10MB · All classes in one file</div>
            <input type="file" accept=".xlsx,.csv,.xls" onChange={handleFile} className="hidden" />
          </label>
          {file && (
            <Alert type="success">
              File selected: <strong>{file.name}</strong> ({(file.size / 1024).toFixed(1)} KB)
            </Alert>
          )}
        </Card>

        {/* Step 3 — Confirm */}
        {step >= 2 && file && (
          <Card title="Step 3 — Confirm upload">
            <Alert type="warning">
              ⚠ Review carefully. Once confirmed, this becomes the base record for the year. All changes are logged.
            </Alert>
            <div className="flex gap-2">
              <Btn variant="success" onClick={handleUpload} disabled={uploading}>
                {uploading ? 'Uploading…' : '✅ Confirm & go live'}
              </Btn>
              <Btn onClick={() => { setFile(null); setStep(0); }}>Start over</Btn>
            </div>
          </Card>
        )}

        {step === 3 && (
          <Alert type="success">
            🎉 Fee due list is live! Redirecting to ledger…
          </Alert>
        )}
      </div>
    </div>
  );
}
