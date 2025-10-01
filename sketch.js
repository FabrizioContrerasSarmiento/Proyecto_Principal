//git add . - git commit -m "algo" - git push

const frmRate = 30;
let bubbles = [];
let fishes = [];
const N = 50; // cantidad de peces
let musica, popSnd;       // música ambiente + pop de burbuja
let useMic = false, mic, fft;
let paused = false;
let teclas_velocidad = 1;      // escala de velocidad global (teclas ↑/↓)
let fishSpeedFromMic = 1; // escala desde mic
let tamaño_burbuja = 1;      // escala de tamaño de burbuja desde mic
let mostrarAyuda = false;  // H para mostrar/ocultar
let contador_burbujas = 0; // contador de burbujas explotadas
let alga;
let algas = [];

function preload() { // cargo los archivos
  musica = loadSound('ambiente_agua.mp3');
  popSnd = loadSound('pop.mp3');
  alga = loadImage("alga.png");
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  frameRate(frmRate);
  colorMode(HSL, 360, 100, 100, 1); // cambia el sistema de color a HSL (tono, saturación, luminosidad, alfa).

  initBubbles(100); // crea 100 burbujas y N peces
  initFishes(N);

  userStartAudio().then(() => { // permite q el navegador reproduzca la musica
    musica.setLoop(true); // en loop y el volumen
    musica.setVolume(0.15);
  });

  fft = new p5.FFT(0.8, 64); // analiza el sonido

  for (let i = 0; i < 8; i++) {
    algas.push({
      xBase: (i + 1) * (width / 9), // 8 columnas distribuidas
      fase: random(TWO_PI),         // para que no se muevan todas iguales
      amp: random(5, 15)            // amplitud distinta del vaivén
    });
  }
}

// === Loop ===
function draw() {
  drawWater(); // Llama a la función que dibuja el agua animada
  drawAlga(); 

  // burbujas
  for (let b of bubbles) { // recorre el array de burbujas
    b.show(); // las muestra
    b.bubblemovex(); // las mueve en x
    b.bubblemovey(); // las mueve en y
  }

  // peces
  for (let f of fishes) { // recorre el array de peces
    f.show(); // las muestra
    f.move(); // las mueve
  }

  if (useMic && mic) { // si el microfono esta encendido
    const level = mic.getLevel(); // mide el volumen captado.
    fishSpeedFromMic = map(level, 0, 0.20, 0.9, 3.5, true); // esto hace q los peces nadan más rápido cuando hablás fuerte.
    tamaño_burbuja      = map(level, 0, 0.20, 0.9, 0.1, true); // esto hace q las burbujas se achican cuanto más fuerte hables.
  } else {
    fishSpeedFromMic = 1;
    tamaño_burbuja = 1;
  }

   push(); // dibuja el texto de contador de burbujas
  fill(255);
  textSize(24);
  textAlign(LEFT, TOP);
  text("Burbujas explotadas: " + contador_burbujas, 20, 20);
  pop();

  if (mostrarAyuda) {
    dibujarHUD();
  }

  if (!mostrarAyuda) {
    push();
    fill(200);
    textSize(20);
    textAlign(LEFT, TOP);
    text("Presioná H para abrir el panel", 20, 50);
    pop();
  }
}

function dibujarHUD() {
  const pad = 14;
  const x = 16, y = 60;      
  const ancho = 200, alto = 170;

  push();
  // panel
  noStroke();
  fill(0, 0, 0, 180);              
  rect(x, y, ancho, alto, 12);     

  // título
  fill(255);
  textAlign(LEFT, TOP);
  textSize(18);
  text("Controles (teclas)", x + pad, y + pad);

  // línea fina separadora
  stroke(255, 80);
  strokeWeight(1);
  line(x + pad, y + pad + 24, x + ancho - pad, y + pad + 24);

  // texto de ayuda
  noStroke();
  textSize(14);
  const col1 = x + pad;
  const col2 = x + 175;

  let r = y + pad + 34;  // fila inicial

  // columna izquierda
  text("Espacio: Música play/pause", col1, r); r += 20;
  text("M: Micrófono on/off",        col1, r); r += 20;
  text("B: Ráfaga de burbujas",      col1, r); r += 20;
  text("P: Pausar/continuar",        col1, r); r += 20;
  text("S: Captura de pantalla",     col1, r); r += 20;

  pop();
}

