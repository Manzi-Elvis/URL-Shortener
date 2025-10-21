# TinyLink — Local URL Shortener

A **static URL shortener** written with vanilla JavaScript, HTML, CSS and TailwindCSS. TinyLink stores all links in the browser's `localStorage` and optionally supports link expiry.

## Features

* Shorten any valid URL.
* Optional expiry in days.
* Local storage persistence — links survive page reload.
* Copy, open, and delete links easily.
* Responsive and modern UI with glass/gradient effects.
* Fully static — can be hosted on Netlify, Vercel, or GitHub Pages.

>  Note: Because this is local-storage based, shortened links **only work in the same browser and device**. For globally accessible links, a backend is required.
