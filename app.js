const app = document.querySelector('#app')
const searchForm = document.querySelector('#search-form')
const searchInput = document.querySelector('#search-input')
const toast = document.querySelector('#toast')
const categoryNames = { men: 'العطور الرجالية', women: 'العطور النسائية', unisex: 'العطور المشتركة' }
const textSources = new WeakMap()
const attributeSources = new WeakMap()
const readStorage = (key, fallback) => {
  try {
    const stored = localStorage.getItem(key)
    return stored ? JSON.parse(stored) : fallback
  } catch {
    return fallback
  }
}

let cart = readStorage('noire-cart', {})
let favorites = readStorage('noire-favorites', [])
let currentLanguage = readStorage('noire-language', 'ar')
if (!['ar', 'fr'].includes(currentLanguage)) currentLanguage = 'ar'
let search = ''
let sort = 'featured'
let priceLimit = 2000
let toastTimer

function translatePhrase(value) {
  const translations = window.noireTranslations
  let translated = value
  if (Object.prototype.hasOwnProperty.call(translations, value.trim())) {
    const leading = value.match(/^\s*/)[0]
    const trailing = value.match(/\s*$/)[0]
    return `${leading}${translations[value.trim()]}${trailing}`
  }
  Object.entries(translations)
    .filter(([source]) => source.trim().length > 1)
    .sort(([left], [right]) => right.length - left.length)
    .forEach(([source, target]) => {
      translated = translated.replace(new RegExp(source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), target)
    })
  translated = translated.replace(/(\d+)\s+parfums\b/g, (_, count) => `${count} ${count === '1' ? 'parfum' : 'parfums'}`)
  return translated
}

function localize(value) {
  return currentLanguage === 'fr' ? translatePhrase(value) : value
}

function applyTranslations(root = document) {
  document.documentElement.lang = currentLanguage
  document.documentElement.dir = currentLanguage === 'ar' ? 'rtl' : 'ltr'

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let node = walker.nextNode()
  while (node) {
    if (!textSources.has(node)) textSources.set(node, node.nodeValue)
    const source = textSources.get(node)
    node.nodeValue = currentLanguage === 'fr' ? translatePhrase(source) : source
    node = walker.nextNode()
  }

  root.querySelectorAll?.('[aria-label], [placeholder], [title], [alt]').forEach((element) => {
    const sourceAttributes = attributeSources.get(element) || {}
    for (const name of ['aria-label', 'placeholder', 'title', 'alt']) {
      if (!element.hasAttribute(name)) continue
      if (!(name in sourceAttributes)) sourceAttributes[name] = element.getAttribute(name)
      const source = sourceAttributes[name]
      element.setAttribute(name, currentLanguage === 'fr' ? translatePhrase(source) : source)
    }
    attributeSources.set(element, sourceAttributes)
  })

  const selector = document.querySelector('#language-select')
  if (selector) selector.value = currentLanguage
  document.title = currentLanguage === 'fr'
    ? 'NOIRÉ PARFUMS — Accueil'
    : 'NOIRÉ PARFUMS — Luxury Beyond Fragrance'
  const description = document.querySelector('meta[name="description"]')
  if (description) description.content = currentLanguage === 'fr'
    ? 'NOIRÉ PARFUMS — Des parfums singuliers, faits pour durer.'
    : 'NOIRÉ PARFUMS — عطور استثنائية، صُنعت لتبقى.'
}

function persist(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    showToast(localize('تعذّر حفظ التغييرات في هذا المتصفح'))
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character])
}

function updateHeader() {
  const cartCount = Object.values(cart).reduce((sum, quantity) => sum + quantity, 0)
  document.querySelector('#cart-count').textContent = cartCount || ''
  document.querySelector('#favorite-count').textContent = favorites.length || ''
}

