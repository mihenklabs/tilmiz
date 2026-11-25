# Ar↔Tr çeviri modeli karşılaştırması

- **Opus-MT ar→tr**: 77M parametre (fp32 ≈ 308 MB, int8 ≈ 77 MB), cümle başı 0.17 sn (masaüstü CPU)
- **M2M100-418M ar→tr**: 484M parametre (fp32 ≈ 1936 MB, int8 ≈ 484 MB), cümle başı 1.21 sn (masaüstü CPU)
- **Opus-MT tr→ar**: 77M parametre (fp32 ≈ 308 MB, int8 ≈ 77 MB), cümle başı 0.32 sn (masaüstü CPU)
- **M2M100-418M tr→ar**: 484M parametre (fp32 ≈ 1936 MB, int8 ≈ 484 MB), cümle başı 1.35 sn (masaüstü CPU)

## Arapça → Türkçe

| Arapça | Uygulamadaki çeviri | Opus-MT | M2M100 |
|---|---|---|---|
| السَّلَامُ عَلَيْكُمْ. | Selamünaleyküm. | Barış sizin üzerinizde. | Selam olsun sizlere. |
| بِخَيْرٍ، الْحَمْدُ لِلّٰهِ. وَأَنْتَ؟ | İyiyim, elhamdülillah. Ya sen? | - İyi, Tanrıya şükür. | Yüce Allah’a göre, sen ne yapıyorsun? |
| اِسْمِي أَحْمَدُ، وَأَنْتَ؟ | Adım Ahmed, ya sen? | Benim adım Hamt, ya sen? | Benim adım Yavuz, sen mi? |
| أَنَا مِنْ تُرْكِيَا. | Türkiye’denim. | Ben Türkiye'den geliyorum. | Ben de bıraktım. |
| عِنْدِي أَخَوَانِ وَأُخْتٌ وَاحِدَةٌ. | İki erkek kardeşim ve bir kız kardeşim var. | Bir erkek ve bir kız kardeşim var. | Benim için bir kardeşim ve bir kardeşim. |
| هَلْ عِنْدَكَ قَلَمٌ؟ | Kalemin var mı? | Kalemin var mı? | Sizin için bir şey var mı? |
| يَبْدَأُ فِي السَّاعَةِ التَّاسِعَةِ. | Saat dokuzda başlıyor. | Saat dokuzda başlıyor. | 9 Eylül’de başlıyor. |
| السَّاعَةُ الثَّالِثَةُ وَالنِّصْفُ. | Saat üç buçuk. | Saat 3 buçuk. | Üçüncü ve üçüncü sırada yer alıyor. |
| هَلْ صَلَّيْتَ الظُّهْرَ؟ | Öğle namazını kıldın mı? | Sırtın için dua ettin mi? | Geceleri mi dua ediyorsun? |
| إِنْ شَاءَ اللّٰهُ. | İnşallah. | Tanrı'nın izniyle. | Tanrı isterse. |
| هَلْ هُوَ بَعِيدٌ؟ | Uzak mı? | Uzak mı? | Bu çok uzakta mı? |
| بِكَمْ هٰذَا؟ | Bu kaça? | Bu ne kadar? | Bu ne kadar? |
| خُذْهُ بِخَمْسَةَ عَشَرَ. | On beşe al. | Beşte bir al. | 10’a kadar çıkıyor. |
| أُرِيدُ دَجَاجًا وَأَرُزًّا. | Tavuk ve pilav istiyorum. | Ben tavuk istiyorum. | İstiyorum ve bekliyorum. |
| إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ | Ameller ancak niyetlere göredir. | Sadece amaçlar için çalışmak. | Yine de işler yapıyor. |
| الدِّينُ النَّصِيحَةُ | Din samimiyettir (nasihattir). | "İhtiyatlı Din" | Danışmanlık Dini |
| لَا يُؤْمِنُ أَحَدُكُمْ حَتَّى يُحِبَّ لِأَخِيهِ مَا يُحِبُّ لِنَفْسِهِ | Sizden biri, kendisi için istediğini kardeşi için de istemedikçe gerçek anlamda iman etmiş olmaz. | Hiç biriniz, kardeşine ait olan şeyleri kendisi için sevene kadar iman etmeyin | Kardeşlerinizin sevdiği şeyleri sevmediğinize inanmayın |
| الْمُسْلِمُ مَنْ سَلِمَ الْمُسْلِمُونَ مِنْ لِسَانِهِ وَيَدِهِ | Müslüman, dilinden ve elinden Müslümanların güvende olduğu kimsedir. | Barışçıları dilinden ve elinden teslim eden barışçıdır | Kendi elinden tuttuğunu söyleyen Müslümanlar |

