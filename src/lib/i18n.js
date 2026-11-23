import { useSelector, useDispatch } from 'react-redux';
import { setLanguage } from '../Redux/languageSlice';

const translations = {
  fr: {
    // Navigation
    'nav.home': 'Accueil',
    'nav.cars': 'Nos voitures',
    'nav.about': 'À propos',
    'nav.contact': 'Contact',
    'nav.admin': 'Admin',
    'nav.book': 'Réserver',

    // Hero
    'hero.tagline': 'Location de voiture · 7j/7',
    'hero.title1': 'Conduisez en',
    'hero.title2': 'toute liberté',
    'hero.subtitle': 'JINA BUSINESS vous propose la location, la vente et l\'achat de voitures, ainsi que des services automobiles. Réservation simple, service 24/7.',
    'hero.cta.book': 'Réserver maintenant',
    'hero.cta.fleet': 'Voir la collection',

    // Features
    'features.title': 'Une expérience unique',
    'features.subtitle': 'Nous repensons la location de voiture pour la rendre simple, rapide et agréable.',
    'f1.title': 'Véhicules variés',
    'f1.desc': 'Berlines, SUV et citadines entretenus avec soin.',
    'f2.title': 'Réservation rapide',
    'f2.desc': 'Formulaire simple en moins de 60 secondes.',
    'f3.title': 'Service 24/7',
    'f3.desc': 'Ouvert 7j/7, une équipe dédiée à votre service.',

    // Services
    'services.title': 'Nos services',
    'services.rental': 'Location de voiture',
    'services.sale': 'Vente et achat des voitures',
    'services.auto': 'Service automobiles',

    // Cars
    'cars.title': 'Notre collection',
    'cars.subtitle': 'Choisissez parmi nos véhicules',
    'cars.year': 'Année',
    'cars.color': 'Couleur',
    'cars.type': 'Transmission',
    'cars.automatic': 'Automatique',
    'cars.manual': 'Manuelle',
    'cars.perDay': '/jour',
    'cars.book': 'Réserver',

    // Booking
    'book.title': 'Réservez votre véhicule',
    'book.car': 'Véhicule',
    'book.name': 'Nom complet',
    'book.email': 'Email',
    'book.phone': 'Téléphone',
    'book.start': 'Date de début',
    'book.end': 'Date de fin',
    'book.notes': 'Notes (optionnel)',
    'book.total': 'Total',
    'book.submit': 'Confirmer la réservation',
    'book.success': 'Réservation confirmée ! Nous vous contacterons sous 24h.',

    // About
    'about.title': 'Notre histoire',
    'about.lead': 'JINA BUSINESS, agence de location de voiture à Médiouna, Casablanca : location, vente et achat de voitures, et service automobiles, 7j/7.',

    // Contact
    'contact.title': 'Contactez-nous',
    'contact.subtitle': 'Une question ? Notre équipe est là pour vous répondre.',
    'contact.address': 'LOT ERRACHAD N° 706 TR 02 MAG 01 MEDIOUNA, CASABLANCA',
    'contact.phone': '05 26 03 00 67',
    'contact.mobile': 'Najib : 06 67 47 47 45',
    'contact.gsm': '06 63 04 95 75 - 06 67 47 47 45',
    'contact.email': 'jinabusiness0@gmail.com',
    'contact.hours': 'Ouvert 7j/7 · Service 24/7',
    'contact.legal': 'TP : 37701443 - RC : 624023 - IF : 65912528 - CNSS : 5317601 - ICE : 003478448000020',

    // Footer
    'footer.tagline': 'JINA BUSINESS · Location de voiture, 7j/7.',
    'footer.rights': 'Tous droits réservés.',

    // Auth
    'auth.title': 'Administration',
    'auth.subtitle': 'Connectez-vous à votre espace',
    'auth.email': 'Email',
    'auth.password': 'Mot de passe',
    'auth.signin': 'Se connecter',
    'auth.signout': 'Déconnexion',
    'auth.demo': 'Démo: admin@rental.com / Admin123!',
  },
  ar: {
    // Navigation
    'nav.home': 'الرئيسية',
    'nav.cars': 'سياراتنا',
    'nav.about': 'حول',
    'nav.contact': 'اتصل بنا',
    'nav.admin': 'المشرف',
    'nav.book': 'احجز',

    // Hero
    'hero.tagline': 'تأجير السيارات · 7/7',
    'hero.title1': 'سق',
    'hero.title2': 'بكل حرية',
    'hero.subtitle': 'جينا بيزنس تقدم لك كراء وبيع وشراء السيارات وخدمات السيارات. حجز بسيط وخدمة على مدار الساعة.',
    'hero.cta.book': 'احجز الآن',
    'hero.cta.fleet': 'شاهد المجموعة',

    // Features
    'features.title': 'تجربة فريدة',
    'features.subtitle': 'نعيد تعريف تأجير السيارات لنجعله بسيطاً وسريعاً وممتعاً.',
    'f1.title': 'سيارات متنوعة',
    'f1.desc': 'سيارات عائلية ورباعية الدفع وصغيرة تتم صيانتها بعناية.',
    'f2.title': 'حجز سريع',
    'f2.desc': 'نموذج بسيط في أقل من 60 ثانية.',
    'f3.title': 'خدمة 24/7',
    'f3.desc': 'مفتوح 7 أيام في الأسبوع، وفريق مخصص لخدمتك.',

    // Services
    'services.title': 'خدماتنا',
    'services.rental': 'تأجير السيارات',
    'services.sale': 'بيع وشراء السيارات',
    'services.auto': 'خدمات السيارات',

    // Cars
    'cars.title': 'مجموعتنا',
    'cars.subtitle': 'اختر من بين سياراتنا',
    'cars.year': 'السنة',
    'cars.color': 'اللون',
    'cars.type': 'ناقل الحركة',
    'cars.automatic': 'أوتوماتيك',
    'cars.manual': 'يدوي',
    'cars.perDay': '/يوم',
    'cars.book': 'احجز',

    // Booking
    'book.title': 'احجز سيارتك',
    'book.car': 'السيارة',
    'book.name': 'الاسم الكامل',
    'book.email': 'البريد الإلكتروني',
    'book.phone': 'الهاتف',
    'book.start': 'تاريخ البداية',
    'book.end': 'تاريخ النهاية',
    'book.notes': 'ملاحظات (اختياري)',
    'book.total': 'المجموع',
    'book.submit': 'تأكيد الحجز',
    'book.success': 'تم تأكيد الحجز! سنتصل بك خلال 24 ساعة.',

    // About
    'about.title': 'قصتنا',
    'about.lead': 'جينا بيزنس، وكالة تأجير السيارات في مديونة، الدار البيضاء: كراء وبيع وشراء السيارات وخدمات السيارات، 7 أيام في الأسبوع.',

    // Contact
    'contact.title': 'اتصل بنا',
    'contact.subtitle': 'لديك سؤال؟ فريقنا في انتظارك.',
    'contact.address': 'تجزئة الرشاد رقم 706 TR 02 MAG 01 مديونة - الدار البيضاء',
    'contact.phone': '\u200E05 26 03 00 67\u200E',
    'contact.mobile': 'نجيب : \u200E06 67 47 47 45\u200E',
    'contact.gsm': '\u200E06 63 04 95 75 - 06 67 47 47 45\u200E',
    'contact.email': 'jinabusiness0@gmail.com',
    'contact.hours': 'مفتوح 7/7 · خدمة 24/7',
    'contact.legal': '\u200ETP : 37701443 - RC : 624023 - IF : 65912528 - CNSS : 5317601 - ICE : 003478448000020\u200E',

    // Footer
    'footer.tagline': 'جينا بيزنس · تأجير السيارات، 7/7.',
    'footer.rights': 'جميع الحقوق محفوظة.',

    // Auth
    'auth.title': 'الإدارة',
    'auth.subtitle': 'تسجيل الدخول إلى مساحتك',
    'auth.email': 'البريد الإلكتروني',
    'auth.password': 'كلمة المرور',
    'auth.signin': 'تسجيل الدخول',
    'auth.signout': 'تسجيل الخروج',
    'auth.demo': 'تجريبي: admin@rental.com / Admin123!',
  },
};

export function useI18n() {
  const dispatch = useDispatch();
  const lang = useSelector((state) => state.language?.lang || 'fr');

  const setLang = (newLang) => {
    dispatch(setLanguage(newLang));
    localStorage.setItem('lang', newLang);
    document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = newLang;
  };

  const t = (key) => {
    return translations[lang]?.[key] || key;
  };

  return { t, lang, setLang };
}