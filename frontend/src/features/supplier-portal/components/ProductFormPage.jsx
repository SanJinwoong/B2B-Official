import { useState, useRef } from 'react';
import { ArrowLeft, Plus, X, Image, ChevronDown, ChevronUp, CheckCircle } from 'lucide-react';
import { supplierCatalogApi } from '../../../api/api';
import './ProductFormPage.css';

const CATEGORIES = [
  { id: 'empaques',     label: 'Empaques y Envases',      icon: '📦' },
  { id: 'manufactura',  label: 'Manufactura Industrial',   icon: '🏭' },
  { id: 'alimentos',    label: 'Alimentos y Bebidas',      icon: '🍽️' },
  { id: 'textiles',     label: 'Textiles y Confección',    icon: '🧵' },
  { id: 'logistica',    label: 'Logística y Transporte',   icon: '🚚' },
  { id: 'quimicos',     label: 'Químicos e Insumos',       icon: '🧪' },
  { id: 'electronica',  label: 'Electrónica y Componentes',icon: '⚡' },
  { id: 'construccion', label: 'Construcción y Materiales',icon: '🏗️' },
  { id: 'otros',        label: 'Otros',                    icon: '📋' },
];

const UNITS = ['piezas','kg','gramos','litros','metros','metros²','rollos','cajas','toneladas','pares'];

