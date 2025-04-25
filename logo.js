// logo.js – Grid flexible con módulo fijo de 100px, sliders, inversión y descarga JPG

// ---------- PARÁMETROS AJUSTABLES ----------
const moduleSize = 100;           // Tamaño fijo de cada módulo (px)
const gridFillColor = 0;          // Color de relleno de cada celda (0 = negro)
const gridOutlineWeight = 10;     // Grosor del contorno exterior de la grilla (px)

const baseIter = 4;               // Iteraciones de subdivisión primaria
const baseDisp = 2;               // Desplazamiento máximo en subdivisión primaria (px)

const strokeIter = 4;             // Iteraciones de subdivisión para el contorno
const strokeDisp = 10;             // Desplazamiento máximo para subdivisión de contorno (px)
const strokeWeightVal = 40;       // Grosor del contorno de la mancha (px)

const microNoiseScale = 7;        // Escala para ruido Perlin
const microNoiseDisp = 10;         // Desplazamiento máximo por ruido (px)
const microRandomDisp = 10;        // Desplazamiento aleatorio adicional (px)

const curveTight = 1;             // curveTightness(), controla la suavidad

// ---------- PALETA DE COLORES ----------
let colors = {
  bg: 255,
  gridFill: gridFillColor,
  gridOutline: 0,
  blobFill: 255,
  blobStroke: 255,
  letter: 0
};

// ---------- ESTADO ----------
let cols, rows;
let offsetX, offsetY;
let lastShuffle = 0;
const interval = 2000;
const transitionDur = 1000;
let transitionStart = 0;

let allowed = {};
let letters = [
  {char:'S', module:null, pos:null, from:null, to:null},
  {char:'O', module:null, pos:null, from:null, to:null},
  {char:'M', module:null, pos:null, from:null, to:null},
  {char:'A', module:null, pos:null, from:null, to:null}
];

let colsSlider, rowsSlider;
let colsValue, rowsValue;

function setup() {
  createCanvas(windowWidth, windowHeight);
  frameRate(4);

  // Crear contenedor UI
  const ui = document.createElement('div');
  Object.assign(ui.style, {
    position: 'absolute', top: '10px', left: '10px',
    background: 'rgba(255,255,255,0.9)', padding: '10px',
    borderRadius: '8px', fontFamily: 'Helvetica, Arial, sans-serif',
    color: '#333', zIndex: 10
  });
  document.body.appendChild(ui);

  // Helper para filas
  function addRow(labelText, slider, valueSpan) {
    const container = document.createElement('div');
    Object.assign(container.style, {display: 'flex', alignItems: 'center', marginBottom: '6px'});
    const lbl = document.createElement('span');
    Object.assign(lbl.style, {width:'100px', fontFamily:'Helvetica', fontSize:'11px', fontWeight:'bold'});
    lbl.textContent = labelText;
    slider.parent(ui); slider.style('margin','0 6px');
    Object.assign(valueSpan.style, {fontFamily:'Helvetica',fontSize:'11px',fontWeight:'bold'});
    container.append(lbl, slider.elt, valueSpan.elt);
    ui.appendChild(container);
  }

  // Slider columnas 3–40
  colsSlider = createSlider(3, 40, 5, 1);
  colsValue  = createSpan(colsSlider.value());
  colsSlider.input(() => { colsValue.html(colsSlider.value()); updateGrid(); });
  addRow('Columnas:', colsSlider, colsValue);

  // Slider filas 3–20
  rowsSlider = createSlider(3, 20, 5, 1);
  rowsValue  = createSpan(rowsSlider.value());
  rowsSlider.input(() => { rowsValue.html(rowsSlider.value()); updateGrid(); });
  addRow('Filas:', rowsSlider, rowsValue);

  // Botones
  addButton('DESCARGAR LOGO', 10, 80, () => saveCanvas('logo','jpg'));
  addButton('INVERTIR', 10, 120, () => { for (let k in colors) colors[k] = 255-colors[k]; });

  // Texto fijo
  textFont('Helvetica'); textSize(89); textAlign(CENTER, CENTER);

  // Inicializar
  updateGrid();
}

function updateGrid() {
  cols = colsSlider.value();
  rows = rowsSlider.value();
  offsetX = (width - moduleSize*cols)/2;
  offsetY = (height - moduleSize*rows)/2;
  allowed = {
    S: [1,2,cols+1,cols+2],
    O: [cols-1,cols,2*cols-1,2*cols],
    M: [(rows-1)*cols+1,(rows-1)*cols+2,rows*cols-1,rows*cols],
    A: [rows*cols-1,rows*cols,rows*cols-cols-1,rows*cols-cols]
  };
  letters.forEach(l => {
    l.module = random(allowed[l.char]);
    const p = moduleCenter(l.module);
    l.pos = l.from = l.to = p.copy();
  });
  lastShuffle = millis();
}

