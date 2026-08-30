const LOGO_FILE = 'sign-weblaba.svg';

/** `[ sign ] WEBLABA` mark shared by header and mobile overlay. */
export function createSiteLogoMark(assetBaseURL = '/'): HTMLElement {
  const root = document.createElement('span');
  root.className = 'site-logo-mark';

  const glyph = document.createElement('span');
  glyph.className = 'site-logo-mark__glyph';

  const bracketOpen = document.createElement('span');
  bracketOpen.className = 'site-logo-mark__bracket';
  bracketOpen.setAttribute('aria-hidden', 'true');
  bracketOpen.textContent = '[';

  const logoImg = document.createElement('img');
  logoImg.className = 'site-logo-mark__img';
  logoImg.src = `${assetBaseURL}${LOGO_FILE}`;
  logoImg.alt = '';
  logoImg.width = 158;
  logoImg.height = 97;
  logoImg.decoding = 'async';

  const bracketClose = document.createElement('span');
  bracketClose.className = 'site-logo-mark__bracket';
  bracketClose.setAttribute('aria-hidden', 'true');
  bracketClose.textContent = ']';

  const logoWord = document.createElement('span');
  logoWord.className = 'site-logo-mark__word';
  logoWord.textContent = 'WEBLABA';

  glyph.append(bracketOpen, logoImg, bracketClose);
  root.append(glyph, logoWord);
  return root;
}
