import React from 'react';

interface DuotoneIconProps {
  size?: number;
  primaryColor: string;
  secondaryColor: string;
  className?: string;
}

// fa-duotone fa-wind-turbine
export const WindTurbineIcon = ({ size = 16, primaryColor, secondaryColor, className = '' }: DuotoneIconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width={size} height={size} className={className} aria-hidden="true">
    <path fill={secondaryColor} fillOpacity="0.4" d="M240 320l0 144-32 0c-8.8 0-16 7.2-16 16s7.2 16 16 16l96 0c8.8 0 16-7.2 16-16s-7.2-16-16-16l-32 0 0-144c-5.2 .6-10.5 1-16 1s-10.8-.3-16-1z"/>
    <path fill={primaryColor} d="M256 32c-8.8 0-16 7.2-16 16l0 176.2-90.9-52.5c-7.6-4.4-17.4-1.8-21.8 5.9s-1.8 17.4 5.9 21.8L224 251.7l0 8.3c0 17.7 14.3 32 32 32s32-14.3 32-32l0-8.3 90.9-52.5c7.6-4.4 10.3-14.2 5.9-21.8s-14.2-10.3-21.8-5.9L272 224.2 272 48c0-8.8-7.2-16-16-16z"/>
  </svg>
);

// fa-duotone fa-seedling
export const BiofuelsIcon = ({ size = 16, primaryColor, secondaryColor, className = '' }: DuotoneIconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width={size} height={size} className={className} aria-hidden="true">
    <path fill={secondaryColor} fillOpacity="0.4" d="M512 32c0 113.6-84.6 207.5-194.2 222c-7.1-53.4-30.6-101.6-65.3-139.3C290.8 46 364 0 448 0l32 0c17.7 0 32 14.3 32 32z"/>
    <path fill={primaryColor} d="M0 96C0 78.3 14.3 64 32 64l32 0c123.7 0 224 100.3 224 224l0 32 0 160c0 17.7-14.3 32-32 32s-32-14.3-32-32l0-160C100.3 320 0 219.7 0 96z"/>
  </svg>
);

// fa-duotone fa-solar-panel
export const SolarPanelIcon = ({ size = 16, primaryColor, secondaryColor, className = '' }: DuotoneIconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512" width={size} height={size} className={className} aria-hidden="true">
    <path fill={secondaryColor} fillOpacity="0.4" d="M192 96H448V288H192V96zM64 96H128V160H64V96zM128 224v64H64V224h64zM512 96h64v64H512V96zm64 128v64H512V224h64z"/>
    <path fill={primaryColor} d="M32 0C14.3 0 0 14.3 0 32V352c0 17.7 14.3 32 32 32H244.4c-3.5 14.1-8.6 27.7-15.3 40.5c-5.8 11.1-4.1 24.6 4.3 33.9S254.3 472 266.7 472h106.7c12.3 0 23.9-5.4 31.6-14.8s10.1-22.8 4.3-33.9c-6.7-12.8-11.8-26.4-15.3-40.5H608c17.7 0 32-14.3 32-32V32c0-17.7-14.3-32-32-32H32z"/>
  </svg>
);

// fa-duotone fa-battery-bolt
export const BatteryBoltIcon = ({ size = 16, primaryColor, secondaryColor, className = '' }: DuotoneIconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" width={size} height={size} className={className} aria-hidden="true">
    <path fill={secondaryColor} fillOpacity="0.4" d="M464 160c8.8 0 16 7.2 16 16V336c0 8.8-7.2 16-16 16H80c-8.8 0-16-7.2-16-16V176c0-8.8 7.2-16 16-16H464zM80 96C35.8 96 0 131.8 0 176V336c0 44.2 35.8 80 80 80H464c44.2 0 80-35.8 80-80V320c17.7 0 32-14.3 32-32V224c0-17.7-14.3-32-32-32V176c0-44.2-35.8-80-80-80H80z"/>
    <path fill={primaryColor} d="M288 184c-4.9-7.4-13.2-11.8-22-11.8s-17.1 4.4-22 11.8l-64 96c-5.3 8-5.6 18.2-.8 26.5S193.2 320 202.7 320H240v48c0 9.6 5.5 18.3 14.2 22.5s19 3.1 26.5-2.9l96-80c7.1-5.9 10.5-15.1 8.9-24.1s-8.1-16.4-17.1-19.1L320 256.4V208c0-10.4-6.3-19.8-15.9-23.8z"/>
  </svg>
);

