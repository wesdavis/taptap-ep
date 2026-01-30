export function createPageUrl(pageName) {
  if (!pageName) return '/';
  
  const name = pageName.toLowerCase();

  // Explicit mappings
  if (name === 'home') return '/';
  
  // Landing should go to root because Home.tsx renders it now
  if (name === 'landing') return '/';
  
  if (name === 'profile') return '/profile';
  if (name === 'devtools' || name === 'dev-tools') return '/dev-tools';

  return `/${name}`;
}
