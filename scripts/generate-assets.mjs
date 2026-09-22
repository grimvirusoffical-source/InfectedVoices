import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const crcTable=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;t[n]=c>>>0;}return t;})();
const crc=b=>{let c=0xffffffff;for(const x of b)c=crcTable[(c^x)&255]^(c>>>8);return (c^0xffffffff)>>>0;};
function chunk(type,data){const t=Buffer.from(type),out=Buffer.alloc(12+data.length);out.writeUInt32BE(data.length,0);t.copy(out,4);data.copy(out,8);out.writeUInt32BE(crc(Buffer.concat([t,data])),8+data.length);return out;}
function png(w,h,pixel){const row=w*4+1,raw=Buffer.alloc(row*h);for(let y=0;y<h;y++){raw[y*row]=0;for(let x=0;x<w;x++){const [r,g,b,a]=pixel(x,y,w,h),i=y*row+1+x*4;raw[i]=r;raw[i+1]=g;raw[i+2]=b;raw[i+3]=a;}}const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(w,0);ihdr.writeUInt32BE(h,4);ihdr[8]=8;ihdr[9]=6;const sig=Buffer.from([137,80,78,71,13,10,26,10]);return Buffer.concat([sig,chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))]);}
function art(x,y,w,h){const nx=x/w,ny=y/h,cx=.5,cy=.48;let r=10,g=9,b=14;const d=Math.hypot(nx-cx,ny-cy);if(d<.36){const glow=Math.max(0,1-d/.36);r+=Math.round(46*glow);b+=Math.round(62*glow);}const purple=[135,52,215];const ring=Math.abs(d-.27)<.018;const hornL=ny<.32&&nx>.23&&nx<.43&&ny<.17+(nx-.23)*.8;const hornR=ny<.32&&nx>.57&&nx<.77&&ny<.17+(.77-nx)*.8;const iStem=nx>.39&&nx<.445&&ny>.38&&ny<.68;const vLeft=ny>.38&&ny<.69&&Math.abs(nx-(.48+(ny-.38)*.28))<.022;const vRight=ny>.38&&ny<.69&&Math.abs(nx-(.64-(ny-.38)*.28))<.022;if(ring||hornL||hornR||iStem||vLeft||vRight){[r,g,b]=purple;}const inner=d<.12;if(inner&&!iStem&&!vLeft&&!vRight){r=Math.max(r,21);g=Math.max(g,16);b=Math.max(b,30);}return [r,g,b,255];}
await fs.mkdir(path.join(root,'assets'),{recursive:true});
await fs.writeFile(path.join(root,'assets','app-icon.png'),png(1024,1024,art));
await fs.writeFile(path.join(root,'assets','app-splash.png'),png(2048,2048,(x,y,w,h)=>art(x,y,w,h)));
await fs.writeFile(path.join(root,'assets','android-icon-mdpi.png'),png(48,48,art));
await fs.writeFile(path.join(root,'assets','android-icon-hdpi.png'),png(72,72,art));
await fs.writeFile(path.join(root,'assets','android-icon-xhdpi.png'),png(96,96,art));
await fs.writeFile(path.join(root,'assets','android-icon-xxhdpi.png'),png(144,144,art));
await fs.writeFile(path.join(root,'assets','android-icon-xxxhdpi.png'),png(192,192,art));
await fs.writeFile(path.join(root,'assets','play-store-icon.png'),png(512,512,art));
console.log('Generated Apple and Android store artwork.');