// fa-duotone fa-fire-flame-curved
export const BiomassIcon = ({ size = 16, primaryColor, secondaryColor, className = '' }: DuotoneIconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" width={size} height={size} className={className} aria-hidden="true">
    <path fill={secondaryColor} fillOpacity="0.4" d="M96 198.6V288c0 35.3 28.7 64 64 64s64-28.7 64-64v-3.9c0-18-7.2-35.3-19.9-48l-38.6-38.6c-24-24-37.5-56.7-37.5-90.7c0-27.7 9-54.8 25.6-76.9L153.6 29.9C145.1 44.4 96 134.1 96 198.6z"/>
    <path fill={primaryColor} d="M153.6 29.9l16-21.3C173.6 3.2 180 0 186.7 0C198.4 0 208 9.6 208 21.3V43.5c0 13.1 5.4 25.7 14.9 34.7L307.6 159C356.4 205.6 384 270.2 384 337.7C384 434 306 512 209.7 512H192C86 512 0 426 0 320v-3.8c0-48.8 19.4-95.6 53.9-130.1l3.5-3.5c4.2-4.2 10-6.6 16-6.6C85.9 176 96 186.1 96 198.6V288c0 35.3 28.7 64 64 64s64-28.7 64-64v-3.9c0-18-7.2-35.3-19.9-48l-38.6-38.6c-24-24-37.5-56.7-37.5-90.7c0-27.7 9-54.8 25.6-76.9z"/>
  </svg>
);

// fa-duotone fa-arrow-up-from-ground-water
export const HydropowerIcon = ({ size = 16, primaryColor, secondaryColor, className = '' }: DuotoneIconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" width={size} height={size} className={className} aria-hidden="true">
    <path fill={secondaryColor} fillOpacity="0.4" d="M0 320c0 17.7 14.3 32 32 32H64v32c0 17.7 14.3 32 32 32s32-14.3 32-32V352h64v32c0 17.7 14.3 32 32 32s32-14.3 32-32V352h64v32c0 17.7 14.3 32 32 32s32-14.3 32-32V352h64v32c0 17.7 14.3 32 32 32s32-14.3 32-32V352h32c17.7 0 32-14.3 32-32s-14.3-32-32-32H32c-17.7 0-32 14.3-32 32zm64 128v32c0 17.7 14.3 32 32 32s32-14.3 32-32V448H64zm128 0v32c0 17.7 14.3 32 32 32s32-14.3 32-32V448H192zm128 0v32c0 17.7 14.3 32 32 32s32-14.3 32-32V448H320zm128 0v32c0 17.7 14.3 32 32 32s32-14.3 32-32V448H448z"/>
    <path fill={primaryColor} d="M288 0c-13.3 0-24 10.7-24 24V142.1l-35.7-35.7c-9.4-9.4-24.6-9.4-33.9 0s-9.4 24.6 0 33.9L264 210.1c6.2 6.2 14.4 9.4 22.6 9.4H288h1.4c8.2 0 16.4-3.1 22.6-9.4l69.6-69.8c9.4-9.4 9.4-24.6 0-33.9s-24.6-9.4-33.9 0L312 142.1V24c0-13.3-10.7-24-24-24z"/>
  </svg>
);

