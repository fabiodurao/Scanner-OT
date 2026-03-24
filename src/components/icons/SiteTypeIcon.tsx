import React from 'react';

interface DuotoneIconProps {
  size?: number;
  primaryColor: string;
  secondaryColor: string;
  className?: string;
}

// Wind Turbine (fa-wind-turbine duotone)
export const WindTurbineIcon = ({ size = 16, primaryColor, secondaryColor, className = '' }: DuotoneIconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width={size} height={size} className={className} aria-hidden="true">
    <path fill={secondaryColor} fillOpacity="0.4" d="M240 320l0 144-32 0c-8.8 0-16 7.2-16 16s7.2 16 16 16l96 0c8.8 0 16-7.2 16-16s-7.2-16-16-16l-32 0 0-144c-5.2 .6-10.5 1-16 1s-10.8-.3-16-1z"/>
    <path fill={primaryColor} d="M256 32c-8.8 0-16 7.2-16 16l0 176.2-90.9-52.5c-7.6-4.4-17.4-1.8-21.8 5.9s-1.8 17.4 5.9 21.8L224 251.7l0 8.3c0 17.7 14.3 32 32 32s32-14.3 32-32l0-8.3 90.9-52.5c7.6-4.4 10.3-14.2 5.9-21.8s-14.2-10.3-21.8-5.9L272 224.2 272 48c0-8.8-7.2-16-16-16z"/>
  </svg>
);

// Wind Offshore (fa-wind duotone)
export const WindOffshoreIcon = ({ size = 16, primaryColor, secondaryColor, className = '' }: DuotoneIconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width={size} height={size} className={className} aria-hidden="true">
    <path fill={secondaryColor} fillOpacity="0.4" d="M0 64C0 46.3 14.3 32 32 32l320 0c35.3 0 64 28.7 64 64s-28.7 64-64 64L32 160c-17.7 0-32-14.3-32-32s14.3-32 32-32l320 0c0-17.7-14.3-32-32-32L32 96C14.3 96 0 81.7 0 64zM0 256c0-17.7 14.3-32 32-32l384 0c35.3 0 64 28.7 64 64s-28.7 64-64 64L32 352c-17.7 0-32-14.3-32-32s14.3-32 32-32l384 0c0-17.7-14.3-32-32-32L32 288c-17.7 0-32-14.3-32-32z"/>
    <path fill={primaryColor} d="M288 64c0-17.7 14.3-32 32-32s32 14.3 32 32s-14.3 32-32 32l-256 0c-17.7 0-32-14.3-32-32s14.3-32 32-32l256 0zM416 256c0-17.7 14.3-32 32-32s32 14.3 32 32s-14.3 32-32 32l-384 0c-17.7 0-32-14.3-32-32s14.3-32 32-32l384 0zM192 416c0-17.7 14.3-32 32-32s32 14.3 32 32s-14.3 32-32 32l-192 0c-17.7 0-32-14.3-32-32s14.3-32 32-32l192 0z"/>
  </svg>
);

// Solar Panel (fa-solar-panel duotone)
export const SolarPanelIcon = ({ size = 16, primaryColor, secondaryColor, className = '' }: DuotoneIconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512" width={size} height={size} className={className} aria-hidden="true">
    <path fill={secondaryColor} fillOpacity="0.4" d="M192 96H448V288H192V96zM64 96H128V160H64V96zM128 224v64H64V224h64zM512 96h64v64H512V96zm64 128v64H512V224h64z"/>
    <path fill={primaryColor} d="M32 0C14.3 0 0 14.3 0 32V352c0 17.7 14.3 32 32 32H244.4c-3.5 14.1-8.6 27.7-15.3 40.5c-5.8 11.1-4.1 24.6 4.3 33.9S254.3 472 266.7 472h106.7c12.3 0 23.9-5.4 31.6-14.8s10.1-22.8 4.3-33.9c-6.7-12.8-11.8-26.4-15.3-40.5H608c17.7 0 32-14.3 32-32V32c0-17.7-14.3-32-32-32H32z"/>
  </svg>
);

