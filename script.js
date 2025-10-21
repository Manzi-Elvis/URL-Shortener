    const urlInput = document.getElementById('urlInput');
    const expiryInput = document.getElementById('expiryInput');
    const shortenBtn = document.getElementById('shortenBtn');
    const shortUrl = document.getElementById('shortUrl');
    const output = document.getElementById('output');
    const linkList = document.getElementById('linkList');

    const STORAGE_KEY = 'tinyLinkData';

    function getStoredLinks() {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    }

    function saveLinks(data) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }

    function generateSlug() {
      return Math.random().toString(36).substring(2, 8);
    }

    function createShortUrl(slug) {
      return `${window.location.origin}/?slug=${slug}`;
    }

    function renderLinks() {
      const links = getStoredLinks();
      linkList.innerHTML = '';
      links.forEach(link => {
        const div = document.createElement('div');
        div.className = 'link-card';
        div.innerHTML = `
          <div class='flex justify-between items-center'>
            <div>
              <a href='${link.original}' target='_blank' class='text-cyan-400 hover:underline'>${link.short}</a>
              <p class='text-sm text-gray-300'>${link.original}</p>
            </div>
            <div class='flex gap-2'>
              <button class='copy-btn bg-cyan-600 px-2 py-1 rounded text-white text-sm'>Copy</button>
              <button class='delete-btn bg-red-600 px-2 py-1 rounded text-white text-sm'>Delete</button>
            </div>
          </div>
        `;
        div.querySelector('.copy-btn').onclick = () => copyToClipboard(link.short);
        div.querySelector('.delete-btn').onclick = () => deleteLink(link.slug);
        linkList.appendChild(div);
      });
    }

    function deleteLink(slug) {
      const links = getStoredLinks().filter(link => link.slug !== slug);
      saveLinks(links);
      renderLinks();
    }

    async function copyToClipboard(text) {
      try {
        await navigator.clipboard.writeText(text);
        alert('Copied!');
      } catch (err) {
        const temp = document.createElement('textarea');
        temp.value = text;
        document.body.appendChild(temp);
        temp.select();
        document.execCommand('copy');
        document.body.removeChild(temp);
        alert('Copied!');
      }
    }

    shortenBtn.addEventListener('click', () => {
      const url = urlInput.value.trim();
      const expiry = parseInt(expiryInput.value.trim()) || null;
      if (!url) return alert('Please enter a valid URL.');

      const slug = generateSlug();
      const short = createShortUrl(slug);

      const data = getStoredLinks();
      data.push({ slug, original: url, short, expiry, created: Date.now() });
      saveLinks(data);

      shortUrl.textContent = short;
      shortUrl.href = short;
      output.classList.remove('hidden');
      renderLinks();
    });

    function redirectIfSlugPresent() {
      const params = new URLSearchParams(window.location.search);
      const slug = params.get('slug');
      if (slug) {
        const links = getStoredLinks();
        const found = links.find(l => l.slug === slug);
        if (found) {
          window.location.href = found.original;
        }
      }
    }

    redirectIfSlugPresent();
    renderLinks(); 