// fa-duotone fa-dumpster-fire (Energy from Waste)
export const EnergyFromWasteIcon = ({ size = 16, primaryColor, secondaryColor, className = '' }: DuotoneIconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" width={size} height={size} className={className} aria-hidden="true">
    <path fill={secondaryColor} fillOpacity="0.4" d="M0 160c0-35.3 28.7-64 64-64H512c35.3 0 64 28.7 64 64V448c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V160zm64 32v64h64V192H64zm384 0v64h64V192H448zM64 320v64h64V320H64zm384 0v64h64V320H448zM192 192v192H384V192H192z"/>
    <path fill={primaryColor} d="M314.4 40.1c5.5 13.4 .2 28.8-12.4 35.9C289.4 83.5 280 98.1 280 114.3c0 21.3 17.2 38.6 38.4 38.6c12.2 0 23.1-5.7 30.3-14.6c5.4-6.7 14.5-9.1 22.5-5.9s12.8 11.3 11.6 19.9C377.6 175.3 368 192 352 192c-17.7 0-32 14.3-32 32s14.3 32 32 32c53 0 96-43 96-96c0-37.5-20.4-70.3-50.7-87.9c-13.3-7.6-18.5-24.3-11.9-37.9S408.7 12.5 421.3 20C466.5 45.1 496 93.1 496 148c0 88.4-71.6 160-160 160c-88.4 0-160-71.6-160-160c0-42.1 16.3-80.4 43-108.8c8.8-9.3 23.4-10.1 33.2-1.8s11.3 22.7 3.9 33.3C240.5 91.5 232 119 232 148c0 35.3 28.7 64 64 64s64-28.7 64-64c0-10.6-2.6-20.6-7.2-29.4c-5.8-11.1-3.5-24.7 5.7-33.3s23.3-9.8 33.1-2.8c.3 .2 .5 .4 .8 .6c-9.4-22.5-25.3-41.6-45.5-54.8c-11.9-7.8-15.3-23.7-7.5-35.6s23.7-15.3 35.6-7.5c2.7 1.8 5.4 3.7 8 5.7c-3.5-8.5-4.5-18-2.6-27.2C384.5 1.9 397.3-5.2 409.7 1.9s17.5 20.5 12 33.5l-107.3 4.7z"/>
  </svg>
);

// fa-duotone fa-heat (Geothermal)
export const GeothermalIcon = ({ size = 16, primaryColor, secondaryColor, className = '' }: DuotoneIconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width={size} height={size} className={className} aria-hidden="true">
    <path fill={secondaryColor} fillOpacity="0.4" d="M288 64c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 64c0 17.7 14.3 32 32 32s32-14.3 32-32l0-64zm96 64c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 64c0 17.7 14.3 32 32 32s32-14.3 32-32l0-64zm-192 0c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 64c0 17.7 14.3 32 32 32s32-14.3 32-32l0-64z"/>
    <path fill={primaryColor} d="M256 320c-53 0-96 43-96 96s43 96 96 96s96-43 96-96s-43-96-96-96zm0 128c-17.7 0-32-14.3-32-32s14.3-32 32-32s32 14.3 32 32s-14.3 32-32 32zM128 288c-17.7 0-32 14.3-32 32s14.3 32 32 32l256 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-256 0z"/>
  </svg>
);

// fa-kit fa-wind-sparkle (Wind Offshore) — using fa-wind as close match
export const WindOffshoreIcon = ({ size = 16, primaryColor, secondaryColor, className = '' }: DuotoneIconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width={size} height={size} className={className} aria-hidden="true">
    <path fill={secondaryColor} fillOpacity="0.4" d="M288 32c17.7 0 32 14.3 32 32s-14.3 32-32 32H32C14.3 96 0 81.7 0 64s14.3-32 32-32H288zM0 256c0-17.7 14.3-32 32-32H416c17.7 0 32 14.3 32 32s-14.3 32-32 32H32c-17.7 0-32-14.3-32-32zM224 416c0 17.7-14.3 32-32 32H32c-17.7 0-32-14.3-32-32s14.3-32 32-32H192c17.7 0 32 14.3 32 32z"/>
    <path fill={primaryColor} d="M320 64c0-35.3 28.7-64 64-64s64 28.7 64 64s-28.7 64-64 64H32C14.3 128 0 113.7 0 96s14.3-32 32-32H320zm128 192c0-35.3 28.7-64 64-64s64 28.7 64 64s-28.7 64-64 64H32c-17.7 0-32-14.3-32-32s14.3-32 32-32H448zM256 416c0 35.3-28.7 64-64 64s-64-28.7-64-64s28.7-64 64-64H480c17.7 0 32 14.3 32 32s-14.3 32-32 32H256z"/>
  </svg>
);

