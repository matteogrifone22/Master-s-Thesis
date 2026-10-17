const COVER_URL = './copertina.pdf';
const TESI_URL = './tesi.pdf';
const BACK_URL = './back.pdf';

pdfjsLib.GlobalWorkerOptions.workerSrc = 
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

// Funzione ausiliaria per creare una pagina bianca HTML/Canvas
function createBlankPage(width, height) {
  const pageDiv = document.createElement('div');
  pageDiv.className = 'page';

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  pageDiv.appendChild(canvas);
  return pageDiv;
}

// Funzione per caricare e renderizzare una pagina PDF ad alta risoluzione (HQ)
async function renderPdfPageToDiv(pdfDoc, pageNum, targetWidth, targetHeight, isHard = false) {
  const page = await pdfDoc.getPage(pageNum);

  // Fattore di scala alto (3x) per forzare la resa in alta definizione/4K
  const HIGH_RES_SCALE = 3.0; 
  const viewport = page.getViewport({ scale: HIGH_RES_SCALE });

  const pageDiv = document.createElement('div');
  pageDiv.className = 'page';
  if (isHard) {
    pageDiv.setAttribute('data-density', 'hard');
  }

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  // Risoluzione reale del Canvas (molto alta per nitidezza)
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await page.render({ canvasContext: context, viewport: viewport }).promise;

  pageDiv.appendChild(canvas);
  return pageDiv;
}

async function initBook() {
  try {
    const bookContainer = document.getElementById('book');

    // Misure di visualizzazione a schermo del singolo foglio
    const DISPLAY_WIDTH = 550;
    const DISPLAY_HEIGHT = 770;
    
    // Risoluzione HD del Canvas (moltiplicata per il fattore di scala 3)
    const CANVAS_HD_WIDTH = DISPLAY_WIDTH * 3;
    const CANVAS_HD_HEIGHT = DISPLAY_HEIGHT * 3;

    // 1. Carica i 3 file PDF
    const coverPdf = await pdfjsLib.getDocument(COVER_URL).promise;
    const tesiPdf = await pdfjsLib.getDocument(TESI_URL).promise;
    let backPdf = null;
    try {
      backPdf = await pdfjsLib.getDocument(BACK_URL).promise;
    } catch(e) {
      console.warn("Nessun file back.pdf trovato, verrà usata una pagina bianca sul retro.");
    }

    // --- COSTRUZIONE SEQUENZA PAGINE ---

    // 1. Front Cover (Da copertina.pdf - Copertina rigida)
    const coverPage = await renderPdfPageToDiv(coverPdf, 1, DISPLAY_WIDTH, DISPLAY_HEIGHT, true);
    bookContainer.appendChild(coverPage);

    // 2. Retro copertina (Bianca)
    bookContainer.appendChild(createBlankPage(CANVAS_HD_WIDTH, CANVAS_HD_HEIGHT));

    // 3. Risguardo (Bianca)
    bookContainer.appendChild(createBlankPage(CANVAS_HD_WIDTH, CANVAS_HD_HEIGHT));

    // 4. Pagina Sinistra prima della Tesi (Bianca)
    bookContainer.appendChild(createBlankPage(CANVAS_HD_WIDTH, CANVAS_HD_HEIGHT));

    // 5. Pagine della Tesi (Da tesi.pdf)
    for (let i = 1; i <= tesiPdf.numPages; i++) {
      const tesiPage = await renderPdfPageToDiv(tesiPdf, i, DISPLAY_WIDTH, DISPLAY_HEIGHT, false);
      bookContainer.appendChild(tesiPage);
    }

    // Se il numero totale di pagine finora è dispari, aggiungiamo una pagina bianca per bilanciare i quartini
    const currentPagesCount = 4 + tesiPdf.numPages;
    if (currentPagesCount % 2 !== 0) {
      bookContainer.appendChild(createBlankPage(CANVAS_HD_WIDTH, CANVAS_HD_HEIGHT));
    }

    // Finale: Pagina bianca prima della chiusura
    bookContainer.appendChild(createBlankPage(CANVAS_HD_WIDTH, CANVAS_HD_HEIGHT));

    // Back Cover (Da back.pdf se presente, altrimenti Bianca - Copertina rigida)
    if (backPdf) {
      const backCoverPage = await renderPdfPageToDiv(backPdf, 1, DISPLAY_WIDTH, DISPLAY_HEIGHT, true);
      bookContainer.appendChild(backCoverPage);
    } else {
      const blankBack = createBlankPage(CANVAS_HD_WIDTH, CANVAS_HD_HEIGHT);
      blankBack.setAttribute('data-density', 'hard');
      bookContainer.appendChild(blankBack);
    }

    // --- INIZIALIZZAZIONE PAGE FLIP ---
    const pageFlip = new St.PageFlip(bookContainer, {
      width: DISPLAY_WIDTH,
      height: DISPLAY_HEIGHT,
      size: 'fixed',
      minWidth: 300,
      maxWidth: 1000,
      minHeight: 400,
      maxHeight: 1200,
      drawShadow: true,
      maxShadowOpacity: 0.5,
      showCover: true,          // La prima pagina fa da copertina rigida chiusa
      mobileScrollSupport: false
    });

    pageFlip.loadFromHTML(document.querySelectorAll('.page'));

  } catch (error) {
    console.error('Errore durante il caricamento del libro:', error);
  }
}

initBook();