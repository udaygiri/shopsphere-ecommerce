/**
 * Indian Rupee (INR) currency formatting helper
 */
export const CURRENCY_SYMBOL = '₹';

export const formatPrice = (amount) => {
  const num = Number(amount) || 0;
  return `₹${num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export default formatPrice;