export default function ProductFormPage({ initial, onClose, onSaved }) {
  const isEdit = !!initial;
  const [saving, setSaving]   = useState(false);
  const [errors, setErrors]   = useState({});
  const [tagInput, setTagInput] = useState('');
  const [openSection, setOpenSection] = useState({ basic:true, sale:true, media:true, specs:false, tags:false });
  const imgRef = useRef(null);

  const [form, setForm] = useState({
    name:          initial?.name          || '',
    description:   initial?.description   || '',
    category:      initial?.category      || 'empaques',
    subcategory:   initial?.subcategory   || '',
    brand:         initial?.brand         || '',
    sku:           initial?.sku           || '',
    saleType:      initial?.saleType      || 'WHOLESALE',
    price:         initial?.price         || '',
    supplierPrice: initial?.supplierPrice || '',
    moq:           initial?.moq           || 1,
    leadTimeDays:  initial?.leadTimeDays  || 7,
    unit:          initial?.unit          || 'piezas',
    stock:         initial?.stock         || 0,
    status:        initial?.status        || 'ACTIVE',
    tierPricing:   initial?.tierPricing   || [],
    specs:         initial?.specs ? Object.entries(initial.specs).map(([k,v]) => ({k,v})) : [],
    tags:          initial?.tags          || [],
    images:        initial?.images        || [],
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggle = (k) => setOpenSection(o => ({ ...o, [k]: !o[k] }));

  // Tier pricing
  const addTier = () => set('tierPricing', [...form.tierPricing, { minQty: '', price: '' }]);
  const updateTier = (i, k, v) => { const t = [...form.tierPricing]; t[i] = { ...t[i], [k]: v }; set('tierPricing', t); };
  const removeTier = (i) => set('tierPricing', form.tierPricing.filter((_, idx) => idx !== i));

  // Specs
  const addSpec = () => set('specs', [...form.specs, { k: '', v: '' }]);
  const updateSpec = (i, k, v) => { const s = [...form.specs]; s[i] = { ...s[i], [k]: v }; set('specs', s); };
  const removeSpec = (i) => set('specs', form.specs.filter((_, idx) => idx !== i));

  // Tags
  const addTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/\s+/g, '-');
    if (t && !form.tags.includes(t)) set('tags', [...form.tags, t]);
    setTagInput('');
  };

  // Images (base64)
  const handleImageFiles = (files) => {
    Array.from(files).slice(0, 8 - form.images.length).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => set('images', prev => [...prev, { url: e.target.result, altText: file.name }]);
      reader.readAsDataURL(file);
    });
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim())                      e.name  = 'El nombre es requerido.';
    if (!form.price || Number(form.price) <= 0) e.price = 'El precio debe ser mayor a 0.';
    return e;
  };

  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        price:         Number(form.price),
        supplierPrice: Number(form.supplierPrice || 0),
        moq:           Number(form.moq),
        leadTimeDays:  Number(form.leadTimeDays),
        stock:         Number(form.stock),
        tierPricing:   form.tierPricing.map(t => ({ minQty: Number(t.minQty), price: Number(t.price) })),
        specs:         Object.fromEntries(form.specs.filter(s => s.k).map(s => [s.k, s.v])),
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
    <div className="pfp-shell">
      {/* ── Sticky Header ── */}
      <div className="pfp-topbar">
        <button className="pfp-back-btn" onClick={onClose}>
          <ArrowLeft size={18} /> Volver al Catálogo
        </button>
        <div className="pfp-topbar-title">
          {isEdit ? '✏️ Editar Producto' : '📦 Publicar Nuevo Producto'}
        </div>
        <div className="pfp-topbar-actions">
          <button className="pfp-btn-draft" disabled={saving}
            onClick={() => { set('status', 'DRAFT'); setTimeout(handleSubmit, 100); }}>
            Guardar borrador
          </button>
          <button className="pfp-btn-publish" disabled={saving} onClick={handleSubmit}>
            {saving ? 'Guardando...' : isEdit ? '✓ Guardar cambios' : '🚀 Publicar producto'}
          </button>
        </div>
      </div>

      {/* ── Main layout: Left steps + Right form ── */}
      <div className="pfp-layout">

        {/* ── Step navigator (sidebar) ── */}
        <div className="pfp-steps">
          <div className="pfp-steps-title">Secciones</div>
          {[
            { id: 'basic', label: '1. Información básica',       done: !!(form.name && form.category) },
            { id: 'sale',  label: '2. Tipo de venta y precios',  done: !!(form.price && form.saleType) },
            { id: 'media', label: '3. Imágenes del producto',    done: form.images.length > 0 },
            { id: 'specs', label: '4. Especificaciones técnicas',done: form.specs.length > 0 },
            { id: 'tags',  label: '5. Etiquetas de búsqueda',    done: form.tags.length > 0 },
          ].map(s => (
            <button key={s.id}
              className={`pfp-step-item${openSection[s.id] ? ' active' : ''}`}
              onClick={() => { toggle(s.id); document.getElementById(`pfp-sec-${s.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>
              <span className={`pfp-step-dot${s.done ? ' done' : ''}`}>
                {s.done ? <CheckCircle size={14} /> : null}
              </span>
              {s.label}
            </button>
          ))}

          <div className="pfp-steps-hint">
            <strong>Tip:</strong> Agrega imágenes de alta calidad y precios por volumen para atraer más clientes B2B.
          </div>
        </div>

        {/* ── Scrollable form body ── */}
        <div className="pfp-form-body">

          {/* ═══ SECCIÓN 1: Información básica ═══ */}
          <div id="pfp-sec-basic" className="pfp-section">
            <button className="pfp-sec-toggle" onClick={() => toggle('basic')}>
              <span className="pfp-sec-num">1</span>
              <span className="pfp-sec-label">Información Básica del Producto</span>
              {openSection.basic ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
            {openSection.basic && (
              <div className="pfp-sec-body">
                {/* Nombre + SKU */}
                <div className="pfp-row-2">
                  <div className="pfp-field">
                    <label className="pfp-label">Nombre del producto <span className="pfp-req">*</span></label>
                    <input className={`pfp-input${errors.name ? ' error' : ''}`} value={form.name}
                      onChange={e => { set('name', e.target.value); setErrors(er => ({...er, name:''})); }}
                      placeholder="Ej: Bolsa de polietileno con zipper" />
                    {errors.name && <span className="pfp-field-error">{errors.name}</span>}
                  </div>
                  <div className="pfp-field">
                    <label className="pfp-label">SKU / Código interno</label>
                    <input className="pfp-input" value={form.sku}
                      onChange={e => set('sku', e.target.value)} placeholder="Ej: BOL-PE-Z-50M" />
                  </div>
                </div>

                {/* Descripción */}
                <div className="pfp-field">
                  <label className="pfp-label">Descripción del producto</label>
                  <textarea className="pfp-input pfp-textarea" rows={4} value={form.description}
                    onChange={e => set('description', e.target.value)}
                    placeholder="Describe el producto con detalle: materiales, dimensiones, usos principales, ventajas competitivas..." />
                </div>

                {/* Categoría */}
                <div className="pfp-field">
                  <label className="pfp-label">Categoría <span className="pfp-req">*</span></label>
                  <div className="pfp-cat-grid">
                    {CATEGORIES.map(c => (
                      <label key={c.id} className={`pfp-cat-card${form.category === c.id ? ' selected' : ''}`}>
                        <input type="radio" name="category" value={c.id}
                          checked={form.category === c.id} onChange={() => set('category', c.id)} />
                        <span className="pfp-cat-icon">{c.icon}</span>
                        <span className="pfp-cat-label">{c.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Subcategoría + Marca */}
                <div className="pfp-row-2">
                  <div className="pfp-field">
                    <label className="pfp-label">Subcategoría</label>
                    <input className="pfp-input" value={form.subcategory}
                      onChange={e => set('subcategory', e.target.value)} placeholder="Ej: Bolsas flexibles" />
                  </div>
                  <div className="pfp-field">
                    <label className="pfp-label">Marca / Fabricante</label>
                    <input className="pfp-input" value={form.brand}
                      onChange={e => set('brand', e.target.value)} placeholder="Ej: PackMex" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ═══ SECCIÓN 2: Tipo de venta y precios ═══ */}
          <div id="pfp-sec-sale" className="pfp-section">
            <button className="pfp-sec-toggle" onClick={() => toggle('sale')}>
              <span className="pfp-sec-num">2</span>
              <span className="pfp-sec-label">Tipo de Venta y Precios</span>
              {openSection.sale ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
            {openSection.sale && (
              <div className="pfp-sec-body">
                {/* Sale type */}
                <div className="pfp-field">
                  <label className="pfp-label">Tipo de venta <span className="pfp-req">*</span></label>
                  <div className="pfp-sale-cards">
                    {[
                      { id:'WHOLESALE', icon:'🏭', title:'Mayoreo (B2B)',     desc:'Venta por volumen con MOQ mínimo. Ideal para clientes que compran grandes cantidades.' },
                      { id:'RETAIL',    icon:'🛍️', title:'Menudeo (Retail)',  desc:'Venta unitaria sin mínimo de compra. Sin restricción de cantidad.' },
                      { id:'BOTH',      icon:'⚡', title:'Mayoreo y Menudeo', desc:'Disponible para ambos tipos de compra con precios diferenciados por volumen.' },
                    ].map(st => (
                      <label key={st.id} className={`pfp-sale-card${form.saleType === st.id ? ' selected' : ''}`}>
                        <input type="radio" name="saleType" value={st.id}
                          checked={form.saleType === st.id} onChange={() => set('saleType', st.id)} />
                        <div className="pfp-sale-icon">{st.icon}</div>
                        <div className="pfp-sale-title">{st.title}</div>
                        <div className="pfp-sale-desc">{st.desc}</div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Precios principales */}
                <div className="pfp-row-3">
                  <div className="pfp-field">
                    <label className="pfp-label">Precio unitario (MXN) <span className="pfp-req">*</span></label>
                    <div className="pfp-input-prefix">
                      <span className="pfp-prefix">$</span>
                      <input className={`pfp-input pfp-input-with-prefix${errors.price ? ' error' : ''}`}
                        type="number" step="0.01" min="0" value={form.price}
                        onChange={e => { set('price', e.target.value); setErrors(er => ({...er, price:''})); }}
                        placeholder="0.00" />
                    </div>
                    {errors.price && <span className="pfp-field-error">{errors.price}</span>}
                  </div>
                  <div className="pfp-field">
                    <label className="pfp-label">Unidad de medida</label>
                    <select className="pfp-input" value={form.unit} onChange={e => set('unit', e.target.value)}>
                      {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                  <div className="pfp-field">
                    <label className="pfp-label">Lead Time (días entrega)</label>
                    <input className="pfp-input" type="number" min="1" value={form.leadTimeDays}
                      onChange={e => set('leadTimeDays', e.target.value)} />
                  </div>
                </div>

                <div className="pfp-row-3">
                  {form.saleType !== 'RETAIL' && (
                    <div className="pfp-field">
                      <label className="pfp-label">MOQ (cantidad mínima de orden)</label>
                      <input className="pfp-input" type="number" min="1" value={form.moq}
                        onChange={e => set('moq', e.target.value)} />
                      <span className="pfp-hint">Mínimo que un cliente debe pedir</span>
                    </div>
                  )}
                  <div className="pfp-field">
                    <label className="pfp-label">Stock disponible</label>
                    <input className="pfp-input" type="number" min="0" value={form.stock}
                      onChange={e => set('stock', e.target.value)} />
                  </div>
                  <div className="pfp-field">
                    <label className="pfp-label">Costo interno (no visible)</label>
                    <div className="pfp-input-prefix">
                      <span className="pfp-prefix">$</span>
                      <input className="pfp-input pfp-input-with-prefix" type="number" step="0.01" min="0"
                        value={form.supplierPrice} onChange={e => set('supplierPrice', e.target.value)} placeholder="0.00" />
                    </div>
                    <span className="pfp-hint">Solo tú puedes ver este costo</span>
                  </div>
                </div>

                {/* Precios escalonados */}
                {form.saleType !== 'RETAIL' && (
                  <div className="pfp-field">
                    <label className="pfp-label">Precios por volumen (escalonados)</label>
                    <span className="pfp-hint">Ofrece descuentos automáticos al aumentar la cantidad — muy atractivo para clientes B2B</span>
                    <div className="pfp-tier-list">
                      {form.tierPricing.map((t, i) => (
                        <div key={i} className="pfp-tier-row">
                          <span className="pfp-tier-label">Desde</span>
                          <input className="pfp-input pfp-tier-input" type="number" min="1" placeholder="Cant."
                            value={t.minQty} onChange={e => updateTier(i, 'minQty', e.target.value)} />
                          <span className="pfp-tier-label">{form.unit} →</span>
                          <div className="pfp-input-prefix" style={{ flex: 1 }}>
                            <span className="pfp-prefix">$</span>
                            <input className="pfp-input pfp-input-with-prefix" type="number" step="0.01" placeholder="Precio"
                              value={t.price} onChange={e => updateTier(i, 'price', e.target.value)} />
                          </div>
                          <span className="pfp-tier-label">MXN/{form.unit}</span>
                          <button type="button" className="pfp-icon-del" onClick={() => removeTier(i)}><X size={14}/></button>
                        </div>
                      ))}
                    </div>
                    <button type="button" className="pfp-add-btn" onClick={addTier}>
                      <Plus size={14}/> Añadir nivel de precio
                    </button>
                  </div>
                )}

                {/* Estado publicación */}
                <div className="pfp-field">
                  <label className="pfp-label">Estado de publicación</label>
                  <div className="pfp-status-cards">
                    {[
                      { id:'ACTIVE',   icon:'✅', title:'Activo',    desc:'Visible para todos los clientes en el marketplace' },
                      { id:'DRAFT',    icon:'📝', title:'Borrador',  desc:'Solo tú puedes verlo, no aparece en el marketplace' },
                      { id:'INACTIVE', icon:'⏸️', title:'Inactivo',  desc:'Temporalmente oculto del marketplace' },
                    ].map(s => (
                      <label key={s.id} className={`pfp-status-card${form.status === s.id ? ' selected' : ''}`}>
                        <input type="radio" name="status" value={s.id}
                          checked={form.status === s.id} onChange={() => set('status', s.id)} />
                        <span>{s.icon}</span>
                        <div>
                          <strong>{s.title}</strong>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{s.desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ═══ SECCIÓN 3: Imágenes ═══ */}
          <div id="pfp-sec-media" className="pfp-section">
            <button className="pfp-sec-toggle" onClick={() => toggle('media')}>
              <span className="pfp-sec-num">3</span>
              <span className="pfp-sec-label">Imágenes del Producto</span>
              {openSection.media ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
            {openSection.media && (
              <div className="pfp-sec-body">
                <p className="pfp-section-desc">
                  La <strong>primera imagen</strong> será la portada del producto. Agrega hasta <strong>8 imágenes</strong>.
                  Usa fotos reales en buena resolución — esto aumenta significativamente la tasa de conversión.
                </p>
                <div className="pfp-images-area">
                  {/* Main/primary preview */}
                  <div className="pfp-img-main">
                    {form.images[0]
                      ? <img src={form.images[0].url} alt="Portada" className="pfp-img-main-preview" />
                      : (
                        <label className="pfp-img-upload-zone">
                          <input ref={imgRef} type="file" accept="image/*" multiple
                            onChange={e => handleImageFiles(e.target.files)} style={{ display: 'none' }} />
                          <Image size={48} strokeWidth={1} />
                          <div className="pfp-upload-title">Arrastra aquí o haz clic para subir</div>
                          <div className="pfp-upload-sub">PNG, JPG, WEBP hasta 5MB</div>
                          <div className="pfp-upload-btn-label">Seleccionar imágenes</div>
                        </label>
                      )
                    }
                    {form.images[0] && <span className="pfp-img-main-badge">📸 Portada</span>}
                  </div>

                  {/* Thumbnails */}
                  <div className="pfp-img-thumbs">
                    {form.images.map((img, i) => (
                      <div key={i} className={`pfp-img-thumb${i === 0 ? ' primary' : ''}`}>
                        <img src={img.url} alt={img.altText || ''} />
                        <button className="pfp-img-del" type="button"
                          onClick={() => set('images', form.images.filter((_, idx) => idx !== i))}>
                          <X size={12}/>
                        </button>
                        {i === 0 && <span className="pfp-thumb-label">Portada</span>}
                      </div>
                    ))}
                    {form.images.length < 8 && (
                      <label className="pfp-img-add-thumb">
                        <input type="file" accept="image/*" multiple style={{ display: 'none' }}
                          onChange={e => handleImageFiles(e.target.files)} />
                        <Plus size={20} />
                        <span>Agregar</span>
                      </label>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ═══ SECCIÓN 4: Especificaciones ═══ */}
          <div id="pfp-sec-specs" className="pfp-section">
            <button className="pfp-sec-toggle" onClick={() => toggle('specs')}>
              <span className="pfp-sec-num">4</span>
              <span className="pfp-sec-label">Especificaciones Técnicas</span>
              {openSection.specs ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
            {openSection.specs && (
              <div className="pfp-sec-body">
                <p className="pfp-section-desc">Ejemplo: Material → Polietileno | Grosor → 50 micras | Color → Transparente</p>
                {form.specs.map((s, i) => (
                  <div key={i} className="pfp-spec-row">
                    <input className="pfp-input" placeholder="Atributo (ej: Material)" value={s.k}
                      onChange={e => updateSpec(i, 'k', e.target.value)} />
                    <span className="pfp-spec-arrow">→</span>
                    <input className="pfp-input" placeholder="Valor (ej: Polietileno)" value={s.v}
                      onChange={e => updateSpec(i, 'v', e.target.value)} />
                    <button type="button" className="pfp-icon-del" onClick={() => removeSpec(i)}><X size={14}/></button>
                  </div>
                ))}
                <button type="button" className="pfp-add-btn" onClick={addSpec}>
                  <Plus size={14}/> Añadir especificación
                </button>
              </div>
            )}
          </div>

          {/* ═══ SECCIÓN 5: Tags ═══ */}
          <div id="pfp-sec-tags" className="pfp-section">
            <button className="pfp-sec-toggle" onClick={() => toggle('tags')}>
              <span className="pfp-sec-num">5</span>
              <span className="pfp-sec-label">Etiquetas de Búsqueda</span>
              {openSection.tags ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
            {openSection.tags && (
              <div className="pfp-sec-body">
                <p className="pfp-section-desc">Las etiquetas ayudan a los clientes a encontrar tu producto. Ej: biodegradable, kraft, certificado-fsc</p>
                <div className="pfp-tags-wrap">
                  {form.tags.map((t, i) => (
                    <span key={i} className="pfp-tag">
                      #{t}
                      <button type="button" onClick={() => set('tags', form.tags.filter((_, idx) => idx !== i))}><X size={10}/></button>
                    </span>
                  ))}
                </div>
                <div className="pfp-tag-input-row">
                  <input className="pfp-input" placeholder="Nueva etiqueta..." value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }} />
                  <button type="button" className="pfp-add-btn" style={{ marginTop: 0 }} onClick={addTag}>
                    <Plus size={14}/> Añadir
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Bottom CTA ── */}
          <div className="pfp-bottom-cta">
            <button className="pfp-btn-cancel" onClick={onClose}>Cancelar</button>
            <button className="pfp-btn-draft" disabled={saving}
              onClick={() => { set('status', 'DRAFT'); setTimeout(handleSubmit, 100); }}>
              Guardar como borrador
            </button>
            <button className="pfp-btn-publish" disabled={saving} onClick={handleSubmit}>
              {saving ? '⏳ Guardando...' : isEdit ? '✓ Guardar cambios' : '🚀 Publicar en Marketplace'}
            </button>
          </div>

        </div>{/* /pfp-form-body */}
      </div>{/* /pfp-layout */}
    </div>
  );
}
