/**
 * ChatPopup.jsx
 * Messenger-style floating popup chat window.
 * Props:
 *   orderId      - ID of the order
 *   productName  - Name of the product
 *   productImage - URL of the product image
 *   participantName - Name of the other party (Client/Supplier)
 *   currentRole  - "CLIENT" | "SUPPLIER"
 *   onClose      - Callback to close the popup
 */
import React, { useState, useEffect, useRef } from 'react';
import { X, Send, AlertTriangle, Package } from 'lucide-react';
import { orderMessagesApi } from '../api/api';
import { useAuth } from '../context/AuthContext';

export default function ChatPopup({ orderId, productName, productImage, participantName, currentRole, onClose }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  const loadMessages = () => {
    orderMessagesApi.getMessages(orderId)
      .then(res => setMessages(res.data?.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, 8000);
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

  const popupWidth = 360;

  return (
    <div style={{
      position: 'fixed',
      top: '50%',
      right: '24px',
      transform: 'translateY(-50%)',
      width: `${popupWidth}px`,
      height: '520px',
      zIndex: 9000,
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 8px 30px rgba(0,0,0,0.18)',
      borderRadius: '12px',
      overflow: 'hidden',
      fontFamily: 'inherit',
      background: '#fff',
    }}>
      {/* Header */}
      <div
        style={{
          background: '#1e3a8a',
          color: '#fff',
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        {productImage ? (
          <img src={productImage} alt={productName} style={{ width: 36, height: 36, borderRadius: '6px', objectFit: 'cover', flexShrink: 0 }} />
        ) : (
          <div style={{ width: 36, height: 36, borderRadius: '6px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Package size={20} />
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '0.9rem', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {productName}
          </span>
          <span style={{ fontSize: '0.78rem', opacity: 0.85, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {participantName}
          </span>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Body */}
      <>
        {/* Audit notice */}
        <div style={{ background: '#fefce8', borderBottom: '1px solid #fde68a', padding: '6px 14px', fontSize: '0.72rem', color: '#92400e', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <AlertTriangle size={12} color="#d97706" /> Conversación auditada por B2B Supply
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px', background: '#f8fafc' }}>
            {loading ? (
              <div style={{ textAlign: 'center', color: '#94a3b8', margin: 'auto', fontSize: '0.85rem' }}>Cargando...</div>
            ) : messages.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#94a3b8', margin: 'auto', fontSize: '0.85rem' }}>
                Ningún mensaje aún.<br />¡Inicia la conversación!
              </div>
            ) : (
              messages.map(m => {
                const isSystem = m.content.startsWith('[SISTEMA]');
                if (isSystem) {
                  return (
                    <div key={m.id} style={{ display: 'flex', justifyContent: 'center', margin: '8px 0' }}>
                      <div style={{
                        background: '#f1f5f9',
                        color: '#64748b',
                        padding: '6px 12px',
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        border: '1px solid #e2e8f0',
                        textAlign: 'center',
                        maxWidth: '90%'
                      }}>
                        {m.content.replace('[SISTEMA]', '').trim()}
                      </div>
                    </div>
                  );
                }

                const isMine = m.senderId === user?.id;
                const senderLabel = isMine
                  ? 'Tú'
                  : m.sender?.role === 'ADMIN'
                    ? 'Soporte B2B'
                    : currentRole === 'CLIENT' ? 'Proveedor' : 'Cliente';
                return (
                  <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start' }}>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: '3px', padding: '0 4px' }}>
                      {senderLabel} · {fmtTime(m.createdAt)}
                    </div>
                    <div style={{
                      background: isMine ? '#2563eb' : '#fff',
                      color: isMine ? '#fff' : '#0f172a',
                      padding: '8px 12px',
                      borderRadius: '14px',
                      borderTopRightRadius: isMine ? '3px' : '14px',
                      borderTopLeftRadius: !isMine ? '3px' : '14px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                      border: isMine ? 'none' : '1px solid #e2e8f0',
                      maxWidth: '80%',
                      fontSize: '0.875rem',
                      lineHeight: '1.4',
                      whiteSpace: 'pre-wrap',
                    }}>
                      {m.content}
                    </div>
                    {m.hasFlaggedWords && isMine && (
                      <div style={{ fontSize: '0.68rem', color: '#dc2626', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <AlertTriangle size={10} /> Mensaje revisado por auditoría.
                      </div>
                    )}
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={handleSend}
            style={{ padding: '10px 12px', borderTop: '1px solid #e2e8f0', background: '#fff', display: 'flex', gap: '8px', alignItems: 'center' }}
          >
            <input
              type="text"
              placeholder="Escribe un mensaje..."
              value={content}
              onChange={e => setContent(e.target.value)}
              style={{ flex: 1, padding: '8px 12px', borderRadius: '20px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.875rem' }}
              disabled={sending}
            />
            <button
              type="submit"
              disabled={sending || !content.trim()}
              style={{
                background: content.trim() ? '#2563eb' : '#94a3b8',
                color: '#fff', border: 'none', borderRadius: '50%',
                width: '34px', height: '34px', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: content.trim() ? 'pointer' : 'default',
                transition: 'background 0.2s',
              }}
            >
              <Send size={15} style={{ marginLeft: '1px' }} />
            </button>
          </form>
        </>
    </div>
  );
}
