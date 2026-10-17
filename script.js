const COVER_URL = './copertina.pdf';
const TESI_URL = './tesi.pdf';
const BACK_URL = './back.pdf';

pdfjsLib.GlobalWorkerOptions.workerSrc = 
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

let pageFlip = null;
let currentZoom = 1;
let totalBookPages = 0;

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

async function renderPdfPageToDiv(pdfDoc, pageNum, isHard = false) {
  const page = await pdfDoc.getPage(pageNum);
  const HIGH_RES_SCALE = 3.0; 
  const viewport = page.getViewport({ scale: HIGH_RES_SCALE });

  const pageDiv = document.createElement('div');
  pageDiv.className = 'page';
  if (isHard) {
    pageDiv.setAttribute('data-density', 'hard');
  }

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await page.render({ canvasContext: context, viewport: viewport }).promise;

  pageDiv.appendChild(canvas);
  return pageDiv;
}

async function initBook() {
  try {
    const bookContainer = document.getElementById('book');

    const DISPLAY_WIDTH = 550;
    const DISPLAY_HEIGHT = 770;
    const CANVAS_HD_WIDTH = DISPLAY_WIDTH * 3;
    const CANVAS_HD_HEIGHT = DISPLAY_HEIGHT * 3;

    // Caricamento PDF
    const coverPdf = await pdfjsLib.getDocument(COVER_URL).promise;
    const tesiPdf = await pdfjsLib.getDocument(TESI_URL).promise;
    let backPdf = null;
    try {
      backPdf = await pdfjsLib.getDocument(BACK_URL).promise;
    } catch(e) {}

    // 1. Cover
    bookContainer.appendChild(await renderPdfPageToDiv(coverPdf, 1, true));

    // 2-4. Pagine Bianche
    bookContainer.appendChild(createBlankPage(CANVAS_HD_WIDTH, CANVAS_HD_HEIGHT));
    bookContainer.appendChild(createBlankPage(CANVAS_HD_WIDTH, CANVAS_HD_HEIGHT));
    bookContainer.appendChild(createBlankPage(CANVAS_HD_WIDTH, CANVAS_HD_HEIGHT));

    // 5. Tesi (La pagina 1 della tesi finirà sulla pagina 5 del libro)
    for (let i = 1; i <= tesiPdf.numPages; i++) {
      bookContainer.appendChild(await renderPdfPageToDiv(tesiPdf, i, false));
    }

    // Bilanciamento pagine pari/dispari
    const currentCount = 4 + tesiPdf.numPages;
    if (currentCount % 2 !== 0) {
      bookContainer.appendChild(createBlankPage(CANVAS_HD_WIDTH, CANVAS_HD_HEIGHT));
    }

    // Pagina Bianca finale
    bookContainer.appendChild(createBlankPage(CANVAS_HD_WIDTH, CANVAS_HD_HEIGHT));

    // Back Cover
    if (backPdf) {
      bookContainer.appendChild(await renderPdfPageToDiv(backPdf, 1, true));
    } else {
      const blankBack = createBlankPage(CANVAS_HD_WIDTH, CANVAS_HD_HEIGHT);
      blankBack.setAttribute('data-density', 'hard');
      bookContainer.appendChild(blankBack);
    }

    totalBookPages = bookContainer.children.length;

    // Inizializzazione PageFlip
    pageFlip = new St.PageFlip(bookContainer, {
      width: DISPLAY_WIDTH,
      height: DISPLAY_HEIGHT,
      size: 'fixed',
      minWidth: 300,
      maxWidth: 1000,
      minHeight: 400,
      maxHeight: 1200,
      drawShadow: true,
      maxShadowOpacity: 0.5,
      showCover: true,
      mobileScrollSupport: false,
      cornerSize: 40,           // Limita l'area trascinabile solo all'angolino (40px)
      clickEventForward: true
    });

    pageFlip.loadFromHTML(document.querySelectorAll('.page'));

    // Eventi e controlli
    pageFlip.on('flip', (e) => {
      const pageNum = e.data + 1;
      updateUI(pageNum);
    });

    setupControls();
    await buildTOC(tesiPdf);
    updateUI(1);

  } catch (error) {
    console.error('Errore durante l\'inizializzazione:', error);
  }
}

