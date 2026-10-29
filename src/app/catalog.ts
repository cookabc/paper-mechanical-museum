/** One catalogue order and editorial voice, from the entrance to each workbench. */
export const catalog = [
 {id:'washer',name:'洗衣机',nameEn:'Washing Machine',category:'日常',caption:'洗涤的微型宇宙',invitation:'装衣 · 加料 · 看滚筒转起来',mechanism:'水流 / 滚筒 / 洗涤',color:'#e6bd54'},
 {id:'fan',name:'电风扇',nameEn:'Electric Fan',category:'日常',caption:'让夏天慢一点',invitation:'开机 · 换挡 · 让风摇摇头',mechanism:'电机 / 风叶 / 摇头',color:'#a8c9b0'},
 {id:'claw',name:'抓娃娃机',nameEn:'Claw Machine',category:'游乐',caption:'把快乐抓在手里',invitation:'瞄准 · 下爪 · 领取小伙伴',mechanism:'瞄准 / 下爪 / 惊喜',color:'#dba4b4'},
 {id:'coffee',name:'咖啡机',nameEn:'Coffee Machine',category:'日常',caption:'认真做一杯小事',invitation:'研磨 · 萃取 · 加一点奶泡',mechanism:'研磨 / 萃取 / 奶泡',color:'#a8c9b0'},
 {id:'musicbox',name:'手摇八音盒',nameEn:'Hand-crank Music Box',category:'声音',caption:'把旋律藏进齿轮',invitation:'转动手柄 · 唤醒一首小曲',mechanism:'摇柄 / 凸针 / 音梳',color:'#d3bc89'},
 {id:'vending',name:'自动售货机',nameEn:'Vending Machine',category:'游乐',caption:'一枚代币的期待',invitation:'投币 · 选择 · 等惊喜掉下来',mechanism:'投币 / 释放 / 取物',color:'#e6bd54'},
 {id:'toaster',name:'烤面包机',nameEn:'Toaster',category:'日常',caption:'等待一声香脆的叮',invitation:'放面包 · 调火候 · 压下拉杆',mechanism:'加热 / 计时 / 弹起',color:'#df9b83'},
 {id:'turntable',name:'唱片机',nameEn:'Record Player',category:'声音',caption:'给时间换个转速',invitation:'放下唱臂 · 听唱片慢慢转',mechanism:'唱片 / 唱臂 / 旋律',color:'#b4bfcd'},
 {id:'camera',name:'拍立得相机',nameEn:'Instant Camera',category:'游乐',caption:'把一瞬间留在纸上',invitation:'按快门 · 等显影 · 收藏风景',mechanism:'快门 / 送纸 / 显影',color:'#a8bcd7'},
 {id:'elevator',name:'电梯',nameEn:'Elevator',category:'游乐',caption:'上下之间的小旅行',invitation:'选楼层 · 开关门 · 看轿厢升降',mechanism:'曳引 / 配重 / 门锁',color:'#a8bcd7'},
 {id:'bicycle',name:'自行车变速器',nameEn:'Bicycle Derailleur',category:'日常',caption:'把力气，换成远方',invitation:'踩踏 · 换挡 · 选对爬坡的节奏',mechanism:'齿盘 / 链条 / 飞轮',color:'#b3cba6'},
 {id:'generator',name:'手摇发电机',nameEn:'Hand-crank Generator',category:'日常',caption:'一圈手摇，一点光',invitation:'摇动 · 反向 · 看见电流的节奏',mechanism:'线圈 / 磁场 / 电流',color:'#d6b783'},
] as const;

export type CatalogEntry = typeof catalog[number];

export function catalogNumber(id:string) {
 const index=catalog.findIndex(item=>item.id===id);
 return index<0?'—':String(index+1).padStart(2,'0');
}