/* ---------- Agua ---------- */
function drawWater() { // funcion para el agua
  const baseHue = 200; // tono del agua
  const sat = 55; // saturacion       
  const grid = 6;  // altura de la franja horizontal      
  const yScale = 0.01;   
  const tScale = 0.008;  

  const t = frameCount * tScale; // esto hace que el agua parece q se mueva , sirve para desplazar el ruido

  push();
  noStroke();
  colorMode(HSL, 360, 100, 100, 1);
  for (let y = 0; y < height; y += grid) {
    const n = noise(y * yScale, t); // valor del ruido perlin
    const light = map(n, 0, 1, 35, 55); // brillo 
    fill(baseHue, sat, light);
    rect(0, y, width, grid); // dibujo una franja horizontal
  }
  pop();
}

/* ---------- Burbujas ---------- */
function initBubbles(n) { // funcion q crea las burbujas
  for (let i = 0; i < n; i++) {
    let x = random(width);
    let y = random(height); 
    let s = 60; // tamaño base de la burbuja
    let angle = 0; // angulo
    let sinmove = random(0.2, 2); // amplitud de la burbuja random
    bubbles[i] = new Bubble(x, y, s, angle, sinmove);
  }
}

class Bubble { // define cómo son y cómo se comportan las burbujas 
  constructor(x, y, s, angle, sinmove) {
    this.x = x;
    this.y = y;
    this.s = s; // tamaño de la burbuja
    this.angle = angle;
    this.sinmove = sinmove; 
  }

  bubblemovex() { // se mueve en un mov tipo serpenteante x
    this.x += sin(this.angle) * this.sinmove; 
    this.angle += 0.05;
  }

  bubblemovey() { // mov en y de la burbuja
    this.y += random(-2, -5); // sube 
    if (this.y < 0) {
      this.y = height; // cuando sale por arriba, vuelve abajo
    }
  }

  show() { // dibujo de las burbujas
    push();
    colorMode(HSB, 360, 100, 100, 2); 
    const s = this.s * tamaño_burbuja;   
    strokeWeight(2);
    stroke(180, 85, 60, 0.5);
    fill(180, 85, 90, 0.6);
    ellipse(this.x, this.y, this.s, this.s);

    noFill();
    strokeWeight(10);
    stroke(180, 0, 100, 1);
    arc(this.x, this.y, this.s - 20, this.s - 20, PI + QUARTER_PI, PI + HALF_PI);
    pop();
  }
}

function popBubble(i){ // funcion q explota una burbuja al hacer click
  bubbles.splice(i, 1);     // elimina la burbuja del array
  contador_burbujas++;            // suma al contador
  if (popSnd) {             // sonido al explotar
    popSnd.rate(random(0.9,1.2));
    popSnd.setVolume(0.25);
    popSnd.play();
  }
}

/* ---------- Peces ---------- */
function initFishes(n) { // funcion q crea los peces
  for (let i = 0; i < n; i++) {
    let k = pow((i + 1) / n, 3); // escala con peces donde hay mas chicos q grandes
    fishes.push(new Fish(random(width), random(height), k)); // altura random y height random 
  }
}

class Fish { // la clase fish define cómo son y cómo se comportan los peces
  constructor(x, y, k) {
    this.x = x;
    this.y = y;
    this.k = k; // tamaño relativo del pez
    this.length = k * 110;
    this.speed = k * 15;
    this.col = color(random(200), random(200), 70); // color del pez
    this.eye = color(0, 0, 100); // color del ojo
  }

