import { useState, useRef } from 'react';
import {
  X, Plus, Image as ImageIcon, ChevronDown, ChevronUp, CheckCircle,
  Package, Factory, Utensils, Scissors, Truck, FlaskConical, Zap, Hammer, ClipboardList,
  UploadCloud, Building2, Store, ShoppingBag
} from 'lucide-react';
import { supplierCatalogApi } from '../../../api/api';
import './ProductFormModal.css';

const CATEGORIES = [
  { id: 'empaques',     label: 'Empaques y Envases',      icon: <Package size={20} /> },
  { id: 'manufactura',  label: 'Manufactura Industrial',   icon: <Factory size={20} /> },
  { id: 'alimentos',    label: 'Alimentos y Bebidas',      icon: <Utensils size={20} /> },
  { id: 'textiles',     label: 'Textiles y Confección',    icon: <Scissors size={20} /> },
  { id: 'logistica',    label: 'Logística y Transporte',   icon: <Truck size={20} /> },
  { id: 'quimicos',     label: 'Químicos e Insumos',       icon: <FlaskConical size={20} /> },
  { id: 'electronica',  label: 'Electrónica y Componentes',icon: <Zap size={20} /> },
  { id: 'construccion', label: 'Construcción y Materiales',icon: <Hammer size={20} /> },
  { id: 'otros',        label: 'Otros',                    icon: <ClipboardList size={20} /> },
];

const UNITS = ['piezas','kg','gramos','litros','metros','metros²','rollos','cajas','toneladas','pares'];

