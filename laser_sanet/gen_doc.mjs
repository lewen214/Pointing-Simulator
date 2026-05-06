import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType,
  LevelFormat, PageNumber, Header, Footer, TableOfContents,
} from 'docx';
import fs from 'fs';

// ── helpers ──────────────────────────────────────────────────────────────────
const BLUE   = '1F3864';
const DBLUE  = '2E4B9B';
const LBLUE  = 'D6E4F7';
const GREY   = 'F2F2F2';
const GOLD   = 'C9A227';
const RED    = 'C0392B';
const GREEN2 = '1E6B44';
const LGREY  = 'FAFAFA';

const border1 = { style: BorderStyle.SINGLE, size: 6, color: DBLUE };
const tblBorder = (c='AAAAAA') => ({
  top:    { style: BorderStyle.SINGLE, size: 4, color: c },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: c },
  left:   { style: BorderStyle.SINGLE, size: 4, color: c },
  right:  { style: BorderStyle.SINGLE, size: 4, color: c },
});
const hdrBorder = (c=DBLUE) => ({
  top:    { style: BorderStyle.SINGLE, size: 6, color: c },
  bottom: { style: BorderStyle.SINGLE, size: 6, color: c },
  left:   { style: BorderStyle.SINGLE, size: 6, color: c },
  right:  { style: BorderStyle.SINGLE, size: 6, color: c },
});

const cell = (text, opts={}) => new TableCell({
  width:   { size: opts.w || 4513, type: WidthType.DXA },
  borders: opts.borders || tblBorder(),
  shading: opts.shading || {},
  margins: { top: 80, bottom: 80, left: 140, right: 140 },
  children: [
    new Paragraph({
      alignment: opts.align || AlignmentType.LEFT,
      children: [
        new TextRun({
          text,
          font: 'Microsoft YaHei',
          size: opts.sz || 20,
          bold: opts.bold || false,
          color: opts.color || '000000',
        }),
      ],
      spacing: { before: 40, after: 40 },
    }),
  ],
});

const hdrCell = (text, w, colspan=1) => new TableCell({
  width: { size: w, type: WidthType.DXA },
  borders: hdrBorder(),
  shading: { fill: DBLUE, type: ShadingType.CLEAR },
  margins: { top: 80, bottom: 80, left: 140, right: 140 },
  columnSpan: colspan,
  children: [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text, font: 'Microsoft YaHei', size: 20, bold: true, color: 'FFFFFF' })],
      spacing: { before: 40, after: 40 },
    }),
  ],
});

const h1 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_1,
  border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: DBLUE, space: 1 } },
  spacing: { before: 400, after: 200 },
  children: [new TextRun({ text, font: 'Microsoft YaHei', size: 36, bold: true, color: BLUE })],
});

const h2 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_2,
  spacing: { before: 280, after: 140 },
  children: [new TextRun({ text, font: 'Microsoft YaHei', size: 28, bold: true, color: DBLUE })],
});

const h3 = (text, color=DBLUE) => new Paragraph({
  heading: HeadingLevel.HEADING_3,
  spacing: { before: 200, after: 100 },
  children: [new TextRun({ text, font: 'Microsoft YaHei', size: 24, bold: true, color })],
});

const p = (text, opts={}) => new Paragraph({
  spacing: { before: 60, after: 80, line: 320 },
  alignment: opts.align || AlignmentType.JUSTIFIED,
  indent: opts.indent ? { left: opts.indent } : undefined,
  children: [new TextRun({
    text,
    font: 'Microsoft YaHei',
    size: opts.sz || 22,
    bold: opts.bold || false,
    color: opts.color || '2B2B2B',
    italics: opts.italic || false,
  })],
});

const bullet = (text, indent=360) => new Paragraph({
  numbering: { reference: 'bullets', level: 0 },
  spacing: { before: 40, after: 60, line: 300 },
  indent: { left: indent + 360, hanging: 360 },
  children: [new TextRun({ text, font: 'Microsoft YaHei', size: 21, color: '333333' })],
});

const bold = (text) => new TextRun({ text, font: 'Microsoft YaHei', size: 22, bold: true, color: DBLUE });
const normal = (text) => new TextRun({ text, font: 'Microsoft YaHei', size: 22, color: '333333' });
const code  = (text) => new TextRun({ text, font: 'Courier New', size: 20, color: GREEN2 });

const mixedP = (...runs) => new Paragraph({
  spacing: { before: 60, after: 80, line: 320 },
  children: runs,
});

const codeBlock = (lines) => lines.map(line => new Paragraph({
  spacing: { before: 20, after: 20, line: 260 },
  indent: { left: 360 },
  border: { left: { style: BorderStyle.SINGLE, size: 12, color: '4472C4', space: 8 } },
  shading: { fill: 'F0F4FF', type: ShadingType.CLEAR },
  children: [new TextRun({ text: line, font: 'Courier New', size: 18, color: '1A3A6B' })],
}));

const tip = (label, text, color=LBLUE, textColor='1F3864') => new Paragraph({
  spacing: { before: 80, after: 80, line: 300 },
  border: { left: { style: BorderStyle.SINGLE, size: 16, color: DBLUE, space: 8 } },
  indent: { left: 200 },
  shading: { fill: color, type: ShadingType.CLEAR },
  children: [
    new TextRun({ text: label + '  ', font: 'Microsoft YaHei', size: 20, bold: true, color: textColor }),
    new TextRun({ text, font: 'Microsoft YaHei', size: 20, color: textColor }),
  ],
});

const divider = () => new Paragraph({
  border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC', space: 1 } },
  spacing: { before: 160, after: 160 },
  children: [],
});

const emptyP = () => new Paragraph({ spacing: { before: 40, after: 40 }, children: [] });