function showToast(message, action = '') {
  const actionLabel = currentLanguage === 'fr' ? 'Voir le panier' : 'عرض الحقيبة'
  toast.innerHTML = `<span>✓</span>${escapeHtml(message)}${action ? `<a href="${action}">${actionLabel}</a>` : ''}`
  toast.classList.add('toast--visible')
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => toast.classList.remove('toast--visible'), 3000)
}

function addToCart(id, quantity = 1) {
  const product = products.find((item) => item.id === id)
  if (!product) return
  cart[id] = (cart[id] || 0) + quantity
  persist('noire-cart', cart)
  updateHeader()
  showToast(currentLanguage === 'fr'
    ? `${product.name} ajouté au panier`
    : `أُضيف ${product.name} إلى حقيبتك`, '#/cart')
}

function toggleFavorite(id) {
  favorites = favorites.includes(id) ? favorites.filter((item) => item !== id) : [...favorites, id]
  persist('noire-favorites', favorites)
  updateHeader()
  render()
}

function productCard(product) {
  const favorite = favorites.includes(product.id)
  return `<article class="product-card">
    <div class="product-card__image-wrap">
      <a href="#/product/${product.id}" class="product-card__image"><img src="${product.image}" alt="${product.name}" loading="lazy" /></a>
      ${product.badge ? `<span class="product-badge">${product.badge}</span>` : ''}
      <button type="button" class="favorite-toggle${favorite ? ' is-favorite' : ''}" aria-label="${favorite ? 'إزالة من المفضلة' : 'أضف إلى المفضلة'}" data-action="favorite" data-id="${product.id}">${favorite ? '♥' : '♡'}</button>
    </div>
    <div class="product-card__meta"><span>${product.categoryLabel} · ${product.size}</span><span class="product-rating">★★★★★</span></div>
    <a href="#/product/${product.id}" class="product-card__title">${product.name}</a>
    <p class="product-card__subtitle">${product.subtitle}</p>
    <div class="product-card__notes">${product.notes.slice(0, 2).map((note) => `<span>${note}</span>`).join('')}</div>
    <div class="product-card__price">${formatPrice(product.price)}</div>
    <div class="product-card__actions"><a href="#/product/${product.id}" class="product-details-link">تفاصيل العطر <span>←</span></a><button type="button" class="quick-add" data-action="add" data-id="${product.id}">أضف إلى السلة <span>＋</span></button></div>
  </article>`
}

function productGrid(items) {
  if (!items.length) return '<div class="empty-state"><span>✦</span><h3>لم نعثر على ما تبحث عنه</h3><p>جرّب كلمة أخرى أو أزل بعض الفلاتر.</p></div>'
  return `<div class="product-grid">${items.map(productCard).join('')}</div>`
}

function sectionHeading(eyebrow, title, description = '', link = '', href = '#/products') {
  return `<div class="section-heading"><div><span class="eyebrow">${eyebrow}</span><h2>${title}</h2>${description ? `<p>${description}</p>` : ''}</div>${link ? `<a class="text-link" href="${href}">${link}<span>←</span></a>` : ''}</div>`
}

