/**
 * DocumentViewer.jsx
 *
 * Visor de documentos autenticado para el panel de administrador.
 * Se abre como un modal sobre la pantalla.
 *
 * FLUJO:
 *  1. El admin hace clic en un documento → se abre este modal.
 *  2. Se realiza un fetch() autenticado (Bearer token).
 *  3. La respuesta se convierte en un Blob y se crea un objectURL.
 *  4. Según el mimeType:
 *       - image/*         → <img src={blobUrl}>
 *       - application/pdf → <iframe src={blobUrl}>
 *  5. Al cerrar el modal → URL.revokeObjectURL() libera la memoria.
 *  6. Siempre hay un botón "Descargar" disponible como respaldo.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, Download, ZoomIn, ZoomOut, RotateCcw,
  FileText, AlertCircle, Loader2,
} from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────────────────
const formatBytes = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const isImage = (mime) => mime?.startsWith('image/');
const isPdf   = (mime) => mime === 'application/pdf';

/**
 * @param {object|null} doc           - ApplicationDocument del DTO admin, o null para cerrar
 * @param {string}      token         - JWT del admin (de AuthContext)
 * @param {function}    onClose       - () => void
 */
const DocumentViewer = ({ doc, token, onClose }) => {
  const [blobUrl,    setBlobUrl]    = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [imgZoom,    setImgZoom]    = useState(100);  // % para imágenes
  const prevBlobUrl                 = useRef(null);

  // ── Cargar el blob al abrir / cambiar documento ───────────────────────────
  useEffect(() => {
    if (!doc) return;

    let cancelled = false;
    setLoading(true);
    setFetchError('');
    setBlobUrl(null);
    setImgZoom(100);

    const load = async () => {
      const base = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
      const path = doc.downloadUrl.replace(/^\/api/, '');
      const url  = `${base}${path}`;

      try {
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error?.message || `HTTP ${res.status}`);
        }

        const blob    = await res.blob();
        const objUrl  = URL.createObjectURL(blob);

        if (!cancelled) {
          // Revocar la URL anterior si la había
          if (prevBlobUrl.current) URL.revokeObjectURL(prevBlobUrl.current);
          prevBlobUrl.current = objUrl;
          setBlobUrl(objUrl);
        } else {
          URL.revokeObjectURL(objUrl);
        }
      } catch (err) {
        if (!cancelled) setFetchError(err.message || 'No se pudo cargar el documento.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [doc, token]);

  // ── Revocar objectURL al desmontar ────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (prevBlobUrl.current) URL.revokeObjectURL(prevBlobUrl.current);
    };
  }, []);

  // ── Descarga forzada del blob actual ──────────────────────────────────────
  const handleDownload = useCallback(() => {
    if (!blobUrl) return;
    const a      = document.createElement('a');
    a.href       = blobUrl;
    a.download   = doc.originalName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [blobUrl, doc]);

  // ── Cerrar con Escape ──────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!doc) return null;

  return (
    <div
      className="dv-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label={`Visor de documento: ${doc.originalName}`}
    >
      <div className="dv-modal">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="dv-header">
          <div className="dv-header-info">
            <FileText size={16} className="dv-header-icon" />
            <div>
              <p className="dv-filename">{doc.originalName}</p>
              <p className="dv-filemeta">
                {doc.label}
                {doc.sizeBytes ? ` · ${formatBytes(doc.sizeBytes)}` : ''}
                {doc.mimeType  ? ` · ${doc.mimeType}` : ''}
              </p>
            </div>
          </div>

          <div className="dv-header-actions">
            {/* Controles de zoom solo para imágenes */}
            {isImage(doc.mimeType) && blobUrl && (
              <>
                <button
                  className="dv-icon-btn"
                  onClick={() => setImgZoom((z) => Math.max(25, z - 25))}
                  title="Reducir"
                  disabled={imgZoom <= 25}
                >
                  <ZoomOut size={16} />
                </button>
                <span className="dv-zoom-label">{imgZoom}%</span>
                <button
                  className="dv-icon-btn"
                  onClick={() => setImgZoom((z) => Math.min(200, z + 25))}
                  title="Ampliar"
                  disabled={imgZoom >= 200}
                >
                  <ZoomIn size={16} />
                </button>
                <button
                  className="dv-icon-btn"
                  onClick={() => setImgZoom(100)}
                  title="Restablecer zoom"
                >
                  <RotateCcw size={14} />
                </button>
                <div className="dv-divider" />
              </>
            )}

            {/* Botón de descarga (siempre visible) */}
            <button
              className="dv-download-btn"
              onClick={handleDownload}
              disabled={!blobUrl}
              title="Descargar archivo original"
            >
              <Download size={15} />
              Descargar
            </button>

            {/* Cerrar */}
            <button className="dv-icon-btn dv-close-btn" onClick={onClose} title="Cerrar visor">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Cuerpo del visor ────────────────────────────────────────────── */}
        <div className="dv-body">

          {/* Loading */}
          {loading && (
            <div className="dv-state">
              <Loader2 size={32} className="dv-spinner" />
              <p>Cargando documento seguro...</p>
            </div>
          )}

          {/* Error */}
          {!loading && fetchError && (
            <div className="dv-state">
              <AlertCircle size={32} className="dv-error-icon" />
              <p className="dv-error-msg">{fetchError}</p>
              <p className="dv-error-sub">Verifica que el archivo aún exista en el servidor.</p>
            </div>
          )}

          {/* ── Visor de imagen ─────────────────────────────────────────── */}
          {!loading && !fetchError && blobUrl && isImage(doc.mimeType) && (
            <div className="dv-image-container">
              <img
                src={blobUrl}
                alt={doc.originalName}
                className="dv-image"
                style={{ width: `${imgZoom}%` }}
                draggable={false}
              />
            </div>
          )}

          {/* ── Visor de PDF ─────────────────────────────────────────────── */}
          {!loading && !fetchError && blobUrl && isPdf(doc.mimeType) && (
            <iframe
              src={blobUrl}
              className="dv-pdf"
              title={doc.originalName}
            />
          )}

          {/* Tipo no soportado para vista previa */}
          {!loading && !fetchError && blobUrl && !isImage(doc.mimeType) && !isPdf(doc.mimeType) && (
            <div className="dv-state">
              <FileText size={36} className="dv-unsupported-icon" />
              <p>Vista previa no disponible para este tipo de archivo.</p>
              <button className="dv-download-btn" onClick={handleDownload} style={{ marginTop: '1rem' }}>
                <Download size={15} /> Descargar archivo
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default DocumentViewer;