// ── TITLE PAGE ────────────────────────────────────────────────────────────────
const titleSection = [
  new Paragraph({ spacing: { before: 2400, after: 80 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: '任务协同卫星编队激光自组网', font: 'Microsoft YaHei', size: 64, bold: true, color: BLUE })] }),
  new Paragraph({ spacing: { before: 80, after: 120 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: '仿真平台系统详解', font: 'Microsoft YaHei', size: 52, bold: true, color: DBLUE })] }),
  new Paragraph({ spacing: { before: 120, after: 600 }, alignment: AlignmentType.CENTER,
    border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: GOLD, space: 4 } },
    children: [new TextRun({ text: 'Laser Self-Organizing Network Simulation Platform — Technical Reference', font: 'Calibri', size: 24, italics: true, color: '888888' })] }),
  new Paragraph({ spacing: { before: 600, after: 40 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: '涵盖范围', font: 'Microsoft YaHei', size: 24, bold: true, color: '555555' })] }),

  new Table({
    width: { size: 7200, type: WidthType.DXA },
    columnWidths: [1800, 5400],
    rows: [
      ['系统定位', '综合性激光星间链路全流程仿真验证平台'],
      ['核心概念', '16 个关键术语完整解析'],
      ['工作流程', '5 个正常工作阶段'],
      ['故障处置', '3 类典型故障场景与应对方案'],
      ['性能指标', '完整技术指标汇总表'],
    ].map(([k,v]) => new TableRow({ children: [
      new TableCell({ width:{size:1800,type:WidthType.DXA}, borders:tblBorder(DBLUE),
        shading:{fill:LBLUE,type:ShadingType.CLEAR}, margins:{top:80,bottom:80,left:140,right:140},
        children:[new Paragraph({alignment:AlignmentType.CENTER, children:[new TextRun({text:k,font:'Microsoft YaHei',size:20,bold:true,color:BLUE})]})] }),
      new TableCell({ width:{size:5400,type:WidthType.DXA}, borders:tblBorder(DBLUE),
        margins:{top:80,bottom:80,left:140,right:140},
        children:[new Paragraph({children:[new TextRun({text:v,font:'Microsoft YaHei',size:20,color:'333333'})]})] }),
    ]})),
  }),
  emptyP(),
  new Paragraph({ spacing: { before: 600, after: 40 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: '2026年4月', font: 'Microsoft YaHei', size: 22, color: '888888' })] }),
];

// ── TOC ───────────────────────────────────────────────────────────────────────
const tocSection = [
  new TableOfContents('目  录', { hyperlink: true, headingStyleRange: '1-3' }),
];

// ── SECTION 1: 平台定位 ───────────────────────────────────────────────────────
const sec1 = [
  h1('一、平台定位——不只是"位置指向算法仿真"'),

  p('这个仿真平台的准确名称是"任务协同卫星编队激光自组网仿真平台"，它是一个综合性系统仿真工具，而不仅仅是"基于位置指向算法的仿真平台"。'),
  p('位置指向算法确实是系统的核心子模块之一，但它只负责解决"激光应该往哪个方向指"这一个问题。整个平台的职责远不止于此。'),

  h2('1.1  平台完整功能覆盖'),

  new Table({
    width: { size: 9026, type: WidthType.DXA },
    columnWidths: [2200, 3000, 3826],
    rows: [
      new TableRow({ children: [hdrCell('功能模块',2200), hdrCell('负责解决的问题',3000), hdrCell('核心技术',3826)] }),
      ...[
        ['卫星编队轨道仿真','两颗卫星在空间中的实时位置','开普勒轨道方程 + ECI坐标系'],
        ['位置指向算法','激光应该指向哪个方向','ECI→体→激光终端坐标变换链'],
        ['斐波那契格点分布','如何均匀离散化天球搜索空间','黄金比例螺旋等面积分布'],
        ['互质盲扫捕获','两星怎样100%互相找到','互质步长 + 中国剩余定理'],
        ['异构链路协同','微波和激光如何协同工作','C/U平面分离 + TSH路由'],
        ['PAT状态机','全流程状态管理与故障处理','6状态有限状态机'],
        ['容灾自愈策略','链路中断后如何快速恢复','弃车保帅 + 互质重扫'],
        ['蒙特卡洛仿真','方案可靠性统计验证','10000次随机实验'],
      ].map(([a,b,c]) => new TableRow({ children: [
        cell(a, {w:2200, shading:{fill:LBLUE,type:ShadingType.CLEAR}, bold:true, color:BLUE}),
        cell(b, {w:3000}),
        cell(c, {w:3826, color:GREEN2}),
      ]})),
    ],
  }),

  emptyP(),
  tip('准确定位：', '面向任务协同卫星编队的激光星间链路（ISL）全流程仿真验证平台，涵盖从轨道建立到稳态通信再到故障自愈的完整链路建立流程。位置指向算法是其中第一个关键环节，但仅占系统功能的约20%。'),
];

