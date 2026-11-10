const products = [
  {
    id: 'sable-noir', name: 'Sable Noir', subtitle: 'ظلّ من العنبر والعود',
    category: 'men', categoryLabel: 'رجالي', price: 1450, size: '100 مل',
    notes: ['الزعفران', 'العود', 'العنبر'],
    image: 'https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=900&q=85',
    description: 'افتتاحية دافئة من الزعفران تنساب إلى قلب خشبي عميق، ثم تستقر على أثر من العنبر الأسود. عطر يترك حضوره بهدوء لا يُنسى.',
    badge: 'الأكثر مبيعاً',
  },
  {
    id: 'rose-velours', name: 'Rose Velours', subtitle: 'وردة مخملية في ضوء الصباح',
    category: 'women', categoryLabel: 'نسائي', price: 1280, size: '75 مل',
    notes: ['الورد الدمشقي', 'المسك', 'الفانيلا'],
    image: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=900&q=85',
    description: 'بتلات ورد دمشقية تلتقي بمسك ناعم ولمسة فانيلا كريمية. تركيبة أنثوية رقيقة، تشبه رسالة مكتوبة بخط اليد.',
    badge: 'اختيار المحرر',
  },
  {
    id: 'ambre-oud', name: 'Ambre Oud', subtitle: 'دفء شرقي بلمسة معاصرة',
    category: 'unisex', categoryLabel: 'مشترك', price: 1690, size: '100 مل',
    notes: ['البرغموت', 'خشب العود', 'البنزوين'],
    image: 'https://images.unsplash.com/photo-1595425970377-c9703cf48b6d?auto=format&fit=crop&w=900&q=85',
    description: 'رحلة تبدأ ببرغموت مشرق، وتتعمق في طبقات العود والبنزوين. توازن استثنائي بين نضارة المتوسط ودفء الشرق.',
    badge: 'إصدار محدود',
  },
  {
    id: 'figue-blanche', name: 'Figue Blanche', subtitle: 'هدوء أخضر، أناقة يومية',
    category: 'unisex', categoryLabel: 'مشترك', price: 1190, size: '75 مل',
    notes: ['التين', 'أوراق البنفسج', 'خشب الصندل'],
    image: 'https://images.unsplash.com/photo-1547887538-e3a2f32cb1cc?auto=format&fit=crop&w=900&q=85',
    description: 'رائحة التين الناضج وأوراقه الخضراء على قاعدة من خشب الصندل. عطر هادئ يرافق اللحظات التي تخصك وحدك.',
    badge: '',
  },
  {
    id: 'bois-de-minuit', name: 'Bois de Minuit', subtitle: 'خشب يروي حكاية الليل',
    category: 'men', categoryLabel: 'رجالي', price: 1560, size: '100 مل',
    notes: ['الفلفل الأسود', 'الأرز', 'جلد ناعم'],
    image: 'https://images.unsplash.com/photo-1615634260167-c8cdede054de?auto=format&fit=crop&w=900&q=85',
    description: 'فلفل أسود متوهج يلتقي بأخشاب الأرز العتيقة ولمسة جلدية ناعمة. توقيع عميق واثق، صُمم للسهرات الطويلة.',
    badge: 'جديد',
  },
  {
    id: 'musc-de-lune', name: 'Musc de Lune', subtitle: 'نعومة مضيئة على البشرة',
    category: 'women', categoryLabel: 'نسائي', price: 1340, size: '75 مل',
    notes: ['زهر البرتقال', 'المسك الأبيض', 'الكشمير'],
    image: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=900&q=85',
    description: 'زهر البرتقال يضيء قلباً من المسك الأبيض، فيما ينسج الكشمير دفئه حول البشرة. أثر حميم، ناعم وقريب.',
    badge: '',
  },
]

const formatPrice = (price) => `${new Intl.NumberFormat('fr-MA').format(price)} MAD`
