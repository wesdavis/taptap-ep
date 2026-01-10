export function createPageUrl(pageName) {
  if (!pageName) return '/';
  
  const name = pageName.toLowerCase();

  // Explicit mappings to fix navigation errors
  if (name === 'home') return '/';
  if (name === 'landing') return '/landing';
  if (name === 'profile') return '/profile';
  if (name === 'devtools') return '/dev-tools';

  // Default fallback
  return `/${name}`;
}