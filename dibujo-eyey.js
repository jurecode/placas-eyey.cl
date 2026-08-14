/* El dibujante del segundo medio.
 *
 * Otra pieza gráfica, el mismo sistema: las medidas están en unidades del
 * lienzo original y se escalan al lado pedido, y todo lo que se ve sale de
 * acá, tanto la vista previa como lo que se publica.
 *
 * Las herramientas compartidas —cortar el texto por ancho, medir la fuente
 * ya cargada, encajar una foto, el color que se lee sobre otro— viven en
 * placa.js y se usan igual para los dos medios.
 */

import {
  LIENZO, altoDe, aRgb, metricas, anchoDe, repartir, textoSobre, dibujarFoto, medidaLogo,
} from './placa.js';

/* La letra del titular y de la etiqueta es Anton, que es Impact libre: mismas
   proporciones condensadas y disponible en cualquier teléfono. El pie usa
   Poppins en itálica, como el arte original. */
const TIPOS = {
  titular:  '400 {px}px "Anton", Impact, "Arial Narrow", sans-serif',
  etiqueta: '400 {px}px "Anton", Impact, "Arial Narrow", sans-serif',
  pie:      'italic 800 {px}px "Poppins", Arial, sans-serif',
  flechas:  '900 {px}px "Poppins", Arial, sans-serif',
};

const fuente = (plantilla, px) => plantilla.replace('{px}', px);

export const MEDIDAS = {
  margen: 300,                    // aire a los lados, igual que el arte

  // el degradado negro que hace legible el titular sobre cualquier foto
  degradado: { desde: 30, final: 0.96, curva: 1.6 },

  logo:     { arriba: 300, alto: 190, ancho: 700 },

  // la etiqueta es un rectángulo recto, arriba a la derecha
  // pegada al borde derecho, como en el arte
  etiqueta: { fuente: 150, padX: 52, padY: 34, arriba: 330, margenDerecho: 70 },

  // interlínea holgada: con Anton, que es muy alta y condensada, un valor
  // apretado deja las líneas pegadas y los recuadros casi tocándose
  titular:  { fuente: 260, interlinea: 1.32, abajo: 235 },

  // el corte entre las dos fotos, y el círculo que va encima
  medio:    { filete: 26 },
  circulo:  { x: 50, y: 44, radio: 520, anillo: 30 },

  // el resaltado: caja de color con otra negra corrida por detrás
  // el resaltado: caja de color con otra negra corrida por detrás.
  // «aire» es lo que se separa del texto vecino, aparte del relleno propio
  marca:    { padX: 54, padY: 30, aire: 46, sombraX: -34, sombraY: -34 },

  // la huincha de abajo, de lado a lado
  huincha:  { alto: 168, fuente: 82, margen: 300, flechas: 88 },
};

/* Negro de arriba hacia abajo. No se configura: es lo que sostiene el
   titular sobre cualquier foto, y sin él el diseño no funciona. */
function degradadoNegro(ctx, alto){
  const D = MEDIDAS.degradado;
  const grad = ctx.createLinearGradient(0, 0, 0, alto);
  const inicio = D.desde / 100;
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(inicio, 'rgba(0,0,0,0)');
  for(let i = 1; i <= 12; i++){
    const t = i / 12;
    grad.addColorStop(inicio + t * (1 - inicio),
      `rgba(0,0,0,${(D.final * Math.pow(t, D.curva)).toFixed(4)})`);
  }
  return grad;
}

/* Dónde cae cada palabra de una línea. Se calcula aparte del dibujo porque
   las cajas de todas las líneas van antes que el texto de todas: si cada
   línea dibujara lo suyo por turno, el recuadro de una tapaba el texto de la
   de arriba. */