// BESS / Battery Bolt (fa-battery-bolt duotone)
export const BatteryBoltIcon = ({ size = 16, primaryColor, secondaryColor, className = '' }: DuotoneIconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" width={size} height={size} className={className} aria-hidden="true">
    <path fill={secondaryColor} fillOpacity="0.4" d="M464 160c8.8 0 16 7.2 16 16V336c0 8.8-7.2 16-16 16H80c-8.8 0-16-7.2-16-16V176c0-8.8 7.2-16 16-16H464zM80 96C35.8 96 0 131.8 0 176V336c0 44.2 35.8 80 80 80H464c44.2 0 80-35.8 80-80V320c17.7 0 32-14.3 32-32V224c0-17.7-14.3-32-32-32V176c0-44.2-35.8-80-80-80H80z"/>
    <path fill={primaryColor} d="M288 184c-4.9-7.4-13.2-11.8-22-11.8s-17.1 4.4-22 11.8l-64 96c-5.3 8-5.6 18.2-.8 26.5S193.2 320 202.7 320H240v48c0 9.6 5.5 18.3 14.2 22.5s19 3.1 26.5-2.9l96-80c7.1-5.9 10.5-15.1 8.9-24.1s-8.1-16.4-17.1-19.1L320 256.4V208c0-10.4-6.3-19.8-15.9-23.8z"/>
  </svg>
);

// Hydropower (fa-water duotone)
export const HydropowerIcon = ({ size = 16, primaryColor, secondaryColor, className = '' }: DuotoneIconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" width={size} height={size} className={className} aria-hidden="true">
    <path fill={secondaryColor} fillOpacity="0.4" d="M269.5 69.6C278 55.1 292.6 48 307.4 48s29.4 7.1 37.9 21.6l0 0 0 0C377.9 121.1 416 197.4 416 256c0 60.2-23.9 114.7-62.6 154.7C332.1 432.1 311.1 448 288 448s-44.1-16-65.4-37.3C183.9 370.7 160 316.2 160 256c0-58.6 38.1-134.9 70.2-186.4l39.3 0z"/>
    <path fill={primaryColor} d="M288 0c-13.3 0-24 10.7-24 24c0 45.4-53.5 137.4-84.4 186.4C160.3 246.1 160 251 160 256c0 70.7 57.3 128 128 128s128-57.3 128-128c0-5-.3-9.9-3.6-45.6C381.5 161.4 312 45.4 312 24c0-13.3-10.7-24-24-24zm0 368c-61.9 0-112-50.1-112-112c0-3.4 .2-6.8 .5-10.1C200.3 281.5 240 336 288 336s87.7-54.5 111.5-90.1c.3 3.3 .5 6.7 .5 10.1c0 61.9-50.1 112-112 112z"/>
  </svg>
);

// Biomass (fa-fire-flame-curved duotone)
export const BiomassIcon = ({ size = 16, primaryColor, secondaryColor, className = '' }: DuotoneIconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" width={size} height={size} className={className} aria-hidden="true">
    <path fill={secondaryColor} fillOpacity="0.4" d="M96 198.6V288c0 35.3 28.7 64 64 64s64-28.7 64-64v-3.9c0-18-7.2-35.3-19.9-48l-38.6-38.6c-24-24-37.5-56.7-37.5-90.7c0-27.7 9-54.8 25.6-76.9L153.6 29.9C145.1 44.4 96 134.1 96 198.6z"/>
    <path fill={primaryColor} d="M153.6 29.9l16-21.3C173.6 3.2 180 0 186.7 0C198.4 0 208 9.6 208 21.3V43.5c0 13.1 5.4 25.7 14.9 34.7L307.6 159C356.4 205.6 384 270.2 384 337.7C384 434 306 512 209.7 512H192C86 512 0 426 0 320v-3.8c0-48.8 19.4-95.6 53.9-130.1l3.5-3.5c4.2-4.2 10-6.6 16-6.6C85.9 176 96 186.1 96 198.6V288c0 35.3 28.7 64 64 64s64-28.7 64-64v-3.9c0-18-7.2-35.3-19.9-48l-38.6-38.6c-24-24-37.5-56.7-37.5-90.7c0-27.7 9-54.8 25.6-76.9z"/>
  </svg>
);

