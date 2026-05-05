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
          Auditoría activa
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
            return (
              <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '4px', padding: '0 4px' }}>
                  {isMine ? 'Tú' : (m.sender?.role === 'ADMIN' ? 'Soporte B2B' : (currentRole === 'CLIENT' ? 'Proveedor' : 'Cliente'))} • {fmtTime(m.createdAt)}
                </div>
                <div style={{
                  background: isMine ? '#2563eb' : (m.sender?.role === 'ADMIN' ? '#f1f5f9' : '#fff'),
                  color: isMine ? '#fff' : '#0f172a',
                  padding: '10px 14px',
                  borderRadius: '16px',
                  borderTopRightRadius: isMine ? '4px' : '16px',
                  borderTopLeftRadius: !isMine ? '4px' : '16px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                  border: isMine ? 'none' : '1px solid #e2e8f0',
                  maxWidth: '85%',
                  fontSize: '0.9rem',
                  lineHeight: '1.4',
                  whiteSpace: 'pre-wrap'
                }}>
                  {m.content}
                </div>
                {m.hasFlaggedWords && isMine && (
                  <div style={{ fontSize: '0.7rem', color: '#dc2626', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <AlertTriangle size={12} /> Mensaje marcado por posible evasión.
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
