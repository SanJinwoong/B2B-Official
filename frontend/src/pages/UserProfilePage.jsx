/**
 * UserProfilePage.jsx — /perfil
 * Perfil para CLIENT y SUPPLIER.
 * Funciones: foto de perfil con recorte, datos personales, cambio de contraseña.
 * Branding: azul #2563eb, sin morado.
 */

import { useState, useRef, useCallback } from 'react';
import { Link }                          from 'react-router-dom';
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import {
  User, Phone, Mail, KeyRound, Eye, EyeOff,
  Save, Loader2, CheckCircle2, AlertCircle,
  ShieldCheck, BadgeCheck, Camera, X, Crop,
} from 'lucide-react';
import { meApi }   from '../api/api';
import { useAuth } from '../context/AuthContext';
import './auth-pages.css';

/* ── Utilidades ──────────────────────────────────────────────────────────── */
const useReveal = () => {
  const [show, setShow] = useState(false);
  return { show, toggle: () => setShow((s) => !s) };
};

function centerAspectCrop(mediaWidth, mediaHeight, aspect) {
  return centerCrop(
    makeAspectCrop({ unit: '%', width: 80 }, aspect, mediaWidth, mediaHeight),
    mediaWidth, mediaHeight,
  );
}

async function getCroppedBlob(image, crop, scale = 1) {
  const canvas  = document.createElement('canvas');
  const scaleX  = image.naturalWidth  / image.width;
  const scaleY  = image.naturalHeight / image.height;
  const pixelRatio = window.devicePixelRatio || 1;
  const SIZE = 256;
  canvas.width  = SIZE * pixelRatio;
  canvas.height = SIZE * pixelRatio;
  const ctx = canvas.getContext('2d');
  ctx.scale(pixelRatio, pixelRatio);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(
    image,
    crop.x * scaleX, crop.y * scaleY,
    crop.width * scaleX, crop.height * scaleY,
    0, 0, SIZE, SIZE,
  );
  return new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.88));
}

/* ── Componente de feedback ──────────────────────────────────────────────── */
const Feedback = ({ type, message }) => {
  if (!message) return null;
  const ok = type === 'success';
  return (
    <div style={{
      display: 'flex', gap: '8px', alignItems: 'center',
      padding: '10px 14px', borderRadius: '8px', fontSize: '13px',
      background: ok ? 'var(--success-bg)' : 'var(--error-bg)',
      color:      ok ? 'var(--success)'    : 'var(--error)',
      border:     `1px solid ${ok ? 'var(--success)' : 'var(--error)'}`,
      opacity: 0.9, marginBottom: '14px',
    }}>
      {ok ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
      {message}
    </div>
  );
};

/* ── Campo de formulario ─────────────────────────────────────────────────── */
const Field = ({ id, label, error, children }) => (
  <div className="ap-field">
    <label htmlFor={id} className="ap-label">{label}</label>
    {children}
    {error && <span className="ap-field-error"><AlertCircle size={12} style={{ marginRight: 4 }} />{error}</span>}
  </div>
);

/* ── Modal de recorte de avatar ──────────────────────────────────────────── */
const AvatarCropModal = ({ src, onConfirm, onClose }) => {
  const imgRef                  = useRef(null);
  const [crop, setCrop]         = useState();
  const [completedCrop, setCompletedCrop] = useState();
  const [uploading, setUploading] = useState(false);

  const onImageLoad = useCallback((e) => {
    const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
    setCrop(centerAspectCrop(w, h, 1));
  }, []);

  const handleConfirm = async () => {
    if (!completedCrop || !imgRef.current) return;
    setUploading(true);
    try {
      const blob = await getCroppedBlob(imgRef.current, completedCrop);
      onConfirm(blob);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem',
    }}>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border-2)',
        borderRadius: '16px', padding: '24px', maxWidth: '480px', width: '100%',
        boxShadow: 'var(--shadow-xl)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Crop size={18} color="var(--accent)" />
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text)' }}>
              Ajustar foto de perfil
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }}
          >
            <X size={18} />
          </button>
        </div>

        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
          Arrastra el recuadro para ajustar el área de la foto. Se recortará en círculo.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
          <ReactCrop
            crop={crop}
            onChange={(c) => setCrop(c)}
            onComplete={(c) => setCompletedCrop(c)}
            aspect={1}
            circularCrop
            minWidth={60}
          >
            <img
              ref={imgRef}
              src={src}
              onLoad={onImageLoad}
              alt="preview"
              style={{ maxHeight: '320px', maxWidth: '100%', borderRadius: '8px' }}
            />
          </ReactCrop>
        </div>

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 18px', borderRadius: '8px', border: '1px solid var(--border-2)',
              background: 'var(--surface-2)', color: 'var(--text-muted)',
              fontSize: '13px', fontWeight: 600, cursor: 'pointer',
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={uploading || !completedCrop}
            style={{
              padding: '8px 20px', borderRadius: '8px', border: 'none',
              background: 'var(--accent)', color: '#fff',
              fontSize: '13px', fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px',
              opacity: uploading ? 0.7 : 1,
            }}
          >
            {uploading ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Procesando...</> : <><Crop size={14} /> Aplicar recorte</>}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── Sección: Avatar ─────────────────────────────────────────────────────── */