export default function ProductFormModal({ initial, onClose, onSaved }) {
  const isEdit = !!initial;
  const [saving, setSaving]   = useState(false);
  const [errors, setErrors]   = useState({});
  const [tagInput, setTagInput] = useState('');
  const [openSection, setOpenSection] = useState({ basic:true, sale:true, media:true, specs:false, tags:false });
  const [isDragging, setIsDragging] = useState(false);
  const imgRef = useRef(null);

  const [form, setForm] = useState({
    name:          initial?.name          || '',
    description:   initial?.description   || '',
    categories:    initial?.categories    || ['empaques'],
    otherCategory: initial?.otherCategory || '',
    subcategory:   initial?.subcategory   || '',
    brand:         initial?.brand         || '',
    sku:           initial?.sku           || '',
    saleType:      initial?.saleType      || 'WHOLESALE',
    price:         initial?.price         || '',
    msrp:          initial?.msrp          || '',
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
    const toProcess = Array.from(files).slice(0, 8 - form.images.length);
    if (toProcess.length === 0) return;
    
    let processed = 0;
    const newImages = [];
    toProcess.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        newImages.push({ url: e.target.result, altText: file.name });
        processed++;
        if (processed === toProcess.length) {
          setForm(prev => ({ ...prev, images: [...prev.images, ...newImages] }));
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e) => { e.preventDefault(); setIsDragging(false); handleImageFiles(e.dataTransfer.files); };

  const validate = () => {
    const e = {};
    if (!form.name.trim())                      e.name  = 'El nombre es requerido.';
    if (!form.price || Number(form.price) <= 0) e.price = 'El precio debe ser mayor a 0.';
    return e;
  };

  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); document.querySelector('.pfd-modal-body').scrollTo({ top: 0, behavior: 'smooth' }); return; }
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
        specs:         {
          ...Object.fromEntries(form.specs.filter(s => s.k).map(s => [s.k, s.v])),
          _categories: form.categories,
          _otherCategory: form.otherCategory,
          _msrp: form.msrp ? Number(form.msrp) : null
        },
        category: form.categories.length > 0 ? form.categories[0] : 'general', // Fallback for the main category field
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
    <div className="pfd-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="pfd-modal">
        {/* ── Header ── */}
        <div className="pfd-modal-header">
          <div className="pfd-header-title">
            <Package size={22} className="pfd-header-icon" />
            {isEdit ? 'Editar Producto' : 'Publicar Nuevo Producto'}
          </div>
          <button className="pfd-close-btn" onClick={onClose}><X size={20} /></button>
        </div>

        {/* ── Scrollable Body ── */}
        <div className="pfd-modal-body">
          <div className="pfd-form-content">

            {/* ═══ SECCIÓN 1: Información básica ═══ */}
            <div className="pfd-section">
              <button className="pfd-sec-toggle" onClick={() => toggle('basic')}>
                <div className="pfd-sec-left">
                  <span className="pfd-sec-num">1</span>
                  <span className="pfd-sec-label">Información Básica del Producto</span>
                </div>
                {openSection.basic ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
              {openSection.basic && (
                <div className="pfd-sec-body">
                  <div className="pfd-row-2">
                    <div className="pfd-field">
                      <label className="pfd-label">Nombre del producto <span className="pfd-req">*</span></label>
                      <input className={`pfd-input${errors.name ? ' error' : ''}`} value={form.name}
                        onChange={e => { set('name', e.target.value); setErrors(er => ({...er, name:''})); }}
                        placeholder="Ej: Bolsa de polietileno con zipper" />
                      {errors.name && <span className="pfd-field-error">{errors.name}</span>}
                    </div>
                    <div className="pfd-field">
                      <label className="pfd-label">SKU / Código interno</label>
                      <input className="pfd-input" value={form.sku}
                        onChange={e => set('sku', e.target.value)} placeholder="Ej: BOL-PE-Z-50M" />
                    </div>
                  </div>

                  <div className="pfd-field">
                    <label className="pfd-label">Descripción del producto</label>
                    <textarea className="pfd-input pfd-textarea" rows={4} value={form.description}
                      onChange={e => set('description', e.target.value)}
                      placeholder="Describe el producto con detalle: materiales, dimensiones, usos..." />
                  </div>

                  <div className="pfd-field">
                    <label className="pfd-label">Categorías <span className="pfd-req">*</span></label>
                    <span className="pfd-hint" style={{ marginBottom: 8 }}>Puedes seleccionar más de una.</span>
                    <div className="pfd-cat-grid">
                      {CATEGORIES.map(c => {
                        const isSelected = form.categories.includes(c.id);
                        return (
                          <label key={c.id} className={`pfd-cat-card${isSelected ? ' selected' : ''}`}>
                            <input type="checkbox" name="categories" value={c.id}
                              checked={isSelected} 
                              onChange={(e) => {
                                if (e.target.checked) {
                                  set('categories', [...form.categories, c.id]);
                                } else {
                                  set('categories', form.categories.filter(cat => cat !== c.id));
                                }
                              }} />
                            <span className="pfd-cat-icon">{c.icon}</span>
                            <span className="pfd-cat-label">{c.label}</span>
                          </label>
                        );
                      })}
                    </div>
                    {form.categories.includes('otros') && (
                      <div className="pfd-field" style={{ marginTop: 12 }}>
                        <label className="pfd-label">Especifica otra categoría</label>
                        <input className="pfd-input" value={form.otherCategory}
                          onChange={e => set('otherCategory', e.target.value)} placeholder="Ej: Herramientas agrícolas" />
                      </div>
                    )}
                  </div>

                  <div className="pfd-row-2">
                    <div className="pfd-field">
                      <label className="pfd-label">Subcategoría</label>
                      <input className="pfd-input" value={form.subcategory}
                        onChange={e => set('subcategory', e.target.value)} placeholder="Ej: Bolsas flexibles" />
                    </div>
                    <div className="pfd-field">
                      <label className="pfd-label">Marca / Fabricante</label>
                      <input className="pfd-input" value={form.brand}
                        onChange={e => set('brand', e.target.value)} placeholder="Ej: PackMex" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ═══ SECCIÓN 2: Tipo de venta y precios ═══ */}
            <div className="pfd-section">
              <button className="pfd-sec-toggle" onClick={() => toggle('sale')}>
                <div className="pfd-sec-left">
                  <span className="pfd-sec-num">2</span>
                  <span className="pfd-sec-label">Tipo de Venta y Precios</span>
                </div>
                {openSection.sale ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
              {openSection.sale && (
                <div className="pfd-sec-body">
                  <div className="pfd-field">
                    <label className="pfd-label">Tipo de venta <span className="pfd-req">*</span></label>
                    <div className="pfd-sale-cards">
                      {[
                        { id:'WHOLESALE', icon:<Building2 size={24}/>, title:'Mayoreo (B2B)',     desc:'Venta por volumen con MOQ mínimo.' },
                        { id:'RETAIL',    icon:<Store size={24}/>,      title:'Menudeo (Retail)',  desc:'Venta unitaria sin mínimo.' },
                        { id:'BOTH',      icon:<ShoppingBag size={24}/>,title:'Ambos',             desc:'Disponible para mayoreo y menudeo.' },
                      ].map(st => (
                        <label key={st.id} className={`pfd-sale-card${form.saleType === st.id ? ' selected' : ''}`}>
                          <input type="radio" name="saleType" value={st.id}
                            checked={form.saleType === st.id} onChange={() => set('saleType', st.id)} />
                          <div className="pfd-sale-icon">{st.icon}</div>
                          <div className="pfd-sale-title">{st.title}</div>
                          <div className="pfd-sale-desc">{st.desc}</div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="pfd-row-3">
                    <div className="pfd-field">
                      <label className="pfd-label">Precio B2B (MXN) <span className="pfd-req">*</span></label>
                      <div className="pfd-input-prefix">
                        <span className="pfd-prefix">$</span>
                        <input className={`pfd-input pfd-input-with-prefix${errors.price ? ' error' : ''}`}
                          type="number" step="0.01" min="0" value={form.price}
                          onChange={e => { set('price', e.target.value); setErrors(er => ({...er, price:''})); }}
                          placeholder="0.00" />
                      </div>
                      {errors.price && <span className="pfd-field-error">{errors.price}</span>}
                    </div>
                    <div className="pfd-field">
                      <label className="pfd-label">Precio Público Sugerido (MSRP)</label>
                      <div className="pfd-input-prefix">
                        <span className="pfd-prefix">$</span>
                        <input className="pfd-input pfd-input-with-prefix"
                          type="number" step="0.01" min="0" value={form.msrp}
                          onChange={e => set('msrp', e.target.value)}
                          placeholder="0.00" />
                      </div>
                      <span className="pfd-hint" style={{ fontSize: '0.7rem' }}>Ayuda al cliente a ver su margen de ganancia</span>
                    </div>
                    <div className="pfd-field">
                      <label className="pfd-label">Unidad de medida</label>
                      <select className="pfd-input" value={form.unit} onChange={e => set('unit', e.target.value)}>
                        {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="pfd-row-3">
                    {form.saleType !== 'RETAIL' && (
                      <div className="pfd-field">
                        <label className="pfd-label">MOQ (mínimo de orden)</label>
                        <input className="pfd-input" type="number" min="1" value={form.moq}
                          onChange={e => set('moq', e.target.value)} />
                      </div>
                    )}
                    <div className="pfd-field">
                      <label className="pfd-label">Stock disponible</label>
                      <input className="pfd-input" type="number" min="0" value={form.stock}
                        onChange={e => set('stock', e.target.value)} />
                    </div>
                    <div className="pfd-field">
                      <label className="pfd-label">Lead Time (días entrega)</label>
                      <input className="pfd-input" type="number" min="1" value={form.leadTimeDays}
                        onChange={e => set('leadTimeDays', e.target.value)} />
                    </div>
                  </div>

                  {form.saleType !== 'RETAIL' && (
                    <div className="pfd-field">
                      <label className="pfd-label">Precios por volumen (escalonados)</label>
                      <span className="pfd-hint">Ofrece descuentos automáticos al aumentar la cantidad</span>
                      <div className="pfd-tier-list">
                        {form.tierPricing.map((t, i) => (
                          <div key={i} className="pfd-tier-row">
                            <span className="pfd-tier-label">Desde</span>
                            <input className="pfd-input pfd-tier-input" type="number" min="1" placeholder="Cant."
                              value={t.minQty} onChange={e => updateTier(i, 'minQty', e.target.value)} />
                            <span className="pfd-tier-label">{form.unit} →</span>
                            <div className="pfd-input-prefix" style={{ flex: 1 }}>
                              <span className="pfd-prefix">$</span>
                              <input className="pfd-input pfd-input-with-prefix" type="number" step="0.01" placeholder="Precio"
                                value={t.price} onChange={e => updateTier(i, 'price', e.target.value)} />
                            </div>
                            <span className="pfd-tier-label">MXN</span>
                            <button type="button" className="pfd-icon-del" onClick={() => removeTier(i)}><X size={14}/></button>
                          </div>
                        ))}
                      </div>
                      <button type="button" className="pfd-add-btn" onClick={addTier}>
                        <Plus size={14}/> Añadir nivel de precio
                      </button>
                    </div>
                  )}

                  <div className="pfd-field">
                    <label className="pfd-label">Estado de publicación</label>
                    <div className="pfd-status-cards">
                      {[
                        { id:'ACTIVE',   icon:<CheckCircle size={20}/>, title:'Activo',    desc:'Visible en marketplace' },
                        { id:'DRAFT',    icon:<ClipboardList size={20}/>, title:'Borrador',  desc:'Solo tú puedes verlo' },
                        { id:'INACTIVE', icon:<X size={20}/>, title:'Inactivo',  desc:'Oculto temporalmente' },
                      ].map(s => (
                        <label key={s.id} className={`pfd-status-card${form.status === s.id ? ' selected' : ''}`}>
                          <input type="radio" name="status" value={s.id}
                            checked={form.status === s.id} onChange={() => set('status', s.id)} />
                          <span className="pfd-status-icon">{s.icon}</span>
                          <div>
                            <div className="pfd-status-title">{s.title}</div>
                            <div className="pfd-status-desc">{s.desc}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ═══ SECCIÓN 3: Imágenes ═══ */}
            <div className="pfd-section">
              <button className="pfd-sec-toggle" onClick={() => toggle('media')}>
                <div className="pfd-sec-left">
                  <span className="pfd-sec-num">3</span>
                  <span className="pfd-sec-label">Imágenes del Producto</span>
                </div>
                {openSection.media ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
              {openSection.media && (
                <div className="pfd-sec-body">
                  <p className="pfd-section-desc">
                    Arrastra y suelta tus imágenes aquí. La primera imagen será la portada.
                  </p>
                  
                  <div className={`pfd-dropzone ${isDragging ? 'dragging' : ''}`}
                       onDragOver={handleDragOver}
                       onDragLeave={handleDragLeave}
                       onDrop={handleDrop}>
                    <input ref={imgRef} type="file" accept="image/*" multiple
                           onChange={e => handleImageFiles(e.target.files)} style={{ display: 'none' }} />
                    <UploadCloud size={48} className="pfd-dropzone-icon" />
                    <div className="pfd-dropzone-title">Arrastra las imágenes aquí</div>
                    <div className="pfd-dropzone-sub">o</div>
                    <button type="button" className="pfd-dropzone-btn" onClick={() => imgRef.current?.click()}>
                      Explorar archivos
                    </button>
                    <div className="pfd-dropzone-hint">Soporta PNG, JPG, WEBP (Máx. 5MB)</div>
                  </div>

                  {form.images.length > 0 && (
                    <div className="pfd-img-thumbs">
                      {form.images.map((img, i) => (
                        <div key={i} className={`pfd-img-thumb${i === 0 ? ' primary' : ''}`}>
                          <img src={img.url} alt={img.altText || ''} />
                          <button className="pfd-img-del" type="button"
                            onClick={() => set('images', form.images.filter((_, idx) => idx !== i))}>
                            <X size={12}/>
                          </button>
                          {i === 0 && <span className="pfd-thumb-label">Portada</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ═══ SECCIÓN 4: Especificaciones ═══ */}
            <div className="pfd-section">
              <button className="pfd-sec-toggle" onClick={() => toggle('specs')}>
                <div className="pfd-sec-left">
                  <span className="pfd-sec-num">4</span>
                  <span className="pfd-sec-label">Especificaciones Técnicas</span>
                </div>
                {openSection.specs ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
              {openSection.specs && (
                <div className="pfd-sec-body">
                  <p className="pfd-section-desc">Ejemplo: Material → Polietileno | Grosor → 50 micras</p>
                  {form.specs.map((s, i) => (
                    <div key={i} className="pfd-spec-row">
                      <input className="pfd-input" placeholder="Atributo (ej: Material)" value={s.k}
                        onChange={e => updateSpec(i, 'k', e.target.value)} />
                      <span className="pfd-spec-arrow">→</span>
                      <input className="pfd-input" placeholder="Valor (ej: Polietileno)" value={s.v}
                        onChange={e => updateSpec(i, 'v', e.target.value)} />
                      <button type="button" className="pfd-icon-del" onClick={() => removeSpec(i)}><X size={14}/></button>
                    </div>
                  ))}
                  <button type="button" className="pfd-add-btn" onClick={addSpec}>
                    <Plus size={14}/> Añadir especificación
                  </button>
                </div>
              )}
            </div>

            {/* ═══ SECCIÓN 5: Tags ═══ */}
            <div className="pfd-section">
              <button className="pfd-sec-toggle" onClick={() => toggle('tags')}>
                <div className="pfd-sec-left">
                  <span className="pfd-sec-num">5</span>
                  <span className="pfd-sec-label">Etiquetas de Búsqueda</span>
                </div>
                {openSection.tags ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
              {openSection.tags && (
                <div className="pfd-sec-body">
                  <p className="pfd-section-desc">Etiquetas clave separadas por enter (ej: biodegradable, kraft)</p>
                  <div className="pfd-tags-wrap">
                    {form.tags.map((t, i) => (
                      <span key={i} className="pfd-tag">
                        #{t}
                        <button type="button" onClick={() => set('tags', form.tags.filter((_, idx) => idx !== i))}><X size={10}/></button>
                      </span>
                    ))}
                  </div>
                  <div className="pfd-tag-input-row">
                    <input className="pfd-input" placeholder="Nueva etiqueta..." value={tagInput}
                      onChange={e => setTagInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }} />
                    <button type="button" className="pfd-add-btn" style={{ marginTop: 0 }} onClick={addTag}>
                      <Plus size={14}/> Añadir
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* ── Footer / Actions ── */}
        <div className="pfd-modal-footer">
          <button className="pfd-btn-cancel" onClick={onClose}>Cancelar</button>
          <div className="pfd-footer-actions">
            <button className="pfd-btn-draft" disabled={saving}
              onClick={() => { set('status', 'DRAFT'); setTimeout(handleSubmit, 100); }}>
              Guardar Borrador
            </button>
            <button className="pfd-btn-publish" disabled={saving} onClick={handleSubmit}>
              {saving ? 'Guardando...' : isEdit ? 'Guardar Cambios' : 'Publicar Producto'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
