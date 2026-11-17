// アイコンをテーマごとのマスク用トークン(--icon-*)として icons.css に書き出す
const fs=require('fs');const out=process.argv[2];
const st=(w,body,fill)=>`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='${fill?'black':'none'}' stroke='black' stroke-width='${w}' stroke-linecap='round' stroke-linejoin='round'>${body}</svg>`;
const V={
  check:st(3,"<path d='M5 12l5 5 9-10'/>"),
  logo:st(2.5,"<path d='M5 12l5 5 9-10'/>"),
  sun:st(1.75,"<circle cx='12' cy='12' r='4'/><path d='M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4'/>"),
  inbox:st(1.75,"<path d='M22 12h-6l-2 3h-4l-2-3H2'/><path d='M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z'/>"),
  plus:st(2,"<path d='M12 5v14M5 12h14'/>"),
  cal:st(1.75,"<rect x='3' y='4' width='18' height='18' rx='2'/><path d='M16 2v4M8 2v4M3 10h18'/>"),
  cals:st(2,"<rect x='3' y='4' width='18' height='18' rx='2'/><path d='M16 2v4M8 2v4M3 10h18'/>"),
  flag:st(1.75,"<path d='M4 22V4M4 4h13l-2 4 2 4H4'/>"),
  flagfill:st(1.75,"<path d='M4 22V4M4 4h13l-2 4 2 4H4'/>",true),
  memo:st(2,"<path d='M4 6h16M4 12h16M4 18h10'/>"),
  down:st(2,"<path d='M6 9l6 6 6-6'/>"),
  right:st(2,"<path d='M9 18l6-6-6-6'/>"),
  left:st(2,"<path d='M15 18l-6-6 6-6'/>"),
  close:st(1.75,"<path d='M18 6L6 18M6 6l12 12'/>"),
  trash:st(1.75,"<path d='M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14'/>"),
  folder:st(1.75,"<path d='M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z'/>"),
  menu:st(1.75,"<path d='M3 6h18M3 12h18M3 18h18'/>"),
  dots:"<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><circle cx='5' cy='12' r='1.6'/><circle cx='12' cy='12' r='1.6'/><circle cx='19' cy='12' r='1.6'/></svg>",
  alert:st(2,"<circle cx='12' cy='12' r='9'/><path d='M12 8v4.5M12 16h.01'/>"),
  cursor:"<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path d='M8 5l9 7-9 7z'/></svg>",
};
const P={
check:`......#\n.....##\n#...##.\n##.##..\n.###...\n..#....`,
logo:`........#\n.......##\n......##.\n#....##..\n##..##...\n.####....\n..##.....`,
sun:`....#....\n.#.....#.\n...###...\n..#####..\n#.#####.#\n..#####..\n...###...\n.#.....#.\n....#....`,
inbox:`.#######.\n.#.....#.\n#.......#\n#.......#\n###...###\n#..###..#\n#.......#\n#########`,
plus:`....#....\n....#....\n....#....\n....#....\n#########\n....#....\n....#....\n....#....\n....#....`,
cal:`.#.....#.\n#########\n#########\n#.......#\n#.##.##.#\n#.......#\n#.##.##.#\n#.......#\n#########`,
cals:`.#...#.\n#######\n#######\n#.....#\n#.#.#.#\n#.....#\n#######`,
flag:`########.\n#######..\n######...\n#######..\n########.\n#........\n#........\n#........\n#........`,
memo:`#######\n.......\n#######\n.......\n####...`,
down:`#######\n.#####.\n..###..\n...#...`,
right:`#...\n##..\n###.\n####\n###.\n##..\n#...`,
left:`...#\n..##\n.###\n####\n.###\n..##\n...#`,
close:`#.....#\n##...##\n.##.##.\n..###..\n.##.##.\n##...##\n#.....#`,
trash:`...###...\n#########\n.........\n.#######.\n.#.#.#.#.\n.#.#.#.#.\n.#.#.#.#.\n.#.#.#.#.\n.#######.`,
folder:`####.....\n#..#####.\n#########\n#.......#\n#.......#\n#.......#\n#.......#\n#########`,
menu:`#########\n.........\n.........\n#########\n.........\n.........\n#########`,
dots:`##..##..##\n##..##..##`,
alert:`.#####.\n#..#..#\n#..#..#\n#..#..#\n#.....#\n#..#..#\n.#####.`,
};
P.flagfill=P.flag;P.cursor=P.right;
const pxSvg=(bm,scale=2)=>{const rows=bm.split('\n');let d='';rows.forEach((r,y)=>{let x=0;while(x<r.length){if(r[x]==='#'){const s=x;while(r[x]==='#')x++;d+=`M${s} ${y}h${x-s}v1h-${x-s}z`}else x++}});
  const w=Math.max(...rows.map(r=>r.length)),h=rows.length;
  return `<svg xmlns='http://www.w3.org/2000/svg' width='${w*scale}' height='${h*scale}' viewBox='0 0 ${w} ${h}' shape-rendering='crispEdges'><path d='${d}'/></svg>`};
const url=s=>`url("data:image/svg+xml,${encodeURIComponent(s)}")`;
let css='/* アイコンもテーマの値。画面側は mask: var(--icon-名前) で参照する(自動生成: gen-icons.js) */\n';
css+=':root,\n[data-theme="blue"]{\n'+Object.keys(V).map(k=>`  --icon-${k}:${url(V[k])};`).join('\n')+'\n}\n';
css+='[data-theme="pixel"],\n[data-theme="royal"]{\n'+Object.keys(V).map(k=>`  --icon-${k}:${url(pxSvg(P[k]))};`).join('\n')+'\n}\n';
css+=Object.keys(V).map(k=>`.i-${k}{--i:var(--icon-${k})}`).join('\n')+'\n';
fs.writeFileSync(out,css);console.log('icons',Object.keys(V).length);
