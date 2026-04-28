/**
 * StatusBadge.jsx
 * Muestra un badge con color semántico según el status de la solicitud.
 */
const STATUS_CONFIG = {
  PENDING:        { label: 'Pendiente',        cls: 'aa-badge-pending',   icon: '●' },
  REVIEWING:      { label: 'En Revisión',      cls: 'aa-badge-reviewing', icon: '◉' },
  ACTION_REQUIRED:{ label: 'Acción Requerida', cls: 'aa-badge-action',    icon: '▲' },
  APPROVED:       { label: 'Aprobado',         cls: 'aa-badge-approved',  icon: '✓' },
  REJECTED:       { label: 'Rechazado',        cls: 'aa-badge-rejected',  icon: '✕' },
};

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || { label: status, cls: '', icon: '?' };
  return (
    <span className={`aa-badge ${cfg.cls}`}>
      <span>{cfg.icon}</span>
      {cfg.label}
    </span>
  );
};

export default StatusBadge;
