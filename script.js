const pdfUrl = './tesi.pdf';

pdfjsLib.GlobalWorkerOptions.workerSrc = 
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

let pageFlip = null;
let currentZoom = 1;
let pdfDoc = null;
let tocItems = [];

async function loadBook() {
  try {
    pdfDoc = await pdfjsLib.getDocument(pdfUrl).promise;
    const bookContainer = document.getElementById('book');
    const totalPages = pdfDoc.numPages;

    // Configura lo slider di navigazione
    const slider = document.getElementById('page-slider');
    slider.max = totalPages;

    // Renderizza ogni pagina in un Canvas
    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.5 });

      const pageDiv = document.createElement('div');
      pageDiv.className = 'page';
      
      if (pageNum === 1 || pageNum === totalPages) {
        pageDiv.setAttribute('data-density', 'hard');
      } else {
        pageDiv.setAttribute('data-density', 'soft');
      }

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({ canvasContext: context, viewport: viewport }).promise;

      pageDiv.appendChild(canvas);
      bookContainer.appendChild(pageDiv);
    }

    // Inizializza PageFlip (Vista fronte-retro a 2 pagine attiva)
    pageFlip = new St.PageFlip(bookContainer, {
      width: 550,
      height: 733,
      size: 'stretch',
      minWidth: 300,
      maxWidth: 1000,
      minHeight: 400,
      maxHeight: 1350,
      drawShadow: true,
      maxShadowOpacity: 0.6,
      showCover: true, // Mostra la copertina singola all'inizio, poi si apre a 2 pagine
      mobileScrollSupport: true
    });

    pageFlip.loadFromHTML(document.querySelectorAll('.page'));

    // Aggiorna interfaccia al cambio pagina
    pageFlip.on('flip', (e) => {
      const pageNum = e.data + 1;
      updatePageUI(pageNum, totalPages);
    });

    // Inizializza controlli e indice
    setupControls(totalPages);
    await loadTableOfContents();

    updatePageUI(1, totalPages);

  } catch (error) {
    console.error('Errore durante il caricamento della tesi:', error);
  }
}

// Estrae l'indice originale dal PDF
async function loadTableOfContents() {
  const tocList = document.getElementById('toc-list');
  tocList.innerHTML = '';

  try {
    const outline = await pdfDoc.getOutline();

    if (!outline || outline.length === 0) {
      tocList.innerHTML = '<li>Nessun indice rilevato nel PDF.</li>';
      return;
    }

    for (const item of outline) {
      const li = document.createElement('li');
      li.textContent = item.title;

      // Trova il numero di pagina corrispondente al link del sommario
      if (item.dest) {
        const pageIndex = await getPageIndexFromDest(item.dest);
        if (pageIndex !== null) {
          const pageNum = pageIndex + 1;
          li.dataset.page = pageNum;
          li.addEventListener('click', () => {
            pageFlip.turnToPage(pageIndex);
          });
          tocItems.push({ page: pageNum, element: li });
        }
      }
      tocList.appendChild(li);
    }
  } catch (err) {
    console.error('Errore nel caricamento del sommario:', err);
    tocList.innerHTML = '<li>Impossibile caricare l\'indice.</li>';
  }
}

async function getPageIndexFromDest(dest) {
  try {
    let explicitDest = dest;
    if (typeof dest === 'string') {
      explicitDest = await pdfDoc.getDestination(dest);
    }
    if (Array.isArray(explicitDest)) {
      const ref = explicitDest[0];
      return await pdfDoc.getPageIndex(ref);
    }
  } catch (e) {
    return null;
  }
  return null;
}

// Aggiorna contatore, slider ed evidenziazione voce dell'indice attiva
function updatePageUI(pageNum, totalPages) {
  document.getElementById('page-info').textContent = `Pagina ${pageNum} di ${totalPages}`;
  document.getElementById('page-slider').value = pageNum;

  // Evidenzia il capitolo corrente nell'indice
  tocItems.forEach(item => {
    if (item.page <= pageNum) {
      tocItems.forEach(i => i.element.classList.remove('active'));
      item.element.classList.add('active');
    }
  });
}

// Configurazione controlli (Pulsanti e Zoom)
function setupControls(totalPages) {
  const slider = document.getElementById('page-slider');
  slider.addEventListener('input', (e) => {
    const pageIndex = parseInt(e.target.value) - 1;
    pageFlip.turnToPage(pageIndex);
  });

  document.getElementById('btn-prev').addEventListener('click', () => pageFlip.flipPrev());
  document.getElementById('btn-next').addEventListener('click', () => pageFlip.flipNext());

  // Toggle Sidebar Indice
  document.getElementById('btn-toc-toggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('hidden');
  });

  // Gestione Zoom
  const wrapper = document.getElementById('book-wrapper');
  
  document.getElementById('btn-zoom-in').addEventListener('click', () => {
    if (currentZoom < 2.0) {
      currentZoom += 0.25;
      wrapper.style.transform = `scale(${currentZoom})`;
    }
  });

  document.getElementById('btn-zoom-out').addEventListener('click', () => {
    if (currentZoom > 0.6) {
      currentZoom -= 0.25;
      wrapper.style.transform = `scale(${currentZoom})`;
    }
  });

  document.getElementById('btn-zoom-reset').addEventListener('click', () => {
    currentZoom = 1;
    wrapper.style.transform = `scale(1)`;
  });
}

loadBook();