function homePage() {
  return `<main>
    <section class="hero">
      <img class="hero__image" src="IMG-20261110-WA0001.jpg" alt="زجاجة عطر NOIRÉ بإضاءة ذهبية على خلفية سوداء" />
      <div class="hero__veil"></div>
      <div class="hero__content"><span class="eyebrow eyebrow--gold">NOIRÉ PARFUMS · MAISON DE PARFUM</span><h1>ليس عطراً<br /><em>فحسب.</em> بل أثر.</h1><p>تركيبات استثنائية تحتفي بالفخامة الهادئة<br />وتترك حكاية على البشرة.</p><a class="button button--gold" href="#/products">اكتشف المجموعة <span>←</span></a><div class="hero__signature">LUXURY BEYOND FRAGRANCE <span>✦</span></div></div>
      <div class="hero__index">01 <span>/</span> 03</div><div class="hero__vertical">EAU DE PARFUM · CASABLANCA</div>
    </section>
    <section class="promise-strip"><div><span>✧</span><p><strong>تركيبات راقية</strong><small>مكونات منتقاة بعناية</small></p></div><div><span>◈</span><p><strong>تغليف استثنائي</strong><small>تفاصيل تليق بك</small></p></div><div><span>⌖</span><p><strong>صُنع في المغرب</strong><small>بروح عالمية وأصل محلي</small></p></div><div><span>♧</span><p><strong>توصيل مجاني</strong><small>للطلبات فوق 900 درهم</small></p></div></section>
    <section class="categories section-shell">${sectionHeading('اكتشف عالمك', 'لكل شخصية حكاية', 'اعثر على الرائحة التي تشبهك، وتبقى معك.')}
      <div class="category-grid">
        <a class="category-tile category-tile--men" href="#/category/men"><img src="${products[0].image}" alt="عطر رجالي من NOIRÉ" loading="lazy" /><span class="category-tile__number">01 / COLLECTION</span><span class="category-tile__copy"><small>قوة في هدوء</small><strong>العطور الرجالية</strong><i>اكتشف المجموعة ←</i></span></a>
        <a class="category-tile category-tile--women" href="#/category/women"><img src="${products[1].image}" alt="عطر نسائي من NOIRÉ" loading="lazy" /><span class="category-tile__number">02 / COLLECTION</span><span class="category-tile__copy"><small>أناقة من الداخل</small><strong>العطور النسائية</strong><i>اكتشف المجموعة ←</i></span></a>
        <a class="category-tile category-tile--unisex" href="#/category/unisex"><img src="${products[2].image}" alt="عطر مشترك من NOIRÉ" loading="lazy" /><span class="category-tile__number">03 / COLLECTION</span><span class="category-tile__copy"><small>خارج كل تصنيف</small><strong>عطور مشتركة</strong><i>اكتشف المجموعة ←</i></span></a>
      </div>
    </section>
    <section class="featured section-shell section-shell--tinted">${sectionHeading('مختارة لك', 'توقيعات لا تُنسى', 'الأكثر طلباً، والأقرب إلى القلب.', 'تسوق كل العطور')} ${productGrid(products.slice(0, 3))}</section>
    <section class="story-band"><div class="story-band__image"><img src="${products[5].image}" alt="تفاصيل صناعة عطر فاخر" loading="lazy" /><span>CASABLANCA · MOROCCO</span></div><div class="story-band__copy"><span class="eyebrow">حكاية تبدأ من هنا</span><h2>من ذاكرة المكان،<br />إلى أثرٍ <em>لا يزول.</em></h2><p>في NOIRÉ، نؤمن أن العطر لغة أخرى للهوية. نستلهم من دفء المغرب، وثراء تفاصيله، ونصوغ كل تركيبة لتكون أكثر من رائحة؛ لتكون ذكرى تُعاش.</p><a class="text-link" href="#/about">اقرأ حكايتنا <span>←</span></a><div class="story-stamp">N<span>✦</span></div></div></section>
    <section class="new-arrivals section-shell">${sectionHeading('وصل حديثاً', 'فصل جديد من الحكاية', 'إصدارات جديدة تستحق أن تُكتشف.', 'اكتشف الجديد')} ${productGrid(products.slice(3))}</section>
    <section class="testimonial"><span class="eyebrow eyebrow--gold">كلمات تبقى</span><div class="testimonial__stars">★★★★★</div><blockquote>“رائحة مختلفة تماماً، هادئة لكنها تترك حضوراً لا تخطئه. حتى التغليف يشعرني أنني أفتح هدية خاصة.”</blockquote><div class="testimonial__byline"><span class="testimonial__avatar">س</span><span><strong>سلمى العلوي</strong><small>عميلة وفية · الدار البيضاء</small></span></div><div class="testimonial__counter">01 <i>—</i> 03</div></section>
  </main>`
}

