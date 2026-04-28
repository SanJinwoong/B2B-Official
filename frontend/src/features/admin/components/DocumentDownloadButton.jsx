/**
 * DocumentDownloadButton.jsx
 *
 * Descarga autenticada de documentos privados del servidor.
 *
 * SEGURIDAD: NO usa <a href> directo.
 * El archivo está en un endpoint protegido que requiere Bearer token.
 * Flujo:
 *   1. fetch() con Authorization header
 *   2. Convertir response en Blob
 *   3. URL.createObjectURL(blob) → <a> temporal → click() → revokeObjectURL()
 */

import { useState } from 'react';

const formatBytes = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return ` · ${Math.round(bytes / 1024)} KB`;
  return ` · ${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const mimeIcon = (mime) => {
  if (!mime) return '📄';
  if (mime === 'application/pdf') return '📑';
  if (mime.startsWith('image/')) return '🖼';
  return '📄';
};

/**
 * @param {object}  doc            - Objeto ApplicationDocument del DTO del admin
 * @param {string}  doc.id
 * @param {string}  doc.label
 * @param {string}  doc.originalName
 * @param {string}  doc.mimeType
 * @param {number}  doc.sizeBytes
 * @param {string}  doc.downloadUrl - URL relativa construida por el DTO (/api/admin/...)
 * @param {string}  token           - JWT del admin (de AuthContext)
 * @param {string}  apiBase         - VITE_API_URL base (sin /api, ajustamos en el componente)
 */
const DocumentDownloadButton = ({ doc, token }) => {
  const [downloading, setDownloading] = useState(false);
  const [error, setError]             = useState('');

  const handleDownload = async () => {
    setDownloading(true);
    setError('');

    // Construir URL absoluta: VITE_API_URL ya incluye /api
    // doc.downloadUrl = "/api/admin/applications/:id/documents/:docId/download"
    const baseUrl  = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    // Quitar el prefijo /api del downloadUrl porque baseUrl ya lo tiene
    const path     = doc.downloadUrl.replace(/^\/api/, '');
    const fullUrl  = `${baseUrl}${path}`;

    try {
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error?.message || `Error ${response.status}`);
      }

      // Convertir stream en Blob
      const blob       = await response.blob();
      const objectUrl  = URL.createObjectURL(blob);

      // Crear <a> temporal, disparar descarga y limpiar inmediatamente
      const anchor     = document.createElement('a');
      anchor.href      = objectUrl;
      anchor.download  = doc.originalName;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(objectUrl);

    } catch (err) {
      setError(err.message || 'No se pudo descargar el archivo.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="aa-doc-item">
      <span className="aa-doc-icon">{mimeIcon(doc.mimeType)}</span>

      <div className="aa-doc-info">
        <p className="aa-doc-name" title={doc.originalName}>{doc.originalName}</p>
        <p className="aa-doc-size">
          {doc.label}{formatBytes(doc.sizeBytes)}
          {doc.lastAccessedAt && (
            <span> · Visto {new Date(doc.lastAccessedAt).toLocaleDateString()}</span>
          )}
        </p>
        {error && <p style={{ color: 'var(--s-rejected)', fontSize: '0.75rem', marginTop: '0.2rem' }}>{error}</p>}
      </div>

      <button
        className="aa-btn aa-btn-ghost aa-btn-xs"
        onClick={handleDownload}
        disabled={downloading}
        title="Descargar documento"
      >
        {downloading ? <span className="aa-spinner" /> : '⬇ Descargar'}
      </button>
    </div>
  );
};

export default DocumentDownloadButton;
