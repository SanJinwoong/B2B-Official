import { useState, useRef } from 'react';
import { X, Plus, Trash2, Image, ChevronDown, ChevronUp } from 'lucide-react';
import { supplierCatalogApi } from '../../../api/api';

const CATEGORIES = [
  { id: 'empaques',     label: 'Empaques y Envases' },
  { id: 'manufactura',  label: 'Manufactura Industrial' },
  { id: 'alimentos',    label: 'Alimentos y Bebidas' },
  { id: 'textiles',     label: 'Textiles y Confección' },
  { id: 'logistica',    label: 'Logística y Transporte' },
  { id: 'quimicos',     label: 'Químicos e Insumos' },
  { id: 'electronica',  label: 'Electrónica y Componentes' },
  { id: 'construccion', label: 'Construcción y Materiales' },
  { id: 'otros',        label: 'Otros' },
];

const UNITS = ['piezas','kg','gramos','litros','metros','metros²','rollos','cajas','toneladas','pares'];
const SALE_TYPES = [
  { id: 'WHOLESALE', label: 'Mayoreo (B2B)', desc: 'Venta por volumen con MOQ mínimo' },
  { id: 'RETAIL',    label: 'Menudeo (Retail)', desc: 'Venta unitaria sin mínimo' },
  { id: 'BOTH',      label: 'Ambos', desc: 'Mayoreo y menudeo disponibles' },
];

function Field({ label, children, error, required }) {
  return (
    <div className="pf-field">
      <label className="pf-label">{label}{required && <span style={{ color: '#ef4444' }}> *</span>}</label>
      {children}
      {error && <span className="pf-error">{error}</span>}
    </div>
  );
}

function Section({ title, open, onToggle, children }) {
  return (
    <div className="pf-section">
      <button className="pf-section-toggle" onClick={onToggle} type="button">
        <span className="pf-section-title">{title}</span>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {open && <div className="pf-section-body">{children}</div>}
    </div>
  );
}