function catalogPage(category = '') {
  let items = products.filter((product) => (!category || product.category === category) && product.price <= priceLimit)
  const query = search.trim().toLocaleLowerCase()
  if (query) items = items.filter((product) => `${product.name} ${localize(product.subtitle)} ${localize(product.categoryLabel)} ${product.notes.map(localize).join(' ')}`.toLocaleLowerCase().includes(query))
  if (sort === 'low') items.sort((a, b) => a.price - b.price)
  if (sort === 'high') items.sort((a, b) => b.price - a.price)
  const title = categoryNames[category] || 'كل العطور'
  return `<main class="catalog-page"><div class="page-intro"><span class="eyebrow">NOIRÉ PARFUMS · COLLECTION</span><h1>${title}</h1><p>كل عطر حكاية. اختر الحكاية التي تشبهك.</p><div class="breadcrumbs"><a href="#/">الرئيسية</a><span>／</span><span>${title}</span></div></div>
    <div class="catalog-toolbar"><div class="catalog-toolbar__count"><span>${items.length} عطور</span><span class="catalog-toolbar__currency">الأسعار بالدرهم المغربي (MAD)</span></div><div class="catalog-toolbar__controls"><button type="button" class="filter-toggle" data-action="filter-toggle">☷ تصفية</button><label class="catalog-sort"><span>الترتيب</span><select id="sort-select"><option value="featured" ${sort === 'featured' ? 'selected' : ''}>مقترح لك</option><option value="low" ${sort === 'low' ? 'selected' : ''}>السعر: الأقل أولاً</option><option value="high" ${sort === 'high' ? 'selected' : ''}>السعر: الأعلى أولاً</option></select></label></div></div>
    <div class="catalog-layout"><aside class="filter-panel" id="filter-panel" hidden><h3>تصفية المنتجات</h3><label>الفئة<select id="category-select"><option value="" ${!category ? 'selected' : ''}>كل العطور</option><option value="men" ${category === 'men' ? 'selected' : ''}>رجالي</option><option value="women" ${category === 'women' ? 'selected' : ''}>نسائي</option><option value="unisex" ${category === 'unisex' ? 'selected' : ''}>مشترك</option></select></label><label>أقصى سعر <strong>${formatPrice(priceLimit)}</strong><input id="price-range" type="range" min="1000" max="2000" step="50" value="${priceLimit}" /></label><button class="text-link" type="button" data-action="reset-filter">إعادة ضبط <span>↻</span></button></aside><div class="catalog-results">${productGrid(items)}</div></div></main>`
}

function productPage(id) {
  const product = products.find((item) => item.id === id)
  if (!product) return notFound()
  return `<main class="detail-page"><div class="breadcrumbs"><a href="#/">الرئيسية</a><span>／</span><a href="#/products">العطور</a><span>／</span><span>${product.name}</span></div>
    <div class="detail-layout"><div class="detail-image"><img src="${product.image}" alt="${product.name}" /><span class="detail-image__mark">NOIRÉ · PARFUMS</span></div><div class="detail-copy"><span class="eyebrow">${product.categoryLabel} · EAU DE PARFUM</span><h1>${product.name}</h1><p class="detail-subtitle">${product.subtitle}</p><div class="detail-rating">★★★★★ <span>(${product.badge ? '24' : '18'} تقييم)</span></div><div class="detail-price">${formatPrice(product.price)} <small>شامل الضريبة</small></div><p class="detail-description">${product.description}</p><div class="notes-list"><span>مكونات العطر</span>${product.notes.map((note) => `<i>${note}</i>`).join('')}</div><div class="detail-size"><span>الحجم</span><button type="button" class="size-option">${product.size}</button></div><div class="detail-purchase"><div class="quantity-control"><button type="button" data-action="quantity-minus">−</button><span id="detail-quantity">1</span><button type="button" data-action="quantity-plus">+</button></div><button class="button button--dark" type="button" data-action="detail-add" data-id="${product.id}">أضف إلى الحقيبة · ${formatPrice(product.price)}</button></div><button class="detail-favorite" type="button" data-action="favorite" data-id="${product.id}">${favorites.includes(product.id) ? '♥ أُضيف إلى المفضلة' : '♡ أضف إلى المفضلة'}</button><div class="delivery-note">✧ توصيل مجاني للطلبات فوق 900 درهم · تغليف فاخر مجاني</div></div></div></main>`
}