function medirLinea(ctx, palabras, x, caja, px, inter){
  const espacio = anchoDe(ctx, ' ', TIPOS.titular, px, inter);
  const posiciones = [];
  const anchos = [];
  let cursor = x;
  for(let i = 0; i < palabras.length; i++){
    if(i > 0){
      // una palabra «pegada» viene del mismo original, partida por el
      // asterisco: va sin espacio o quedaría un hueco en medio
      if(!palabras[i].pegada) cursor += espacio;
      // el aire separa el recuadro de la palabra vecina, salvo cuando el
      // asterisco partió una palabra: ahí abrirla sería peor
      if(palabras[i - 1].marcado !== palabras[i].marcado && !palabras[i].pegada){
        cursor += caja.aire;
      }
    }
    posiciones.push(cursor);
    anchos.push(anchoDe(ctx, palabras[i].t, TIPOS.titular, px, inter));
    cursor += anchos[i];
  }
  return { posiciones, anchos };
}

/* Los recuadros de una línea: el negro corrido y el de color encima. */
function cajasDeLinea(ctx, palabras, medida, baseline, caja, colores){
  const { posiciones, anchos } = medida;
  for(let i = 0; i < palabras.length; i++){
    if(!palabras[i].marcado) continue;
    let fin = i;
    while(fin + 1 < palabras.length && palabras[fin + 1].marcado) fin++;
    const desde = posiciones[i] - caja.padX;
    const hasta = posiciones[fin] + anchos[fin] + caja.padX;
    const arriba = baseline - caja.mayuscula - caja.padY;
    const alto = caja.mayuscula + caja.padY * 2;

    ctx.fillStyle = '#000000';
    ctx.fillRect(desde + caja.sombraX, arriba + caja.sombraY, hasta - desde, alto);
    ctx.fillStyle = colores.fondo;
    ctx.fillRect(desde, arriba, hasta - desde, alto);
    i = fin;
  }
}

/* Y el texto, que va siempre al final para que nada lo tape. */
function textoDeLinea(ctx, palabras, medida, baseline, px, inter, colores){
  ctx.font = fuente(TIPOS.titular, px);
  ctx.letterSpacing = `${inter}px`;
  for(let i = 0; i < palabras.length; i++){
    ctx.fillStyle = palabras[i].marcado ? colores.texto : colores.normal;
    ctx.fillText(palabras[i].t, medida.posiciones[i], baseline);
  }
}

/* La huincha de abajo: banda del color de la paleta, el «síguenos» a la
   izquierda y las flechas a la derecha. */
function dibujarHuincha(ctx, datos, marca, u, ancho, altoLienzo, invertida = false){
  const H = MEDIDAS.huincha;
  const alto = H.alto * u;
  const y = altoLienzo - alto;
  const paleta = datos.color_fondo || '#ff0000';
  // en el cierre el fondo ya es el color de la paleta: si la huincha fuera
  // del mismo color desaparecería, así que ahí va al revés
  const color = invertida ? textoSobre(paleta) : paleta;
  const tinta = invertida ? paleta : textoSobre(paleta);

  ctx.fillStyle = color;
  ctx.fillRect(0, y, ancho, alto);

  const px = H.fuente * u;
  const met = metricas(ctx, TIPOS.pie, px);
  const linea = y + alto / 2 + met.mayuscula / 2;

  ctx.fillStyle = tinta;
  ctx.font = fuente(TIPOS.pie, px);
  ctx.letterSpacing = '0px';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(marca.pie || 'SÍGUENOS', H.margen * u, linea);

  const flechas = '>>>';
  const pxF = H.flechas * u;
  const metF = metricas(ctx, TIPOS.flechas, pxF);
  ctx.font = fuente(TIPOS.flechas, pxF);
  const anchoF = ctx.measureText(flechas).width;
  ctx.fillText(flechas, ancho - H.margen * u - anchoF,
    y + alto / 2 + metF.mayuscula / 2);
}