// ── SECTION 2: 核心概念 ───────────────────────────────────────────────────────
const concepts = [
  {
    id:'2.1', name:'ECI坐标系（地心惯性坐标系）',
    fullname:'Earth-Centered Inertial Coordinate System',
    color:BLUE,
    use:'整个卫星轨道计算的"基准房间"',
    detail:[
      '以地球质心为原点，X轴指向春分点（J2000历元），Z轴指向北极，Y轴由右手定则确定。',
      '这个坐标系不随地球自转，是惯性系（牛顿第二定律在其中成立），因此卫星轨道方程和位置矢量都在这个系中建立和求解。',
      '卫星的位置 PA、PB 都是在 ECI 系下表示的三维矢量，单位通常为 km 或 m。',
    ],
    analogy:'就像城市地图的"绝对坐标"——不管你站在哪里、朝哪个方向，地图上北京的经纬度坐标永远不变。',
    formula:null,
  },
  {
    id:'2.2', name:'体坐标系（卫星本体坐标系）',
    fullname:'Satellite Body Frame',
    color:BLUE,
    use:'描述卫星自身各部件的安装方向与姿态',
    detail:[
      '固定在卫星本体上、随卫星一起旋转的坐标系。通常定义 Z 轴指向地球中心（天底方向），X 轴沿轨道速度方向，Y 轴由右手定则垂直轨道面。',
      '卫星上的天线、太阳帆板、激光终端的安装方向都在体坐标系中描述。',
      '从 ECI 系转换到体坐标系，需要用卫星当前的姿态四元数 Q（由 MCCF 帧中的姿态字段提供）构造旋转矩阵 R_ECI→body。',
    ],
    analogy:'就像你自己身上的前/后/左/右坐标系——当你转身时，坐标系跟着转，但你自己始终在原点。',
    formula:null,
  },
  {
    id:'2.3', name:'激光终端坐标系',
    fullname:'Laser Terminal Frame (ATP Frame)',
    color:BLUE,
    use:'描述激光束的实际发射方向（方位角 + 俯仰角）',
    detail:[
      '激光通信终端（ATP终端，即指向-捕获-跟踪终端）自己的坐标系，其 Z 轴定义为激光束光轴方向。',
      '由于终端安装在卫星本体上有一个固定偏角，需要再乘以安装矩阵 R_body→laser 才能从体坐标系变换到激光终端坐标系。',
      '在激光终端坐标系中，激光指向用方位角 Az 和俯仰角 El 两个角度完整描述，直接驱动压电二维转台执行。',
    ],
    analogy:'就像相机安装在无人机上——无人机有自己的姿态，相机还有相对无人机的安装偏角，拍到哪个方向要把两个角度叠加。',
    formula:null,
  },
  {
    id:'2.4', name:'视线矢量 VLOS（Line of Sight Vector）',
    fullname:'Line of Sight Vector',
    color:GOLD,
    use:'激光指向算法的最终输出目标——告诉激光往哪个方向射',
    detail:[
      '从发射卫星（SAT-A）指向目标卫星（SAT-B）的单位方向向量。',
      '这是整个"位置指向算法"子系统的输出，最终转化为激光终端二维转台的控制指令。',
      '完整计算流程分7步，依次经过3个坐标系变换。',
    ],
    analogy:'就像你在迷雾中打手电——手电筒发出的光柱方向就是 VLOS，你需要先知道目标在哪（ECI位置），再考虑自己朝哪站（体坐标系），再考虑手电筒怎么握的（激光终端坐标系），才能对准。',
    formula: [
      'Step 1:  ΔP = PB − PA                       （ECI位置差，单位：km）',
      'Step 2:  V_body  = R_ECI→body  ·  ΔP        （变换到体坐标系）',
      'Step 3:  V_laser = R_body→laser ·  V_body   （变换到激光终端坐标系）',
      'Step 4:  Az = atan2(Vy, Vx)                 （方位角）',
      'Step 5:  El = asin(Vz / |V|)                （俯仰角）',
      'Step 6:  激活面 = argmax(nᵢ · VLOS_norm)    （Voronoi面选择）',
      'Step 7:  最近邻格点 i₀ ← Fibonacci查表      （盲扫起始点）',
    ],
  },
  {
    id:'2.5', name:'正四面体四面相控阵',
    fullname:'Tetrahedral 4-Face Phased Array',
    color:BLUE,
    use:'消除天线盲区，实现全天球无死角波束覆盖',
    detail:[
      '单面天线最多覆盖半球（180°视角），存在大量盲区。正四面体结构的4个面法向量在空间中完美对称分布，每面覆盖最大离轴角54.74°，四面合计无缝覆盖完整天球。',
      '全固态电子扫描：通过调整各阵元的相位延迟来改变波束方向，无需机械转动，扫描速度微秒级，可靠性极高。',
      '波束赋形（Beamforming）：通过数字移相器控制每个天线单元的发射相位，在目标方向产生相干增强，旁瓣方向相干抵消，可将天线增益聚焦到 42 dBi。',
    ],
    analogy:'就像一个正三角锥形的4面骰子——每个面对着一个方向，4个方向合起来没有任何死角，转到任何姿态都至少有一个面正对目标。',
    formula: [
      'n₁ = ( 1,  1,  1) / √3    → 指向右上前方',
      'n₂ = ( 1, −1, −1) / √3    → 指向右下后方',
      'n₃ = (−1,  1, −1) / √3    → 指向左上后方',
      'n₄ = (−1, −1,  1) / √3    → 指向左下前方',
      '',
      '每面最大离轴角：arccos(1/√3) ≈ 54.74°',
    ],
  },
  {
    id:'2.6', name:'Voronoi 分配（最近邻准则）',
    fullname:'Voronoi Partition / Nearest-Face Criterion',
    color:BLUE,
    use:'在4个天线面中选出最合适的那个来对准目标',
    detail:[
      '给定任意一个目标方向（VLOS单位向量），计算它与4个面法向量的点积（即余弦相似度），选点积最大（夹角最小）的面激活发射。',
      '数学意义：这等价于把天球按4个面法向量做Voronoi剖分——每个区域归"离自己法向量最近"的那个面管辖，区域边界是相邻面法向量的角平分大圆。',
      '仿真中卫星周围的4色点云（橙/青/黄/绿）即为斐波那契格点按Voronoi分区着色，直观展示哪些方向由哪个面负责。',
    ],
    analogy:'就像4家外卖门店按地理位置划分配送区域——你家（VLOS方向）属于哪家门店的配送范围，就由哪家送餐（哪个面发射）。',
    formula: [
      '激活面 = argmax  { nᵢ · VLOS_normalized }    (i = 1, 2, 3, 4)',
      '',
      '离轴角 θᵢ = arccos( nᵢ · VLOS_norm )  <  54.74°  ✓',
    ],
  },
  {
    id:'2.7', name:'斐波那契球面格点',
    fullname:'Fibonacci Sphere Grid',
    color:GREEN2,
    use:'在天球上均匀离散分布N个候选扫描方向，用于盲扫时的格点化搜索',
    detail:[
      '激光指向不能连续扫描（太慢），需要把天球离散成N个"候选对准位置"，按顺序逐个尝试。',
      '普通经纬度格点在极点密集、赤道稀疏，导致扫描不均匀、有盲区偏差。斐波那契螺旋利用黄金比例φ，保证N个点在天球面上每个点负责相同面积，是理论最优的等面积离散化方案。',
      '仿真中使用N=300个格点（完整系统可达N=1000+），每个格点同时属于某一个Voronoi区域（对应某个天线面），用对应面的颜色标注。',
    ],
    analogy:'就像橘子皮：普通切法切成等宽竖条，两极的条很短（密集），赤道的条很长（稀疏）。斐波那契螺旋把橘子皮切成面积完全相等的N小块，均匀分布。',
    formula: [
      'φ = (1 + √5) / 2 ≈ 1.6180      （黄金比例）',
      '',
      'αᵢ = 2π·i / φ  mod 2π          （经度，黄金角递增）',
      'βᵢ = arccos(1 − (2i+1)/N)       （纬度）',
      '',
      '格点坐标：',
      '  x = R·sin(βᵢ)·cos(αᵢ)',
      '  y = R·cos(βᵢ)',
      '  z = R·sin(βᵢ)·sin(αᵢ)',
    ],
  },
  {
    id:'2.8', name:'互质步长算法（Coprime Step Scanning）',
    fullname:'Coprime Step Length Scanning',
    color:GOLD,
    use:'保证两颗卫星在互不知道对方位置时，扫描序列100%必然碰撞，完成捕获',
    detail:[
      '两颗卫星各自独立扫描N个斐波那契格点，起始格点i₀随机。如果步长有公因子（gcd>1），序列产生"平行循环"，可能永远碰不上。',
      '互质方案：SAT-A用步长ΔsA=7，SAT-B用步长ΔsB=13，gcd(7,13)=1。由中国剩余定理，互质步长保证两条序列在至多N步内必然出现相同格点索引，即碰撞捕获。',
      '蒙特卡洛验证（N=10000次）：互质方案成功率100%，传统随机步长方案成功率仅98.1%，1.9%概率发生空间死锁。',
    ],
    analogy:'两个人绕圆形跑道跑圈：A每次跳7步，B每次跳13步。因为7和13互质，不管起点差多少步，他们一定会在某个位置同时到达（中国剩余定理保证）。如果步长都是4（gcd=4），起点差1步的话，他们永远保持1步的差距，永远碰不到。',
    formula: [
      'iA(m) = (i₀A + m × 7)  mod N     （SAT-A 第m步的格点索引）',
      'iB(m) = (i₀B + m × 13) mod N     （SAT-B 第m步的格点索引）',
      '',
      '由中国剩余定理，gcd(7,13) = 1',
      '⟹ ∃ 唯一 m* ∈ [0, N)  使  iA(m*) = iB(m*)  ✓',
      '',
      '传统方案（gcd=k>1）：序列仅覆盖 N/k 个格点对',
      '⟹ 死锁概率 ≈ 1 − 1/k > 0  ✗',
    ],
  },
  {
    id:'2.9', name:'CFAR 检测（恒虚警率检测）',
    fullname:'Constant False Alarm Rate Detection',
    color:BLUE,
    use:'在背景噪声变化的环境中自适应检测信号到达，避免漏报和误报',
    detail:[
      'CFAR 不使用固定门限，而是根据当前周围噪声功率动态调整检测阈值，使虚警概率始终保持在预设水平（通常10⁻⁶级别）。',
      '当接收信号功率超过自适应门限时，判定为"捕获成功"；低于门限则继续扫描。',
      '本系统设置两级门限：捕获门限7.5 dB（开始锁定流程），跟踪门限11 dB（进入稳态跟踪）。Ka波段@3000km实测SNR=24.5 dB，高于跟踪门限13.5 dB，安全裕量充足。',
    ],
    analogy:'就像人耳的听觉系统：在嘈杂的地铁站你会自动"调高灵敏度"，在安静的图书馆会"调低灵敏度"，始终能在背景噪声中分辨出有人在叫你的名字。',
    formula: [
      '噪声基底：        −36.7  dBm',
      '捕获门限 T_acq：   +7.5  dB   （超过此值开始锁定）',
      '跟踪门限 T_trk：  +11.0  dB   （超过此值进入稳态）',
      'Ka@3000km SNR：  +24.5  dB   （实际值，安全裕量 13.5 dB）',
      '激光@3000km SNR：+42.1  dB   （稳态值，安全裕量 31.1 dB）',
    ],
  },
  {
    id:'2.10', name:'MCCF 帧（微波协同控制帧）',
    fullname:'Microwave Cooperative Control Frame',
    color:BLUE,
    use:'通过微波链路交换双方的精确位置、姿态和时间，使两星能够各自计算对方的精确指向',
    detail:[
      '在互质盲扫成功捕获（CFAR检测SNR>7.5 dB）后立即启动MCCF握手，是从"发现对方"到"精确锁定"的关键桥梁。',
      '交换的核心内容：位置P（ECI三维坐标，精度米级）+ 姿态Q（四元数，精度角秒级）+ 时间戳（纳秒级精度）。',
      '有了对方的P和Q，本星可以计算完整的坐标变换链，得到激光粗指向Az/El，为激光精扫做准备。',
    ],
    analogy:'就像两个陌生人第一次通话互报门牌地址——报了精确地址后，双方才能各自导航到对方门口（精确指向激光）。',
    formula: [
      '帧结构（按字节）：',
      '  前导码      4 B   帧同步',
      '  帧类型      1 B   握手/参数/路由',
      '  卫星 ID     2 B   身份识别',
      '  时间戳      8 B   纳秒级，双向时间同步',
      '  位置 P     12 B   ECI三维坐标（float×3）',
      '  姿态 Q     16 B   四元数（float×4）',
      '  路由字段   0~256 B 可变长',
      '  CRC-32     4 B   帧完整性校验',
      '  ─────────────────────────────',
      '  最小帧长：47 B    最大帧长：303 B',
    ],
  },
  {
    id:'2.11', name:'TSH 头（异构流量分发适配头）',
    fullname:'Traffic Steering Header',
    color:BLUE,
    use:'为每个数据包打上优先级和链路偏好标签，指导多核DSP路由器进行智能分发',
    detail:[
      '在数据包网络层头部前方附加3字节的TSH字段。路由器读取TSH后，无需深度包检测即可在纳秒级内决策：走激光还是微波，优先级高低。',
      'TrafficClass(3bit)决定优先级，LinkPreference(2bit)指定偏好链路，TTL(3bit)限制跳数防止环路。',
      'TSH是"弃车保帅"策略的技术基础——没有TC标签，路由器不知道哪些包可以丢、哪些绝对不能丢。',
    ],
    analogy:'就像快递包裹上的"加急/普通/经济"标签——分拣机器扫描标签后立即知道送哪条流水线，不需要打开包裹看内容。',
    formula: [
      'TSH字段（共3字节=24bit）：',
      '  TrafficClass   TC[2:0]    流量优先级',
      '  LinkPreference LP[1:0]    偏好链路',
      '  TTL            TTL[2:0]   跳数上限',
      '',
      'TC优先级映射：',
      '  111 (7)  →  最高：控制信令、MCCF帧    永不丢弃',
      '  100 (4)  →  高：实时遥测、视频流       保障λH=80Mbps',
      '  010 (2)  →  中：文件传输               有余量时服务',
      '  001 (1)  →  低：后台同步               拥塞时首先丢弃',
    ],
  },
  {
    id:'2.12', name:'PAT 状态机（指向-捕获-跟踪状态机）',
    fullname:'Pointing-Acquisition-Tracking State Machine',
    color:GREEN2,
    use:'管理激光链路建立全过程的状态转换，确保流程有序推进且任何故障能回退到安全状态',
    detail:[
      'PAT是整个系统的"调度大脑"，定义了6个运行状态和转换条件，保证无论发生什么异常，系统都能找到一条回到安全状态的路径。',
      '正常流程：MW_LOCK → PARAM_EXCHANGE → LASER_SCAN → HETERO_TRACK（稳态）',
      '故障流程：HETERO_TRACK → MW_FALLBACK → SELF_HEAL → LASER_SCAN（重捕）',
    ],
    analogy:'就像飞机的飞行管理系统（FMS）——起飞→爬升→巡航→下降→着陆，每个阶段有明确的进入条件和退出触发，任何异常触发对应的应急程序，不会"卡死"在某个状态。',
    formula: [
      '状态列表：',
      '  MW_LOCK          微波链路建立，CFAR捕获',
      '  PARAM_EXCHANGE   MCCF帧握手，交换P/Q',
      '  LASER_SCAN       互质盲扫（或精扫）',
      '  HETERO_TRACK     激光+微波稳态运行',
      '  MW_FALLBACK      激光中断，微波150Mbps保底',
      '  SELF_HEAL        重走捕获流程，恢复激光',
      '',
      '转换触发条件：',
      '  SNR > 7.5 dB   → 推进到下一状态',
      '  SNR < 7.5 dB   → 回退到 MW_FALLBACK',
      '  扫描超时       → 告警，重置扫描参数',
    ],
  },
  {
    id:'2.13', name:'零拷贝（Zero-Copy）',
    fullname:'Zero-Copy Data Path',
    color:GREEN2,
    use:'在多核DSP平台上以极低延迟完成1Gbps数据流的路由分发，不做任何内存复制',
    detail:[
      '传统数据路径：收包→复制到处理缓冲→TSH解析→复制到发送缓冲→发送。在1Gbps速率下，每次复制需要消耗大量内存带宽和CPU周期，成为瓶颈。',
      '零拷贝实现：建立统一共享内存池，数据包写入一次后所有处理步骤（TSH解析、优先级队列、链路选择、发送）均通过传递指针（内存地址）完成，不移动实际数据。',
      '效果：处理时延从微秒级降至纳秒级，CPU占用率降低60%以上，系统可支持多条1Gbps链路并发。',
    ],
    analogy:'图书馆借书：传统方式是把书复印一份给读者（复制数据），零拷贝是直接给读者一张"书在3层A区第5排"的便条（传递指针）。读者直接去取，没有任何复印开销。',
    formula:null,
  },
  {
    id:'2.14', name:'C/U 平面分离',
    fullname:'Control Plane / User Plane Separation',
    color:BLUE,
    use:'控制信令和用户数据走不同链路，互不干扰，确保卫星失控风险为零',
    detail:[
      '控制面（Control Plane）承载MCCF帧、路由更新、遥控遥测等指令，走Ka微波链路（可靠性优先）。',
      '用户面（User Plane）承载用户应用数据（视频、文件、遥感图像），走激光链路（带宽优先）。',
      '分离的核心价值：即使激光链路完全中断，微波控制面依然工作，卫星接受地面指令和自愈命令不受影响，不会因通信中断而"失控"。',
    ],
    analogy:'就像企业的专用内网（控制面）和公共互联网（用户面）——内网传管理命令，互联网传业务数据，互联网断了不影响管理员登录内网做修复操作。',
    formula:null,
  },
  {
    id:'2.15', name:'"弃车保帅"QoS 策略',
    fullname:'QoS Priority-Drop Strategy ("Sacrifice Low, Protect High")',
    color:RED,
    use:'链路资源紧张时，主动丢弃低价值流量，保证关键业务带宽不受影响',
    detail:[
      '名称来自围棋术语：为了保住关键的"帅"（高优先级业务），主动放弃不重要的"车"（低优先级流量）。',
      '触发条件：微波链路利用率>90%，或激光断链后仅剩150Mbps微波带宽时。',
      '执行结果：即使总可用带宽只有80Mbps（极端拥塞），TC=111控制信令和TC=100高优先业务始终得到保障，卫星不会因控制指令丢失而失控。',
    ],
    analogy:'就像救生艇超载：必须让部分非关键人员离艇（丢弃低优先包），确保驾驶员（控制指令）和重要乘客（关键业务）安全，而不是一视同仁挤满船最终全部沉没。',
    formula: [
      '拥塞调度逻辑（伪代码）：',
      '  IF 链路利用率 > 90%:',
      '      DROP  TC=001 队列中的新到包',
      '      RESERVE 20 Mbps 专用队列给 TC=111',
      '      GUARANTEE 80 Mbps 给 TC=100 (λH)',
      '      SERVE TC=010 with 剩余带宽',
      '  ELSE:',
      '      正常调度，按优先级加权',
    ],
  },
  {
    id:'2.16', name:'空间死锁（Space Deadlock）',
    fullname:'Space Deadlock in Blind Scanning',
    color:RED,
    use:'描述一种严重故障状态——两星扫描序列永远不相交，无法建立链路',
    detail:[
      '定义：两颗卫星的激光盲扫序列陷入"平行循环"，各自扫描但路径永远不相交，导致链路永久无法建立。',
      '成因：当 gcd(ΔsA, ΔsB) = k > 1 时，两条序列的相对偏移被锁定为 (i₀A − i₀B) mod k，若该偏移不为0，两序列永远差这个固定值，永远碰不上。',
      '预防：使用互质步长（gcd=1）从数学上消除死锁可能性。检测：设置最大步数超时，超时后切换互质参数重扫。',
    ],
    analogy:'两辆火车在圆形轨道上，A车每站停4节，B车也每站停4节，起始位置差1站。不管跑多少圈，A车到站时B车总在下一站，永远追不上。如果A跳7站、B跳13站（互质），无论起点差多少，必然在某个站同时到达。',
    formula: [
      '死锁条件（充分条件）：',
      '  gcd(ΔsA, ΔsB) = k > 1',
      '  AND (i₀A − i₀B) mod k ≠ 0',
      '  ⟹ 两序列永不相交，死锁',
      '',
      '互质保证（死锁免疫条件）：',
      '  gcd(ΔsA, ΔsB) = 1',
      '  ⟹ ∀ (i₀A, i₀B), ∃ m* ∈ [0,N) 使 iA(m*) = iB(m*)  ✓',
      '',
      '蒙特卡洛验证（N=10000次）：',
      '  互质方案（ΔsA=7, ΔsB=13）：死锁率 = 0.00%',
      '  传统方案（随机步长）：       死锁率 = 1.90%',
    ],
  },
];