const AvatarSection = ({ user, updateUser }) => {
  const fileInputRef            = useRef(null);
  const [rawSrc,  setRawSrc]    = useState(null);
  const [showCrop, setShowCrop] = useState(false);
  const [preview, setPreview]   = useState(user?.avatar || null);
  const [saving,  setSaving]    = useState(false);
  const [feedback, setFeedback] = useState(null);

  const initials = user?.name
    ? user.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setFeedback({ type: 'error', message: 'Por favor selecciona una imagen válida.' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setRawSrc(reader.result);
      setShowCrop(true);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCropConfirm = async (blob) => {
    setShowCrop(false);
    setSaving(true);
    setFeedback(null);
    try {
      // Convert blob → base64 for storage/display
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result;
        setPreview(base64);
        // Save to backend
        try {
          const { data } = await meApi.update({ avatar: base64 });
          updateUser({ avatar: data.data?.avatar ?? base64 });
          setFeedback({ type: 'success', message: 'Foto actualizada correctamente.' });
        } catch {
          setFeedback({ type: 'error', message: 'Error al guardar la foto. Intenta de nuevo.' });
          setPreview(user?.avatar || null);
        } finally {
          setSaving(false);
        }
      };
      reader.readAsDataURL(blob);
    } catch {
      setSaving(false);
    }
  };

  return (
    <>
      {showCrop && rawSrc && (
        <AvatarCropModal
          src={rawSrc}
          onConfirm={handleCropConfirm}
          onClose={() => { setShowCrop(false); setRawSrc(null); }}
        />
      )}

      <div style={{
        display: 'flex', alignItems: 'center', gap: '20px',
        padding: '24px',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '16px', marginBottom: '20px',
        flexWrap: 'wrap',
      }}>
        {/* Avatar clickeable */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{
            width: '72px', height: '72px', borderRadius: '50%',
            background: preview ? 'transparent' : 'linear-gradient(135deg, #2563eb, #0ea5e9)',
            border: '3px solid var(--accent-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '24px', fontWeight: 800, color: '#fff',
            overflow: 'hidden', boxShadow: '0 4px 14px rgba(37,99,235,0.25)',
          }}>
            {preview
              ? <img src={preview} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : initials
            }
          </div>
          {/* Botón de cámara */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={saving}
            title="Cambiar foto"
            style={{
              position: 'absolute', bottom: '-2px', right: '-2px',
              width: '26px', height: '26px', borderRadius: '50%',
              background: 'var(--accent)', border: '2px solid var(--surface)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#fff', transition: 'transform 0.15s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            {saving ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Camera size={12} />}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
        </div>

        {/* Info de usuario */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.name}
            </h1>
            {user?.role === 'SUPPLIER' && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                background: 'var(--success-bg)', color: 'var(--success)',
                border: '1px solid var(--success)', borderRadius: '20px',
                padding: '2px 10px 2px 6px', fontSize: '11px', fontWeight: 700,
              }}>
                <BadgeCheck size={12} /> Verificado
              </span>
            )}
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '3px 0 4px' }}>{user?.email}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{
              display: 'inline-block', padding: '2px 10px',
              background: 'var(--accent-light)', color: 'var(--accent)',
              border: '1px solid var(--accent-border)', borderRadius: '99px',
              fontSize: '11px', fontWeight: 700,
            }}>
              {user?.role}
            </span>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={saving}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--accent)', fontSize: '12px', fontWeight: 600, padding: 0,
                display: 'flex', alignItems: 'center', gap: '4px',
              }}
            >
              <Camera size={12} /> Cambiar foto
            </button>
          </div>
        </div>

        {/* Feedback inline */}
        {feedback && (
          <div style={{ width: '100%' }}>
            <Feedback {...feedback} />
          </div>
        )}
      </div>
    </>
  );
};

