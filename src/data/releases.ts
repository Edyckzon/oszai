export type Release = {
  id: string;
  name: string;
  description: string;
  packages: { label: string; url: string; version: string }[];
};

// Publicar únicamente enlaces HTTPS a instaladores reales verificados.
// El sitio no presupone arquitecturas ni versiones mínimas compatibles.
export const releases: Release[] = [
  { id: 'windows', name: 'Windows', description: 'Instalador para Windows en preparación.', packages: [] },
  { id: 'macos', name: 'macOS', description: 'Versión para macOS en preparación.', packages: [] },
  { id: 'linux', name: 'Linux', description: 'Paquetes para Linux en preparación.', packages: [] },
];

export function validDownload(url: string) {
  try { return new URL(url).protocol === 'https:'; } catch { return false; }
}
