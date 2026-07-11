/**
 * Image utilities and helpers
 */

export function getImageUrl(path: string): string {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `/images/${path}`;
}

export function getOptimizedImageUrl(path: string, width?: number, quality?: number): string {
  const baseUrl = getImageUrl(path);
  if (!width && !quality) return baseUrl;
  
  const params = new URLSearchParams();
  if (width) params.append('w', width.toString());
  if (quality) params.append('q', quality.toString());
  
  return `${baseUrl}?${params.toString()}`;
}

export function getAvatarUrl(name: string, size: number = 40): string {
  const encoded = encodeURIComponent(name);
  return `https://ui-avatars.com/api/?name=${encoded}&size=${size}&background=random`;
}
