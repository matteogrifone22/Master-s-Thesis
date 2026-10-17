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

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({ canvasContext: context, viewport: viewport }).promise;

      pageDiv.appendChild(canvas);
      bookContainer.appendChild(pageDiv);
    }

    const pageFlip = new St.PageFlip(bookContainer, {
      width: 550,
      height: 733,
      size: 'stretch',
      minWidth: 300,
      maxWidth: 1000,
      minHeight: 400,
      maxHeight: 1350,
      maxShadowOpacity: 0.5,
      showCover: true,
      mobileScrollSupport: true
    });

    pageFlip.loadFromHTML(document.querySelectorAll('.page'));

  } catch (error) {
    console.error('Errore nel caricamento del PDF:', error);
  }
}

loadBook();