function cartPage() {
  const entries = Object.entries(cart).map(([id, quantity]) => ({ product: products.find((item) => item.id === id), quantity })).filter((item) => item.product)
  const subtotal = entries.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  const shipping = subtotal === 0 || subtotal >= 900 ? 0 : 50
  if (!entries.length) return `<main class="cart-page"><div class="page-intro page-intro--compact"><span class="eyebrow">سلة NOIRÉ</span><h1>اختياراتك الجميلة</h1><p>مساحة تنتظر عطرك القادم.</p></div><div class="empty-state cart-empty"><span>♧</span><h3>حقيبتك فارغة حالياً</h3><p>دع عطرك القادم يجد طريقه إليك.</p><a class="button button--dark" href="#/products">اكتشف العطور <span>←</span></a></div></main>`
  return `<main class="cart-page"><div class="page-intro page-intro--compact"><span class="eyebrow">سلة NOIRÉ</span><h1>اختياراتك الجميلة</h1><p>خطوة واحدة تفصلك عن رائحتك الجديدة.</p></div><div class="cart-layout"><div class="cart-items">${entries.map(({ product, quantity }) => `<article class="cart-item"><a href="#/product/${product.id}" class="cart-item__image"><img src="${product.image}" alt="${product.name}" /></a><div class="cart-item__info"><a href="#/product/${product.id}"><h2>${product.name}</h2></a><p>${product.categoryLabel} · ${product.size}</p><div class="quantity-control"><button type="button" data-action="cart-minus" data-id="${product.id}">−</button><span>${quantity}</span><button type="button" data-action="cart-plus" data-id="${product.id}">+</button></div></div><div class="cart-item__end"><strong>${formatPrice(product.price * quantity)}</strong><button type="button" data-action="remove" data-id="${product.id}">حذف</button></div></article>`).join('')}</div><aside class="order-summary"><h2>ملخص الطلب</h2><div><span>المجموع الفرعي</span><strong>${formatPrice(subtotal)}</strong></div><div><span>التوصيل</span><strong>${shipping ? formatPrice(shipping) : 'مجاناً'}</strong></div><div class="order-summary__total"><span>الإجمالي</span><strong>${formatPrice(subtotal + shipping)}</strong></div><a class="button button--dark" href="#/checkout">إتمام الطلب <span>←</span></a><p>✧ تغليف فاخر مجاني مع كل طلب</p></aside></div></main>`
}