/* La etiqueta: rectángulo negro arriba a la derecha. */
function dibujarEtiqueta(ctx, datos, u, anchoLienzo){
  const texto = String(datos.etiqueta || '').trim().toUpperCase();
  if(!texto) return;

  const E = MEDIDAS.etiqueta;
  const px = E.fuente * u;
  const met = metricas(ctx, TIPOS.etiqueta, px);
  const alto = met.mayuscula + E.padY * u * 2;
  const ancho = anchoDe(ctx, texto, TIPOS.etiqueta, px, 0) + E.padX * u * 2;
  const x = anchoLienzo - E.margenDerecho * u - ancho;
  const y = E.arriba * u;

  ctx.fillStyle = '#000000';
  ctx.fillRect(x, y, ancho, alto);

  ctx.fillStyle = '#ffffff';
  ctx.font = fuente(TIPOS.etiqueta, px);
  ctx.letterSpacing = '0px';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(texto, x + E.padX * u, y + E.padY * u + met.mayuscula);
}

/* ------------------------------------------------------------------ */
/* la placa                                                            */
/* ------------------------------------------------------------------ */

/* Se pide el ancho y el alto sale solo: la proporción es 4:5, la del feed, y
   es parte del diseño. El canvas tiene que venir de ese tamaño.
   Acá el alto de más no obliga a recolocar nada: la foto va a sangre, el logo
   y la etiqueta cuelgan del borde de arriba y el titular se apoya sobre la
   huincha, que sigue pegada al de abajo. */
