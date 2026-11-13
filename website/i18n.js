// Fresh Moves Fix - small client-side translation layer.
// Short interface texts are looked up by their English wording; anything not listed stays in English.
// Translations are machine-made. Language is saved in localStorage ("fmf-lang").
(function () {
  var LANGS = [
    ["en", "English", "English"], ["ar", "العربية", "Arabic"], ["de", "Deutsch", "German"], ["es", "Español", "Spanish"],
    ["fr", "Français", "French"], ["it", "Italiano", "Italian"], ["pt", "Português (Brasil)", "Portuguese (Brazil)"],
    ["ru", "Русский", "Russian"], ["pl", "Polski", "Polish"], ["uk", "Українська", "Ukrainian"], ["tr", "Türkçe", "Turkish"],
    ["zh", "简体中文", "Chinese (Simplified)"], ["ja", "日本語", "Japanese"]
  ];
  // order of the translations: ar, de, es, fr, it, pt, ru, pl, uk, tr, zh, ja
  var T = {
    "Home": ["الرئيسية", "Startseite", "Inicio", "Accueil", "Home", "Início", "Главная", "Start", "Головна", "Ana sayfa", "首页", "ホーム"],
    "Guides": ["الأدلة", "Anleitungen", "Guías", "Guides", "Guide", "Guias", "Руководства", "Poradniki", "Посібники", "Rehberler", "指南", "ガイド"],
    "Eye editor": ["محرر العيون", "Augen-Editor", "Editor de ojos", "Éditeur d'yeux", "Editor occhi", "Editor de olhos", "Редактор глаз", "Edytor oczu", "Редактор очей", "Göz düzenleyici", "眼睛编辑器", "目のエディター"],
    "Skin eye editor": ["محرر عيون السكن", "Skin-Augen-Editor", "Editor de ojos de skin", "Éditeur d'yeux de skin", "Editor occhi della skin", "Editor de olhos da skin", "Редактор глаз скина", "Edytor oczu skina", "Редактор очей скіна", "Skin göz düzenleyici", "皮肤眼睛编辑器", "スキンの目エディター"],
    "Settings": ["الإعدادات", "Einstellungen", "Ajustes", "Paramètres", "Impostazioni", "Configurações", "Настройки", "Ustawienia", "Налаштування", "Ayarlar", "设置", "設定"],
    "Download": ["تنزيل", "Download", "Descargar", "Télécharger", "Scarica", "Baixar", "Скачать", "Pobierz", "Завантажити", "İndir", "下载", "ダウンロード"],
    "Pack": ["الحزمة", "Paket", "Paquete", "Pack", "Pacchetto", "Pacote", "Набор", "Paczka", "Набір", "Paket", "资源包", "パック"],
    "Releases": ["الإصدارات", "Versionen", "Versiones", "Versions", "Versioni", "Versões", "Релизы", "Wydania", "Релізи", "Sürümler", "发行版", "リリース"],
    "Changes": ["التغييرات", "Änderungen", "Cambios", "Changements", "Modifiche", "Mudanças", "Изменения", "Zmiany", "Зміни", "Değişiklikler", "更改", "変更点"],
    "Skins": ["السكنات", "Skins", "Skins", "Skins", "Skin", "Skins", "Скины", "Skiny", "Скіни", "Skinler", "皮肤", "スキン"],
    "Eye guides": ["أدلة العيون", "Augen-Anleitungen", "Guías de ojos", "Guides des yeux", "Guide agli occhi", "Guias de olhos", "Руководства по глазам", "Poradniki o oczach", "Посібники з очей", "Göz rehberleri", "眼睛指南", "目のガイド"],
    "Fix black eyes": ["إصلاح العيون السوداء", "Schwarze Augen beheben", "Arreglar ojos negros", "Corriger les yeux noirs", "Correggere gli occhi neri", "Corrigir olhos pretos", "Исправить чёрные глаза", "Napraw czarne oczy", "Виправити чорні очі", "Siyah gözleri düzelt", "修复黑眼睛", "黒い目を直す"],
    "Required mods": ["المودات المطلوبة", "Benötigte Mods", "Mods necesarios", "Mods requis", "Mod richieste", "Mods necessários", "Нужные моды", "Wymagane mody", "Потрібні моди", "Gerekli modlar", "必需模组", "必要なMOD"],
    "Resources": ["روابط", "Ressourcen", "Recursos", "Ressources", "Risorse", "Recursos", "Ресурсы", "Zasoby", "Ресурси", "Kaynaklar", "资源", "リソース"],
    "Report issues": ["الإبلاغ عن مشكلة", "Fehler melden", "Informar de errores", "Signaler un problème", "Segnala problemi", "Relatar problemas", "Сообщить о проблеме", "Zgłoś problem", "Повідомити про проблему", "Sorun bildir", "报告问题", "問題を報告"],
    "DISPLAY": ["العرض", "ANZEIGE", "PANTALLA", "AFFICHAGE", "SCHERMO", "EXIBIÇÃO", "ВИД", "WYŚWIETLANIE", "ВИГЛЯД", "GÖRÜNÜM", "显示", "表示"],
    "Appearance": ["المظهر", "Aussehen", "Apariencia", "Apparence", "Aspetto", "Aparência", "Оформление", "Wygląd", "Вигляд", "Görünüm", "外观", "外観"],
    "Language": ["اللغة", "Sprache", "Idioma", "Langue", "Lingua", "Idioma", "Язык", "Język", "Мова", "Dil", "语言", "言語"],
    "Color theme": ["سمة الألوان", "Farbschema", "Tema de color", "Thème de couleur", "Tema colore", "Tema de cores", "Цветовая тема", "Motyw kolorów", "Колірна тема", "Renk teması", "颜色主题", "カラーテーマ"],
    "Sync with system": ["مطابقة النظام", "Wie das System", "Igual que el sistema", "Comme le système", "Come il sistema", "Igual ao sistema", "Как в системе", "Jak w systemie", "Як у системі", "Sistemle aynı", "跟随系统", "システムに合わせる"],
    "Light": ["فاتح", "Hell", "Claro", "Clair", "Chiaro", "Claro", "Светлая", "Jasny", "Світла", "Açık", "浅色", "ライト"],
    "Dark": ["داكن", "Dunkel", "Oscuro", "Sombre", "Scuro", "Escuro", "Тёмная", "Ciemny", "Темна", "Koyu", "深色", "ダーク"],
    "Choose your preferred language for the site.": ["اختر اللغة التي تفضلها للموقع.", "Wähle deine bevorzugte Sprache für die Seite.", "Elige el idioma que prefieres para el sitio.", "Choisis la langue du site.", "Scegli la lingua del sito.", "Escolha o idioma do site.", "Выберите язык сайта.", "Wybierz język strony.", "Виберіть мову сайту.", "Site için dil seç.", "选择网站语言。", "サイトの言語を選んでください。"],
    "Only menus, buttons and the editor are translated. Guides and longer texts stay in English. The translations are machine-made and may contain mistakes.": [
      "تُترجم القوائم والأزرار والمحرر فقط. الأدلة والنصوص الطويلة تبقى بالإنجليزية. الترجمة آلية وقد تحتوي على أخطاء.",
      "Nur Menüs, Schaltflächen und der Editor sind übersetzt. Anleitungen und längere Texte bleiben auf Englisch. Die Übersetzungen sind maschinell erstellt und können Fehler enthalten.",
      "Solo se traducen los menús, los botones y el editor. Las guías y los textos largos siguen en inglés. Las traducciones son automáticas y pueden tener errores.",
      "Seuls les menus, les boutons et l'éditeur sont traduits. Les guides et les textes longs restent en anglais. Les traductions sont automatiques et peuvent contenir des erreurs.",
      "Sono tradotti solo menu, pulsanti ed editor. Le guide e i testi lunghi restano in inglese. Le traduzioni sono automatiche e possono contenere errori.",
      "Apenas menus, botões e o editor são traduzidos. Guias e textos longos continuam em inglês. As traduções são automáticas e podem ter erros.",
      "Переведены только меню, кнопки и редактор. Руководства и длинные тексты остаются на английском. Перевод машинный и может содержать ошибки.",
      "Przetłumaczone są tylko menu, przyciski i edytor. Poradniki i dłuższe teksty pozostają po angielsku. Tłumaczenia są maszynowe i mogą zawierać błędy.",
      "Перекладено лише меню, кнопки та редактор. Посібники й довгі тексти залишаються англійською. Переклад машинний і може містити помилки.",
      "Yalnızca menüler, düğmeler ve düzenleyici çevrildi. Rehberler ve uzun metinler İngilizce kalır. Çeviriler makine çevirisidir ve hata içerebilir.",
      "只翻译了菜单、按钮和编辑器。指南和较长的文字仍为英文。翻译由机器完成，可能有错误。",
      "メニュー、ボタン、エディターだけが翻訳されています。ガイドや長い文章は英語のままです。機械翻訳のため、間違いがあるかもしれません。"],
    "1. Skin": ["1. السكن", "1. Skin", "1. Skin", "1. Skin", "1. Skin", "1. Skin", "1. Скин", "1. Skin", "1. Скін", "1. Skin", "1. 皮肤", "1. スキン"],
    "2. Eyes": ["2. العيون", "2. Augen", "2. Ojos", "2. Yeux", "2. Occhi", "2. Olhos", "2. Глаза", "2. Oczy", "2. Очі", "2. Gözler", "2. 眼睛", "2. 目"],
    "3. Colours": ["3. الألوان", "3. Farben", "3. Colores", "3. Couleurs", "3. Colori", "3. Cores", "3. Цвета", "3. Kolory", "3. Кольори", "3. Renkler", "3. 颜色", "3. 色"],
    "4. Save": ["4. الحفظ", "4. Speichern", "4. Guardar", "4. Enregistrer", "4. Salva", "4. Salvar", "4. Сохранение", "4. Zapis", "4. Збереження", "4. Kaydet", "4. 保存", "4. 保存"],
    "Choose your skin file": ["اختر ملف السكن", "Skin-Datei auswählen", "Elige tu archivo de skin", "Choisis ton fichier de skin", "Scegli il file della skin", "Escolha o arquivo da skin", "Выберите файл скина", "Wybierz plik skina", "Виберіть файл скіна", "Skin dosyanı seç", "选择皮肤文件", "スキンファイルを選ぶ"],
    "or drop the .png here": ["أو اسحب ملف ‎.png إلى هنا", "oder die .png hier ablegen", "o suelta el .png aquí", "ou dépose le .png ici", "o trascina qui il .png", "ou solte o .png aqui", "или перетащите .png сюда", "albo upuść tutaj plik .png", "або перетягніть .png сюди", "veya .png dosyasını buraya bırak", "或把 .png 拖到这里", "または .png をここにドロップ"],
    "or start from": ["أو ابدأ من", "oder starte mit", "o empieza con", "ou commence avec", "oppure parti da", "ou comece com", "или начните с", "albo zacznij od", "або почніть з", "veya şununla başla", "或从这里开始", "または次から始める"],
    "Format:": ["النوع:", "Format:", "Formato:", "Format :", "Formato:", "Formato:", "Формат:", "Format:", "Формат:", "Biçim:", "模型：", "形式:"],
    "Eye shape": ["شكل العين", "Augenform", "Forma del ojo", "Forme des yeux", "Forma degli occhi", "Formato dos olhos", "Форма глаз", "Kształt oczu", "Форма очей", "Göz şekli", "眼睛形状", "目の形"],
    "Position on the face": ["الموضع على الوجه", "Position im Gesicht", "Posición en la cara", "Position sur le visage", "Posizione sul viso", "Posição no rosto", "Положение на лице", "Pozycja na twarzy", "Положення на обличчі", "Yüzdeki konum", "在脸上的位置", "顔の上の位置"],
    "Eyelid": ["الجفن", "Augenlid", "Párpado", "Paupière", "Palpebra", "Pálpebra", "Веко", "Powieka", "Повіка", "Göz kapağı", "眼皮", "まぶた"],
    "Eye white": ["بياض العين", "Augenweiß", "Blanco del ojo", "Blanc de l'œil", "Bianco dell'occhio", "Branco do olho", "Белок глаза", "Białko oka", "Білок ока", "Göz akı", "眼白", "白目"],
    "Pupil": ["البؤبؤ", "Pupille", "Pupila", "Pupille", "Pupilla", "Pupila", "Зрачок", "Źrenica", "Зіниця", "Göz bebeği", "瞳孔", "瞳"],
    "Eye colour": ["لون العين", "Augenfarbe", "Color del ojo", "Couleur de l'œil", "Colore dell'occhio", "Cor do olho", "Цвет глаза", "Kolor oka", "Колір ока", "Göz rengi", "眼睛颜色", "目の色"],
    "Paint these eye colours on the face": ["ارسم ألوان العين هذه على الوجه", "Diese Augenfarben ins Gesicht malen", "Pintar estos colores de ojos en la cara", "Peindre ces couleurs d'yeux sur le visage", "Dipingi questi colori degli occhi sul viso", "Pintar estas cores dos olhos no rosto", "Нарисовать эти цвета глаз на лице", "Namaluj te kolory oczu na twarzy", "Намалювати ці кольори очей на обличчі", "Bu göz renklerini yüze boya", "把这些眼睛颜色画到脸上", "この目の色を顔に描く"],
    "Download skin (.png)": ["تنزيل السكن (‎.png)", "Skin herunterladen (.png)", "Descargar skin (.png)", "Télécharger le skin (.png)", "Scarica la skin (.png)", "Baixar skin (.png)", "Скачать скин (.png)", "Pobierz skin (.png)", "Завантажити скін (.png)", "Skini indir (.png)", "下载皮肤 (.png)", "スキンをダウンロード (.png)"],
    "3D preview": ["معاينة ثلاثية الأبعاد", "3D-Vorschau", "Vista previa 3D", "Aperçu 3D", "Anteprima 3D", "Prévia 3D", "3D-просмотр", "Podgląd 3D", "3D-перегляд", "3B önizleme", "3D 预览", "3Dプレビュー"],
    "Pose": ["الوضعية", "Pose", "Pose", "Pose", "Posa", "Pose", "Поза", "Poza", "Поза", "Poz", "姿势", "ポーズ"],
    "Spin": ["تدوير", "Drehen", "Girar", "Tourner", "Ruota", "Girar", "Вращать", "Obracaj", "Обертати", "Döndür", "旋转", "回転"],
    "Zoom": ["تكبير", "Zoom", "Zoom", "Zoom", "Zoom", "Zoom", "Масштаб", "Powiększenie", "Масштаб", "Yakınlaştır", "缩放", "ズーム"],
    "Face": ["الوجه", "Gesicht", "Cara", "Visage", "Viso", "Rosto", "Лицо", "Twarz", "Обличчя", "Yüz", "脸", "顔"],
    "Top": ["أعلى", "Oben", "Arriba", "Haut", "In alto", "Em cima", "Вверху", "Góra", "Вгорі", "Üst", "上", "上"],
    "Bottom": ["أسفل", "Unten", "Abajo", "Bas", "In basso", "Embaixo", "Внизу", "Dół", "Внизу", "Alt", "下", "下"],
    "Upper middle": ["وسط علوي", "Obere Mitte", "Medio alto", "Milieu haut", "Centro alto", "Meio superior", "Выше середины", "Górny środek", "Вище середини", "Üst orta", "中上", "中央上"],
    "Lower middle": ["وسط سفلي", "Untere Mitte", "Medio bajo", "Milieu bas", "Centro basso", "Meio inferior", "Ниже середины", "Dolny środek", "Нижче середини", "Alt orta", "中下", "中央下"],
    "Standing": ["واقف", "Stehen", "De pie", "Debout", "In piedi", "Em pé", "Стоит", "Stoi", "Стоїть", "Ayakta", "站立", "立つ"],
    "Walking": ["يمشي", "Gehen", "Caminando", "Marche", "Cammina", "Andando", "Идёт", "Idzie", "Іде", "Yürüyor", "行走", "歩く"],
    "Running": ["يركض", "Rennen", "Corriendo", "Course", "Corre", "Correndo", "Бежит", "Biegnie", "Біжить", "Koşuyor", "奔跑", "走る"],
    "Waving": ["يلوّح", "Winken", "Saludando", "Salut", "Saluta", "Acenando", "Машет", "Macha", "Махає", "El sallıyor", "挥手", "手を振る"],
    "Basic colours": ["ألوان أساسية", "Grundfarben", "Colores básicos", "Couleurs de base", "Colori di base", "Cores básicas", "Основные цвета", "Podstawowe kolory", "Основні кольори", "Temel renkler", "基本颜色", "基本の色"],
    "From your skin's face": ["من وجه السكن", "Aus dem Gesicht deines Skins", "De la cara de tu skin", "Du visage de ton skin", "Dal viso della tua skin", "Do rosto da sua skin", "С лица вашего скина", "Z twarzy twojego skina", "З обличчя вашого скіна", "Skininin yüzünden", "来自皮肤的脸", "スキンの顔から"],
    "How it works": ["كيف يعمل", "So funktioniert es", "Cómo funciona", "Comment ça marche", "Come funziona", "Como funciona", "Как это работает", "Jak to działa", "Як це працює", "Nasıl çalışır", "工作原理", "仕組み"],
    "What it does": ["ماذا يفعل", "Was es macht", "Qué hace", "Ce que ça fait", "Cosa fa", "O que faz", "Что он делает", "Co robi", "Що він робить", "Ne yapar", "功能", "できること"],
    "Player animations": ["حركات اللاعب", "Spieler-Animationen", "Animaciones del jugador", "Animations du joueur", "Animazioni del giocatore", "Animações do jogador", "Анимации игрока", "Animacje gracza", "Анімації гравця", "Oyuncu animasyonları", "玩家动画", "プレイヤーのアニメーション"],
    "Animated eyes": ["عيون متحركة", "Animierte Augen", "Ojos animados", "Yeux animés", "Occhi animati", "Olhos animados", "Анимированные глаза", "Animowane oczy", "Анімовані очі", "Hareketli gözler", "动态眼睛", "動く目"],
    "Wave emote": ["حركة التلويح", "Winken-Emote", "Gesto de saludo", "Emote de salut", "Emote del saluto", "Emote de aceno", "Эмоция «помахать»", "Emotka machania", "Емоція «помахати»", "El sallama hareketi", "挥手表情", "手を振るエモート"]
  };
  var KEY = "fmf-lang", cur = "en";
  try { cur = localStorage.getItem(KEY) || "en"; } catch (e) {}
  var codes = LANGS.map(function (l) { return l[0]; });
  if (codes.indexOf(cur) < 0) cur = "en";
  var orig = new WeakMap(), mine = new WeakMap();

  function tr(text) {
    if (cur === "en") return text;
    var row = T[text];
    return row ? row[codes.indexOf(cur) - 1] || text : text;
  }
  function doNode(n) {
    var v = n.nodeValue;
    if (mine.get(n) !== v) orig.set(n, v); // changed by the page itself: this is a new English text
    var src = orig.get(n), core = src.trim();
    if (!core) return;
    var out = tr(core);
    var next = out === core ? src : src.replace(core, out);
    if (next !== v) { mine.set(n, next); n.nodeValue = next; } else mine.set(n, v);
  }
  function walk(root) {
    if (root.nodeType === 3) { doNode(root); return; }
    if (root.nodeType !== 1 || /^(SCRIPT|STYLE|TEXTAREA)$/.test(root.tagName)) return;
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null), n;
    while ((n = w.nextNode())) if (!/^(SCRIPT|STYLE)$/.test(n.parentNode.tagName)) doNode(n);
  }
  function apply() {
    document.documentElement.lang = cur === "zh" ? "zh-CN" : cur === "pt" ? "pt-BR" : cur;
    document.documentElement.dir = cur === "ar" ? "rtl" : "ltr";
    walk(document.body);
  }
  window.fmfI18n = {
    langs: LANGS,
    get: function () { return cur; },
    set: function (c) { if (codes.indexOf(c) < 0) return; cur = c; try { localStorage.setItem(KEY, c); } catch (e) {} apply(); try { document.dispatchEvent(new Event("fmf-lang")); } catch (e) {} }
  };
  function start() {
    apply();
    new MutationObserver(function (list) {
      list.forEach(function (m) {
        if (m.type === "characterData") doNode(m.target);
        else m.addedNodes.forEach(walk);
      });
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
  }
  if (document.body) start(); else document.addEventListener("DOMContentLoaded", start);
})();