function checkoutPage() {
  const entries = Object.entries(cart).map(([id, quantity]) => ({ product: products.find((item) => item.id === id), quantity })).filter((item) => item.product)
  const total = entries.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  if (!entries.length) return '<main class="empty-state cart-empty"><span>✧</span><h3>لا توجد منتجات لإتمام الطلب</h3><a class="button button--dark" href="#/products">اكتشف العطور</a></main>'
  return `<main class="checkout-page"><div class="page-intro page-intro--compact"><span class="eyebrow">الخطوة الأخيرة</span><h1>إتمام الطلب</h1><p>أدخل تفاصيل التوصيل، وسنتولى الباقي.</p></div><form class="checkout-layout" id="checkout-form"><div class="checkout-form"><h2>تفاصيل التوصيل</h2><div class="form-grid"><label>الاسم الكامل<input required autocomplete="name" placeholder="الاسم كما تحب أن نناديك" /></label><label>رقم الهاتف<input required type="tel" autocomplete="tel" placeholder="+212 6 00 00 00 00" /></label><label class="form-full">البريد الإلكتروني<input required type="email" autocomplete="email" placeholder="name@example.com" /></label><label class="form-full">العنوان<input required autocomplete="street-address" placeholder="الشارع، الحي، المدينة" /></label><label>المدينة<input required autocomplete="address-level2" placeholder="الدار البيضاء" /></label><label>ملاحظات (اختياري)<input placeholder="أي تفاصيل إضافية" /></label></div><h2 class="payment-title">طريقة الدفع</h2><label class="payment-option"><input type="radio" name="payment" checked /> الدفع نقداً عند الاستلام <span>الأكثر اختياراً</span></label></div><aside class="order-summary"><h2>طلبك</h2>${entries.map(({ product, quantity }) => `<div><span>${product.name} × ${quantity}</span><strong>${formatPrice(product.price * quantity)}</strong></div>`).join('')}<div class="order-summary__total"><span>الإجمالي</span><strong>${formatPrice(total)}</strong></div><button class="button button--dark" type="submit">تأكيد الطلب <span>←</span></button><p>طلب تجريبي للواجهة فقط — لا يتم تحصيل أي مبلغ.</p></aside></form></main>`
}

function favoritesPage() {
  return `<main class="catalog-page favorites-page"><div class="page-intro"><span class="eyebrow">اختياراتك الخاصة</span><h1>قائمة المفضلة</h1><p>العطور التي تركت أثراً لديك.</p></div>${productGrid(products.filter((product) => favorites.includes(product.id)))}</main>`
}

function aboutPage() {
  return `<main class="about-page">
    <section class="about-hero">
      <img src="${products[5].image}" alt="عطر يشبه المكان، ويعبّر عنك." />
      <div><span class="eyebrow eyebrow--gold">MAISON NOIRÉ · CASABLANCA</span><h1>من الدار البيضاء،<br /><em>إلى العالم.</em></h1><p>LUXURY BEYOND FRAGRANCE</p></div>
      <span class="about-hero__index">MAISON DE PARFUM · MAROC</span>
    </section>
    <section class="about-manifesto">
      <span class="eyebrow">حكاية NOIRÉ</span>
      <h2>لكل حكاية أصل.<br /><em>حكايتنا تبدأ من هنا.</em></h2>
      <p>جذور مغربية، ورؤية عطرية معاصرة.</p>
    </section>
    <section class="about-origin">
      <div class="about-origin__image"><img src="${products[2].image}" alt="تفاصيل صناعة عطر فاخر" loading="lazy" /><span>CASABLANCA · MOROCCO</span></div>
      <div class="about-origin__copy"><span class="eyebrow">مصدر إلهامنا</span><h2>روح المغرب<br /><em>في كل تفصيل.</em></h2><p>في الأسواق العتيقة، تتجاور الأخشاب والتوابل والزهور في مشهد لا يشبه سواه. من هذه الذاكرة الحية، ومن ضوء الدار البيضاء، نستمد إحساسنا بالرائحة ونحوّله إلى عطور تحمل روح المكان دون أن تتوقف عند حدوده.</p><p>كل عطر يبدأ باختيارٍ مقصود، ثم يتشكل طبقةً بعد طبقة، حتى يصبح توقيعاً شخصياً يرافقك ويترك أثراً يشبهك.</p><a class="text-link" href="#/products">اكتشف عطور NOIRÉ <span>←</span></a></div>
    </section>
    <section class="about-beliefs"><div><span class="eyebrow eyebrow--gold">ما نؤمن به</span><h2>الفخامة في المعنى،<br /><em>لا في المبالغة.</em></h2><a class="button button--gold" href="#/contact">تواصل معنا <span>←</span></a></div><div class="about-values">
      <article><span>01</span><h3>أصل صادق</h3><p>نستلهم من المغرب ونحتفي بتفاصيله، مع فضول دائم تجاه العالم.</p></article>
      <article><span>02</span><h3>اختيار واعٍ</h3><p>نعتني بانتقاء المكونات وبكل تفصيل يصل إلى يديك.</p></article>
      <article><span>03</span><h3>أثر شخصي</h3><p>نصنع عطراً يرافق حضورك، ويصبح جزءاً من ذاكرتك.</p></article>
    </div></section>
  </main>`
}