// fa-duotone fa-tank-water (Hydrogen)
export const HydrogenIcon = ({ size = 16, primaryColor, secondaryColor, className = '' }: DuotoneIconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" width={size} height={size} className={className} aria-hidden="true">
    <path fill={secondaryColor} fillOpacity="0.4" d="M64 64C28.7 64 0 92.7 0 128V384c0 35.3 28.7 64 64 64H512c35.3 0 64-28.7 64-64V128c0-35.3-28.7-64-64-64H64zM288 352c-53 0-96-43-96-96s43-96 96-96s96 43 96 96s-43 96-96 96z"/>
    <path fill={primaryColor} d="M288 208c-26.5 0-48 21.5-48 48s21.5 48 48 48s48-21.5 48-48s-21.5-48-48-48zm0 160c-61.9 0-112-50.1-112-112s50.1-112 112-112s112 50.1 112 112s-50.1 112-112 112z"/>
  </svg>
);

// fa-duotone fa-grate-droplet (Solar Thermal)
export const SolarThermalIcon = ({ size = 16, primaryColor, secondaryColor, className = '' }: DuotoneIconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" width={size} height={size} className={className} aria-hidden="true">
    <path fill={secondaryColor} fillOpacity="0.4" d="M0 64C0 46.3 14.3 32 32 32H544c17.7 0 32 14.3 32 32s-14.3 32-32 32H32C14.3 96 0 81.7 0 64zM0 192c0-17.7 14.3-32 32-32H544c17.7 0 32 14.3 32 32s-14.3 32-32 32H32c-17.7 0-32-14.3-32-32zM32 288H544c17.7 0 32 14.3 32 32s-14.3 32-32 32H32c-17.7 0-32-14.3-32-32s14.3-32 32-32z"/>
    <path fill={primaryColor} d="M400 336c0 61.9-50.1 176-112 176s-112-114.1-112-176c0-61.9 50.1-112 112-112s112 50.1 112 112z"/>
  </svg>
);

// fa-duotone fa-dumpster (Non-Energy Waste)
export const NonEnergyWasteIcon = ({ size = 16, primaryColor, secondaryColor, className = '' }: DuotoneIconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" width={size} height={size} className={className} aria-hidden="true">
    <path fill={secondaryColor} fillOpacity="0.4" d="M64 160H512V448c0 35.3-28.7 64-64 64H128c-35.3 0-64-28.7-64-64V160zm64 64v192h64V224H128zm192 0v192h64V224H320z"/>
    <path fill={primaryColor} d="M215.5 3.6C221 1.3 226.9 0 233 0h110c6.1 0 12 1.3 17.5 3.6L408 32H576v96H0V32H168L215.5 3.6zM64 160H512V448c0 35.3-28.7 64-64 64H128c-35.3 0-64-28.7-64-64V160z"/>
  </svg>
);

// fa-duotone fa-atom-simple (Nuclear)
export const NuclearIcon = ({ size = 16, primaryColor, secondaryColor, className = '' }: DuotoneIconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width={size} height={size} className={className} aria-hidden="true">
    <path fill={secondaryColor} fillOpacity="0.4" d="M256 208a48 48 0 1 1 0 96 48 48 0 1 1 0-96zm0 144a96 96 0 1 0 0-192 96 96 0 1 0 0 192z"/>
    <path fill={primaryColor} d="M256 0c-17.7 0-32 14.3-32 32l0 13.4C152.4 57.1 80 133.8 80 228c0 38.5 12.2 74.2 33 103.3L52.7 391.6c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L158.3 377c29.1 20.7 64.7 33 103.3 33s74.2-12.2 103.3-33l60.3 59.9c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L399 331.3c20.7-29.1 33-64.7 33-103.3c0-94.2-72.4-170.9-164-182.6L268 32c0-17.7-14.3-32-32-32zm0 96c82.5 0 148 65.5 148 148s-65.5 148-148 148S108 326.5 108 244 173.5 96 256 96z"/>
  </svg>
);

