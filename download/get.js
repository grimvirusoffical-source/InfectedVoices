const body = document.body;
const urls = {
  windows: body.dataset.windows || '/get/windows',
  mac: body.dataset.mac || '/voices/',
  ios: body.dataset.ios || '/get/ios',
  android: body.dataset.android || '/get/android',
  web: body.dataset.web || '/voices/'
};
const labels = {
  windows: 'Download for Windows',
  mac: 'Launch studio',
  ios: 'View on the App Store',
  android: 'Get on Google Play',
  web: 'Launch studio'
};
const ua = navigator.userAgent || '';
const id = /Android/i.test(ua) ? 'android' : /iPhone|iPad|iPod/i.test(ua) ? 'ios' : /Windows/i.test(ua) ? 'windows' : /Macintosh|Mac OS X/i.test(ua) ? 'mac' : 'web';
document.querySelector('[data-platform="' + id + '"]')?.setAttribute('data-recommended', 'true');
const sticky = document.getElementById('stickyGo');
if (sticky) {
  sticky.href = urls[id];
  sticky.textContent = labels[id];
}
const launch = document.getElementById('launchStatus');
if (launch) {
  fetch('/voices/', {method: 'GET'}).then(response => {
    if (!response.ok) launch.hidden = false;
  }).catch(() => { launch.hidden = false; });
}
