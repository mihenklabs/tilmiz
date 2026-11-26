# Cümle çevirisi kontrolü (26 Kasım 2026)

Diyaloglar (56 satır) ve Tatoeba örnek cümleleri (2.244) tek tek kontrol edildi: ana çeviri doğru mu, doğru olan başka karşılıklar neler, Arapçası hatalı ya da 7+ yaş için uygunsuz mu.

- Düzeltilen ana çeviri: 298 (data/sentences-tr.json, `tr`; Tatoeba çevirisinin yerine bizim çevirimiz gösterilir)
- Alternatif çeviri eklenen: 976 cümle + 54 diyalog satırı (`alt`; uygulamada “ya da: …”)
- Çıkarılan: 258 cümle (data/sentences-blocked.json): Arapça yazım/dil bilgisi hatası, lehçe, bozuk cümle ya da siyasi, dinî tartışma, hakaret, şiddet, alkol vb.
- Kalan: 1.986 cümle, 1.375 kelimede örnek

Düzeltmeler `tools/sentences-apply.mjs` ile uygulanır; `tools/tatoeba.mjs` cümleleri yeniden ürettiğinde de korunur. Hoca kontrolü için: `npm run content:export` → “Örnek cümleler” ve “Diyaloglar” sayfalarında “Diğer doğru çeviriler” sütunu.

## Ayrıntı

