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
  LIENZO, aRgb, metricas, anchoDe, repartir, textoSobre, dibujarFoto, medidaLogo,
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

  titular:  { fuente: 260, interlinea: 1.04, abajo: 175 },

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
function dibujarHuincha(ctx, datos, marca, u, lado, invertida = false){
  const H = MEDIDAS.huincha;
  const alto = H.alto * u;
  const y = lado - alto;
  const paleta = datos.color_fondo || '#ff0000';
  // en el cierre el fondo ya es el color de la paleta: si la huincha fuera
  // del mismo color desaparecería, así que ahí va al revés
  const color = invertida ? textoSobre(paleta) : paleta;
  const tinta = invertida ? paleta : textoSobre(paleta);

  ctx.fillStyle = color;
  ctx.fillRect(0, y, lado, alto);

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
  ctx.fillText(flechas, lado - H.margen * u - anchoF,
    y + alto / 2 + metF.mayuscula / 2);
}

/* La etiqueta: rectángulo negro arriba a la derecha. */
function dibujarEtiqueta(ctx, datos, u, lado){
  const texto = String(datos.etiqueta || '').trim().toUpperCase();
  if(!texto) return;

  const E = MEDIDAS.etiqueta;
  const px = E.fuente * u;
  const met = metricas(ctx, TIPOS.etiqueta, px);
  const alto = met.mayuscula + E.padY * u * 2;
  const ancho = anchoDe(ctx, texto, TIPOS.etiqueta, px, 0) + E.padX * u * 2;
  const x = lado - E.margenDerecho * u - ancho;
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

export function dibujar(ctx, datos, fotos, lado, marca = {}){
  const u = lado / LIENZO;

  ctx.clearRect(0, 0, lado, lado);
  ctx.fillStyle = '#0b0b0d';
  ctx.fillRect(0, 0, lado, lado);
  ctx.letterSpacing = '0px';
  ctx.textBaseline = 'alphabetic';

  // la foto llena el cuadro. Las imágenes llegan con las claves cortas
  // —izq, der, cen— y no con el nombre del campo de la placa.
  dibujarFoto(ctx, fotos.izq, 0, 0, lado, lado,
    datos.foto_izq_ajuste || 'cubrir', datos.foto_izq_x ?? 50, datos.foto_izq_y ?? 50, u);

  ctx.fillStyle = degradadoNegro(ctx, lado);
  ctx.fillRect(0, 0, lado, lado);

  // el logo, arriba a la izquierda
  if(fotos.logo){
    const L = MEDIDAS.logo;
    const escala = Math.min(L.alto / fotos.logo.height, L.ancho / fotos.logo.width) * u;
    ctx.drawImage(fotos.logo, MEDIDAS.margen * u, L.arriba * u,
      fotos.logo.width * escala, fotos.logo.height * escala);
  }

  dibujarEtiqueta(ctx, datos, u, lado);

  // el titular, apoyado sobre la huincha
  const px = (datos.tam_titulo || MEDIDAS.titular.fuente) * u;
  const interlinea = px * MEDIDAS.titular.interlinea;
  const izquierda = MEDIDAS.margen * u;
  const maxAncho = lado - izquierda * 2;
  const lineas = repartir(ctx, datos.titulo, TIPOS.titular, px, 0, maxAncho);
  const met = metricas(ctx, TIPOS.titular, px);

  const abajo = lado - MEDIDAS.huincha.alto * u - MEDIDAS.titular.abajo * u;
  const arriba = abajo - lineas.length * interlinea;
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

  dibujarHuincha(ctx, datos, marca, u, lado);
}

/* La lámina del carrusel: la foto con el degradado y la huincha, sin texto. */
export function dibujarLamina(ctx, datos, lamina, foto, logo, lado, marca = {}){
  const u = lado / LIENZO;

  ctx.clearRect(0, 0, lado, lado);
  ctx.fillStyle = '#0b0b0d';
  ctx.fillRect(0, 0, lado, lado);
  ctx.letterSpacing = '0px';

  dibujarFoto(ctx, foto, 0, 0, lado, lado,
    lamina.ajuste || 'cubrir', lamina.x ?? 50, lamina.y ?? 50, u);

  ctx.fillStyle = degradadoNegro(ctx, lado);
  ctx.fillRect(0, 0, lado, lado);

  if(logo){
    const [ancho, alto] = medidaLogo(logo, u);
    ctx.drawImage(logo, MEDIDAS.margen * u, MEDIDAS.logo.arriba * u, ancho, alto);
  }
  dibujarHuincha(ctx, datos, marca, u, lado);
}

/* ------------------------------------------------------------------ */
/* la lámina de cierre                                                 */
/* ------------------------------------------------------------------ */

/* El otro medio tiene su cierre dibujado como una imagen aparte. Acá se
   arma con las mismas piezas de la placa —el logo, la letra condensada, la
   huincha— así que cambia solo con la paleta y no hay un archivo que
   mantener aparte. Si algún día llega el arte propio, se pone en marca/ y
   este dibujo se reemplaza sin tocar nada más. */
export function dibujarCierre(ctx, datos, arte, lado, marca = {}, logo = null){
  const u = lado / LIENZO;
  const color = datos.color_fondo || '#ff0000';
  const tinta = textoSobre(color);

  ctx.clearRect(0, 0, lado, lado);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, lado, lado);
  ctx.letterSpacing = '0px';
  ctx.textBaseline = 'alphabetic';

  // si algún día hay arte propio, manda ese y no se dibuja nada más
  if(arte){
    ctx.drawImage(arte, 0, 0, lado, lado);
    return;
  }

  const centro = lado / 2;

  // el logo, arriba del texto y pintado del color que se lea sobre el fondo
  if(logo){
    const alto = 420 * u;
    const escala = alto / logo.height;
    const ancho = logo.width * escala;
    const x = centro - ancho / 2;
    const y = lado * 0.30 - alto / 2;

    const tinte = document.createElement('canvas');
    tinte.width = Math.max(1, Math.round(ancho));
    tinte.height = Math.max(1, Math.round(alto));
    const tc = tinte.getContext('2d');
    tc.drawImage(logo, 0, 0, tinte.width, tinte.height);
    tc.globalCompositeOperation = 'source-in';
    tc.fillStyle = tinta;
    tc.fillRect(0, 0, tinte.width, tinte.height);
    ctx.drawImage(tinte, x, y, ancho, alto);
  }

  // «SÍGUENOS Y COMPARTE», con la segunda línea sobre su caja, igual que el
  // resaltado del titular
  const px = 330 * u;
  const met = metricas(ctx, TIPOS.titular, px);
  const interlinea = px * 1.02;
  const base = lado * 0.60;

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

  dibujarHuincha(ctx, datos, marca, u, lado, true);
}