export default function ProductFormModal({ initial, onClose, onSaved }) {
  const isEdit = !!initial;
  const [saving, setSaving]   = useState(false);
  const [errors, setErrors]   = useState({});
  const [open, setOpen]       = useState({ basic: true, sale: true, media: true, specs: false, tags: false });
  const [tagInput, setTagInput]   = useState('');
  const imgRef = useRef(null);

  const [form, setForm] = useState({
    name:         initial?.name         || '',
    description:  initial?.description  || '',
    category:     initial?.category     || 'empaques',
    subcategory:  initial?.subcategory  || '',
    brand:        initial?.brand        || '',
    sku:          initial?.sku          || '',
    saleType:     initial?.saleType     || 'WHOLESALE',
    price:        initial?.price        || '',
    supplierPrice:initial?.supplierPrice|| '',
    moq:          initial?.moq          || 1,
    leadTimeDays: initial?.leadTimeDays || 7,
    unit:         initial?.unit         || 'piezas',
    stock:        initial?.stock        || 0,
    status:       initial?.status       || 'ACTIVE',
    tierPricing:  initial?.tierPricing  || [],
    specs:        initial?.specs        ? Object.entries(initial.specs).map(([k,v])=>({k,v})) : [],
    tags:         initial?.tags         || [],
    images:       initial?.images       || [],
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggle = (k) => setOpen(o => ({ ...o, [k]: !o[k] }));

  // ── Tier pricing ──
  const addTier = () => set('tierPricing', [...form.tierPricing, { minQty: '', price: '' }]);
  const updateTier = (i, k, v) => {
    const t = [...form.tierPricing]; t[i] = { ...t[i], [k]: v }; set('tierPricing', t);
  };
  const removeTier = (i) => set('tierPricing', form.tierPricing.filter((_, idx) => idx !== i));

  // ── Specs ──
  const addSpec = () => set('specs', [...form.specs, { k: '', v: '' }]);
  const updateSpec = (i, k, v) => {
    const s = [...form.specs]; s[i] = { ...s[i], [k]: v }; set('specs', s);
  };
  const removeSpec = (i) => set('specs', form.specs.filter((_, idx) => idx !== i));

  // ── Tags ──
  const addTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/\s+/g, '-');
    if (t && !form.tags.includes(t)) set('tags', [...form.tags, t]);
    setTagInput('');
  };

  // ── Images (base64) ──
  const handleImageFiles = (files) => {
    Array.from(files).slice(0, 8 - form.images.length).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => set('images', prev => [...prev, { url: e.target.result, altText: file.name }]);
      reader.readAsDataURL(file);
    });
  };

  // ── Submit ──
  const validate = () => {
    const e = {};
    if (!form.name.trim())                    e.name  = 'El nombre es requerido.';
    if (!form.price || Number(form.price) <= 0) e.price = 'El precio debe ser mayor a 0.';
    if (form.saleType !== 'RETAIL' && (!form.moq || Number(form.moq) < 1))
      e.moq = 'El MOQ debe ser al menos 1.';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSaving(true);
    try {
      const payload = {
        ...form,
        price:         Number(form.price),
        supplierPrice: Number(form.supplierPrice || 0),
        moq:           Number(form.moq),
        leadTimeDays:  Number(form.leadTimeDays),
        stock:         Number(form.stock),
        tierPricing: form.tierPricing.map(t => ({ minQty: Number(t.minQty), price: Number(t.price) })),
        specs: Object.fromEntries(form.specs.filter(s => s.k).map(s => [s.k, s.v])),
        images: form.images,
      };

      const r = isEdit
        ? await supplierCatalogApi.update(initial.id, payload)
        : await supplierCatalogApi.create(payload);

      onSaved(r.data.data);
    } catch(err) {
      alert(err.response?.data?.message || 'Error al guardar el producto.');
    } finally { setSaving(false); }
  };

  return (
    <div className="pf-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="pf-modal">
        {/* Header */}
        <div className="pf-modal-header">
          <h2>{isEdit ? 'Editar Producto' : 'Publicar Nuevo Producto'}</h2>
          <button className="pf-close" onClick={onClose}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="pf-form">
          <div className="pf-body">

            {/* ── Sección 1: Información básica ── */}
            <Section title="1. Información Básica" open={open.basic} onToggle={() => toggle('basic')}>
              <div className="pf-row-2">
                <Field label="Nombre del producto" required error={errors.name}>
                  <input className="pf-input" value={form.name}
                    onChange={e => { set('name', e.target.value); setErrors(er => ({...er, name: ''})); }}
                    placeholder="Ej: Bolsa de polietileno con zipper" />
                </Field>
                <Field label="SKU / Código interno">
                  <input className="pf-input" value={form.sku}
                    onChange={e => set('sku', e.target.value)} placeholder="Ej: BOL-PE-Z-50M" />
                </Field>
              </div>
              <div className="pf-row-3">
                <Field label="Categoría" required>
                  <select className="pf-input" value={form.category} onChange={e => set('category', e.target.value)}>
                    {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                </Field>
                <Field label="Subcategoría">
                  <input className="pf-input" value={form.subcategory}
                    onChange={e => set('subcategory', e.target.value)} placeholder="Ej: Bolsas flexibles" />
                </Field>
                <Field label="Marca / Fabricante">
                  <input className="pf-input" value={form.brand}
                    onChange={e => set('brand', e.target.value)} placeholder="Ej: PackMex" />
                </Field>
              </div>
              <Field label="Descripción">
                <textarea className="pf-input pf-textarea" rows={3} value={form.description}
                  onChange={e => set('description', e.target.value)}
                  placeholder="Describe el producto: materiales, uso, ventajas..." />
              </Field>
            </Section>

            {/* ── Sección 2: Tipo de venta y precios ── */}
            <Section title="2. Tipo de Venta y Precios" open={open.sale} onToggle={() => toggle('sale')}>
              <div className="pf-sale-types">
                {SALE_TYPES.map(st => (
                  <label key={st.id} className={`pf-sale-type${form.saleType === st.id ? ' selected' : ''}`}>
                    <input type="radio" name="saleType" value={st.id}
                      checked={form.saleType === st.id} onChange={() => set('saleType', st.id)} />
                    <strong>{st.label}</strong>
                    <span>{st.desc}</span>
                  </label>
                ))}
              </div>

              <div className="pf-row-3">
                <Field label="Precio unitario (MXN)" required error={errors.price}>
                  <input className="pf-input" type="number" step="0.01" min="0" value={form.price}
                    onChange={e => { set('price', e.target.value); setErrors(er => ({...er, price: ''})); }}
                    placeholder="0.00" />
                </Field>
                <Field label="Unidad de medida">
                  <select className="pf-input" value={form.unit} onChange={e => set('unit', e.target.value)}>
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </Field>
                <Field label="Lead Time (días)">
                  <input className="pf-input" type="number" min="1" value={form.leadTimeDays}
                    onChange={e => set('leadTimeDays', e.target.value)} />
                </Field>
              </div>

              <div className="pf-row-3">
                {form.saleType !== 'RETAIL' && (
                  <Field label="MOQ (cantidad mínima)" error={errors.moq}>
                    <input className="pf-input" type="number" min="1" value={form.moq}
                      onChange={e => { set('moq', e.target.value); setErrors(er => ({...er, moq: ''})); }} />
                  </Field>
                )}
                <Field label="Stock disponible">
                  <input className="pf-input" type="number" min="0" value={form.stock}
                    onChange={e => set('stock', e.target.value)} />
                </Field>
                <Field label="Costo proveedor (interno)">
                  <input className="pf-input" type="number" step="0.01" min="0" value={form.supplierPrice}
                    onChange={e => set('supplierPrice', e.target.value)} placeholder="0.00" />
                </Field>
              </div>

              {/* Precios escalonados */}
              {form.saleType !== 'RETAIL' && (
                <div className="pf-tier-section">
                  <div className="pf-tier-label">
                    Precios por volumen (escalonados)
                    <button type="button" className="pf-tier-add" onClick={addTier}><Plus size={13}/> Añadir nivel</button>
                  </div>
                  {form.tierPricing.map((t, i) => (
                    <div key={i} className="pf-tier-row">
                      <span className="pf-tier-from">Desde</span>
                      <input className="pf-input pf-tier-input" type="number" min="1" placeholder="Cantidad"
                        value={t.minQty} onChange={e => updateTier(i, 'minQty', e.target.value)} />
                      <span className="pf-tier-from">{form.unit} →</span>
                      <input className="pf-input pf-tier-input" type="number" step="0.01" min="0" placeholder="Precio"
                        value={t.price} onChange={e => updateTier(i, 'price', e.target.value)} />
                      <span className="pf-tier-from">MXN/{form.unit}</span>
                      <button type="button" className="pf-tier-del" onClick={() => removeTier(i)}><X size={12}/></button>
                    </div>
                  ))}
                </div>
              )}

              <Field label="Estado de publicación">
                <select className="pf-input" value={form.status} onChange={e => set('status', e.target.value)}>
                  <option value="ACTIVE">Activo — visible en marketplace</option>
                  <option value="DRAFT">Borrador — solo yo puedo verlo</option>
                  <option value="INACTIVE">Inactivo — oculto temporalmente</option>
                </select>
              </Field>
            </Section>

            {/* ── Sección 3: Imágenes ── */}
            <Section title="3. Imágenes del Producto" open={open.media} onToggle={() => toggle('media')}>
              <p className="pf-hint">La primera imagen es la portada. Máximo 8 imágenes.</p>
              <div className="pf-images-grid">
                {form.images.map((img, i) => (
                  <div key={i} className={`pf-img-thumb${i === 0 ? ' primary' : ''}`}>
                    <img src={img.url} alt={img.altText || ''} />
                    {i === 0 && <span className="pf-img-primary-badge">Portada</span>}
                    <button type="button" className="pf-img-del"
                      onClick={() => set('images', form.images.filter((_, idx) => idx !== i))}>
                      <X size={12} />
                    </button>
                  </div>
                ))}
                {form.images.length < 8 && (
                  <label className="pf-img-add">
                    <input ref={imgRef} type="file" accept="image/*" multiple className="pf-img-input"
                      onChange={e => handleImageFiles(e.target.files)} />
                    <Image size={24} />
                    <span>Agregar foto</span>
                  </label>
                )}
              </div>
            </Section>

            {/* ── Sección 4: Specs ── */}
            <Section title="4. Especificaciones Técnicas" open={open.specs} onToggle={() => toggle('specs')}>
              <p className="pf-hint">Ej: Material → Polietileno, Grosor → 50 micras</p>
              {form.specs.map((s, i) => (
                <div key={i} className="pf-spec-row">
                  <input className="pf-input" placeholder="Atributo" value={s.k}
                    onChange={e => updateSpec(i, 'k', e.target.value)} />
                  <span>→</span>
                  <input className="pf-input" placeholder="Valor" value={s.v}
                    onChange={e => updateSpec(i, 'v', e.target.value)} />
                  <button type="button" className="pf-tier-del" onClick={() => removeSpec(i)}><X size={12}/></button>
                </div>
              ))}
              <button type="button" className="pf-tier-add" onClick={addSpec}><Plus size={13}/> Añadir especificación</button>
            </Section>

            {/* ── Sección 5: Tags ── */}
            <Section title="5. Etiquetas de Búsqueda" open={open.tags} onToggle={() => toggle('tags')}>
              <p className="pf-hint">Ej: biodegradable, kraft, certificado-fsc. Presiona Enter para añadir.</p>
              <div className="pf-tags-wrap">
                {form.tags.map((t, i) => (
                  <span key={i} className="pf-tag">
                    {t}
                    <button type="button" onClick={() => set('tags', form.tags.filter((_, idx) => idx !== i))}><X size={10}/></button>
                  </span>
                ))}
              </div>
              <div className="pf-tag-input-row">
                <input className="pf-input" placeholder="Nueva etiqueta..." value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }} />
                <button type="button" className="pf-tier-add" onClick={addTag}><Plus size={13}/> Añadir</button>
              </div>
            </Section>

          </div>

          {/* Footer */}
          <div className="pf-footer">
            <button type="button" className="pf-btn-cancel" onClick={onClose}>Cancelar</button>
            <button type="submit" className="pf-btn-save" disabled={saving}>
              {saving ? 'Guardando...' : isEdit ? 'Guardar Cambios' : 'Publicar Producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
