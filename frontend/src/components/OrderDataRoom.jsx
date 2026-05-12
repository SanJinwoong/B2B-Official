import React, { useState, useEffect, useRef } from 'react';
import { FileText, Upload, Trash2, Download, AlertCircle } from 'lucide-react';
import { ordersApi } from '../api/api';

const DOC_TYPES = [
  { value: 'PROFORMA', label: 'Factura Proforma' },
  { value: 'FAC_A', label: 'Factura a Cliente (FAC-A)' },
  { value: 'FAC_B', label: 'Factura de Proveedor (FAC-B)' },
  { value: 'PAYMENT_RECEIPT', label: 'Comprobante de Pago' },
  { value: 'NDA', label: 'Contrato NDA / Confidencialidad' },
  { value: 'QUALITY_CERT', label: 'Certificado de Calidad' },
  { value: 'PACKING_LIST', label: 'Packing List' },
  { value: 'BILL_OF_LADING', label: 'Bill of Lading / Guía' },
  { value: 'OTHER', label: 'Otro' }
];

export default function OrderDataRoom({ orderId, currentUserRole, currentUserId }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  
  // Formulario
  const [selectedType, setSelectedType] = useState('OTHER');
  const [docLabel, setDocLabel] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchDocuments();
  }, [orderId]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const res = await ordersApi.getDocuments(orderId);
      setDocuments(res.data.data);
    } catch (err) {
      console.error(err);
      setError('Error al cargar documentos.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    const file = fileInputRef.current?.files[0];
    if (!file) {
      setError('Selecciona un archivo primero.');
      return;
    }
    if (!docLabel.trim()) {
      setError('Ingresa una etiqueta descriptiva.');
      return;
    }

    try {
      setUploading(true);
      setError('');
      
      const formData = new FormData();
      formData.append('document', file);
      formData.append('type', selectedType);
      formData.append('label', docLabel);

      await ordersApi.uploadDocument(orderId, formData);
      
      // Reset form
      setDocLabel('');
      setSelectedType('OTHER');
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      fetchDocuments();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al subir el documento.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (docId) => {
    if (!window.confirm('¿Seguro que deseas eliminar este documento? Esta acción es irreversible.')) return;
    try {
      await ordersApi.deleteDocument(docId);
      setDocuments(prev => prev.filter(d => d.id !== docId));
    } catch (err) {
      alert(err.response?.data?.message || 'Error al eliminar');
    }
  };

  const handleDownload = async (docId, label) => {
    try {
      const response = await ordersApi.downloadDocument(docId);
      
      // Crear blob url y forzar descarga
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', label);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Error al descargar el archivo.');
    }
  };

  return (
    <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
      
      {/* ─── Encabezado Data Room ─── */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <FileText size={20} color="#0f172a" />
        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#0f172a' }}>
          Data Room (Documentos Seguros)
        </h3>
      </div>

      <div style={{ padding: '20px' }}>
        {error && (
          <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '10px 14px', borderRadius: '6px', fontSize: '0.9rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {/* ─── Zona de Subida ─── */}
        <form onSubmit={handleUpload} style={{ background: '#f1f5f9', padding: '16px', borderRadius: '8px', marginBottom: '24px', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 200px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Tipo de Documento</label>
            <select 
              value={selectedType} 
              onChange={(e) => setSelectedType(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
            >
              {DOC_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: '1 1 200px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Descripción / Etiqueta</label>
            <input 
              type="text" 
              placeholder="Ej. Comprobante SPEI 50% anticipo"
              value={docLabel}
              onChange={(e) => setDocLabel(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
            />
          </div>
          <div style={{ flex: '1 1 200px' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Archivo</label>
            <input 
              type="file" 
              ref={fileInputRef}
              style={{ width: '100%', fontSize: '0.9rem' }}
            />
          </div>
          <div>
            <button 
              type="submit" 
              disabled={uploading}
              style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Upload size={16} /> {uploading ? 'Subiendo...' : 'Subir Archivo'}
            </button>
          </div>
        </form>

        {/* ─── Lista de Documentos ─── */}
        <div>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', color: '#334155' }}>Archivos de la Orden</h4>
          
          {loading ? (
            <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>Cargando documentos...</div>
          ) : documents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1', color: '#94a3b8' }}>
              No hay documentos adjuntos aún.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '10px' }}>
              {documents.map(doc => {
                const isOwner = currentUserRole === 'ADMIN' || doc.uploadedById === currentUserId;
                const typeLabel = DOC_TYPES.find(t => t.value === doc.type)?.label || doc.type;
                
                return (
                  <div key={doc.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {doc.label}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px', display: 'flex', gap: '12px' }}>
                        <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>{typeLabel}</span>
                        <span>Subido por: <strong>{doc.uploadedBy?.name || 'Usuario'}</strong> ({doc.uploadedBy?.role})</span>
                        <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        onClick={() => handleDownload(doc.id, doc.label)}
                        style={{ padding: '6px 10px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}
                        title="Descargar"
                      >
                        <Download size={14} /> 
                      </button>
                      
                      {isOwner && (
                        <button 
                          onClick={() => handleDelete(doc.id)}
                          style={{ padding: '6px 10px', background: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}
                          title="Eliminar"
                        >
                          <Trash2 size={14} /> 
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