```
çıkarıldı s11 [ar] إشرب! — اشرب olmalı (vasl elifi, hemzesiz). Erkeğe emir.
çıkarıldı s23 [ar] إشربي! — اشربي olmalı (vasl elifi). Kadına emir.
çıkarıldı s65 [ar] لقد غار. — غار "battı/kıskandı" demek; "ayrıldı" için غادر olmalı. Mevcut çeviride zaman da yanlıştı.
çıkarıldı s74 [ar] سانتظرك. — سأنتظرك olmalı (hemze eksik).
çıkarıldı s75 [ar] إنتظرتك. — انتظرتك olmalı (vasl elifi).
çıkarıldı s102 [ar] لن اتحرك. — لن أتحرك olmalı (hemze eksik).
çıkarıldı s117 [uygunsuz] هو ملحدٌ. — Dinî açıdan tartışmalı içerik.
çıkarıldı s118 [ar] توم عاطفى — عاطفي olmalı (ى değil ي).
çıkarıldı s120 [uygunsuz] أنت مقرف! — Hakaret.
çıkarıldı s122 [ar] إسمي توم. — اسمي olmalı (vasl elifi).
çıkarıldı s131 [uygunsuz] الله فيل. — Allah hakkında saygısız/anlamsız ifade.
çıkarıldı s147 [uygunsuz] زبك كبير. — Müstehcen/kaba ifade.
çıkarıldı s159 [ar] انت حياتي. — أنت olmalı (hemze eksik).
çıkarıldı s160 [ar] أين رأيته? — Latin soru işareti; ؟ olmalı.
çıkarıldı s168 [ar] احب البنات — أحب olmalı (hemze eksik).
çıkarıldı s171 [ar] شربت شايً. — شايًا olmalı (tenvin yazımı hatalı).
çıkarıldı s181 [ar] كنت أتسائل — أتساءل olmalı (hemze yazımı).
çıkarıldı s209 [ar] إسمي كارل. — اسمي olmalı (vasl elifi).
çıkarıldı s224 [ar] إشترت شقة. — اشترت olmalı (vasl elifi). Özne dişil.
çıkarıldı s225 [ar] إشترى شقة. — اشترى olmalı (vasl elifi).
çıkarıldı s232 [ar] انا مهندس. — أنا olmalı (hemze eksik).
çıkarıldı s253 [ar] اعطني فرصة! — أعطني olmalı (hemze eksik).
çıkarıldı s265 [ar] أين مظلّتك? — Latin soru işareti; ؟ olmalı.
çıkarıldı s287 [ar] لديّ أخوةٌ. — إخوة olmalı (أخوة "kardeşlik"); mevcut çeviri ("bir kız kardeş") yanlıştı.
çıkarıldı s320 [ar] أستغفرالله! — أستغفر الله ayrı yazılmalı. Türkçedeki nezaket "estağfurullah"ı değil, istiğfar anlamı taşır.
çıkarıldı s322 [uygunsuz] أؤمن بغنيش. — Dinî açıdan tartışmalı (Ganeşa).
çıkarıldı s327 [ar] اعوذ بالله. — أعوذ olmalı (hemze eksik).
çıkarıldı s329 [uygunsuz] فلسطين حرة! — Siyasi slogan.
çıkarıldı s331 [uygunsuz] أنت عُنصري. — Suçlayıcı/hakaret içerikli.
çıkarıldı s345 [ar] هذه حبة اجاص — إجاص olmalı (hemze eksik).
çıkarıldı s350 [ar] هل انت متأكد — هل أنت متأكد؟ olmalı (hemze ve soru işareti eksik).
çıkarıldı s359 [ar] لا تكن عاطفى — لا تكن عاطفيًّا olmalı.
çıkarıldı s364 [uygunsuz] انا الشيطان. — Korkutucu içerik; ayrıca أنا hemzesiz yazılmış.
çıkarıldı s366 [ar] يريدون ماءا. — ماءً olmalı.
çıkarıldı s386 [ar] ألترجمة فنّ. — الترجمة olmalı (vasl elifi).
çıkarıldı s395 [uygunsuz] أنت عُنصرية. — Suçlayıcı/hakaret içerikli.
çıkarıldı s402 [ar] هل انت متزوج؟ — أنت olmalı (hemze eksik). Erkeğe hitap.
çıkarıldı s425 [ar] ممكن ان تأذيه — تأذيه yanlış yazılmış (doğrusu تؤذيه); ممكن أن de hamzasız. Zaman şimdiki/gelecek.
çıkarıldı s431 [uygunsuz] الملكية سرقة. — Siyasi/tartışmalı slogan (Proudhon).
çıkarıldı s442 [ar] إعطيني فُرصة! — إعطيني yanlış; doğrusu أعطيني (kadına hitap).
çıkarıldı s452 [uygunsuz] غرق في النهر. — Ölüm (boğulma) içeriği.
çıkarıldı s454 [uygunsuz] الحكومة تكذب. — Siyasi içerik.
çıkarıldı s466 [uygunsuz] فلسطين مهمّة. — Siyasi/tartışmalı olabilir.
çıkarıldı s490 [ar] هذا سوال غريب. — سوال yanlış; doğrusu سؤال. 'Sorun' değil 'soru'.
çıkarıldı s502 [ar] أحب المفاجئات. — المفاجئات yanlış; doğrusu المفاجآت.
çıkarıldı s527 [uygunsuz] هل أنتِ ملحدة؟ — Dinî açıdan tartışmalı konu; kadına hitap.
çıkarıldı s536 [uygunsuz] توم ليس ترامب. — Siyasetçi adı geçiyor.
çıkarıldı s538 [ar] توم ليس مترجم. — ليس'in haberi mansub olmalı: مترجماً.
çıkarıldı s552 [ar] هل أنت يبانية؟ — يبانية yanlış; doğrusu يابانية (kadına).
çıkarıldı s590 [uygunsuz] دمتريوس يشتمني! — Küfür/hakaret konusu.
çıkarıldı s601 [ar] في محلين فاضيين — Levanten lehçe (محلين فاضيين); fasih değil.
çıkarıldı s602 [ar] كيف رحت لهونيك؟ — Levanten lehçe (رحت لهونيك); fasih değil.
çıkarıldı s616 [uygunsuz] دمرت كل الأدلة. — Suç delili yok etme çağrışımı.
çıkarıldı s621 [ar] ألا تتذكر إسمي؟ — إسمي yanlış; doğrusu اسمي (vasl hemzesi).
çıkarıldı s625 [ar] أصبحت بالغ الآن — أصبح'in haberi mansub olmalı: بالغاً.
çıkarıldı s642 [ar] كان الماء ازرقا — أزرق gayri munsarif; ازرقا yerine أزرقَ olmalı.
çıkarıldı s658 [uygunsuz] انا من كردستان. — Siyasi açıdan hassas olabilir.
çıkarıldı s665 [uygunsuz] لا وجود للآلهة. — Dinî açıdan tartışmalı ifade.
çıkarıldı s678 [ar] جعلني حزين جدا. — جعل'in ikinci mef'ulü mansub olmalı: حزيناً. جدا çevrilmemişti.
çıkarıldı s693 [ar] أنا اؤمن بالله. — اؤمن yanlış; doğrusu أؤمن.
çıkarıldı s713 [ar] أنا مستعد للأسوء — الأسوء yanlış; doğrusu الأسوأ.
çıkarıldı s715 [ar] باراك الله عليك. — باراك yanlış; doğrusu بارك.
çıkarıldı s724 [ar] الصحة على مايرام — مايرام ayrı yazılmalı: ما يرام. Mevcut çeviri anlamı kaydırıyordu.
çıkarıldı s727 [ar] لم يعني توم ذلك. — لم'den sonra cezm: لم يعنِ.
çıkarıldı s737 [ar] إنهم إناس بالغون — إناس yanlış; doğrusu أناس.
çıkarıldı s757 [ar] كان سامي غضبانا. — غضبان gayri munsarif: غضبانَ olmalı.
çıkarıldı s781 [ar] تعالي إسبحي معي. — إسبحي yanlış; doğrusu اسبحي (kadına emir).
çıkarıldı s795 [ar] وعاء السکر فارغ. — السکر Farsça kef (ک) ile yazılmış; doğrusu السكر.
çıkarıldı s798 [uygunsuz] الرب ليس مسلمًا. — Dinî açıdan tartışmalı ifade.
çıkarıldı s799 [uygunsuz] الله ليس مسلمًا. — Dinî açıdan tartışmalı ifade.
çıkarıldı s811 [ar] طنجره ولقت غطاها. — Lehçe atasözü (طنجرة ولقت غطاها); fasih değil.
çıkarıldı s813 [ar] إشترىته عشر دولار — إشترىته bozuk yazım; doğrusu اشتريته بعشرة دولارات.
çıkarıldı s815 [ar] ما نمت منيح مبارح — Levanten lehçe (منيح، مبارح).
çıkarıldı s819 [ar] طوم لبس جنس اسود. — Bozuk yazım: طوم، لبس، جنس (جينز olmalı).
çıkarıldı s824 [ar] أشتريت مجلة لها . — أشتريت yanlış; doğrusu اشتريت.
çıkarıldı s827 [uygunsuz] كم ضحية كانت هناك — Kurban/ölü sayısı: şiddet çağrışımı.
çıkarıldı s828 [ar] لم أستطع إنهائها. — إنهائها yanlış; doğrusu إنهاءها.
çıkarıldı s836 [ar] توم إنتهى الثاني. — إنتهى yanlış; doğrusu انتهى.
çıkarıldı s840 [ar] الآن انت مدينن لي — مدينن yazım hatası; doğrusu مدين.
çıkarıldı s843 [ar] ما رأيت أطفالاََ. — أطفالاََ çift tenvin yazım hatası.
çıkarıldı s848 [ar] أنا أريد ببغاءًا. — ببغاءًا yanlış; doğrusu ببغاءً.
çıkarıldı s867 [ar] سوف أكون مهندسًاً — مهندسًاً: tenvin iki kez yazılmış; doğrusu مهندسًا.
çıkarıldı s891 [uygunsuz] السياسيون يكذبون. — Siyasi genelleme.
çıkarıldı s892 [uygunsuz] عاشت الديمقراطية! — Siyasi slogan.
çıkarıldı s896 [uygunsuz] الرب ليس مسيحيًا. — Dinî açıdan tartışmalı ifade.
çıkarıldı s897 [uygunsuz] الله ليس مسيحيًا. — Dinî açıdan tartışmalı ifade.
çıkarıldı s912 [ar] إشتقت إليك كثيرا ! — Vasl hemzesi: doğrusu اشتقت (إشتقت değil).
çıkarıldı s917 [ar] سأمهلك حتّى الغدّ. — سـ gelecek zaman; الغدّ şeddesi yanlış (الغد).
çıkarıldı s919 [ar] هل سيد العبيد هنا؟ — سيد العبيد 'kölelerin efendisi' diye okunur; 'Bay Ubeyd' için السيد عبيد olmalı.
çıkarıldı s920 [uygunsuz] توم ابن حرام محظوظ — Hakaret (ابن حرام).
çıkarıldı s925 [uygunsuz] هل انت ضد الاجهاض؟ — Tartışmalı konu (kürtaj).
çıkarıldı s926 [ar] لا يمكن توم تحملها — Doğrusu لا يمكن لتوم تحمّلها ya da لا يستطيع توم تحمّلها.
çıkarıldı s928 [ar] أنا أعرف أن أتزلج. — Doğal yapı: أعرف كيف أتزلج.
çıkarıldı s944 [ar] لم يتبقى لديك عذر. — لم sonrası cezm: لم يتبقَّ olmalı.
çıkarıldı s948 [ar] عينى اليسرى لا ترى — عينى → عيني (ي noktasız yazılmış).
çıkarıldı s956 [uygunsuz] الحرّيّة لكردستان! — Siyasi slogan.
çıkarıldı s983 [uygunsuz] توم لا يؤمن بالله. — Dinî inanç/inançsızlık konusu, tartışmalı.
çıkarıldı s988 [uygunsuz] الدين أفيون الشعب. — Dine yönelik tartışmalı/siyasi söz.
çıkarıldı s995 [ar] محكم عليه بالإعدام. — محكم yazım hatası; doğrusu محكوم عليه.
çıkarıldı s1001 [ar] إستعجل! نحن ننتظرك. — Vasl hemzesi: doğrusu استعجل.
çıkarıldı s1002 [ar] أنا العب مع أصحابي. — العب → ألعب (hemze eksik).
çıkarıldı s1003 [ar] أن جد ممتن لمساعدتك — أن جد → أنا جدُّ (yazım hatası).
çıkarıldı s1010 [ar] إذهب إلى هناك الآن. — Tekil emir; ayrıca إذهب → اذهب (vasl hemzesi).
çıkarıldı s1011 [ar] رجاء إعمل ما أقوله. — إعمل → اعمل (vasl hemzesi).
çıkarıldı s1020 [uygunsuz] لم يغزو بوش العراق. — Siyasi/tartışmalı; ayrıca لم يغزو → لم يغزُ (cezm hatası). 'asla' Arapçada yok.
çıkarıldı s1040 [ar] كان سامي غير مسلما. — غير مسلما → غيرَ مسلمٍ (izafet, mecrur olmalı).
çıkarıldı s1052 [uygunsuz] الحمد لله انا ملحد. — Dinle alay eden, tartışmalı ifade.
çıkarıldı s1054 [uygunsuz] إيلون ماسك هو نازي. — Gerçek kişiye hakaret/siyasi.
çıkarıldı s1058 [ar] إشترت سيّارة صغيرة. — إشترت → اشترت (vasl hemzesi).
çıkarıldı s1059 [ar] إشتريت سيارة قديمة. — إشتريت → اشتريت (vasl hemzesi).
çıkarıldı s1071 [uygunsuz] الدين أفيون الشعوب. — Dine yönelik tartışmalı/siyasi söz.
çıkarıldı s1085 [ar] الشتي، اكتر فصل بحبه — Şam lehçesi (الشتي، اكتر، بحبه); fasih değil.
çıkarıldı s1086 [ar] درست ياباني خمس سنين — Lehçe (ياباني، سنين); fasihte درست اليابانية خمس سنوات.
çıkarıldı s1099 [ar] نُفِى توم من البلدة. — نُفِى → نُفِيَ (ي noktasız yazılmış).
çıkarıldı s1108 [ar] لست نادم على ما فعلت — ليس haberi mansup: لستُ نادمًا.
çıkarıldı s1121 [ar] كل الخبز وشرب الماء. — وشرب mazi okunur; emir için كُلِ الخبزَ واشربِ الماء olmalı.
çıkarıldı s1160 [uygunsuz] ألمانيا ليست كردستان — Siyasi içerik.
çıkarıldı s1178 [ar] طوم عايش بمنطقة هادية — Şam lehçesi (عايش، هادية); fasihte يعيش توم في منطقة هادئة.
çıkarıldı s1181 [ar] أنا في قاعة الإنتظار. — الإنتظار → الانتظار (vasl hemzesi).
çıkarıldı s1189 [ar] سأضيف شيء ما من أجلك. — Nesne mansup olmalı: شيئًا ما.
çıkarıldı s1208 [uygunsuz] أستاذنا بالحقيقة مغفل — Öğretmene hakaret; 'idiot' Türkçe değil.
çıkarıldı s1209 [ar] انا لا اجعلك تعمل شيء — Hemzeler eksik ve nesne mansup değil: أنا لا أجعلك تعمل شيئًا.
çıkarıldı s1211 [uygunsuz] كاهننا نباتيٌّ وملحد. — Dinî açıdan tartışmalı/alaycı.
çıkarıldı s1212 [uygunsuz] شكرا يا رب، أنا ملحد. — Dinle alay eden, tartışmalı ifade.
çıkarıldı s1223 [ar] لديها بنت إسمها مريم. — مريم = Meryem; إسمها → اسمها (vasl hemzesi).
çıkarıldı s1228 [uygunsuz] أنا أعلم أنك فاشل(ة). — Aşağılayıcı ifade (فاشل).
çıkarıldı s1229 [uygunsuz] كان يراقبه وهو يستحم. — Banyo yapan birini gözetleme; ayrıca كان + muzari = -iyordu.
çıkarıldı s1245 [uygunsuz] لماذا يكذب السياسيون؟ — Siyasi genelleme; السياسيون çoğul.
çıkarıldı s1269 [ar] يجب على الذكور أن يعمل — Uyum hatası: يجب على الذكور أن يعملوا.
çıkarıldı s1270 [ar] عملت غلطة كبيرة بالفحص — Lehçe (عملت غلطة، بالفحص); كبيرة = büyük.
çıkarıldı s1286 [ar] قال توم أنه تفاجئ حقا. — تفاجئ → تفاجأ; قال sonrası إنه.
çıkarıldı s1298 [ar] الإنتظار أشد من النار. — الإنتظار → الانتظار (vasl hemzesi).
çıkarıldı s1310 [uygunsuz] كانت تراقبه وهو يستحم. — Kadın, banyo yapan erkeği gözetliyor; كانت + muzari = -iyordu.
çıkarıldı s1311 [uygunsuz] كان يراقبها وهي تستحم. — Erkek, banyo yapan kadını gözetliyor; كان + muzari = -iyordu.
çıkarıldı s1315 [ar] كما تكونوا يولى عليكم. — Yazım düzeltildi (yönetilirisiniz). Arapçada تكونوا/يولى uyumsuz: كما تكونون يُوَلّى عليكم ya da كما تكونوا يُوَلَّ.
çıkarıldı s1338 [uygunsuz] تركته لتكون مع رجل آخر. — Yetişkin ilişki/aldatma teması.
çıkarıldı s1369 [ar] بعد الغذاء لدينا درسان. — الغذاء (gıda) yerine الغداء (öğle yemeği) olmalı; 'daha' fazlaydı.
çıkarıldı s1375 [uygunsuz] أنا ممتنع عن شرب الكحول — Alkol konusu.
çıkarıldı s1377 [ar] وصل الباس بدقيقتان ابكر — بدقيقتان → بدقيقتين، أبكر; الباس halk ağzı (الحافلة).
çıkarıldı s1383 [uygunsuz] يا عمال العالم، اتحدوا! — Siyasi slogan.
çıkarıldı s1387 [uygunsuz] كانت تراقبها وهي تستحم. — Banyo yapan birini gözetleme.
çıkarıldı s1390 [uygunsuz] رئيس أوكرانيا هو يهودي. — Siyasi/dinî kimlik konusu; yazım düzeltildi.
çıkarıldı s1404 [uygunsuz] هل تطور الإنسان من قرد؟ — Tartışmalı konu (evrim).
çıkarıldı s1416 [uygunsuz] طوم كل يوم عنده سهرة شرب — Alkol; Arapça da halk ağzı. Eski çeviri zamanı ve anlamı kaydırıyordu.
çıkarıldı s1417 [ar] من فضلك تكلم ببطئٍ أكثر. — ببطئٍ → ببطءٍ (hemze yazımı).
çıkarıldı s1424 [ar] لا أعلم ما يجري بينهنما. — بينهنما → بينهما (yazım hatası).
çıkarıldı s1475 [uygunsuz] الدين هو أفيون الجماهير. — Dinle ilgili tartışmalı söz.
çıkarıldı s1494 [ar] توم يحتاجُ إِلى نصيحتَنا. — نصيحتَنا → نصيحتِنا (harekeleme hatası).
çıkarıldı s1503 [ar] استمر خطابه لثلاثة ساعات. — ثلاثة ساعات → ثلاث ساعات (sayı-sayılan uyumu).
çıkarıldı s1518 [ar] أنا تعب من مشاهدة التلفاز — تعب → تعبان/متعب.
çıkarıldı s1525 [ar] لا توجد تلميذة من الفتياة — الفتياة → الفتيات; cümle anlamca belirsiz.
çıkarıldı s1548 [ar] من أحب حكى و من أشتاق أتى — أشتاق → اشتاق (geçmiş zaman, vasl hemzesi).
çıkarıldı s1566 [ar] ماذا تريد؟ أنا أريد حيوان. — حيوان → حيواناً (mef'ul, tenvin).
çıkarıldı s1567 [ar] أنا إقترضت هذا الكتاب منه. — إقترضت → اقترضت (vasl hemzesi).
çıkarıldı s1570 [ar] أودُ أن أدعوكي إلى الحفلة. — أدعوكي halk yazımı; doğrusu أدعوكِ.
çıkarıldı s1576 [ar] هذا التلفاز ’ صنع في كوريا — Cümlede gereksiz ’ işareti var.
çıkarıldı s1580 [ar] الجنة تحت أقدام الأمهاتكم. — الأمهاتكم hatalı (harf-i tarif + iyelik); أمهاتكم olmalı.
çıkarıldı s1605 [ar] منحته الجامعة دكتورة فخرية — دكتورة → دكتوراه.
çıkarıldı s1608 [ar] كان يريد توم مليون دولارا. — مليون دولارا → مليون دولار.
çıkarıldı s1609 [ar] لدى سامي و ليلى ستّ أطفال. — ستّ أطفال → ستة أطفال.
çıkarıldı s1614 [tartışmalı] أنا دار الحكمة وعلي بابها. — Hadis olarak nakledilen söz (sıhhati tartışmalı).
çıkarıldı s1619 [uygunsuz] الطلاق حق من حقوق الإنسان. — Tartışmalı toplumsal konu (boşanma).
çıkarıldı s1642 [ar] كتير صعب عليي فيق قبل الستة — Levanten lehçesi (كتير، عليي، فيق); fasih değil.
çıkarıldı s1644 [ar] توم يقوم بقرآءة كتاب تاريخ. — قرآءة → قراءة.
çıkarıldı s1655 [ar] ركض بسرعة أي ولد في الفريق. — Cümle eksik/bozuk ('kadar' anlamı yok, ör. أسرع من أي ولد).
çıkarıldı s1662 [ar] نتفلكس متوفر الآن في أروبا. — أروبا 'Aruba' okunur; Avrupa için أوروبا olmalı.
çıkarıldı s1663 [ar] فلندعوا. ألا يحدث شيء لماري — فلندعوا → فلندعُ؛ ألا → أن لا.
çıkarıldı s1669 [uygunsuz] تعجبني شفافية دونالد ترامب. — Siyasi kişi/yorum.
çıkarıldı s1670 [tartışmalı] أنا مدينة العلم وعلي بابها. — مدينة = şehir. Hadis olarak nakledilen söz (sıhhati tartışmalı).
çıkarıldı s1671 [uygunsuz] لم يكن ماركس وإنجلز نبيَين. — Siyasi/dinî tartışmalı içerik.
çıkarıldı s1672 [ar] توم و ماري رقصا بالقرب معًا — بالقرب معًا bozuk ifade.
çıkarıldı s1682 [uygunsuz] السلام لم يكن خيارًا أبدًا. — Savaşçı/şiddet çağrıştıran söz.
çıkarıldı s1684 [ar] هل كان بإستطاعتك حل المشكلة؟ — بإستطاعتك → باستطاعتك.
çıkarıldı s1719 [ar] محمد يحب أن يأکل ناسي ليماك. — يأکل içinde Farsça ک harfi; يأكل olmalı.
çıkarıldı s1721 [ar] أتريد قصاصات صغيرة أم كبيرة؟ — قصاصات 'kesik kâğıt/kupür' demek; asıl cümle (uzun/kısa öykü) yanlış çevrilmiş.
çıkarıldı s1728 [ar] أين تخطط لذهاب في فصل الصيف. — لذهاب → للذهاب; soru işareti yok.
çıkarıldı s1744 [ar] مؤلف الكتاب لساته صغير بالعمر — Levanten lehçesi (لساته).
çıkarıldı s1745 [ar] نشالله هالسنة بتكون حلوة عليك — Levanten lehçesi (نشالله، هالسنة، بتكون).
çıkarıldı s1759 [ar] الزواج هو إلتزام لمدى الحياة. — إلتزام → التزام; 'sadakat' yerine 'bağlılık/yükümlülük'.
çıkarıldı s1767 [ar] للصراحة هذه ليست بالادق صحيحة — Cümle bozuk (بالادق صحيحة).
çıkarıldı s1768 [ar] عمل تقدم قليل بالغة الإنكيزية — Cümle bozuk (بالغة الإنكيزية → في اللغة الإنجليزية).
çıkarıldı s1770 [ar] أنتُما الإثنان تعالا إلى هنا. — الإثنان → الاثنان.
çıkarıldı s1772 [uygunsuz] دونالد ترامب كذاب بصفة مرضية. — Siyasi kişiye hakaret.
çıkarıldı s1789 [ar] غُرْفَتِي تُطِلْ على الشارِعْ. — Harekeleme hatalı: تُطِلْ yerine تُطِلُّ olmalı.
çıkarıldı s1810 [uygunsuz] لماذا لا يؤمن الملحدون بالإله؟ — Dinî/tartışmalı konu (ateizm).
çıkarıldı s1815 [ar] كنت خائفةً إلى درجة أنني أفكر. — Olumsuzluk eksik: أنني لا أفكر / لم أفكر olmalı; yazıldığı haliyle 'düşünüyorum' diyor.
çıkarıldı s1837 [ar] عاشت مع اباها اكثر من عشرون سنة — Dil bilgisi: مع أبيها ve أكثر من عشرين سنة olmalı.
çıkarıldı s1846 [ar] يالا الحسرة. لقد تأخرت من جديد. — Yazım: يالا الحسرة yerine يا للحسرة olmalı.
çıkarıldı s1862 [ar] لأن الكلاب أكثر وفاءًا من القطط. — Yazım: وفاءًا değil وفاءً.
çıkarıldı s1865 [ar] من يقرا كثـيراً يـعرِف كثــيراً. — يقرا hemzesiz (يقرأ), gereksiz tatvil (ـ) var.
çıkarıldı s1870 [ar] لم ينقاش توم عمله مع ماري بتاتا. — Yazım: لم ينقاش değil لم يناقش; لم = geçmiş zaman olumsuz.
çıkarıldı s1878 [uygunsuz] كان سامي يستطيع التلاعب بالنساء. — Kadınları manipüle etme; çocuklar için uygun değil.
çıkarıldı s1881 [uygunsuz] ماري كاثوليكية، لكن صديقها ملحد. — Yazım düzeltildi; dinî/tartışmalı konu.
çıkarıldı s1883 [ar] أختي تستطيع السباحة بسرعة كثيرة. — بسرعة كثيرة yanlış; بسرعة كبيرة olmalı.
çıkarıldı s1907 [ar] مرض السرطان هو عدو البشريه الأكبر — Yazım: البشريه değil البشرية.
çıkarıldı s1911 [ar] كان يأتي إلى هنا كي يتلقّ العلاج. — Yazım: يتلقّ değil يتلقّى.
çıkarıldı s1912 [ar] تكرر إنكار توم للاعتراف بالإساءة. — الإساءة = kötü davranış/kötülük, 'görevi kötüye kullanma' değil; Arapça yapı (إنكار للاعتراف) bozuk.
çıkarıldı s1913 [uygunsuz] حقق المحقق دان انديرسون مع ليندا. — حقق مع = sorguladı; Tatoeba'daki cinayet soruşturması dizisinden.
çıkarıldı s1931 [ar] أَنَا أَكْبَرٌ سِناً مِنْ أَخِيكَ. — Harekeleme: أَكْبَرٌ değil أَكْبَرُ (gayr-i munsarif).
çıkarıldı s1933 [ar] توم جعلني اقسم يمين ان لا أقول شيئ — Yazım/dil bilgisi: أُقسِم يمينًا ألّا أقول شيئًا olmalı.
çıkarıldı s1939 [ar] نجحت الحملة وفاز هو في الإنتخابات. — Yazım: الإنتخابات değil الانتخابات (vasl hemzesi).
çıkarıldı s1945 [ar] اللغات الهندية والأردية لغة واحدة. — Dil bilgisi: اللغتان الهندية والأردية olmalı; iddia da tartışmalı.
çıkarıldı s1951 [ar] الحبل تمدّد ثم عاد لحالته الطبيعة. — الطبيعة değil الطبيعية olmalı; Türkçede 'Ip' yazım hatası.
çıkarıldı s1959 [ar] لو كنتُ مكانك, كنتُ سأفعل نفس الشئ؟ — Arapçada yersiz soru işareti; الشئ değil الشيء.
çıkarıldı s1963 [ar] ربما يكون لدي رغبة من أجل فعل هذا . — Arapça yapay: رغبة من أجل فعل yerine رغبة في فعل olmalı.
çıkarıldı s1976 [ar] هذا المطعم يتقاضى سعر مختلف للسياح. — Dil bilgisi: سعرًا مختلفًا olmalı (mef'ul).
çıkarıldı s1982 [ar] بدء توم تعلم الفرنسية السنة الماضية. — Yazım: بدء değil بدأ.
çıkarıldı s1999 [ar] ألقيت نظرة داخل الغرفة و لم أرى أحدا. — Yazım: لم أرى değil لم أرَ.
çıkarıldı s2001 [ar] يوجد خدشة هنا، فهل تستطيع اعطائي حسم؟ — Dil bilgisi: يوجد خدشٌ / اعطائي حسمًا olmalı.
çıkarıldı s2003 [ar] تقابل الفريقين في المباراة النهائية . — Dil bilgisi: تقابل الفريقان olmalı.
çıkarıldı s2012 [ar] غرسنا بعض الأشجار في حديقنا الأمامية. — Yazım: حديقنا değil حديقتنا.
çıkarıldı s2016 [ar] لا أحد يدعوها ليلا. الكل يدعوها "أمي" — İsim ليلى yazılmalı; ليلا 'gece' diye okunabilir.
çıkarıldı s2017 [ar] بعدم كسرنا القلوب، فسيكون الله سعيدًا — Arapça bozuk ve anlamı belirsiz (بعدم كسرنا القلوب ...).
çıkarıldı s2019 [ar] ابتهج! أنا متأكد من أنهم سوف ينقذونا. — Dil bilgisi: سوف ينقذوننا olmalı.
çıkarıldı s2025 [uygunsuz] الإنفصاليون يتكلمون عن استعمال العنف. — الانفصاليون = ayrılıkçılar, 'boşananlar' değil; siyasi/şiddet içeriği. Arapçada hemze hatası (الإنفصاليون).
çıkarıldı s2032 [ar] الزهايمر مرض يحصل ببطئ وبدون الشعور به — Yazım: ببطئ değil ببطء.
çıkarıldı s2033 [ar] اي يوم من ايام هذا الاسبوع سوف تتحقق ؟ — Arapça belirsiz ve hemzesiz (أي يوم من أيام); سوف = gelecek zaman.
çıkarıldı s2054 [ar] الفتاة التي ترتدي فستانا أبيضا هي أختي. — Dil bilgisi: فستانًا أبيضَ olmalı (أبيض gayr-i munsarif).
çıkarıldı s2055 [ar] كان السير خانقاً ، فتأخرت على الإجتماع. — Yazım: الإجتماع değil الاجتماع.
çıkarıldı s2057 [ar] إشتريتُ ساعةً وأضعتها في اليومِ التالي. — Yazım: إشتريتُ değil اشتريتُ.
çıkarıldı s2068 [ar] أملك قطة وكلب. القطة سوداء و الكلب أبيض. — Dil bilgisi: قطةً وكلبًا olmalı.
çıkarıldı s2077 [ar] مانا الذي تضعه على شخص ما يحدد مكانه فيك — Arapça bozuk: مانا yerine المعنى الذي olmalı.
çıkarıldı s2078 [ar] لبَعيدُ عنِ العيْنِ، بَعيدٌ عَنِ القلْبِ — لبَعيدُ hatalı; البعيدُ olmalı.
çıkarıldı s2079 [ar] كان لاعبي كرة القدم متعبين لكنّهم سعداء. — Dil bilgisi: كان لاعبو كرة القدم olmalı.
çıkarıldı s2083 [ar] انه جميل لكن لا اظن انه يكون مناسب للسرير — مناسب للسرير = yatağa uygun; eski çeviri uygunsuz bir anlam taşıyordu. Arapçada مناسبًا olmalı, hemzeler eksik.
çıkarıldı s2094 [ar] ثَلاثٓةٌ أٓشْخاصٍ لَيَزَلونَ مٓفْقُودِينْ. — Harekeleme bozuk (ٓ işaretleri); لَيَزَلونَ yerine لا يَزالونَ olmalı.
çıkarıldı s2102 [ar] يبدو أن هذا المكان خالي نسبيًّا من التلوث. — Yazım: خالي değil خالٍ.
çıkarıldı s2110 [ar] جون وماري عطول بيمشوا وهنن ماسكين ايدين بعض — Şam lehçesi (عطول بيمشوا وهنن), fusha değil.
çıkarıldı s2116 [ar] قد أكون أفضل صديق لك . وقد أكون أسوء عدو لك — Yazım: أسوء değil أسوأ.
çıkarıldı s2125 [uygunsuz] بقي 3 مسافرين من 98 مسافر فقط على قيد الحياة — Felaket/ölüm içeriği; Arapçada 98 مسافرًا olmalı.
çıkarıldı s2129 [uygunsuz] إن الرجال هم سبب عدم حب النساء لبعضهنّ البعض. — Cinsiyetlere dair tartışmalı genelleme.
çıkarıldı s2141 [ar] أنتَ تكره| أنتِ تكرهين أفلام الرعب، أليس كذلك؟ — تكره = nefret etmek. Arapçada iki biçim '|' ile birleşik yazılmış (erkeğe/kadına).
çıkarıldı s2144 [ar] هل لديه بطاقة شخصية (هوية شخصية - بطاقة تعريف) — لديه = onun (erkek), 'senin' değil; Arapçada parantez içinde eş anlamlılar var.
çıkarıldı s2149 [ar] من شأن هذا الدواء أن يخفف من شأن حدة صداع رأسك. — يخفف = hafifletir, 'geçirir' değil; Arapçada من شأن gereksiz tekrarlanmış.
çıkarıldı s2151 [ar] أَسَّسَ اْلشَّرِيفُ النَّاظِمَ فِي اْلبَلْدَةِ. — النَّاظِمَ yanlış; النِّظامَ olmalı; اْلشَّرِيفُ yazımı da hatalı.
çıkarıldı s2152 [ar] أمي، قلت لأبي وأختي أنا سنخرج في عطلة مع بعضنا. — أمي burada hitap (Anne,); Arapçada أنا yerine أننا olmalı.
çıkarıldı s2156 [uygunsuz] لفلسطين حق لا نزاع فيه من أجل الدّفاع عن ترابها. — Siyasi içerik.
çıkarıldı s2159 [ar] هؤلاء الذين لا يردنا الذهاب، لا ضرورة لهم الذهاب. — Arapça bozuk: الذين لا يريدون الذهاب، لا ضرورة لذهابهم olmalı.
çıkarıldı s2165 [ar] تستطيع معالجة السرطان اذا أكتشف في المراحل الأولى. — Türkçe yazım: aşamda → aşamada. Arapçada اكتشف yerine اُكتُشِف olmalı.
çıkarıldı s2177 [ar] أرفض رفضاّ تاما من أن أكون طرفاً بهذه اللعبة القذرة. — القذرة (kirli) eksikti. Arapçada رفضاّ yazım hatası, من أن gereksiz.
çıkarıldı s2185 [uygunsuz] طُرد توم من منزله من طرف والديه عندما اعترف بأنه ملحد. — Dinî/tartışmalı, aile içi kovulma.
çıkarıldı s2192 [uygunsuz] يعتقد بوش بأنه مرسل من الله ليقيم العدالة على وجه الأرض. — Siyasi/dinî tartışmalı içerik; 'için' eksikti.
çıkarıldı s2197 [ar] أن الممرضة المسؤولة عن هذا الطابق. نادِني في حال احتجتني. — Yazım: أن değil أنا.
çıkarıldı s2199 [ar] ٠ دَرَسَ ابْنُ سِيناَ أَكْثَرَ مِنْ اثْنَيْ عَشَرَ عِلْماً — Cümle başında gereksiz '٠' işareti; Türkçede '12 den' yazım hatası.
çıkarıldı s2202 [ar] ستخسر كثير من الوزن إذا مارست الرياضة كل يوم لمدة ١٥ دقيقة. — Dil bilgisi: كثيرًا من الوزن olmalı.
çıkarıldı s2210 [ar] "الآن أنا حزينة، بلا أمل، هو سعيد ومتفائل" عائشة جوقلب - وداعا — Şarkı sözü; Arapçada sanatçı ve şarkı adı cümleye karışmış.
çıkarıldı s2211 [uygunsuz] كَانَ يَهُوداً في دُوَلٍ عَرَبيَّةٍ قَبلَ تَقسِيمِ فَلَسطِينِ. — Siyasi/tartışmalı konu; ayrıca Arapça hatalı: كان هناك يهودٌ olmalı.
çıkarıldı s2212 [uygunsuz] هيه! ذاك أمريكي يتحدث الأويغورية! أسرع وتعال هنا لتفتيش حاسوبه! — Siyasi içerik (gözetim). تفتيش = aramak.
çıkarıldı s2214 [ar] المنزل الأصفر واحداً من أفضل الكتب التي قرأئتها منذ فترة طويلة. — Dil bilgisi/yazım: واحدٌ ve قرأتها olmalı.
çıkarıldı s2217 [uygunsuz] هو يتكلم خمس لغات أجنبية، لكن إذا أراد أن يشتم يتحدث بلغته الأم. — Küfür konusu; لغته الأم = ana dili, 'annesinin dili' değil.
çıkarıldı s2223 [uygunsuz] هل تعلم أن الرجال الذين يتناولون حبوب منع الحمل بانتظام لا يحمِلُون؟ — Doğum kontrolü/hamilelik konusu.
çıkarıldı s2225 [uygunsuz] أعرف ملحدين لديهم من الإنسانية أكثر من كل هؤلاء المتدينين والاشتراكيين. — Dinî/siyasi tartışmalı; eski çeviri genelleme yapıyordu, Arapça 'tanıdığım ateistler' diyor.
çıkarıldı s2226 [uygunsuz] "ما هو دينك؟ المسيحية؟ اليهودية؟ البوذية؟ أم أنك ملحد" "لا، أنا فكاهي!" — Dinî tartışmalı mizah; tırnaklar düzeltildi.
çıkarıldı s2230 [uygunsuz] قال البابا فرانسيس إن الملحدين الذين يفعلون الخير سيذهبون إلى الجنة أيضًا. — Dinî tartışmalı konu; yazım düzeltildi.
çıkarıldı s2233 [ar] اركض من مدينة إلى أخرى، وأذهب من قرية إلي أخرى لكن لا أتحزك أبداً " "الطريق ". — Yazım: أتحزك değil أتحرك, إلي değil إلى.
çıkarıldı s2234 [ar] كان هناك كرسي ‘‘ كرسي من دون ظهر ويكون مصنوع من الخشب والقش او القصب‘‘ واحد فقط — Arapçada cümle içine sözlük açıklaması karışmış.
çıkarıldı s2235 [uygunsuz] وفقًا لمثل إسباني، يجب ألا تقرأ الإنجيل أبدًا، إلا إذا كنت تريد أن تصبح ملحداً. — Dinî tartışmalı içerik.
çıkarıldı s2237 [ar] لست بمسلم ، ولا علي الصيام، ولكن ما دمت أسكن في نفس الشقة فمراعة هذا التقليد مهم. — ولا عليّ الصيام = oruç bana farz değil, 'tutmamalıyım' değil. Arapçada فمراعة yerine فمراعاة.```
