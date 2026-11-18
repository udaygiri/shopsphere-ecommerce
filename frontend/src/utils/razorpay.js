/**
 * Razorpay Checkout SDK Loader & Utilities
 * Dynamically injects https://checkout.razorpay.com/v1/checkout.js into document body.
 */

export const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    // 1. If SDK already initialized on window
    if (typeof window !== 'undefined' && window.Razorpay) {
      resolve(true);
      return;
    }

    // 2. Check if script tag is already injected in DOM
    const existingScript = document.getElementById('razorpay-checkout-script');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(true));
      existingScript.addEventListener('error', () => resolve(false));
      return;
    }

    // 3. Dynamically create script tag
    const script = document.createElement('script');
    script.id = 'razorpay-checkout-script';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;

    script.onload = () => {
      resolve(true);
    };

    script.onerror = () => {
      console.warn('Unable to load external Razorpay script (offline or blocked). Mock mode will be used.');
      resolve(false);
    };

    document.body.appendChild(script);
  });
};