function contactPage() {
  return `<main class="contact-page"><div class="page-intro"><span class="eyebrow">نحن هنا من أجلك</span><h1>دعنا نتحدث.</h1><p>يسعدنا أن نكون جزءاً من حكايتك.</p></div><div class="contact-layout"><div class="contact-details"><h2>تواصل مع NOIRÉ</h2><p>سواء كان لديك سؤال حول عطر، أو تحتاج إلى مساعدة مع طلبك، فريقنا قريب منك.</p><a class="contact-detail-link" href="tel:+212724698641"><i class="fa-solid fa-phone" aria-hidden="true"></i><span dir="ltr">0724-698641</span></a><a class="contact-detail-link" href="mailto:noire.parfums@gmail.com"><i class="fa-regular fa-envelope" aria-hidden="true"></i><span dir="ltr">noire.parfums@gmail.com</span></a><span>الدار البيضاء، المملكة المغربية</span><div class="contact-socials" aria-label="تواصل معنا على الشبكات الاجتماعية"><a href="https://www.instagram.com/abdeallah.9?srtk=Zmp0YzF1dGR4bHkz" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><i class="fa-brands fa-instagram" aria-hidden="true"></i><span>Instagram</span></a><a href="https://wa.me/212724698641" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"><i class="fa-brands fa-whatsapp" aria-hidden="true"></i><span>WhatsApp</span></a></div><small>LUXURY BEYOND FRAGRANCE</small></div><form class="contact-form" id="contact-form"><label>اسمك<input required placeholder="الاسم الكامل" /></label><label>بريدك الإلكتروني<input required type="email" placeholder="name@example.com" /></label><label>موضوع الرسالة<select><option>استفسار عن منتج</option><option>متابعة طلب</option><option>اقتراح أو ملاحظة</option><option>أخرى</option></select></label><label>رسالتك<textarea required rows="5" placeholder="أخبرنا كيف يمكننا مساعدتك..."></textarea></label><button class="button button--dark" type="submit">أرسل رسالتك <span>←</span></button></form></div></main>`
}

function notFound() {
  return '<main class="empty-state cart-empty"><span>✦</span><h3>هذه الصفحة تبحث عن طريقها</h3><a class="button button--dark" href="#/">العودة للرئيسية</a></main>'
}