## Türkçe → Arapça

| Türkçe | Uygulamadaki Arapça | Opus-MT | M2M100 |
|---|---|---|---|
| Selamünaleyküm. | السَّلَامُ عَلَيْكُمْ. | السلام عليكم | السلام عليكم |
| İyiyim, elhamdülillah. Ya sen? | بِخَيْرٍ، الْحَمْدُ لِلّٰهِ. وَأَنْتَ؟ | أنا بخير، شكراً للرب، وأنت؟ | أهلا بك يا أهلا بك يا أهلا بك؟ |
| Adım Ahmed, ya sen? | اِسْمِي أَحْمَدُ، وَأَنْتَ؟ | اسمي (أحمد)، ماذا عنك؟ | اسمي أحمد، ماذا عنك؟ |
| Türkiye’denim. | أَنَا مِنْ تُرْكِيَا. | انا من تركيا . | من تركيا . |
| İki erkek kardeşim ve bir kız kardeşim var. | عِنْدِي أَخَوَانِ وَأُخْتٌ وَاحِدَةٌ. | لدي أخان وأخت | ولدي اثنين من الإخوة وأختي. |
| Kalemin var mı? | هَلْ عِنْدَكَ قَلَمٌ؟ | هل لديك قلم؟ | هل هناك قلم؟ |
| Saat dokuzda başlıyor. | يَبْدَأُ فِي السَّاعَةِ التَّاسِعَةِ. | تبدأ الساعة التاسعة | يبدأ في الساعة التاسعة. |
| Saat üç buçuk. | السَّاعَةُ الثَّالِثَةُ وَالنِّصْفُ. | إنها الثالثة والنصف | الساعة الثالثة والنصف. |
| Öğle namazını kıldın mı? | هَلْ صَلَّيْتَ الظُّهْرَ؟ | هل قمتِ بالصلاة؟ | هل صلّيت بعد الظهر؟ |
| İnşallah. | إِنْ شَاءَ اللّٰهُ. | أتمنى ذلك | أتمنى . |
| Uzak mı? | هَلْ هُوَ بَعِيدٌ؟ | هل هو بعيد؟ | هل بعيد؟ |
| Bu kaça? | بِكَمْ هٰذَا؟ | كم سعره؟ | كم هذا؟ |
| On beşe al. | خُذْهُ بِخَمْسَةَ عَشَرَ. | خمسة عشر. | خذ خمسة عشر. |
| Tavuk ve pilav istiyorum. | أُرِيدُ دَجَاجًا وَأَرُزًّا. | أريد دجاجاً وأرزاً | أريد الدجاج والأرز. |
| Ameller ancak niyetlere göredir. | إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ | -الضرر هو النوايا فقط | لا يُعرف سوى النوايا. |
| Din samimiyettir (nasihattir). | الدِّينُ النَّصِيحَةُ | الدين هو الصدق (النصيحة) | وَالْمُؤْمِنُونَ الَّذِينَ كَفَرُوا وَالَّذِينَ كَفَرُوا |
| Sizden biri, kendisi için istediğini kardeşi için de istemedikçe gerçek anlamda iman etmiş olmaz. | لَا يُؤْمِنُ أَحَدُكُمْ حَتَّى يُحِبَّ لِأَخِيهِ مَا يُحِبُّ لِنَفْسِهِ | فَلَنْ يَكُونَ ٱلْمَسِيحِيُّونَ مُؤْمِنِينَ حَقًّا إِذَا لَمْ يُرِيدُوا أَنْ يُرِيدُوا أَنْ يَفْعَلُ | لا يؤمن أحد منكم إلا إذا أراد ما يريد من أخيه. |
| Müslüman, dilinden ve elinden Müslümanların güvende olduğu kimsedir. | الْمُسْلِمُ مَنْ سَلِمَ الْمُسْلِمُونَ مِنْ لِسَانِهِ وَيَدِهِ | المسلم هو الشخص الذي يأمن لسانه ويديه | ومنهم المسلمون الذين يظلمون ويظلمون ويظلمون ويظلمون. |
