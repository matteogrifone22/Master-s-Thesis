const pdfUrl = './tesi.pdf';

pdfjsLib.GlobalWorkerOptions.workerSrc = 
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

async function initBook() {
  try {
    const pdf = await pdfjsLib.getDocument(pdfUrl).promise;
    const bookContainer = document.getElementById('book');

    // Misure ottimali per pagina singola A4
    const PAGE_WIDTH = 550;
    const PAGE_HEIGHT = 770;

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      
      // Calcola lo scale corretto per adattarsi esattamente alle misure PAGE_WIDTH x PAGE_HEIGHT
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

    // Inizializzazione PageFlip fluida e senza tremolii
    const pageFlip = new St.PageFlip(bookContainer, {
      width: PAGE_WIDTH,
      height: PAGE_HEIGHT,
      size: 'fixed',             // 'fixed' elimina qualsiasi tremolio o ridimensionamento brusco
      minWidth: 300,
      maxWidth: 1000,
      minHeight: 400,
      maxHeight: 1200,
      drawShadow: true,          // Ombra 3D
      maxShadowOpacity: 0.5,
      showCover: false,          // Mantiene sempre la vista aperta a 2 pagine (fronte-retro)
      usePortrait: false,        // Forza la vista affiancata doppia
      mobileScrollSupport: false
    });

    pageFlip.loadFromHTML(document.querySelectorAll('.page'));

  } catch (error) {
    console.error('Errore nel caricamento del libro:', error);
  }
}

initBook();