// Biofuels (fa-seedling duotone)
export const BiofuelsIcon = ({ size = 16, primaryColor, secondaryColor, className = '' }: DuotoneIconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width={size} height={size} className={className} aria-hidden="true">
    <path fill={secondaryColor} fillOpacity="0.4" d="M512 32c0 113.6-84.6 207.5-194.2 222c-7.1-53.4-30.6-101.6-65.3-139.3C290.8 46 364 0 448 0l32 0c17.7 0 32 14.3 32 32z"/>
    <path fill={primaryColor} d="M0 96C0 78.3 14.3 64 32 64l32 0c123.7 0 224 100.3 224 224l0 32 0 160c0 17.7-14.3 32-32 32s-32-14.3-32-32l0-160C100.3 320 0 219.7 0 96z"/>
  </svg>
);

// Hybrid (fa-bolt duotone)
export const HybridIcon = ({ size = 16, primaryColor, secondaryColor, className = '' }: DuotoneIconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" width={size} height={size} className={className} aria-hidden="true">
    <path fill={secondaryColor} fillOpacity="0.4" d="M349.4 44.6c5.9-13.7 1.5-29.7-10.6-38.5s-28.6-8-39.9 1.8l-256 224c-10 8.8-13.6 22.9-8.9 35.3S50.7 288 64 288H175.5L98.6 467.4c-5.9 13.7-1.5 29.7 10.6 38.5s28.6 8 39.9-1.8l256-224c10-8.8 13.6-22.9 8.9-35.3s-16.6-20.7-30-20.7H272.5L349.4 44.6z"/>
    <path fill={primaryColor} d="M272.5 224H383.9c13.4 0 24.3 9.3 30 20.7s1.1 26.5-8.9 35.3l-256 224c-11.3 9.8-27.7 11.6-39.9 1.8s-16.5-24.8-10.6-38.5L175.5 288H64c-13.3 0-24.3-8.3-28.9-20.7s.1-26.5 8.9-35.3l256-224c11.3-9.8 27.7-11.6 39.9-1.8s16.5 24.8 10.6 38.5L272.5 224z"/>
  </svg>
);

// Substation (fa-building duotone)
export const SubstationIcon = ({ size = 16, primaryColor, secondaryColor, className = '' }: DuotoneIconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" width={size} height={size} className={className} aria-hidden="true">
    <path fill={secondaryColor} fillOpacity="0.4" d="M48 0C21.5 0 0 21.5 0 48V464c0 26.5 21.5 48 48 48h96V432c0-26.5 21.5-48 48-48s48 21.5 48 48v80h96c26.5 0 48-21.5 48-48V48c0-26.5-21.5-48-48-48H48z"/>
    <path fill={primaryColor} d="M64 240c0-8.8 7.2-16 16-16h32c8.8 0 16 7.2 16 16v32c0 8.8-7.2 16-16 16H80c-8.8 0-16-7.2-16-16V240zm112-16h32c8.8 0 16 7.2 16 16v32c0 8.8-7.2 16-16 16H176c-8.8 0-16-7.2-16-16V240c0-8.8 7.2-16 16-16zm112 16c0-8.8 7.2-16 16-16h32c8.8 0 16 7.2 16 16v32c0 8.8-7.2 16-16 16H304c-8.8 0-16-7.2-16-16V240zM64 96c0-8.8 7.2-16 16-16h32c8.8 0 16 7.2 16 16v32c0 8.8-7.2 16-16 16H80c-8.8 0-16-7.2-16-16V96zm112-16h32c8.8 0 16 7.2 16 16v32c0 8.8-7.2 16-16 16H176c-8.8 0-16-7.2-16-16V96c0-8.8 7.2-16 16-16zm112 16c0-8.8 7.2-16 16-16h32c8.8 0 16 7.2 16 16v32c0 8.8-7.2 16-16 16H304c-8.8 0-16-7.2-16-16V96z"/>
  </svg>
);

export type SiteIconComponent = typeof WindTurbineIcon;

export const SITE_TYPE_ICONS: Record<string, SiteIconComponent> = {
  eolica: WindTurbineIcon,
  eolica_offshore: WindOffshoreIcon,
  fotovoltaica: SolarPanelIcon,
  bess: BatteryBoltIcon,
  hidreletrica: HydropowerIcon,
  biomassa: BiomassIcon,
  biocombustivel: BiofuelsIcon,
  hibrida: HybridIcon,
  subestacao: SubstationIcon,
};