function buildConceptSection(c) {
  const blocks = [
    h3(`${c.id}  ${c.name}`, c.color),
    p(`英文名称：${c.fullname}`, {color:'666666', italic:true, sz:20}),
    mixedP(bold('用途：'), normal(c.use)),
    emptyP(),
  ];
  c.detail.forEach(d => blocks.push(bullet(d)));
  blocks.push(emptyP());
  if(c.analogy) {
    blocks.push(tip('类比理解：', c.analogy));
    blocks.push(emptyP());
  }
  if(c.formula) {
    blocks.push(p('关键公式：', {bold:true, color:DBLUE}));
    blocks.push(...codeBlock(c.formula));
    blocks.push(emptyP());
  }
  return blocks;
}

const sec2 = [
  h1('二、核心概念详解（共16项）'),
  p('本章对系统中16个关键技术概念逐一说明：是什么、有什么用、怎么工作，并配合类比帮助直观理解。'),
  emptyP(),
  ...concepts.flatMap(buildConceptSection),
];

// ── SECTION 3: 系统工作流程 ───────────────────────────────────────────────────
const sec3 = [
  h1('三、系统完整工作流程'),
  p('系统工作分5个有序阶段，每个阶段有明确的前置条件、执行内容和完成标志。'),
  emptyP(),

  // Phase overview table
  new Table({
    width: { size: 9026, type: WidthType.DXA },
    columnWidths: [900, 2200, 2626, 1500, 1800],
    rows: [
      new TableRow({ children: [
        hdrCell('阶段',900), hdrCell('名称',2200),
        hdrCell('核心动作',2626), hdrCell('完成标志',1500), hdrCell('关键指标',1800),
      ]}),
      ...([
        ['①','卫星编队轨道建立','坐标变换链计算 VLOS','斐波那契格点确定','星间距 ~3000km'],
        ['②','相控阵互质盲扫','双星同步互质步长扫描','碰撞捕获成功','SNR > 7.5 dB'],
        ['③','微波邻居发现握手','MCCF帧交换P/Q','激光粗指向解算','SNR = 24.5 dB'],
        ['④','异构协同激光建链','激光精扫锁定稳态','双链路并行运行','1 Gbps / 12ms'],
        ['⑤','容灾保底自愈重构','中断检测→保底→重捕','激光恢复','恢复 < 1s'],
      ]).map(([num,name,action,done,kpi]) => new TableRow({ children: [
        cell(num, {w:900,  shading:{fill:DBLUE,type:ShadingType.CLEAR}, color:'FFFFFF', bold:true, align:AlignmentType.CENTER}),
        cell(name,{w:2200, shading:{fill:LBLUE,type:ShadingType.CLEAR}, bold:true, color:BLUE}),
        cell(action,{w:2626}),
        cell(done, {w:1500, color:GREEN2}),
        cell(kpi,  {w:1800, color:GOLD}),
      ]})),
    ],
  }),
  emptyP(),

  h2('3.1  阶段一：卫星编队轨道建立'),
  p('两颗卫星（SAT-A 和 SAT-B）运行在600km高度的低轨道（LEO），轨道参数如下：'),
  new Table({
    width:{size:7200,type:WidthType.DXA}, columnWidths:[2400,4800],
    rows: [
      new TableRow({children:[hdrCell('参数',2400),hdrCell('数值',4800)]}),
      ...([
        ['轨道高度','600 km（距地面），轨道半径 6971 km'],
        ['绕地周期','约 5801 秒 ≈ 97.2 分钟'],
        ['倾斜角 SAT-A','53.0°'],
        ['倾斜角 SAT-B','53.1°（微小差异产生编队相对运动）'],
        ['升交点赤经 SAT-A','0°'],
        ['升交点赤经 SAT-B','27.5°（两轨道平面有夹角）'],
        ['典型星间距离','约 3000 km（随编队几何变化）'],
      ]).map(([k,v])=>new TableRow({children:[
        cell(k,{w:2400,shading:{fill:LBLUE,type:ShadingType.CLEAR},bold:true,color:BLUE}),
        cell(v,{w:4800}),
      ]})),
    ],
  }),
  emptyP(),
  p('本阶段的核心任务是完成指向解算，即从ECI位置矢量计算出激光终端需要执行的方位角和俯仰角。完整的7步计算流程如下：'),
  ...codeBlock([
    'Step 1:  获取 PA、PB  ← GPS 测量 / 轨道预报（ECI坐标，单位km）',
    'Step 2:  ΔP = PB − PA              计算位置差向量',
    'Step 3:  V_body  = R_ECI→body · ΔP 乘以ECI→体坐标旋转矩阵（用姿态四元数Q构造）',
    'Step 4:  V_laser = R_body→laser · V_body  乘以安装矩阵',
    'Step 5:  Az = atan2(Vy, Vx)         计算方位角',
    'Step 6:  El = asin(Vz / |V|)        计算俯仰角',
    'Step 7:  激活面 = argmax(nᵢ · VLOS_norm)   Voronoi面分配',
    '         最近邻格点 i₀ ← Fibonacci格点表查找  确定盲扫起点',
  ]),
  emptyP(),

  h2('3.2  阶段二：相控阵互质盲扫捕获（最核心创新）'),
  p('两星同步启动互质步长盲扫。SAT-A和SAT-B各自按自己的序列逐格扫描，互不通信，但由于步长互质，必然在某步碰撞。'),
  ...codeBlock([
    'SAT-A: iA(m) = (i₀A + m × 7)  mod N   （每步跳7个格点）',
    'SAT-B: iB(m) = (i₀B + m × 13) mod N   （每步跳13个格点）',
    '',
    '当 iA(m*) = iB(m*) 时：两束激光同时指向同一个天球格点',
    '→ 互相接收到对方信号 → CFAR检测SNR > 7.5 dB → 捕获成功 ✓',
  ]),
  emptyP(),
  tip('关键优势：', '互质数学保证：无论i₀A和i₀B如何随机设置，必然在至多N步内碰撞，碰撞率100%。传统随机步长存在1.9%死锁概率。'),
  emptyP(),

  h2('3.3  阶段三：微波邻居发现与握手'),
  p('盲扫碰撞后，CFAR检测到SNR>7.5 dB，立即启动MCCF帧握手，双方交换精确的位置和姿态信息，以便计算激光精确指向。'),
  p('Ka波段链路参数：频率26 GHz，功率43 dBm（20 W），天线增益42 dBi（0.5°波束），@3000km SNR=24.5 dB，远高于跟踪门限11 dB。'),
  p('完成一次MCCF握手后，双方各自重新执行指向解算（Step 1~7），用对方报告的精确位置和姿态更新坐标变换矩阵，得到更精确的激光指向Az/El，为激光精扫做准备。'),
  emptyP(),

  h2('3.4  阶段四：异构协同激光建链'),
  p('以微波给出的粗指向为基础，激光终端执行精扫（小范围螺旋扫描±50 μrad），当CFAR检测到SNR>11 dB时进入稳态跟踪。'),
  new Table({
    width:{size:9026,type:WidthType.DXA}, columnWidths:[2000,3513,3513],
    rows:[
      new TableRow({children:[hdrCell('参数',2000),hdrCell('激光链路',3513),hdrCell('微波链路',3513)]}),
      ...([
        ['载波波长','1550 nm（近红外，大气窗口）','26 GHz（Ka波段）'],
        ['发射功率','1 W（30 dBm）','20 W（43 dBm）'],
        ['天线增益','—（望远镜系统）','42 dBi（0.5° 波束）'],
        ['散角/波束宽度','15 μrad（极窄）','0.5°（相对宽）'],
        ['@3000km SNR','42.1 dB','24.5 dB'],
        ['数据速率','1 Gbps','100 MHz 带宽'],
        ['端到端时延','12 ms','20 ms'],
        ['链路用途','用户数据面（U-Plane）','控制面（C-Plane）'],
      ]).map(([p,a,b])=>new TableRow({children:[
        cell(p,{w:2000,shading:{fill:LBLUE,type:ShadingType.CLEAR},bold:true,color:BLUE}),
        cell(a,{w:3513,color:GREEN2}),
        cell(b,{w:3513}),
      ]})),
    ],
  }),
  emptyP(),
  p('稳态运行时，TSH头按优先级将流量智能分发到两条链路，零拷贝机制保证分发时延纳秒级。控制面与用户面完全隔离，互不干扰。'),
  emptyP(),

  h2('3.5  阶段五：容灾保底与自愈重构'),
  p('当激光链路因各种原因中断时，系统执行以下自愈流程：'),
  ...codeBlock([
    '激光 SNR 骤降 < 7.5 dB',
    '    ↓',
    'PAT 状态机: HETERO_TRACK → MW_FALLBACK',
    '    ↓',
    '微波链路接管（150 Mbps），"弃车保帅"启动',
    '丢弃 TC=001 低优先包，保障 λH=80 Mbps 高优先业务',
    '    ↓',
    'PAT 状态机: MW_FALLBACK → SELF_HEAL',
    '    ↓',
    '重走 PAT 流程（MW_LOCK → PARAM_EXCHANGE → LASER_SCAN）',
    '互质重扫，至多 N 步必然重新捕获',
    '    ↓',
    '激光链路恢复，吞吐量从 80 Mbps 恢复至 1 Gbps',
    '全程耗时 < 1 秒（传统方案约 85 秒，提升 85 倍）',
  ]),
  emptyP(),
];

