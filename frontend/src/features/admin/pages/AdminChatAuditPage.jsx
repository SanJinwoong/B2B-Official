import React, { useEffect, useState } from 'react';
import { AlertTriangle, MessageCircle, Shield, ChevronRight, Package } from 'lucide-react';
import { adminApi } from '../../../api/api';
import OrderChatBox from '../../../components/OrderChatBox';

export default function AdminChatAuditPage() {
  const [flaggedOrders, setFlaggedOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    adminApi.getFlaggedChats()
      .then(res => setFlaggedOrders(res.data?.data || []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const fmtDate = (d) => new Date(d).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const totalEvasions = flaggedOrders.reduce((acc, order) => acc + (order.messages?.length || 0), 0);

  return (
    <div style={{ padding: '2rem 1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div className="cd-section-header">
        <div>
          <h1 className="cd-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={24} color="#dc2626" /> Auditoría de Chats B2B
          </h1>
          <p className="cd-section-sub">
            Monitoriza e interviene en negociaciones que han activado alarmas por posible evasión de comisiones (WhatsApp, emails externos, etc).
          </p>
        </div>
      </div>

      {loading ? (
        <div className="cd-empty"><p className="cd-empty-text">Cargando reportes de auditoría...</p></div>
      ) : flaggedOrders.length === 0 ? (
        <div className="cd-empty" style={{ background: '#f8fafc', border: '1px dashed #cbd5e1' }}>
          <div className="cd-empty-icon"><Shield size={32} color="#16a34a" /></div>
          <p className="cd-empty-text" style={{ color: '#16a34a', fontWeight: 600 }}>Todo en orden</p>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '4px' }}>No hay alertas de evasión activas en este momento.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: selectedOrder ? '1fr 1fr' : '1fr', gap: '24px' }}>
          
          {/* Lista de Chats Flagged */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: selectedOrder ? '1fr' : 'repeat(auto-fill, minmax(320px, 1fr))', 
            gap: '16px',
            alignContent: 'start'
          }}>
            {flaggedOrders.map(order => (
              <div 
                key={order.id}
                onClick={() => setSelectedOrder(selectedOrder?.id === order.id ? null : order)}
                style={{
                  background: selectedOrder?.id === order.id ? '#eff6ff' : '#fff',
                  border: selectedOrder?.id === order.id ? '2px solid #2563eb' : '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '16px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: selectedOrder?.id === order.id ? '0 4px 12px rgba(37,99,235,0.1)' : '0 2px 4px rgba(0,0,0,0.02)',
                  position: 'relative'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, background: '#fee2e2', color: '#b91c1c', padding: '4px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <AlertTriangle size={14} /> {order.messages?.length} {order.messages?.length === 1 ? 'Alerta' : 'Alertas'}
                    </span>
                    <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>{order.orderNumber}</span>
                  </div>
                  <ChevronRight size={18} color="#94a3b8" style={{ transform: selectedOrder?.id === order.id ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px', fontSize: '0.9rem' }}>
                  <div>
                    <div style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: '2px' }}>Cliente</div>
                    <div style={{ fontWeight: 500, color: '#0f172a' }}>{order.client?.name || 'Desconocido'}</div>
                  </div>
                  <div>
                    <div style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: '2px' }}>Proveedor</div>
                    <div style={{ fontWeight: 500, color: '#0f172a' }}>{order.supplier?.name || 'Desconocido'}</div>
                  </div>
                </div>

                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Shield size={14} color="#2563eb" /> REPORTE DE IA
                    </div>
                    {order.messages?.[0]?.aiScore > 0 && (
                      <span style={{ 
                        fontSize: '0.75rem', 
                        fontWeight: 700, 
                        color: order.messages[0].aiScore > 0.5 ? '#dc2626' : '#f59e0b',
                        background: order.messages[0].aiScore > 0.5 ? '#fee2e2' : '#fef3c7',
                        padding: '2px 6px',
                        borderRadius: '4px'
                      }}>
                        {Math.round(order.messages[0].aiScore * 100)}% Riesgo
                      </span>
                    )}
                  </div>
                  
                  <div style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '8px', lineHeight: '1.4' }}>
                    <span style={{ fontWeight: 600 }}>Motivo:</span> {order.messages?.[0]?.aiReason || 'Evasión detectada por palabras clave.'}
                  </div>

                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic', background: '#fff', padding: '8px', borderRadius: '4px', border: '1px dashed #cbd5e1' }}>
                    Contenido oculto para proteger la privacidad. Haz clic para auditar la conversación completa.
                  </div>

                  <div style={{ textAlign: 'right', fontSize: '0.7rem', color: '#94a3b8', marginTop: '8px' }}>
                    Detectado: {fmtDate(order.messages?.[0]?.createdAt)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Chat Box del Admin */}
          {selectedOrder && (
            <div style={{ position: 'sticky', top: '24px', height: 'fit-content', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}>
              <div style={{ padding: '16px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Package size={20} color="#2563eb" />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>Auditoría: {selectedOrder.orderNumber}</h3>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Intervención Oficial B2B</div>
                </div>
              </div>
              
              {/* Le pasamos "ADMIN" como role. OrderChatBox ya maneja este rol y envía mensajes como "Soporte B2B". */}
              <OrderChatBox orderId={selectedOrder.id} currentRole="ADMIN" />
            </div>
          )}

        </div>
      )}
    </div>
  );
}
