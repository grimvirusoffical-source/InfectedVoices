/** Same Create | Studio chrome as Cap, mounted on the browser workstation. No store billing and no Stripe button. */
import {mountCreate} from './mobile-create.js';

document.documentElement.classList.add('iv-mobile');
await mountCreate({
  shell: {},
  config: {platform: 'web'}
});