// Costruzione dell'Indice (Nativo se presente, altrimenti genera le sezioni)
async function buildTOC(tesiPdf) {
  const tocList = document.getElementById('toc-list');
  tocList.innerHTML = '';

  try {
    const outline = await tesiPdf.getOutline();
    if (outline && outline.length > 0) {
      for (const item of outline) {
        const li = document.createElement('li');
        li.textContent = item.title;
        // La pagina 1 della tesi corrisponde alla pagina 5 del libro 3D
        if (item.dest) {
          li.addEventListener('click', () => {
            pageFlip.turnToPage(4); // Salta all'inizio della tesi
          });
        }
        tocList.appendChild(li);
      }
    } else {
      generateFallbackTOC(tocList, tesiPdf.numPages);
    }
  } catch(e) {
    generateFallbackTOC(tocList, tesiPdf.numPages);
  }
}

function generateFallbackTOC(container, totalTesiPages) {
  container.innerHTML = '';
  
  const coverLi = document.createElement('li');
  coverLi.textContent = 'Copertina';
  coverLi.addEventListener('click', () => pageFlip.turnToPage(0));
  container.appendChild(coverLi);

  const tesiLi = document.createElement('li');
  tesiLi.textContent = 'Inizio Tesi (Pagina 1)';
  tesiLi.addEventListener('click', () => pageFlip.turnToPage(4));
  container.appendChild(tesiLi);

  // Genera collegamenti a blocchi di 10 pagine
  for (let p = 10; p <= totalTesiPages; p += 10) {
    const li = document.createElement('li');
    li.textContent = `Tesi - Pagina ${p}`;
    const targetBookPage = 4 + p - 1;
    li.addEventListener('click', () => pageFlip.turnToPage(targetBookPage));
    container.appendChild(li);
  }
}

function updateUI(pageNum) {
  document.getElementById('page-counter').textContent = `Pagina ${pageNum} di ${totalBookPages}`;
  document.getElementById('page-input').value = pageNum;
}

function setupControls() {
  document.getElementById('btn-prev').addEventListener('click', () => pageFlip.flipPrev());
  document.getElementById('btn-next').addEventListener('click', () => pageFlip.flipNext());

  document.getElementById('btn-go').addEventListener('click', () => {
    const val = parseInt(document.getElementById('page-input').value);
    if (val >= 1 && val <= totalBookPages) {
      pageFlip.turnToPage(val - 1);
    }
  });

  document.getElementById('btn-toc').addEventListener('click', () => {
    document.getElementById('sidebar-toc').classList.toggle('hidden');
  });

  // Controlli Zoom
  const scaler = document.getElementById('book-scaler');
  document.getElementById('btn-zoom-in').addEventListener('click', () => {
    if (currentZoom < 1.8) {
      currentZoom += 0.2;
      scaler.style.transform = `scale(${currentZoom})`;
      document.getElementById('zoom-level').textContent = `${Math.round(currentZoom * 100)}%`;
    }
  });

  document.getElementById('btn-zoom-out').addEventListener('click', () => {
    if (currentZoom > 0.6) {
      currentZoom -= 0.2;
      scaler.style.transform = `scale(${currentZoom})`;
      document.getElementById('zoom-level').textContent = `${Math.round(currentZoom * 100)}%`;
    }
  });

  document.getElementById('btn-zoom-reset').addEventListener('click', () => {
    currentZoom = 1;
    scaler.style.transform = `scale(1)`;
    document.getElementById('zoom-level').textContent = `100%`;
  });
}

initBook();