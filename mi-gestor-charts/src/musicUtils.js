// src/musicUtils.js

// Definimos las 12 notas de la escala cromática. Usamos sostenidos para estandarizar.
const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Un mapa para convertir bemoles a su sostenido equivalente (enarmonía)
const FLATS_TO_SHARPS = {
  'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#',
  'Cb': 'B',  'Fb': 'E'
};

// Algunas equivalencias adicionales para sostenidos especiales (enarmonías)
const SPECIAL_EQUIVALENTS = {
  'E#': 'F',
  'B#': 'C'
};

/**
 * Parsea un acorde para separar la nota raíz del resto (la "calidad").
 * Ej: "C#m7" -> ["C#", "m7"]
 * Ej: "G" -> ["G", ""]
 * @param {string} chord - El acorde completo.
 * @returns {Array|null} - Un array con [nota, calidad] o null si no es válido.
 */
function parseChord(chord) {
  // Esta Regex captura la nota (C, G#, Db) y el resto del acorde.
  const match = chord.match(/^([A-G](?:#|b)?)(.*)/);
  if (!match) return null;
  return [match[1], match[2]]; // [ 'C#', 'm7' ]
}

/**
 * La función principal. Transpone un acorde un número determinado de semitonos.
 * @param {string} chord - El acorde original, ej: "Gm7".
 * @param {number} amount - El número de semitonos a mover (positivo para subir, negativo para bajar).
 * @returns {string} - El nuevo acorde transpuesto.
 */
export function transposeChord(chord, amount) {
  if (!chord || amount === 0) return chord;

  // Soportamos slash-chords y mantenemos el sufijo intacto
  // Ej: "D/F#" -> root D, quality '', bass F#
  const slashParts = chord.split('/');
  const main = slashParts[0];
  const bassPart = slashParts[1] || null;

  const parsed = parseChord(main);
  if (!parsed) return chord;
  let [root, quality] = parsed;

  // Detectar si la nota original usaba bemol para poder preservar estilo
  const usedFlat = /b$/.test(root);

  // Normalizamos para cálculo (usar sostenidos internamente)
  let normRoot = root;
  if (normRoot in FLATS_TO_SHARPS) normRoot = FLATS_TO_SHARPS[normRoot];
  if (normRoot in SPECIAL_EQUIVALENTS) normRoot = SPECIAL_EQUIVALENTS[normRoot];

  const idx = NOTES.indexOf(normRoot);
  if (idx === -1) return chord;
  const newIndex = (idx + amount + NOTES.length) % NOTES.length;
  let newNote = NOTES[newIndex];

  // Si la original usaba bemol, intentamos devolver un bemol equivalente cuando exista
  if (usedFlat) {
    // invertir FLATS_TO_SHARPS map para buscar el bemol correspondiente
    const SHARPS_TO_FLATS = Object.entries(FLATS_TO_SHARPS).reduce((acc, [flat, sharp]) => {
      acc[sharp] = flat; return acc;
    }, {});
    if (newNote in SHARPS_TO_FLATS) newNote = SHARPS_TO_FLATS[newNote];
  }

  // Reconstruir la parte principal
  let result = newNote + quality;

  // Manejar bajo (bass) si existía
  if (bassPart) {
    // Transponemos el bajo por cantidad absoluta (mismo amount)
    const bassParsed = parseChord(bassPart.trim());
    if (bassParsed) {
      const [bassRoot, bassQual] = bassParsed;
      // normalizamos
      let normBass = bassRoot;
      if (normBass in FLATS_TO_SHARPS) normBass = FLATS_TO_SHARPS[normBass];
      if (normBass in SPECIAL_EQUIVALENTS) normBass = SPECIAL_EQUIVALENTS[normBass];
      const bIdx = NOTES.indexOf(normBass);
      if (bIdx !== -1) {
        let newBass = NOTES[(bIdx + amount + NOTES.length) % NOTES.length];
        // preservar estilo de accidental del bajo (si el bajo original era bemol)
        if (/b$/.test(bassRoot)) {
          const SHARPS_TO_FLATS = Object.entries(FLATS_TO_SHARPS).reduce((acc, [flat, sharp]) => { acc[sharp] = flat; return acc; }, {});
          if (newBass in SHARPS_TO_FLATS) newBass = SHARPS_TO_FLATS[newBass];
        }
        result += '/' + newBass + (bassQual || '');
      } else {
        // fallback: dejar el bajo original si no se puede parsear
        result += '/' + bassPart.trim();
      }
    } else {
      result += '/' + bassPart.trim();
    }
  }

  return result;
}

// También exportamos utilidades si se necesitan más adelante
export default {
  transposeChord,
};

/**
 * Devuelve el índice cromático (0-11) para una nota dada, normalizando bemoles y equivalentes.
 * @param {string} note
 * @returns {number} índice o -1 si no se reconoce
 */
export function noteIndex(note) {
  if (!note) return -1;
  let n = note.trim();
  // Tomamos sólo la raíz si vienen sufijos
  const m = n.match(/^([A-G](?:#|b)?)/);
  if (m) n = m[1];
  if (n in FLATS_TO_SHARPS) n = FLATS_TO_SHARPS[n];
  if (n in SPECIAL_EQUIVALENTS) n = SPECIAL_EQUIVALENTS[n];
  return NOTES.indexOf(n);
}

/**
 * Calcula la cantidad mínima de semitonos para transponer de una nota a otra.
 * Devuelve un entero en rango -6..+6 para transposiciones más naturales.
 */
export function transposeAmount(fromNote, toNote) {
  const fi = noteIndex(fromNote);
  const ti = noteIndex(toNote);
  if (fi === -1 || ti === -1) return 0;
  let diff = (ti - fi + NOTES.length) % NOTES.length;
  if (diff > NOTES.length / 2) diff -= NOTES.length; // usa la dirección más corta
  return diff;
}
