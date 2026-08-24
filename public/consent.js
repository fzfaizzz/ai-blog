// Google Consent Mode v2 & GDPR Cookie Banner for Prime Media
(function() {
  const CONSENT_KEY = 'pm_cookie_consent';

  function initConsentBanner() {
    // If already consented, don't show banner again
    if (localStorage.getItem(CONSENT_KEY)) return;

    const banner = document.createElement('div');
    banner.id = 'pmConsentBanner';
    banner.innerHTML = `
      <div style="position: fixed; bottom: 1.5rem; left: 50%; transform: translateX(-50%); width: 92%; max-width: 820px; background: rgba(15, 23, 42, 0.96); backdrop-filter: blur(12px); border: 1px solid #334155; box-shadow: 0 20px 40px rgba(0,0,0,0.5); border-radius: 12px; padding: 1.25rem 1.5rem; z-index: 999999; color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; flex-direction: column; gap: 1rem; animation: slideUp 0.3s ease-out;">
        <div style="display: flex; gap: 0.85rem; align-items: flex-start;">
          <span style="font-size: 1.6rem; line-height: 1;">🍪</span>
          <div style="flex: 1; font-size: 0.88rem; line-height: 1.5; color: #CBD5E1;">
            <strong style="color: #FFFFFF; font-size: 0.95rem;">Privacy &amp; Cookie Consent</strong> — Prime Media and our authorized advertising partners (including Google) use cookies and measurement signals to analyze audience traffic, maintain security, and deliver relevant news and personalized ads in compliance with Google Consent Mode v2. Read our <a href="/privacy.html" style="color: #60A5FA; text-decoration: underline;">Privacy Policy</a> and <a href="/terms.html" style="color: #60A5FA; text-decoration: underline;">Terms</a>.
          </div>
        </div>
        <div style="display: flex; gap: 0.75rem; justify-content: flex-end; flex-wrap: wrap;">
          <button id="pmRejectConsentBtn" style="padding: 0.55rem 1.25rem; background: #1E293B; color: #94A3B8; border: 1px solid #475569; border-radius: 6px; font-weight: 600; font-size: 0.85rem; cursor: pointer; transition: all 0.2s;">
            Essential Only
          </button>
          <button id="pmAcceptConsentBtn" style="padding: 0.55rem 1.5rem; background: #2563EB; color: #FFFFFF; border: none; border-radius: 6px; font-weight: 700; font-size: 0.85rem; cursor: pointer; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4); transition: all 0.2s;">
            ✓ Accept All &amp; Continue
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(banner);

    const acceptBtn = document.getElementById('pmAcceptConsentBtn');
    const rejectBtn = document.getElementById('pmRejectConsentBtn');

    if (acceptBtn) {
      acceptBtn.addEventListener('click', () => {
        localStorage.setItem(CONSENT_KEY, 'granted');
        if (typeof gtag === 'function') {
          gtag('consent', 'update', {
            'ad_storage': 'granted',
            'ad_user_data': 'granted',
            'ad_personalization': 'granted',
            'analytics_storage': 'granted',
            'functionality_storage': 'granted',
            'personalization_storage': 'granted',
            'security_storage': 'granted'
          });
        }
        banner.remove();
      });
    }

    if (rejectBtn) {
      rejectBtn.addEventListener('click', () => {
        localStorage.setItem(CONSENT_KEY, 'denied');
        if (typeof gtag === 'function') {
          gtag('consent', 'update', {
            'ad_storage': 'denied',
            'ad_user_data': 'denied',
            'ad_personalization': 'denied',
            'analytics_storage': 'granted'
          });
        }
        banner.remove();
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initConsentBanner);
  } else {
    initConsentBanner();
  }
})();
