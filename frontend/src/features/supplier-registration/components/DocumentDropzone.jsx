import { useDropzone } from 'react-dropzone';

const ACCEPTED = {
  'application/pdf': ['.pdf'],
  'image/jpeg':      ['.jpg', '.jpeg'],
  'image/png':       ['.png'],
};

const formatBytes = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/**
 * DocumentDropzone
 *
 * @param {File[]}   files        - Lista de archivos seleccionados (estado React)
 * @param {Function} onFilesChange - Callback que recibe el nuevo array de archivos
 * @param {boolean}  filesLost   - Si true, muestra aviso de archivos perdidos por recarga
 */
const DocumentDropzone = ({ files, onFilesChange, filesLost }) => {
  const onDrop = (accepted) => {
    // Combinar con archivos existentes, evitar duplicados por nombre
    const existingNames = new Set(files.map((f) => f.name));
    const newFiles = accepted.filter((f) => !existingNames.has(f.name));
    onFilesChange([...files, ...newFiles].slice(0, 5));
  };

  const removeFile = (name) => {
    onFilesChange(files.filter((f) => f.name !== name));
  };

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept:   ACCEPTED,
    maxSize:  10 * 1024 * 1024, // 10 MB
    maxFiles: 5,
    multiple: true,
  });

  return (
    <div>
      {/* Aviso de archivos perdidos por recarga */}
      {filesLost && files.length === 0 && (
        <div className="sr-warn-box">
          <span>⚠️</span>
          <span>
            Detectamos que ya habías seleccionado archivos, pero estos no sobreviven
            a una recarga de página. Por favor, selecciónalos de nuevo.
          </span>
        </div>
      )}

      {/* Zona de arrastre */}
      <div
        {...getRootProps()}
        className={`sr-dropzone ${isDragActive ? 'active' : ''} ${isDragReject ? 'reject' : ''}`}
      >
        <input {...getInputProps()} />
        <div className="sr-dropzone-icon">
          <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
        </div>
        {isDragActive ? (
          <p>Suelta los archivos aquí...</p>
        ) : (
          <>
            <p>Arrastra archivos aquí o <strong>haz clic para seleccionar</strong></p>
            <small>PDF, JPG, PNG — máx. 10 MB por archivo — máx. 5 archivos</small>
          </>
        )}
      </div>

      {/* Lista de archivos seleccionados */}
      {files.length > 0 && (
        <div className="sr-file-list">
          {files.map((file) => (
            <div key={file.name} className="sr-file-item">
              <span className="sr-file-name" title={file.name}>📄 {file.name}</span>
              <span className="sr-file-size">{formatBytes(file.size)}</span>
              <button
                type="button"
                className="sr-file-remove"
                onClick={() => removeFile(file.name)}
                title="Eliminar archivo"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DocumentDropzone;