/* ── Sección: Datos personales ───────────────────────────────────────────── */
const PersonalSection = ({ user, updateUser }) => {
  const [form,     setForm]     = useState({ name: user?.name || '', phone: user?.phone || '' });
  const [errors,   setErrors]   = useState({});
  const [loading,  setLoading]  = useState(false);
  const [feedback, setFeedback] = useState(null);

  const handle = (e) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setErrors((p) => { const n = { ...p }; delete n[e.target.name]; return n; });
    setFeedback(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.name.trim() || form.name.trim().length < 2)
      errs.name = 'El nombre debe tener al menos 2 caracteres.';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      const { data } = await meApi.update({ name: form.name.trim(), phone: form.phone.trim() || null });
      updateUser({ name: data.data.name, phone: data.data.phone });
      setFeedback({ type: 'success', message: 'Datos actualizados correctamente.' });
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.response?.data?.message;
      setFeedback({ type: 'error', message: msg || 'Error al actualizar.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section style={CARD}>
      <SectionHeader icon={<User size={18} color="#fff" />} color="#2563eb" title="Datos personales" sub="Nombre y teléfono de contacto" />
      <Feedback {...(feedback || {})} />
      <form onSubmit={handleSubmit} noValidate>
        <Field id="pf-name" label="Nombre completo" error={errors.name}>
          <div className="ap-input-wrap">
            <User size={15} className="ap-input-icon" />
            <input id="pf-name" name="name" type="text" className={`ap-input has-icon ${errors.name ? 'error' : ''}`}
              value={form.name} onChange={handle} placeholder="Tu nombre completo" />
          </div>
        </Field>
        <div style={{ height: '12px' }} />
        <Field id="pf-email" label="Correo electrónico">
          <div className="ap-input-wrap">
            <Mail size={15} className="ap-input-icon" />
            <input id="pf-email" type="email" className="ap-input has-icon"
              value={user?.email || ''} disabled style={{ opacity: 0.6, cursor: 'not-allowed' }} />
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-subtle)', marginTop: '4px' }}>El correo no puede modificarse.</p>
        </Field>
        <div style={{ height: '12px' }} />
        <Field id="pf-phone" label="Teléfono / WhatsApp">
          <div className="ap-input-wrap">
            <Phone size={15} className="ap-input-icon" />
            <input id="pf-phone" name="phone" type="tel" className="ap-input has-icon"
              value={form.phone} onChange={handle} placeholder="+52 55 1234 5678" />
          </div>
        </Field>
        <button type="submit" className="ap-btn-primary" style={{ width: '100%', marginTop: '20px' }} disabled={loading}>
          {loading ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Guardando...</> : <><Save size={15} /> Guardar cambios</>}
        </button>
      </form>
    </section>
  );
};

