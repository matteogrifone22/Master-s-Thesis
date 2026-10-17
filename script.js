const COVER_URL = './copertina.pdf';
const TESI_URL = './tesi.pdf';
const BACK_URL = './back.pdf';

pdfjsLib.GlobalWorkerOptions.workerSrc = 
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

let pageFlip = null;
let currentZoom = 1;
let totalPages = 0;

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
  const HIGH_RES_SCALE = 2.5; 
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

    const DISPLAY_WIDTH = 480;  // Ridotto leggermente per garantire che due pagine stiano affiancate a schermo
    const DISPLAY_HEIGHT = 680;
    const CANVAS_HD_WIDTH = DISPLAY_WIDTH * 2.5;
    const CANVAS_HD_HEIGHT = DISPLAY_HEIGHT * 2.5;

    // Caricamento PDF
    const coverPdf = await pdfjsLib.getDocument(COVER_URL).promise;
    const tesiPdf = await pdfjsLib.getDocument(TESI_URL).promise;
    let backPdf = null;
    try {
      backPdf = await pdfjsLib.getDocument(BACK_URL).promise;
    } catch(e) {}

    // 1. Copertina Blu (Pagina 1)
    bookContainer.appendChild(await renderPdfPageToDiv(coverPdf, 1, true));

    // 2-4. Pagine Bianche interne
    bookContainer.appendChild(createBlankPage(CANVAS_HD_WIDTH, CANVAS_HD_HEIGHT));
    bookContainer.appendChild(createBlankPage(CANVAS_HD_WIDTH, CANVAS_HD_HEIGHT));
    bookContainer.appendChild(createBlankPage(CANVAS_HD_WIDTH, CANVAS_HD_HEIGHT));

    // 5. Tesi (Pagina 1 della tesi, ovvero il Frontespizio)
    for (let i = 1; i <= tesiPdf.numPages; i++) {
      bookContainer.appendChild(await renderPdfPageToDiv(tesiPdf, i, false));
    }

    // Pareggio pagine per quartini
    const currentCount = 4 + tesiPdf.numPages;
    if (currentCount % 2 !== 0) {
      bookContainer.appendChild(createBlankPage(CANVAS_HD_WIDTH, CANVAS_HD_HEIGHT));
    }

    // Pagina Bianca finale
    bookContainer.appendChild(createBlankPage(CANVAS_HD_WIDTH, CANVAS_HD_HEIGHT));

    // 4ª di Copertina (Retro Blu)
    if (backPdf) {
      bookContainer.appendChild(await renderPdfPageToDiv(backPdf, 1, true));
    } else {
      const blankBack = createBlankPage(CANVAS_HD_WIDTH, CANVAS_HD_HEIGHT);
      blankBack.setAttribute('data-density', 'hard');
      bookContainer.appendChild(blankBack);
    }

    totalPages = bookContainer.children.length;

    // Configurazione PageFlip che FORZA le due pagine affiancate
    pageFlip = new St.PageFlip(bookContainer, {
      width: DISPLAY_WIDTH,
      height: DISPLAY_HEIGHT,
      size: 'fixed',
      minWidth: 200,
      maxWidth: 800,
      minHeight: 300,
      maxHeight: 1000,
      drawShadow: true,
      maxShadowOpacity: 0.5,
      showCover: true,
      usePortrait: false,        // FORZA la vista a 2 pagine aperte
      autoSize: false,
      mobileScrollSupport: false,
      cornerSize: 30
    });

    pageFlip.loadFromHTML(document.querySelectorAll('.page'));

    pageFlip.on('flip', (e) => {
      updateUI(e.data + 1);
    });

    setupControls();
    updateUI(1);

  } catch (error) {
    console.error('Errore durante l\'inizializzazione del libro:', error);
  }
}

function updateUI(pageNum) {
  document.getElementById('page-counter').textContent = `Pagina ${pageNum} di ${totalPages}`;
  document.getElementById('page-input').value = pageNum;
}

function setupControls() {
  document.getElementById('btn-prev').addEventListener('click', () => pageFlip.flipPrev());
  document.getElementById('btn-next').addEventListener('click', () => pageFlip.flipNext());

  document.getElementById('btn-go').addEventListener('click', () => {
    const val = parseInt(document.getElementById('page-input').value);
    if (val >= 1 && val <= totalPages) {
      pageFlip.turnToPage(val - 1);
    }
  });

  document.getElementById('btn-toc').addEventListener('click', () => {
    document.getElementById('sidebar-toc').classList.toggle('hidden');
  });

  const tocItems = document.querySelectorAll('#toc-list li');
  tocItems.forEach(item => {
    item.addEventListener('click', () => {
      const targetPage = parseInt(item.getAttribute('data-page'));
      if (targetPage && pageFlip) {
        pageFlip.turnToPage(targetPage - 1);
      }
    });
  });

  const wrapper = document.getElementById('book-wrapper');
  document.getElementById('btn-zoom-in').addEventListener('click', () => {
    if (currentZoom < 1.8) {
      currentZoom += 0.2;
      wrapper.style.transform = `scale(${currentZoom})`;
      document.getElementById('zoom-level').textContent = `${Math.round(currentZoom * 100)}%`;
    }
  });

  document.getElementById('btn-zoom-out').addEventListener('click', () => {
    if (currentZoom > 0.6) {
      currentZoom -= 0.2;
      wrapper.style.transform = `scale(${currentZoom})`;
      document.getElementById('zoom-level').textContent = `${Math.round(currentZoom * 100)}%`;
    }
  });

  document.getElementById('btn-zoom-reset').addEventListener('click', () => {
    currentZoom = 1;
    wrapper.style.transform = `scale(1)`;
    document.getElementById('zoom-level').textContent = `100%`;
  });
}

initBook();