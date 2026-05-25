import React, { useState, useEffect, useRef } from 'react';
import { Send, AlertTriangle, MessageCircle } from 'lucide-react';
import { orderMessagesApi } from '../api/api';
import { useAuth } from '../context/AuthContext';

export default function OrderChatBox({ orderId, currentRole }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  const loadMessages = () => {
    orderMessagesApi.getMessages(orderId)
      .then(res => setMessages(res.data?.data || []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 10000); // Polling cada 10s
    return () => clearInterval(interval);
  }, [orderId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!content.trim() || sending) return;
    
    setSending(true);
    try {
      await orderMessagesApi.send(orderId, content);
      setContent('');
      await loadMessages();
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const [revealedMessages, setRevealedMessages] = useState({});

  const toggleReveal = (msgId) => {
    setRevealedMessages(prev => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  const fmtTime = (d) => new Date(d).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '450px', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
      <div style={{ padding: '15px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ margin: 0, fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a' }}>
          <MessageCircle size={18} color="#2563eb" />
          Sala de Negociación B2B
        </h3>
        <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <AlertTriangle size={14} color="#f59e0b" />
          Auditoría IA activa
        </div>
      </div>
      
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px', background: '#fcfcfc' }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: '#94a3b8', margin: 'auto' }}>Cargando mensajes...</div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#94a3b8', margin: 'auto', fontSize: '0.9rem' }}>
            No hay mensajes aún. ¡Inicia la conversación para aclarar detalles del pedido!
          </div>
        ) : (
          messages.map(m => {
            const isMine = m.senderId === user.id;
            const isAdminMessage = m.sender?.role === 'ADMIN';
            const isFlagged = m.hasFlaggedWords || (m.aiScore > 0.5);
            const isRevealed = revealedMessages[m.id];
            const showEthicalMask = currentRole === 'ADMIN' && isFlagged && !isRevealed && !isMine;

            return (
              <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '4px', padding: '0 4px' }}>
                  {isMine ? 'Tú' : (isAdminMessage ? 'Soporte B2B' : (currentRole === 'CLIENT' ? 'Proveedor' : 'Cliente'))} • {fmtTime(m.createdAt)}
                </div>
                
                <div style={{
                  background: isAdminMessage ? '#1e293b' : (isMine ? '#2563eb' : (showEthicalMask ? '#fee2e2' : '#fff')),
                  color: isAdminMessage ? '#fff' : (isMine ? '#fff' : (showEthicalMask ? '#991b1b' : '#0f172a')),
                  padding: '10px 14px',
                  borderRadius: '16px',
                  borderTopRightRadius: isMine ? '4px' : '16px',
                  borderTopLeftRadius: !isMine ? '4px' : '16px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                  border: isAdminMessage || isMine ? 'none' : '1px solid #e2e8f0',
                  maxWidth: '85%',
                  fontSize: '0.9rem',
                  lineHeight: '1.4',
                  whiteSpace: 'pre-wrap',
                  position: 'relative'
                }}>
                  {showEthicalMask ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.8rem' }}>
                        <AlertTriangle size={14} /> CONTENIDO OCULTO POR ÉTICA
                      </div>
                      <div style={{ fontSize: '0.8rem', fontStyle: 'italic', opacity: 0.8 }}>
                        {m.aiReason || 'La IA ha detectado una posible violación de políticas.'}
                      </div>
                      <button 
                        onClick={() => toggleReveal(m.id)}
                        style={{ 
                          background: '#fff', border: '1px solid #fecaca', color: '#dc2626', 
                          padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600,
                          cursor: 'pointer', alignSelf: 'flex-start', marginTop: '4px'
                        }}
                      >
                        Revelar mensaje
                      </button>
                    </div>
                  ) : (
                    <>
                      {m.content}
                      {isRevealed && (
                        <button 
                          onClick={() => toggleReveal(m.id)}
                          style={{ display: 'block', background: 'none', border: 'none', color: '#64748b', fontSize: '0.7rem', padding: 0, marginTop: '8px', cursor: 'pointer', textDecoration: 'underline' }}
                        >
                          Ocultar de nuevo
                        </button>
                      )}
                    </>
                  )}
                </div>

                {m.aiScore > 0 && currentRole === 'ADMIN' && (
                  <div style={{ fontSize: '0.7rem', color: m.aiScore > 0.5 ? '#dc2626' : '#f59e0b', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Shield size={12} /> IA: {Math.round(m.aiScore * 100)}% riesgo • {m.aiReason}
                  </div>
                )}
                
                {m.hasFlaggedWords && !m.aiScore && currentRole === 'ADMIN' && (
                  <div style={{ fontSize: '0.7rem', color: '#dc2626', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <AlertTriangle size={12} /> Sistema: Palabra clave detectada.
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <form onSubmit={handleSend} style={{ padding: '15px', borderTop: '1px solid #e2e8f0', background: '#fff', display: 'flex', gap: '10px' }}>
        <input 
          type="text" 
          placeholder="Escribe un mensaje..." 
          value={content}
          onChange={e => setContent(e.target.value)}
          style={{ flex: 1, padding: '10px 14px', borderRadius: '24px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem' }}
          disabled={sending}
        />
        <button 
          type="submit" 
          disabled={sending || !content.trim()}
          style={{ 
            background: content.trim() ? '#2563eb' : '#94a3b8', 
            color: '#fff', border: 'none', borderRadius: '50%', width: '40px', height: '40px', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: content.trim() ? 'pointer' : 'default',
            transition: 'background 0.2s'
          }}
        >
          <Send size={18} style={{ marginLeft: '2px' }} />
        </button>
      </form>
    </div>
  );
}