// ── SECTION 4: 故障处置 ───────────────────────────────────────────────────────
const sec4 = [
  h1('四、三大故障场景与处置方案'),

  h2('4.1  故障一：激光指向误差突变'),
  p('【故障成因】卫星在轨运行时，每次进出地球阴影区（约47分钟一次），卫星本体温度变化可达±100°C以上。激光通信终端的支架和安装基座因热膨胀/收缩发生微小形变（通常几十到几百微米），导致激光指向偏移超过15微弧度（约等于激光波束半宽），星光偏出接收视场，SNR骤降。'),
  p('【检测方法】实时监测接收端SNR的变化率 dSNR/dt。若变化率低于 −5 dB/s（即信号在快速衰减），判定为指向异常，而非正常噪声波动。系统同时检查是否有链路中断事件、误码率异常上升等辅助指标。'),
  p('【处置流程】'),
  ...codeBlock([
    '1. 检测到 dSNR/dt < −5 dB/s → 判定指向异常',
    '2. 维持微波控制链路（确保指令不中断）',
    '3. PAT 状态机回退：HETERO_TRACK → LASER_SCAN',
    '4. 压电驱动器执行螺旋精扫',
    '   扫描半径：±50 μrad（包含最大热变形量估计值）',
    '   扫描步长：~1 μrad（压电分辨率）',
    '5. CFAR 检测 SNR > 11 dB → 重新锁定',
    '6. 更新热变形补偿模型（记录本次偏移量，预测下次）',
    '7. 恢复 HETERO_TRACK 稳态运行',
    '8. 全程时间：< 200 ms',
  ]),
  tip('关键设计：', '即使处于重捕获过程中，微波控制链路始终维持，业务降级为150 Mbps但不中断，重捕完成后无感切回1 Gbps激光链路。'),
  emptyP(),

  h2('4.2  故障二：空间死锁与互质解锁'),
  p('【故障成因】传统盲扫方案（如随机选取步长ΔsA=4, ΔsB=4，gcd=4）存在1.9%的概率发生空间死锁——两颗卫星的扫描序列陷入"平行循环"，永远无法相遇。'),
  p('【死锁图解】'),
  ...codeBlock([
    '传统方案示例（gcd=4）：',
    '  N=300格点，ΔsA=4，ΔsB=4，初始偏移 i₀A−i₀B=1',
    '',
    '  m=0:  iA=0,   iB=1    差1 ≠ 0',
    '  m=1:  iA=4,   iB=5    差1 ≠ 0',
    '  m=2:  iA=8,   iB=9    差1 ≠ 0',
    '  m=75: iA=0,   iB=1    循环，差永远为1',
    '  → 死锁，永不相遇 ✗',
    '',
    '互质方案（gcd=1）：',
    '  N=300格点，ΔsA=7，ΔsB=13，任意初始偏移',
    '  由中国剩余定理：∃ 唯一 m* < N 使 iA(m*)=iB(m*)',
    '  → 必然碰撞，100%捕获 ✓',
  ]),
  p('【检测与解锁流程】'),
  ...codeBlock([
    '1. 扫描步数 m > N² 仍未捕获 → 判定为死锁',
    '2. 向地面报告死锁事件（遥测帧）',
    '3. 从当前格点起重置扫描参数为互质步长（7,13）',
    '4. 重启互质盲扫',
    '5. 至多 N 步内（约 36 秒）必然碰撞捕获',
    '6. 恢复正常建链流程',
  ]),
  tip('根本解决方案：', '在系统设计阶段就采用互质步长，从数学上消除死锁的可能性，使死锁概率从1.9%降为0%，无需依赖后续检测和解锁机制。'),
  emptyP(),

  h2('4.3  故障三：双链路拥塞与 QoS 弃车保帅'),
  p('【故障成因】任务密集期（如卫星同时执行高分辨率对地观测+实时指挥通信），激光链路1Gbps带宽达到上限，同时地面上注指令增多导致微波链路也接近150Mbps上限，系统面临全链路过载。'),
  p('【不处理的后果】若按先到先服务（FIFO）策略，关键控制指令可能被大量数据包挤在队列后面等待数秒，导致：卫星姿控指令延迟→姿态漂移→激光指向失准→链路中断→更严重的故障级联。'),
  p('【QoS处置流程】'),
  ...codeBlock([
    '触发条件：链路利用率 > 90%',
    '',
    '执行步骤：',
    '1. TSH路由器检测到拥塞，激活优先队列模式',
    '2. 停止入队：TC=001（低优先）的新到包直接丢弃',
    '3. 预留队列：20 Mbps 专用通道给 TC=111（控制帧）',
    '4. 保障下限：80 Mbps 保障给 TC=100（λH高优先业务）',
    '5. 剩余带宽：按权重分配给 TC=010 中优先流量',
    '',
    '结果：',
    '  控制信令：0ms 时延，永不丢包（卫星不失控）',
    '  高优先业务：80 Mbps 稳定带宽（不中断）',
    '  中优先业务：降速但不停止',
    '  低优先业务：暂时中断',
    '',
    '拥塞消除后：',
    '  激光重建 → 1 Gbps 恢复 → 所有业务全速',
  ]),
  tip('设计哲学：', '"弃车保帅"不是随意丢包，而是通过预先打好的TSH优先级标签，精确控制丢弃哪些包、保留哪些包，实现有序降级而非随机崩溃。'),
  emptyP(),
];

