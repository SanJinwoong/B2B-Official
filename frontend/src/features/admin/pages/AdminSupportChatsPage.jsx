import React, { useEffect, useState, useRef } from 'react';
import { MessageCircle, Send, User } from 'lucide-react';
import { messageApi } from '../../../api/api';
import { useAuth } from '../../../context/AuthContext';
import { useLocation } from 'react-router-dom';

function fmtTime(d){ return new Date(d).toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'}); }
function fmtDate(d){ return new Date(d).toLocaleDateString('es-MX',{day:'numeric',month:'short'}); }

export default function AdminSupportChatsPage() {
  const { user } = useAuth();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialUserId = queryParams.get('userId');

  const [chats, setChats] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(initialUserId ? Number(initialUserId) : null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  const loadChats = () => {
    messageApi.getAdminChats().then(res => setChats(res.data?.data || []));
  };

  const loadMessages = (uid) => {
    messageApi.getAdminMessages(uid).then(res => setMessages(res.data || []));
  };

  useEffect(() => {
    loadChats();
    const t = setInterval(loadChats, 10000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (selectedUserId) {
      loadMessages(selectedUserId);
      const t = setInterval(() => loadMessages(selectedUserId), 5000);
      return () => clearInterval(t);
    }
  }, [selectedUserId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim() || !selectedUserId) return;
    setSending(true);
    try {
      await messageApi.sendAdminMessage(selectedUserId, text.trim());
      setText('');
      loadMessages(selectedUserId);
    } catch {
      alert('Error al enviar mensaje');
    } finally {
      setSending(false);
    }
  };

  const selectedUserObj = chats.find(c => c.user?.id === selectedUserId)?.user;

  return (
    <div style={{ padding: '2rem 1.5rem', maxWidth: '1200px', margin: '0 auto', height: 'calc(100vh - 60px)', display: 'flex', flexDirection: 'column' }}>
      <div className="cd-section-header">
        <div>
          <h1 className="cd-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MessageCircle size={24} color="#2563eb" /> Soporte Privado B2B
          </h1>
          <p className="cd-section-sub">Atiende los mensajes directos de clientes y proveedores.</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '20px', flex: 1, overflow: 'hidden' }}>
        {/* Lista de Chats (Sidebar) */}
        <div style={{ width: '300px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', overflowY: 'auto' }}>
          {chats.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>
              No hay conversaciones activas.
            </div>
          ) : (
            chats.map(chat => (
              <div 
                key={chat.user.id} 
                onClick={() => setSelectedUserId(chat.user.id)}
                style={{ 
                  padding: '15px', 
                  borderBottom: '1px solid #f1f5f9', 
                  cursor: 'pointer',
                  background: selectedUserId === chat.user.id ? '#eff6ff' : '#fff',
                  borderLeft: selectedUserId === chat.user.id ? '4px solid #2563eb' : '4px solid transparent',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}
              >
                <div style={{ background: '#e2e8f0', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <User size={18} color="#64748b" />
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#0f172a', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                    {chat.user.name}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {chat.user.role === 'CLIENT' ? 'Cliente' : 'Proveedor'}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Ventana de Chat */}
        <div style={{ flex: 1, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {selectedUserId ? (
            <>
              {/* Header del Chat */}
              <div style={{ padding: '15px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ fontWeight: 600, color: '#0f172a' }}>
                  Chat con {selectedUserObj?.name || `Usuario #${selectedUserId}`}
                </div>
              </div>

              {/* Lista de Mensajes */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px', background: '#fcfcfc' }}>
                {messages.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#94a3b8', margin: 'auto', fontSize: '0.9rem' }}>
                    No hay mensajes. Empieza la conversación.
                  </div>
                ) : (
                  messages.map((m, i) => {
                    const isMine = m.senderId === user.id;
                    const showDate = i === 0 || fmtDate(messages[i-1].createdAt) !== fmtDate(m.createdAt);
                    return (
                      <div key={m.id}>
                        {showDate && <div style={{ textAlign: 'center', fontSize: '0.72rem', color: '#94a3b8', margin: '0.75rem 0' }}>{fmtDate(m.createdAt)}</div>}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start' }}>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '4px', padding: '0 4px' }}>
                            {isMine ? 'Tú (Soporte)' : m.sender.name} • {fmtTime(m.createdAt)}
                          </div>
                          <div style={{
                            background: isMine ? '#2563eb' : '#fff',
                            color: isMine ? '#fff' : '#0f172a',
                            padding: '10px 14px',
                            borderRadius: '16px',
                            borderTopRightRadius: isMine ? '4px' : '16px',
                            borderTopLeftRadius: !isMine ? '4px' : '16px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                            border: isMine ? 'none' : '1px solid #e2e8f0',
                            maxWidth: '80%',
                            fontSize: '0.9rem',
                            lineHeight: '1.4',
                            whiteSpace: 'pre-wrap'
                          }}>
                            {m.content}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <form onSubmit={handleSend} style={{ padding: '15px', borderTop: '1px solid #e2e8f0', background: '#fff', display: 'flex', gap: '10px' }}>
                <input 
                  className="cd-chat-input" 
                  placeholder="Escribe tu respuesta..." 
                  value={text} 
                  onChange={e => setText(e.target.value)} 
                  disabled={sending}
                  style={{ flex: 1, padding: '10px 14px', borderRadius: '24px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem' }}
                />
                <button 
                  type="submit" 
                  disabled={sending || !text.trim()} 
                  style={{ 
                    background: text.trim() ? '#2563eb' : '#94a3b8', 
                    color: '#fff', border: 'none', borderRadius: '50%', width: '40px', height: '40px', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: text.trim() ? 'pointer' : 'default',
                    transition: 'background 0.2s'
                  }}
                >
                  <Send size={18} style={{ marginLeft: '2px' }} />
                </button>
              </form>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', flexDirection: 'column', gap: '10px' }}>
              <MessageCircle size={48} color="#cbd5e1" />
              <p>Selecciona un usuario de la lista para ver el chat</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
