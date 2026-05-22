// ============================================================
// Airport Database — 主要城市及机场数据（含拼音、简拼）
// 每个城市的每个机场均为独立条目，支持多维度模糊搜索
// ============================================================

const AIRPORT_DB = [
  // ——— 中国主要城市 ———
  { code:'PEK', city:'北京', cityPinyin:'beijing', cityShort:'bj', name:'北京首都国际机场' },
  { code:'PKX', city:'北京', cityPinyin:'beijing', cityShort:'bj', name:'北京大兴国际机场' },
  { code:'PVG', city:'上海', cityPinyin:'shanghai', cityShort:'sh', name:'上海浦东国际机场' },
  { code:'SHA', city:'上海', cityPinyin:'shanghai', cityShort:'sh', name:'上海虹桥国际机场' },
  { code:'CAN', city:'广州', cityPinyin:'guangzhou', cityShort:'gz', name:'广州白云国际机场' },
  { code:'SZX', city:'深圳', cityPinyin:'shenzhen', cityShort:'sz', name:'深圳宝安国际机场' },
  { code:'TFU', city:'成都', cityPinyin:'chengdu', cityShort:'cd', name:'成都天府国际机场' },
  { code:'CTU', city:'成都', cityPinyin:'chengdu', cityShort:'cd', name:'成都双流国际机场' },
  { code:'CKG', city:'重庆', cityPinyin:'chongqing', cityShort:'cq', name:'重庆江北国际机场' },
  { code:'HGH', city:'杭州', cityPinyin:'hangzhou', cityShort:'hz', name:'杭州萧山国际机场' },
  { code:'XIY', city:'西安', cityPinyin:'xian', cityShort:'xa', name:'西安咸阳国际机场' },
  { code:'WUH', city:'武汉', cityPinyin:'wuhan', cityShort:'wh', name:'武汉天河国际机场' },
  { code:'NKG', city:'南京', cityPinyin:'nanjing', cityShort:'nj', name:'南京禄口国际机场' },
  { code:'KMG', city:'昆明', cityPinyin:'kunming', cityShort:'km', name:'昆明长水国际机场' },
  { code:'CSX', city:'长沙', cityPinyin:'changsha', cityShort:'cs', name:'长沙黄花国际机场' },
  { code:'XMN', city:'厦门', cityPinyin:'xiamen', cityShort:'xm', name:'厦门高崎国际机场' },
  { code:'TAO', city:'青岛', cityPinyin:'qingdao', cityShort:'qd', name:'青岛胶东国际机场' },
  { code:'DLC', city:'大连', cityPinyin:'dalian', cityShort:'dl', name:'大连周水子国际机场' },
  { code:'TSN', city:'天津', cityPinyin:'tianjin', cityShort:'tj', name:'天津滨海国际机场' },
  { code:'CGO', city:'郑州', cityPinyin:'zhengzhou', cityShort:'zz', name:'郑州新郑国际机场' },
  { code:'SYX', city:'三亚', cityPinyin:'sanya', cityShort:'sya', name:'三亚凤凰国际机场' },
  { code:'HAK', city:'海口', cityPinyin:'haikou', cityShort:'hk', name:'海口美兰国际机场' },
  { code:'HRB', city:'哈尔滨', cityPinyin:'haerbin', cityShort:'heb', name:'哈尔滨太平国际机场' },
  { code:'SHE', city:'沈阳', cityPinyin:'shenyang', cityShort:'sy', name:'沈阳桃仙国际机场' },
  { code:'FOC', city:'福州', cityPinyin:'fuzhou', cityShort:'fz', name:'福州长乐国际机场' },
  { code:'KWE', city:'贵阳', cityPinyin:'guiyang', cityShort:'gy', name:'贵阳龙洞堡国际机场' },
  { code:'NNG', city:'南宁', cityPinyin:'nanning', cityShort:'nn', name:'南宁吴圩国际机场' },
  { code:'URC', city:'乌鲁木齐', cityPinyin:'wulumuqi', cityShort:'wlmq', name:'乌鲁木齐地窝堡国际机场' },
  { code:'LHW', city:'兰州', cityPinyin:'lanzhou', cityShort:'lz', name:'兰州中川国际机场' },
  { code:'TYN', city:'太原', cityPinyin:'taiyuan', cityShort:'ty', name:'太原武宿国际机场' },
  { code:'HET', city:'呼和浩特', cityPinyin:'huhehaote', cityShort:'hhht', name:'呼和浩特白塔国际机场' },
  { code:'SJW', city:'石家庄', cityPinyin:'shijiazhuang', cityShort:'sjz', name:'石家庄正定国际机场' },
  { code:'TNA', city:'济南', cityPinyin:'jinan', cityShort:'jn', name:'济南遥墙国际机场' },
  { code:'CGQ', city:'长春', cityPinyin:'changchun', cityShort:'cc', name:'长春龙嘉国际机场' },
  { code:'KHN', city:'南昌', cityPinyin:'nanchang', cityShort:'nc', name:'南昌昌北国际机场' },
  { code:'HFE', city:'合肥', cityPinyin:'hefei', cityShort:'hf', name:'合肥新桥国际机场' },
  { code:'KWL', city:'桂林', cityPinyin:'guilin', cityShort:'gl', name:'桂林两江国际机场' },
  { code:'WNZ', city:'温州', cityPinyin:'wenzhou', cityShort:'wz', name:'温州龙湾国际机场' },
  { code:'NGB', city:'宁波', cityPinyin:'ningbo', cityShort:'nb', name:'宁波栎社国际机场' },
  { code:'WEH', city:'威海', cityPinyin:'weihai', cityShort:'wh2', name:'威海大水泊国际机场' },
  { code:'YNT', city:'烟台', cityPinyin:'yantai', cityShort:'yt', name:'烟台蓬莱国际机场' },
  { code:'WUX', city:'无锡', cityPinyin:'wuxi', cityShort:'wx', name:'无锡硕放机场' },
  { code:'LYI', city:'临沂', cityPinyin:'linyi', cityShort:'ly', name:'临沂启阳机场' },
  { code:'LJG', city:'丽江', cityPinyin:'lijiang', cityShort:'lj', name:'丽江三义国际机场' },
  { code:'JHG', city:'西双版纳', cityPinyin:'xishuangbanna', cityShort:'xsbn', name:'西双版纳嘎洒国际机场' },
  { code:'DYG', city:'张家界', cityPinyin:'zhangjiajie', cityShort:'zjj', name:'张家界荷花国际机场' },
  { code:'DOY', city:'东营', cityPinyin:'dongying', cityShort:'dy', name:'东营胜利机场' },

  // ——— 港澳台 ———
  { code:'HKG', city:'香港', cityPinyin:'xianggang', cityShort:'xg', name:'香港国际机场' },
  { code:'MFM', city:'澳门', cityPinyin:'aomen', cityShort:'am', name:'澳门国际机场' },
  { code:'TPE', city:'台北', cityPinyin:'taibei', cityShort:'tb', name:'台北桃园国际机场' },
  { code:'TSA', city:'台北', cityPinyin:'taibei', cityShort:'tb', name:'台北松山机场' },
  { code:'KHH', city:'高雄', cityPinyin:'gaoxiong', cityShort:'gx', name:'高雄国际机场' },

  // ——— 东北亚 ———
  { code:'NRT', city:'东京', cityPinyin:'dongjing', cityShort:'dj', name:'东京成田国际机场' },
  { code:'HND', city:'东京', cityPinyin:'dongjing', cityShort:'dj', name:'东京羽田机场' },
  { code:'KIX', city:'大阪', cityPinyin:'daban', cityShort:'db', name:'大阪关西国际机场' },
  { code:'ITM', city:'大阪', cityPinyin:'daban', cityShort:'db', name:'大阪伊丹机场' },
  { code:'CTS', city:'札幌', cityPinyin:'zhahuang', cityShort:'zh2', name:'札幌新千岁机场' },
  { code:'FUK', city:'福冈', cityPinyin:'fugang', cityShort:'fg', name:'福冈机场' },
  { code:'NGO', city:'名古屋', cityPinyin:'mingguwu', cityShort:'mgw', name:'名古屋中部国际机场' },
  { code:'OKA', city:'冲绳', cityPinyin:'chongsheng', cityShort:'cs2', name:'那霸机场' },
  { code:'ICN', city:'首尔', cityPinyin:'shouer', cityShort:'se', name:'首尔仁川国际机场' },
  { code:'GMP', city:'首尔', cityPinyin:'shouer', cityShort:'se', name:'首尔金浦国际机场' },
  { code:'PUS', city:'釜山', cityPinyin:'fushan', cityShort:'fs', name:'釜山金海国际机场' },
  { code:'CJU', city:'济州', cityPinyin:'jizhou', cityShort:'jz', name:'济州国际机场' },

  // ——— 东南亚 ———
  { code:'SIN', city:'新加坡', cityPinyin:'xinjiapo', cityShort:'xjp', name:'新加坡樟宜机场' },
  { code:'BKK', city:'曼谷', cityPinyin:'manggu', cityShort:'mg', name:'曼谷素万那普机场' },
  { code:'DMK', city:'曼谷', cityPinyin:'manggu', cityShort:'mg', name:'曼谷廊曼机场' },
  { code:'HKT', city:'普吉岛', cityPinyin:'pujidao', cityShort:'pjd', name:'普吉岛国际机场' },
  { code:'CNX', city:'清迈', cityPinyin:'qingmai', cityShort:'qm', name:'清迈国际机场' },
  { code:'KUL', city:'吉隆坡', cityPinyin:'jilongpo', cityShort:'jlp', name:'吉隆坡国际机场' },
  { code:'MNL', city:'马尼拉', cityPinyin:'manila', cityShort:'mnl2', name:'马尼拉尼诺伊·阿基诺国际机场' },
  { code:'SGN', city:'胡志明市', cityPinyin:'huzhimingshi', cityShort:'hzms', name:'胡志明市新山一国际机场' },
  { code:'HAN', city:'河内', cityPinyin:'henei', cityShort:'hn2', name:'河内内排国际机场' },
  { code:'DAD', city:'岘港', cityPinyin:'xiangang', cityShort:'xg2', name:'岘港国际机场' },
  { code:'CGK', city:'雅加达', cityPinyin:'yajiada', cityShort:'yjd', name:'雅加达苏加诺-哈达国际机场' },
  { code:'DPS', city:'巴厘岛', cityPinyin:'balidao', cityShort:'bld', name:'巴厘岛伍拉·赖国际机场' },
  { code:'RGN', city:'仰光', cityPinyin:'yangguang', cityShort:'yg', name:'仰光国际机场' },
  { code:'PNH', city:'金边', cityPinyin:'jinbian', cityShort:'jb', name:'金边国际机场' },

  // ——— 中东 & 南亚 ———
  { code:'DXB', city:'迪拜', cityPinyin:'dibai', cityShort:'db2', name:'迪拜国际机场' },
  { code:'AUH', city:'阿布扎比', cityPinyin:'abuzhabi', cityShort:'abz', name:'阿布扎比国际机场' },
  { code:'DOH', city:'多哈', cityPinyin:'duoha', cityShort:'dh', name:'多哈哈马德国际机场' },
  { code:'IST', city:'伊斯坦布尔', cityPinyin:'yisitanbuer', cityShort:'ystbe', name:'伊斯坦布尔机场' },
  { code:'DEL', city:'德里', cityPinyin:'deli', cityShort:'dl2', name:'德里英迪拉·甘地国际机场' },
  { code:'BOM', city:'孟买', cityPinyin:'mengmai', cityShort:'mm', name:'孟买贾特拉帕蒂·希瓦吉国际机场' },
  { code:'MLE', city:'马尔代夫', cityPinyin:'maerdaifu', cityShort:'medf', name:'马累维拉纳国际机场' },

  // ——— 欧洲 ———
  { code:'LHR', city:'伦敦', cityPinyin:'lundun', cityShort:'ld', name:'伦敦希思罗机场' },
  { code:'LGW', city:'伦敦', cityPinyin:'lundun', cityShort:'ld', name:'伦敦盖特威克机场' },
  { code:'CDG', city:'巴黎', cityPinyin:'bali', cityShort:'bl', name:'巴黎戴高乐机场' },
  { code:'FRA', city:'法兰克福', cityPinyin:'falankefu', cityShort:'flkf', name:'法兰克福机场' },
  { code:'MUC', city:'慕尼黑', cityPinyin:'munihei', cityShort:'mnh', name:'慕尼黑机场' },
  { code:'AMS', city:'阿姆斯特丹', cityPinyin:'amusitedan', cityShort:'amstd', name:'阿姆斯特丹史基浦机场' },
  { code:'FCO', city:'罗马', cityPinyin:'luoma', cityShort:'lm', name:'罗马菲乌米奇诺机场' },
  { code:'MXP', city:'米兰', cityPinyin:'milan', cityShort:'ml', name:'米兰马尔彭萨机场' },
  { code:'MAD', city:'马德里', cityPinyin:'madeli', cityShort:'mdl', name:'马德里巴拉哈斯机场' },
  { code:'BCN', city:'巴塞罗那', cityPinyin:'basailuona', cityShort:'bslna', name:'巴塞罗那埃尔普拉特机场' },
  { code:'ZRH', city:'苏黎世', cityPinyin:'sulishi', cityShort:'sls', name:'苏黎世机场' },
  { code:'BRU', city:'布鲁塞尔', cityPinyin:'bulusaier', cityShort:'blse', name:'布鲁塞尔机场' },
  { code:'VIE', city:'维也纳', cityPinyin:'weiyena', cityShort:'wyn', name:'维也纳国际机场' },
  { code:'PRG', city:'布拉格', cityPinyin:'bulage', cityShort:'blg', name:'布拉格瓦茨拉夫·哈维尔机场' },
  { code:'CPH', city:'哥本哈根', cityPinyin:'gebenhagen', cityShort:'gbhg', name:'哥本哈根凯斯楚普机场' },
  { code:'ARN', city:'斯德哥尔摩', cityPinyin:'sidegeermo', cityShort:'sdgem', name:'斯德哥尔摩阿兰达机场' },
  { code:'HEL', city:'赫尔辛基', cityPinyin:'heerxinji', cityShort:'hexj', name:'赫尔辛基万塔机场' },
  { code:'SVO', city:'莫斯科', cityPinyin:'mosike', cityShort:'msk', name:'莫斯科谢列梅捷沃机场' },
  { code:'DME', city:'莫斯科', cityPinyin:'mosike', cityShort:'msk', name:'莫斯科多莫杰多沃机场' },

  // ——— 北美 ———
  { code:'JFK', city:'纽约', cityPinyin:'niuyue', cityShort:'ny', name:'纽约肯尼迪国际机场' },
  { code:'EWR', city:'纽约', cityPinyin:'niuyue', cityShort:'ny', name:'纽约纽瓦克自由国际机场' },
  { code:'LAX', city:'洛杉矶', cityPinyin:'luoshanji', cityShort:'lsj', name:'洛杉矶国际机场' },
  { code:'SFO', city:'旧金山', cityPinyin:'jiujinshan', cityShort:'jjs', name:'旧金山国际机场' },
  { code:'ORD', city:'芝加哥', cityPinyin:'zhijiage', cityShort:'zjg', name:'芝加哥奥黑尔国际机场' },
  { code:'LAS', city:'拉斯维加斯', cityPinyin:'lasiweijiasi', cityShort:'lswjs', name:'拉斯维加斯哈里·里德国际机场' },
  { code:'SEA', city:'西雅图', cityPinyin:'xiyatu', cityShort:'xyt', name:'西雅图-塔科马国际机场' },
  { code:'BOS', city:'波士顿', cityPinyin:'boshidun', cityShort:'bsd', name:'波士顿洛根国际机场' },
  { code:'MIA', city:'迈阿密', cityPinyin:'maiami', cityShort:'mam', name:'迈阿密国际机场' },
  { code:'IAD', city:'华盛顿', cityPinyin:'huashengdun', cityShort:'hsd', name:'华盛顿杜勒斯国际机场' },
  { code:'ATL', city:'亚特兰大', cityPinyin:'yatelanda', cityShort:'ytld', name:'亚特兰大哈兹菲尔德-杰克逊国际机场' },
  { code:'DFW', city:'达拉斯', cityPinyin:'dalasi', cityShort:'dls', name:'达拉斯/沃斯堡国际机场' },
  { code:'YVR', city:'温哥华', cityPinyin:'wengehua', cityShort:'wgh', name:'温哥华国际机场' },
  { code:'YYZ', city:'多伦多', cityPinyin:'duolunduo', cityShort:'dld', name:'多伦多皮尔逊国际机场' },
  { code:'YUL', city:'蒙特利尔', cityPinyin:'mengtelier', cityShort:'mtle', name:'蒙特利尔特鲁多国际机场' },

  // ——— 大洋洲 ———
  { code:'SYD', city:'悉尼', cityPinyin:'xini', cityShort:'xn', name:'悉尼金斯福德·史密斯国际机场' },
  { code:'MEL', city:'墨尔本', cityPinyin:'moerben', cityShort:'meb', name:'墨尔本机场' },
  { code:'BNE', city:'布里斯班', cityPinyin:'bulisiban', cityShort:'blsb', name:'布里斯班机场' },
  { code:'PER', city:'珀斯', cityPinyin:'posi', cityShort:'ps', name:'珀斯机场' },
  { code:'AKL', city:'奥克兰', cityPinyin:'aokelan', cityShort:'akl2', name:'奥克兰机场' },
  { code:'CHC', city:'基督城', cityPinyin:'jiducheng', cityShort:'jdc', name:'基督城国际机场' },

  // ——— 非洲 & 南美 ———
  { code:'JNB', city:'约翰内斯堡', cityPinyin:'yuehanneisibao', cityShort:'yhnsb', name:'约翰内斯堡奥利弗·坦博国际机场' },
  { code:'CPT', city:'开普敦', cityPinyin:'kaipudun', cityShort:'kpd', name:'开普敦国际机场' },
  { code:'CAI', city:'开罗', cityPinyin:'kailuo', cityShort:'kl', name:'开罗国际机场' },
  { code:'GRU', city:'圣保罗', cityPinyin:'shengbaoluo', cityShort:'sbl', name:'圣保罗瓜鲁柳斯国际机场' },
];

// ——— 构建快速索引 ———
const CODE_MAP = {};
for (const a of AIRPORT_DB) {
  if (!CODE_MAP[a.code]) CODE_MAP[a.code] = a;
}

export { AIRPORT_DB, CODE_MAP };