// ── SECTION 5: 性能指标 ───────────────────────────────────────────────────────
const sec5 = [
  h1('五、关键性能指标汇总'),

  new Table({
    width:{size:9026,type:WidthType.DXA}, columnWidths:[2800,2413,3813],
    rows:[
      new TableRow({children:[hdrCell('指标类别',2800),hdrCell('数值',2413),hdrCell('备注',3813)]}),
      ...([
        ['激光链路数据速率','1 Gbps','1550nm，单链路'],
        ['激光链路时延（RTT）','12 ms','3000km星间距离'],
        ['激光@3000km SNR','42.1 dB','安全裕量 31 dB'],
        ['激光发射功率','1 W（30 dBm）','—'],
        ['激光散角','15 μrad','约0.87 mrad = 0.05°'],
        ['微波链路速率','100 MHz 带宽','Ka 26GHz'],
        ['微波@3000km SNR','24.5 dB','安全裕量 13.5 dB'],
        ['微波发射功率','20 W（43 dBm）','—'],
        ['微波最大吞吐量','150 Mbps','保底带宽'],
        ['高优先保障带宽','80 Mbps（λH）','拥塞时仍保障'],
        ['CFAR捕获门限','7.5 dB','—'],
        ['CFAR跟踪门限','11.0 dB','—'],
        ['噪声基底','−36.7 dBm','—'],
        ['激光自愈时间（互质）','< 1 秒','—'],
        ['传统方案恢复时间','约 85 秒','对比参考值'],
        ['互质方案死锁概率','0%','数学保证'],
        ['传统方案死锁概率','1.9%','蒙特卡洛N=10000'],
        ['指向误差重捕时间','< 200 ms','螺旋精扫'],
        ['斐波那契格点数N','300（仿真）/ 1000+（实际）','—'],
        ['互质步长 ΔsA','7','gcd(7,13)=1'],
        ['互质步长 ΔsB','13','gcd(7,13)=1'],
        ['轨道高度','600 km（LEO）','—'],
        ['轨道周期','5801 s ≈ 97.2 min','—'],
        ['典型星间距','3000 km','随编队几何变化'],
        ['PAT状态数','6个状态','有限状态机'],
        ['TSH头大小','3 字节','零拷贝分发'],
      ]).map(([k,v,note],i)=>new TableRow({children:[
        cell(k,{w:2800,shading:{fill:i%2===0?GREY:LGREY,type:ShadingType.CLEAR},bold:true,color:'333333'}),
        cell(v,{w:2413,shading:{fill:i%2===0?GREY:LGREY,type:ShadingType.CLEAR},color:GOLD,bold:true,align:AlignmentType.CENTER}),
        cell(note,{w:3813,shading:{fill:i%2===0?GREY:LGREY,type:ShadingType.CLEAR},color:'555555'}),
      ]})),
    ],
  }),
  emptyP(),
  divider(),
  p('本文档涵盖仿真平台涉及的全部核心技术概念、完整工作流程与故障处置方案，可作为系统学习和答辩参考资料。', {color:'888888', sz:20}),
];

