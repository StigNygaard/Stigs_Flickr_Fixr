function isFirefox() {
  return !!((typeof browser !== 'undefined') && browser.runtime && browser.runtime.getURL("./").startsWith("moz-extension://"));
}
function init() {
  if (document.getElementById('verstr')) document.getElementById('verstr').textContent = browser.runtime.getManifest().version;
  if (document.getElementById('settings')) document.getElementById('settings').addEventListener('click', () => browser.runtime.openOptionsPage());
  if (document.getElementById('ffo') && isFirefox()) document.getElementById('ffo').style.display = 'block';
}
window.addEventListener('DOMContentLoaded', init);