   move() {
    const v = this.speed * teclas_velocidad * fishSpeedFromMic; // <— mezcla teclas + mic
    this.x -= v; // si x va disminuyendo el pez de desplaza a la izq
    if (this.x < -this.length) { // si el pez se va de la pantalla
      this.x = width + random(200); // 
      this.y = random(height); // crea un y de altura aleatoria
    }
  }

  show() { // dibujo de los peces
    push();
    translate(this.x, this.y);
    scale(this.k);
    noStroke();
    fill(this.col);

    beginShape();
    vertex(0, 0);
    bezierVertex(40, -40, 120, -10, 140, -10);
    bezierVertex(150, -30, 170, -40, 190, -50);
    bezierVertex(180, 20, 180, 30, 200, 80);
    bezierVertex(160, 30, 130, 40, 80, 30);
    bezierVertex(50, 30, 10, 20, 0, 10);
    endShape(CLOSE);

    fill(this.eye);
    ellipse(30, -5, 10, 5);

    pop();
  }
}

function keyPressed(){ // se ejecuta automáticamente cada vez que presionás una tecla del teclado
  if (key === ' ') {                 // SPACE: play/pause música
    if (musica?.isPlaying()) musica.pause(); else musica?.play();
  }
  else if (key === 'm') {            // M: activa/desactiva mic
    toggleMic();
  }
  else if (key === 'b') {            // B: ráfaga de burbujas + pop sound
    for (let i=0;i<10;i++){
      bubbles.push(new Bubble(random(width), random(height), 60, 0, random(-1,1))); // creas 10 burbujas en posiciones aleatorias
    }
    popSnd?.play();
  }
  else if (keyCode === UP_ARROW) {   // flecha arriba aumentas la velocidad de los peces
    teclas_velocidad = min(teclas_velocidad + 0.1, 3);
  }
  else if (keyCode === DOWN_ARROW) { // flecha abajo disminuis la velocidad de los peces
    teclas_velocidad = max(teclas_velocidad - 0.1, 0.2);
  }
  else if (key === 'p') {            // P: pausar/continuar pantalla
    paused = !paused; if (paused) noLoop(); else loop();
  }
  else if (key === 's') {            // S: screenshot de la pantalla
    saveCanvas('acuario', 'png');
  }
  else if (key === 'h' || key === 'H') { // H : mostrar ayuda para ver los controles
  mostrarAyuda = !mostrarAyuda;
  }
}

function mousePressed(){ // al hacer click en una de las burbujas explota
  for (let i = bubbles.length - 1; i >= 0; i--) { // recorro las burbujas
    const d = dist(mouseX, mouseY, bubbles[i].x, bubbles[i].y);
    if (d < bubbles[i].s * 0.5 * tamaño_burbuja) { // calcula q el click este dentro del radio completo de la burbuja
      popBubble(i);
      break; // explota solo una por click
    }
  }
}

function toggleMic(){ // interruptor para encender o apagar el micrófono q se pasa a keyPressed
  if (!useMic) { // si useMic no esta activo , crea una entrada de audio
    mic = new p5.AudioIn();
    mic.start(() => { // arranca la captura de sonido
      fft.setInput(mic); // conecta el mic a la FFT que es el análisis de frecuencias/volumen
      useMic = true; // se enciende el mic
    });
  } else { // si ya estaba activo 
    if (mic) mic.stop(); // lo apaga
    useMic = false; 
  }
}

function drawAlga() {
  imageMode(CENTER);
  for (let a of algas) {
    let sway = sin(frameCount * 0.03 + a.fase) * a.amp; // movimiento horizontal ondulatorio
    let x = a.xBase + sway; // posición en el suelo (todas igual en Y)
    let y = height - alga.height * 1.2 * 0.5; // mismo nivel para todas

    // todas con misma escala
    image(alga, x, y, alga.width * 0.8, alga.height * 1.4);
  }
}

//Sirve para que el lienzo se adapte automáticamente al tamaño de la ventana cuando la cambiás
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