/* ── Sección: Contraseña ─────────────────────────────────────────────────── */
const PasswordSection = () => {
  const [form,     setForm]     = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [loading,  setLoading]  = useState(false);
  const [feedback, setFeedback] = useState(null);
  const revCur = useReveal(); const revNew = useReveal(); const revCon = useReveal();

  const handle = (e) => { setForm((p) => ({ ...p, [e.target.name]: e.target.value })); setFeedback(null); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.currentPassword || !form.newPassword || !form.confirmPassword)
      return setFeedback({ type: 'error', message: 'Completa todos los campos.' });
    if (form.newPassword.length < 6)
      return setFeedback({ type: 'error', message: 'Mínimo 6 caracteres.' });
    if (form.newPassword !== form.confirmPassword)
      return setFeedback({ type: 'error', message: 'Las contraseñas no coinciden.' });
    setLoading(true);
    try {
      await meApi.changePassword(form);
      setFeedback({ type: 'success', message: 'Contraseña cambiada correctamente.' });
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.response?.data?.message;
      setFeedback({ type: 'error', message: msg || 'Error al cambiar la contraseña.' });
    } finally { setLoading(false); }
  };

  const PwField = ({ id, name, label, rev, ph }) => (
    <Field id={id} label={label}>
      <div className="ap-input-wrap">
        <KeyRound size={15} className="ap-input-icon" />
        <input id={id} name={name} type={rev.show ? 'text' : 'password'} className="ap-input has-icon"
          value={form[name]} onChange={handle} placeholder={ph} autoComplete="new-password" />
        <button type="button" className="ap-reveal-btn" onClick={rev.toggle} tabIndex={-1}>
          {rev.show ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
    </Field>
  );

  return (
    <section style={CARD}>
      <SectionHeader icon={<ShieldCheck size={18} color="#fff" />} color="#0ea5e9" title="Cambiar contraseña" sub="Confirma la actual antes de establecer una nueva" />
      <Feedback {...(feedback || {})} />
      <form onSubmit={handleSubmit} noValidate>
        <PwField id="pf-cur"  name="currentPassword" label="Contraseña actual"          rev={revCur} ph="Tu contraseña actual" />
        <div style={{ height: '12px' }} />
        <PwField id="pf-new"  name="newPassword"     label="Nueva contraseña"           rev={revNew} ph="Mínimo 6 caracteres" />
        <div style={{ height: '12px' }} />
        <PwField id="pf-con"  name="confirmPassword" label="Confirmar nueva contraseña" rev={revCon} ph="Repite la nueva contraseña" />
        <button type="submit" className="ap-btn-primary" style={{ width: '100%', marginTop: '20px' }} disabled={loading}>
          {loading ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Cambiando...</> : <><ShieldCheck size={15} /> Cambiar contraseña</>}
        </button>
      </form>
    </section>
  );
};

/* ── Helpers de UI ───────────────────────────────────────────────────────── */
const CARD = {
  background: 'var(--surface)', border: '1px solid var(--border)',
  borderRadius: '12px', padding: '24px', marginBottom: '20px',
};
const SectionHeader = ({ icon, color, title, sub }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      {icon}
    </div>
    <div>
      <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)', margin: 0 }}>{title}</h2>
      <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, marginTop: '2px' }}>{sub}</p>
    </div>
  </div>
);

/* ── Página principal ────────────────────────────────────────────────────── */
const UserProfilePage = () => {
  const { user, updateUser } = useAuth();
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', transition: 'background 0.2s' }}>
      <main style={{ maxWidth: '620px', margin: '0 auto', padding: '32px 20px' }}>
        <AvatarSection user={user} updateUser={updateUser} />
        <PersonalSection user={user} updateUser={updateUser} />
        <PasswordSection />
      </main>
    </div>
  );
};

export default UserProfilePage;
