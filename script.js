const COVER_URL = './copertina.pdf';
const TESI_URL = './tesi.pdf';
const BACK_URL = './back.pdf';

pdfjsLib.GlobalWorkerOptions.workerSrc = 
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

let pageFlip = null;
let currentZoom = 1;
let totalPages = 0;
const MIN_ZOOM = 0.6;
const MAX_ZOOM = 1.8;
const ZOOM_STEP = 0.2;
const RENDER_SCALE = 4.0;
const FLIP_EDGE_ZONE = 14;

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
  const viewport = page.getViewport({ scale: RENDER_SCALE });

  const pageDiv = document.createElement('div');
  pageDiv.className = 'page';
  if (isHard) {
    pageDiv.setAttribute('data-density', 'hard');
  }

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { alpha: false });
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';

  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await page.render({ canvasContext: context, viewport: viewport }).promise;

  pageDiv.appendChild(canvas);
  return pageDiv;
}

async function initBook() {
  try {
    const bookContainer = document.getElementById('book');

    const DISPLAY_WIDTH = 500;
    const DISPLAY_HEIGHT = 700;
    const CANVAS_HD_WIDTH = DISPLAY_WIDTH * RENDER_SCALE;
    const CANVAS_HD_HEIGHT = DISPLAY_HEIGHT * RENDER_SCALE;

    // Caricamento file PDF
    const coverPdf = await pdfjsLib.getDocument(COVER_URL).promise;
    const tesiPdf = await pdfjsLib.getDocument(TESI_URL).promise;
    let backPdf = null;
    try {
      backPdf = await pdfjsLib.getDocument(BACK_URL).promise;
    } catch(e) {}

    // 1. Cover Blu (Pagina 1)
    bookContainer.appendChild(await renderPdfPageToDiv(coverPdf, 1, true));

    // 2-4. Pagine Bianche
    bookContainer.appendChild(createBlankPage(CANVAS_HD_WIDTH, CANVAS_HD_HEIGHT));
    bookContainer.appendChild(createBlankPage(CANVAS_HD_WIDTH, CANVAS_HD_HEIGHT));
    bookContainer.appendChild(createBlankPage(CANVAS_HD_WIDTH, CANVAS_HD_HEIGHT));

    // 5. Tesi
    for (let i = 1; i <= tesiPdf.numPages; i++) {
      bookContainer.appendChild(await renderPdfPageToDiv(tesiPdf, i, false));
    }

    // Pareggio pagine
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

    totalPages = bookContainer.children.length;

    // Configurazione PageFlip con dimensioni fisse per eliminare ogni tremolio
    pageFlip = new St.PageFlip(bookContainer, {
      width: DISPLAY_WIDTH,
      height: DISPLAY_HEIGHT,
      size: 'fixed',
      minWidth: DISPLAY_WIDTH,
      maxWidth: DISPLAY_WIDTH,
      minHeight: DISPLAY_HEIGHT,
      maxHeight: DISPLAY_HEIGHT,
      drawShadow: true,
      maxShadowOpacity: 0.4,
      showCover: true,
      usePortrait: false,
      mobileScrollSupport: false,
      cornerSize: FLIP_EDGE_ZONE,
      flippingTime: 600
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
  const btnPrev = document.getElementById('btn-prev');
  const btnNext = document.getElementById('btn-next');
  const btnGo = document.getElementById('btn-go');
  const btnZoomIn = document.getElementById('btn-zoom-in');
  const btnZoomOut = document.getElementById('btn-zoom-out');
  const btnZoomReset = document.getElementById('btn-zoom-reset');
  const scaler = document.getElementById('book-scaler');
  const zoomLevel = document.getElementById('zoom-level');
  const bookContainer = document.getElementById('book');
  const viewport = document.querySelector('.viewport');
  let panX = 0;
  let panY = 0;
  let panStartX = 0;
  let panStartY = 0;
  let panOriginX = 0;
  let panOriginY = 0;
  let isPanning = false;

  function getPanLimits() {
    const viewportRect = viewport.getBoundingClientRect();
    const bookWidth = scaler.offsetWidth * currentZoom;
    const bookHeight = scaler.offsetHeight * currentZoom;

    return {
      x: Math.max(0, (bookWidth - viewportRect.width) / 2),
      y: Math.max(0, (bookHeight - viewportRect.height) / 2)
    };
  }

  function applyTransform() {
    const limits = getPanLimits();
    panX = Math.min(limits.x, Math.max(-limits.x, panX));
    panY = Math.min(limits.y, Math.max(-limits.y, panY));
    scaler.style.transform = `translate(${panX}px, ${panY}px) scale(${currentZoom})`;
  }

  function canPanFrom(event) {
    if (currentZoom <= 1) return false;

    const bookRect = scaler.getBoundingClientRect();
    const viewportRect = viewport.getBoundingClientRect();
    const bookOverflows = bookRect.width > viewportRect.width || bookRect.height > viewportRect.height;
    if (!bookOverflows) return false;

    const page = event.target.closest('.page');
    if (!page) return false;

    const pageRect = page.getBoundingClientRect();
    const distanceFromEdge = Math.min(
      event.clientX - pageRect.left,
      pageRect.right - event.clientX,
      event.clientY - pageRect.top,
      pageRect.bottom - event.clientY
    );

    return distanceFromEdge > FLIP_EDGE_ZONE;
  }

  function stopPanning(event) {
    if (!isPanning) return;
    isPanning = false;
    scaler.classList.remove('is-panning');
    if (event && bookContainer.hasPointerCapture(event.pointerId)) {
      bookContainer.releasePointerCapture(event.pointerId);
    }
  }

  bookContainer.addEventListener('pointerdown', (event) => {
    if (!canPanFrom(event)) return;

    event.preventDefault();
    event.stopPropagation();
    isPanning = true;
    panStartX = event.clientX;
    panStartY = event.clientY;
    panOriginX = panX;
    panOriginY = panY;
    scaler.classList.add('is-panning');
    bookContainer.setPointerCapture(event.pointerId);
  }, true);

  bookContainer.addEventListener('pointermove', (event) => {
    if (!isPanning) return;

    event.preventDefault();
    panX = panOriginX + event.clientX - panStartX;
    panY = panOriginY + event.clientY - panStartY;
    applyTransform();
  });

  bookContainer.addEventListener('pointerup', stopPanning);
  bookContainer.addEventListener('pointercancel', stopPanning);

  function setZoom(value) {
    currentZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(value * 10) / 10));
    applyTransform();
    zoomLevel.textContent = `${Math.round(currentZoom * 100)}%`;
  }

  if (btnPrev) btnPrev.addEventListener('click', () => pageFlip && pageFlip.flipPrev());
  if (btnNext) btnNext.addEventListener('click', () => pageFlip && pageFlip.flipNext());

  if (btnGo) {
    btnGo.addEventListener('click', () => {
      const val = parseInt(document.getElementById('page-input').value);
      if (val >= 1 && val <= totalPages && pageFlip) {
        pageFlip.turnToPage(val - 1);
      }
    });
  }

  if (btnZoomIn) {
    btnZoomIn.addEventListener('click', () => setZoom(currentZoom + ZOOM_STEP));
  }

  if (btnZoomOut) {
    btnZoomOut.addEventListener('click', () => setZoom(currentZoom - ZOOM_STEP));
  }

  if (btnZoomReset) {
    btnZoomReset.addEventListener('click', () => setZoom(1));
  }
}

initBook();