// fa-duotone fa-wave (Wave energy)
export const WaveIcon = ({ size = 16, primaryColor, secondaryColor, className = '' }: DuotoneIconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512" width={size} height={size} className={className} aria-hidden="true">
    <path fill={secondaryColor} fillOpacity="0.4" d="M0 320c48 0 80-32 128-32s80 32 128 32s80-32 128-32s80 32 128 32s80-32 128-32v96c-48 0-80 32-128 32s-80-32-128-32s-80 32-128 32s-80-32-128-32S48 448 0 448V320z"/>
    <path fill={primaryColor} d="M0 192c48 0 80-32 128-32s80 32 128 32s80-32 128-32s80 32 128 32s80-32 128-32v96c-48 0-80 32-128 32s-80-32-128-32s-80 32-128 32s-80-32-128-32S48 288 0 288V192z"/>
  </svg>
);

// fa-duotone fa-water (Tidal)
export const TidalIcon = ({ size = 16, primaryColor, secondaryColor, className = '' }: DuotoneIconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512" width={size} height={size} className={className} aria-hidden="true">
    <path fill={secondaryColor} fillOpacity="0.4" d="M288 0C264.4 0 244.8 16.9 229.5 40.1C214.3 63.3 200.9 97.3 192.4 136.7C183.9 176.1 179.5 219.5 179.5 256s4.4 79.9 12.9 119.3c8.5 39.4 21.9 73.4 37.1 96.6C244.8 495.1 264.4 512 288 512s43.2-16.9 58.5-40.1c15.2-23.2 28.6-57.2 37.1-96.6c8.5-39.4 12.9-82.8 12.9-119.3s-4.4-79.9-12.9-119.3c-8.5-39.4-21.9-73.4-37.1-96.6C331.2 16.9 311.6 0 288 0z"/>
    <path fill={primaryColor} d="M95.5 169.9C79.5 187.7 64 214.3 64 256s15.5 68.3 31.5 86.1C111.4 360 128 368 128 368s16.6-8 32.5-25.9C176.5 324.3 192 297.7 192 256s-15.5-68.3-31.5-86.1C144.6 152 128 144 128 144s-16.6 8-32.5 25.9zm320 0C399.4 152 383 144 383 144s-16.6 8-32.5 25.9C334.5 187.7 319 214.3 319 256s15.5 68.3 31.5 86.1C366.4 360 383 368 383 368s16.6-8 32.5-25.9C431.5 324.3 447 297.7 447 256s-15.5-68.3-31.5-86.1z"/>
  </svg>
);

// fa-duotone fa-house-day (Solar Rooftop)
export const SolarRooftopIcon = ({ size = 16, primaryColor, secondaryColor, className = '' }: DuotoneIconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512" width={size} height={size} className={className} aria-hidden="true">
    <path fill={secondaryColor} fillOpacity="0.4" d="M320 352H192V512H320V352zM448 512V352H320V512H448z"/>
    <path fill={primaryColor} d="M320 0L0 288H64V512H576V288h64L320 0zM192 352H448V480H192V352zM576 224c17.7 0 32-14.3 32-32s-14.3-32-32-32s-32 14.3-32 32s14.3 32 32 32zm0-128c17.7 0 32-14.3 32-32s-14.3-32-32-32s-32 14.3-32 32s14.3 32 32 32zm-64 64c0 17.7 14.3 32 32 32s32-14.3 32-32s-14.3-32-32-32s-32 14.3-32 32zm128 0c0 17.7 14.3 32 32 32s32-14.3 32-32s-14.3-32-32-32s-32 14.3-32 32z"/>
  </svg>
);

