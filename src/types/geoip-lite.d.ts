declare module 'geoip-lite' {
  interface GeoInfo {
    range: [number, number];
    country: string;
    region: string;
    city: string;
    ll: [number, number];
    metro: number;
    area: number;
  }

  function lookup(ip: string): GeoInfo | null;

  export { lookup };
}
