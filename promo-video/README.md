# فيديو إعلاني — طقم الساعة والقلم والمسبحة

الفيديو النهائي: `output/promo.mp4` (‏20 ثانية، 1080×1920 عمودي، 30 إطار/ث، مع موسيقى هادئة).

## المشاهد
| الوقت | المشهد |
|---|---|
| 0 – 2.8 ث | صورة البوكس مع تقريب بطيء ونص «هدية تليق بك» |
| 2.8 – 8 ث | رجل سعودي (ثوب وشماغ وعقال) يُخرج الساعة من البوكس ويلبسها في معصمه |
| 8 – 11.5 ث | يُخرج القلم ويضعه في جيب الثوب |
| 11.5 – 17 ث | يُخرج المسبحة ويمسكها بيده وهو يبتسم |
| 17 – 20 ث | صورة البوكس مع «ساعة • قلم • مسبحة» وزر «اطلبها الآن» |

## إعادة التوليد
```bash
mkdir -p build output
python3 music.py build/music.wav                       # الموسيقى
NODE_PATH=$(npm root -g) node render.js build/video.mp4 # الرسوم (يتطلب playwright و ffmpeg)
ffmpeg -y -i build/video.mp4 -i build/music.wav -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart output/promo.mp4
```
للمعاينة الحية افتح `animation.html` عبر خادم محلي (مثلاً `npx http-server`).
النصوص والتوقيتات قابلة للتعديل داخل `animation.html`.
