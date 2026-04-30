import { useEffect, useRef, useState } from 'react';
import { Send, MessageCircle } from 'lucide-react';
import { messageApi } from '../../../api/api';
import { useAuth } from '../../../context/AuthContext';

function fmtTime(d){ return new Date(d).toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'}); }
function fmtDate(d){ return new Date(d).toLocaleDateString('es-MX',{day:'numeric',month:'short'}); }

export default function ClientMessagesPage() {
  const { user } = useAuth();
  const [msgs,    setMsgs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [text,    setText]    = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  const load = () => messageApi.getMessages().then(r=>setMsgs(r.data)).finally(()=>setLoading(false));

  useEffect(() => {
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }); }, [msgs]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    try { await messageApi.send(text.trim()); setText(''); load(); }
    catch { alert('Error al enviar mensaje'); }
    finally { setSending(false); }
  };

  if (loading) return <div className="cd-empty"><p className="cd-empty-text">Cargando...</p></div>;

  return (
    <div>
      <div className="cd-section-header">
        <div>
          <h1 className="cd-section-title">Centro de Mensajes</h1>
          <p className="cd-section-sub">Comunícate directamente con tu gestor asignado.</p>
        </div>
      </div>
      <div style={{background:'#fff',border:'1px solid #e2e8f0',borderRadius:12,padding:'1.5rem',display:'flex',flexDirection:'column',height:'calc(100vh - 240px)'}}>
        <div className="cd-messages-list" style={{flex:1,overflowY:'auto',padding:'0 0 .5rem'}}>
          {msgs.length===0 && (
            <div className="cd-empty">
              <div className="cd-empty-icon"><MessageCircle size={22}/></div>
              <p className="cd-empty-text">Aún no hay mensajes. ¡Empieza la conversación!</p>
            </div>
          )}
          {msgs.map((m,i) => {
            const mine = m.senderId===user.id;
            const showDate = i===0 || fmtDate(msgs[i-1].createdAt)!==fmtDate(m.createdAt);
            return (
              <div key={m.id}>
                {showDate && <div style={{textAlign:'center',fontSize:'.72rem',color:'#94a3b8',margin:'.75rem 0'}}>{fmtDate(m.createdAt)}</div>}
                <div className={`cd-msg ${mine?'mine':'theirs'}`}>
                  {!mine && <span className="cd-msg-sender">{m.sender?.name||'Gestor'}</span>}
                  <div className="cd-msg-bubble">{m.content}</div>
                  <span className="cd-msg-time">{fmtTime(m.createdAt)}</span>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef}/>
        </div>
        <form onSubmit={handleSend} className="cd-chat-input-wrap">
          <input className="cd-chat-input" placeholder="Escribe un mensaje..." value={text} onChange={e=>setText(e.target.value)} disabled={sending}/>
          <button type="submit" className="cd-btn-primary" disabled={sending||!text.trim()} style={{padding:'.65rem 1.1rem'}}>
            <Send size={15}/>
          </button>
        </form>
      </div>
    </div>
  );
}