export function dibujar(ctx, datos, fotos, ancho, marca = {}){
  const u = ancho / LIENZO;
  const alto = altoDe(ancho);

  ctx.clearRect(0, 0, ancho, alto);
  ctx.fillStyle = '#0b0b0d';
  ctx.fillRect(0, 0, ancho, alto);
  ctx.letterSpacing = '0px';
  ctx.textBaseline = 'alphabetic';

  // la foto llena el cuadro. Las imágenes llegan con las claves cortas
  // —izq, der, cen— y no con el nombre del campo de la placa.
  /* Los armados son los mismos que el otro medio: una foto o dos, con o sin
     el círculo. Acá no hay recuadro con márgenes como allá —la foto va a
     sangre— así que dos fotos son las dos mitades del cuadro. */
  const dosFotos = String(datos.diseno || 'unica').startsWith('duo');
  const hueco = dosFotos ? (ancho - MEDIDAS.medio.filete * u) / 2 : ancho;
  dibujarFoto(ctx, fotos.izq, 0, 0, hueco, alto,
    datos.foto_izq_ajuste || 'cubrir', datos.foto_izq_x ?? 50, datos.foto_izq_y ?? 50, u);
  if(dosFotos){
    dibujarFoto(ctx, fotos.der, hueco + MEDIDAS.medio.filete * u, 0, hueco, alto,
      datos.foto_der_ajuste || 'cubrir', datos.foto_der_x ?? 50, datos.foto_der_y ?? 50, u);
  }

  /* El círculo recortado, con su anillo blanco. Va antes del degradado, para
     que el fundido lo alcance igual que a las fotos y no quede flotando por
     encima de todo. */
  if(String(datos.diseno || '').endsWith('-circulo')){
    const C = MEDIDAS.circulo;
    const cx = ancho * (datos.circulo_x ?? C.x) / 100;
    const cy = alto * (datos.circulo_y ?? C.y) / 100;
    const radio = C.radio * u;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radio - C.anillo * u, 0, Math.PI * 2);
    ctx.clip();
    const lado = (radio - C.anillo * u) * 2;
    dibujarFoto(ctx, fotos.cen, cx - lado / 2, cy - lado / 2, lado, lado,
      datos.foto_cen_ajuste || 'cubrir', datos.foto_cen_x ?? 50, datos.foto_cen_y ?? 50, u);
    ctx.restore();
    ctx.beginPath();
    ctx.arc(cx, cy, radio - C.anillo * u / 2, 0, Math.PI * 2);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = C.anillo * u;
    ctx.stroke();
  }

  ctx.fillStyle = degradadoNegro(ctx, alto);
  ctx.fillRect(0, 0, ancho, alto);

  // el logo, arriba a la izquierda
  if(fotos.logo){
    const L = MEDIDAS.logo;
    const escala = Math.min(L.alto / fotos.logo.height, L.ancho / fotos.logo.width) * u;
    ctx.drawImage(fotos.logo, MEDIDAS.margen * u, L.arriba * u,
      fotos.logo.width * escala, fotos.logo.height * escala);
  }

  dibujarEtiqueta(ctx, datos, u, ancho);

  // el titular, apoyado sobre la huincha
  const izquierda = MEDIDAS.margen * u;
  const maxAncho = ancho - izquierda * 2;
  const abajo = alto - MEDIDAS.huincha.alto * u - MEDIDAS.titular.abajo * u;
  // el titular no puede subir más allá de la etiqueta
  const tope = (MEDIDAS.etiqueta.arriba + MEDIDAS.etiqueta.fuente
                + MEDIDAS.etiqueta.padY * 2 + 90) * u;

  /* El cuerpo es el del arte y no se toca. Si el titular es tan largo que se
     saldría por arriba, se achica solo lo justo para que entre. */
  let px = MEDIDAS.titular.fuente * u;
  let interlinea, lineas, met, arriba;
  for(let intento = 0; intento < 12; intento++){
    interlinea = px * MEDIDAS.titular.interlinea;
    lineas = repartir(ctx, datos.titulo, TIPOS.titular, px, 0, maxAncho);
    met = metricas(ctx, TIPOS.titular, px);
    arriba = abajo - lineas.length * interlinea;
    if(arriba >= tope) break;
    px *= 0.92;
  }
  const medioInterlineado = (interlinea - (met.ascenso + met.descenso)) / 2;

  const M = MEDIDAS.marca;
  const caja = {
    mayuscula: met.mayuscula,
    padX: M.padX * u, padY: M.padY * u, aire: M.aire * u,
    sombraX: M.sombraX * u, sombraY: M.sombraY * u,
  };
  const colores = {
    normal: '#ffffff',
    fondo: datos.color_filete || '#ff0000',
    texto: textoSobre(datos.color_filete || '#ff0000'),
  };

  // dos pasadas: todas las cajas y recién después todas las letras
  const bases = lineas.map((_, i) => arriba + i * interlinea + medioInterlineado + met.ascenso);
  const medidas = lineas.map((linea) => medirLinea(ctx, linea, izquierda, caja, px, 0));
  lineas.forEach((linea, i) => cajasDeLinea(ctx, linea, medidas[i], bases[i], caja, colores));
  lineas.forEach((linea, i) => textoDeLinea(ctx, linea, medidas[i], bases[i], px, 0, colores));

  dibujarHuincha(ctx, datos, marca, u, ancho, alto);
}

/* La lámina del carrusel: la foto con el degradado y la huincha, sin texto. */
export function dibujarLamina(ctx, datos, lamina, foto, logo, ancho, marca = {}){
  const u = ancho / LIENZO;
  const alto = altoDe(ancho);

  ctx.clearRect(0, 0, ancho, alto);
  ctx.fillStyle = '#0b0b0d';
  ctx.fillRect(0, 0, ancho, alto);
  ctx.letterSpacing = '0px';

  dibujarFoto(ctx, foto, 0, 0, ancho, alto,
    lamina.ajuste || 'cubrir', lamina.x ?? 50, lamina.y ?? 50, u);

  ctx.fillStyle = degradadoNegro(ctx, alto);
  ctx.fillRect(0, 0, ancho, alto);

  if(logo){
    const [anchoLogo, altoLogo] = medidaLogo(logo, u);
    ctx.drawImage(logo, MEDIDAS.margen * u, MEDIDAS.logo.arriba * u, anchoLogo, altoLogo);
  }
  dibujarHuincha(ctx, datos, marca, u, ancho, alto);
}