function render() {
  const path = location.hash.replace(/^#/, '') || '/'
  const segments = path.split('/').filter(Boolean)
  const page = segments[0]
  if (!page) app.innerHTML = homePage()
  else if (page === 'products') app.innerHTML = catalogPage()
  else if (page === 'category') app.innerHTML = catalogPage(categoryNames[segments[1]] ? segments[1] : '')
  else if (page === 'product') app.innerHTML = productPage(segments[1])
  else if (page === 'cart') app.innerHTML = cartPage()
  else if (page === 'checkout') app.innerHTML = checkoutPage()
  else if (page === 'favorites') app.innerHTML = favoritesPage()
  else if (page === 'about') app.innerHTML = aboutPage()
  else if (page === 'contact') app.innerHTML = contactPage()
  else app.innerHTML = notFound()
  document.querySelectorAll('.main-nav a').forEach((link) => {
    const linkPath = link.getAttribute('href').replace(/^#/, '')
    const active = linkPath === path
      || (path.startsWith('/category/') && linkPath === '/products')
      || (path.startsWith('/product/') && linkPath === '/products')
    link.classList.toggle('is-active', active)
  })
  document.body.classList.remove('menu-open')
  window.scrollTo(0, 0)
  updateHeader()
  applyTranslations()
}

function setQuantity(id, next) {
  if (next < 1) delete cart[id]
  else cart[id] = next
  persist('noire-cart', cart)
  render()
}

document.addEventListener('click', (event) => {
  const actionButton = event.target.closest('[data-action]')
  if (!actionButton) return
  const { action, id } = actionButton.dataset
  if (action === 'add') addToCart(id)
  if (action === 'favorite') toggleFavorite(id)
  if (action === 'search-toggle') {
    searchForm.hidden = !searchForm.hidden
    if (!searchForm.hidden) searchInput.focus()
  }
  if (action === 'menu') document.body.classList.toggle('menu-open')
  if (action === 'top') window.scrollTo({ top: 0, behavior: 'smooth' })
  if (action === 'filter-toggle') document.querySelector('#filter-panel').hidden = !document.querySelector('#filter-panel').hidden
  if (action === 'reset-filter') {
    priceLimit = 2000
    sort = 'featured'
    render()
    document.querySelector('#filter-panel').hidden = false
  }
  if (action === 'cart-minus' || action === 'cart-plus') setQuantity(id, (cart[id] || 1) + (action === 'cart-minus' ? -1 : 1))
  if (action === 'remove') {
    delete cart[id]
    persist('noire-cart', cart)
    render()
  }
  if (action === 'quantity-minus' || action === 'quantity-plus') {
    const amount = document.querySelector('#detail-quantity')
    amount.textContent = Math.max(1, Number(amount.textContent) + (action === 'quantity-minus' ? -1 : 1))
  }
  if (action === 'detail-add') addToCart(id, Number(document.querySelector('#detail-quantity').textContent))
})

document.addEventListener('change', (event) => {
  if (event.target.id === 'language-select') {
    currentLanguage = event.target.value
    search = ''
    persist('noire-language', currentLanguage)
    render()
  }
  if (event.target.id === 'category-select') {
    location.hash = event.target.value ? `#/category/${event.target.value}` : '#/products'
  }
  if (event.target.id === 'sort-select') {
    sort = event.target.value
    render()
  }
  if (event.target.id === 'price-range') {
    priceLimit = Number(event.target.value)
    render()
    document.querySelector('#filter-panel').hidden = false
  }
})

document.addEventListener('input', (event) => {
  if (event.target === searchInput) search = event.target.value
})

searchForm.addEventListener('submit', (event) => {
  event.preventDefault()
  search = searchInput.value
  searchForm.hidden = true
  if (/^#\/(?:products|category\/)/.test(location.hash)) render()
  else location.hash = '#/products'
})

document.addEventListener('submit', (event) => {
  if (event.target.id === 'newsletter-form') {
    event.preventDefault()
    document.querySelector('#newsletter-success').hidden = false
    event.target.reset()
  }
  if (event.target.id === 'checkout-form') {
    event.preventDefault()
    cart = {}
    persist('noire-cart', cart)
    updateHeader()
    app.innerHTML = '<main class="checkout-success"><span>✦</span><span class="eyebrow">شكراً لاختيارك NOIRÉ</span><h1>بدأت حكاية جديدة.</h1><p>تم تسجيل طلبك التجريبي بنجاح. سنكون على تواصل معك قريباً لتأكيد التفاصيل.</p><a class="button button--dark" href="#/products">العودة إلى المتجر <span>←</span></a></main>'
    applyTranslations()
    window.scrollTo(0, 0)
  }
  if (event.target.id === 'contact-form') {
    event.preventDefault()
    event.target.outerHTML = '<div class="contact-sent"><span>✦</span><h2>وصلتنا رسالتك.</h2><p>شكراً لتواصلك معنا. سنعود إليك قريباً.</p></div>'
    applyTranslations()
  }
})

window.addEventListener('hashchange', render)
window.addEventListener('scroll', () => document.querySelector('.back-top').classList.toggle('back-top--visible', window.scrollY > 500))
render()