function draw() {
  background(colors.bg);
  if (millis()-lastShuffle>interval) { startTransition(); lastShuffle=millis(); }
  const t=constrain((millis()-transitionStart)/transitionDur,0,1);
  letters.forEach(l=>l.pos=p5.Vector.lerp(l.from,l.to,t));
  drawBlackGrid(); drawWhiteBlob(); drawBlackLetters();
}

function startTransition() {
  transitionStart=millis(); let used=[];
  letters.forEach(l=>{
    let opts=allowed[l.char].filter(m=>!used.includes(m)); if(!opts.length)opts=allowed[l.char].slice();
    let chosen = !used.length?random(opts):opts.reduce((best,m)=>{
      const v=moduleCenter(m);
      const minD=Math.min(...used.map(u=>{const up=moduleCenter(u);return dist(v.x,v.y,up.x,up.y);}));
      return minD>best.dist?{m,dist:minD}:best;
    },{m:opts[0],dist:-Infinity}).m;
    l.from=l.pos.copy(); l.module=chosen; used.push(chosen); l.to=moduleCenter(chosen);
  });
}

function moduleCenter(m) {
  const idx=m-1, c=idx%cols, r=floor(idx/cols);
  return createVector(offsetX+c*moduleSize+moduleSize/2, offsetY+r*moduleSize+moduleSize/2);
}

function drawBlackGrid() {
  noStroke(); fill(colors.gridFill);
  for(let i=0;i<cols;i++) for(let j=0;j<rows;j++) rect(offsetX+i*moduleSize, offsetY+j*moduleSize, moduleSize, moduleSize);
  noFill(); stroke(colors.gridOutline); strokeWeight(gridOutlineWeight);
  rect(offsetX,offsetY,moduleSize*cols,moduleSize*rows);
}

function drawWhiteBlob() {
  const samplePoints=[];
  const n=16;
  const baseR=moduleSize*0.5;
  letters.forEach(l=>{
    for(let i=0;i<n;i++){
      const a=TWO_PI/n*i+random(-0.1,0.1);
      const r=baseR+random(-moduleSize*0.05,moduleSize*0.05);
      samplePoints.push(createVector(l.pos.x+cos(a)*r,l.pos.y+sin(a)*r));
    }
  });
  const hull=convexHull(samplePoints);
  const pts=hull.map(v=>{
    const nV=noise(v.x*microNoiseScale,v.y*microNoiseScale,frameCount*0.005);
    const off=map(nV,0,1,-microNoiseDisp,microNoiseDisp);
    const a=random(TWO_PI);
    return createVector(v.x+cos(a)*off,v.y+sin(a)*off);
  });
  noStroke(); fill(colors.blobFill); curveTightness(curveTight);
  beginShape(); const len=pts.length;
    curveVertex(pts[len-1].x,pts[len-1].y);
    pts.forEach(v=>curveVertex(v.x,v.y));
    curveVertex(pts[0].x,pts[0].y); curveVertex(pts[1].x,pts[1].y);
  endShape(CLOSE);
}

function drawBlackLetters() {
  noStroke(); fill(colors.letter);
  letters.forEach(l=>text(l.char,l.pos.x,l.pos.y));
}

function convexHull(points) {
  if(points.length<=3)return points;
  const pts=points.slice().sort((a,b)=>a.x-b.x||a.y-b.y);
  const cross=(o,a,b)=>(a.x-o.x)*(b.y-o.y)-(a.y-o.y)*(b.x-o.x);
  const lower=[];
  pts.forEach(p=>{while(lower.length>=2&&cross(lower[lower.length-2],lower[lower.length-1],p)<=0)lower.pop();lower.push(p);});
  const upper=[];pts.reverse().forEach(p=>{while(upper.length>=2&&cross(upper[upper.length-2],upper[upper.length-1],p)<=0)upper.pop();upper.push(p);});
  upper.pop();lower.pop();return lower.concat(upper);
}

function addButton(label,x,y,onClick){const b=document.createElement('button');b.textContent=label;b.style.position='absolute';b.style.left=x+'px';b.style.top=y+'px';b.style.zIndex='10';document.body.appendChild(b);b.addEventListener('click',onClick);}

function subdivide(poly,iter,disp){let pts=poly.slice();for(let k=0;k<iter;k++){const next=[];pts.forEach((a,i)=>{const b=pts[(i+1)%pts.length];next.push(a);const m=p5.Vector.add(a,b).mult(0.5);const dir=p5.Vector.sub(b,a).normalize();next.push(p5.Vector.add(m,p5.Vector.mult(dir,random(-disp,disp))));});pts=next;}return pts;}

function windowResized(){resizeCanvas(windowWidth,windowHeight);updateGrid();}