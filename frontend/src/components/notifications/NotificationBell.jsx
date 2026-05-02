import { useState, useEffect, useRef } from 'react';
import { Bell, Check, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { notificationsApi } from '../../api/api';
import './NotificationBell.css';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const fetchNotifications = () => {
    notificationsApi.getUnread()
      .then(r => setNotifications(r.data?.data || []))
      .catch(console.error);
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Polling every 30s
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id, e) => {
    e.stopPropagation();
    try {
      await notificationsApi.markAsRead(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllAsRead = async (e) => {
    e.stopPropagation();
    try {
      await notificationsApi.markAllAsRead();
      setNotifications([]);
      setOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotificationClick = async (notif) => {
    try {
      await notificationsApi.markAsRead(notif.id);
      setNotifications(prev => prev.filter(n => n.id !== notif.id));
      if (notif.link) {
        navigate(notif.link);
      }
      setOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="notif-wrapper" ref={dropdownRef}>
      <button className="notif-bell-btn" onClick={() => setOpen(!open)}>
        <Bell size={18} />
        {notifications.length > 0 && <div className="notif-dot" />}
      </button>

      {open && (
        <div className="notif-dropdown">
          <div className="notif-header">
            <h4>Notificaciones</h4>
            {notifications.length > 0 && (
              <button onClick={handleMarkAllAsRead} className="notif-mark-all">
                <Check size={14} /> Marcar leídas
              </button>
            )}
          </div>
          
          <div className="notif-body">
            {notifications.length === 0 ? (
              <div className="notif-empty">No tienes notificaciones nuevas.</div>
            ) : (
              notifications.map(n => (
                <div key={n.id} className="notif-item" onClick={() => handleNotificationClick(n)}>
                  <div className="notif-item-content">
                    <h5>{n.title}</h5>
                    <p>{n.message}</p>
                    <span className="notif-time">{new Date(n.createdAt).toLocaleString('es-MX', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