// ── Document assembly ──────────────────────────────────────────────────────────
const doc = new Document({
  numbering: {
    config: [
      { reference: 'bullets', levels: [
        { level: 0, format: LevelFormat.BULLET, text: '\u25AA',
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 520, hanging: 260 } } } },
      ]},
    ],
  },
  styles: {
    default: {
      document: { run: { font: 'Microsoft YaHei', size: 22 } },
    },
    paragraphStyles: [
      { id:'Heading1', name:'Heading 1', basedOn:'Normal', next:'Normal', quickFormat:true,
        run:  { size:36, bold:true, font:'Microsoft YaHei', color:BLUE },
        paragraph: { spacing:{before:400,after:200}, outlineLevel:0 } },
      { id:'Heading2', name:'Heading 2', basedOn:'Normal', next:'Normal', quickFormat:true,
        run:  { size:28, bold:true, font:'Microsoft YaHei', color:DBLUE },
        paragraph: { spacing:{before:280,after:140}, outlineLevel:1 } },
      { id:'Heading3', name:'Heading 3', basedOn:'Normal', next:'Normal', quickFormat:true,
        run:  { size:24, bold:true, font:'Microsoft YaHei', color:DBLUE },
        paragraph: { spacing:{before:200,after:100}, outlineLevel:2 } },
    ],
  },
  sections: [
    // Title + TOC
    {
      properties: {
        page: { size:{width:11906,height:16838}, margin:{top:1440,right:1440,bottom:1440,left:1800} },
      },
      footers: {
        default: new Footer({ children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text:'第 ', font:'Microsoft YaHei', size:18, color:'888888' }),
              new TextRun({ children:[PageNumber.CURRENT], font:'Microsoft YaHei', size:18, color:'888888' }),
              new TextRun({ text:' 页', font:'Microsoft YaHei', size:18, color:'888888' }),
            ],
          }),
        ]}),
      },
      children: [
        ...titleSection,
        new Paragraph({ children:[new TextRun('')], pageBreakBefore:true }),
        ...tocSection,
        new Paragraph({ children:[new TextRun('')], pageBreakBefore:true }),
        ...sec1,
        new Paragraph({ children:[new TextRun('')], pageBreakBefore:true }),
        ...sec2,
        new Paragraph({ children:[new TextRun('')], pageBreakBefore:true }),
        ...sec3,
        new Paragraph({ children:[new TextRun('')], pageBreakBefore:true }),
        ...sec4,
        new Paragraph({ children:[new TextRun('')], pageBreakBefore:true }),
        ...sec5,
      ],
    },
  ],
});

Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync('C:/Users/lewen/Desktop/laser_sanet/激光自组网系统详解.docx', buffer);
  console.log('Done: 激光自组网系统详解.docx');
});
