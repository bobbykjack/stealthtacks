# Stealthtacks

## About

Stealthtacks is a minimalist Pinboard client. It’s an alternative to using [pinboard.in](https://pinboard.in) or a browser-extension. You can use the [public instance directly](https://bobbyjack.me/stealthtacks) or [download the code](https://github.com/bobbykjack/stealthtacks) and host it yourself.

## Principles

Stealthtacks arose to combat a straightforward problem: I regularly found myself using pinboard.in to bookmark interesting urls, but the process was laborious. I wanted something that would fetch the URL’s metadata and autofill title and description to save me the work of doing that manually.

I also wanted a largely self-contained application, somewhere to both add new bookmarks, and recall them later. Although I wasn’t aiming to replace pinboard.in, I *did* want something that would handle 99% of what I did there.

## Local storage

When you first connect to Pinboard, Stealthtacks will download your bookmarks and store them locally (using localStorage). This caching speeds up future operations and minimises the traffic required to go via the API.

## CORS Anywhere

To fetch metadata about new URLs, Stealthtacks uses the [cors-anywhere](https://github.com/Rob--W/cors-anywhere) service, which acts as a proxy. This enables Stealthtacks itself to be pure JavaScript, runnable without a server.

## Future development

Stealthtacks is very much ‘alpha’ software at this point. It’s mainly for my personal use and experimentation, but if there is interest from others, I will continue to maintain it and develop it further, as appropriate. Some of the following would probably be included:

- Nicer / proper progress dialog
- Special consideration for larger numbers of bookmarks
- Nicer date-handling
- Open bookmarks in new tab?
- Add auto-suggest for tags in bookmark form
- Browse bookmarks by multiple tags
- Possibly prefill certain data based on domain — e.g. “youtube.com” automatically gains a “video” tag. This would have to be user-configurable.
