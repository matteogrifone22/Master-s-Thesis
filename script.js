const pdfUrl = './tesi.pdf';

pdfjsLib.GlobalWorkerOptions.workerSrc = 
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

async function initBook() {
  try {
    const pdf = await pdfjsLib.getDocument(pdfUrl).promise;
    const bookContainer = document.getElementById('book');

    // Dimensioni di riferimento per la pagina
    const PAGE_WIDTH = 550;
    const PAGE_HEIGHT = 770;

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      
      const unscaledViewport = page.getViewport({ scale: 1 });
      const scale = PAGE_WIDTH / unscaledViewport.width;
      const viewport = page.getViewport({ scale: scale });

      const pageDiv = document.createElement('div');
      pageDiv.className = 'page';

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({ canvasContext: context, viewport: viewport }).promise;

      pageDiv.appendChild(canvas);
      bookContainer.appendChild(pageDiv);
    }

    // Inizializzazione PageFlip
    const pageFlip = new St.PageFlip(bookContainer, {
      width: PAGE_WIDTH,
      height: PAGE_HEIGHT,
      size: 'fixed',             // 'fixed' blocca i tremolii
      minWidth: 300,
      maxWidth: 1000,
      minHeight: 400,
      maxHeight: 1200,
      drawShadow: true,
      maxShadowOpacity: 0.5,
      showCover: false,          // Mantiene subito la vista a due pagine
      usePortrait: false,
      mobileScrollSupport: false
    });

    pageFlip.loadFromHTML(document.querySelectorAll('.page'));

  } catch (error) {
    console.error('Errore durante il caricamento della tesi:', error);
  }
}

initBook();