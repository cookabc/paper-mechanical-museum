from PIL import Image,ImageDraw,ImageFont
from pathlib import Path
import os
p=Path(__file__).resolve().parent
regular=os.environ.get('MUSEUM_FONT_REGULAR','/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc')
bold=os.environ.get('MUSEUM_FONT_BOLD',regular if 'MUSEUM_FONT_REGULAR' in os.environ else '/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc')
if not Path(regular).is_file() or not Path(bold).is_file():
 raise SystemExit('Set MUSEUM_FONT_REGULAR and MUSEUM_FONT_BOLD to installed Chinese-capable font files. This optional collage tool also requires your own captured JPG inputs; they are not bundled.')
f=ImageFont.truetype(regular,28)
fb=ImageFont.truetype(bold,34)
items=[('八音盒 · 针齿联动','musicbox-final.jpg'),('吐司机 · 加热与取消','toaster-heating.jpg'),('唱片机 · 落针与转速','turntable-playing.jpg'),('洗衣机 · 暂停保留进度','washer-paused.jpg'),('电风扇 · 断电后惯性','fan-coasting.jpg'),('抓娃娃机 · 落空后重瞄','claw-miss-final.jpg')]
w,h=1173,751;gap=20;top=92
im=Image.new('RGB',(w*2+gap*3,(h+55)*3+top+gap*4),'#f5f0e7');d=ImageDraw.Draw(im)
d.text((gap,20),'纸上机械馆 · 六件可选原理观察',font=fb,fill='#26231f')
d.text((gap,63),'候选验收 · 默认自由玩不变 · 尚未发布',font=f,fill='#786e61')
for i,(label,name) in enumerate(items):
 x=gap+(i%2)*(w+gap);y=top+gap+(i//2)*(h+55+gap)
 d.text((x,y),label,font=f,fill='#26231f');im.paste(Image.open(p/name).convert('RGB'),(x,y+45))
im.save(p/'six-principles-desktop-collage.png')
# Narrow layout contact preserves screenshot content, no simulated UI.
names=['musicbox','toaster','turntable','washer','fan','claw'];labels=['八音盒','吐司机','唱片机','洗衣机','风扇','抓娃娃机']
im=Image.new('RGB',(2400,805),'#f5f0e7');d=ImageDraw.Draw(im)
for i,(n,l) in enumerate(zip(names,labels)):
 d.text((i*400+12,6),l+' · 390像素',font=f,fill='#26231f')
 shot=Image.open(p/f'mobile-{n}.jpg').crop((0,0,390,751));im.paste(shot,(i*400,48))
im.save(p/'six-principles-mobile-collage.png')