/* ------------------------------------------------------------------ */
/* la lámina de cierre                                                 */
/* ------------------------------------------------------------------ */

/* El otro medio tiene su cierre dibujado como una imagen aparte. Acá se
   arma con las mismas piezas de la placa —el logo, la letra condensada, la
   huincha— así que cambia solo con la paleta y no hay un archivo que
   mantener aparte. Si algún día llega el arte propio, se pone en marca/ y
   este dibujo se reemplaza sin tocar nada más. */
export function dibujarCierre(ctx, datos, arte, ancho, marca = {}, logo = null){
  const u = ancho / LIENZO;
  const alto = altoDe(ancho);
  const color = datos.color_fondo || '#ff0000';
  const tinta = textoSobre(color);

  ctx.clearRect(0, 0, ancho, alto);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, ancho, alto);
  ctx.letterSpacing = '0px';
  ctx.textBaseline = 'alphabetic';

  // si algún día hay arte propio, manda ese y no se dibuja nada más. Entra
  // entero y centrado: si viniera cuadrado, agrandarlo hasta llenar el 4:5 le
  // comería los márgenes, y lo que sobra arriba y abajo ya es el color de la
  // paleta, así que no se ve ninguna franja.
  if(arte){
    const escala = Math.min(ancho / arte.width, alto / arte.height);
    const w = arte.width * escala, h = arte.height * escala;
    ctx.drawImage(arte, (ancho - w) / 2, (alto - h) / 2, w, h);
    return;
  }

  const centro = ancho / 2;

  // el logo, arriba del texto y pintado del color que se lea sobre el fondo
  if(logo){
    const altoLogo = 420 * u;
    const escala = altoLogo / logo.height;
    const anchoLogo = logo.width * escala;
    const x = centro - anchoLogo / 2;
    const y = alto * 0.30 - altoLogo / 2;

    const tinte = document.createElement('canvas');
    tinte.width = Math.max(1, Math.round(anchoLogo));
    tinte.height = Math.max(1, Math.round(altoLogo));
    const tc = tinte.getContext('2d');
    tc.drawImage(logo, 0, 0, tinte.width, tinte.height);
    tc.globalCompositeOperation = 'source-in';
    tc.fillStyle = tinta;
    tc.fillRect(0, 0, tinte.width, tinte.height);
    ctx.drawImage(tinte, x, y, anchoLogo, altoLogo);
  }

  // «SÍGUENOS Y COMPARTE», con la segunda línea sobre su caja, igual que el
  // resaltado del titular
  const px = 330 * u;
  const met = metricas(ctx, TIPOS.titular, px);
  const interlinea = px * 1.02;
  const base = alto * 0.60;

  ctx.font = fuente(TIPOS.titular, px);
  ctx.fillStyle = tinta;
  const uno = 'SIGUENOS';
  ctx.fillText(uno, centro - ctx.measureText(uno).width / 2, base);

  const dos = 'Y COMPARTE';
  const anchoDos = ctx.measureText(dos).width;
  const M = MEDIDAS.marca;
  const padX = M.padX * u, padY = M.padY * u;
  const x2 = centro - anchoDos / 2;
  const y2 = base + interlinea;
  const arriba = y2 - met.mayuscula - padY;
  const altoCaja = met.mayuscula + padY * 2;

  ctx.fillStyle = tinta === '#ffffff' ? '#000000' : '#ffffff';
  ctx.fillRect(x2 - padX + M.sombraX * u, arriba + M.sombraY * u,
    anchoDos + padX * 2, altoCaja);
  ctx.fillStyle = tinta;
  ctx.fillRect(x2 - padX, arriba, anchoDos + padX * 2, altoCaja);

  ctx.fillStyle = color;
  ctx.font = fuente(TIPOS.titular, px);
  ctx.fillText(dos, x2, y2);

  dibujarHuincha(ctx, datos, marca, u, ancho, alto, true);
}