// fa-duotone fa-bolt (Hybrid — kept for existing type)
export const HybridIcon = ({ size = 16, primaryColor, secondaryColor, className = '' }: DuotoneIconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" width={size} height={size} className={className} aria-hidden="true">
    <path fill={secondaryColor} fillOpacity="0.4" d="M349.4 44.6c5.9-13.7 1.5-29.7-10.6-38.5s-28.6-8-39.9 1.8l-256 224c-10 8.8-13.6 22.9-8.9 35.3S50.7 288 64 288H175.5L98.6 467.4c-5.9 13.7-1.5 29.7 10.6 38.5s28.6 8 39.9-1.8l256-224c10-8.8 13.6-22.9 8.9-35.3s-16.6-20.7-30-20.7H272.5L349.4 44.6z"/>
    <path fill={primaryColor} d="M272.5 224H383.9c13.4 0 24.3 9.3 30 20.7s1.1 26.5-8.9 35.3l-256 224c-11.3 9.8-27.7 11.6-39.9 1.8s-16.5-24.8-10.6-38.5L175.5 288H64c-13.3 0-24.3-8.3-28.9-20.7s.1-26.5 8.9-35.3l256-224c11.3-9.8 27.7-11.6 39.9-1.8s16.5 24.8 10.6 38.5L272.5 224z"/>
  </svg>
);

// fa-duotone fa-building (Substation — kept for existing type)
export const SubstationIcon = ({ size = 16, primaryColor, secondaryColor, className = '' }: DuotoneIconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" width={size} height={size} className={className} aria-hidden="true">
    <path fill={secondaryColor} fillOpacity="0.4" d="M48 0C21.5 0 0 21.5 0 48V464c0 26.5 21.5 48 48 48h96V432c0-26.5 21.5-48 48-48s48 21.5 48 48v80h96c26.5 0 48-21.5 48-48V48c0-26.5-21.5-48-48-48H48z"/>
    <path fill={primaryColor} d="M64 240c0-8.8 7.2-16 16-16h32c8.8 0 16 7.2 16 16v32c0 8.8-7.2 16-16 16H80c-8.8 0-16-7.2-16-16V240zm112-16h32c8.8 0 16 7.2 16 16v32c0 8.8-7.2 16-16 16H176c-8.8 0-16-7.2-16-16V240c0-8.8 7.2-16 16-16zm112 16c0-8.8 7.2-16 16-16h32c8.8 0 16 7.2 16 16v32c0 8.8-7.2 16-16 16H304c-8.8 0-16-7.2-16-16V240zM64 96c0-8.8 7.2-16 16-16h32c8.8 0 16 7.2 16 16v32c0 8.8-7.2 16-16 16H80c-8.8 0-16-7.2-16-16V96zm112-16h32c8.8 0 16 7.2 16 16v32c0 8.8-7.2 16-16 16H176c-8.8 0-16-7.2-16-16V96c0-8.8 7.2-16 16-16zm112 16c0-8.8 7.2-16 16-16h32c8.8 0 16 7.2 16 16v32c0 8.8-7.2 16-16 16H304c-8.8 0-16-7.2-16-16V96z"/>
  </svg>
);

export type SiteIconComponent = typeof WindTurbineIcon;

export const SITE_TYPE_ICONS: Record<string, SiteIconComponent> = {
  eolica:             WindTurbineIcon,
  eolica_offshore:    WindOffshoreIcon,
  fotovoltaica:       SolarPanelIcon,
  bess:               BatteryBoltIcon,
  hidreletrica:       HydropowerIcon,
  biomassa:           BiomassIcon,
  biocombustivel:     BiofuelsIcon,
  hibrida:            HybridIcon,
  subestacao:         SubstationIcon,
  energia_residuos:   EnergyFromWasteIcon,
  geotermica:         GeothermalIcon,
  hidrogenio:         HydrogenIcon,
  solar_termico:      SolarThermalIcon,
  residuos_nao_energeticos: NonEnergyWasteIcon,
  nuclear:            NuclearIcon,
  ondas:              WaveIcon,
  mare:               TidalIcon,
  solar_telhado:      SolarRooftopIcon,
};
