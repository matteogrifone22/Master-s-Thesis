const pdfUrl = './tesi.pdf';

pdfjsLib.GlobalWorkerOptions.workerSrc = 
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

async function loadBook() {
  try {
    const pdf = await pdfjsLib.getDocument(pdfUrl).promise;
    const bookContainer = document.getElementById('book');

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.5 });

      const pageDiv = document.createElement('div');
      pageDiv.className = 'page';
      
      // Imposta la densità per trattare la prima/ultima pagina come copertina rigida e le altre come carta
      if (pageNum === 1 || pageNum === pdf.numPages) {
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

    // Configurazione avanzata 3D per StPageFlip
    const pageFlip = new St.PageFlip(bookContainer, {
      width: 550,
      height: 733,
      size: 'stretch',
      minWidth: 300,
      maxWidth: 1000,
      minHeight: 400,
      maxHeight: 1350,
      drawShadow: true,          // Attiva l'ombra 3D della piega
      maxShadowOpacity: 0.8,     // Rende l'ombra della piega più marcata e visibile
      showCover: true,           // Tratta la prima pagina come copertina chiusa
      flippingTime: 1000,        // Durata dell'animazione di sfoglio in millisecondi
      usePortrait: true,         // Adatta la visualizzazione su schermi stretti
      startZIndex: 0,
      autoSize: true
    });

    pageFlip.loadFromHTML(document.querySelectorAll('.page'));

  } catch (error) {
    console.error('Errore nel caricamento del PDF:', error);
  }
}

loadBook();